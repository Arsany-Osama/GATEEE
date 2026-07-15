const express = require('express');
const router = express.Router();
const db = require('../../db/knex'); // Adjust path based on your folder structure
const { authenticate, isAdmin } = require('../../middleware/auth');
const { sendUnexpectedError } = require('../../utils/http');

let courseSchemaSupportPromise = null;
let courseSchemaSupportCache = null;

const courseSchemaSupport = async () => {
    if (courseSchemaSupportCache) return courseSchemaSupportCache;
    if (!courseSchemaSupportPromise) {
        courseSchemaSupportPromise = Promise.all([
            db.schema.hasTable('categories'),
            db.schema.hasTable('instructors'),
            db.schema.hasColumn('courses', 'thumbnail_public_id'),
            db.schema.hasColumn('courses', 'category_id'),
            db.schema.hasColumn('courses', 'instructor_id')
        ])
            .then(([categoriesTable, instructorsTable, thumbnail_public_id, category_id, instructor_id]) => {
                courseSchemaSupportCache = {
                    categoriesTable,
                    instructorsTable,
                    thumbnail_public_id,
                    category_id,
                    instructor_id
                };
                return courseSchemaSupportCache;
            })
            .finally(() => {
                courseSchemaSupportPromise = null;
            });
    }

    return courseSchemaSupportPromise;
};

// GET /admin/dashboard/data -> Fetches data for the admin dropdowns and tables
router.get('/data', authenticate, isAdmin, async (req, res) => {
    try {
        const users = await db('users')
            .select('id', 'name', 'email', 'role', 'created_at')
            .orderBy('created_at', 'desc');
        const schema = await courseSchemaSupport();
        const courseSelect = [
            'courses.id',
            'courses.title',
            'courses.arabic_title',
            'courses.description',
            'courses.thumbnail_url',
            'courses.price',
            'courses.instructor_name',
            'courses.instructor_subtitle',
            'courses.is_published',
            'courses.display_order',
            'courses.created_at'
        ];

        const courseQuery = db('courses').whereNull('courses.deleted_at');
        if (schema.thumbnail_public_id) courseSelect.push('courses.thumbnail_public_id');
        if (schema.category_id) courseSelect.push('courses.category_id');
        if (schema.instructor_id) courseSelect.push('courses.instructor_id');
        if (schema.categoriesTable && schema.category_id) {
            courseQuery.leftJoin('categories', 'courses.category_id', 'categories.id');
            courseSelect.push('categories.name as category_name', 'categories.arabic_name as category_arabic_name');
        }
        if (schema.instructorsTable && schema.instructor_id) {
            courseQuery.leftJoin('instructors', 'courses.instructor_id', 'instructors.id');
            courseSelect.push('instructors.name as linked_instructor_name', 'instructors.subtitle as linked_instructor_subtitle');
        }

        const courses = await courseQuery
            .select(courseSelect)
            .orderBy('courses.display_order', 'asc')
            .orderBy('courses.created_at', 'desc');
        
        // Get all current enrollments to display in the table
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
                'users.name',
                'users.email',
                'courses.title as course_title'
            )
            .orderBy('enrollments.created_at', 'desc');

        res.json({ users, courses, enrollments });
    } catch (error) {
        return sendUnexpectedError(res, error, 'Admin dashboard data failed');
    }
});

module.exports = router;
