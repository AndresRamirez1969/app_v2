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
const total = ref(0);
const page = ref(1);
const itemsPerPage = ref(10);
const sortBy = ref('id');
const sortDesc = ref(true);
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
  } else if (!canViewAnyGroup) {
    router.replace('/403');
  } else {
    canView.value = false;
    if (hasPermission('businessUnitGroup.view') && auth.user?.business_unit_group_id) {
      router.replace(`/grupos-de-ubicaciones/${auth.user.business_unit_group_id}`);
    }
  }
});

// Llama a la API con los parámetros actuales de búsqueda y filtros
const fetchBusinessUnitGroups = async (params = {}) => {
  isLoading.value = true;
  try {
    const mergedParams = {
      page: page.value,
      per_page: itemsPerPage.value,
      sort_by: sortBy.value,
      sort_desc: sortDesc.value,
      ...params
    };
    const { data } = await axios.get('/business-unit-groups', { params: mergedParams });
    business_unit_groups.value = data.data;
    total.value = data.meta?.total ?? 0;
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
function applyFilters(extra = {}) {
  const params = {
    search: searchText.value || undefined,
    organization_id: filterOptions.value.organizationId || undefined,
    business_id: filterOptions.value.businessId || undefined,
    status: filterOptions.value.status || undefined,
    created_at_start: filterOptions.value.createdAtStart || undefined,
    created_at_end: filterOptions.value.createdAtEnd || undefined,
    ...extra
  };
  fetchBusinessUnitGroups(params);
}

function handleSearch(text) {
  searchText.value = text;
  page.value = 1;
  applyFilters();
}

function handleFilter(options) {
  filterOptions.value = options;
  page.value = 1;
  applyFilters();
}

function handlePageChange(newPage) {
  page.value = newPage;
  applyFilters({ page: newPage });
}

function handleSort(column) {
  if (sortBy.value === column) {
    sortDesc.value = !sortDesc.value;
  } else {
    sortBy.value = column;
    sortDesc.value = false;
  }
  page.value = 1;
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
            :page="page"
            :itemsPerPage="itemsPerPage"
            :total="total"
            :sortBy="sortBy"
            :sortDesc="sortDesc"
            @update:page="handlePageChange"
            @sort="handleSort"
          />
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>
