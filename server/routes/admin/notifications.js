const express = require('express');
const router = express.Router();
const db = require('../../db/knex');
const { authenticate, isAdmin } = require('../../middleware/auth');
const { createNotificationStrict } = require('../../services/notifications');
const { sendUnexpectedError } = require('../../utils/http');

const validId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const cleanText = (value, max = 1000) => String(value || '').trim().slice(0, max);

const getActiveStudentQuery = () => {
  const query = db('users').where({ role: 'student' });
  return query;
};

router.get('/targets', authenticate, isAdmin, async (req, res) => {
  try {
    const users = await db('users')
      .select('id', 'name', 'email', 'role')
      .orderBy('name', 'asc')
      .orderBy('email', 'asc');

    const courses = await db('courses')
      .whereNull('deleted_at')
      .select('id', 'title')
      .orderBy('display_order', 'asc')
      .orderBy('created_at', 'desc');

    res.json({ users, courses });
  } catch (error) {
    if (error.statusCode && error.statusCode < 500) return res.status(error.statusCode).json({ error: error.message });
    return sendUnexpectedError(res, error, 'Send admin notification failed');
  }
});

router.post('/send', authenticate, isAdmin, async (req, res) => {
  const targetType = cleanText(req.body?.target_type, 40);
  const title = cleanText(req.body?.title, 255);
  const message = cleanText(req.body?.message, 1000);

  if (!['user', 'all_students', 'course_students'].includes(targetType)) {
    return res.status(400).json({ error: 'Select a valid notification target.' });
  }
  if (!title || !message) {
    return res.status(400).json({ error: 'Title and message are required.' });
  }

  try {
    let recipients = [];
    let course = null;

    if (targetType === 'user') {
      const userId = validId(req.body?.user_id);
      if (!userId) return res.status(400).json({ error: 'Select a valid user.' });
      recipients = await db('users').where({ id: userId }).select('id');
    }

    if (targetType === 'all_students') {
      recipients = await getActiveStudentQuery().select('id');
    }

    if (targetType === 'course_students') {
      const courseId = validId(req.body?.course_id);
      if (!courseId) return res.status(400).json({ error: 'Select a valid course.' });
      course = await db('courses').where({ id: courseId }).whereNull('deleted_at').first('id', 'title');
      if (!course) return res.status(404).json({ error: 'Course not found.' });
      recipients = await db('enrollments')
        .join('users', 'enrollments.user_id', 'users.id')
        .where('enrollments.course_id', courseId)
        .whereNull('enrollments.deleted_at')
        .where('users.role', 'student')
        .select('users.id');
    }

    const uniqueRecipientIds = [...new Set(recipients.map((row) => Number(row.id)).filter(Boolean))];
    if (!uniqueRecipientIds.length) {
      return res.status(400).json({ error: 'No matching recipients were found.' });
    }

    const created = [];
    for (const userId of uniqueRecipientIds) {
      created.push(await createNotificationStrict({
        recipient_user_id: userId,
        actor_user_id: req.user.id,
        type: 'admin_message',
        title,
        message,
        entity_type: course ? 'course' : 'manual_notification',
        entity_id: course?.id || null,
        metadata: { target_type: targetType, course_title: course?.title || null },
      }));
    }

    res.status(201).json({
      message: `Notification sent to ${created.length} recipient${created.length === 1 ? '' : 's'}.`,
      sent_count: created.length,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

module.exports = router;
