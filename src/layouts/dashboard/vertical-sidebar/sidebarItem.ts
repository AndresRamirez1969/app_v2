// icons
import { CrownTwoTone, DatabaseTwoTone, DashboardTwoTone, ShopTwoTone, IdcardTwoTone } from '@ant-design/icons-vue';

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
    to: '/organizaciones'
  },
  {
    title: 'Negocios',
    icon: CrownTwoTone,
    to: '/negocios'
  },
  {
    title: 'Unidades de Negocio',
    icon: ShopTwoTone,
    children: [
      {
        title: 'Unidades',
        to: '/unidades'
      },
      {
        title: 'Grupos',
        to: '/grupos'
      }
    ]
  },
  {
    title: 'Usuarios',
    icon: IdcardTwoTone,
    children: [
      {
        title: 'Usuarios',
        to: '/usuarios'
      },
      {
        title: 'Roles',
        to: '/icon/ant'
      }
    ]
  }
];

export default sidebarItem;
