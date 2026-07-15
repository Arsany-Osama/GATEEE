const express = require('express');
const router = express.Router();
const db = require('../../db/knex');
const { authenticate, isAdmin } = require('../../middleware/auth');
const { sendUnexpectedError } = require('../../utils/http');

const fallbackImage = '/images/cover of course.png';

const validId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const hasAccountStatusColumns = async () => {
  const [isActive, disabledAt, disabledBy] = await Promise.all([
    db.schema.hasColumn('users', 'is_active'),
    db.schema.hasColumn('users', 'disabled_at'),
    db.schema.hasColumn('users', 'disabled_by'),
  ]);
  return isActive && disabledAt && disabledBy;
};

const getLessonIdsForCourse = async (trx, courseId) => {
  const lessons = await trx('lessons')
    .join('playlists', 'lessons.playlist_id', 'playlists.id')
    .where('playlists.course_id', courseId)
    .whereNull('playlists.deleted_at')
    .whereNull('lessons.deleted_at')
    .select('lessons.id');
  return lessons.map((lesson) => lesson.id);
};

const getProgressSummary = async (trx, userId, courseId) => {
  const lessonIds = await getLessonIdsForCourse(trx, courseId);
  if (!lessonIds.length) {
    return { completed_lessons: 0, total_lessons: 0, progress_percentage: 0 };
  }

  const completed = await trx('progress')
    .where({ user_id: userId })
    .whereIn('lesson_id', lessonIds)
    .whereNull('deleted_at')
    .countDistinct({ count: 'lesson_id' })
    .first();

  const completedLessons = Number(completed?.count || 0);
  return {
    completed_lessons: completedLessons,
    total_lessons: lessonIds.length,
    progress_percentage: Math.round((completedLessons / lessonIds.length) * 100),
  };
};

const serializeUser = (user, supportsStatus) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  created_at: user.created_at,
  updated_at: user.updated_at,
  enrolled_courses_count: Number(user.enrolled_courses_count || 0),
  is_active: supportsStatus ? Boolean(user.is_active) : true,
  disabled_at: supportsStatus ? user.disabled_at : null,
  account_status_supported: supportsStatus,
});

router.get('/', authenticate, isAdmin, async (req, res) => {
  try {
    const supportsStatus = await hasAccountStatusColumns();
    const enrollmentCounts = db('enrollments')
      .whereNull('deleted_at')
      .select('user_id')
      .count({ enrolled_courses_count: 'id' })
      .groupBy('user_id')
      .as('enrollment_counts');

    const fields = [
      'users.id',
      'users.name',
      'users.email',
      'users.role',
      'users.created_at',
      'users.updated_at',
      db.raw('COALESCE(enrollment_counts.enrolled_courses_count, 0) as enrolled_courses_count'),
    ];
    if (supportsStatus) {
      fields.push('users.is_active', 'users.disabled_at');
    }

    const users = await db('users')
      .leftJoin(enrollmentCounts, 'users.id', 'enrollment_counts.user_id')
      .select(fields)
      .orderBy('users.created_at', 'desc');

    res.json(users.map((user) => serializeUser(user, supportsStatus)));
  } catch (error) {
    return sendUnexpectedError(res, error, 'Get users failed');
  }
});

router.get('/:userId/enrollments', authenticate, isAdmin, async (req, res) => {
  const userId = validId(req.params.userId);
  if (!userId) return res.status(400).json({ error: 'Select a valid user.' });

  try {
    const user = await db('users').where({ id: userId }).first('id', 'name', 'email', 'role', 'created_at');
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const rows = await db('enrollments')
      .join('courses', 'enrollments.course_id', 'courses.id')
      .where('enrollments.user_id', userId)
      .whereNull('enrollments.deleted_at')
      .whereNull('courses.deleted_at')
      .select(
        'enrollments.id',
        'enrollments.user_id',
        'enrollments.course_id',
        'enrollments.created_at as enrolled_at',
        'courses.title as course_title',
        'courses.thumbnail_url as course_thumbnail_url'
      )
      .orderBy('enrollments.created_at', 'desc');

    const enrollments = [];
    for (const row of rows) {
      enrollments.push({
        ...row,
        course_thumbnail_url: row.course_thumbnail_url || fallbackImage,
        status: 'active',
        ...(await getProgressSummary(db, userId, row.course_id)),
      });
    }

    res.json({ user, enrollments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/enrollments/:id/unenroll', authenticate, isAdmin, async (req, res) => {
  const enrollmentId = validId(req.params.id);
  if (!enrollmentId) return res.status(400).json({ error: 'Select a valid enrollment.' });

  try {
    const updated = await db('enrollments')
      .where({ id: enrollmentId })
      .whereNull('deleted_at')
      .update({ deleted_at: db.raw('NOW()') });

    if (!updated) return res.status(404).json({ error: 'Active enrollment not found.' });
    res.json({ message: 'User unenrolled from course.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:userId/courses/:courseId/reset-progress', authenticate, isAdmin, async (req, res) => {
  const userId = validId(req.params.userId);
  const courseId = validId(req.params.courseId);
  if (!userId || !courseId) return res.status(400).json({ error: 'Select a valid user and course.' });

  try {
    const result = await db.transaction(async (trx) => {
      const enrollment = await trx('enrollments')
        .where({ user_id: userId, course_id: courseId })
        .whereNull('deleted_at')
        .first('id');
      if (!enrollment) {
        const error = new Error('Active enrollment not found.');
        error.statusCode = 404;
        throw error;
      }

      const lessonIds = await getLessonIdsForCourse(trx, courseId);
      if (!lessonIds.length) return 0;

      return trx('progress')
        .where({ user_id: userId })
        .whereIn('lesson_id', lessonIds)
        .del();
    });

    res.json({ message: 'User course progress reset.', deleted_progress_rows: result });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

router.post('/:userId/deactivate', authenticate, isAdmin, async (req, res) => {
  const userId = validId(req.params.userId);
  if (!userId) return res.status(400).json({ error: 'Select a valid user.' });
  if (userId === Number(req.user.id)) return res.status(400).json({ error: 'You cannot deactivate your own account.' });

  try {
    if (!(await hasAccountStatusColumns())) {
      return res.status(400).json({ error: 'Account status migration has not been applied yet.' });
    }

    const user = await db('users').where({ id: userId }).first('id', 'role', 'is_active');
    if (!user) return res.status(404).json({ error: 'User not found.' });

    if (user.role === 'admin') {
      const activeAdmins = await db('users').where({ role: 'admin', is_active: true }).count({ count: 'id' }).first();
      if (Number(activeAdmins?.count || 0) <= 1) {
        return res.status(400).json({ error: 'You cannot deactivate the last active admin.' });
      }
    }

    await db('users').where({ id: userId }).update({
      is_active: false,
      disabled_at: db.raw('NOW()'),
      disabled_by: req.user.id,
    });

    res.json({ message: 'User account deactivated.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:userId/activate', authenticate, isAdmin, async (req, res) => {
  const userId = validId(req.params.userId);
  if (!userId) return res.status(400).json({ error: 'Select a valid user.' });

  try {
    if (!(await hasAccountStatusColumns())) {
      return res.status(400).json({ error: 'Account status migration has not been applied yet.' });
    }

    const updated = await db('users').where({ id: userId }).update({
      is_active: true,
      disabled_at: null,
      disabled_by: null,
    });

    if (!updated) return res.status(404).json({ error: 'User not found.' });
    res.json({ message: 'User account activated.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
