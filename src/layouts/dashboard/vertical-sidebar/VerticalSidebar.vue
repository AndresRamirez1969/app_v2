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

const userRoles = computed(() => auth.user?.roles?.map((r) => r.name) || []);
const hasOrgCreate = computed(() => auth.user?.permissions?.includes('organization.create'));
const hasOrgView = computed(() => auth.user?.permissions?.includes('organization.view'));
const hasOrgId = computed(() => !!auth.user?.organization_id);

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

const sidebarMenu = computed(() => {
  return sidebarItems
    .map((item) => {
      if (item.title === 'Organizaciones DW') {
        if (!canSeeOrgDw.value) return null;
        const route = getOrgDwRoute();
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
