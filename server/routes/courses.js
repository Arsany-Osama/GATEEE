const express = require('express');
const router = express.Router();
const db = require('../db/knex');
const { authenticate, isAdmin } = require('../middleware/auth');
const { sendUnexpectedError } = require('../utils/http');

const publicCourseFields = [
    'id',
    'title',
    'arabic_title',
    'description',
    'thumbnail_url',
    'thumbnail_public_id',
    'price',
    'discount_price',
    'pricing_type',
    'category_id',
    'instructor_id',
    'instructor_name',
    'instructor_subtitle',
    'display_order'
];

const adminCourseFields = [
    ...publicCourseFields,
    'is_published',
    'deleted_at',
    'created_at',
    'updated_at'
];

const courseSchemaSupport = async () => {
    const [categoriesTable, instructorsTable, thumbnail_public_id, category_id, instructor_id, pricing_type, discount_price] = await Promise.all([
        db.schema.hasTable('categories'),
        db.schema.hasTable('instructors'),
        db.schema.hasColumn('courses', 'thumbnail_public_id'),
        db.schema.hasColumn('courses', 'category_id'),
        db.schema.hasColumn('courses', 'instructor_id'),
        db.schema.hasColumn('courses', 'pricing_type'),
        db.schema.hasColumn('courses', 'discount_price')
    ]);

    return {
        categoriesTable,
        instructorsTable,
        thumbnail_public_id,
        category_id,
        instructor_id,
        pricing_type,
        discount_price
    };
};

const requireAdminForAdminMount = (req, res, next) => {
    if (!req.baseUrl.includes('/admin')) return next();
    return authenticate(req, res, () => isAdmin(req, res, next));
};

const normalizePricingType = (value) => {
    const next = String(value || '').toLowerCase().trim();
    if (next === 'free' || next === 'paid' || next === 'discounted') return next;
    return 'paid';
};

const parseFiniteNumber = (value) => {
    if (value === '' || value === null || value === undefined) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
};

const resolvePricingType = (requestedPricingType, priceInput, discountPriceInput) => {
    if (requestedPricingType === 'free') return 'free';

    const price = Number.isFinite(priceInput) ? priceInput : 2000;
    const hasValidDiscount = Number.isFinite(discountPriceInput) && discountPriceInput > 0 && discountPriceInput < price;

    if (hasValidDiscount || requestedPricingType === 'discounted') {
        return 'discounted';
    }

    return 'paid';
};

const normalizeCoursePayload = (body, support = {}) => {
    const requestedPricingType = normalizePricingType(body.pricing_type);
    const priceInput = parseFiniteNumber(body.price);
    const discountPriceInput = parseFiniteNumber(body.discount_price);
    const price = requestedPricingType === 'free' ? 0 : (priceInput ?? 2000);
    const pricingType = resolvePricingType(requestedPricingType, priceInput, discountPriceInput);

    if (!Number.isFinite(price) || price < 0) {
        throw new Error('Course price must be a valid non-negative number.');
    }

    if (pricingType !== 'free' && price <= 0) {
        throw new Error('Paid courses must have a price greater than zero.');
    }

    if (pricingType === 'discounted') {
        if (!Number.isFinite(discountPriceInput) || discountPriceInput === null || discountPriceInput <= 0) {
            throw new Error('Discount price must be a valid positive number.');
        }
        if (discountPriceInput >= price) {
            throw new Error('Discount price must be lower than the original price.');
        }
    }

    const payload = {
        title: String(body.title || '').trim(),
        arabic_title: String(body.arabic_title || '').trim() || null,
        description: String(body.description || '').trim() || null,
        thumbnail_url: String(body.thumbnail_url || '').trim() || null,
        price,
        instructor_name: String(body.instructor_name || 'Ch. Ahmed Gamal Elghawy').trim(),
        instructor_subtitle: String(body.instructor_subtitle || '10+ Years Experience').trim(),
        is_published: body.is_published === undefined ? true : Boolean(body.is_published),
        display_order: Number.isFinite(Number(body.display_order)) ? Number(body.display_order) : 0
    };

    if (support.thumbnail_public_id) payload.thumbnail_public_id = String(body.thumbnail_public_id || '').trim() || null;
    if (support.category_id) payload.category_id = body.category_id ? Number(body.category_id) : null;
    if (support.instructor_id) payload.instructor_id = body.instructor_id ? Number(body.instructor_id) : null;
    if (support.pricing_type) payload.pricing_type = pricingType;
    if (support.discount_price) payload.discount_price = pricingType === 'discounted' ? discountPriceInput : null;

    return payload;
};

const hydrateCourseReferences = async (payload, support = {}) => {
    const next = { ...payload };
    if (support.categoriesTable && support.category_id && next.category_id) {
        const category = await db('categories').where({ id: next.category_id }).first('id');
        if (!category) {
            const error = new Error('Select a valid category.');
            error.statusCode = 400;
            throw error;
        }
    }
    if (support.instructorsTable && support.instructor_id && next.instructor_id) {
        const instructor = await db('instructors').where({ id: next.instructor_id }).first('id', 'name', 'subtitle');
        if (!instructor) {
            const error = new Error('Select a valid instructor.');
            error.statusCode = 400;
            throw error;
        }
        next.instructor_name = instructor.name;
        next.instructor_subtitle = instructor.subtitle || next.instructor_subtitle || null;
    }
    return next;
};

const fieldsForSupport = (fields, support) => fields.filter((field) => {
    if (field === 'thumbnail_public_id') return support.thumbnail_public_id;
    if (field === 'category_id') return support.category_id;
    if (field === 'instructor_id') return support.instructor_id;
    if (field === 'pricing_type') return support.pricing_type;
    if (field === 'discount_price') return support.discount_price;
    return true;
});

const validId = (value) => {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
};

const buildPublicCoursesQuery = (support, query = {}) => {
    const baseQuery = db('courses').whereNull('courses.deleted_at');
    const hasPricingFilter = query.pricing_type !== undefined && query.pricing_type !== null && String(query.pricing_type).trim() !== '';
    const pricingType = hasPricingFilter ? normalizePricingType(query.pricing_type) : 'all';
    const wantsPagination = query.page !== undefined || query.limit !== undefined;

    if (support.categoriesTable && support.category_id) {
        baseQuery.leftJoin('categories', 'courses.category_id', 'categories.id');
    }

    if (support.instructorsTable && support.instructor_id) {
        baseQuery.leftJoin('instructors', 'courses.instructor_id', 'instructors.id');
    }

    if (support.pricing_type) {
        if (pricingType === 'free') {
            baseQuery.where('courses.pricing_type', 'free');
        } else if (pricingType === 'discounted') {
            baseQuery.where('courses.pricing_type', 'discounted');
        } else if (pricingType === 'paid') {
            baseQuery.whereIn('courses.pricing_type', ['paid', 'discounted']);
        }
    } else if (pricingType === 'free') {
        baseQuery.where((builder) => {
            builder.whereNull('courses.price').orWhere('courses.price', '<=', 0);
        });
    } else if (pricingType === 'paid' || pricingType === 'discounted') {
        baseQuery.where('courses.price', '>', 0);
    }

    return { baseQuery, pricingType, wantsPagination };
};

const applyPublicSearchAndFilters = (queryBuilder, support, query = {}) => {
    const search = String(query.q || query.search || '').trim();
    const categoryId = query.category_id ? Number(query.category_id) : null;

    if (search) {
        queryBuilder.where((builder) => {
            builder
                .where('courses.title', 'like', `%${search}%`)
                .orWhere('courses.arabic_title', 'like', `%${search}%`)
                .orWhere('courses.description', 'like', `%${search}%`)
                .orWhere('courses.instructor_name', 'like', `%${search}%`)
                .orWhere('courses.instructor_subtitle', 'like', `%${search}%`);
        });
    }

    if (support.category_id && Number.isInteger(categoryId) && categoryId > 0) {
        queryBuilder.where('courses.category_id', categoryId);
    }

    return queryBuilder;
};

let lessonContentSupportPromise = null;
let lessonContentSupportCache = null;

const lessonContentSupport = async () => {
    if (lessonContentSupportCache) return lessonContentSupportCache;
    if (!lessonContentSupportPromise) {
        lessonContentSupportPromise = Promise.all([
            db.schema.hasColumn('lessons', 'description'),
            db.schema.hasColumn('lessons', 'is_published')
        ])
            .then(([description, is_published]) => {
                lessonContentSupportCache = { description, is_published };
                return lessonContentSupportCache;
            })
            .finally(() => {
                lessonContentSupportPromise = null;
            });
    }

    return lessonContentSupportPromise;
};

// 1. Create a Course (Admin only)
router.post('/', authenticate, isAdmin, async (req, res) => {
    try {
        const schema = await courseSchemaSupport();
        const payload = await hydrateCourseReferences(normalizeCoursePayload(req.body, schema), schema);
        if (!payload.title) {
            return res.status(400).json({ error: 'Course title is required.' });
        }
        const [courseId] = await db('courses').insert(payload);
        res.status(201).json({ id: courseId, title: payload.title, message: 'Course created!' });
    } catch (error) {
        return sendUnexpectedError(res, error, 'Create course failed');
    }
});

// 2. Add a Playlist to a Course
router.post('/:courseId/playlists', authenticate, isAdmin, async (req, res) => {
    try {
        const { title, order_index } = req.body;
        const [playlistId] = await db('playlists').insert({
            course_id: req.params.courseId,
            title,
            order_index: order_index || 0
        });
        res.status(201).json({ id: playlistId, title, message: 'Playlist added!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update a playlist title/order
router.put('/playlists/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const { title, order_index } = req.body;
        await db('playlists').where({ id: req.params.id }).update({ title, order_index });
        res.json({ message: 'Playlist updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Soft-delete a playlist and its lessons. Quiz/progress history is retained.
router.delete('/playlists/:id', authenticate, isAdmin, async (req, res) => {
    const playlistId = validId(req.params.id);
    if (!playlistId) return res.status(400).json({ error: 'Select a valid playlist.' });
    try {
        await db.transaction(async (trx) => {
            const now = trx.raw('NOW()');
            const updated = await trx('playlists').where({ id: playlistId }).whereNull('deleted_at').update({ deleted_at: now });
            if (!updated) {
                const error = new Error('Active playlist not found.');
                error.statusCode = 404;
                throw error;
            }
            await trx('lessons').where({ playlist_id: playlistId }).whereNull('deleted_at').update({ deleted_at: now });
        });

        res.json({ message: 'Playlist and lessons moved to deleted content.' });
    } catch (error) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

router.get('/:courseId/curriculum', authenticate, isAdmin, async (req, res) => {
    const courseId = validId(req.params.courseId);
    if (!courseId) return res.status(400).json({ error: 'Select a valid course.' });

    try {
        const course = await db('courses').where({ id: courseId }).whereNull('deleted_at').first();
        if (!course) return res.status(404).json({ error: 'Course not found.' });

        const support = await lessonContentSupport();
        const lessonFields = ['id', 'playlist_id', 'title', 'cloudinary_public_id', 'order_index', 'created_at', 'updated_at'];
        if (support.description) lessonFields.push('description');
        if (support.is_published) lessonFields.push('is_published');

        const playlists = await db('playlists')
            .where({ course_id: courseId })
            .whereNull('deleted_at')
            .select('id', 'course_id', 'title', 'order_index', 'created_at', 'updated_at')
            .orderBy('order_index')
            .orderBy('id');

        for (const playlist of playlists) {
            playlist.lessons = await db('lessons')
                .where({ playlist_id: playlist.id })
                .whereNull('deleted_at')
                .select(lessonFields)
                .orderBy('order_index')
                .orderBy('id');
        }

        res.json({
            course,
            playlists,
            support: {
                playlists: true,
                lesson_ordering: true,
                lesson_upload: true,
                lesson_description: support.description,
                lesson_visibility: support.is_published
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/categories', async (req, res) => {
    try {
        const support = await courseSchemaSupport();
        if (!support.categoriesTable || !support.category_id) {
            return res.json([]);
        }

        const categories = await db('categories')
            .leftJoin('courses', function joinCourses() {
                this.on('courses.category_id', '=', 'categories.id').andOnNull('courses.deleted_at');
            })
            .where(function onlyActiveCategories() {
                this.whereNull('categories.is_active').orWhere('categories.is_active', true);
            })
            .groupBy('categories.id', 'categories.name', 'categories.arabic_name', 'categories.display_order')
            .select(
                'categories.id',
                'categories.name',
                'categories.arabic_name',
                'categories.display_order',
                db.raw('COUNT(courses.id) as course_count')
            )
            .orderBy('categories.display_order', 'asc')
            .orderBy('categories.name', 'asc');

        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. Get Courses. Admin mount returns editable fields; public mount returns only published public fields.
router.get('/', requireAdminForAdminMount, async (req, res) => {
    try {
        const schema = await courseSchemaSupport();
        const publicSelect = fieldsForSupport(publicCourseFields, schema).map((field) => `courses.${field}`);
        const adminSelect = fieldsForSupport(adminCourseFields, schema).map((field) => `courses.${field}`);
        const referenceSelect = [];

        if (req.baseUrl.includes('/admin')) {
            const query = db('courses')
                .whereNull('courses.deleted_at');

            if (schema.categoriesTable && schema.category_id) {
                query.leftJoin('categories', 'courses.category_id', 'categories.id');
                referenceSelect.push(
                    'categories.name as category_name',
                    'categories.arabic_name as category_arabic_name'
                );
            }

            if (schema.instructorsTable && schema.instructor_id) {
                query.leftJoin('instructors', 'courses.instructor_id', 'instructors.id');
                referenceSelect.push(
                    'instructors.name as linked_instructor_name',
                    'instructors.subtitle as linked_instructor_subtitle',
                    'instructors.avatar_url as instructor_avatar_url'
                );
            }

            const courses = await query
                .select([...adminSelect, ...referenceSelect])
                .orderBy('courses.display_order', 'asc')
                .orderBy('courses.created_at', 'desc');
            return res.json(courses);
        }

        const { baseQuery, wantsPagination } = buildPublicCoursesQuery(schema, req.query);
        if (schema.categoriesTable && schema.category_id) {
            referenceSelect.push(
                'categories.name as category_name',
                'categories.arabic_name as category_arabic_name'
            );
        }

        if (schema.instructorsTable && schema.instructor_id) {
            referenceSelect.push(
                'instructors.name as linked_instructor_name',
                'instructors.subtitle as linked_instructor_subtitle',
                'instructors.avatar_url as instructor_avatar_url'
            );
        }

        const publicQuery = applyPublicSearchAndFilters(
            baseQuery.clone().where('courses.is_published', true),
            schema,
            req.query
        );
        const selectedQuery = publicQuery.clone().select([...publicSelect, ...referenceSelect])
            .orderBy('courses.display_order', 'asc')
            .orderBy('courses.id', 'asc');

        if (wantsPagination) {
            const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
            const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 6, 1), 24);
            const offset = (page - 1) * limit;
            const countQuery = applyPublicSearchAndFilters(
                baseQuery.clone().where('courses.is_published', true),
                schema,
                req.query
            ).clearSelect().clearOrder();
            const countRow = await countQuery
                .count({ total: 'courses.id' })
                .first();
            const total = Number(countRow?.total || 0);
            const totalPages = total > 0 ? Math.ceil(total / limit) : 0;
            const data = await selectedQuery.limit(limit).offset(offset);
            return res.json({
                data,
                meta: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            });
        }

        const courses = await selectedQuery;
        return res.json(courses);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. Update a Course
router.put('/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const schema = await courseSchemaSupport();
        const payload = await hydrateCourseReferences(normalizeCoursePayload(req.body, schema), schema);
        if (!payload.title) {
            return res.status(400).json({ error: 'Course title is required.' });
        }
        await db('courses').where({ id: req.params.id }).update(payload);
        res.json({ message: 'Course updated successfully' });
    } catch (error) {
        res.status(error.statusCode || (error.message.includes('price') ? 400 : 500)).json({ error: error.message });
    }
});

// 5. Soft-delete a Course and all related content (mark deleted_at)
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
    const courseId = req.params.id;

    try {
        await db.transaction(async (trx) => {
            const now = trx.raw('NOW()');

            // Mark course deleted
            await trx('courses').where({ id: courseId }).update({ deleted_at: now });

            // Mark playlists
            await trx('playlists').where({ course_id: courseId }).update({ deleted_at: now });

            // Mark lessons
            const playlists = await trx('playlists').where({ course_id: courseId }).select('id');
            const playlistIds = playlists.map(p => p.id);
            if (playlistIds.length) {
                await trx('lessons').whereIn('playlist_id', playlistIds).update({ deleted_at: now });
            }

            // Mark quizzes, quiz_questions, quiz_options, quiz_results as deleted where they belong to lessons
            const lessons = playlistIds.length ? await trx('lessons').whereIn('playlist_id', playlistIds).select('id') : [];
            const lessonIds = lessons.map(l => l.id);
            if (lessonIds.length) {
                const quizzes = await trx('quizzes').whereIn('lesson_id', lessonIds).select('id');
                const quizIds = quizzes.map(q => q.id);
                if (quizIds.length) {
                    await trx('quiz_options').whereIn('quiz_id', quizIds).update({ deleted_at: now }).catch(() => { });
                    await trx('quiz_questions').whereIn('quiz_id', quizIds).update({ deleted_at: now }).catch(() => { });
                    await trx('quiz_results').whereIn('quiz_id', quizIds).update({ deleted_at: now }).catch(() => { });
                    await trx('quizzes').whereIn('id', quizIds).update({ deleted_at: now }).catch(() => { });
                }
            }

            // Mark enrollments and progress
            await trx('enrollments').where({ course_id: courseId }).update({ deleted_at: now }).catch(() => { });
            await trx('progress').where({ course_id: courseId }).update({ deleted_at: now }).catch(() => { });
        });

        res.json({ message: 'Course soft-deleted (content retained).' });
    } catch (error) {
        console.error('Soft-delete failed:', error);
        res.status(500).json({ error: error.message });
    }
});

// 6. Permanent delete endpoint - performs the full cleanup (Cloudinary + DB deletes)
router.post('/:id/permanent', authenticate, isAdmin, async (req, res) => {
    const courseId = req.params.id;
    const cloudinary = require('cloudinary').v2;

    try {
        await db.transaction(async (trx) => {
            // 1. Find playlists for this course
            const playlists = await trx('playlists').where({ course_id: courseId }).select('id');
            const playlistIds = playlists.map(p => p.id);

            // 2. Find lessons under those playlists
            const lessons = playlistIds.length ? await trx('lessons').whereIn('playlist_id', playlistIds).select('id', 'cloudinary_public_id') : [];
            const lessonIds = lessons.map(l => l.id);

            // 3. Delete Cloudinary video resources for each lesson (if any)
            for (const lesson of lessons) {
                if (lesson.cloudinary_public_id) {
                    try {
                        await cloudinary.uploader.destroy(lesson.cloudinary_public_id, { resource_type: 'video', invalidate: true });
                    } catch (err) {
                        console.error('Cloudinary deletion failed for', lesson.cloudinary_public_id, err.message);
                    }
                }
            }

            // 4. Remove quizzes and related records linked to these lessons
            if (lessonIds.length) {
                const quizzes = await trx('quizzes').whereIn('lesson_id', lessonIds).select('id');
                const quizIds = quizzes.map(q => q.id);

                if (quizIds.length) {
                    const questions = await trx('quiz_questions').whereIn('quiz_id', quizIds).select('id');
                    const questionIds = questions.map(q => q.id);

                    if (questionIds.length) {
                        await trx('quiz_options').whereIn('question_id', questionIds).del();
                        await trx('quiz_questions').whereIn('id', questionIds).del();
                    }

                    await trx('quiz_results').whereIn('quiz_id', quizIds).del().catch(() => { });
                    await trx('quizzes').whereIn('id', quizIds).del();
                }
            }

            // 5. Delete lessons
            if (lessonIds.length) {
                await trx('lessons').whereIn('id', lessonIds).del();
            }

            // 6. Delete playlists
            if (playlistIds.length) {
                await trx('playlists').whereIn('id', playlistIds).del();
            }

            // 7. Delete enrollments and progress records for this course
            await trx('enrollments').where({ course_id: courseId }).del().catch(() => { });
            await trx('progress').where({ course_id: courseId }).del().catch(() => { });

            // 8. Finally delete the course
            await trx('courses').where({ id: courseId }).del();
        });

        res.json({ message: 'Course and all related content permanently deleted' });
    } catch (error) {
        console.error('Failed to permanently delete course and related content:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get deleted courses (trash)
router.get('/deleted', authenticate, isAdmin, async (req, res) => {
    try {
        const schema = await courseSchemaSupport();
        const courses = await db('courses')
            .whereNotNull('deleted_at')
            .select(fieldsForSupport(adminCourseFields, schema));
        res.json(courses);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Restore a soft-deleted course and its content
router.post('/:id/restore', authenticate, isAdmin, async (req, res) => {
    const courseId = req.params.id;
    try {
        await db.transaction(async (trx) => {
            await trx('courses').where({ id: courseId }).update({ deleted_at: null });
            await trx('playlists').where({ course_id: courseId }).update({ deleted_at: null });

            const playlists = await trx('playlists').where({ course_id: courseId }).select('id');
            const playlistIds = playlists.map(p => p.id);
            if (playlistIds.length) {
                await trx('lessons').whereIn('playlist_id', playlistIds).update({ deleted_at: null });
            }

            // Restore quizzes and related records where applicable
            const lessons = playlistIds.length ? await trx('lessons').whereIn('playlist_id', playlistIds).select('id') : [];
            const lessonIds = lessons.map(l => l.id);
            if (lessonIds.length) {
                const quizzes = await trx('quizzes').whereIn('lesson_id', lessonIds).select('id');
                const quizIds = quizzes.map(q => q.id);
                if (quizIds.length) {
                    await trx('quiz_options').whereIn('quiz_id', quizIds).update({ deleted_at: null }).catch(() => { });
                    await trx('quiz_questions').whereIn('quiz_id', quizIds).update({ deleted_at: null }).catch(() => { });
                    await trx('quiz_results').whereIn('quiz_id', quizIds).update({ deleted_at: null }).catch(() => { });
                    await trx('quizzes').whereIn('id', quizIds).update({ deleted_at: null }).catch(() => { });
                }
            }

            await trx('enrollments').where({ course_id: courseId }).update({ deleted_at: null }).catch(() => { });
            await trx('progress').where({ course_id: courseId }).update({ deleted_at: null }).catch(() => { });
        });

        res.json({ message: 'Course restored' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
