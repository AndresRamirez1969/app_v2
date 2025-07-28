import { defineStore } from 'pinia';
import axiosInstance from '@/utils/axios';

export const useAuthStore = defineStore('auth', {
  state: () => {
    // Detecta el storage correcto según dónde esté el token
    const storage = localStorage.getItem('authToken') ? localStorage : sessionStorage.getItem('authToken') ? sessionStorage : localStorage;
    return {
      token: storage.getItem('authToken') || '',
      user: (() => {
        try {
          return JSON.parse(storage.getItem('authUser') || 'null');
        } catch {
          return null;
        }
      })(),
      permissions: (() => {
        try {
          return JSON.parse(storage.getItem('authUser') || 'null')?.permissions || [];
        } catch {
          return [];
        }
      })(),
      returnUrl: null as string | null
    };
  },

  getters: {
    isLoggedIn: (state) => !!state.token && !!state.user,
    getUser: (state) => state.user,
    hasRole: (state) => (role: string | string[]) => {
      if (!state.user || !state.user.roles) return false;

      if (Array.isArray(role)) {
        return role.some((r) => state.user.roles.includes(r));
      }
      return state.user.roles.includes(role);
    },
    hasPermissions: (state) => (permission: string) => {
      return state.permissions.includes(permission);
    }
  },

  actions: {
    async login(email: string, password: string, rememberMe: boolean) {
      // Envía el parámetro como 'remember' al backend
      const response = await axiosInstance.post('/login', {
        email,
        password,
        remember: rememberMe
      });

      // El usuario debe tener el campo permissions
      const user = response.data.user;

      this.token = response.data.token;
      this.user = user;
      this.permissions = user.permissions;

      // Guarda todo en el storage correcto
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('authToken', this.token); // <-- CORREGIDO: guarda como string simple
      storage.setItem('authUser', JSON.stringify(user));
      console.log('Usuario', user);
    },

    loginWithTokenAndUser(token: string, user: any, permissions: any[] = []) {
      this.token = token;
      this.user = {
        ...user,
        permissions: permissions
      };
      this.permissions = permissions;

      // Siempre guarda en localStorage (puedes adaptar si quieres usar sessionStorage)
      localStorage.setItem('authToken', token); // <-- CORREGIDO: guarda como string simple
      localStorage.setItem('authUser', JSON.stringify(this.user));
    },

    async logout() {
      // Limpia ambos storages y el estado
      this.token = '';
      this.user = null;
      this.permissions = [];
      this.returnUrl = null;

      // Borra siempre sessionStorage
      sessionStorage.removeItem('authToken');
      sessionStorage.removeItem('authUser');
      sessionStorage.removeItem('authPermissions');

      // Borra solo el token de localStorage, deja el usuario para "Recuérdame"
      localStorage.removeItem('authToken');
      // localStorage.removeItem('authUser'); // <-- NO borres esto si quieres recordar el usuario/email

      localStorage.removeItem('authPermissions');

      // Notifica al backend, pero NO esperes la respuesta (no bloquea la UI)
      axiosInstance.post('/logout').catch(() => {});
    },

    async fetchUser() {
      const response = await axiosInstance.get('/user');
      this.user = {
        ...response.data,
        permissions: response.data.permissions || []
      };
      this.permissions = response.data.permissions || [];
      console.log(this.permissions);
      // Actualiza el usuario en ambos storages
      localStorage.setItem('authUser', JSON.stringify(this.user));
      sessionStorage.setItem('authUser', JSON.stringify(this.user));
    },

    setUser(user: any) {
      this.user = {
        ...user,
        permissions: user.permissions || []
      };
      this.permissions = user.permissions || [];
      // Actualiza el usuario en ambos storages
      localStorage.setItem('authUser', JSON.stringify(this.user));
      sessionStorage.setItem('authUser', JSON.stringify(this.user));
    }
  }
});
