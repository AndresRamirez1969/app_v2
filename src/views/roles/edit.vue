<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { mdiArrowLeft, mdiInformationSlabCircleOutline } from '@mdi/js';
import axios from '@/utils/axios';
import { useAuthStore } from '@/stores/auth';
import { permissionTranslations } from '@/utils/permissionTranslations';
import { permissionDescriptions } from '@/utils/permissionsDescriptions';
import PermissionFilter from './permissionfilter.vue';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const roleId = route.params.id;

function isSuperadmin() {
  return auth.user?.roles?.includes('superadmin');
}

const name = ref('');
const organizationId = ref(null);
const organizations = ref([]);
const orgLoading = ref(false);
const orgSearch = ref('');
const allPermissions = ref([]);
const selectedPermissions = ref([]);
const loading = ref(false);
const saving = ref(false);
const search = ref('');
const page = ref(1);
const itemsPerPage = ref(10);
const total = ref(0);

const isMobile = ref(window.innerWidth < 600);
window.addEventListener('resize', () => {
  isMobile.value = window.innerWidth < 600;
});

const modelNames = {
  user: 'Usuario',
  role: 'Rol',
  permission: 'Permiso',
  businessUnit: 'Ubicación',
  businessUnitGroup: 'Grupo de Ubicaciones',
  organization: 'Organización',
  business: 'Negocio',
  form: 'Formulario'
  // person: 'Persona'
};

const protectedRoles = ['superadmin', 'admin', 'sponsor'];
const isProtectedRole = computed(() => protectedRoles.includes(name.value?.toLowerCase()));

const canEdit = computed(() => auth.user?.permissions?.includes('role.update'));

function groupPermissions(perms) {
  return perms
    .filter(
      (perm) =>
        perm.name && !perm.name.startsWith('form_field.') && !perm.name.startsWith('permission.') && !perm.name.startsWith('person.')
    )
    .map((perm) => {
      let model = perm.name.split('.')[0] || perm.model || perm.model_name || 'Otro';
      if (model === 'form_response') model = 'form';
      return {
        id: perm.id,
        name: perm.name,
        model,
        modelLabel: modelNames[model] || model,
        label: permissionTranslations[perm.name] || permissionTranslations[perm.name?.split('.')[1]] || perm.name
      };
    });
}

const filteredPermissions = computed(() => {
  let perms = groupPermissions(allPermissions.value);
  if (search.value) {
    const s = search.value.toLowerCase();
    perms = perms.filter(
      (p) => p.modelLabel.toLowerCase().includes(s) || p.label.toLowerCase().includes(s) || p.name.toLowerCase().includes(s)
    );
  }
  total.value = perms.length;
  const start = (page.value - 1) * itemsPerPage.value;
  return perms.slice(start, start + itemsPerPage.value);
});

const totalPages = computed(() => Math.ceil(total.value / itemsPerPage.value));

async function fetchRole() {
  loading.value = true;
  try {
    const { data } = await axios.get(`/roles/${roleId}?with=permissions,organization`);
    name.value = data.name;
    organizationId.value = data.organization_id;
    selectedPermissions.value = (data.permissions || []).map((perm) => perm.name);
    // Si eres superadmin, carga organizaciones
    if (isSuperadmin()) {
      orgLoading.value = true;
      const orgRes = await axios.get('/organizations', {
        params: { search: orgSearch.value }
      });
      organizations.value = orgRes.data.data || orgRes.data;
      orgLoading.value = false;
    }
  } catch (e) {
    organizations.value = [];
  } finally {
    loading.value = false;
  }
}

async function fetchPermissions() {
  try {
    const { data } = await axios.get('/permissions');
    allPermissions.value = data.data || data;
  } catch (e) {
    allPermissions.value = [];
  }
}

onMounted(async () => {
  await fetchPermissions();
  await fetchRole();
});

watch(search, () => {
  page.value = 1;
});

watch(orgSearch, async (val) => {
  if (isSuperadmin()) {
    orgLoading.value = true;
    try {
      const orgRes = await axios.get('/organizations', {
        params: { search: val }
      });
      organizations.value = orgRes.data.data || orgRes.data;
    } catch (e) {
      organizations.value = [];
    } finally {
      orgLoading.value = false;
    }
  }
});

function togglePermission(name) {
  if (isProtectedRole.value) return;
  if (selectedPermissions.value.includes(name)) {
    selectedPermissions.value = selectedPermissions.value.filter((n) => n !== name);
  } else {
    selectedPermissions.value.push(name);
  }
}

function handlePageChange(val) {
  page.value = val;
}

async function saveRole() {
  if (!canEdit.value || !name.value || !organizationId.value || !selectedPermissions.value.length || isProtectedRole.value) return;
  saving.value = true;
  try {
    await axios.put(`/roles/${roleId}`, {
      name: name.value,
      organization_id: organizationId.value,
      permissions: selectedPermissions.value
    });
    router.push(`/roles/${roleId}`);
  } catch (e) {
    console.error('Error al guardar:', e.response?.data || e);
    alert(e.response?.data?.message || 'Error al guardar');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <v-container>
    <!-- Header -->
    <v-row class="align-center mb-6" no-gutters>
      <v-col cols="auto" class="d-flex align-center">
        <v-btn icon variant="text" class="px-3 py-2" style="border-radius: 8px; border: 1px solid #ccc" @click="router.back()">
          <v-icon :icon="mdiArrowLeft"></v-icon>
        </v-btn>
        <h3 class="font-weight-medium ml-3 mb-0">Editar Rol</h3>
      </v-col>
    </v-row>

    <v-row>
      <v-col>
        <v-text-field
          v-model="name"
          label="Nombre del rol"
          variant="outlined"
          color="primary"
          required
          class="mb-4"
          :disabled="isProtectedRole"
        />
      </v-col>
    </v-row>
    <!-- Select de organización SOLO para superadmin -->
    <v-row v-if="isSuperadmin()">
      <v-col>
        <v-select
          v-model="organizationId"
          :items="organizations"
          :item-title="(org) => `${org.folio ?? org.id} - ${org.legal_name ?? org.name}`"
          item-value="id"
          label="Organización"
          variant="outlined"
          color="primary"
          required
          class="mb-4"
          :loading="orgLoading"
          :searchable="true"
          clearable
          :disabled="isProtectedRole"
        />
      </v-col>
    </v-row>
    <!-- Filtro de permisos -->
    <v-row>
      <v-col>
        <PermissionFilter v-model="search" :disabled="isProtectedRole" />
      </v-col>
    </v-row>
    <!-- Permisos como tabla en desktop, como cards en mobile -->
    <v-row v-if="!isMobile">
      <v-col>
        <v-table class="rounded-lg elevation-1 uniform-table" style="width: 100%">
          <thead>
            <tr>
              <th class="font-weight-bold text-center uniform-col" style="width: 80px"></th>
              <th class="font-weight-bold text-center uniform-col" style="width: 200px">Modelo</th>
              <th class="font-weight-bold text-center uniform-col" style="width: 220px">Permiso</th>
              <th class="font-weight-bold text-center uniform-col" style="width: 60px"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="perm in filteredPermissions"
              :key="perm.id"
              class="row-clickable"
              :class="{ 'selected-row': selectedPermissions.includes(perm.name) }"
              :style="{ cursor: isProtectedRole ? 'not-allowed' : 'pointer' }"
              @click="!isProtectedRole && togglePermission(perm.name)"
            >
              <td class="text-center uniform-col" style="padding-left: 0; padding-right: 8px">
                <div class="d-flex justify-center align-center" style="height: 100%">
                  <v-checkbox
                    :model-value="selectedPermissions.includes(perm.name)"
                    @update:model-value="!isProtectedRole && togglePermission(perm.name)"
                    color="primary"
                    hide-details
                    :ripple="false"
                    class="pa-0 ma-0"
                    style="--v-checkbox-bg: #1976d2; --v-checkbox-checked-color: #fff"
                    :disabled="isProtectedRole"
                  />
                </div>
              </td>
              <td class="text-center uniform-col" style="vertical-align: middle">
                {{ perm.modelLabel }}
              </td>
              <td class="text-center uniform-col" style="vertical-align: middle">
                <v-chip color="primary" text-color="white" class="ma-0 pa-2" style="font-weight: 500; font-size: 0.95em">
                  {{ perm.label }}
                </v-chip>
              </td>
              <td class="text-center uniform-col" style="vertical-align: middle">
                <v-tooltip location="top" :text="permissionDescriptions[perm.name] || 'Sin descripción'">
                  <template #activator="{ props }">
                    <v-icon v-bind="props" :icon="mdiInformationSlabCircleOutline" color="primary" style="cursor: pointer" />
                  </template>
                </v-tooltip>
              </td>
            </tr>
            <tr v-if="filteredPermissions.length === 0">
              <td colspan="4" class="text-center text-medium-emphasis">No hay permisos disponibles.</td>
            </tr>
          </tbody>
        </v-table>
      </v-col>
    </v-row>
    <!-- Permisos como cards en mobile -->
    <v-row v-else>
      <v-col cols="12" v-for="perm in filteredPermissions" :key="perm.id">
        <v-card
          class="permission-card"
          :class="{ 'selected-row': selectedPermissions.includes(perm.name) }"
          @click="!isProtectedRole && togglePermission(perm.name)"
          elevation="1"
          style="cursor: pointer; margin-bottom: 12px"
        >
          <v-row no-gutters>
            <!-- Checkbox a la izquierda -->
            <v-col cols="auto" class="d-flex align-center justify-center" style="padding-left: 8px">
              <v-checkbox
                :model-value="selectedPermissions.includes(perm.name)"
                @update:model-value="!isProtectedRole && togglePermission(perm.name)"
                color="primary"
                hide-details
                :ripple="false"
                class="pa-0 ma-0"
                style="--v-checkbox-bg: #1976d2; --v-checkbox-checked-color: #fff"
                :disabled="isProtectedRole"
              />
            </v-col>
            <!-- Columna derecha: modelo, pildora y mensaje -->
            <v-col>
              <v-row no-gutters align="center">
                <!-- Modelo -->
                <v-col cols="auto" class="d-flex align-center" style="min-width: 100px">
                  <div class="font-weight-medium">{{ perm.modelLabel }}</div>
                </v-col>
                <!-- Píldora del permiso -->
                <v-col cols="auto" class="d-flex align-center" style="padding-left: 12px">
                  <v-chip color="primary" text-color="white" class="ma-0 pa-2" style="font-weight: 500; font-size: 0.95em">
                    {{ perm.label }}
                  </v-chip>
                </v-col>
              </v-row>
              <v-row no-gutters>
                <v-col>
                  <div class="text-caption text-medium-emphasis" style="padding-top: 4px; padding-bottom: 8px">
                    {{ permissionDescriptions[perm.name] || 'Sin descripción' }}
                  </div>
                </v-col>
              </v-row>
            </v-col>
          </v-row>
        </v-card>
      </v-col>
      <v-col cols="12" v-if="filteredPermissions.length === 0">
        <v-alert type="info" variant="outlined">No hay permisos disponibles.</v-alert>
      </v-col>
    </v-row>
    <!-- Paginación centrada -->
    <v-row v-if="totalPages > 1">
      <v-col class="d-flex justify-center">
        <v-pagination
          v-model="page"
          :length="totalPages"
          @update:model-value="handlePageChange"
          color="primary"
          :disabled="isProtectedRole"
        />
      </v-col>
    </v-row>
    <v-row>
      <v-col class="d-flex justify-end">
        <v-btn
          color="primary"
          :loading="saving"
          :disabled="!canEdit || !name || !organizationId || !selectedPermissions.length || isProtectedRole"
          @click="saveRole"
        >
          Guardar Cambios
        </v-btn>
      </v-col>
    </v-row>
    <v-row v-if="isProtectedRole">
      <v-col>
        <v-alert type="info" variant="outlined" class="mt-4"> Este rol no se puede editar. </v-alert>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped src="@/styles/roles.css"></style>
