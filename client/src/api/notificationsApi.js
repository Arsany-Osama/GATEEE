import apiClient from './client';

export const getNotifications = async () => {
  const res = await apiClient.get('/notifications');
  return res.data;
};

export const getUnreadNotificationCount = async () => {
  const res = await apiClient.get('/notifications/unread-count');
  return res.data;
};

export const markNotificationRead = async (id) => {
  const res = await apiClient.post(`/notifications/${id}/read`);
  return res.data;
};

export const markAllNotificationsRead = async () => {
  const res = await apiClient.post('/notifications/read-all');
  return res.data;
};

export const getAdminNotificationTargetOptions = async () => {
  const res = await apiClient.get('/admin/notifications/targets');
  return res.data;
};

export const adminSendNotification = async (payload) => {
  const res = await apiClient.post('/admin/notifications/send', payload);
  return res.data;
};
