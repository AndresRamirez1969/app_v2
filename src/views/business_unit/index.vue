<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import { mdiPlus } from '@mdi/js';
import BusinessUnitList from './BusinessUnitList.vue';
import BusinessUnitFilters from './BusinessUnitFilter.vue';
import axios from '@/utils/axios';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const business_units = ref([]);
const filteredBusinessUnits = ref([]);
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

onMounted(async () => {
  if (!hasPermission('businessUnit.viewAny') && !auth.user?.roles?.includes('superadmin') && !auth.user?.roles?.includes('admin')) {
    router.replace('/403');
    return;
  }

  canView.value = true;
  canCreate.value = hasPermission('businessUnit.create');
  canEditPermission.value = hasPermission('businessUnit.update');
  try {
    isLoading.value = true;
    const { data } = await axios.get('/business-units');
    // El backend ahora retorna los datos en data.data o data.business_unit según el Resource
    business_units.value = data.data ?? data.business_units ?? [];
    filteredBusinessUnits.value = data.data ?? data.business_units ?? [];
  } catch (error) {
    console.error('Error fetching business units:', error);
  } finally {
    isLoading.value = false;
  }
});

const goToCreate = () => {
  router.push('/ubicaciones/crear');
};

async function handleSearch(text) {
  searchText.value = text;
  try {
    isLoading.value = true;
    const params = {};
    if (text) {
      params.search = text;
    }
    if (filterOptions.value.organizationId) {
      params.organization_id = filterOptions.value.organizationId;
    }
    if (filterOptions.value.businessId) {
      params.business_id = filterOptions.value.businessId;
    }
    if (filterOptions.value.createdAtStart) {
      params.created_at_start = filterOptions.value.createdAtStart;
    }
    if (filterOptions.value.createdAtEnd) {
      params.created_at_end = filterOptions.value.createdAtEnd;
    }
    if (filterOptions.value.status) {
      params.status = filterOptions.value.status;
    }
    // El backend soporta paginación y ordenamiento
    params.per_page = 50;
    params.sort_by = 'folio';
    params.sort_desc = true;
    const { data } = await axios.get('/business-units', { params });
    filteredBusinessUnits.value = data.data ?? data.business_units ?? [];
  } catch (error) {
    filteredBusinessUnits.value = [];
    console.error('Error searching business units:', error);
  } finally {
    isLoading.value = false;
  }
}

async function handleFilter(filters) {
  filterOptions.value = filters;
  try {
    const params = { ...filters };
    if (filters.organizationId) {
      params.organization_id = filters.organizationId;
      delete params.organizationId;
    }
    if (filters.businessId) {
      params.business_id = filters.businessId;
      delete params.businessId;
    }
    if (filters.createdAtStart) {
      params.created_at_start = filters.createdAtStart;
      delete params.createdAtStart;
    }
    if (filters.createdAtEnd) {
      params.created_at_end = filters.createdAtEnd;
      delete params.createdAtEnd;
    }
    if (filters.status) {
      params.status = filters.status;
    }
    if (searchText.value) {
      params.search = searchText.value;
    }
    params.per_page = 50;
    params.sort_by = 'folio';
    params.sort_desc = true;
    isLoading.value = true;
    const { data } = await axios.get('/business-units', { params });
    filteredBusinessUnits.value = data.data ?? data.business_units ?? [];
  } catch (error) {
    console.error('Error fetching filtered business units:', error);
    filteredBusinessUnits.value = [];
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div v-if="canView">
    <v-container fluid>
      <v-row class="align-center justify-space-between mb-4">
        <v-col cols="auto" class="d-flex align-center">
          <h3 class="font-weight-medium mb-0">Ubicaciones</h3>
        </v-col>
        <v-col cols="auto" class="d-flex align-center justify-end" v-if="canCreate">
          <v-btn color="primary" class="text-white" elevation="1" @click="goToCreate">
            <template v-if="mdAndDown">
              <v-icon :icon="mdiPlus" start />
              <span>Agregar</span>
            </template>
            <template v-else>
              <v-icon :icon="mdiPlus" start />
              <span>Agregar Ubicación</span>
            </template>
          </v-btn>
        </v-col>
      </v-row>

      <BusinessUnitFilters @search="handleSearch" @filter="handleFilter" class="mb-4" />

      <v-row>
        <v-col>
          <BusinessUnitList
            :items="filteredBusinessUnits"
            :isMobile="mdAndDown"
            :can-edit-permission="canEditPermission"
            :isLoading="isLoading"
          />
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<style scoped src="@/styles/business_unit.css"></style>
