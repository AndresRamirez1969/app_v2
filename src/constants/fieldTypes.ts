import { mdiFormTextarea, mdiFormTextbox, mdiFormTextboxPassword } from '@mdi/js';
import { mdiNumeric } from '@mdi/js';
import { mdiCalendar } from '@mdi/js';
import { mdiClock } from '@mdi/js';
import { mdiFormSelect } from '@mdi/js';
import { mdiRadioboxMarked } from '@mdi/js';
import { mdiCheckboxMarkedOutline } from '@mdi/js';
import { mdiFileImage, mdiFileDocument } from '@mdi/js';
import { mdiSignature } from '@mdi/js';
import { mdiTuneVariant } from '@mdi/js';
import { mdiToggleSwitch } from '@mdi/js';
import { mdiMapMarker } from '@mdi/js';
import { mdiLink, mdiEyeOff, mdiCellphone, mdiPalette } from '@mdi/js';

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
  // --- SOLO Imagen y Documento ---
  {
    label: 'Imagen',
    value: 'image',
    icon: mdiFileImage,
    description: 'Subida de imágenes (jpg, png, etc.)',
    preview: 'v-file-input'
  },
  {
    label: 'Documento',
    value: 'document',
    icon: mdiFileDocument,
    description: 'Subida de documentos (PDF, Word, Excel, etc.)',
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
    icon: mdiLink,
    description: 'Campo para URL',
    preview: 'v-text-field'
  },
  {
    label: 'Oculto',
    value: 'hidden',
    icon: mdiEyeOff,
    description: 'Campo oculto',
    preview: 'v-text-field'
  },
  {
    label: 'Teléfono',
    value: 'tel',
    icon: mdiCellphone,
    description: 'Campo para número telefónico',
    preview: 'v-text-field'
  },
  // {
  //   label: 'Color',
  //   value: 'color',
  //   icon: mdiPalette,
  //   description: 'Selector de color',
  //   preview: 'v-text-field'
  // },
  {
    label: 'Geolocalización',
    value: 'geolocation',
    icon: mdiMapMarker,
    description: 'Campo para capturar ubicación geográfica. Permite restringir por alcance, o permitir ingreso manual.',
    preview: 'geolocation-field'
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
    image: 'amber',
    document: 'deep-orange',
    signature: 'pink',
    color: 'pink',
    range: 'deep-purple',
    switch: 'teal',
    tel: 'cyan',
    url: 'light-blue',
    hidden: 'grey',
    geolocation: 'lime'
  };
  return colors[type] || 'grey';
};
