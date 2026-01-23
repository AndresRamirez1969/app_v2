// Constantes que se usan en el proyecto para evitar repetir código
// NO MODIFICAR, SOLO AGREGAR!!!!

import { mdiFormTextarea, mdiFormTextbox, mdiFormTextboxPassword } from '@mdi/js';
import { mdiNumeric } from '@mdi/js';
import { mdiCalendar } from '@mdi/js';
import { mdiClock } from '@mdi/js';
import { mdiFormSelect } from '@mdi/js';
import { mdiRadioboxMarked } from '@mdi/js';
import { mdiCheckboxMarkedOutline } from '@mdi/js';
import { mdiFileImage } from '@mdi/js';
import { mdiSignature } from '@mdi/js';
import { mdiTuneVariant } from '@mdi/js';
import { mdiToggleSwitch } from '@mdi/js';
import { mdiCalendarRange } from '@mdi/js';

export const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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
  { label: 'Asignar', value: 'form.assign' },
  { label: 'Contestar', value: 'form_response.store' }
];

export const ADMIN_RESPONSE_ROLES = [{ label: 'Ver Todos', value: 'form.hasResponses' }];

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
  if (field.type === 'switch') return 'v-switch';
  if (field.type === 'radio') return 'v-radio-group';
  if (field.type === 'textarea') return 'v-textarea';
  if (field.type === 'file') return 'v-file-input';
  if (field.type === 'number') return 'v-text-field';
  if (field.type === 'range') return 'v-slider';
  if (field.type === 'signature') return 'Signature';

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
        itemValue: 'option',
        multiple: true,
        closableChips: true
      };
    case 'switch':
      return {
        ...baseProps,
        color: 'primary'
      };
    case 'radio':
      return {
        ...baseProps,
        inline: true,
        items: field.options || []
      };
    case 'checkbox':
      return { ...baseProps };
    case 'file':
      return {
        ...baseProps,
        accept: 'image/*,application/pdf,.doc,.docx',
        multiple: false
      };
    case 'range':
      return {
        ...baseProps,
        min: 0,
        max: 100,
        'thumb-label': 'always',
        'show-ticks': 'always',
        step: 10
      };
    case 'signature':
      return {
        ...baseProps,
        variant: 'outlined',
        color: 'primary'
      };
    default:
      return baseProps;
  }
};

export const AVAILABLE_FIELDS = [
  {
    label: 'Texto',
    value: 'text',
    icon: mdiFormTextbox,
    description: 'Campo de texto simple',
    preview: 'v-text-field'
  },
  {
    label: 'Área de texto',
    value: 'textarea',
    icon: mdiFormTextarea,
    description: 'Campo de texto multilínea',
    preview: 'v-textarea'
  },
  {
    label: 'Email',
    value: 'email',
    icon: mdiFormTextbox,
    description: 'Campo para dirección de email',
    preview: 'v-text-field'
  },
  {
    label: 'Contraseña',
    value: 'password',
    icon: mdiFormTextboxPassword,
    description: 'Campo para contraseñas',
    preview: 'v-text-field'
  },
  {
    label: 'Número',
    value: 'number',
    icon: mdiNumeric,
    description: 'Campo numérico',
    preview: 'v-text-field'
  },
  {
    label: 'Fecha',
    value: 'date',
    icon: mdiCalendar,
    description: 'Selector de fecha',
    preview: 'v-text-field'
  },
  {
    label: 'Hora',
    value: 'time',
    icon: mdiClock,
    description: 'Selector de hora',
    preview: 'v-text-field'
  },
  {
    label: 'Selector',
    value: 'select',
    icon: mdiFormSelect,
    description: 'Lista desplegable',
    preview: 'v-select'
  },
  {
    label: 'Radio',
    value: 'radio',
    icon: mdiRadioboxMarked,
    description: 'Botones de radio',
    preview: 'v-radio-group'
  },
  {
    label: 'Checkbox',
    value: 'checkbox',
    icon: mdiCheckboxMarkedOutline,
    description: 'Casillas de verificación',
    preview: 'v-checkbox'
  },
  {
    label: 'Archivo',
    value: 'file',
    icon: mdiFileImage,
    description: 'Subida de archivos',
    preview: 'v-file-input'
  },
  {
    label: 'Firma',
    value: 'signature',
    icon: mdiSignature,
    description: 'Firma digital',
    preview: 'ejs-signature'
  },
  {
    label: 'Rango',
    value: 'range',
    icon: mdiTuneVariant,
    description: 'Slider de rango',
    preview: 'v-slider'
  },
  {
    label: 'Switch',
    value: 'switch',
    icon: mdiToggleSwitch,
    description: 'Interruptor',
    preview: 'v-switch'
  },
  {
    label: 'URL',
    value: 'url',
    description: 'Campo para URL',
    preview: 'v-text-field'
  },
  {
    label: 'Oculto',
    value: 'hidden',

    description: 'Campo oculto',
    preview: 'v-text-field'
  }
];

export const FIELD_COLOR = (type: string) => {
  const colors: Record<string, string> = {
    text: 'blue',
    textarea: 'blue',
    email: 'green',
    password: 'red',
    number: 'orange',
    date: 'purple',
    time: 'purple',
    select: 'indigo',
    radio: 'indigo',
    checkbox: 'indigo',
    file: 'brown',
    signature: 'pink',
    color: 'pink',
    range: 'deep-purple',
    switch: 'teal',
    tel: 'cyan',
    url: 'light-blue',
    hidden: 'grey'
  };
  return colors[type] || 'grey';
};

// --------Funciones auxiliares ---------
export const urlToFile = async (url: string, filename: string) => {
  const response = await fetch(url);
  const blob = await response.blob();
  return new File([blob], filename, { type: blob.type });
};

// --------Filtros de fecha reportes ---------

export const DATE_FILTER_OPTIONS = [
  { title: 'Todas las fechas', value: 'all' },
  { title: 'Hoy', value: 'today' },
  { title: 'Esta semana', value: 'week' },
  { title: 'Este mes', value: 'month' },
  { title: 'Personalizado', value: 'custom' }
];

export const getDateRange = (dateRange: string, startDate?: string, endDate?: string) => {
  let start = null;
  let end = null;

  switch (dateRange) {
    case 'today':
      start = new Date();
      start.setHours(0, 0, 0, 0);
      end = new Date();
      end.setHours(23, 59, 59, 999);
      break;
    case 'week':
      // Obtener el inicio de la semana actual (lunes)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      start = new Date(now);
      start.setDate(now.getDate() - daysToMonday);
      start.setHours(0, 0, 0, 0);
      end = new Date();
      end.setHours(23, 59, 59, 999);
      break;
    case 'month':
      // Obtener el inicio del mes actual
      start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end = new Date();
      end.setHours(23, 59, 59, 999);
      break;
    case 'custom':
      if (startDate && endDate) {
        start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
      }
      break;
  }

  return {
    start,
    end,
    hasValidDates: !!(start && end)
  };
};

// Para convertir fechas a formato de API (YYYY-MM-DD)
export const formatDateForAPI = (date: Date) => {
  return date.toISOString().split('T')[0];
};

// Para mostrar fechas en la UI (formato localizado)
export const formatDateForUI = (dateString: string | Date) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatDateTime = (date: Date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

