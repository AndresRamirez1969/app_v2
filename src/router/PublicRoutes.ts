const PublicRoutes = {
  path: '/auth',
  component: () => import('@/layouts/blank/BlankLayout.vue'),
  meta: {
    requiresAuth: false
  },
  children: [
    {
      name: 'Iniciar Sesión',
      path: '/login',
      component: () => import('@/views/authentication/auth/LoginPage.vue')
    },
    {
      name: 'ForgotPass',
      path: '/forgot_password',
      component: () => import('@/views/authentication/auth/ForgotPass.vue')
    },
    {
      name: 'ResetPassword',
      path: '/reset-password',
      component: () => import('@/views/authentication/auth/ResetPassword.vue')
    },
    {
      name: 'Register',
      path: '/register',
      component: () => import('@/views/authentication/auth/RegisterPage.vue')
    },
    {
      name: 'Error 404',
      path: '/error',
      component: () => import('@/views/pages/maintenance/error/Error404Page.vue')
    },
    {
      name: 'Error 403',
      path: '/error-403',
      component: () => import('@/views/pages/maintenance/error/Error403Page.vue')
    }
  ]
};

export default PublicRoutes;
