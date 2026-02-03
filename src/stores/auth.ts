// Métodos de autenticación de usuario, extracción de permisos, etc.
// NO MODIFICAR!!! Al menos que sea necesario.

import { defineStore } from 'pinia';
import axiosInstance from '@/utils/axios';

export const useAuthStore = defineStore('auth', {
  state: () => {
    return {
      token: localStorage.getItem('authToken') || '',
      user: (() => {
        try {
          const u = JSON.parse(localStorage.getItem('authUser') || 'null');
          if (u && u.organization_id) u.organizationDwId = u.organization_id;
          return u;
        } catch {
          return null;
        }
      })(),
      permissions: (() => {
        try {
          return JSON.parse(localStorage.getItem('authUser') || 'null')?.permissions || [];
        } catch {
          return [];
        }
      })(),
      returnUrl: null as string | null,
      tokenExpiresAt: localStorage.getItem('tokenExpiresAt') || null
    };
  },

  getters: {
    isLoggedIn: (state) => !!state.token && !!state.user,
    isTokenExpired: (state) => {
      if (!state.tokenExpiresAt) return false;
      return new Date().getTime() > parseInt(state.tokenExpiresAt);
    },
    isTokenValid: (state) => {
      if (!state.token || !state.user || !state.tokenExpiresAt) return false;
      return new Date().getTime() <= parseInt(state.tokenExpiresAt);
    },
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
    },
    getOrganization: (state) => state.user?.organization || null
  },

  actions: {
    async login(email: string, password: string) {
      try {
        const response = await axiosInstance.post('/login', {
          email,
          password
        });

        if (!response.data || !response.data.token) {
          throw new Error('Respuesta del servidor inválida');
        }

        const user = response.data.user || {};
        const permissions = user.permissions || [];

        // Agregar organizationDwId si existe organization_id
        if (user && user.organization_id) {
          user.organizationDwId = user.organization_id;
        }

        this.token = response.data.token;
        this.user = {
          ...user,
          permissions: permissions
        };
        this.permissions = permissions;

        const expiresAt = new Date().getTime() + 60 * 60 * 1000; // 60 minutos en milisegundos
        this.tokenExpiresAt = expiresAt.toString();

        localStorage.setItem('authToken', this.token);
        localStorage.setItem('authUser', JSON.stringify(this.user));
        localStorage.setItem('tokenExpiresAt', this.tokenExpiresAt);
      } catch (error) {
        console.error('Error en login:', error);
        throw error;
      }
    },

    loginWithTokenAndUser(token: string, user: any, permissions: any[] = []) {
      if (user && user.organization_id) user.organizationDwId = user.organization_id;
      this.token = token;
      this.user = {
        ...user,
        permissions: permissions
      };
      this.permissions = permissions;

      const expiresAt = new Date().getTime() + 60 * 60 * 1000;
      this.tokenExpiresAt = expiresAt.toString();

      localStorage.setItem('authToken', token);
      localStorage.setItem('authUser', JSON.stringify(this.user));
      localStorage.setItem('tokenExpiresAt', this.tokenExpiresAt);
    },

    async logout() {
      this.token = '';
      this.user = null;
      this.permissions = [];
      this.returnUrl = null;
      this.tokenExpiresAt = null;
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      localStorage.removeItem('authPermissions');
      localStorage.removeItem('tokenExpiresAt');
      localStorage.setItem('app-theme', 'light');
      axiosInstance.post('/logout').catch(() => {});
    },

    checkTokenExpiration() {
      if (this.isTokenExpired) {
        this.logout();
        return false;
      }
      return true;
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
    },

    setUser(user: any) {
      if (user && user.organization_id) user.organizationDwId = user.organization_id;
      this.user = {
        ...user,
        permissions: user.permissions || []
      };
      this.permissions = user.permissions || [];
      localStorage.setItem('authUser', JSON.stringify(this.user));
      localStorage.setItem('authPermissions', JSON.stringify(this.permissions));
    }
  }
});
