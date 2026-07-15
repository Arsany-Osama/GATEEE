import apiClient from './client';

export const getAdminCourseCurriculum = async (courseId) => {
  const res = await apiClient.get(`/admin/courses/${courseId}/curriculum`);
  return res.data;
};

export const createModule = async (courseId, payload) => {
  const res = await apiClient.post(`/admin/courses/${courseId}/playlists`, payload);
  return res.data;
};

export const updateModule = async (moduleId, payload) => {
  const res = await apiClient.put(`/admin/courses/playlists/${moduleId}`, payload);
  return res.data;
};

export const deleteModule = async (moduleId) => {
  const res = await apiClient.delete(`/admin/courses/playlists/${moduleId}`);
  return res.data;
};

export const createLesson = async (payload) => {
  const res = await apiClient.post('/admin/lessons', payload);
  return res.data;
};

export const updateLesson = async (lessonId, payload) => {
  const res = await apiClient.put(`/admin/lessons/${lessonId}`, payload);
  return res.data;
};

export const deleteLesson = async (lessonId) => {
  const res = await apiClient.delete(`/admin/lessons/${lessonId}`);
  return res.data;
};

export const reorderLessons = async (lessons) => {
  const res = await apiClient.post('/admin/lessons/reorder', { lessons });
  return res.data;
};

export const uploadLessonVideo = async (lessonId, file) => {
  const formData = new FormData();
  formData.append('video', file);
  const res = await apiClient.post(`/admin/lessons/${lessonId}/upload-video`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};
