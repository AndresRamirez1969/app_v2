import axios from 'axios';
import router from '@/router';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: false
});

axiosInstance.interceptors.request.use(
  (config) => {
    // Busca el token en localStorage o sessionStorage
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de respuesta para expulsar usuarios inactivos
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response &&
      error.response.status === 403 &&
      error.response.data?.message === 'Your account is inactive. Please contact support.'
    ) {
      // Limpia el token y redirige al login solo si no está ya ahí
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');
      if (router.currentRoute.value.name !== 'Login') {
        router.push('/login');
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
