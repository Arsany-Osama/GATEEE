import apiClient from './client';

export const getAdminUsers = async () => {
  const res = await apiClient.get('/admin/users');
  return res.data;
};

export const getUserEnrollments = async (userId) => {
  const res = await apiClient.get(`/admin/users/${userId}/enrollments`);
  return res.data;
};

export const enrollUserInCourse = async (userId, courseId) => {
  const res = await apiClient.post('/admin/enroll', {
    user_id: Number(userId),
    course_id: Number(courseId),
  });
  return res.data;
};

export const unenrollUserFromCourse = async (enrollmentId) => {
  const res = await apiClient.post(`/admin/users/enrollments/${enrollmentId}/unenroll`);
  return res.data;
};

export const resetUserCourseProgress = async (userId, courseId) => {
  const res = await apiClient.post(`/admin/users/${userId}/courses/${courseId}/reset-progress`);
  return res.data;
};

export const activateUser = async (userId) => {
  const res = await apiClient.post(`/admin/users/${userId}/activate`);
  return res.data;
};

export const deactivateUser = async (userId) => {
  const res = await apiClient.post(`/admin/users/${userId}/deactivate`);
  return res.data;
};
