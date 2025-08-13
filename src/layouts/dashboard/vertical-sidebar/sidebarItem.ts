// icons
import {
  CrownTwoTone,
  DatabaseTwoTone,
  DashboardTwoTone,
  ShopTwoTone,
  IdcardTwoTone,
  FileTextTwoTone,
  SnippetsTwoTone,
  TeamOutlined,
  SafetyCertificateTwoTone
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
  {
    title: 'Home',
    icon: DashboardTwoTone,
    to: '/dashboard'
  },
  {
    title: 'Organizaciones DW',
    icon: DatabaseTwoTone
  },
  {
    title: 'Empresas DW',
    icon: CrownTwoTone
  },
  {
    title: 'Ubicaciones',
    icon: DatabaseTwoTone,
    children: [
      {
        title: 'Ubicaciones DW',
        icon: DatabaseTwoTone
      },
      {
        title: 'Grupos de Ubicación DW',
        icon: DatabaseTwoTone,
        to: '/grupos-dw'
      }
    ]
  },
  // NUEVO: Dropdown Usuarios con Usuarios DW y Roles
  {
    title: 'Usuarios',
    icon: TeamOutlined,
    children: [
      {
        title: 'Usuarios DW',
        icon: IdcardTwoTone,
        to: '/usuarios-dw'
      },
      {
        title: 'Roles & Permisos',
        icon: SafetyCertificateTwoTone,
        to: '/roles-dw'
      }
    ]
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
    title: 'Reportes',
    icon: SnippetsTwoTone,
    to: '/reportes'
  }
];

export default sidebarItem;
