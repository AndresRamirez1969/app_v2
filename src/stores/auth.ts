import { defineStore } from 'pinia';
import axiosInstance from '@/utils/axios';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('authToken') || '',
    user: (() => {
      try {
        return JSON.parse(localStorage.getItem('authUser') || 'null');
      } catch {
        return null;
      }
    })(),
    returnUrl: null as string | null
  }),

  getters: {
    isLoggedIn: (state) => !!state.token && !!state.user,
    getUser: (state) => state.user,
    hasRole: (state) => (role: string | string[]) => {
      if (!state.user || !state.user.roles) return false;

      if (Array.isArray(role)) {
        return role.some((r) => state.user.roles.includes(r));
      }
      return state.user.roles.includes(role);
    }
  },

  actions: {
    async login(email: string, password: string) {
      const response = await axiosInstance.post('/login', { email, password });
      this.token = response.data.token;
      this.user = response.data.user;

      localStorage.setItem('authToken', JSON.stringify(this.token));
      localStorage.setItem('authUser', JSON.stringify(this.user));
    },

    async logout() {
      axiosInstance.post('/logout').catch(() => {});
      this.token = '';
      this.user = null;
      this.returnUrl = null;
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
    },

    async fetchUser() {
      const response = await axiosInstance.get('/user');
      this.user = response.data;
      localStorage.setItem('authUser', JSON.stringify(this.user));
    }
  }
});
