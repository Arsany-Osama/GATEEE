import apiClient from './client';
import { clearPublicCoursesCache } from './publicCoursesApi';

const asArray = (data) => (Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []);

export const getDashboardData = async () => {
  const res = await apiClient.get('/admin/dashboard/data');
  return res.data;
};

export const enrollStudent = async (payload) => {
  const res = await apiClient.post('/admin/enroll', payload);
  return res.data;
};

export const getAdminProgress = async () => {
  const res = await apiClient.get('/admin/progress');
  return res.data;
};

export const getAdminCourses = async () => {
  const res = await apiClient.get('/admin/courses');
  return asArray(res.data);
};

export const createCourse = async (payload) => {
  const res = await apiClient.post('/admin/courses', payload);
  clearPublicCoursesCache();
  return res.data;
};

export const updateCourse = async (id, payload) => {
  const res = await apiClient.put(`/admin/courses/${id}`, payload);
  clearPublicCoursesCache();
  return res.data;
};

export const deleteCourse = async (id) => {
  const res = await apiClient.delete(`/admin/courses/${id}`);
  clearPublicCoursesCache();
  return res.data;
};

export const uploadCourseImage = async (file) => {
  const formData = new FormData();
  formData.append('image', file);
  const res = await apiClient.post('/admin/uploads/course-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const getAdminCategories = async () => {
  const res = await apiClient.get('/admin/categories');
  return asArray(res.data);
};

export const createCategory = async (payload) => {
  const res = await apiClient.post('/admin/categories', payload);
  return res.data;
};

export const updateCategory = async (id, payload) => {
  const res = await apiClient.put(`/admin/categories/${id}`, payload);
  return res.data;
};

export const deleteCategory = async (id) => {
  const res = await apiClient.delete(`/admin/categories/${id}`);
  return res.data;
};

export const getAdminInstructors = async () => {
  const res = await apiClient.get('/admin/instructors');
  return asArray(res.data);
};

export const createInstructor = async (payload) => {
  const res = await apiClient.post('/admin/instructors', payload);
  return res.data;
};

export const updateInstructor = async (id, payload) => {
  const res = await apiClient.put(`/admin/instructors/${id}`, payload);
  return res.data;
};

export const deleteInstructor = async (id) => {
  const res = await apiClient.delete(`/admin/instructors/${id}`);
  return res.data;
};

export const getAdminCoupons = async () => {
  const res = await apiClient.get('/admin/coupons');
  return asArray(res.data);
};

export const createCoupon = async (payload) => {
  const res = await apiClient.post('/admin/coupons', payload);
  return res.data;
};

export const updateCoupon = async (id, payload) => {
  const res = await apiClient.put(`/admin/coupons/${id}`, payload);
  return res.data;
};

export const deleteCoupon = async (id) => {
  const res = await apiClient.delete(`/admin/coupons/${id}`);
  return res.data;
};

export const getDeletedCourses = async () => {
  const res = await apiClient.get('/admin/courses/deleted');
  return asArray(res.data);
};

export const restoreCourse = async (id) => {
  const res = await apiClient.post(`/admin/courses/${id}/restore`);
  clearPublicCoursesCache();
  return res.data;
};

export const permanentlyDeleteCourse = async (id) => {
  const res = await apiClient.post(`/admin/courses/${id}/permanent`);
  clearPublicCoursesCache();
  return res.data;
};

export const createPlaylist = async (courseId, payload) => {
  const res = await apiClient.post(`/admin/courses/${courseId}/playlists`, payload);
  return res.data;
};

export const updatePlaylist = async (id, payload) => {
  const res = await apiClient.put(`/admin/courses/playlists/${id}`, payload);
  return res.data;
};

export const deletePlaylist = async (id) => {
  const res = await apiClient.delete(`/admin/courses/playlists/${id}`);
  return res.data;
};

export const createLesson = async (payload) => {
  const res = await apiClient.post('/admin/lessons', payload);
  return res.data;
};

export const updateLesson = async (id, payload) => {
  const res = await apiClient.put(`/admin/lessons/${id}`, payload);
  return res.data;
};

export const deleteLesson = async (id) => {
  const res = await apiClient.delete(`/admin/lessons/${id}`);
  return res.data;
};

export const uploadLessonVideo = async (id, file) => {
  const formData = new FormData();
  formData.append('video', file);
  const res = await apiClient.post(`/admin/lessons/${id}/upload-video`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const createQuiz = async (payload) => {
  const res = await apiClient.post('/admin/quizzes', payload);
  return res.data;
};

export const getAdminSecurityData = async () => {
  const res = await apiClient.get('/admin/security');
  return res.data;
};

export const getAdminCertificates = async () => {
  const res = await apiClient.get('/certificates/admin/list');
  return res.data;
};

export const revokeCertificate = async (uuid) => {
  const res = await apiClient.post(`/certificates/admin/${uuid}/revoke`);
  return res.data;
};
