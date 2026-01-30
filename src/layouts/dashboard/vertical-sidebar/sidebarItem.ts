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
    title: 'Inicio',
    icon: AppstoreOutlined,
    to: '/dashboard'
  },
  {
    title: 'Organizaciones',
    icon: ApartmentOutlined
  },
  {
    title: 'Empresas',
    icon: ShopOutlined
  },
  {
    title: 'Unidades',
    icon: EnvironmentOutlined,
    children: [
      {
        title: 'Unidades de Negocio',
        icon: EnvironmentOutlined,
        to: '/ubicaciones'
      },
      {
        title: 'Grupos de Ubicaciones',
        icon: BranchesOutlined,
        to: '/grupos-de-ubicaciones'
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
  {
    title: 'Usuarios',
    icon: TeamOutlined,
    children: [
      {
        title: 'Usuarios',
        icon: UserOutlined,
        to: '/usuarios'
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
