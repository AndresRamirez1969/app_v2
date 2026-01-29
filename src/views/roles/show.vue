<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import axiosInstance from '@/utils/axios';
import { mdiArrowLeft, mdiPencil, mdiChevronDown, mdiDotsHorizontal } from '@mdi/js';
import { useAuthStore } from '@/stores/auth';
import { permissionTranslations } from '@/utils/permissionTranslations';

// Traducción de nombres de roles especiales
const roleNameTranslations = {
  superadmin: 'Super Administrador',
  admin: 'Administrador',
  sponsor: 'Sponsor'
};

const protectedRoles = ['superadmin', 'admin', 'sponsor'];

const router = useRouter();
const route = useRoute();
const { mdAndDown } = useDisplay();
const role = ref(null);
const permissionsByModel = ref({});
const auth = useAuthStore();

const user = computed(() => auth.user || { roles: [], permissions: [] });
const roles = computed(() => user.value.roles || []);
const permissions = computed(() => user.value.permissions || []);
const canView = computed(() => permissions.value.includes('role.view'));
const canViewAny = computed(() => permissions.value.includes('role.viewAny'));
const canEdit = computed(() => permissions.value.includes('role.update'));
const isSuperadmin = computed(() => roles.value.includes('superadmin'));

const isProtectedRole = computed(() => protectedRoles.includes(role.value?.name?.toLowerCase()));

const goToEdit = () => {
  if (role.value?.id) {
    router.push({ path: `/roles/editar/${role.value.id}` });
  }
};

const goToIndex = () => {
  router.push('/roles');
};

// Diccionario para traducir modelos a español
const modelNames = {
  user: 'Usuario',
  role: 'Rol',
  permission: 'Permiso',
  businessUnit: 'Ubicación',
  businessUnitGroup: 'Grupo de Ubicaciones',
  organization: 'Organización',
  business: 'Negocio',
  form: 'Formulario',
  person: 'Persona',
  dashboard: 'Dashboard'
  // Agrega aquí más modelos según tu sistema
};

const allModels = Object.keys(modelNames);

// Agrupa permisos por modelo, considerando los permisos directos y los de los roles vinculados
function getPermissionsByModelFromLinkedRoles(role) {
  const grouped = {};
  // Permisos directos del rol
  const directPerms = role?.permissions || [];
  // Permisos de los roles vinculados
  const linkedRoles = role?.roles || [];
  let allPerms = [...directPerms];
  linkedRoles.forEach((r) => {
    if (r.permissions) allPerms = allPerms.concat(r.permissions);
  });
  // Agrupa por modelo usando el nombre del permiso
  allPerms.forEach((perm) => {
    // No mostrar form_field ni permission
    if (perm.name?.startsWith('form_field.') || perm.name?.startsWith('permission.')) {
      return;
    }
    let model = perm.name?.split('.')[0] || perm.model || perm.model_name || 'Otro';
    // Agrupa form_response en form
    if (model === 'form_response') {
      model = 'form';
    }
    // Agrupa permission en role (pero ya los filtramos arriba)
    if (!grouped[model]) grouped[model] = [];
    grouped[model].push(perm);
  });
  return grouped;
}

const modelsWithPermissions = computed(() => {
  // Solo modelos con permisos vinculados
  return Object.keys(permissionsByModel.value).filter(
    (model) => permissionsByModel.value[model] && permissionsByModel.value[model].length > 0
  );
});

// Traduce el nombre del rol si es especial
function translateRoleName(name) {
  return roleNameTranslations[name] || name;
}

// Traduce el nombre del permiso usando el diccionario
function translatePermission(name) {
  // Busca traducción exacta primero
  if (permissionTranslations[name]) return permissionTranslations[name];
  // Si no existe, busca por acción
  const action = name?.split('.')?.[1];
  return permissionTranslations[action] || action || name;
}

function translateOrganizationName(id) {
  // Implementa tu lógica de traducción aquí si es necesario
  return id;
}

onMounted(async () => {
  if (!canView.value) return;
  try {
    const id = route.params.id;
    const res = await axiosInstance.get(`/roles/${id}?with=permissions,roles.permissions`);
    role.value = res.data || res.data.role || res.data.data;
    permissionsByModel.value = getPermissionsByModelFromLinkedRoles(role.value);
  } catch (err) {
    console.error('Error al obtener el rol:', err);
  }
});
</script>

<template>
  <v-container fluid v-if="canView">
    <!-- Header -->
    <v-row class="align-center mb-6" no-gutters>
      <v-col cols="auto" class="d-flex align-center">
        <template v-if="canViewAny">
          <v-btn
            icon
            variant="text"
            class="px-3 py-2"
            style="border-radius: 8px; border: 1px solid #ccc; min-width: 44px; height: 44px"
            @click="goToIndex"
          >
            <v-icon :icon="mdiArrowLeft" />
          </v-btn>
        </template>
        <h3 class="font-weight-medium ml-3 mb-0 d-none d-md-block" v-if="role">
          {{ role.id ? `${role.id}` : '' }}
          {{ role.name ? `- ${translateRoleName(role.name)}` : '- Rol' }}
        </h3>
        <h3 class="font-weight-medium ml-3 mb-0 d-block d-md-none" v-if="role">
          {{ role.id ? `${role.id}` : '' }}
        </h3>
      </v-col>
      <v-col class="d-flex justify-end align-center">
        <template v-if="canEdit && !isProtectedRole">
          <v-menu location="bottom end" v-if="!mdAndDown">
            <template #activator="{ props }">
              <v-btn
                v-bind="props"
                variant="text"
                class="px-3 py-2"
                style="border-radius: 8px; border: 1px solid #ccc; min-width: 44px; height: 44px"
              >
                Opciones
                <v-icon :icon="mdiChevronDown" end size="18" />
              </v-btn>
            </template>
            <v-list class="custom-dropdown elevation-1 rounded-lg" style="min-width: 200px">
              <v-list-item @click="goToEdit">
                <template #prepend>
                  <v-icon :icon="mdiPencil" size="16" />
                </template>
                <v-list-item-title>Editar</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
          <v-menu location="bottom end" v-else>
            <template #activator="{ props }">
              <v-btn
                v-bind="props"
                icon
                variant="text"
                class="pa-0"
                min-width="0"
                height="44"
                style="border-radius: 8px; border: 1px solid #ccc; min-width: 44px"
              >
                <v-icon :icon="mdiDotsHorizontal" size="24" />
              </v-btn>
            </template>
            <v-list class="custom-dropdown elevation-1 rounded-lg" style="min-width: 180px">
              <v-list-item @click="goToEdit">
                <template #prepend>
                  <v-icon :icon="mdiPencil" size="16" />
                </template>
                <v-list-item-title>Editar</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </template>
      </v-col>
    </v-row>

    <!-- Título fuera del card -->
    <v-row>
      <v-col cols="12" class="mb-2">
        <div class="font-weight-bold text-h6">Información General</div>
      </v-col>
    </v-row>

    <!-- Card de información general -->
    <v-row>
      <v-col cols="12">
        <v-card class="rounded-lg pa-4 mb-6 elevation-1 info-card-effect">
          <v-table class="rounded-lg elevation-0" style="border: none">
            <tbody>
              <tr>
                <td class="font-weight-bold text-subtitle-1" style="width: 40%">ID</td>
                <td>{{ role?.id ?? 'No disponible' }}</td>
              </tr>
              <tr>
                <td class="font-weight-bold text-subtitle-1">Nombre</td>
                <td>{{ role?.name ? translateRoleName(role.name) : 'No disponible' }}</td>
              </tr>
              <tr v-if="isSuperadmin">
                <td class="font-weight-bold text-subtitle-1">Organización</td>
                <td>
                  <template v-if="role?.name === 'superadmin'"> Único </template>
                  <template v-else-if="role?.name === 'admin' || role?.name === 'sponsor'"> Global </template>
                  <template
                    v-else-if="role?.organization && (role.organization.folio || role.organization.legal_name || role.organization.name)"
                  >
                    <router-link
                      :to="`/organizaciones/${role.organization.id}`"
                      style="text-decoration: underline; color: #1976d2 !important"
                    >
                      {{ role.organization.folio ?? role.organization.id }} - {{ role.organization.legal_name ?? role.organization.name }}
                    </router-link>
                  </template>
                  <template v-else> No disponible </template>
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-col>
    </v-row>

    <!-- Título tabla -->
    <v-row>
      <v-col cols="12" class="mb-2">
        <div class="font-weight-bold text-h6">Permisos vinculados</div>
      </v-col>
    </v-row>

    <!-- Tabla de permisos vinculados -->
    <v-row>
      <v-col cols="12">
        <!-- Desktop Table -->
        <v-table class="rounded-lg elevation-1 fixed-table d-none d-md-table" style="width: 100%">
          <thead>
            <tr>
              <th class="model-header font-weight-bold text-subtitle-1">Modelo</th>
              <th class="permissions-header font-weight-bold text-subtitle-1">Permisos</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="model in modelsWithPermissions" :key="model">
              <td class="model-cell">
                {{ modelNames[model] || model }}
              </td>
              <td class="permissions-cell">
                <v-chip
                  v-for="perm in permissionsByModel[model]"
                  :key="perm.id || perm.name"
                  class="ma-1"
                  size="small"
                  color="primary"
                  text-color="white"
                >
                  {{ translatePermission(perm.name) }}
                </v-chip>
              </td>
            </tr>
            <tr v-if="modelsWithPermissions.length === 0">
              <td colspan="2" class="text-center text-medium-emphasis">No hay permisos vinculados.</td>
            </tr>
          </tbody>
        </v-table>
        <!-- Mobile Cards -->
        <div class="d-md-none">
          <v-card v-for="model in modelsWithPermissions" :key="model" class="mb-4 pa-3 elevation-1 rounded-lg">
            <div class="font-weight-bold mb-2">{{ modelNames[model] || model }}</div>
            <div>
              <v-chip
                v-for="perm in permissionsByModel[model]"
                :key="perm.id || perm.name"
                class="ma-1"
                size="small"
                color="primary"
                text-color="white"
              >
                {{ translatePermission(perm.name) }}
              </v-chip>
            </div>
          </v-card>
          <v-card v-if="modelsWithPermissions.length === 0" class="mb-4 pa-4 elevation-1 rounded-lg text-center">
            <div class="font-weight-bold mb-2" style="font-size: 1.5rem">No hay permisos vinculados</div>
          </v-card>
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped src="@/styles/roles.css"></style>
