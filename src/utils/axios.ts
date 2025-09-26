import axios from 'axios';
import router from '@/router';
import { useAuthStore } from '@/stores/auth';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: false
});

axiosInstance.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore();
    
    // Verificar si el token ha expirado antes de hacer la petición
    if (!authStore.checkTokenExpiration()) {
      // Si el token expiró, cancelar la petición
      return Promise.reject(new Error('Token expirado'));
    }

    // Busca el token en localStorage o sessionStorage
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de respuesta para manejar errores de autenticación
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const authStore = useAuthStore();
    
    // Manejar token expirado o inválido
    if (
      error.response &&
      (error.response.status === 401 || // Unauthorized
       error.response.status === 403) && // Forbidden
      (error.response.data?.message?.includes('token') ||
       error.response.data?.message?.includes('expired') ||
       error.response.data?.message?.includes('invalid'))
    ) {
      authStore.logout();
      
      // Redirigir al login solo si no está ya ahí
      if (router.currentRoute.value.name !== 'Login') {
        router.push('/login');
      }
      return Promise.reject(error);
    }

    // Manejar cuenta inactiva (código existente)
    if (
      error.response &&
      error.response.status === 403 &&
      error.response.data?.message === 'Your account is inactive. Please contact support.'
    ) {
      authStore.logout();
      if (router.currentRoute.value.name !== 'Login') {
        router.push('/login');
      }
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;
