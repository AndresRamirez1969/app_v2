<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import RoleTableMeta from './RoleTableMeta.vue';
import { mdiChevronUp, mdiChevronDown, mdiDotsHorizontal, mdiPencil, mdiEye } from '@mdi/js';
import { useAuthStore } from '@/stores/auth';
import { permissionTranslations } from '@/utils/permissionTranslations';

const roleNameTranslations = {
  superadmin: 'Super Administrador',
  admin: 'Administrador',
  sponsor: 'Sponsor'
};

const protectedRoles = ['superadmin', 'admin', 'sponsor'];

const props = defineProps({
  items: Array,
  isMobile: Boolean,
  isLoading: Boolean
});

const router = useRouter();
const auth = useAuthStore();

const user = computed(() => auth.user || { roles: [], permissions: [], organization_id: null });
const roles = computed(() => user.value.roles || []);
const permissions = computed(() => user.value.permissions || []);
const isSuperadmin = computed(() => roles.value.includes('superadmin'));
const canEdit = computed(() => permissions.value.includes('role.update'));
const canView = computed(() => permissions.value.includes('role.view'));
const canCreate = computed(() => permissions.value.includes('role.create'));
const canShowDropdown = computed(() => canView.value || canEdit.value);

function isProtectedRole(role) {
  return protectedRoles.includes(role.name?.toLowerCase());
}

// Filtra roles: superadmin ve todos, los demás solo los de su organización + protegidos
const filteredItems = computed(() => {
  if (isSuperadmin.value) return props.items || [];
  return (props.items || []).filter((r) => isProtectedRole(r) || r.organization_id === user.value.organization_id);
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

const goToEdit = (role) => router.push({ path: `/roles/editar/${role.id}` });
const goToShow = (role) => router.push({ path: `/roles/${role.id}` });

function getOrganizationLabel(role) {
  if (role.name === 'superadmin') return 'Único';
  if (['admin', 'sponsor'].includes(role.name)) return 'Global';
  return role.organization_id ?? 'N/A';
}

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
    <div v-if="isLoading" class="text-center py-8">
      <v-progress-circular indeterminate color="primary" size="64" />
      <p class="mt-4">Cargando roles...</p>
    </div>

    <template v-else>
      <div v-if="!paginatedItems.length" class="text-center py-8">
        <v-icon size="64" color="grey lighten-1">mdi-domain-off</v-icon>
        <p class="mt-4 text-h6 text-grey-darken-1">No existen roles</p>
        <p class="text-body-2 text-grey">No se encontraron roles con los filtros aplicados</p>
      </div>
      <div v-if="canCreate" class="mb-4 d-flex justify-end">
        <slot name="add-btn" />
      </div>

      <!-- Modo móvil (cards) -->
      <template v-else-if="isMobile">
        <v-card
          v-for="role in paginatedItems"
          :key="role.id"
          class="mb-4 pa-3 elevation-1 rounded-lg row-clickable"
          @click="canView ? () => goToShow(role) : undefined"
          :style="{ cursor: canView ? 'pointer' : 'default' }"
        >
          <v-row no-gutters align="center" class="mb-1">
            <v-col cols="12">
              <div class="d-flex align-center mb-1" style="justify-content: space-between">
                <div class="text-caption" style="margin-right: 8px">
                  <router-link :to="`/roles/${role.id}`" @click.stop style="text-decoration: underline; color: #1976d2 !important">
                  <router-link :to="`/roles/${role.id}`" @click.stop style="text-decoration: underline; color: #1976d2 !important">
                    {{ role.id }}
                  </router-link>
                </div>
              </div>
              <div class="font-weight-medium mb-1">{{ translateRoleName(role.name) }}</div>
              <!-- Solo superadmin ve la organización -->
              <div v-if="isSuperadmin" class="text-caption"><strong>Organización:</strong> {{ getOrganizationLabel(role) }}</div>
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
                    {{ perm.name }}
                  </v-chip>
                  <v-chip v-if="role.permissions.length > 10" class="ma-1" size="small" color="grey" text-color="white"> + más </v-chip>
                </template>
                <span v-else>Sin permisos</span>
              </div>
            </v-col>
          </v-row>
        </v-card>
      </template>

    <!-- Modo escritorio (tabla) -->
    <template v-if="!isMobile">
      <RoleTableMeta
        :items="sortedItems.value"
        :page="page"
        :itemsPerPage="itemsPerPage"
        :sortBy="sortBy"
        :sortDesc="sortDesc"
        :showOrganization="isSuperadmin.value"
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
              class="row-clickable"
              :style="{ cursor: canView ? 'pointer' : 'default' }"
            >
              <td class="id-cell">
                <router-link :to="`/roles/${role.id}`" @click.stop style="text-decoration: underline; color: #1976d2 !important">
                  {{ role.id }}
                </router-link>
              </td>
              <td class="name-cell">{{ translateRoleName(role.name) }}</td>
              <!-- Solo superadmin ve la columna organización -->
              <td v-if="isSuperadmin" class="org-cell">
                <template v-if="role.organization && (role.organization.folio || role.organization.legal_name || role.organization.name)">
                  <router-link
                    :to="`/organizaciones-dw/${role.organization.id}`"
                    @click.stop
                    style="text-decoration: underline; color: #1976d2 !important"
                  >
                    {{ role.organization.folio ?? role.organization.id }} - {{ role.organization.legal_name ?? role.organization.name }}
                  </router-link>
                </template>
                <template v-else>
                  {{ getOrganizationLabel(role) }}
                </template>
              </td>
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
                <v-menu v-if="canShowDropdown && (!isProtectedRole(role) || (isProtectedRole(role) && canView))" location="bottom end">
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
                    <v-divider v-if="canEdit && canView && !isProtectedRole(role)" class="my-1" />
                    <v-list-item v-if="canEdit && !isProtectedRole(role)" @click="goToEdit(role)">
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
              <td :colspan="isSuperadmin ? 5 : 4" class="text-center py-8">
                <div class="font-weight-bold mb-2" style="font-size: 1.5rem">No se encontraron roles</div>
              </td>
            </tr>
          </template>
        </RoleTableMeta>
      </template>
    </template>
  </div>
</template>

<style scoped src="@/styles/roles.css"></style>
