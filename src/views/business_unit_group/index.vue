<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import { mdiPlus } from '@mdi/js';
import BusinessUnitGroupsList from './BusinessUnitGroupsList.vue';
import BusinessUnitGroupsFilters from './BusinessUnitGroupsFilters.vue';
import axios from '@/utils/axios';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const business_unit_groups = ref([]);
const { mdAndDown } = useDisplay();

const searchText = ref('');
const filterOptions = ref({});

const auth = useAuthStore();
const canView = ref(false);
const canCreate = ref(false);
const canEditPermission = ref(false);
const isLoading = ref(false);

function hasPermission(permission) {
  return auth.user?.permissions?.includes(permission);
}

// Carga inicial y permisos
onMounted(async () => {
  const isSuperAdmin = auth.user?.roles?.includes('superadmin');
  const isAdmin = auth.user?.roles?.includes('admin');
  const canViewAnyGroup = hasPermission('businessUnitGroup.viewAny');
  const canViewAnyUnit = hasPermission('businessUnit.viewAny');

  if (isSuperAdmin || isAdmin || (canViewAnyGroup && canViewAnyUnit)) {
    canView.value = true;
    canCreate.value = hasPermission('businessUnitGroup.create');
    canEditPermission.value = hasPermission('businessUnitGroup.update');
    try {
      isLoading.value = true;
      await fetchBusinessUnitGroups();
    } catch (error) {
      console.error('Error fetching business unit groups:', error);
    } finally {
      isLoading.value = false;
    }
  } else {
    canView.value = false;
    if (hasPermission('businessUnitGroup.view') && auth.user?.business_unit_group_id) {
      router.replace(`/grupos-de-ubicaciones/${auth.user.business_unit_group_id}`);
    }
  }
});

// Llama a la API con los parámetros actuales de búsqueda y filtros
const fetchBusinessUnitGroups = async (params = {}) => {
  try {
    const { data } = await axios.get('/business-unit-groups', { params });
    business_unit_groups.value = data.data;
  } catch (error) {
    console.error('Error fetching business unit groups:', error);
  } finally {
    isLoading.value = false;
  }
};

const goToCreate = () => {
  router.push('/grupos-de-ubicaciones/crear');
};

// Aplica búsqueda y filtros combinados
function applyFilters() {
  const params = {};
  if (searchText.value) params.search = searchText.value;
  if (filterOptions.value.organizationId) params.organization_id = filterOptions.value.organizationId;
  if (filterOptions.value.businessId) params.business_id = filterOptions.value.businessId;
  if (filterOptions.value.status) params.status = filterOptions.value.status;
  if (filterOptions.value.createdAtStart) params.created_at_start = filterOptions.value.createdAtStart;
  if (filterOptions.value.createdAtEnd) params.created_at_end = filterOptions.value.createdAtEnd;

  fetchBusinessUnitGroups(params);
}

function handleSearch(text) {
  searchText.value = text;
  applyFilters();
}

function handleFilter(options) {
  filterOptions.value = options;
  applyFilters();
}
</script>

<template>
  <div v-if="canView">
    <v-container fluid>
      <v-row class="align-center justify-space-between mb-4">
        <v-col cols="auto" class="d-flex align-center">
          <h3 class="font-weight-medium mb-0">Grupo de Ubicaciones</h3>
        </v-col>
        <v-col cols="auto" class="d-flex align-center justify-end" v-if="canCreate">
          <v-btn color="primary" class="text-white" elevation="1" @click="goToCreate">
            <template v-if="mdAndDown">
              <v-icon :icon="mdiPlus" start />
              <span>Agregar</span>
            </template>
            <template v-else>
              <v-icon :icon="mdiPlus" start />
              <span>Agregar Grupo de Ubicación</span>
            </template>
          </v-btn>
        </v-col>
      </v-row>

      <BusinessUnitGroupsFilters @search="handleSearch" @filter="handleFilter" class="mb-4" />

      <v-row>
        <v-col>
          <BusinessUnitGroupsList
            :items="business_unit_groups"
            :isMobile="mdAndDown"
            :can-edit-permission="canEditPermission"
            :isLoading="isLoading"
          />
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>
