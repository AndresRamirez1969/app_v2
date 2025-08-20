import Echo from 'laravel-echo';

window.Echo = new Echo({
  broadcaster: 'reverb',
  key: import.meta.env.VITE_REVERB_APP_KEY,
  host: import.meta.env.VITE_REVERB_HOST || window.location.hostname,
  port: import.meta.env.VITE_REVERB_PORT || 8000,
  scheme: import.meta.env.VITE_REVERB_SCHEME || 'http',
  forceTLS: false,
  disableStats: true
});
