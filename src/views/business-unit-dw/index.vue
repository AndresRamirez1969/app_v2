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

// INTEGRACIÓN: roles ahora son array de strings
onMounted(async () => {
  if (auth.user?.roles?.includes('superadmin') || auth.user?.roles?.includes('admin') || hasPermission('businessUnit.viewAny')) {
    canView.value = true;
    canCreate.value = hasPermission('businessUnit.create');
    canEditPermission.value = hasPermission('businessUnit.update');
    try {
      isLoading.value = true;
      const { data } = await axios.get('/business-units');
      business_units.value = data.data; // <-- SOLO EL ARRAY
      filteredBusinessUnits.value = data.data; // <-- SOLO EL ARRAY
      console.log('Business units cargados:', filteredBusinessUnits.value);
    } catch (error) {
      console.error('Error fetching business units:', error);
    } finally {
      isLoading.value = false;
    }
  } else {
    canView.value = false;
    if (hasPermission('businessUnit.view') && auth.user?.business_unit_id) {
      router.replace(`/ubicaciones-dw/${auth.user.business_unit_id}`);
    }
  }
});

const goToCreate = () => {
  router.push('/ubicaciones-dw/create');
};

function handleSearch(text) {
  searchText.value = text;
  applyFilters();
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
    const { data } = await axios.get('/business-units', { params });
    filteredBusinessUnits.value = data.data; // <-- SOLO EL ARRAY
    console.log('Business units filtrados:', filteredBusinessUnits.value);
  } catch (error) {
    console.error('Error fetching filtered business units:', error);
    filteredBusinessUnits.value = [];
  }
}

function applyFilters() {
  let result = business_units.value;

  if (searchText.value) {
    const q = searchText.value.toLowerCase();
    result = result.filter(
      (uni) =>
        (uni.legal_name && uni.legal_name.toLowerCase().includes(q)) ||
        (uni.alias && uni.alias.toLowerCase().includes(q)) ||
        (uni.folio && String(uni.folio).toLowerCase().includes(q)) ||
        (uni.address && Object.values(uni.address).join(' ').toLowerCase().includes(q))
    );
  }

  if (filterOptions.value.status) {
    result = result.filter((uni) => uni.status === filterOptions.value.status);
  }
  if (filterOptions.value.createdAt) {
    result = result.filter((uni) => uni.created_at && uni.created_at >= filterOptions.value.createdAt);
  }
  if (filterOptions.value.updatedAt) {
    result = result.filter((uni) => uni.updated_at && uni.updated_at >= filterOptions.value.updatedAt);
  }
  if (filterOptions.value.organizationId) {
    result = result.filter((uni) => String(uni.organization_id) === String(filterOptions.value.organizationId));
  }
  if (filterOptions.value.businessId) {
    result = result.filter((uni) => String(uni.business_id) === String(filterOptions.value.businessId));
  }

  filteredBusinessUnits.value = result;
  console.log('Business units después de aplicar filtros:', filteredBusinessUnits.value);
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
