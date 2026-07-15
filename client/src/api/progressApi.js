import apiClient from './client';

export const getCourseProgress = async (courseId) => {
  const res = await apiClient.get(`/progress/course/${courseId}`);
  return res.data;
};

export const completeLesson = async (lessonId) => {
  const res = await apiClient.post(`/progress/${lessonId}/complete`);
  return res.data;
};

export const reportLessonWatch = async (lessonId, payload) => {
  const res = await apiClient.post(`/progress/${lessonId}/watch`, payload);
  return res.data;
};
