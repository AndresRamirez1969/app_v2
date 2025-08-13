<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import RoleTableMeta from './RoleTableMeta.vue';
import { mdiChevronUp, mdiChevronDown, mdiDotsHorizontal, mdiPencil, mdiEye } from '@mdi/js';
import { useAuthStore } from '@/stores/auth';
import { permissionTranslations } from '@/utils/permissionTranslations';

// Traducción de nombres de roles especiales
const roleNameTranslations = {
  superadmin: 'Super Administrador',
  admin: 'Administrador',
  sponsor: 'Sponsor'
};

const props = defineProps({
  items: Array,
  isMobile: Boolean
});

const router = useRouter();
const auth = useAuthStore();

const user = computed(() => auth.user || { roles: [], permissions: [] });
const roles = computed(() => user.value.roles || []);
const permissions = computed(() => user.value.permissions || []);
const isSuperadmin = computed(() => roles.value.includes('superadmin'));
const isAdmin = computed(() => roles.value.includes('admin'));
const isSponsor = computed(() => roles.value.includes('sponsor'));
const canEdit = computed(() => permissions.value.includes('role.update'));
const canView = computed(() => permissions.value.includes('user.view'));
const canCreate = computed(() => permissions.value.includes('role.create'));
const canShowDropdown = computed(() => canView.value || canEdit.value);

const filteredItems = computed(() => {
  return (props.items || []).filter((r) => {
    if (r.name === 'superadmin') return isSuperadmin.value;
    if (r.name === 'admin') return isSuperadmin.value || isAdmin.value;
    if (r.name === 'sponsor') return isSuperadmin.value || isAdmin.value;
    return true;
  });
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
    if (sortBy.value === 'permissions') {
      aVal = a.permissions?.length || 0;
      bVal = b.permissions?.length || 0;
      return (aVal - bVal) * (sortDesc.value ? -1 : 1);
    } else if (sortBy.value === 'organization_id') {
      aVal = a.organization_id ?? '';
      bVal = b.organization_id ?? '';
      return aVal.toString().localeCompare(bVal.toString()) * (sortDesc.value ? -1 : 1);
    } else {
      aVal = a[sortBy.value]?.toString().toLowerCase() ?? '';
      bVal = b[sortBy.value]?.toString().toLowerCase() ?? '';
      return aVal.localeCompare(bVal) * (sortDesc.value ? -1 : 1);
    }
  });
});

const paginatedItems = computed(() => {
  const start = (page.value - 1) * itemsPerPage.value;
  return sortedItems.value.slice(start, start + itemsPerPage.value);
});

const goToEdit = (role) => router.push({ path: `/roles-dw/${role.id}/edit` });
const goToShow = (role) => router.push({ path: `/roles-dw/${role.id}` });

function getOrganizationLabel(role) {
  if (role.name === 'superadmin') return 'Único';
  if (['admin', 'sponsor'].includes(role.name)) return 'Global';
  return role.organization_id ?? 'N/A';
}

// Traduce el nombre del rol si es especial
function translateRoleName(name) {
  return roleNameTranslations[name] || name;
}

function translatePermission(name) {
  if (permissionTranslations[name]) return permissionTranslations[name];
  const action = name?.split('.')?.[1];
  return permissionTranslations[action] || action || name;
}
</script>

<template>
  <div>
    <div v-if="canCreate" class="mb-4 d-flex justify-end">
      <slot name="add-btn" />
    </div>

    <!-- Modo móvil (cards) -->
    <template v-if="isMobile">
      <template v-if="paginatedItems.length">
        <v-card
          v-for="role in paginatedItems"
          :key="role.id"
          class="mb-4 pa-3 elevation-1 rounded-lg row-clickable"
          @click="canView ? () => goToShow(role) : null"
          :style="{ cursor: canView ? 'pointer' : 'default' }"
        >
          <v-row no-gutters align="center" class="mb-1">
            <v-col cols="12">
              <div class="d-flex align-center mb-1" style="justify-content: space-between">
                <div class="text-caption" style="margin-right: 8px">
                  <router-link :to="`/roles-dw/${role.id}`" @click.stop style="text-decoration: underline; color: #1976d2 !important">
                    {{ role.id }}
                  </router-link>
                </div>
              </div>
              <div class="font-weight-medium mb-1">{{ translateRoleName(role.name) }}</div>
              <div class="text-caption"><strong>Organización:</strong> {{ getOrganizationLabel(role) }}</div>
              <div class="text-caption">
                <strong>Permisos:</strong>
                <template v-if="role.permissions && role.permissions.length">
                  <v-chip
                    v-for="(perm, idx) in role.permissions.slice(0, 10)"
                    :key="perm.id || perm.name"
                    class="ma-1"
                    size="small"
                    color="primary"
                    text-color="white"
                  >
                    {{ translatePermission(perm.name) }}
                  </v-chip>
                  <v-chip v-if="role.permissions.length > 10" class="ma-1" size="small" color="grey" text-color="white">
                    +{{ role.permissions.length - 10 }} más
                  </v-chip>
                </template>
                <span v-else>Sin permisos</span>
              </div>
            </v-col>
          </v-row>
        </v-card>
      </template>
      <template v-else>
        <v-card class="mb-4 pa-4 elevation-1 rounded-lg text-center">
          <div class="font-weight-bold mb-2" style="font-size: 1.5rem">No se encontraron roles</div>
        </v-card>
      </template>
    </template>

    <!-- Modo escritorio (tabla) -->
    <template v-if="!isMobile">
      <RoleTableMeta
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
              v-for="role in paginatedItems"
              :key="role.id"
              @click="canView ? goToShow(role) : null"
              :class="['row-clickable', { 'row-disabled': !canView }]"
              :style="{ cursor: canView ? 'pointer' : 'default' }"
            >
              <td class="id-cell">
                <router-link :to="`/roles-dw/${role.id}`" @click.stop style="text-decoration: underline; color: #1976d2 !important">
                  {{ role.id }}
                </router-link>
              </td>
              <td class="name-cell">{{ translateRoleName(role.name) }}</td>
              <td class="org-cell">{{ getOrganizationLabel(role) }}</td>
              <td class="permissions-cell">
                <template v-if="role.permissions && role.permissions.length">
                  <v-chip
                    v-for="(perm, idx) in role.permissions.slice(0, 10)"
                    :key="perm.id || perm.name"
                    class="ma-1"
                    size="small"
                    color="primary"
                    text-color="white"
                  >
                    {{ translatePermission(perm.name) }}
                  </v-chip>
                  <v-chip v-if="role.permissions.length > 10" class="ma-1" size="small" color="grey" text-color="white">
                    +{{ role.permissions.length - 10 }} más
                  </v-chip>
                </template>
                <span v-else>Sin permisos</span>
              </td>
              <td class="actions-cell" @click.stop>
                <v-menu v-if="canShowDropdown" location="bottom end">
                  <template #activator="{ props }">
                    <v-btn v-bind="props" variant="text" class="pa-0" min-width="0" height="24">
                      <v-icon :icon="mdiDotsHorizontal" size="20" />
                    </v-btn>
                  </template>
                  <v-list class="custom-dropdown elevation-1 rounded-lg" style="min-width: 200px">
                    <v-list-item v-if="canView" @click="goToShow(role)">
                      <template #prepend>
                        <v-icon :icon="mdiEye" size="18" />
                      </template>
                      <v-list-item-title>Ver</v-list-item-title>
                    </v-list-item>
                    <v-divider v-if="canEdit && canView" class="my-1" />
                    <v-list-item v-if="canEdit" @click="goToEdit(role)">
                      <template #prepend>
                        <v-icon :icon="mdiPencil" size="18" />
                      </template>
                      <v-list-item-title>Editar</v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </td>
            </tr>
          </template>
          <template v-else>
            <tr>
              <td :colspan="5" class="text-center py-8">
                <div class="font-weight-bold mb-2" style="font-size: 1.5rem">No se encontraron roles</div>
              </td>
            </tr>
          </template>
        </template>
      </RoleTableMeta>
    </template>
  </div>
</template>

<style scoped src="@/styles/roles.css"></style>
