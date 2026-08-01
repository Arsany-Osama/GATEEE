const express = require('express');
const router = express.Router();
const db = require('../db/knex');

let summarySupportPromise = null;
let summarySupportCache = null;

const summarySupport = async () => {
    if (summarySupportCache) return summarySupportCache;
    if (!summarySupportPromise) {
        summarySupportPromise = Promise.all([
            db.schema.hasColumn('courses', 'deleted_at'),
            db.schema.hasColumn('courses', 'is_published'),
            db.schema.hasColumn('courses', 'pricing_type'),
            db.schema.hasColumn('lessons', 'deleted_at'),
            db.schema.hasColumn('playlists', 'deleted_at'),
            db.schema.hasColumn('enrollments', 'deleted_at'),
        ])
            .then(([courseDeletedAt, courseIsPublished, coursePricingType, lessonDeletedAt, playlistDeletedAt, enrollmentDeletedAt]) => {
                summarySupportCache = {
                    courseDeletedAt,
                    courseIsPublished,
                    coursePricingType,
                    lessonDeletedAt,
                    playlistDeletedAt,
                    enrollmentDeletedAt,
                };
                return summarySupportCache;
            })
            .finally(() => {
                summarySupportPromise = null;
            });
    }

    return summarySupportPromise;
};

const countRows = async (table, apply = null) => {
    const query = db(table);
    if (apply) apply(query);
    const row = await query.count({ count: '*' }).first();
    return Number(row?.count || 0);
};

router.get('/summary', async (req, res) => {
    try {
        const support = await summarySupport();

        const coursesQuery = db('courses');
        if (support.courseDeletedAt) coursesQuery.whereNull('courses.deleted_at');
        const totalCourses = Number((await coursesQuery.clone().count({ count: '*' }).first())?.count || 0);

        const publishedCourses = support.courseIsPublished
            ? Number((await coursesQuery.clone().where({ is_published: true }).count({ count: '*' }).first())?.count || 0)
            : totalCourses;
        const freeCourses = support.coursePricingType
            ? Number((await coursesQuery.clone().where((builder) => {
                builder.where('pricing_type', 'free').orWhere('price', '<=', 0);
            }).count({ count: '*' }).first())?.count || 0)
            : Number((await coursesQuery.clone().where((builder) => builder.whereNull('price').orWhere('price', '<=', 0)).count({ count: '*' }).first())?.count || 0);
        const paidCourses = Math.max(0, totalCourses - freeCourses);

        const totalStudents = await countRows('users', (query) => query.where({ role: 'student' }));
        const activeEnrollments = await countRows('enrollments', (query) => {
            if (support.enrollmentDeletedAt) query.whereNull('deleted_at');
        });

        const totalLessons = await countRows('lessons', (query) => {
            if (support.lessonDeletedAt) query.whereNull('deleted_at');
        });
        const totalPlaylists = await countRows('playlists', (query) => {
            if (support.playlistDeletedAt) query.whereNull('deleted_at');
        });

        res.json({
            total_courses: totalCourses,
            published_courses: publishedCourses,
            free_courses: freeCourses,
            paid_courses: paidCourses,
            total_students: totalStudents,
            active_enrollments: activeEnrollments,
            total_lessons: totalLessons,
            total_playlists: totalPlaylists,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
