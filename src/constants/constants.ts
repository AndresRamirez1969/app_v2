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

export const ADMIN_FORM_ROLES = [
  { label: 'Ver Todos', value: 'form.viewAny' },
  { label: 'Ver', value: 'form.view' },
  { label: 'Crear', value: 'form.create' },
  { label: 'Editar', value: 'form.update' },
  { label: 'Asignar', value: 'form.assign' }
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

export const SPONSOR_FORM_ROLES = [
  { label: 'Ver Todos', value: 'form.viewAny' },
  { label: 'Ver', value: 'form.view' },
  { label: 'Crear', value: 'form.create' },
  { label: 'Editar', value: 'form.update' },
  { label: 'Asignar', value: 'form.assign' }
];

// --------Frecuencia de formularios ---------
export const FREQUENCY = [
  { label: 'Una vez al dia', value: 'once_per_day' },
  { label: 'Multiples veces al dia', value: 'multiple_per_day' }
];

export const SCOPES = [
  { label: 'Organizacional', value: 'organization' },
  { label: 'Por Negocio', value: 'business' },
  { label: 'Por Unidad', value: 'business_unit' }
];

export const CHIPCOLOR = (status: string) => {
  if (status === 'activa' || status === 'active') return 'success';
  if (status === 'inactiva' || status === 'inactive') return 'grey darken-1';
  if (status === 'borrador' || status === 'draft') return 'primary';
  if (status === 'archivado' || status === 'archived') return 'red';
  return 'grey lighten-2';
};

// --------Tipos de campos ---------

export const FIELD_TYPES = (field: { type: string }) => {
  if (field.type === 'text' || field.type === 'email' || field.type === 'tel' || field.type === 'url' || field.type === 'password')
    return 'v-text-field';
  if (field.type === 'time') return 'v-text-field';
  if (field.type === 'date') return 'v-text-field';
  if (field.type === 'checkbox') return 'v-checkbox';
  if (field.type === 'select') return 'v-select';
  if (field.type === 'radio') return 'v-radio-group';
  if (field.type === 'textarea') return 'v-textarea';
  if (field.type === 'file') return 'v-file-input';
  if (field.type === 'number') return 'v-text-field';
  if (field.type === 'range') return 'v-slider';

  return 'v-text-field';
};

export const getFieldProps = (field: { type: string; label: string; is_required: boolean; options?: string[] }) => {
  const baseProps = {
    label: field.label,
    required: field.is_required,
    variant: 'outlined',
    color: 'primary'
  };

  switch (field.type) {
    case 'email':
      return { ...baseProps, type: 'email' };
    case 'password':
      return { ...baseProps, type: 'password' };
    case 'tel':
      return { ...baseProps, type: 'tel' };
    case 'url':
      return { ...baseProps, type: 'url' };
    case 'number':
      return { ...baseProps, type: 'number' };
    case 'date':
      return { ...baseProps, type: 'date' };
    case 'time':
      return { ...baseProps, type: 'time' };
    case 'select':
      return {
        ...baseProps,
        items: field.options || [],
        itemTitle: 'option',
        itemValue: 'option'
      };
    case 'radio':
      return {
        ...baseProps,
        inline: true,
        items: field.options || []
      };
    case 'checkbox':
      return {
        ...baseProps,
        multiple: true,
        items: field.options || []
      };
    case 'file':
      return {
        ...baseProps,
        accept: 'image/*,application/pdf,.doc,.docx',
        multiple: false
      };
    case 'range':
      return { ...baseProps, min: 0, max: 100 };
    default:
      return baseProps;
  }
};
