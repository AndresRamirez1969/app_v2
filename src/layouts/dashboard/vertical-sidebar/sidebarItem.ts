// icons
import {
  TeamOutlined,
  UserOutlined,
  LockOutlined,
  FolderOpenOutlined,
  FileTextOutlined,
  FileAddOutlined,
  EnvironmentOutlined,
  BranchesOutlined,
  ShopOutlined,
  AppstoreOutlined,
  ApartmentOutlined
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
    title: 'Dashboard',
    icon: AppstoreOutlined,
    to: '/dashboard'
  },
  {
    title: 'Organizaciones DW',
    icon: ApartmentOutlined
  },
  {
    title: 'Empresas DW',
    icon: ShopOutlined
  },
  {
    title: 'Ubicaciones',
    icon: EnvironmentOutlined,
    children: [
      {
        title: 'Ubicaciones DW',
        icon: EnvironmentOutlined
      },
      {
        title: 'Grupos de Ubicación DW',
        icon: BranchesOutlined,
        to: '/grupos-dw'
      }
    ]
  },
  {
    title: 'Formularios',
    icon: FileAddOutlined,
    to: '/formularios'
  },
  {
    title: 'Mis Formularios',
    icon: FileTextOutlined,
    to: '/mis-formularios'
  },
  {
    title: 'Reportes',
    icon: FolderOpenOutlined,
    to: '/reportes'
  },
  // NUEVO: Dropdown Usuarios con Usuarios DW y Roles
  {
    title: 'Usuarios',
    icon: TeamOutlined,
    children: [
      {
        title: 'Usuarios DW',
        icon: UserOutlined,
        to: '/usuarios-dw'
      },
      {
        title: 'Roles & Permisos',
        icon: LockOutlined,
        to: '/roles'
      }
    ]
  }
];

export default sidebarItem;
