<template>
  <v-container fluid class="pa-0">
    <v-row align="center" justify="space-between" class="ma-0 px-3 py-2">
      <v-tabs v-model="tab" background-color="primary" dark grow class="mb-4">
        <v-tab value="users">Usuarios</v-tab>
        <v-tab value="roles">Roles</v-tab>
      </v-tabs>
      <template v-if="tab === 'users'">
        <v-col cols="auto" class="pa-0 d-flex align-center">
          <h1 class="text-h4 text-md-h3 font-weight-bold ma-0">Usuarios</h1>
        </v-col>
        <v-col cols="12" md="12">
          <UiParentCard title="Gestionar Usuarios">
            <template #action>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="filters.search"
                  label="Buscar por Nombre o Correo"
                  clearable
                  variant="outlined"
                  hide-details
                  @keyup.enter="fetchUsers"
                  prepend-inner-icon="mdi-magnify"
                />
              </v-col>
              <v-btn color="primary" class="mt-4 px-2 py-1 text-sm" variant="flat" @click="showDialog = true">
                <v-icon start :icon="mdiPlus" /> Agregar<span class="d-none d-sm-inline">&nbsp;Usuario</span>
              </v-btn>
            </template>
            <UsersView :users="users.data" :isLoading="isLoading" />
            <v-pagination v-model="currentPage" :length="users.last_page" :total-visible="5" @input="fetchUsers" class="mt-6" />
          </UiParentCard>
        </v-col>
      </template>
      <template v-else-if="tab === 'roles'">
        <CreateRole />
      </template>
    </v-row>
  </v-container>
  <v-card>
    <v-card-text>
      <CreateUser v-model:dialog="showDialog" @userCreated="handleUserCreated" />
    </v-card-text>
  </v-card>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue';
import UsersView from './UsersView.vue';
import CreateUser from './components/CreateUser.vue';
import CreateRole from './roles/ViewRole.vue';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import axiosInstance from '@/utils/axios';
import debounce from 'lodash/debounce';
import { mdiPlus } from '@mdi/js';

const tab = ref('users');
const filters = ref({
  search: ''
});

const currentPage = ref(1);
const users = ref({ data: [], last_page: 1 });
const isLoading = ref(false);

const fetchUsers = async () => {
  isLoading.value = true;
  try {
    const res = await axiosInstance.get('/users', {
      params: {
        search: filters.value.search,
        page: currentPage.value
      }
    });
    users.value = res.data;
  } catch (err) {
    console.error('Failed to fetch users', err);
  } finally {
    isLoading.value = false;
  }
};

const debouncedFetch = debounce(fetchUsers, 400);

const handleUserCreated = () => {
  fetchUsers();
  showDialog.value = false;
};

const showDialog = ref(false);

onMounted(() => {
  fetchUsers();
});

watch(
  () => filters.value.search,
  () => {
    currentPage.value = 1;
    debouncedFetch();
  }
);
</script>
