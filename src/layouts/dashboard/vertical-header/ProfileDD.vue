<script setup lang="ts">
import { ref, computed } from 'vue';
// icons
import {
  LogoutOutlined,
  UserOutlined,
  QuestionCircleOutlined,
  LockOutlined,
  CommentOutlined,
  UnorderedListOutlined,
  ApartmentOutlined,
  ShopOutlined,
  EnvironmentOutlined
} from '@ant-design/icons-vue';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';

const tab = ref(null);
const authStore = useAuthStore();
const router = useRouter();

const userRoles = computed(() => authStore.user?.roles || []);
const permissions = computed(() => authStore.user?.permissions || []);
const hasOrgCreate = computed(() => permissions.value.includes('organization.create'));
const hasOrgView = computed(() => permissions.value.includes('organization.view'));
const hasOrgId = computed(() => !!authStore.user?.organization_id);
const hasBusinessId = computed(() => !!authStore.user?.business_id);

const hasOrgViewAny = computed(() => permissions.value.includes('organization.viewAny'));
const hasBusinessViewAny = computed(() => permissions.value.includes('business.viewAny'));
const hasBusinessUnitViewAny = computed(() => permissions.value.includes('businessUnit.viewAny'));

const hasBusinessUnitId = computed(() => !!authStore.user?.business_unit_id);
const hasBusinessUnitView = computed(() => permissions.value.includes('businessUnit.view'));

// Mostrar DW en ProfileDD solo si NO es superadmin y NO tiene el permiso viewAny
const showOrgDwProfile = computed(() => {
  return !userRoles.value.includes('superadmin') && !hasOrgViewAny.value;
});
const showBusinessDwProfile = computed(() => {
  return !userRoles.value.includes('superadmin') && !hasBusinessViewAny.value;
});
const showBusinessUnitDwProfile = computed(() => {
  return !userRoles.value.includes('superadmin') && !hasBusinessUnitViewAny.value;
});

// Lógica de rutas y disabled
function getOrgDwRoute() {
  if (hasOrgId.value) {
    if (userRoles.value.includes('admin') || hasOrgCreate.value) {
      return `/organizaciones-dw/${authStore.user.organization_id}`;
    }
    if (userRoles.value.includes('sponsor') || hasOrgView.value) {
      return `/organizaciones-dw/${authStore.user.organization_id}`;
    }
  }
  if (userRoles.value.includes('admin') || hasOrgCreate.value) {
    return '/organizaciones-dw/create';
  }
  return null;
}
function isOrgDwDisabled() {
  return !hasOrgId.value && !(userRoles.value.includes('admin') || hasOrgCreate.value);
}

function getBusinessDwRoute() {
  if (hasBusinessId.value) {
    if (userRoles.value.includes('admin') || userRoles.value.includes('sponsor') || permissions.value.includes('business.view')) {
      return `/negocios-dw/${authStore.user.business_id}`;
    }
  }
  return null;
}
function isBusinessDwDisabled() {
  return !hasBusinessId.value;
}

function getBusinessUnitDwRoute() {
  if (hasBusinessUnitId.value) {
    if (userRoles.value.includes('admin') || userRoles.value.includes('sponsor') || hasBusinessUnitView.value) {
      return `/ubicaciones-dw/${authStore.user.business_unit_id}`;
    }
  }
  return null;
}
function isBusinessUnitDwDisabled() {
  return !hasBusinessUnitId.value;
}

const handleLogout = async () => {
  await authStore.logout();
  router.push('/login');
};
</script>

<template>
  <div>
    <div class="d-flex align-center pa-5">
      <v-avatar size="32" class="mr-2">
        <v-img :src="authStore.user?.profile_picture || `/img/default-avatar.png`" width="32" alt="Foto de Perfil" />
      </v-avatar>
      <div>
        <h6 class="text-h6 mb-0">{{ authStore.user?.name || 'Guest' }}</h6>
      </div>
    </div>
    <v-tabs v-model="tab" color="primary" grow>
      <v-tab value="111"> <UserOutlined class="v-icon--start" /> Profile </v-tab>
    </v-tabs>
    <v-window v-model="tab">
      <v-window-item value="111">
        <v-list class="py-0" aria-label="profile list" aria-busy="true">
          <v-list-item @click="$router.push({ name: 'Profile' })" color="primary" rounded="0" value="Ver Perfil">
            <template v-slot:prepend>
              <UserOutlined :style="{ fontSize: '14px' }" class="mr-4" />
            </template>
            <v-list-item-title class="text-h6"> Ver Perfil</v-list-item-title>
          </v-list-item>

          <!-- Organizaciones DW -->
          <v-list-item
            v-if="showOrgDwProfile"
            :disabled="isOrgDwDisabled()"
            @click="!isOrgDwDisabled() && $router.push(getOrgDwRoute())"
            color="primary"
            rounded="0"
            value="OrganizacionesDW"
          >
            <template v-slot:prepend>
              <ApartmentOutlined :style="{ fontSize: '14px' }" class="mr-4" />
            </template>
            <v-list-item-title class="text-h6"> Organizaciones DW</v-list-item-title>
          </v-list-item>

          <!-- Empresas DW -->
          <v-list-item
            v-if="showBusinessDwProfile"
            :disabled="isBusinessDwDisabled()"
            @click="!isBusinessDwDisabled() && $router.push(getBusinessDwRoute())"
            color="primary"
            rounded="0"
            value="EmpresasDW"
          >
            <template v-slot:prepend>
              <ShopOutlined :style="{ fontSize: '14px' }" class="mr-4" />
            </template>
            <v-list-item-title class="text-h6"> Empresas DW</v-list-item-title>
          </v-list-item>

          <!-- Ubicaciones DW -->
          <v-list-item
            v-if="showBusinessUnitDwProfile"
            :disabled="isBusinessUnitDwDisabled()"
            @click="!isBusinessUnitDwDisabled() && $router.push(getBusinessUnitDwRoute())"
            color="primary"
            rounded="0"
            value="UbicacionesDW"
          >
            <template v-slot:prepend>
              <EnvironmentOutlined :style="{ fontSize: '14px' }" class="mr-4" />
            </template>
            <v-list-item-title class="text-h6"> Ubicaciones DW</v-list-item-title>
          </v-list-item>

          <v-list-item @click="handleLogout" color="secondary" rounded="0">
            <template v-slot:prepend>
              <LogoutOutlined :style="{ fontSize: '14px' }" class="mr-4" />
            </template>
            <v-list-item-title class="text-subtitle-2"> Cerrar Sesión</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-window-item>
      <v-window-item value="222">
        <v-list class="py-0" aria-label="profile list" aria-busy="true">
          <v-list-item color="primary" rounded="0" value="Support">
            <template v-slot:prepend>
              <QuestionCircleOutlined :style="{ fontSize: '14px' }" class="mr-4" />
            </template>
            <v-list-item-title class="text-h6"> Support</v-list-item-title>
          </v-list-item>

          <v-list-item color="primary" rounded="0" value="Account">
            <template v-slot:prepend>
              <UserOutlined :style="{ fontSize: '14px' }" class="mr-4" />
            </template>
            <v-list-item-title class="text-h6"> Account settings</v-list-item-title>
          </v-list-item>

          <v-list-item color="primary" rounded="0" value="Privacy">
            <template v-slot:prepend>
              <LockOutlined :style="{ fontSize: '14px' }" class="mr-4" />
            </template>
            <v-list-item-title class="text-h6"> Privacy center</v-list-item-title>
          </v-list-item>

          <v-list-item color="primary" rounded="0" value="Feedback">
            <template v-slot:prepend>
              <CommentOutlined :style="{ fontSize: '14px' }" class="mr-4" />
            </template>
            <v-list-item-title class="text-h6"> Feedback</v-list-item-title>
          </v-list-item>

          <v-list-item color="primary" rounded="0" value="History">
            <template v-slot:prepend>
              <UnorderedListOutlined :style="{ fontSize: '14px' }" class="mr-4" />
            </template>
            <v-list-item-title class="text-h6"> History</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-window-item>
    </v-window>
  </div>
</template>
