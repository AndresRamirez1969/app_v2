import { useAuthStore } from '@/stores/auth';
import { computed } from 'vue';

export const usePermissions = () => {
  const auth = useAuthStore();

  const userRoles = computed(() => auth.user?.roles?.map((r) => r.name) || []);
  const permissions = computed(() => auth.user?.permissions || []);

  const hasPermission = (permission: string | string[]) => {
    if (userRoles.value.includes('superadmin')) return true;

    if (Array.isArray(permission)) {
      return permission.some((p) => permissions.value.includes(p));
    }

    return permissions.value.includes(permission);
  };

  const hasRole = (role: string | string[]) => {
    if (Array.isArray(role)) {
      return role.some((r) => userRoles.value.includes(r));
    }
    return userRoles.value.includes(role);
  };

  const canAccess = (requiredPermissions: string[], requiredRoles: string[] = []) => {
    return hasRole('superadmin') || hasRole(requiredRoles) || hasPermission(requiredPermissions);
  };

  return {
    userRoles,
    permissions,
    hasPermission,
    hasRole,
    canAccess
  };
};
