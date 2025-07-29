export const TIMEZONES = [
  { label: 'Zona Sureste (UTC-5)', value: 'UTC-5' },
  { label: 'Zona Centro (UTC-6)', value: 'UTC-6' },
  { label: 'Zona Pacífico (UTC-7)', value: 'UTC-7' },
  { label: 'Zona Noroeste (UTC-8)', value: 'UTC-8' }
];

export const FIXED_ROLES = [
  { label: 'Admin', value: 'admin' },
  { label: 'Colaborador', value: 'sponsor' }
];

// --------Admin Assignable Roles ---------

export const ADMIN_ORG_ROLES = [
  { label: 'Ver', value: 'organization.view' },
  { label: 'Crear', value: 'organization.create' },
  { label: 'Editar', value: 'organization.update' }
];

export const ADMIN_USER_ROLES = [
  { label: 'Ver Todos', value: 'user.viewAny' },
  { label: 'Ver', value: 'user.view' },
  { label: 'Crear', value: 'user.create' },
  { label: 'Editar', value: 'user.update' }
];

export const ADMIN_BUSINESS_ROLES = [
  { label: 'Ver Todos', value: 'business.viewAny' },
  { label: 'Ver', value: 'business.view' },
  { label: 'Crear', value: 'business.create' },
  { label: 'Editar', value: 'business.update' }
];

export const ADMIN_UNIT_ROLES = [
  { label: 'Ver Todas', value: 'businessUnit.viewAny' },
  { label: 'Ver', value: 'businessUnit.view' },
  { label: 'Crear', value: 'businessUnit.create' },
  { label: 'Editar', value: 'businessUnit.update' }
];

// --------Sponsor Assignable Roles ---------

export const SPONSOR_ORG_ROLES = [{ label: 'Ver', value: 'organization.view' }];

export const SPONSOR_USER_ROLES = [
  { label: 'Ver Todos', value: 'user.viewAny' },
  { label: 'Ver', value: 'user.view' },
  { label: 'Crear', value: 'user.create' },
  { label: 'Editar', value: 'user.update' }
];

export const SPONSOR_BUSINESS_ROLES = [{ label: 'Ver', value: 'business.view' }];

export const SPONSOR_UNIT_ROLES = [
  { label: 'Ver Todas', value: 'businessUnit.viewAny' },
  { label: 'Ver', value: 'businessUnit.view' },
  { label: 'Crear', value: 'businessUnit.create' },
  { label: 'Editar', value: 'businessUnit.update' }
];

// --------Frecuencia de formularios ---------
export const FREQUENCY = [
  { label: 'Una vez al dia', value: 'once_per_day' },
  { label: 'Multiples veces al dia', valu: 'multiple_per_day' }
];

export const SCOPES = {
  organization: 'Organizacional',
  business: 'Por Negocio',
  business_unit: 'Por Unidad'
};

export const CHIPCOLOR = (status: string) => {
  if (status === 'activa' || status === 'active') return 'success';
  if (status === 'inactiva' || status === 'inactive') return 'grey darken-1';
  if (status === 'borrador' || status === 'draft') return 'primary';
  if (status === 'archivado' || status === 'archived') return 'red';
  return 'grey lighten-2';
};
