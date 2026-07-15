const express = require('express');
const router = express.Router();
const db = require('../db/knex');
const { authenticate } = require('../middleware/auth');
const { ensureCertificateForCourse } = require('../services/certificates');
const { sendUnexpectedError } = require('../utils/http');

let lessonSupportsPublishPromise = null;
let lessonSupportsPublishCache = null;
let progressSupportPromise = null;
let progressSupportCache = null;

const lessonSupportsPublish = async () => {
    if (lessonSupportsPublishCache !== null) return lessonSupportsPublishCache;
    if (!lessonSupportsPublishPromise) {
        lessonSupportsPublishPromise = db.schema.hasColumn('lessons', 'is_published')
            .then((result) => {
                lessonSupportsPublishCache = result;
                return result;
            })
            .finally(() => {
                lessonSupportsPublishPromise = null;
            });
    }

    return lessonSupportsPublishPromise;
};

const progressSupportsCompletion = async () => {
    if (progressSupportCache) return progressSupportCache;
    if (!progressSupportPromise) {
        progressSupportPromise = Promise.all([
            db.schema.hasColumn('progress', 'completed_at'),
            db.schema.hasColumn('progress', 'completion_percentage'),
        ])
            .then(([completedAt, completionPercentage]) => {
                progressSupportCache = { completedAt, completionPercentage };
                return progressSupportCache;
            })
            .finally(() => {
                progressSupportPromise = null;
            });
    }

    return progressSupportPromise;
};

const getCourseProgressSummary = async (courseId, userId) => {
    const lessonsQuery = db('lessons')
        .join('playlists', 'lessons.playlist_id', 'playlists.id')
        .where('playlists.course_id', courseId)
        .whereNull('playlists.deleted_at')
        .whereNull('lessons.deleted_at')
        .select('lessons.id');
    if (await lessonSupportsPublish()) lessonsQuery.where('lessons.is_published', true);
    const lessons = await lessonsQuery;

    const lessonIds = lessons.map((lesson) => lesson.id);
    if (!lessonIds.length) {
        return { completed_lessons: 0, total_lessons: 0, progress_percentage: 0 };
    }

    const completedQuery = db('progress')
        .where({ user_id: userId })
        .whereIn('lesson_id', lessonIds)
        .whereNull('deleted_at')
        .countDistinct({ count: 'lesson_id' })
        .first();
    const progressSupport = await progressSupportsCompletion();
    if (progressSupport.completedAt) completedQuery.whereNotNull('completed_at');
    else if (progressSupport.completionPercentage) completedQuery.where('completion_percentage', '>=', 80);
    const completed = await completedQuery;

    const completedLessons = Number(completed?.count || 0);
    const progressPercentage = Math.round((completedLessons / lessonIds.length) * 100);

    return {
        completed_lessons: completedLessons,
        total_lessons: lessonIds.length,
        progress_percentage: Math.max(0, Math.min(100, progressPercentage))
    };
};

// 1. Get user's enrolled courses for the Dashboard
router.get('/my-courses', authenticate, async (req, res) => {
    try {
        const courses = await db('courses')
            .join('enrollments', 'courses.id', 'enrollments.course_id')
            .where('enrollments.user_id', req.user.id)
            .whereNull('enrollments.deleted_at')
            .whereNull('courses.deleted_at')
            .select(
                'courses.id',
                'courses.title',
                'courses.arabic_title',
                'courses.description',
                'courses.thumbnail_url',
                'courses.instructor_name',
                'courses.instructor_subtitle'
            )
            .orderBy('enrollments.created_at', 'desc');
        res.json(courses);
    } catch (err) {
        return sendUnexpectedError(res, err, 'Student courses failed');
    }
});

// 1b. Get user's enrolled courses with real progress totals for the Dashboard
router.get('/dashboard', authenticate, async (req, res) => {
    try {
        const courses = await db('courses')
            .join('enrollments', 'courses.id', 'enrollments.course_id')
            .where('enrollments.user_id', req.user.id)
            .whereNull('enrollments.deleted_at')
            .whereNull('courses.deleted_at')
            .select(
                'courses.id',
                'courses.id as course_id',
                'courses.title',
                'courses.arabic_title',
                'courses.description',
                'courses.thumbnail_url',
                'courses.price',
                'courses.instructor_name',
                'courses.instructor_subtitle',
                'enrollments.created_at as enrolled_at'
            )
            .orderBy('enrollments.created_at', 'desc');

        const courseIds = courses.map((course) => Number(course.id));
        if (!courseIds.length) return res.json([]);

        const supportsPublish = await lessonSupportsPublish();
        const lessonCountsQuery = db('lessons')
            .join('playlists', 'lessons.playlist_id', 'playlists.id')
            .whereIn('playlists.course_id', courseIds)
            .whereNull('playlists.deleted_at')
            .whereNull('lessons.deleted_at')
            .select('playlists.course_id')
            .countDistinct({ total_lessons: 'lessons.id' })
            .groupBy('playlists.course_id');
        if (supportsPublish) lessonCountsQuery.where('lessons.is_published', true);

        const completedCountsQuery = db('progress')
            .join('lessons', 'progress.lesson_id', 'lessons.id')
            .join('playlists', 'lessons.playlist_id', 'playlists.id')
            .where('progress.user_id', req.user.id)
            .whereIn('playlists.course_id', courseIds)
            .whereNull('progress.deleted_at')
            .whereNull('lessons.deleted_at')
            .whereNull('playlists.deleted_at')
            .select('playlists.course_id')
            .countDistinct({ completed_lessons: 'progress.lesson_id' })
            .groupBy('playlists.course_id');
        if (supportsPublish) completedCountsQuery.where('lessons.is_published', true);
        const progressSupport = await progressSupportsCompletion();
        if (progressSupport.completedAt) completedCountsQuery.whereNotNull('progress.completed_at');
        else if (progressSupport.completionPercentage) completedCountsQuery.where('progress.completion_percentage', '>=', 80);

        const [lessonCounts, completedCounts, certificateRows] = await Promise.all([
            lessonCountsQuery,
            completedCountsQuery,
            db('certificates')
                .where('user_id', req.user.id)
                .whereIn('course_id', courseIds)
                .select('uuid', 'course_id', 'issued_at', 'revoked_at')
        ]);

        const lessonsByCourse = new Map(lessonCounts.map((row) => [Number(row.course_id), Number(row.total_lessons || 0)]));
        const completedByCourse = new Map(completedCounts.map((row) => [Number(row.course_id), Number(row.completed_lessons || 0)]));
        const certByCourse = new Map(certificateRows.map((row) => [Number(row.course_id), row]));

        const dashboardCourses = await Promise.all(courses.map(async (course) => {
            const totalLessons = lessonsByCourse.get(Number(course.id)) || 0;
            const completedLessons = completedByCourse.get(Number(course.id)) || 0;
            let certificate = certByCourse.get(Number(course.id)) || null;
            const progressPercentage = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;

            if (!certificate && totalLessons > 0 && progressPercentage >= 100) {
                certificate = await ensureCertificateForCourse(req.user.id, course.id).catch((error) => {
                    console.error('Dashboard certificate issue failed:', error);
                    return null;
                });
            }

            return {
                ...course,
                completed_lessons: completedLessons,
                total_lessons: totalLessons,
                progress_percentage: Math.max(0, Math.min(100, progressPercentage)),
                certificate: certificate ? {
                    uuid: certificate.uuid,
                    issued_at: certificate.issued_at,
                    revoked_at: certificate.revoked_at,
                    status: certificate.revoked_at ? 'Revoked' : 'Valid',
                } : null,
            };
        }));

        res.json(dashboardCourses);
    } catch (err) {
        return sendUnexpectedError(res, err, 'Student dashboard failed');
    }
});

router.get('/certificates', authenticate, async (req, res) => {
    try {
        const certificates = await db('certificates')
            .join('courses', 'certificates.course_id', 'courses.id')
            .where('certificates.user_id', req.user.id)
            .select('certificates.uuid', 'certificates.course_id', 'certificates.issued_at', 'certificates.revoked_at', 'courses.title as course_name')
            .orderBy('certificates.issued_at', 'desc');
        res.json(certificates.map((certificate) => ({
            ...certificate,
            status: certificate.revoked_at ? 'Revoked' : 'Valid',
        })));
    } catch (err) {
        return sendUnexpectedError(res, err, 'Student certificates failed');
    }
});

// 2. Get full course curriculum (Playlists + Lessons) for the Player
router.get('/courses/:id/curriculum', authenticate, async (req, res) => {
    try {
        const courseId = req.params.id;

        // Security: Check if enrolled (Admins bypass)
        const enrolled = await db('enrollments').where({ user_id: req.user.id, course_id: courseId }).whereNull('deleted_at').first();
        if (!enrolled && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'You are not enrolled in this course.' });
        }

        const course = await db('courses').where({ id: courseId }).whereNull('deleted_at').first();
        if (!course) {
            return res.status(404).json({ error: 'Course not found.' });
        }
        const playlists = await db('playlists').where({ course_id: course.id }).whereNull('deleted_at').orderBy('order_index');
        const supportsPublish = await lessonSupportsPublish();
        const playlistIds = playlists.map((playlist) => playlist.id);
        const lessonsQuery = playlistIds.length
            ? db('lessons')
                .whereIn('playlist_id', playlistIds)
                .whereNull('deleted_at')
                .orderBy('order_index')
                .orderBy('id')
                .select('id', 'playlist_id', 'title', 'order_index')
            : null;
        if (lessonsQuery && supportsPublish) lessonsQuery.where('is_published', true);
        const lessons = lessonsQuery ? await lessonsQuery : [];
        const lessonsByPlaylist = new Map();
        lessons.forEach((lesson) => {
            lessonsByPlaylist.set(lesson.playlist_id, [...(lessonsByPlaylist.get(lesson.playlist_id) || []), lesson]);
        });
        playlists.forEach((playlist) => {
            playlist.lessons = lessonsByPlaylist.get(playlist.id) || [];
        });
        res.json({ course, playlists });
    } catch (err) {
        return sendUnexpectedError(res, err, 'Student curriculum failed');
    }
});

module.exports = router;
