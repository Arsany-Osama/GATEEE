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
  subtitle: String(body.subtitle || '').trim() || null,
  bio: String(body.bio || '').trim() || null,
  avatar_url: String(body.avatar_url || '').trim() || null,
  email: String(body.email || '').trim() || null,
  is_active: body.is_active === undefined ? true : Boolean(body.is_active),
});

let instructorsSupportCache = null;
const instructorsSupport = async () => {
  if (instructorsSupportCache) return instructorsSupportCache;
  const [table, courseInstructorColumn] = await Promise.all([
    db.schema.hasTable('instructors'),
    db.schema.hasColumn('courses', 'instructor_id'),
  ]);
  instructorsSupportCache = { table, courseInstructorColumn };
  return instructorsSupportCache;
};

router.use(authenticate, isAdmin);

router.get('/', async (req, res) => {
  try {
    const support = await instructorsSupport();
    if (!support.table) {
      return res.json({ data: [], support: { instructors: false }, message: 'Instructors migration has not run yet.' });
    }

    const courseCountSelect = support.courseInstructorColumn
      ? db.raw('(SELECT COUNT(*) FROM courses WHERE courses.instructor_id = instructors.id AND courses.deleted_at IS NULL) as course_count')
      : db.raw('0 as course_count');

    const instructors = await db('instructors')
      .select(
        'instructors.id',
        'instructors.name',
        'instructors.arabic_name',
        'instructors.subtitle',
        'instructors.bio',
        'instructors.avatar_url',
        'instructors.email',
        'instructors.is_active',
        'instructors.created_at',
        'instructors.updated_at',
        courseCountSelect
      )
      .orderBy('instructors.name', 'asc');

    res.json(instructors);
  } catch (error) {
    return sendUnexpectedError(res, error, 'List instructors failed');
  }
});

router.post('/', async (req, res) => {
  try {
    const support = await instructorsSupport();
    if (!support.table) return res.status(503).json({ error: 'Instructors are unavailable until database migrations run.' });
    const payload = payloadFrom(req.body);
    if (!payload.name) return res.status(400).json({ error: 'Instructor name is required.' });
    const [id] = await db('instructors').insert(payload);
    res.status(201).json({ id, message: 'Instructor created.' });
  } catch (error) {
    return sendUnexpectedError(res, error, 'Create instructor failed');
  }
});

router.put('/:id', async (req, res) => {
  const id = validId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Select a valid instructor.' });
  try {
    const support = await instructorsSupport();
    if (!support.table) return res.status(503).json({ error: 'Instructors are unavailable until database migrations run.' });
    const payload = payloadFrom(req.body);
    if (!payload.name) return res.status(400).json({ error: 'Instructor name is required.' });
    const updated = await db('instructors').where({ id }).update(payload);
    if (!updated) return res.status(404).json({ error: 'Instructor not found.' });
    res.json({ message: 'Instructor updated.' });
  } catch (error) {
    return sendUnexpectedError(res, error, 'Update instructor failed');
  }
});

router.delete('/:id', async (req, res) => {
  const id = validId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Select a valid instructor.' });
  try {
    const support = await instructorsSupport();
    if (!support.table) return res.status(503).json({ error: 'Instructors are unavailable until database migrations run.' });
    const linkedCourses = support.courseInstructorColumn
      ? await db('courses').where({ instructor_id: id }).whereNull('deleted_at').count({ count: 'id' }).first()
      : { count: 0 };
    if (Number(linkedCourses?.count || 0) > 0) {
      return res.status(409).json({ error: 'Move courses away from this instructor before deleting them.' });
    }
    const deleted = await db('instructors').where({ id }).del();
    if (!deleted) return res.status(404).json({ error: 'Instructor not found.' });
    res.json({ message: 'Instructor deleted.' });
  } catch (error) {
    return sendUnexpectedError(res, error, 'Delete instructor failed');
  }
});

module.exports = router;
