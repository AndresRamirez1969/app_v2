<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import { mdiPlus } from '@mdi/js';
import axios from '@/utils/axios';
import { useAuthStore } from '@/stores/auth';

import RoleList from './RoleList.vue';
import RoleFilters from './RoleFilters.vue';

const router = useRouter();
const roles = ref([]);
const filteredRoles = ref([]);
const { mdAndDown } = useDisplay();

const searchText = ref('');
const filterOptions = ref({});

const auth = useAuthStore();
const canView = ref(false);
const canCreate = ref(false);

function hasPermission(permission) {
  return Array.isArray(auth.user?.permissions) && auth.user.permissions.includes(permission);
}

onMounted(async () => {
  if (!hasPermission('role.viewAny')) {
    canView.value = false;
    return;
  }
  canView.value = true;
  canCreate.value = hasPermission('role.create');
  await fetchRoles();
});

const fetchRoles = async (params = {}) => {
  try {
    const { data } = await axios.get('/roles', { params });
    roles.value = data.data || [];
    filteredRoles.value = data.data || [];
  } catch (error) {
    console.error('Error fetching roles:', error);
    roles.value = [];
    filteredRoles.value = [];
  }
};

const goToCreate = () => {
  router.push('/roles/create');
};

function handleSearch(text) {
  searchText.value = text;
  applyFilters();
}

async function handleFilter(filters) {
  if (filters.organizationId) {
    filterOptions.value = { ...filters };
  } else {
    filterOptions.value = { ...filters, organizationId: undefined };
  }
  await applyFilters();
}

async function applyFilters() {
  const params = {
    ...filterOptions.value,
    search: searchText.value
  };
  await fetchRoles(params);
}
</script>

<template>
  <div v-if="canView">
    <v-container fluid>
      <v-row class="align-center justify-space-between mb-4">
        <v-col cols="auto" class="d-flex align-center">
          <h3 class="font-weight-medium mb-0">Roles</h3>
        </v-col>
        <v-col cols="auto" class="d-flex align-center justify-end" v-if="canCreate">
          <v-btn color="primary" class="text-white" elevation="1" @click="goToCreate">
            <template v-if="mdAndDown">
              <v-icon :icon="mdiPlus" start />
              <span>Agregar</span>
            </template>
            <template v-else>
              <v-icon :icon="mdiPlus" start />
              <span>Agregar Rol</span>
            </template>
          </v-btn>
        </v-col>
      </v-row>

      <RoleFilters @search="handleSearch" @filter="handleFilter" class="mb-4" />

      <v-row>
        <v-col>
          <RoleList :items="filteredRoles" :isMobile="mdAndDown" />
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>
