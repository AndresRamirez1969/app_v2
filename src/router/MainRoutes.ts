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
    {
      name: 'Organizaciones',
      path: '/organizaciones',
      component: () => import('@/views/organizations/index.vue')
    },
    {
      name: 'Organization Create',
      path: '/organizaciones/crear',
      component: () => import('@/views/organizations/create.vue')
    },
    {
      name: 'Organization Edit',
      path: '/organizaciones/editar/:id',
      component: () => import('@/views/organizations/edit.vue')
    },
    {
      name: 'Organization Show',
      path: '/organizaciones/:id',
      component: () => import('@/views/organizations/show.vue')
    },
    {
      name: 'Business',
      path: '/empresas',
      component: () => import('@/views/businesses/index.vue')
    },
    {
      name: 'Business Create',
      path: '/empresas/crear',
      component: () => import('@/views/businesses/create.vue')
    },
    {
      name: 'Business Edit',
      path: '/empresas/editar/:id',
      component: () => import('@/views/businesses/edit.vue')
    },
    {
      name: 'Business Show',
      path: '/empresas/:id',
      component: () => import('@/views/businesses/show.vue')
    },
    {
      name: 'Reports',
      path: '/reportes',
      component: () => import('@/views/reports/ReportsTab.vue')
    },
    {
      name: 'Show Response',
      path: '/reportes/:id',
      component: () => import('@/views/reports/components/user-form-responses/ShowResponses.vue')
    },
    {
      name: 'Business Unit DW',
      path: '/ubicaciones',
      component: () => import('@/views/business_unit/index.vue')
    },
    {
      name: 'Business Unit Create DW',
      path: '/ubicaciones/crear',
      component: () => import('@/views/business_unit/create.vue')
    },
    {
      name: 'Business Unit Edit DW',
      path: '/ubicaciones/editar/:id',
      component: () => import('@/views/business_unit/edit.vue')
    },
    {
      name: 'Business Unit Show DW',
      path: '/ubicaciones/:id',
      component: () => import('@/views/business_unit/show.vue')
    },
    {
      name: 'UserResponse',
      path: '/reportes/:formId/usuarios/:userId/:responseId',
      component: () => import('@/views/reports/components/user-form-responses/ShowUserResponse.vue'),
      meta: {
        requiresAuth: true,
        title: 'Respuesta de Usuario'
      }
    },
    {
      name: 'Business Unit Groups',
      path: '/grupos-de-ubicaciones',
      component: () => import('@/views/business_unit_group/index.vue')
    },
    {
      name: 'Business Unit Group Create',
      path: '/grupos-de-ubicaciones/crear',
      component: () => import('@/views/business_unit_group/create.vue')
    },
    {
      name: 'Business Unit Group Edit',
      path: '/grupos-de-ubicaciones/editar/:id',
      component: () => import('@/views/business_unit_group/edit.vue')
    },
    {
      name: 'Business Unit Group Show',
      path: '/grupos-de-ubicaciones/:id',
      component: () => import('@/views/business_unit_group/show.vue')
    },
    {
      name: 'Users',
      path: '/usuarios',
      component: () => import('@/views/users/index.vue')
    },
    {
      name: 'User Create',
      path: '/usuarios/crear',
      component: () => import('@/views/users/create.vue')
    },
    {
      name: 'User Edit',
      path: '/usuarios/editar/:id',
      component: () => import('@/views/users/edit.vue')
    },
    {
      name: 'User Show',
      path: '/usuarios/:id',
      component: () => import('@/views/users/show.vue')
    },
    {
      name: 'Roles',
      path: '/roles',
      component: () => import('@/views/roles/index.vue')
    },
    {
      name: 'Role Create',
      path: '/roles/crear',
      component: () => import('@/views/roles/create.vue')
    },
    {
      name: 'Role Edit',
      path: '/roles/editar/:id',
      component: () => import('@/views/roles/edit.vue')
    },
    {
      name: 'Role Show',
      path: '/roles/:id',
      component: () => import('@/views/roles/show.vue')
    }
    // {
    //   name: 'Forms DW',
    //   path: '/formularios-dw',
    //   component: () => import('@/views/forms/index.vue')
    // },
    // {
    //   name: 'Forms',
    //   path: '/formularios-dw/crear',
    //   component: () => import('@/views/forms/create.vue')
    // }
  ]
};

export default MainRoutes;
