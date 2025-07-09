import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:8000/api',
  withCredentials: false
});

axiosInstance.interceptors.request.use((config) => {
  const token = JSON.parse(localStorage.getItem('authToken') || 'null');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default axiosInstance;
