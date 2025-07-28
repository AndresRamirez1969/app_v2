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
      component: () => import('@/views/businesses/ShowBusiness.vue')
    },
    {
      name: 'Units',
      path: '/unidades',
      component: () => import('@/views/business_units/UnitsTabs.vue')
    },
    {
      name: 'UnitDetail',
      path: '/unidad/:id',
      component: () => import('@/views/business_units/components/ShowUnit.vue')
    },
    {
      name: 'Grupos',
      path: '/grupos',
      component: () => import('@/views/business_units/unit_groups/UnitsGroupsTab.vue')
    },
    {
      name: 'Users',
      path: '/usuarios',
      component: () => import('@/views/users/UsersTab.vue')
    },
    {
      name: 'Roles',
      path: '/roles',
      component: () => import('@/views/users/roles/ViewRole.vue')
    },
    {
      name: 'Profile',
      path: 'perfil',
      component: () => import('@/views/user/UserProfile.vue'),
      meta: { requiresAuth: true }
    },
    {
      name: 'Forms',
      path: '/formularios',
      component: () => import('@/views/formularios/FormTab.vue')
    },
    {
      name: 'CreateForm',
      path: '/crearFormulario/:id',
      component: () => import('@/views/formularios/componentes/CreateForm.vue')
    },
    {
      name: 'FormDetail',
      path: '/formulario/:id',
      component: () => import('@/views/formularios/componentes/ShowForm.vue')
    },
    {
      name: 'AddFieldsForm',
      path: '/formularios/:id/add-fields',
      component: () => import('@/views/formularios/componentes/AddFieldsForm.vue')
    },
    {
      name: 'other',
      path: '/organizaciones',
      component: () => import('@/views/organizations/OrganizationTab.vue')
    }
  ]
};

export default MainRoutes;
