import axios from 'axios';

export const getApiBaseUrl = () => {
  const configured = import.meta.env.VITE_API_URL;
  if (configured) return configured.replace(/\/$/, '');
  return '';
};

export const apiAssetUrl = (path) => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${getApiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
};

export const getApiError = (error, fallback = 'Something went wrong. Please try again.') => {
  if (error?.response?.status === 401) return 'Authentication failed. Please try again.';
  if (error?.response?.status === 403) return 'You do not have permission to access this resource.';
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.response?.data?.error) return error.response.data.error;
  if (error?.code === 'ERR_NETWORK') return 'Backend is unavailable. Please check the server connection.';
  return fallback;
};

const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

export default apiClient;
