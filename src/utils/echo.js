import Pusher from 'pusher-js';
import Echo from 'laravel-echo';

window.Pusher = Pusher;

// Función para obtener el token
const getAuthToken = () => {
  const token = sessionStorage.getItem('authToken');
  if (!token) {
    const token = localStorage.getItem('authToken');
    return token;
  }
  return token;
};

const echo = new Echo({
  broadcaster: 'pusher',
  key: import.meta.env.VITE_PUSHER_KEY,
  cluster: import.meta.env.VITE_PUSHER_CLUSTER,
  forceTLS: true,
  authEndpoint: import.meta.env.VITE_PUSHER_DEV,
  auth: {
    headers: {
      Authorization: `Bearer ${getAuthToken()}`
    }
  }
});

export default echo;
