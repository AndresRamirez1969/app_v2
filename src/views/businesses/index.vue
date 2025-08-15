<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import { mdiPlus } from '@mdi/js';
import BusinessList from './BusinessList.vue';
import BusinessFilters from './BusinessFilters.vue';
import axios from '@/utils/axios';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const businesses = ref([]);
const filteredBusinesses = ref([]);
const { mdAndDown } = useDisplay();

const searchText = ref('');
const filterOptions = ref({});

const auth = useAuthStore();
const canView = ref(false);
const canCreate = ref(false);
const isLoading = ref(false);

// Nuevo: Computed para saber si el usuario tiene business.update
const canEditPermission = ref(false);

function hasPermission(permission) {
  return auth.user?.permissions?.includes(permission);
}

onMounted(async () => {
  // Permitir acceso al index solo a superadmin, admin o con business.viewAny
  if (auth.user?.roles?.includes('superadmin') || auth.user?.roles?.includes('admin') || hasPermission('business.viewAny')) {
    canView.value = true;
    canCreate.value = hasPermission('business.create');
    canEditPermission.value = hasPermission('business.update');
    try {
      isLoading.value = true;
      const { data } = await axios.get('/businesses');
      businesses.value = data.data;
      filteredBusinesses.value = data.data.slice(0, 10);
    } catch (error) {
      console.error('Error fetching businesses:', error);
    } finally {
      isLoading.value = false;
    }
  } else {
    canView.value = false;
    // Si solo tiene business.view y business_id, redirige al show
    if (hasPermission('business.view') && auth.user?.business_id) {
      router.replace(`/empresas/${auth.user.business_id}`);
    }
  }
});

const goToCreate = () => {
  router.push('/empresas/crear');
};

function handleSearch(text) {
  searchText.value = text;
  applyFilters();
}

async function handleFilter(filters) {
  filterOptions.value = filters;
  try {
    // Integración para filtrar por organizationId
    const params = { ...filters };
    if (filters.organizationId) {
      params.organization_id = filters.organizationId; // el backend espera organization_id
      delete params.organizationId;
    }
    const { data } = await axios.get('/businesses', { params });
    filteredBusinesses.value = data.data;
  } catch (error) {
    console.error('Error fetching filtered businesses:', error);
    filteredBusinesses.value = [];
  }
}

function applyFilters() {
  let result = businesses.value;

  if (searchText.value) {
    const q = searchText.value.toLowerCase();
    result = result.filter(
      (bus) =>
        (bus.legal_name && bus.legal_name.toLowerCase().includes(q)) ||
        (bus.alias && bus.alias.toLowerCase().includes(q)) ||
        (bus.folio && String(bus.folio).toLowerCase().includes(q)) ||
        (bus.address && Object.values(bus.address).join(' ').toLowerCase().includes(q))
    );
  }

  if (filterOptions.value.status) {
    result = result.filter((bus) => bus.status === filterOptions.value.status);
  }
  if (filterOptions.value.createdAt) {
    result = result.filter((bus) => bus.created_at && bus.created_at >= filterOptions.value.createdAt);
  }
  if (filterOptions.value.updatedAt) {
    result = result.filter((bus) => bus.updated_at && bus.updated_at >= filterOptions.value.updatedAt);
  }
  // Filtro por organization_id (si existe en filterOptions)
  if (filterOptions.value.organizationId) {
    result = result.filter((bus) => String(bus.organization_id) === String(filterOptions.value.organizationId));
  }

  filteredBusinesses.value = result;
}
</script>

<template>
  <div v-if="canView">
    <v-container fluid>
      <v-row class="align-center justify-space-between mb-4">
        <v-col cols="auto" class="d-flex align-center">
          <h3 class="font-weight-medium mb-0">Empresas</h3>
        </v-col>
        <v-col cols="auto" class="d-flex align-center justify-end" v-if="canCreate">
          <v-btn color="primary" class="text-white" elevation="1" @click="goToCreate">
            <template v-if="mdAndDown">
              <v-icon :icon="mdiPlus" start />
              <span>Agregar</span>
            </template>
            <template v-else>
              <v-icon :icon="mdiPlus" start />
              <span>Agregar Empresa</span>
            </template>
          </v-btn>
        </v-col>
      </v-row>

      <BusinessFilters @search="handleSearch" @filter="handleFilter" class="mb-4" />

      <v-row>
        <v-col>
          <!-- Pasa la prop canEditPermission a BusinessList -->
          <BusinessList :items="filteredBusinesses" :isMobile="mdAndDown" :can-edit-permission="canEditPermission" :isLoading="isLoading" />
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>
