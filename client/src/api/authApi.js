import apiClient from './client';

export const login = async (payload) => {
  const res = await apiClient.post('/auth/login', payload);
  return res.data;
};

export const register = async (payload) => {
  const res = await apiClient.post('/auth/register', payload);
  return res.data;
};

export const getMe = async () => {
  const res = await apiClient.get('/auth/me');
  return res.data;
};

export const changePassword = async (payload) => {
  const res = await apiClient.put('/auth/profile/password', payload);
  return res.data;
};

export const logout = async () => {
  const res = await apiClient.post('/auth/logout');
  return res.data;
};
