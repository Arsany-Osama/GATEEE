const express = require('express');
const router = express.Router();
const db = require('../../db/knex');
const { authenticate, isAdmin } = require('../../middleware/auth');
const { sendUnexpectedError } = require('../../utils/http');

const validId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const payloadFrom = (body) => ({
  name: String(body.name || '').trim(),
  arabic_name: String(body.arabic_name || '').trim() || null,
  description: String(body.description || '').trim() || null,
  is_active: body.is_active === undefined ? true : Boolean(body.is_active),
  display_order: Number.isFinite(Number(body.display_order)) ? Number(body.display_order) : 0,
});

let categoriesSupportCache = null;
const categoriesSupport = async () => {
  if (categoriesSupportCache) return categoriesSupportCache;
  const [table, courseCategoryColumn] = await Promise.all([
    db.schema.hasTable('categories'),
    db.schema.hasColumn('courses', 'category_id'),
  ]);
  categoriesSupportCache = { table, courseCategoryColumn };
  return categoriesSupportCache;
};

router.use(authenticate, isAdmin);

router.get('/', async (req, res) => {
  try {
    const support = await categoriesSupport();
    if (!support.table) {
      return res.json({ data: [], support: { categories: false }, message: 'Categories migration has not run yet.' });
    }

    const courseCountSelect = support.courseCategoryColumn
      ? db.raw('(SELECT COUNT(*) FROM courses WHERE courses.category_id = categories.id AND courses.deleted_at IS NULL) as course_count')
      : db.raw('0 as course_count');

    const categories = await db('categories')
      .select(
        'categories.id',
        'categories.name',
        'categories.arabic_name',
        'categories.description',
        'categories.is_active',
        'categories.display_order',
        'categories.created_at',
        'categories.updated_at',
        courseCountSelect
      )
      .orderBy('categories.display_order', 'asc')
      .orderBy('categories.name', 'asc');

    res.json(categories);
  } catch (error) {
    return sendUnexpectedError(res, error, 'List categories failed');
  }
});

router.post('/', async (req, res) => {
  try {
    const support = await categoriesSupport();
    if (!support.table) return res.status(503).json({ error: 'Categories are unavailable until database migrations run.' });
    const payload = payloadFrom(req.body);
    if (!payload.name) return res.status(400).json({ error: 'Category name is required.' });
    const [id] = await db('categories').insert(payload);
    res.status(201).json({ id, message: 'Category created.' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Category name already exists.' });
    return sendUnexpectedError(res, error, 'Create category failed');
  }
});

router.put('/:id', async (req, res) => {
  const id = validId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Select a valid category.' });
  try {
    const support = await categoriesSupport();
    if (!support.table) return res.status(503).json({ error: 'Categories are unavailable until database migrations run.' });
    const payload = payloadFrom(req.body);
    if (!payload.name) return res.status(400).json({ error: 'Category name is required.' });
    const updated = await db('categories').where({ id }).update(payload);
    if (!updated) return res.status(404).json({ error: 'Category not found.' });
    res.json({ message: 'Category updated.' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Category name already exists.' });
    return sendUnexpectedError(res, error, 'Update category failed');
  }
});

router.delete('/:id', async (req, res) => {
  const id = validId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Select a valid category.' });
  try {
    const support = await categoriesSupport();
    if (!support.table) return res.status(503).json({ error: 'Categories are unavailable until database migrations run.' });
    const linkedCourses = support.courseCategoryColumn
      ? await db('courses').where({ category_id: id }).whereNull('deleted_at').count({ count: 'id' }).first()
      : { count: 0 };
    if (Number(linkedCourses?.count || 0) > 0) {
      return res.status(409).json({ error: 'Move courses out of this category before deleting it.' });
    }
    const deleted = await db('categories').where({ id }).del();
    if (!deleted) return res.status(404).json({ error: 'Category not found.' });
    res.json({ message: 'Category deleted.' });
  } catch (error) {
    return sendUnexpectedError(res, error, 'Delete category failed');
  }
});

module.exports = router;
