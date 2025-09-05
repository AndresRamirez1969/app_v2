import { createRouter, createWebHistory } from 'vue-router';
import MainRoutes from './MainRoutes';
import PublicRoutes from './PublicRoutes';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/:pathMatch(.*)*',
      component: () => import('@/views/pages/maintenance/error/Error404Page.vue')
    },
    MainRoutes,
    PublicRoutes
  ]
});

router.beforeEach(async (to, from, next) => {
  // redirect to login page if not logged in and trying to access a restricted page
  const auth = useAuthStore();

  const publicPages = ['/login', '/register', '/login1'];
  const isPublicPage = publicPages.includes(to.path);
  const authRequired = !isPublicPage && to.matched.some((record) => record.meta.requiresAuth);

  // User not logged in and trying to access a restricted page
  if (authRequired && !auth.isLoggedIn) {
    auth.returnUrl = to.fullPath;
    return next('/login');
  }

  // Si está logueado y va a /login, redirige según rol y organización
  if (auth.isLoggedIn && to.path === '/login') {
    const roles = auth.user?.roles || [];
    const isAdmin = roles.includes('admin');
    const hasOrg = !!auth.user?.organization_id;

    if (isAdmin && !hasOrg) {
      return next('/organizaciones/crear');
    } else {
      return next('/dashboard');
    }
  }

  // Si está logueado, es admin y no tiene organización, y no está en /organizaciones/crear, redirige
  if (auth.isLoggedIn && auth.user?.roles?.includes('admin') && !auth.user?.organization_id && to.path !== '/organizaciones/crear') {
    return next('/organizaciones/crear');
  }

  next();
});

router.beforeEach(() => {
  const uiStore = useUIStore();
  uiStore.isLoading = true;
});

router.afterEach(() => {
  const uiStore = useUIStore();
  uiStore.isLoading = false;
});

export default router;
