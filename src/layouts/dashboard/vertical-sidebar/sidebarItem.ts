// icons
import {
  CrownTwoTone,
  DatabaseTwoTone,
  DashboardTwoTone,
  ShopTwoTone,
  IdcardTwoTone,
  FileTextTwoTone,
  SnippetsTwoTone
} from '@ant-design/icons-vue';

export interface menu {
  header?: string;
  title?: string;
  icon?: object;
  to?: string;
  divider?: boolean;
  chip?: string;
  chipColor?: string;
  chipVariant?: string;
  chipIcon?: string;
  children?: menu[];
  disabled?: boolean;
  type?: string;
  subCaption?: string;
  role?: string;
}

const sidebarItem: menu[] = [
  { header: 'Utilidades' },
  {
    title: 'Home',
    icon: DashboardTwoTone,
    to: '/dashboard'
  },
  // {
  //   title: 'Organizaciones',
  //   icon: DatabaseTwoTone,
  //   to: '/organizaciones'
  // },
  // {
  //   title: 'Negocios',
  //   icon: CrownTwoTone,
  //   to: '/negocios'
  // },

  {
    title: 'Organizaciones DW',
    icon: DatabaseTwoTone
  },
  {
    title: 'Empresas DW',
    icon: CrownTwoTone
  },
  {
    title: 'Unidades',
    icon: ShopTwoTone,
    to: '/unidades'
  },
  {
    title: 'Usuarios',
    icon: IdcardTwoTone,
    to: '/usuarios'
  },
  {
    title: 'Formularios',
    icon: FileTextTwoTone,
    to: '/formularios'
  },
  {
    title: 'Mis Formularios',
    icon: FileTextTwoTone,
    to: '/mis-formularios'
  },
  {
    title: 'Organizaciones DW',
    icon: DatabaseTwoTone,
    to: '/organizaciones-dw'
  },
  {
    title: 'Reportes',
    icon: SnippetsTwoTone,
    to: '/reportes'
  }
];

export default sidebarItem;
