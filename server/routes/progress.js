const express = require('express');
const router = express.Router();
const cloudinary = require('../config/cloudinary');
const db = require('../db/knex');
const { authenticate } = require('../middleware/auth');
const { hasNotification, notifyAdmins, notifyUser } = require('../services/notifications');
const { ensureCertificateForCourse } = require('../services/certificates');
const { sendUnexpectedError } = require('../utils/http');

const MINIMUM_WATCH_PERCENTAGE = 80;
const lessonSupportsPublish = async () => db.schema.hasColumn('lessons', 'is_published');
const lessonSupportsDuration = async () => db.schema.hasColumn('lessons', 'duration_seconds');
const progressSupportsWatchColumns = async () => ({
    watched_seconds: await db.schema.hasColumn('progress', 'watched_seconds'),
    completion_percentage: await db.schema.hasColumn('progress', 'completion_percentage'),
    completed_at: await db.schema.hasColumn('progress', 'completed_at'),
    last_watched_at: await db.schema.hasColumn('progress', 'last_watched_at'),
});

const getCourseForLesson = async (lessonId) => {
    return db('lessons')
        .join('playlists', 'lessons.playlist_id', 'playlists.id')
        .join('courses', 'playlists.course_id', 'courses.id')
        .where('lessons.id', lessonId)
        .whereNull('lessons.deleted_at')
        .whereNull('playlists.deleted_at')
        .whereNull('courses.deleted_at')
        .select('courses.id', 'courses.title')
        .first();
};

const getLessonAccessForProgress = async (lessonId, userId) => {
    const query = db('lessons')
        .join('playlists', 'lessons.playlist_id', 'playlists.id')
        .join('courses', 'playlists.course_id', 'courses.id')
        .leftJoin('enrollments', function joinEnrollments() {
            this.on('enrollments.course_id', '=', 'courses.id').andOn('enrollments.user_id', '=', db.raw('?', [userId]));
        })
        .where('lessons.id', lessonId)
        .whereNull('lessons.deleted_at')
        .whereNull('playlists.deleted_at')
        .whereNull('courses.deleted_at')
        .select(
            'lessons.id as lesson_id',
            'lessons.cloudinary_public_id',
            'courses.id as course_id',
            'courses.title as course_title',
            'enrollments.id as enrollment_id',
            'enrollments.deleted_at as enrollment_deleted_at'
        )
        .first();
    if (await lessonSupportsDuration()) query.select('lessons.duration_seconds');
    return query;
};

const normalizeDuration = (value) => {
    const duration = Math.round(Number(value));
    return Number.isFinite(duration) && duration > 0 ? duration : null;
};

const clampWatchValue = (value, max) => {
    const numeric = Math.max(0, Math.round(Number(value) || 0));
    if (!Number.isFinite(numeric)) return 0;
    return max ? Math.min(numeric, max) : numeric;
};

const resolveLessonDuration = async (lesson) => {
    const storedDuration = normalizeDuration(lesson?.duration_seconds);
    if (storedDuration) return storedDuration;
    if (!lesson?.cloudinary_public_id) return null;
    try {
        const resource = await cloudinary.api.resource(lesson.cloudinary_public_id, { resource_type: 'video' });
        const duration = normalizeDuration(resource?.duration);
        if (duration && await lessonSupportsDuration()) {
            await db('lessons').where({ id: lesson.lesson_id }).update({ duration_seconds: duration });
        }
        return duration;
    } catch (error) {
        console.error('Resolve lesson duration failed:', error);
        return null;
    }
};

const getEnrolledCourseForLesson = async (lessonId, userId) => {
    return db('lessons')
        .join('playlists', 'lessons.playlist_id', 'playlists.id')
        .join('courses', 'playlists.course_id', 'courses.id')
        .join('enrollments', function joinEnrollments() {
            this.on('enrollments.course_id', '=', 'courses.id').andOn('enrollments.user_id', '=', db.raw('?', [userId]));
        })
        .where('lessons.id', lessonId)
        .whereNull('lessons.deleted_at')
        .whereNull('playlists.deleted_at')
        .whereNull('courses.deleted_at')
        .whereNull('enrollments.deleted_at')
        .select('courses.id', 'courses.title')
        .first();
};

const getCourseProgressSummary = async (courseId, userId) => {
    const allLessonsQuery = db('lessons')
        .join('playlists', 'lessons.playlist_id', 'playlists.id')
        .where('playlists.course_id', courseId)
        .whereNull('playlists.deleted_at')
        .whereNull('lessons.deleted_at')
        .select('lessons.id');
    if (await lessonSupportsPublish()) allLessonsQuery.where('lessons.is_published', true);
    const allLessons = await allLessonsQuery;
    const lessonIds = allLessons.map((lesson) => lesson.id);
    if (!lessonIds.length) return { progress_percentage: 0, completed_lessons: [], total_lessons: 0 };

    const progressSupport = await progressSupportsWatchColumns();
    const completedLessonsQuery = db('progress')
        .where('user_id', userId)
        .whereIn('lesson_id', lessonIds)
        .whereNull('deleted_at')
        .select('lesson_id');
    if (progressSupport.completed_at) completedLessonsQuery.whereNotNull('completed_at');
    else if (progressSupport.completion_percentage) completedLessonsQuery.where('completion_percentage', '>=', MINIMUM_WATCH_PERCENTAGE);

    const completedLessons = await completedLessonsQuery;

    const completedLessonIds = completedLessons.map((progress) => progress.lesson_id);
    return {
        progress_percentage: Math.round((completedLessonIds.length / lessonIds.length) * 100),
        completed_lessons: completedLessonIds,
        total_lessons: lessonIds.length,
    };
};

const maybeNotifyCourseCompleted = async ({ userId, course, progress }) => {
    if (!course?.id || !progress.total_lessons || progress.progress_percentage < 100) return;
    const alreadyNotified = await hasNotification({
        recipient_user_id: userId,
        type: 'course_completed',
        entity_type: 'course',
        entity_id: course.id,
    });
    if (alreadyNotified) return;

    await notifyUser(userId, {
        type: 'course_completed',
        title: 'Course completed',
        message: `Congratulations! You completed ${course.title || 'your course'}.`,
        entity_type: 'course',
        entity_id: course.id,
        metadata: { course_title: course.title },
    });
    await notifyAdmins({
        actor_user_id: userId,
        type: 'course_completed',
        title: 'Course completed',
        message: `A student completed ${course.title || 'a course'}.`,
        entity_type: 'course',
        entity_id: course.id,
        metadata: { user_id: userId, course_title: course.title },
    });
};

const issueCertificateIfCourseCompleted = async ({ userId, course }) => {
    if (!course?.id) return null;
    const progress = await getCourseProgressSummary(course.id, userId);
    await maybeNotifyCourseCompleted({ userId, course, progress });
    if (progress.progress_percentage < 100) return null;
    return ensureCertificateForCourse(userId, course.id).catch((error) => {
        console.error('Certificate auto-issue failed:', error);
        return null;
    });
};

router.post('/:lessonId/watch', authenticate, async (req, res) => {
    try {
        const lessonId = Number(req.params.lessonId);
        const userId = req.user.id;
        const access = await getLessonAccessForProgress(lessonId, userId);
        if (!access) return res.status(404).json({ error: 'Lesson not found.' });
        if (req.user.role !== 'admin' && (!access.enrollment_id || access.enrollment_deleted_at)) {
            return res.status(403).json({ error: 'You must be enrolled in this course to update watch progress.' });
        }

        const supports = await progressSupportsWatchColumns();
        if (!supports.watched_seconds || !supports.completion_percentage) {
            return res.status(503).json({ error: 'Watch progress tracking is not available yet.' });
        }

        const reportedDuration = normalizeDuration(req.body?.duration_seconds);
        const lessonDuration = await resolveLessonDuration(access) || reportedDuration;
        if (!lessonDuration) {
            return res.status(400).json({ error: 'Lesson duration is not available yet.' });
        }

        if (reportedDuration && await lessonSupportsDuration()) {
            const storedDuration = normalizeDuration(access.duration_seconds);
            if (!storedDuration) {
                await db('lessons').where({ id: lessonId }).update({ duration_seconds: reportedDuration });
            }
        }

        const watchedSeconds = clampWatchValue(req.body?.watched_seconds, lessonDuration);
        const completionPercentage = Math.min(100, Number(((watchedSeconds / lessonDuration) * 100).toFixed(2)));
        const existing = await db('progress')
            .where({ user_id: userId, lesson_id: lessonId })
            .whereNull('deleted_at')
            .first();

        const nextWatchedSeconds = Math.max(Number(existing?.watched_seconds || 0), watchedSeconds);
        const nextCompletion = Math.max(Number(existing?.completion_percentage || 0), completionPercentage);
        const payload = {
            user_id: userId,
            lesson_id: lessonId,
            course_id: access.course_id,
            watched_seconds: nextWatchedSeconds,
            completion_percentage: Number(nextCompletion.toFixed(2)),
            last_watched_at: db.raw('NOW()'),
        };

        if (nextCompletion >= MINIMUM_WATCH_PERCENTAGE) {
            payload.completed_at = existing?.completed_at || db.raw('NOW()');
        }

        if (existing) {
            await db('progress').where({ id: existing.id }).update(payload);
        } else {
            await db('progress').insert(payload);
        }

        let certificate = null;
        if (nextCompletion >= MINIMUM_WATCH_PERCENTAGE) {
            certificate = await issueCertificateIfCourseCompleted({
                userId,
                course: { id: access.course_id, title: access.course_title },
            });
        }

        res.json({
            watched_seconds: nextWatchedSeconds,
            duration_seconds: lessonDuration,
            completion_percentage: Number(nextCompletion.toFixed(2)),
            completion_ready: nextCompletion >= MINIMUM_WATCH_PERCENTAGE,
            certificate: certificate ? {
                uuid: certificate.uuid,
                issued_at: certificate.issued_at,
                revoked_at: certificate.revoked_at,
                status: certificate.revoked_at ? 'Revoked' : 'Valid',
            } : null,
        });
    } catch (error) {
        return sendUnexpectedError(res, error, 'Update watch progress failed');
    }
});

router.post('/:lessonId/complete', authenticate, async (req, res) => {
    try {
        const { lessonId } = req.params;
        const userId = req.user.id;
        const course = await getEnrolledCourseForLesson(lessonId, userId);
        if (!course && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'You must be enrolled in this course to update progress.' });
        }
        const courseForProgress = course || await getCourseForLesson(lessonId);
        if (!courseForProgress) return res.status(404).json({ error: 'Lesson not found.' });
        const supports = await progressSupportsWatchColumns();
        const existing = await db('progress')
            .where({ user_id: userId, lesson_id: lessonId })
            .whereNull('deleted_at')
            .first();

        if (req.user.role !== 'admin') {
            const watchedPercentage = Number(existing?.completion_percentage || 0);
            if (!existing || watchedPercentage < MINIMUM_WATCH_PERCENTAGE) {
                return res.status(409).json({
                    error: `You must watch at least ${MINIMUM_WATCH_PERCENTAGE}% of the lesson before marking it complete.`,
                });
            }
        }

        if (existing && supports.completed_at && existing.completed_at) {
            const certificate = await issueCertificateIfCourseCompleted({ userId, course: courseForProgress });
            return res.status(200).json({
                message: 'Lesson already completed',
                certificate: certificate ? {
                    uuid: certificate.uuid,
                    issued_at: certificate.issued_at,
                    revoked_at: certificate.revoked_at,
                    status: certificate.revoked_at ? 'Revoked' : 'Valid',
                } : null,
            });
        }

        const updatePayload = {
            course_id: courseForProgress.id,
        };
        if (supports.completed_at) updatePayload.completed_at = db.raw('NOW()');
        if (supports.last_watched_at) updatePayload.last_watched_at = db.raw('NOW()');
        if (supports.completion_percentage) {
            updatePayload.completion_percentage = Math.max(Number(existing?.completion_percentage || 0), MINIMUM_WATCH_PERCENTAGE);
        }

        if (existing) {
            await db('progress').where({ id: existing.id }).update(updatePayload);
        } else {
            const insertPayload = {
                user_id: userId,
                lesson_id: lessonId,
                ...updatePayload,
            };
            if (supports.watched_seconds && !insertPayload.watched_seconds) insertPayload.watched_seconds = 0;
            await db('progress').insert(insertPayload);
        }

        const certificate = await issueCertificateIfCourseCompleted({ userId, course: courseForProgress });

        res.status(201).json({
            message: 'Lesson marked as complete',
            certificate: certificate ? {
                uuid: certificate.uuid,
                issued_at: certificate.issued_at,
                revoked_at: certificate.revoked_at,
                status: certificate.revoked_at ? 'Revoked' : 'Valid',
            } : null,
        });
    } catch (error) {
        return sendUnexpectedError(res, error, 'Complete lesson failed');
    }
});

router.get('/course/:courseId', authenticate, async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.user.id;

        const progress = await getCourseProgressSummary(courseId, userId);

        res.json({
            progress_percentage: progress.progress_percentage,
            completed_lessons: progress.completed_lessons,
        });
    } catch (error) {
        return sendUnexpectedError(res, error, 'Get course progress failed');
    }
});

module.exports = router;
