<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import { mdiPlus } from '@mdi/js';
import UserList from './UserList.vue';
import UserFilters from './UserFilters.vue';
import axios from '@/utils/axios';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const users = ref([]);
const filteredUsers = ref([]);
const { mdAndDown } = useDisplay();

const searchText = ref('');
const filterOptions = ref({});

const auth = useAuthStore();
const canView = ref(false);
const canCreate = ref(false);
const isLoading = ref(false);

const currentPage = ref(1);
const totalPages = ref(1);
const perPage = ref(20);
const total = ref(0);

function hasPermission(permission) {
  return Array.isArray(auth.user?.permissions) && auth.user.permissions.includes(permission);
}

onMounted(async () => {
  if (!hasPermission('user.viewAny')) {
    canView.value = false;
    router.replace('/403');
    return;
  }
  canView.value = true;
  canCreate.value = hasPermission('user.create');
  try {
    isLoading.value = true;
    const { data } = await axios.get('/users', {
      params: {
        page: currentPage.value,
        per_page: perPage.value,
        search: searchText.value,
        ...filterOptions.value
      }
    });
    users.value = data.data;
    filteredUsers.value = data.data;
    totalPages.value = data.meta.total_pages;
    total.value = data.meta.total;
  } catch (error) {
    console.error('Error fetching users:', error);
  } finally {
    isLoading.value = false;
  }
});

const goToCreate = () => {
  router.push('/usuarios/crear');
};

function handleSearch(text) {
  searchText.value = text;
  applyFilters();
}

async function handleFilter(filters) {
  filterOptions.value = filters;
  try {
    const { data } = await axios.get('/users', { params: filters });
    filteredUsers.value = data.data;
  } catch (error) {
    console.error('Error fetching filtered users:', error);
    filteredUsers.value = [];
  }
}

function applyFilters() {
  let result = users.value;

  if (searchText.value) {
    const q = searchText.value.toLowerCase();
    result = result.filter(
      (user) =>
        (user.name && user.name.toLowerCase().includes(q)) ||
        (user.email && user.email.toLowerCase().includes(q)) ||
        (user.username && user.username.toLowerCase().includes(q)) ||
        (user.id && String(user.id).toLowerCase().includes(q)) ||
        // Búsqueda por rol (primer rol del usuario)
        (user.roles &&
          user.roles.length &&
          ((user.roles[0].name && user.roles[0].name.toLowerCase().includes(q)) ||
            (user.roles[0].description && user.roles[0].description.toLowerCase().includes(q))))
    );
  }

  if (filterOptions.value.status) {
    result = result.filter((user) => user.status === filterOptions.value.status);
  }
  if (filterOptions.value.organization_id) {
    result = result.filter((user) => user.organization_id == filterOptions.value.organization_id);
  }
  if (filterOptions.value.business_id) {
    result = result.filter((user) => user.business_id == filterOptions.value.business_id);
  }
  if (filterOptions.value.createdAtStart) {
    result = result.filter((user) => user.created_at && user.created_at >= filterOptions.value.createdAtStart);
  }
  if (filterOptions.value.createdAtEnd) {
    result = result.filter((user) => user.created_at && user.created_at <= filterOptions.value.createdAtEnd);
  }

  filteredUsers.value = result;
}
</script>

<template>
  <div v-if="canView">
    <v-container fluid>
      <v-row class="align-center justify-space-between mb-4">
        <v-col cols="auto" class="d-flex align-center">
          <h3 class="font-weight-medium mb-0">Usuarios</h3>
        </v-col>
        <v-col cols="auto" class="d-flex align-center justify-end" v-if="canCreate">
          <v-btn color="primary" class="text-white" elevation="1" @click="goToCreate">
            <template v-if="mdAndDown">
              <v-icon :icon="mdiPlus" start />
              <span>Agregar</span>
            </template>
            <template v-else>
              <v-icon :icon="mdiPlus" start />
              <span>Agregar Usuario</span>
            </template>
          </v-btn>
        </v-col>
      </v-row>

      <UserFilters @search="handleSearch" @filter="handleFilter" class="mb-4" />

      <v-row>
        <v-col>
          <UserList :items="filteredUsers" :isMobile="mdAndDown" :isLoading="isLoading" />
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>
