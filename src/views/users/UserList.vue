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
  isLoading: Boolean,
  totalItems: Number,
  page: Number,
  itemsPerPage: Number,
  isMobile: Boolean
});
const emit = defineEmits(['update:page']);

const isMobile = computed(() => props.isMobile ?? window.innerWidth < 1024);

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

const filteredItems = computed(() => {
  return (props.items || []).filter((u) => {
    const isUserSuperadmin = u.roles && u.roles.some((r) => r.name === 'superadmin');
    if (isUserSuperadmin) {
      return isSuperadmin.value;
    }
    return true;
  });
});

const canToggleStatus = (targetUser) => {
  if (!canEdit.value) return false;
  if (!targetUser || !targetUser.id) return false;
  if (targetUser.id === user.value.id) return false;
  const targetRoles = (targetUser.roles || []).map((r) => r.name);
  if (isSuperadmin.value) return true;
  if (isAdmin.value) {
    if (targetRoles.includes('superadmin')) return false;
    return true;
  }
  if (isSponsor.value) {
    if (targetRoles.includes('superadmin') || targetRoles.includes('admin')) return false;
    return true;
  }
  return false;
};

const canToggleStatusAny = computed(() => {
  return (isSuperadmin.value || isAdmin.value || isSponsor.value) && canEdit.value;
});

const sortBy = ref('id');
const sortDesc = ref(false);

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
    } else if (sortBy.value === 'profile_picture') {
      aVal = a.profile_picture || '';
      bVal = b.profile_picture || '';
    } else {
      aVal = a[sortBy.value]?.toString().toLowerCase() ?? '';
      bVal = b[sortBy.value]?.toString().toLowerCase() ?? '';
    }
    return aVal.localeCompare(bVal) * (sortDesc.value ? -1 : 1);
  });
});

// Proxy para mantener sincronía con el padre y evitar undefined/null
const pageProxy = computed({
  get: () => Number(props.page) || 1,
  set: (val) => emit('update:page', val)
});

const pageCount = computed(() => {
  const total = Number(props.totalItems || sortedItems.value.length || 0);
  const perPage = Number(props.itemsPerPage || 10);
  return Math.max(1, Math.ceil(total / perPage));
});

const goToEdit = (user) => router.push({ path: `/usuarios/editar/${user.id}` });
const goToShow = (user) => router.push({ path: `/usuarios/${user.id}` });

const loadingUserStatus = ref({});
const toggleStatus = async (targetUser) => {
  if (!canToggleStatus(targetUser)) return;
  loadingUserStatus.value[targetUser.id] = true;
  const isActive = targetUser.status === 'activa' || targetUser.status === 'active';
  const newStatus = isActive ? 'inactive' : 'active';
  try {
    const res = await axiosInstance.put(`/users/${targetUser.id}`, {
      status: newStatus
    });
    targetUser.status = res.data.status || newStatus;
  } catch (err) {
    alert('No se pudo cambiar el estatus');
  } finally {
    loadingUserStatus.value[targetUser.id] = false;
  }
};

function getBelongsTo(user) {
  if (user.business_unit) {
    return {
      text: `${user.business_unit.folio} - ${user.business_unit.name}`,
      url: `/business-units/${user.business_unit.id}`
    };
  }
  if (user.business) {
    return {
      text: `${user.business.folio} - ${user.business.name}`,
      url: `/business/${user.business.id}`
    };
  }
  if (user.organization) {
    return {
      text: `${user.organization.folio} - ${user.organization.legal_name}`,
      url: `/organizations/${user.organization.id}`
    };
  }
  return { text: 'Sin asignación', url: null };
}
</script>

<template>
  <div>
    <!-- Loading global -->
    <div v-if="isLoading" class="text-center py-8">
      <v-progress-circular indeterminate color="primary" size="64" />
      <p class="mt-4">Cargando usuarios...</p>
    </div>

    <template v-else>
      <div v-if="!sortedItems.length" class="text-center py-8">
        <v-icon size="64" color="grey lighten-1">mdi-domain-off</v-icon>
        <p class="mt-4 text-h6 text-grey-darken-1">No existen usuarios</p>
        <p class="text-body-2 text-grey">No se encontraron usuarios con los filtros aplicados</p>
      </div>

      <!-- MODO MÓVIL (iPad y abajo) -->
      <template v-else-if="isMobile">
        <v-card
          v-for="user in sortedItems"
          :key="user.id"
          class="mb-4 pa-3 elevation-1 rounded-lg row-clickable"
          @click="canView ? goToShow(user) : undefined"
          :style="{ cursor: canView ? 'pointer' : 'default' }"
        >
          <v-row no-gutters align="center" class="mb-1">
            <v-col cols="4" class="d-flex justify-center align-center">
              <img
                v-if="user.profile_picture"
                :src="user.profile_picture"
                alt="Foto"
                style="width: 56px; height: 56px; border-radius: 50%; object-fit: cover; border: 1px solid #eee"
              />
              <span v-else class="text-caption text-grey">Sin foto</span>
            </v-col>
            <v-col cols="8">
              <div class="d-flex align-center mb-1" style="justify-content: space-between">
                <div class="text-caption" style="margin-right: 8px">
                  <router-link :to="`/usuarios/${user.id}`" @click.stop style="text-decoration: underline; color: #1976d2">
                    {{ user.id }}
                  </router-link>
                </div>
                <StatusChip :status="user.status" />
              </div>
              <div class="font-weight-medium mb-1">{{ user.name }}</div>
              <div class="text-caption mb-1">
                <strong>Correo:</strong>
                {{ user.email }}
              </div>
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
              <div class="text-caption">
                <strong>Pertenece A:</strong>
                <template v-if="getBelongsTo(user).url">
                  <router-link :to="getBelongsTo(user).url" style="text-decoration: underline; color: #1976d2">
                    {{ getBelongsTo(user).text }}
                  </router-link>
                </template>
                <template v-else>
                  {{ getBelongsTo(user).text }}
                </template>
              </div>
            </v-col>
          </v-row>
          <div class="d-flex justify-end mt-2">
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
                <v-list-item
                  v-if="canEdit && canToggleStatusAny && canToggleStatus(user)"
                  :loading="loadingUserStatus[user.id]"
                  @click="toggleStatus(user)"
                >
                  <template #prepend>
                    <v-icon :icon="user.status === 'activa' || user.status === 'active' ? mdiCancel : mdiCheckCircle" size="18" />
                  </template>
                  <v-list-item-title>
                    {{ user.status === 'activa' || user.status === 'active' ? 'Desactivar' : 'Activar' }}
                  </v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </div>
        </v-card>

        <div class="d-flex flex-column align-center mt-4">
          <v-pagination
            v-model="pageProxy"
            :length="pageCount"
            :total-visible="1"
            color="primary"
            @update:modelValue="emit('update:page', $event)"
          />
        </div>
      </template>

      <!-- MODO DESKTOP -->
      <template v-else>
        <UserTableMeta
          :items="sortedItems"
          :totalItems="props.totalItems"
          :page="props.page"
          :itemsPerPage="props.itemsPerPage"
          :sortBy="sortBy"
          :sortDesc="sortDesc"
          @update:page="(val) => emit('update:page', val)"
          @sort="toggleSort"
        >
          <template #sort-icon="{ column }">
            <v-icon v-if="sortBy === column" size="16" class="ml-1">
              {{ sortDesc ? mdiChevronDown : mdiChevronUp }}
            </v-icon>
          </template>
          <template #rows>
            <template v-if="sortedItems.length">
              <tr
                v-for="user in sortedItems"
                :key="user.id"
                @click="canView ? goToShow(user) : undefined"
                :class="['row-clickable', { 'row-disabled': !canView }]"
                :style="{ cursor: canView ? 'pointer' : 'default' }"
              >
                <td class="id-cell">
                  <router-link
                    :to="`/usuarios/${user.id}`"
                    @click.stop
                    class="blue--text text--darken-2"
                    style="text-decoration: underline; color: #1976d2 !important"
                  >
                    {{ user.id }}
                  </router-link>
                </td>
                <td class="profile-picture-cell">
                  <img
                    v-if="user.profile_picture"
                    :src="user.profile_picture"
                    alt="Foto"
                    style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 1px solid #eee"
                  />
                  <span v-else class="text-caption text-grey">Sin foto</span>
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
                <td class="belongs-cell">
                  <template v-if="getBelongsTo(user).url">
                    <router-link
                      :to="getBelongsTo(user).url"
                      style="text-decoration: underline; color: #1976d2; white-space: normal; word-break: break-word"
                    >
                      {{ getBelongsTo(user).text }}
                    </router-link>
                  </template>
                  <template v-else>
                    {{ getBelongsTo(user).text }}
                  </template>
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
                      <v-list-item
                        v-if="canEdit && canToggleStatusAny && canToggleStatus(user)"
                        :loading="loadingUserStatus[user.id]"
                        @click="toggleStatus(user)"
                      >
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
