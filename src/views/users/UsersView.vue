<script setup>
import { ref, computed } from 'vue';
import axiosInstance from '@/utils/axios';
import { mdiChevronUp, mdiChevronDown, mdiDotsHorizontal, mdiPencil, mdiEye, mdiCancel, mdiCheckCircle } from '@mdi/js';
import { useAuthStore } from '@/stores/auth';
import { CHIPCOLOR } from '@/constants/constants';

const props = defineProps({
  users: {
    type: Array,
    default: () => []
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  isMobile: {
    type: Boolean,
    default: false
  }
});

const auth = useAuthStore();

const user = computed(() => auth.user || { roles: [], permissions: [] });
const roles = computed(() => user.value.roles || []);
const permissions = computed(() => user.value.permissions || []);
const isSuperadmin = computed(() => roles.value.includes('superadmin'));
const isAdmin = computed(() => roles.value.includes('admin'));
const canToggleStatus = computed(() => isSuperadmin.value || isAdmin.value);
const canEdit = computed(() => permissions.value.includes('user.update'));

const sortBy = ref('id');
const sortDesc = ref(false);
const page = ref(1);
const itemsPerPage = ref(10);

const toggleSort = (column) => {
  if (sortBy.value === column) {
    sortDesc.value = !sortDesc.value;
  } else {
    sortBy.value = column;
    sortDesc.value = false;
  }
};

const sortedItems = computed(() => {
  return [...props.users].sort((a, b) => {
    const aVal = a[sortBy.value]?.toString().toLowerCase() ?? '';
    const bVal = b[sortBy.value]?.toString().toLowerCase() ?? '';
    return aVal.localeCompare(bVal) * (sortDesc.value ? -1 : 1);
  });
});

const paginatedItems = computed(() => {
  const start = (page.value - 1) * itemsPerPage.value;
  return sortedItems.value.slice(start, start + itemsPerPage.value);
});

const goToEdit = (user) => {
  // Implement edit functionality
  console.log('Edit user:', user);
};

const goToShow = (user) => {
  // Implement view functionality
  console.log('View user:', user);
};

const toggleStatus = async (user) => {
  if (!canToggleStatus.value) return;
  const isActive = user.status === 'active';
  const newStatus = isActive ? 'inactive' : 'active';
  try {
    const res = await axiosInstance.put(`/users/${user.id}`, {
      status: newStatus
    });
    user.status = res.data.status || newStatus;
  } catch (err) {
    alert('No se pudo cambiar el estatus');
  }
};
</script>

<template>
  <div>
    <!-- Modo móvil (solo cards) -->
    <template v-if="isMobile">
      <template v-if="paginatedItems.length">
        <v-card
          v-for="user in paginatedItems"
          :key="user.id"
          class="mb-4 pa-3 elevation-1 rounded-lg row-clickable"
          @click="goToShow(user)"
          style="cursor: pointer"
        >
          <v-row no-gutters align="center" class="mb-1">
            <v-col cols="12">
              <div class="d-flex align-center mb-1" style="justify-content: space-between">
                <div class="text-caption" style="margin-right: 8px">ID: {{ user.id }}</div>
                <v-chip :color="CHIPCOLOR(user.status)" text-color="white" size="small">
                  {{ user.status === 'active' ? 'Activo' : 'Inactivo' }}
                </v-chip>
              </div>
              <div class="font-weight-medium mb-1">{{ user.name }}</div>
              <div class="text-caption">{{ user.email }}</div>
              <div class="text-caption"><strong>Rol:</strong> {{ user.roles?.[0]?.name || 'Sin rol' }}</div>
            </v-col>
          </v-row>
        </v-card>
      </template>
      <template v-else>
        <v-card class="mb-4 pa-4 elevation-1 rounded-lg text-center">
          <div class="font-weight-bold mb-2" style="font-size: 1.5rem">Cargando usuarios...</div>
        </v-card>
      </template>
    </template>

    <!-- Modo escritorio (solo tabla) -->
    <template v-if="!isMobile">
      <v-card class="elevation-1">
        <v-card-text class="pa-0">
          <div v-if="isLoading" class="text-center py-8">
            <v-progress-circular indeterminate color="primary" size="64" />
            <p class="mt-4">Cargando usuarios...</p>
          </div>

          <div v-else-if="!users || users.length === 0" class="text-center py-8">
            <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-account-group</v-icon>
            <h3 class="text-h6 text-grey-darken-1">No hay usuarios</h3>
            <p class="text-body-2 text-grey">No se encontraron usuarios con los filtros aplicados</p>
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
                    Nombre
                    <v-icon v-if="sortBy === 'name'" size="16" class="ml-1">
                      {{ sortDesc ? mdiChevronDown : mdiChevronUp }}
                    </v-icon>
                  </th>
                  <th @click="toggleSort('email')" class="cursor-pointer">
                    Correo
                    <v-icon v-if="sortBy === 'email'" size="16" class="ml-1">
                      {{ sortDesc ? mdiChevronDown : mdiChevronUp }}
                    </v-icon>
                  </th>
                  <th class="cursor-pointer">Rol</th>
                  <th @click="toggleSort('status')" class="cursor-pointer">
                    Estado
                    <v-icon v-if="sortBy === 'status'" size="16" class="ml-1">
                      {{ sortDesc ? mdiChevronDown : mdiChevronUp }}
                    </v-icon>
                  </th>
                  <th class="actions-header">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="user in paginatedItems" :key="user.id" @click="goToShow(user)" class="row-clickable" style="cursor: pointer">
                  <td class="folio-cell">{{ user.id }}</td>
                  <td class="name-cell">{{ user.name || '—' }}</td>
                  <td class="email-cell">{{ user.email || '—' }}</td>
                  <td class="role-cell">
                    <span class="text-body-2">
                      {{ user.roles?.[0]?.name || 'Sin rol' }}
                    </span>
                  </td>
                  <td class="status-cell">
                    <v-chip :color="CHIPCOLOR(user.status)" text-color="white" size="small" variant="flat">
                      {{ user.status === 'active' ? 'Activo' : 'Inactivo' }}
                    </v-chip>
                  </td>
                  <td class="actions-cell" @click.stop>
                    <v-menu location="bottom end">
                      <template #activator="{ props }">
                        <v-btn v-bind="props" variant="text" class="pa-0" min-width="0" height="24">
                          <v-icon :icon="mdiDotsHorizontal" size="20" />
                        </v-btn>
                      </template>
                      <v-list class="custom-dropdown elevation-1 rounded-lg" style="min-width: 200px">
                        <v-list-item @click="goToShow(user)">
                          <template #prepend>
                            <v-icon :icon="mdiEye" size="18" />
                          </template>
                          <v-list-item-title>Ver</v-list-item-title>
                        </v-list-item>
                        <v-list-item v-if="canEdit" @click="goToEdit(user)">
                          <template #prepend>
                            <v-icon :icon="mdiPencil" size="18" />
                          </template>
                          <v-list-item-title>Editar</v-list-item-title>
                        </v-list-item>
                        <v-divider v-if="canEdit" class="my-1" />
                        <v-list-item v-if="canToggleStatus" @click="toggleStatus(user)">
                          <template #prepend>
                            <v-icon
                              :icon="user.status === 'active' ? mdiCancel : mdiCheckCircle"
                              size="18"
                              :color="user.status === 'active' ? 'error' : 'success'"
                            />
                          </template>
                          <v-list-item-title>{{ user.status === 'active' ? 'Desactivar' : 'Activar' }}</v-list-item-title>
                        </v-list-item>
                      </v-list>
                    </v-menu>
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
    </template>
  </div>
</template>

<style scoped>
@import '@/styles/users.css';

.cursor-pointer {
  cursor: pointer;
}

.cursor-pointer:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.custom-dropdown {
  background: white;
}

.name-cell,
.email-cell,
.role-cell,
.status-cell {
  padding: 12px 16px;
  border-bottom: 1px solid #e0e0e0;
}
</style>
