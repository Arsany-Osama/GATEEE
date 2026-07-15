const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const {
    upload
} = require('../middleware/upload');
const db = require('../db/knex');
const { authenticate, isAdmin } = require('../middleware/auth');
const { hasNotification, notifyUser } = require('../services/notifications');
const { sendUnexpectedError } = require('../utils/http');

const validId = (value) => {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
};

const lessonContentSupport = async () => ({
    description: await db.schema.hasColumn('lessons', 'description'),
    is_published: await db.schema.hasColumn('lessons', 'is_published'),
    duration_seconds: await db.schema.hasColumn('lessons', 'duration_seconds')
});

const normalizeDuration = (value) => {
    const duration = Math.round(Number(value));
    return Number.isFinite(duration) && duration > 0 ? duration : null;
};

const getUploadedVideoDuration = async (file) => {
    const directDuration = normalizeDuration(file?.duration);
    if (directDuration) return directDuration;
    const publicId =
        file?.public_id || file?.filename;
    if (!publicId) return null;
    try {
        const resource = await cloudinary.api.resource(publicId, { resource_type: 'video' });
        return normalizeDuration(resource?.duration);
    } catch (error) {
        console.error('Cloudinary duration lookup failed:', error);
        return null;
    }
};

const lessonPayload = async (body) => {
    const support = await lessonContentSupport();
    const payload = {};
    if (body.title !== undefined) payload.title = String(body.title || '').trim();
    if (body.playlist_id !== undefined) payload.playlist_id = Number(body.playlist_id);
    if (body.order_index !== undefined) payload.order_index = Number(body.order_index) || 0;
    if (body.video_url !== undefined) payload.cloudinary_public_id = String(body.video_url || '').trim() || null;
    if (body.cloudinary_public_id !== undefined) payload.cloudinary_public_id = String(body.cloudinary_public_id || '').trim() || null;
    if (support.description && body.description !== undefined) payload.description = String(body.description || '').trim() || null;
    if (support.is_published && body.is_published !== undefined) {
        payload.is_published = body.is_published === true || body.is_published === 1 || body.is_published === 'true' || body.is_published === '1';
    }
    return payload;
};

const getLessonContext = async (trx, lessonId, support) => {
    const fields = [
        'lessons.id',
        'lessons.title as lesson_title',
        'courses.id as course_id',
        'courses.title as course_title',
    ];
    if (support.is_published) fields.push('lessons.is_published');

    return trx('lessons')
        .join('playlists', 'lessons.playlist_id', 'playlists.id')
        .join('courses', 'playlists.course_id', 'courses.id')
        .where('lessons.id', lessonId)
        .whereNull('lessons.deleted_at')
        .whereNull('playlists.deleted_at')
        .whereNull('courses.deleted_at')
        .select(fields)
        .first();
};

const notifyEnrolledStudentsForLesson = async ({ actorUserId, lessonId }) => {
    const support = await lessonContentSupport();
    const lesson = await getLessonContext(db, lessonId, support);
    if (!lesson) return 0;
    if (support.is_published && !Boolean(lesson.is_published)) return 0;

    const students = await db('enrollments')
        .join('users', 'enrollments.user_id', 'users.id')
        .where('enrollments.course_id', lesson.course_id)
        .whereNull('enrollments.deleted_at')
        .where('users.role', 'student')
        .select('users.id');

    let sent = 0;
    for (const student of students) {
        const alreadySent = await hasNotification({
            recipient_user_id: student.id,
            type: 'new_lesson_available',
            entity_type: 'lesson',
            entity_id: lesson.id,
        });
        if (alreadySent) continue;

        const notification = await notifyUser(student.id, {
            actor_user_id: actorUserId,
            type: 'new_lesson_available',
            title: 'New lesson available',
            message: `New lesson available in ${lesson.course_title || 'your course'}: ${lesson.lesson_title || 'Lesson'}.`,
            entity_type: 'lesson',
            entity_id: lesson.id,
            metadata: { course_id: lesson.course_id, course_title: lesson.course_title },
        });
        if (notification) sent += 1;
    }
    return sent;
};

// Upload a lesson video
router.post('/upload', authenticate, isAdmin, upload.single('video'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No video file uploaded' });
        }

        const uploaded = await cloudinary.uploader.upload_large(
            req.file.path,
            {
                resource_type: 'video',
                folder: 'elearning_lessons',
                chunk_size: 20 * 1024 * 1024,
            }
        );

        await fs.promises.unlink(req.file.path).catch(() => { });

        return res.json({
            message: 'Video uploaded successfully!',
            public_id: uploaded.public_id,
            duration_seconds: normalizeDuration(uploaded.duration),
        });
    } catch (error) {
        if (req.file?.path) {
            await fs.promises.unlink(req.file.path).catch(() => { });
        }

        return sendUnexpectedError(res, error, 'Lesson video upload failed');
    }
});

// 2. Save lesson details to DB
router.post('/', authenticate, isAdmin, async (req, res) => {
    try {
        const payload = await lessonPayload(req.body);
        if (!validId(payload.playlist_id)) return res.status(400).json({ error: 'Select a valid playlist.' });
        if (!payload.title) return res.status(400).json({ error: 'Lesson title is required.' });
        const playlist = await db('playlists').where({ id: payload.playlist_id }).whereNull('deleted_at').first('id');
        if (!playlist) return res.status(400).json({ error: 'Select an active playlist.' });

        const [lessonId] = await db('lessons').insert(payload);
        await notifyEnrolledStudentsForLesson({ actorUserId: req.user.id, lessonId });

        res.status(201).json({ id: lessonId, message: 'Lesson saved to database!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. Update lesson metadata
router.put('/:id', authenticate, isAdmin, async (req, res) => {
    const lessonId = validId(req.params.id);
    if (!lessonId) return res.status(400).json({ error: 'Select a valid lesson.' });
    try {
        const support = await lessonContentSupport();
        const before = support.is_published
            ? await db('lessons').where({ id: lessonId }).whereNull('deleted_at').first('id', 'is_published')
            : null;
        const update = await lessonPayload(req.body);
        if (update.playlist_id !== undefined && !validId(update.playlist_id)) {
            return res.status(400).json({ error: 'Select a valid playlist.' });
        }
        if (update.title !== undefined && !update.title) return res.status(400).json({ error: 'Lesson title is required.' });
        if (update.playlist_id !== undefined) {
            const playlist = await db('playlists').where({ id: update.playlist_id }).whereNull('deleted_at').first('id');
            if (!playlist) return res.status(400).json({ error: 'Select an active playlist.' });
        }
        const updated = await db('lessons').where({ id: lessonId }).whereNull('deleted_at').update(update);
        if (!updated) return res.status(404).json({ error: 'Active lesson not found.' });
        if (support.is_published && before && !Boolean(before.is_published) && update.is_published === true) {
            await notifyEnrolledStudentsForLesson({ actorUserId: req.user.id, lessonId });
        }
        res.json({ message: 'Lesson updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. Soft-delete a lesson, retaining quiz/progress history.
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
    const lessonId = validId(req.params.id);
    if (!lessonId) return res.status(400).json({ error: 'Select a valid lesson.' });
    try {
        const updated = await db('lessons').where({ id: lessonId }).whereNull('deleted_at').update({ deleted_at: db.raw('NOW()') });
        if (!updated) return res.status(404).json({ error: 'Active lesson not found.' });
        res.json({ message: 'Lesson moved to deleted content.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/reorder', authenticate, isAdmin, async (req, res) => {
    const lessons = Array.isArray(req.body?.lessons) ? req.body.lessons : [];
    if (!lessons.length) return res.status(400).json({ error: 'No lessons were provided.' });

    try {
        await db.transaction(async (trx) => {
            for (const lesson of lessons) {
                const lessonId = validId(lesson.id);
                if (!lessonId) {
                    const error = new Error('Select valid lessons.');
                    error.statusCode = 400;
                    throw error;
                }
                await trx('lessons')
                    .where({ id: lessonId })
                    .whereNull('deleted_at')
                    .update({ order_index: Number(lesson.order_index) || 0 });
            }
        });
        res.json({ message: 'Lessons reordered.' });
    } catch (error) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

// Admin upload for a specific lesson (matches the client admin uploader)
router.post('/:id/upload-video', authenticate, isAdmin, upload.single('video'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No video file uploaded' });
        }

        const uploaded = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_large(
                req.file.path,
                {
                    resource_type: 'video',
                    folder: 'elearning_lessons',
                    chunk_size: 20 * 1024 * 1024,
                },
                (error, result) => {
                    if (error) return reject(error);
                    resolve(result);
                }
            );
        });

        console.log('UPLOADED:', uploaded);

        await fs.promises.unlink(req.file.path).catch(() => { });

        const publicId = uploaded.public_id;

        if (!publicId) {
            throw new Error('Cloudinary did not return public_id');
        }

        const support = await lessonContentSupport();

        const updatePayload = {
            cloudinary_public_id: publicId,
        };

        if (support.duration_seconds) {
            updatePayload.duration_seconds = normalizeDuration(uploaded.duration);
        }

        const affected = await db('lessons')
            .where({ id: req.params.id })
            .update(updatePayload);

        console.log('UPDATED_ROWS:', affected);
        console.log('UPDATE_PAYLOAD:', updatePayload);

        return res.json({
            message: 'Video uploaded and lesson updated',
            public_id: publicId,
            duration_seconds: updatePayload.duration_seconds || null,
        });
    } catch (error) {
        if (req.file?.path) {
            await fs.promises.unlink(req.file.path).catch(() => { });
        }

        console.error('UPLOAD ERROR:', error);

        return res.status(500).json({
            error: error.message,
        });
    }
});

module.exports = router;
