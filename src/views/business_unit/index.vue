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
const filteredBusinessUnits = ref([]);
const total = ref(0);
const page = ref(1);
const itemsPerPage = ref(10);
const sortBy = ref('folio');
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

const fetchBusinessUnits = async () => {
  try {
    isLoading.value = true;
    const params = {
      page: page.value,
      per_page: itemsPerPage.value,
      sort_by: sortBy.value,
      sort_desc: sortDesc.value,
      ...filterOptions.value
    };
    if (searchText.value) params.search = searchText.value;
    const { data } = await axios.get('/business-units', { params });
    filteredBusinessUnits.value = data.data ?? data.business_units ?? [];
    total.value = data.meta?.total ?? filteredBusinessUnits.value.length;
  } catch (error) {
    filteredBusinessUnits.value = [];
    total.value = 0;
    console.error('Error fetching business units:', error);
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  if (!hasPermission('businessUnit.viewAny') && !auth.user?.roles?.includes('superadmin') && !auth.user?.roles?.includes('admin')) {
    router.replace('/403');
    return;
  }
  canView.value = true;
  canCreate.value = hasPermission('businessUnit.create');
  canEditPermission.value = hasPermission('businessUnit.update');
  await fetchBusinessUnits();
});

const goToCreate = () => {
  router.push('/ubicaciones/crear');
};

async function handleSearch(text) {
  searchText.value = text;
  page.value = 1;
  await fetchBusinessUnits();
}

async function handleFilter(filters) {
  filterOptions.value = filters;
  page.value = 1;
  await fetchBusinessUnits();
}

async function handlePageChange(newPage) {
  page.value = newPage;
  await fetchBusinessUnits();
}

async function handleSort(column) {
  if (sortBy.value === column) {
    sortDesc.value = !sortDesc.value;
  } else {
    sortBy.value = column;
    sortDesc.value = false;
  }
  page.value = 1;
  await fetchBusinessUnits();
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
            :total="total"
            :page="page"
            :itemsPerPage="itemsPerPage"
            :sortBy="sortBy"
            :sortDesc="sortDesc"
            :isMobile="mdAndDown"
            :canEditPermission="canEditPermission"
            :isLoading="isLoading"
            @update:page="handlePageChange"
            @sort="handleSort"
          />
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<style scoped src="@/styles/business_unit.css"></style>
