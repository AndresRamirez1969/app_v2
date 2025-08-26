<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import { mdiPlus } from '@mdi/js';
import OrganizationList from './OrganizationList.vue';
import OrganizationFilters from './OrganizationFilters.vue';
import axios from '@/utils/axios';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const organizations = ref([]);
const meta = ref({});
const { mdAndDown } = useDisplay();

const searchText = ref('');
const filterOptions = ref({});
const sortBy = ref('legal_name');
const sortDesc = ref(false);
const page = ref(1);
const itemsPerPage = ref(10);

const auth = useAuthStore();
const canView = ref(false);
const canCreate = ref(false);

function hasPermission(permission) {
  return Array.isArray(auth.user?.permissions) && auth.user.permissions.includes(permission);
}

async function fetchOrganizations() {
  if (!canView.value) return;
  try {
    const params = {
      search: searchText.value,
      status: filterOptions.value.status,
      // Mapeo correcto de los nombres para el backend
      created_at_start: filterOptions.value.created_at_start ?? filterOptions.value.createdAtStart,
      created_at_end: filterOptions.value.created_at_end ?? filterOptions.value.createdAtEnd,
      sort_by: sortBy.value,
      sort_desc: sortDesc.value,
      page: page.value,
      per_page: itemsPerPage.value
    };
    const { data } = await axios.get('/organizations', { params });
    organizations.value = data.data;
    meta.value = data.meta || {};
  } catch (error) {
    console.error('Error fetching organizations:', error);
    organizations.value = [];
  }
}

onMounted(async () => {
  if (!hasPermission('organization.viewAny')) {
    canView.value = false;
    return;
  }
  canView.value = true;
  canCreate.value = hasPermission('organization.create');
  await fetchOrganizations();
});

const goToCreate = () => {
  router.push('/organizaciones/crear');
};

function handleSearch(text) {
  searchText.value = text;
  page.value = 1;
  fetchOrganizations();
}

function handleFilter(filters) {
  // Aquí los nombres ya vienen correctos desde OrganizationFilters.vue
  filterOptions.value = filters;
  page.value = 1;
  fetchOrganizations();
}

// Recibe eventos de paginación y ordenamiento desde OrganizationList
function handlePageChange(newPage) {
  page.value = newPage;
  fetchOrganizations();
}
function handleSort({ sortBy: newSortBy, sortDesc: newSortDesc }) {
  sortBy.value = newSortBy;
  sortDesc.value = newSortDesc;
  fetchOrganizations();
}
</script>

<template>
  <div v-if="canView">
    <v-container fluid>
      <v-row class="align-center justify-space-between mb-4">
        <v-col cols="auto" class="d-flex align-center">
          <h3 class="font-weight-medium mb-0">Organizaciones</h3>
        </v-col>
        <v-col cols="auto" class="d-flex align-center justify-end" v-if="canCreate">
          <v-btn color="primary" class="text-white" elevation="1" @click="goToCreate">
            <template v-if="mdAndDown">
              <v-icon :icon="mdiPlus" start />
              <span>Agregar</span>
            </template>
            <template v-else>
              <v-icon :icon="mdiPlus" start />
              <span>Agregar Organización</span>
            </template>
          </v-btn>
        </v-col>
      </v-row>

      <OrganizationFilters @search="handleSearch" @filter="handleFilter" class="mb-4" />

      <v-row>
        <v-col>
          <OrganizationList
            :items="organizations"
            :isMobile="mdAndDown"
            :page="page"
            :itemsPerPage="itemsPerPage"
            :sortBy="sortBy"
            :sortDesc="sortDesc"
            :meta="meta"
            @update:page="handlePageChange"
            @sort="handleSort"
          />
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>
