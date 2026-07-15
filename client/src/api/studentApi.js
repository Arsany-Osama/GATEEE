import apiClient, { apiAssetUrl } from './client';

let dashboardRequest = null;
let myCoursesRequest = null;

export const getMyCourses = async () => {
  if (!myCoursesRequest) {
    myCoursesRequest = apiClient.get('/student/my-courses')
      .then((res) => res.data)
      .finally(() => {
        myCoursesRequest = null;
      });
  }

  return myCoursesRequest;
};

export const getStudentDashboard = async () => {
  if (!dashboardRequest) {
    dashboardRequest = apiClient.get('/student/dashboard')
      .then((res) => res.data)
      .finally(() => {
        dashboardRequest = null;
      });
  }

  return dashboardRequest;
};

export const getCourseCurriculum = async (courseId) => {
  const res = await apiClient.get(`/student/courses/${courseId}/curriculum`);
  return res.data;
};

export const getLessonVideo = async (lessonId) => {
  const res = await apiClient.get(`/streaming/video/${lessonId}`);
  return res.data;
};

export const getMyCertificates = async () => {
  const res = await apiClient.get('/student/certificates');
  return res.data;
};

export const verifyCertificate = async (uuid) => {
  const res = await apiClient.get(`/certificates/verify/${uuid}`);
  return res.data;
};

export const issueCertificateForCourse = async (courseId) => {
  const res = await apiClient.post(`/certificates/courses/${courseId}/issue`);
  return res.data;
};

export const getCertificateDownloadUrl = (uuid) => {
  return apiAssetUrl(`/certificates/${uuid}/download`);
};
