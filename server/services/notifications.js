const db = require('../db/knex');

let tableExistsCache = null;

const notificationsAvailable = async () => {
  if (tableExistsCache !== null) return tableExistsCache;
  tableExistsCache = await db.schema.hasTable('notifications');
  return tableExistsCache;
};

const safeJson = (value) => {
  if (value === undefined || value === null) return null;
  return JSON.stringify(value);
};

const createNotification = async (payload = {}) => {
  if (!(await notificationsAvailable())) return null;
  const title = String(payload.title || '').trim();
  const message = String(payload.message || '').trim();
  const type = String(payload.type || '').trim();
  if (!title || !message || !type) return null;

  const row = {
    recipient_user_id: payload.recipient_user_id || null,
    recipient_role: payload.recipient_role || null,
    actor_user_id: payload.actor_user_id || null,
    type,
    title: title.slice(0, 255),
    message,
    entity_type: payload.entity_type || null,
    entity_id: payload.entity_id || null,
    metadata: safeJson(payload.metadata),
  };

  const [id] = await db('notifications').insert(row);
  return { id, ...row };
};

const createNotificationSafely = async (payload) => {
  try {
    return await createNotification(payload);
  } catch (error) {
    console.warn(`Notification creation failed: ${error.message}`);
    return null;
  }
};

const notifyUser = async (userId, payload = {}) => {
  if (!userId) return null;
  return createNotificationSafely({ ...payload, recipient_user_id: userId });
};

const notifyAdmins = async (payload = {}) => {
  return createNotificationSafely({ ...payload, recipient_role: 'admin' });
};

const createNotificationStrict = async (payload = {}) => {
  const notification = await createNotification(payload);
  if (!notification) {
    const error = new Error('Notifications are not available or the notification payload is incomplete.');
    error.statusCode = 503;
    throw error;
  }
  return notification;
};

const notificationScope = (user) => (builder) => {
  builder.where('recipient_user_id', user.id);
  if (user.role === 'admin') {
    builder.orWhere('recipient_role', 'admin');
  }
};

const getNotificationsForUser = async (user, limit = 30) => {
  if (!(await notificationsAvailable())) return [];
  return db('notifications')
    .where(notificationScope(user))
    .select(
      'id',
      'recipient_user_id',
      'recipient_role',
      'actor_user_id',
      'type',
      'title',
      'message',
      'entity_type',
      'entity_id',
      'metadata',
      'read_at',
      'created_at',
      'updated_at'
    )
    .orderBy('created_at', 'desc')
    .limit(limit);
};

const getUnreadNotificationCount = async (user) => {
  if (!(await notificationsAvailable())) return 0;
  const row = await db('notifications')
    .where(notificationScope(user))
    .whereNull('read_at')
    .count({ count: 'id' })
    .first();
  return Number(row?.count || 0);
};

const markNotificationRead = async (user, notificationId) => {
  if (!(await notificationsAvailable())) return 0;
  return db('notifications')
    .where({ id: notificationId })
    .where(notificationScope(user))
    .whereNull('read_at')
    .update({ read_at: db.raw('NOW()') });
};

const markAllNotificationsRead = async (user) => {
  if (!(await notificationsAvailable())) return 0;
  return db('notifications')
    .where(notificationScope(user))
    .whereNull('read_at')
    .update({ read_at: db.raw('NOW()') });
};

const hasNotification = async ({ recipient_user_id, type, entity_type, entity_id }) => {
  if (!(await notificationsAvailable())) return false;
  const row = await db('notifications')
    .where({ recipient_user_id, type, entity_type, entity_id })
    .first('id');
  return Boolean(row);
};

module.exports = {
  createNotification,
  createNotificationStrict,
  createNotificationSafely,
  getNotificationsForUser,
  getUnreadNotificationCount,
  hasNotification,
  markAllNotificationsRead,
  markNotificationRead,
  notifyAdmins,
  notifyUser,
};
