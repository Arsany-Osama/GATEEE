const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getNotificationsForUser,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} = require('../services/notifications');
const { sendUnexpectedError } = require('../utils/http');

const validId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

router.get('/', authenticate, async (req, res) => {
  try {
    const notifications = await getNotificationsForUser(req.user);
    res.json(notifications);
  } catch (error) {
    return sendUnexpectedError(res, error, 'Mark notifications read failed');
  }
});

router.get('/unread-count', authenticate, async (req, res) => {
  try {
    res.json({ count: await getUnreadNotificationCount(req.user) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/read', authenticate, async (req, res) => {
  const id = validId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Select a valid notification.' });

  try {
    const updated = await markNotificationRead(req.user, id);
    if (!updated) return res.status(404).json({ error: 'Notification not found.' });
    res.json({ message: 'Notification marked as read.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/read-all', authenticate, async (req, res) => {
  try {
    const updated = await markAllNotificationsRead(req.user);
    res.json({ message: 'Notifications marked as read.', updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
