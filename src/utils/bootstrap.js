import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

console.log(' Inicializando Echo...');
console.log(' Key:', import.meta.env.VITE_REVERB_APP_KEY);
console.log('🏠 Host:', import.meta.env.VITE_REVERB_HOST);
console.log(' Puerto:', import.meta.env.VITE_REVERB_PORT);

window.Echo = new Echo({
  broadcaster: 'reverb',
  key: import.meta.env.VITE_REVERB_APP_KEY,
  wsHost: import.meta.env.VITE_REVERB_HOST || window.location.hostname,
  wsPort: import.meta.env.VITE_REVERB_PORT || 6001,
  forceTLS: false, // ← Cambiar a false para desarrollo local
  encrypted: false, // ← Agregar esta línea
  disableStats: true,
  enabledTransports: ['ws', 'wss'],
  authEndpoint: 'http://localhost:8000/broadcasting/auth',
  auth: {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`
    }
  }
});

console.log('✅ Echo configurado:', window.Echo);
