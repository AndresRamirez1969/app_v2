<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import axiosInstance from '@/utils/axios';
import UserTableMeta from './UserTableMeta.vue';
import StatusChip from '@/components/status/StatusChip.vue';
import { mdiChevronUp, mdiChevronDown, mdiDotsHorizontal, mdiPencil, mdiEye, mdiCancel, mdiCheckCircle } from '@mdi/js';
import { useAuthStore } from '@/stores/auth';

const props = defineProps({
  items: Array,
  isMobile: Boolean,
  isLoading: Boolean
});

const router = useRouter();
const auth = useAuthStore();

const user = computed(() => auth.user || { roles: [], permissions: [] });
const roles = computed(() => user.value.roles || []);
const permissions = computed(() => user.value.permissions || []);
const isSuperadmin = computed(() => roles.value.includes('superadmin'));
const isAdmin = computed(() => roles.value.includes('admin'));
const isSponsor = computed(() => roles.value.includes('sponsor'));
const canEdit = computed(() => permissions.value.includes('user.update'));
const canView = computed(() => permissions.value.includes('user.view'));
const canCreate = computed(() => permissions.value.includes('user.create'));
const canShowDropdown = computed(() => canView.value || canEdit.value || canToggleStatusAny.value);

// Filtro: solo superadmin puede ver registros de superadmin
const filteredItems = computed(() => {
  return (props.items || []).filter((u) => {
    const isUserSuperadmin = u.roles && u.roles.some((r) => r.name === 'superadmin');
    if (isUserSuperadmin) {
      // Solo el superadmin puede ver registros de superadmin
      return isSuperadmin.value;
    }
    return true;
  });
});

// Permite activar/desactivar usuarios según reglas de negocio
const canToggleStatus = (targetUser) => {
  if (!canEdit.value) return false;
  if (!targetUser || !targetUser.id) return false;
  // No puede desactivarse a sí mismo
  if (targetUser.id === user.value.id) return false;

  const targetRoles = (targetUser.roles || []).map((r) => r.name);

  // Superadmin puede activar/desactivar a cualquiera menos a sí mismo
  if (isSuperadmin.value) return true;

  // Admin puede activar/desactivar a cualquiera menos a sí mismo y superadmin
  if (isAdmin.value) {
    if (targetRoles.includes('superadmin')) return false;
    return true;
  }

  // Sponsor puede activar/desactivar a usuarios que no sean admin, superadmin, ni a sí mismo
  if (isSponsor.value) {
    if (targetRoles.includes('superadmin') || targetRoles.includes('admin')) return false;
    return true;
  }

  return false;
};

// Para mostrar el botón de activar/desactivar en el dropdown
const canToggleStatusAny = computed(() => {
  return (isSuperadmin.value || isAdmin.value || isSponsor.value) && canEdit.value;
});

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
  return [...filteredItems.value].sort((a, b) => {
    let aVal, bVal;
    if (sortBy.value === 'role') {
      aVal = (a.roles?.[0]?.name || '').toLowerCase();
      bVal = (b.roles?.[0]?.name || '').toLowerCase();
    } else if (sortBy.value === 'status') {
      aVal = (a.status || '').toLowerCase();
      bVal = (b.status || '').toLowerCase();
    } else {
      aVal = a[sortBy.value]?.toString().toLowerCase() ?? '';
      bVal = b[sortBy.value]?.toString().toLowerCase() ?? '';
    }
    return aVal.localeCompare(bVal) * (sortDesc.value ? -1 : 1);
  });
});

const paginatedItems = computed(() => {
  const start = (page.value - 1) * itemsPerPage.value;
  return sortedItems.value.slice(start, start + itemsPerPage.value);
});

const goToEdit = (user) => router.push({ path: `/usuarios-dw/${user.id}/edit` });
const goToShow = (user) => router.push({ path: `/usuarios-dw/${user.id}` });

const toggleStatus = async (targetUser) => {
  if (!canToggleStatus(targetUser)) return;
  const isActive = targetUser.status === 'activa' || targetUser.status === 'active';
  const newStatus = isActive ? 'inactive' : 'active';
  try {
    const res = await axiosInstance.put(`/users/${targetUser.id}/status`, {
      status: newStatus
    });
    targetUser.status = res.data.user.status || newStatus;
  } catch (err) {
    alert('No se pudo cambiar el estatus');
  }
};
</script>

<template>
  <div>
    <div v-if="isLoading" class="text-center py-8">
      <v-progress-circular indeterminate color="primary" size="64" />
      <p class="mt-4">Cargando usuarios...</p>
    </div>

    <template v-else>
      <div v-if="!paginatedItems.length" class="text-center py-8">
        <v-icon size="64" color="grey lighten-1">mdi-domain-off</v-icon>
        <p class="mt-4 text-h6 text-grey-darken-1">No existen usuarios</p>
        <p class="text-body-2 text-grey">No se encontraron usuarios con los filtros aplicados</p>
      </div>
      <div v-if="canCreate" class="mb-4 d-flex justify-end">
        <slot name="add-btn" />
      </div>

      <!-- Modo móvil (cards) -->
      <template v-else-if="isMobile">
        <v-card
          v-for="user in paginatedItems"
          :key="user.id"
          class="mb-4 pa-3 elevation-1 rounded-lg row-clickable"
          @click="canView ? goToShow(user) : undefined"
          :style="{ cursor: canView ? 'pointer' : 'default' }"
        >
          <v-row no-gutters align="center" class="mb-1">
            <v-col cols="12">
              <div class="d-flex align-center mb-1" style="justify-content: space-between">
                <div class="text-caption" style="margin-right: 8px">
                  <router-link
                    :to="`/usuarios-dw/${user.id}`"
                    @click.stop
                    class="blue--text text--darken-2"
                    style="text-decoration: underline; color: #1976d2 !important"
                  >
                    {{ user.id }}
                  </router-link>
                </div>
                <StatusChip :status="user.status" />
              </div>
              <div class="font-weight-medium mb-1">{{ user.name }}</div>
              <div class="text-caption"><strong>Email:</strong> {{ user.email }}</div>
              <div class="text-caption">
                <strong>Rol:</strong>
                <span v-if="user.roles && user.roles.length">
                  <span v-for="(role, idx) in user.roles" :key="role.id">
                    {{
                      role.name === 'superadmin'
                        ? 'Super Administrador'
                        : role.name === 'admin'
                          ? 'Administrador'
                          : role.name === 'sponsor'
                            ? 'Sponsor'
                            : role.name
                    }}<span v-if="idx < user.roles.length - 1">, </span>
                  </span>
                </span>
                <span v-else>Sin rol</span>
              </div>
            </v-col>
          </v-row>
        </v-card>
      </template>

      <!-- Modo escritorio (tabla) -->
      <template v-if="!isMobile">
        <UserTableMeta
          :items="sortedItems.value"
          :page="page"
          :itemsPerPage="itemsPerPage"
          :sortBy="sortBy"
          :sortDesc="sortDesc"
          @update:page="page = $event"
          @sort="toggleSort"
        >
          <template #sort-icon="{ column }">
            <v-icon v-if="sortBy === column" size="16" class="ml-1">
              {{ sortDesc ? mdiChevronDown : mdiChevronUp }}
            </v-icon>
          </template>
          <template #rows>
            <template v-if="paginatedItems.length">
              <tr
                v-for="user in paginatedItems"
                :key="user.id"
                @click="canView ? goToShow(user) : undefined"
                :class="['row-clickable', { 'row-disabled': !canView }]"
                :style="{ cursor: canView ? 'pointer' : 'default' }"
              >
                <td class="id-cell">
                  <router-link
                    :to="`/usuarios-dw/${user.id}`"
                    @click.stop
                    class="blue--text text--darken-2"
                    style="text-decoration: underline; color: #1976d2 !important"
                  >
                    {{ user.id }}
                  </router-link>
                </td>
                <td class="name-cell">{{ user.name }}</td>
                <td class="email-cell">{{ user.email }}</td>
                <td class="role-cell">
                  <span v-if="user.roles && user.roles.length">
                    <span v-for="(role, idx) in user.roles" :key="role.id">
                      {{
                        role.name === 'superadmin'
                          ? 'Super Administrador'
                          : role.name === 'admin'
                            ? 'Administrador'
                            : role.name === 'sponsor'
                              ? 'Sponsor'
                              : role.name
                      }}<span v-if="idx < user.roles.length - 1">, </span>
                    </span>
                  </span>
                  <span v-else>Sin rol</span>
                </td>
                <td class="status-cell">
                  <StatusChip :status="user.status" />
                </td>
                <td class="actions-cell" @click.stop>
                  <v-menu v-if="canShowDropdown" location="bottom end">
                    <template #activator="{ props }">
                      <v-btn v-bind="props" variant="text" class="pa-0" min-width="0" height="24">
                        <v-icon :icon="mdiDotsHorizontal" size="20" />
                      </v-btn>
                    </template>
                    <v-list class="custom-dropdown elevation-1 rounded-lg" style="min-width: 200px">
                      <v-list-item v-if="canView" @click="goToShow(user)">
                        <template #prepend>
                          <v-icon :icon="mdiEye" size="18" />
                        </template>
                        <v-list-item-title>Ver</v-list-item-title>
                      </v-list-item>
                      <v-divider class="my-1" v-if="canEdit && canView" />
                      <v-list-item v-if="canEdit" @click="goToEdit(user)">
                        <template #prepend>
                          <v-icon :icon="mdiPencil" size="18" />
                        </template>
                        <v-list-item-title>Editar</v-list-item-title>
                      </v-list-item>
                      <v-divider class="my-1" v-if="canEdit && canToggleStatusAny && canToggleStatus(user)" />
                      <v-list-item v-if="canEdit && canToggleStatusAny && canToggleStatus(user)" @click="toggleStatus(user)">
                        <template #prepend>
                          <v-icon :icon="user.status === 'activa' || user.status === 'active' ? mdiCancel : mdiCheckCircle" size="18" />
                        </template>
                        <v-list-item-title>
                          {{ user.status === 'activa' || user.status === 'active' ? 'Desactivar' : 'Activar' }}
                        </v-list-item-title>
                      </v-list-item>
                    </v-list>
                  </v-menu>
                </td>
              </tr>
            </template>
          </template>
        </UserTableMeta>
      </template>
    </template>
  </div>
</template>

<style scoped src="@/styles/users.css"></style>
