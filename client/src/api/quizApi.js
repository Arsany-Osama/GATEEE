import apiClient from './client';

export const getLessonQuiz = async (lessonId) => {
  const res = await apiClient.get(`/quizzes/lesson/${lessonId}`);
  return res.data;
};

export const submitQuiz = async (quizId, answers) => {
  const res = await apiClient.post(`/quizzes/${quizId}/submit`, { answers });
  return res.data;
};
