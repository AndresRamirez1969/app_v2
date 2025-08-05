// Metodos de autenticacion de usuario, extracion de permisos, etc.
// NO MODIFICAR!!! Al menos que sea necesario.

import { defineStore } from 'pinia';
import axiosInstance from '@/utils/axios';

export const useAuthStore = defineStore('auth', {
  state: () => {
    const storage = localStorage.getItem('authToken') ? localStorage : sessionStorage.getItem('authToken') ? sessionStorage : localStorage;
    return {
      token: storage.getItem('authToken') || '',
      user: (() => {
        try {
          const u = JSON.parse(storage.getItem('authUser') || 'null');
          if (u && u.organization_id) u.organizationDwId = u.organization_id;
          return u;
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
      const response = await axiosInstance.post('/login', {
        email,
        password,
        remember: rememberMe
      });
      const user = response.data.user;
      if (user && user.organization_id) user.organizationDwId = user.organization_id;

      this.token = response.data.token;
      this.user = user;
      this.permissions = user.permissions;

      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('authToken', this.token);
      storage.setItem('authUser', JSON.stringify(user));
    },

    loginWithTokenAndUser(token: string, user: any, permissions: any[] = []) {
      if (user && user.organization_id) user.organizationDwId = user.organization_id;
      this.token = token;
      this.user = {
        ...user,
        permissions: permissions
      };
      this.permissions = permissions;
      localStorage.setItem('authToken', token);
      localStorage.setItem('authUser', JSON.stringify(this.user));
    },

    async logout() {
      this.token = '';
      this.user = null;
      this.permissions = [];
      this.returnUrl = null;
      sessionStorage.removeItem('authToken');
      sessionStorage.removeItem('authUser');
      sessionStorage.removeItem('authPermissions');
      localStorage.removeItem('authToken');
      localStorage.removeItem('authPermissions');
      axiosInstance.post('/logout').catch(() => {});
    },

    async fetchUser() {
      const response = await axiosInstance.get('/user');
      const user = {
        ...response.data,
        permissions: response.data.permissions || []
      };
      if (user && user.organization_id) user.organizationDwId = user.organization_id;
      this.user = user;
      this.permissions = response.data.permissions || [];
      localStorage.setItem('authUser', JSON.stringify(this.user));
      sessionStorage.setItem('authUser', JSON.stringify(this.user));
    },

    setUser(user: any) {
      if (user && user.organization_id) user.organizationDwId = user.organization_id;
      this.user = {
        ...user,
        permissions: user.permissions || []
      };
      this.permissions = user.permissions || [];
      localStorage.setItem('authUser', JSON.stringify(this.user));
      sessionStorage.setItem('authUser', JSON.stringify(this.user));
      localStorage.setItem('authPermissions', JSON.stringify(this.permissions));
      sessionStorage.setItem('authPermissions', JSON.stringify(this.permissions));
    }
  }
});
