import apiClient from './client';

export const createPaymentRequest = async (courseId, payload = {}) => {
  const isFormData = payload instanceof FormData;
  const body = isFormData ? payload : { ...payload };
  if (isFormData) {
    body.set('course_id', courseId);
  } else {
    body.course_id = courseId;
  }
  const res = await apiClient.post('/payment-requests', body);
  return res.data;
};

export const getMyPaymentRequests = async () => {
  const res = await apiClient.get('/payment-requests/my');
  return res.data;
};

export const getMyPaymentRequestForCourse = async (courseId) => {
  const res = await apiClient.get(`/payment-requests/my/${courseId}`);
  return res.data;
};

export const getAdminPaymentRequests = async () => {
  const res = await apiClient.get('/admin/payment-requests');
  return res.data;
};

export const approvePaymentRequest = async (id) => {
  const res = await apiClient.post(`/admin/payment-requests/${id}/approve`, {});
  return res.data;
};

export const rejectPaymentRequest = async (id, adminNote = '') => {
  const res = await apiClient.post(`/admin/payment-requests/${id}/reject`, { admin_note: adminNote });
  return res.data;
};
