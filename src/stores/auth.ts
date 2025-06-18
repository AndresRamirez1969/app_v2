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
  }),  
  actions: {
    async login(email: string, password: string) {
      const response = await axiosInstance.post('/login', { email, password});
      this.token = response.data.token;
      this.user = response.data.user;
      console.log(this.token, this.user);
      localStorage.setItem('authToken', JSON.stringify(this.token));
      localStorage.setItem('authUser', JSON.stringify(this.user));
    },
    logout() {
      this.token = '';
      this.user = null;
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
    },
  },
});
