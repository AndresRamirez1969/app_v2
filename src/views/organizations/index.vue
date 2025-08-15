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
const filteredOrganizations = ref([]);
const { mdAndDown } = useDisplay();

const searchText = ref('');
const filterOptions = ref({});

const auth = useAuthStore();
const canView = ref(false);
const canCreate = ref(false);

// Adaptación: roles y permisos vienen en el objeto user, como arrays
function hasPermission(permission) {
  return Array.isArray(auth.user?.permissions) && auth.user.permissions.includes(permission);
}

onMounted(async () => {
  // Verifica permiso para ver organizaciones
  if (!hasPermission('organization.viewAny')) {
    canView.value = false;
    return;
  }
  canView.value = true;
  canCreate.value = hasPermission('organization.create');
  try {
    const { data } = await axios.get('/organizations');
    organizations.value = data.data;
    filteredOrganizations.value = data.data;
  } catch (error) {
    console.error('Error fetching organizations:', error);
  }
});

const goToCreate = () => {
  router.push('/organizaciones/crear');
};

function handleSearch(text) {
  searchText.value = text;
  applyFilters();
}

async function handleFilter(filters) {
  filterOptions.value = filters;
  try {
    const { data } = await axios.get('/organizations', { params: filters });
    filteredOrganizations.value = data.data;
  } catch (error) {
    console.error('Error fetching filtered organizations:', error);
    filteredOrganizations.value = [];
  }
}

function applyFilters() {
  let result = organizations.value;

  if (searchText.value) {
    const q = searchText.value.toLowerCase();
    result = result.filter(
      (org) =>
        (org.legal_name && org.legal_name.toLowerCase().includes(q)) ||
        (org.alias && org.alias.toLowerCase().includes(q)) ||
        (org.folio && String(org.folio).toLowerCase().includes(q)) ||
        (org.address && Object.values(org.address).join(' ').toLowerCase().includes(q))
    );
  }

  if (filterOptions.value.status) {
    result = result.filter((org) => org.status === filterOptions.value.status);
  }
  if (filterOptions.value.createdAt) {
    result = result.filter((org) => org.created_at && org.created_at >= filterOptions.value.createdAt);
  }
  if (filterOptions.value.updatedAt) {
    result = result.filter((org) => org.updated_at && org.updated_at >= filterOptions.value.updatedAt);
  }

  filteredOrganizations.value = result;
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
          <OrganizationList :items="filteredOrganizations" :isMobile="mdAndDown" />
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>
