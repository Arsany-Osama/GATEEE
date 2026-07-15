const express = require('express');
const router = express.Router();
const db = require('../db/knex');
const { authenticate, isAdmin } = require('../middleware/auth');
const { createOrRestoreEnrollment } = require('../utils/enrollments');
const { notifyUser } = require('../services/notifications');
const { sendUnexpectedError } = require('../utils/http');

// 1. Enroll a student (Admin Only)
router.post('/enroll', authenticate, isAdmin, async (req, res) => {
    const { user_id, course_id } = req.body;
    try {
        const user = await db('users').where({ id: user_id }).first();
        const course = await db('courses').where({ id: course_id }).whereNull('deleted_at').first();

        if (!user || user.role === 'admin') {
            return res.status(400).json({ error: 'Select a valid student account.' });
        }

        if (!course) {
            return res.status(400).json({ error: 'Select an active course.' });
        }

        const existing = await db('enrollments').where({ user_id, course_id }).first();
        if (existing && existing.deleted_at) {
            const enrollment = await db.transaction((trx) => createOrRestoreEnrollment(trx, user_id, course_id));
            await notifyUser(user_id, {
                actor_user_id: req.user.id,
                type: 'course_enrolled',
                title: 'Course opened',
                message: `You have been enrolled in ${course.title || 'a course'}. You can continue from your dashboard.`,
                entity_type: 'course',
                entity_id: course.id,
                metadata: { course_title: course.title, enrollment_action: enrollment.action },
            });
            return res.json({ message: 'Student enrollment restored successfully' });
        }

        if (existing) {
            return res.status(409).json({ error: 'Student is already enrolled in this course' });
        }

        const enrollment = await db.transaction((trx) => createOrRestoreEnrollment(trx, user_id, course_id));
        await notifyUser(user_id, {
            actor_user_id: req.user.id,
            type: 'course_enrolled',
            title: 'Course opened',
            message: `You have been enrolled in ${course.title || 'a course'}. You can continue from your dashboard.`,
            entity_type: 'course',
            entity_id: course.id,
            metadata: { course_title: course.title, enrollment_action: enrollment.action },
        });
        res.status(201).json({ message: 'Student enrolled successfully' });
    } catch (error) {
        return sendUnexpectedError(res, error, 'Admin progress failed');
    }
});

// 2. See student progress (Admin Only)
router.get('/progress', authenticate, isAdmin, async (req, res) => {
    try {
        const enrollments = await db('enrollments')
            .join('users', 'enrollments.user_id', 'users.id')
            .join('courses', 'enrollments.course_id', 'courses.id')
            .whereNull('enrollments.deleted_at')
            .whereNull('courses.deleted_at')
            .select(
                'enrollments.id',
                'enrollments.user_id',
                'enrollments.course_id',
                'enrollments.created_at',
                'users.name as student_name',
                'users.email',
                'courses.title as course_title'
            )
            .orderBy('enrollments.created_at', 'desc');

        const report = [];

        for (const enrollment of enrollments) {
            const lessons = await db('lessons')
                .join('playlists', 'lessons.playlist_id', 'playlists.id')
                .where('playlists.course_id', enrollment.course_id)
                .whereNull('playlists.deleted_at')
                .whereNull('lessons.deleted_at')
                .select('lessons.id');
            const lessonIds = lessons.map((lesson) => lesson.id);
            const completed = lessonIds.length
                ? await db('progress')
                    .where({ user_id: enrollment.user_id })
                    .whereIn('lesson_id', lessonIds)
                    .whereNull('deleted_at')
                    .countDistinct({ count: 'lesson_id' })
                    .first()
                : { count: 0 };
            const completedLessons = Number(completed?.count || 0);
            const totalLessons = lessonIds.length;

            report.push({
                ...enrollment,
                completed_lessons: completedLessons,
                total_lessons: totalLessons,
                progress_percentage: totalLessons ? Math.round((completedLessons / totalLessons) * 100) : null,
                status: totalLessons ? 'Reported' : 'No lessons'
            });
        }

        res.json(report);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
