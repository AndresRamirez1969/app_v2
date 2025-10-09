<script setup>
import { onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import { mdiPlus } from '@mdi/js';
import UserList from './UserList.vue';
import UserFilters from './UserFilters.vue';
import axios from '@/utils/axios';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const users = ref([]);
const { mdAndDown } = useDisplay();

const searchText = ref('');
const filterOptions = ref({});

const auth = useAuthStore();
const canView = ref(false);
const canCreate = ref(false);
const isLoading = ref(false);

const currentPage = ref(1);
const perPage = ref(20);
const total = ref(0);

function hasPermission(permission) {
  return Array.isArray(auth.user?.permissions) && auth.user.permissions.includes(permission);
}

async function fetchUsers() {
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
    total.value = data.meta.total;
  } catch (error) {
    console.error('Error fetching users:', error);
    users.value = [];
    total.value = 0;
  } finally {
    isLoading.value = false;
  }
}

onMounted(async () => {
  if (!hasPermission('user.viewAny')) {
    canView.value = false;
    router.replace('/403');
    return;
  }
  canView.value = true;
  canCreate.value = hasPermission('user.create');
  await fetchUsers();
});

watch([currentPage, searchText, filterOptions], fetchUsers);

const goToCreate = () => {
  router.push('/usuarios/crear');
};

function handleSearch(text) {
  searchText.value = text;
  currentPage.value = 1;
}

async function handleFilter(filters) {
  filterOptions.value = filters;
  currentPage.value = 1;
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
          <UserList
            :items="users"
            :isMobile="mdAndDown"
            :isLoading="isLoading"
            :totalItems="total"
            :page="currentPage"
            :itemsPerPage="perPage"
            @update:page="
              (val) => {
                currentPage.value = val;
              }
            "
          />
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>
