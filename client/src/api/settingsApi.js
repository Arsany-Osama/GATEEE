import apiClient from './client';

export const getPublicSettings = async () => {
  const res = await apiClient.get('/settings/public');
  return res.data;
};

export const getAdminSettings = async () => {
  const res = await apiClient.get('/admin/settings');
  return res.data;
};

export const updateAdminSettings = async (payload) => {
  const res = await apiClient.put('/admin/settings', payload);
  return res.data;
};
