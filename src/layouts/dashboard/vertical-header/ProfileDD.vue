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

// Mostrar  en ProfileDD solo si NO es superadmin y NO tiene el permiso viewAny
const showOrgDwProfile = computed(() => {
  return !userRoles.value.includes('superadmin') && !hasOrgViewAny.value;
});
const showBusinessDwProfile = computed(() => {
  return !userRoles.value.includes('superadmin') && !hasBusinessViewAny.value;
});
const showBusinessUnitDwProfile = computed(() => {
  return !userRoles.value.includes('superadmin') && !hasBusinessUnitViewAny.value;
});

// Mostrar botón Horizon solo a superadmin
const showHorizonButton = computed(() => userRoles.value.includes('superadmin'));

// Lógica de rutas y disabled
function getOrgRoute() {
  if (hasOrgId.value) {
    if (userRoles.value.includes('admin') || hasOrgCreate.value) {
      return `/organizaciones/${authStore.user.organization_id}`;
    }
    if (userRoles.value.includes('sponsor') || hasOrgView.value) {
      return `/organizaciones/${authStore.user.organization_id}`;
    }
  }
  if (userRoles.value.includes('admin') || hasOrgCreate.value) {
    return '/organizaciones/crear';
  }
  return '/dashboard';
}
function isOrgDwDisabled() {
  return !hasOrgId.value && !(userRoles.value.includes('admin') || hasOrgCreate.value);
}

function getBusinessRoute() {
  if (hasBusinessId.value) {
    if (userRoles.value.includes('admin') || userRoles.value.includes('sponsor') || permissions.value.includes('business.view')) {
      return `/empresas/${authStore.user.business_id}`;
    }
  }
  return '/dashboard';
}
function isBusinessDwDisabled() {
  return !hasBusinessId.value;
}

function getBusinessUnitRoute() {
  if (hasBusinessUnitId.value) {
    if (userRoles.value.includes('admin') || userRoles.value.includes('sponsor') || hasBusinessUnitView.value) {
      return `/ubicaciones/${authStore.user.business_unit_id}`;
    }
  }
  return '/dashboard';
}
function isBusinessUnitDwDisabled() {
  return !hasBusinessUnitId.value;
}

const handleLogout = async () => {
  await authStore.logout();
  router.push('/login');
};

// --- INICIO: Botón Acceso a Horizon ---
const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

function goToHorizonLogin() {
  window.open(`${backendUrl}/horizon-login`, '_blank');
}
// --- FIN: Botón Acceso a Horizon ---
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

          <!-- Organizaciones  -->
          <v-list-item
            v-if="showOrgDwProfile"
            :disabled="isOrgDwDisabled()"
            @click="getOrgRoute() && $router.push(getOrgRoute())"
            color="primary"
            rounded="0"
            value="Organizaciones"
          >
            <template v-slot:prepend>
              <ApartmentOutlined :style="{ fontSize: '14px' }" class="mr-4" />
            </template>
            <v-list-item-title class="text-h6"> Organizaciones</v-list-item-title>
          </v-list-item>

          <!-- Empresas  -->
          <v-list-item
            v-if="showBusinessDwProfile"
            :disabled="isBusinessDwDisabled()"
            @click="getBusinessRoute() && $router.push(getBusinessRoute())"
            color="primary"
            rounded="0"
            value="Empresas"
          >
            <template v-slot:prepend>
              <ShopOutlined :style="{ fontSize: '14px' }" class="mr-4" />
            </template>
            <v-list-item-title class="text-h6"> Empresas</v-list-item-title>
          </v-list-item>

          <!-- Ubicaciones  -->
          <v-list-item
            v-if="showBusinessUnitDwProfile"
            :disabled="isBusinessUnitDwDisabled()"
            @click="getBusinessUnitRoute() && $router.push(getBusinessUnitRoute())"
            color="primary"
            rounded="0"
            value="Ubicaciones"
          >
            <template v-slot:prepend>
              <EnvironmentOutlined :style="{ fontSize: '14px' }" class="mr-4" />
            </template>
            <v-list-item-title class="text-h6"> Ubicaciones</v-list-item-title>
          </v-list-item>

          <!-- Botón Acceso a Horizon SOLO para superadmin -->
          <v-list-item v-if="showHorizonButton" @click="goToHorizonLogin" color="primary" rounded="0" value="AccesoHorizon">
            <template v-slot:prepend>
              <LockOutlined :style="{ fontSize: '14px' }" class="mr-4" />
            </template>
            <v-list-item-title class="text-h6">Acceso a Horizon</v-list-item-title>
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
