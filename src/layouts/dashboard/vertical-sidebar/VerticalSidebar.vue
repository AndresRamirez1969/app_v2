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

// INTEGRACIÓN: roles ahora son array de strings
const userRoles = computed(() => auth.user?.roles || []);
const permissions = computed(() => auth.user?.permissions || []);
const hasOrgCreate = computed(() => permissions.value.includes('organization.create'));
const hasOrgView = computed(() => permissions.value.includes('organization.view'));
const hasOrgId = computed(() => !!auth.user?.organization_id);
const hasBusinessId = computed(() => !!auth.user?.business_id);

// ORGANIZACIONES DW
function getOrgDwRoute() {
  if (userRoles.value.includes('superadmin')) return '/organizaciones-dw';
  if (userRoles.value.includes('admin') || hasOrgCreate.value) {
    return hasOrgId.value ? `/organizaciones-dw/${auth.user.organization_id}` : '/organizaciones-dw/create';
  }
  if ((userRoles.value.includes('sponsor') || hasOrgView.value) && hasOrgId.value) {
    return `/organizaciones-dw/${auth.user.organization_id}`;
  }
  return null;
}

const canSeeOrgDw = computed(
  () =>
    userRoles.value.includes('superadmin') ||
    userRoles.value.includes('admin') ||
    hasOrgCreate.value ||
    userRoles.value.includes('sponsor') ||
    hasOrgView.value
);

// EMPRESAS DW
function getBusinessDwRoute() {
  if (userRoles.value.includes('superadmin') || userRoles.value.includes('admin') || permissions.value.includes('business.viewAny')) {
    return '/negocios-dw';
  }
  if ((userRoles.value.includes('sponsor') || permissions.value.includes('business.view')) && hasBusinessId.value) {
    return `/negocios-dw/${auth.user.business_id}`;
  }
  return null;
}

const canSeeBusinessDw = computed(
  () =>
    userRoles.value.includes('superadmin') ||
    userRoles.value.includes('admin') ||
    permissions.value.includes('business.viewAny') ||
    userRoles.value.includes('sponsor') ||
    permissions.value.includes('business.view')
);

// UBICACIONES DW
const hasBusinessUnitId = computed(() => !!auth.user?.business_unit_id);
const hasBusinessUnitViewAny = computed(() => permissions.value.includes('businessUnit.viewAny'));
const hasBusinessUnitView = computed(() => permissions.value.includes('businessUnit.view'));

function getBusinessUnitDwRoute() {
  // superadmin, admin, sponsor o con viewAny pueden ver el index
  if (
    userRoles.value.includes('superadmin') ||
    userRoles.value.includes('admin') ||
    userRoles.value.includes('sponsor') ||
    hasBusinessUnitViewAny.value
  ) {
    return '/ubicaciones-dw';
  }
  // Si solo tiene businessUnit.view y tiene business_unit_id, va directo al show
  if (hasBusinessUnitView.value && hasBusinessUnitId.value) {
    return `/ubicaciones-dw/${auth.user.business_unit_id}`;
  }
  // Si no tiene acceso, deshabilita
  return null;
}

const canSeeBusinessUnitDw = computed(
  () =>
    userRoles.value.includes('superadmin') ||
    userRoles.value.includes('admin') ||
    userRoles.value.includes('sponsor') ||
    hasBusinessUnitViewAny.value ||
    hasBusinessUnitView.value
);

const sidebarMenu = computed(() => {
  return sidebarItems
    .map((item) => {
      if (item.title === 'Organizaciones DW') {
        if (!canSeeOrgDw.value) return null;
        const route = getOrgDwRoute();
        if (route) return { ...item, to: route };
        return { ...item, disabled: true };
      }
      if (item.title === 'Empresas DW') {
        if (!canSeeBusinessDw.value) return null;
        const route = getBusinessDwRoute();
        if (route) return { ...item, to: route };
        return { ...item, disabled: true };
      }
      if (item.title === 'Ubicaciones DW') {
        if (!canSeeBusinessUnitDw.value) return null;
        const route = getBusinessUnitDwRoute();
        if (route) return { ...item, to: route };
        return { ...item, disabled: true };
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
