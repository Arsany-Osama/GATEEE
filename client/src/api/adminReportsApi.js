import apiClient from './client';

export const getAdminReportsOverview = async () => {
  const res = await apiClient.get('/admin/reports/overview');
  return res.data;
};
