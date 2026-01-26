import { type ThemeDefinition, createVuetify } from 'vuetify';
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import { es } from 'vuetify/locale';

const light: ThemeDefinition = {
  dark: false,
  variables: {
    'border-color': '#f0f0f0',
    'carousel-control-size': 10,
    gradient: 'linear-gradient(250.38deg, #e6f4ff 2.39%, #69b1ff 34.42%, #1677ff 60.95%, #0958d9 84.83%, #002c8c 104.37%)',
    gradient2: 'linear-gradient(to right, rgb(9, 89, 218), rgb(22, 119, 255))',
    'card-shadow': '0px 1px 4px rgba(0, 0, 0, 0.08)',
    'medium-opacity': 0.85,
    'high-opacity': 1
  },
  colors: {
    primary: '#1677ff',
    secondary: '#8c8c8c',
    info: '#13c2c2',
    success: '#52c41a',
    accent: '#FFAB91',
    warning: '#faad14',
    error: '#ff4d4f',
    lightprimary: '#e6f4ff',
    lightsecondary: '#f5f5f5',
    lightsuccess: '#EAFCD4',
    lighterror: '#FFE7D3',
    lightwarning: '#FFF6D0',
    darkText: '#212121',
    lightText: '#8c8c8c',
    darkprimary: '#0958d9',
    darksecondary: '#7a7878',
    borderLight: '#e6ebf1',
    inputBorder: '#a1a1a5',
    containerBg: '#fafafb',
    surface: '#fff',
    'on-surface-variant': '#fff',
    facebook: '#4267b2',
    twitter: '#1da1f2',
    linkedin: '#0e76a8',
    gray100: '#f5f5f5',
    primary200: '#a1d2ff',
    secondary200: '#eeeeee'
  }
};

const dark: ThemeDefinition = {
  dark: true,
  variables: {
    'border-color': '#424242',
    'carousel-control-size': 10,
    gradient: 'linear-gradient(250.38deg, #001529 2.39%, #002c8c 34.42%, #0958d9 60.95%, #1677ff 84.83%, #69b1ff 104.37%)',
    gradient2: 'linear-gradient(to right, rgb(0, 44, 140), rgb(9, 89, 218))',
    'card-shadow': '0px 1px 4px rgba(0, 0, 0, 0.3)',
    'medium-opacity': 0.85,
    'high-opacity': 1
  },
  colors: {
    primary: '#1677ff',
    secondary: '#8c8c8c',
    info: '#13c2c2',
    success: '#52c41a',
    accent: '#FFAB91',
    warning: '#faad14',
    error: '#ff4d4f',
    lightprimary: '#001529',
    lightsecondary: '#1e1e1e',
    lightsuccess: '#1a3a1a',
    lighterror: '#3a1a1a',
    lightwarning: '#3a2e1a',
    darkText: '#ffffff', // Texto claro para fondo oscuro
    lightText: '#b0b0b0', // Texto gris claro para fondo oscuro
    darkprimary: '#4096ff',
    darksecondary: '#a0a0a0',
    borderLight: '#424242',
    inputBorder: '#616161',
    containerBg: '#121212',
    surface: '#1e1e1e',
    'on-surface-variant': '#1e1e1e',
    facebook: '#4267b2',
    twitter: '#1da1f2',
    linkedin: '#0e76a8',
    gray100: '#2e2e2e',
    primary200: '#003a8c',
    secondary200: '#2e2e2e'
  }
};

export default createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi',
    aliases: {
      ...aliases
    },
    sets: {
      mdi
    }
  },
  theme: {
    defaultTheme: 'light',
    themes: {
      light,
      dark
    }
  },
  locale: {
    locale: 'es',
    messages: {
      es: {
        ...es,
        datePicker: {
          itemsSelected: '{0} seleccionados',
          cancel: 'Cancelar',
          ok: 'Aceptar',
          today: 'Hoy',
          range: 'Rango',
          title: 'Selecciona fecha',
          input: 'Ingresa fecha'
        }
      }
    }
  },
  defaults: {
    VBtn: {},
    VCard: {
      rounded: 'md'
    },
    VTextField: {
      rounded: 'lg'
    },
    VTooltip: {
      // set v-tooltip default location to top
      location: 'top'
    }
  }
});
