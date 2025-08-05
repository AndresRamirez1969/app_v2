<template>
  <div v-if="canView">
    <v-container fluid>
      <v-row class="align-center justify-space-between mb-4">
        <v-col cols="auto" class="d-flex align-center">
          <h3 class="font-weight-medium mb-0">Usuarios</h3>
        </v-col>
        <v-col cols="auto" class="d-flex align-center justify-end" v-if="canCreate && tab === 'users'">
          <v-btn color="primary" class="text-white" elevation="1" @click="showDialog = true">
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

      <!-- Tabs -->
      <v-row class="mb-4">
        <v-col cols="12">
          <v-tabs v-model="tab" background-color="primary" dark grow>
            <v-tab value="users">Usuarios</v-tab>
            <v-tab value="roles">Roles</v-tab>
          </v-tabs>
        </v-col>
      </v-row>

      <!-- Content based on selected tab -->
      <div v-if="tab === 'users'">
        <!-- Search and filters section -->
        <v-row class="mb-4">
          <v-col cols="12">
            <div class="d-flex align-center mb-6" style="gap: 16px">
              <!-- Search bar -->
              <v-text-field
                v-model="filters.search"
                placeholder="Buscar por nombre, correo o rol..."
                prepend-inner-icon="mdi-magnify"
                clearable
                class="flex-grow-1 search-bar"
                density="compact"
                variant="outlined"
                color="primary"
                hide-details
                style="min-width: 220px"
                @keyup.enter="fetchUsers"
                @click:clear="fetchUsers"
              />

              <!-- Filters button (placeholder for future filters) -->
              <div class="filter-btn-wrapper ml-2 flex-shrink-0" style="min-width: 44px; position: relative">
                <v-btn
                  :icon="mdAndDown"
                  variant="text"
                  class="filter-btn filter-btn-center"
                  style="border-radius: 8px; border: 1px solid #ccc; min-width: 44px; height: 44px; width: 100%"
                  color="#222"
                  disabled
                >
                  <template v-if="mdAndDown">
                    <v-icon>mdi-filter-variant</v-icon>
                  </template>
                  <template v-else>
                    <span class="filter-btn-content">
                      <v-icon class="mr-2">mdi-filter-variant</v-icon>
                      <span>Filtros</span>
                    </span>
                  </template>
                </v-btn>
              </div>
            </div>
          </v-col>
        </v-row>

        <!-- Users list -->
        <v-row>
          <v-col>
            <UsersView :users="users.data" :isLoading="isLoading" :isMobile="mdAndDown" />
          </v-col>
        </v-row>
      </div>

      <div v-else-if="tab === 'roles'">
        <v-row>
          <v-col>
            <CreateRole />
          </v-col>
        </v-row>
      </div>
    </v-container>
  </div>

  <!-- Create User Dialog -->
  <CreateUser v-model:dialog="showDialog" @userCreated="handleUserCreated" />
</template>

<script setup>
import { onMounted, ref, watch, computed } from 'vue';
import { useDisplay } from 'vuetify';
import UsersView from './UsersView.vue';
import CreateUser from './components/CreateUser.vue';
import CreateRole from './roles/ViewRole.vue';
import axiosInstance from '@/utils/axios';
import debounce from 'lodash/debounce';
import { mdiPlus } from '@mdi/js';
import { useAuthStore } from '@/stores/auth';

const { mdAndDown } = useDisplay();
const auth = useAuthStore();

const tab = ref('users');
const filters = ref({
  search: ''
});

const currentPage = ref(1);
const users = ref({ data: [], last_page: 1 });
const isLoading = ref(false);
const showDialog = ref(false);

// Permission checks
const canView = computed(() => {
  return (
    auth.user?.roles?.includes('superadmin') ||
    auth.user?.roles?.includes('admin') ||
    auth.user?.permissions?.includes('user.viewAny') ||
    auth.user?.permissions?.includes('user.view')
  );
});

const canCreate = computed(() => {
  return auth.user?.roles?.includes('superadmin') || auth.user?.roles?.includes('admin') || auth.user?.permissions?.includes('user.create');
});

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

<style scoped>
.search-bar {
  max-width: 400px;
}

.filter-btn-wrapper {
  position: relative;
}

.filter-btn-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.filter-btn-content {
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .search-bar {
    max-width: 100%;
  }
}
</style>
