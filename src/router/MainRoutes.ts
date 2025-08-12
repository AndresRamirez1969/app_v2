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
      name: 'MyForms',
      path: '/mis-formularios',
      component: () => import('@/views/user-forms/UserFormTab.vue')
    },
    {
      name: 'FillForm',
      path: '/formulario/:id/llenar',
      component: () => import('../views/user-forms/componentes/FillForm.vue')
    },
    // {
    //   name: 'other',
    //   path: '/organizaciones',
    //   component: () => import('@/views/organizations/OrganizationTab.vue')
    // },
    {
      name: 'Organizaciones DW',
      path: '/organizaciones-dw',
      component: () => import('@/views/organizations-dw/index.vue')
    },
    {
      name: 'Organization Create DW',
      path: '/organizaciones-dw/create',
      component: () => import('@/views/organizations-dw/create.vue')
    },
    {
      name: 'Organization Edit DW',
      path: '/organizaciones-dw/:id/edit',
      component: () => import('@/views/organizations-dw/edit.vue')
    },
    {
      name: 'Organization Show DW',
      path: '/organizaciones-dw/:id',
      component: () => import('@/views/organizations-dw/show.vue')
    },
    {
      name: 'Business DW',
      path: '/negocios-dw',
      component: () => import('@/views/businesses-dw/index.vue')
    },
    {
      name: 'Business Create DW',
      path: '/negocios-dw/create',
      component: () => import('@/views/businesses-dw/create.vue')
    },
    {
      name: 'Business Edit DW',
      path: '/negocios-dw/:id/edit',
      component: () => import('@/views/businesses-dw/edit.vue')
    },
    {
      name: 'Business Show DW',
      path: '/negocios-dw/:id',
      component: () => import('@/views/businesses-dw/show.vue')
    },
    {
      name: 'Reports',
      path: '/reportes',
      component: () => import('@/views/reports/ReportsTab.vue')
    },
    {
      name: 'Show Response',
      path: '/reportes/:id',
      component: () => import('@/views/reports/components/ShowResponse.vue')
    },
    {
      name: 'Business Unit DW',
      path: '/ubicaciones-dw',
      component: () => import('@/views/business-unit-dw/index.vue')
    },
    {
      name: 'Business Unit Create DW',
      path: '/ubicaciones-dw/create',
      component: () => import('@/views/business-unit-dw/create.vue')
    },
    {
      name: 'Business Unit Edit DW',
      path: '/ubicaciones-dw/:id/edit',
      component: () => import('@/views/business-unit-dw/edit.vue')
    },
    {
      name: 'Business Unit Show DW',
      path: '/ubicaciones-dw/:id',
      component: () => import('@/views/business-unit-dw/show.vue')
    },
    {
      name: 'UserResponse',
      path: '/reportes/:formId/usuarios/:userId/:responseId',
      component: () => import('@/views/reports/components/ShowUserResponse.vue'),
      meta: {
        requiresAuth: true,
        title: 'Respuesta de Usuario'
      }
    }
  ]
};

export default MainRoutes;
