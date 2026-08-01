const express = require('express');
const router = express.Router();
const db = require('../db/knex');
const { authenticate, isAdmin } = require('../middleware/auth');
const { createOrRestoreEnrollment } = require('../utils/enrollments');
const { notifyUser } = require('../services/notifications');
const { sendUnexpectedError } = require('../utils/http');

let coursePricingSupportPromise = null;
let coursePricingSupportCache = null;

const coursePricingSupport = async () => {
    if (coursePricingSupportCache) return coursePricingSupportCache;
    if (!coursePricingSupportPromise) {
        coursePricingSupportPromise = Promise.all([
            db.schema.hasColumn('courses', 'pricing_type'),
            db.schema.hasColumn('courses', 'discount_price')
        ])
            .then(([pricing_type, discount_price]) => {
                coursePricingSupportCache = { pricing_type, discount_price };
                return coursePricingSupportCache;
            })
            .finally(() => {
                coursePricingSupportPromise = null;
            });
    }

    return coursePricingSupportPromise;
};

const isFreeCourse = async (course) => {
    const support = await coursePricingSupport();
    if (support.pricing_type) {
        return String(course?.pricing_type || '').toLowerCase() === 'free' || Number(course?.price || 0) <= 0;
    }
    return Number(course?.price || 0) <= 0;
};

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

// Self-enroll in a free course
router.post('/me/:courseId', authenticate, async (req, res) => {
    const courseId = Number(req.params.courseId);
    if (!Number.isInteger(courseId) || courseId <= 0) {
        return res.status(400).json({ error: 'Select a valid course.' });
    }

    try {
        const course = await db('courses').where({ id: courseId }).whereNull('deleted_at').first();
        if (!course) {
            return res.status(404).json({ error: 'Course not found.' });
        }

        if (!(await isFreeCourse(course))) {
            return res.status(403).json({ error: 'Only free courses can be opened automatically.' });
        }

        const enrollment = await db.transaction((trx) => createOrRestoreEnrollment(trx, req.user.id, courseId));
        return res.status(enrollment.action === 'created' ? 201 : 200).json({
            message: enrollment.action === 'created' ? 'Course opened successfully.' : 'Course access restored.',
            enrollment_action: enrollment.action,
        });
    } catch (error) {
        return sendUnexpectedError(res, error, 'Course opening failed');
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
