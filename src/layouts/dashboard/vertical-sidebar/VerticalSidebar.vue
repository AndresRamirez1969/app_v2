<script setup lang="ts">
import { computed } from 'vue';
import { useCustomizerStore } from '../../../stores/customizer';
import sidebarItems from './sidebarItem';
import { useAuthStore } from '@/stores/auth';

import NavGroup from './NavGroup/NavGroup.vue';
import NavItem from './NavItem/NavItem.vue';
import NavCollapse from './NavCollapse/NavCollapse.vue';

const customizer = useCustomizerStore();
const auth = useAuthStore();

const userRoles = computed(() => auth.user?.roles || []);
const permissions = computed(() => auth.user?.permissions || []);
const hasOrgViewAny = computed(() => permissions.value.includes('organization.viewAny'));
const hasBusinessViewAny = computed(() => permissions.value.includes('business.viewAny'));
const hasBusinessUnitViewAny = computed(() => permissions.value.includes('businessUnit.viewAny'));
const hasUserViewAny = computed(() => permissions.value.includes('user.viewAny', 'user.create'));
const hasFormViewAny = computed(() => permissions.value.includes('form.create'));
const hasResponseViewAny = computed(() => permissions.value.includes('form_response.viewAny'));

function getOrgDwRoute() {
  return '/organizaciones-dw';
}
function getBusinessDwRoute() {
  return '/negocios-dw';
}
function getBusinessUnitDwRoute() {
  return '/ubicaciones-dw';
}

// Sidebar SOLO muestra los apartados si el usuario es superadmin o tiene el permiso viewAny
const sidebarMenu = computed(() => {
  return sidebarItems
    .map((item) => {
      if (item.title === 'Organizaciones DW') {
        const show = userRoles.value.includes('superadmin') || hasOrgViewAny.value;
        return show ? { ...item, to: getOrgDwRoute() } : null;
      }
      if (item.title === 'Empresas DW') {
        const show = userRoles.value.includes('superadmin') || hasBusinessViewAny.value;
        return show ? { ...item, to: getBusinessDwRoute() } : null;
      }
      if (item.title === 'Ubicaciones DW') {
        const show = userRoles.value.includes('superadmin') || hasBusinessUnitViewAny.value;
        return show ? { ...item, to: getBusinessUnitDwRoute() } : null;
      }
      if (item.title === 'Usuarios') {
        const show = userRoles.value.includes('superadmin') || hasUserViewAny.value;
        return show ? { ...item, to: '/usuarios' } : null;
      }
      if (item.title === 'Formularios') {
        const show = userRoles.value.includes('superadmin') || hasFormViewAny.value;
        return show ? { ...item, to: '/formularios' } : null;
      }
      if (item.title === 'Reportes') {
        const show = userRoles.value.includes('superadmin') || hasResponseViewAny.value;
        return show ? { ...item, to: '/reportes' } : null;
      }
      return item;
    })
    .filter(Boolean);
});
</script>

<template>
  <v-navigation-drawer
    v-if="auth.user"
    left
    v-model="customizer.Sidebar_drawer"
    elevation="0"
    rail-width="60"
    mobile-breakpoint="lg"
    app
    class="leftSidebar"
    :rail="customizer.mini_sidebar"
    expand-on-hover
  >
    <div class="pa-5 text-center">
      <v-img
        :src="'https://tasker-v2-bucket.s3.us-east-2.amazonaws.com/public/Logotipo+1.svg'"
        alt="Tasker Logo"
        max-height="40"
        contain
        class="mx-auto"
      />
    </div>
    <perfect-scrollbar class="scrollnavbar">
      <v-list aria-busy="true" aria-label="menu list">
        <template v-for="(item, i) in sidebarMenu" :key="i">
          <NavGroup :item="item" v-if="item.header" :key="item.title" />
          <v-divider class="my-3" v-else-if="item.divider" />
          <NavCollapse class="leftPadding" :item="item" :level="0" v-else-if="item.children" />
          <NavItem :item="item" v-else />
        </template>
      </v-list>
    </perfect-scrollbar>
  </v-navigation-drawer>
</template>
