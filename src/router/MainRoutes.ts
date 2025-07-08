const MainRoutes = {
  path: '/main',
  meta: {
    requiresAuth: true
  },
  redirect: '/main',
  component: () => import('@/layouts/dashboard/DashboardLayout.vue'),
  children: [
    {
      name: 'LandingPage',
      path: '/',
      component: () => import('@/views/dashboard/DefaultDashboard.vue')
    },
    {
      name: 'Dashboard',
      path: '/dashboard',
      component: () => import('@/views/dashboard/DefaultDashboard.vue')
    },
    {
      name: 'Typography',
      path: '/typography',
      component: () => import('@/views/typography/TypographyPage.vue')
    },
    {
      name: 'Business',
      path: '/negocios',
      component: () => import('@/views/businesses/BusinessTab.vue')
    },
    {
      name: 'BusinessDetail',
      path: '/negocio/:id',
      component: () => import('@/views/businesses/components/ViewBusiness.vue')
    },
    {
      name: 'Units',
      path: '/unidades',
      component: () => import('@/views/business_units/UnitsTabs.vue')
    },
    {
      name: 'Grupos',
      path: '/grupos',
      component: () => import('@/views/units_groups/UnitsGroupsTab.vue')
    },
    {
      name: 'Color',
      path: '/icon/ant',
      component: () => import('@/views/icons/AntDesignIcons.vue')
    },
    {
      name: 'Profile',
      path: 'perfil',
      component: () => import('@/views/user/ViewUser.vue'),
      meta: { requiresAuth: true }
    },
    {
      name: 'other',
      path: '/organizaciones',
      component: () => import('@/views/organizations/OrganizationTab.vue')
    }
  ]
};

export default MainRoutes;
