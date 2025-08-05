<script setup>
import { ref, onMounted, computed } from 'vue';
import { useDisplay } from 'vuetify';
import axiosInstance from '@/utils/axios';
import ViewRoles from './CreateRole.vue';
import { mdiPlus, mdiChevronUp, mdiChevronDown } from '@mdi/js';
import { useAuthStore } from '@/stores/auth';

const { mdAndDown } = useDisplay();
const auth = useAuthStore();

const roles = ref([]);
const isLoading = ref(false);
const showDialog = ref(false);

// Sorting and pagination
const sortBy = ref('id');
const sortDesc = ref(false);
const page = ref(1);
const itemsPerPage = ref(10);

// Permission checks
const canView = computed(() => {
  return (
    auth.user?.roles?.includes('superadmin') ||
    auth.user?.roles?.includes('admin') ||
    auth.user?.permissions?.includes('role.viewAny') ||
    auth.user?.permissions?.includes('role.view')
  );
});

const canCreate = computed(() => {
  return auth.user?.roles?.includes('superadmin') || auth.user?.roles?.includes('admin') || auth.user?.permissions?.includes('role.create');
});

const fetchRoles = async () => {
  isLoading.value = true;
  try {
    const res = await axiosInstance.get('/roles');
    roles.value = res.data.data || res.data;
  } catch (err) {
    console.error('Error fetching roles:', err);
  } finally {
    isLoading.value = false;
  }
};

const toggleSort = (column) => {
  if (sortBy.value === column) {
    sortDesc.value = !sortDesc.value;
  } else {
    sortBy.value = column;
    sortDesc.value = false;
  }
};

const sortedItems = computed(() => {
  return [...roles.value].sort((a, b) => {
    const aVal = a[sortBy.value]?.toString().toLowerCase() ?? '';
    const bVal = b[sortBy.value]?.toString().toLowerCase() ?? '';
    return aVal.localeCompare(bVal) * (sortDesc.value ? -1 : 1);
  });
});

const paginatedItems = computed(() => {
  const start = (page.value - 1) * itemsPerPage.value;
  return sortedItems.value.slice(start, start + itemsPerPage.value);
});

const handleRoleCreated = () => {
  fetchRoles();
  showDialog.value = false;
};

onMounted(() => {
  fetchRoles();
});
</script>

<template>
  <div v-if="canView">
    <v-container fluid>
      <v-row class="align-center justify-space-between mb-4">
        <v-col cols="auto" class="d-flex align-center justify-end" v-if="canCreate">
          <v-btn color="primary" class="text-white" elevation="1" @click="showDialog = true">
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

      <!-- Roles list -->
      <v-row>
        <v-col>
          <v-card class="elevation-1">
            <v-card-text class="pa-0">
              <div v-if="isLoading" class="text-center py-8">
                <v-progress-circular indeterminate color="primary" size="64" />
                <p class="mt-4">Cargando roles...</p>
              </div>
              <div v-else>
                <v-table density="comfortable" class="fixed-table">
                  <thead>
                    <tr>
                      <th @click="toggleSort('id')" class="cursor-pointer">
                        ID
                        <v-icon v-if="sortBy === 'id'" size="16" class="ml-1">
                          {{ sortDesc ? mdiChevronDown : mdiChevronUp }}
                        </v-icon>
                      </th>
                      <th @click="toggleSort('name')" class="cursor-pointer">
                        Nombre del Rol
                        <v-icon v-if="sortBy === 'name'" size="16" class="ml-1">
                          {{ sortDesc ? mdiChevronDown : mdiChevronUp }}
                        </v-icon>
                      </th>
                      <th class="cursor-pointer">Permisos</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="role in paginatedItems" :key="role.id" class="row-clickable">
                      <td class="folio-cell">{{ role.id }}</td>
                      <td class="name-cell">
                        <div class="d-flex align-center">
                          <v-icon class="mr-2" color="primary" size="small">mdi-shield-account</v-icon>
                          <span class="font-weight-medium">{{ role.name }}</span>
                        </div>
                      </td>
                      <td class="permissions-cell">
                        <div class="d-flex flex-wrap gap-1">
                          <template v-if="role.permissions && role.permissions.length > 0">
                            <v-chip
                              v-for="permission in role.permissions.slice(0, 10)"
                              :key="permission"
                              color="primary"
                              variant="outlined"
                              size="small"
                              class="ma-1"
                            >
                              {{ permission.name }}
                            </v-chip>
                            <v-chip v-if="role.permissions.length > 10" color="grey" variant="outlined" size="small" class="ma-1">
                              +{{ role.permissions.length - 10 }} más
                            </v-chip>
                          </template>
                          <span v-else class="text-grey text-caption">Sin permisos</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </v-table>

                <!-- Paginación -->
                <div class="d-flex justify-center mt-4">
                  <v-pagination
                    v-model="page"
                    :length="Math.ceil(sortedItems.length / itemsPerPage)"
                    :total-visible="7"
                    @update:model-value="page = $event"
                  />
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>

  <!-- Create Role Dialog -->
  <ViewRoles v-model:dialog="showDialog" @roleCreated="handleRoleCreated" />
</template>

<style scoped>
@import '@/styles/users.css';

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

.cursor-pointer {
  cursor: pointer;
}

.cursor-pointer:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.custom-dropdown {
  background: white;
}

.permissions-cell {
  padding: 12px 16px;
  border-bottom: 1px solid #e0e0e0;
}

.gap-1 {
  gap: 4px;
}

@media (max-width: 768px) {
  .search-bar {
    max-width: 100%;
  }
}
</style>
