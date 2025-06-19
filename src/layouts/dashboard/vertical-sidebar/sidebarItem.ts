// icons
import {
  CrownTwoTone,
  DatabaseTwoTone,
  DashboardTwoTone,
  ShopTwoTone,
  IdcardTwoTone,
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
}

const sidebarItem: menu[] = [
  { header: 'Utilidades' },
  {
    title: 'Home',
    icon: DashboardTwoTone,
    to: '/dashboard'
  },
  {
    title: 'Organizaciones',
    icon: DatabaseTwoTone,
    to: '/sample-page'
  },
  {
    title: 'Negocio',
    icon: CrownTwoTone,
    to: '/colors'
  },
  {
    title: 'Unidades de Negocio',
    icon: ShopTwoTone,
    to: '/shadow'
  },
  {
    title: 'Usuarios',
    icon: IdcardTwoTone,
    to: '/icon/ant'
  },
];

export default sidebarItem;
