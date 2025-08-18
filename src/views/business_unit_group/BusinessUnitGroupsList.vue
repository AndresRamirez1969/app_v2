<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import axiosInstance from '@/utils/axios';
import BusinessUnitGroupsTableMeta from './BusinessUnitGroupsTableMeta.vue';
import StatusChip from '@/components/status/StatusChip.vue';
import { mdiChevronUp, mdiChevronDown, mdiDotsHorizontal, mdiPencil, mdiEye, mdiCancel, mdiCheckCircle } from '@mdi/js';
import { useAuthStore } from '@/stores/auth';

const props = defineProps({
  items: Array,
  isMobile: Boolean,
  canEditPermission: Boolean,
  isLoading: Boolean
});

const router = useRouter();
const auth = useAuthStore();

const user = computed(() => auth.user || { roles: [], permissions: [], organization_id: null });
const roles = computed(() => user.value.roles || []);
const permissions = computed(() => user.value.permissions || []);
const isSuperadmin = computed(() => roles.value.includes('superadmin'));
const isAdmin = computed(() => roles.value.includes('admin'));

// Solo puede ver empresa si es superadmin, admin o tiene el permiso y la empresa pertenece a su organización
const canViewBusiness = (group) => {
  if (isSuperadmin.value || isAdmin.value) return true;
  if (permissions.value.includes('business.view')) {
    return group.business && group.business.organization_id === user.value.organization_id;
  }
  return false;
};

// Para mostrar la columna empresa solo si el usuario es superadmin, admin o tiene el permiso y hay al menos una empresa de su organización
const showBusiness = computed(() => {
  if (isSuperadmin.value || isAdmin.value) return true;
  if (permissions.value.includes('business.view')) {
    return props.items.some((group) => group.business && group.business.organization_id === user.value.organization_id);
  }
  return false;
});

const canToggleStatus = computed(() => isSuperadmin.value || isAdmin.value || roles.value.includes('sponsor'));
const canEdit = computed(() => permissions.value.includes('businessUnitGroup.update') || props.canEditPermission);
const canView = computed(() => permissions.value.includes('businessUnitGroup.view'));
const canShowDropdown = computed(() => canView.value || canEdit.value || canToggleStatus.value);

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

const getOrganization = (group) => {
  return group.organization ? { text: `${group.organization.folio} - ${group.organization.legal_name}`, id: group.organization.id } : null;
};

const getBusiness = (group) => {
  return group.business ? { text: `${group.business.folio} - ${group.business.legal_name}`, id: group.business.id } : null;
};

const sortedItems = computed(() => {
  return [...props.items].sort((a, b) => {
    let aVal, bVal;
    if (sortBy.value === 'business_units_count') {
      aVal = a.business_units_count ?? a.businessUnits?.length ?? 0;
      bVal = b.business_units_count ?? b.businessUnits?.length ?? 0;
      return (aVal - bVal) * (sortDesc.value ? -1 : 1);
    } else if (sortBy.value === 'organization') {
      aVal = getOrganization(a)?.text?.toLowerCase() ?? '';
      bVal = getOrganization(b)?.text?.toLowerCase() ?? '';
      return aVal.localeCompare(bVal) * (sortDesc.value ? -1 : 1);
    } else if (sortBy.value === 'business') {
      aVal = getBusiness(a)?.text?.toLowerCase() ?? '';
      bVal = getBusiness(b)?.text?.toLowerCase() ?? '';
      return aVal.localeCompare(bVal) * (sortDesc.value ? -1 : 1);
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

const goToEdit = (group) => router.push({ path: `/grupos-de-ubicaciones/editar/${group.id}` });
const goToShow = (group) => router.push({ path: `/grupos-de-ubicaciones/${group.id}` });

const toggleStatus = async (group) => {
  if (!canToggleStatus.value) return;
  const isActive = group.status === 'activa' || group.status === 'active';
  const newStatus = isActive ? 'inactive' : 'active';
  try {
    const res = await axiosInstance.put(`/business-unit-groups/${group.id}`, {
      status: newStatus
    });
    group.status = res.data.status || newStatus;
  } catch (err) {
    alert('No se pudo cambiar el estatus');
  }
};
</script>

<template>
  <div>
    <template v-if="isMobile">
      <div v-if="isLoading" class="text-center py-8">
        <v-progress-circular indeterminate color="primary" size="64" />
        <p class="mt-4">Cargando grupos...</p>
      </div>
      <div v-else-if="!paginatedItems.length" class="text-center py-8">
        <v-icon size="64" color="grey lighten-1">mdi-domain-off</v-icon>
        <p class="mt-4 text-h6 text-grey-darken-1">No existen grupos</p>
        <p class="text-body-2 text-grey">No se encontraron grupos con los filtros aplicados</p>
      </div>
      <v-card
        v-for="group in paginatedItems"
        :key="group.id"
        class="mb-4 pa-3 elevation-1 rounded-lg row-clickable"
        @click="canView ? goToShow(group) : undefined"
        :style="{ cursor: canView ? 'pointer' : 'default' }"
      >
        <div class="d-flex flex-column gap-2">
          <div class="d-flex align-center justify-space-between mb-1">
            <div class="text-caption" style="margin-right: 8px">
              <router-link v-if="canView" :to="`/grupos-de-ubicaciones/${group.id}`" @click.stop style="text-decoration: underline">
                {{ group.id }}
              </router-link>
              <span v-else>{{ group.id }}</span>
            </div>
            <StatusChip :status="group.status" />
          </div>
          <div class="font-weight-medium mb-1">{{ group.name }}</div>
          <div v-if="isSuperadmin" class="text-caption mb-1">
            <strong>Organización:</strong>
            <router-link
              v-if="getOrganization(group)"
              :to="`/organizaciones/${getOrganization(group).id}`"
              @click.stop
              style="text-decoration: underline"
            >
              {{ getOrganization(group).text }}
            </router-link>
            <span v-else>No disponible</span>
          </div>
          <div v-if="canViewBusiness(group)" class="text-caption mb-1">
            <strong>Empresa:</strong>
            <router-link
              v-if="getBusiness(group)"
              :to="`/empresas/${getBusiness(group).id}`"
              @click.stop
              style="text-decoration: underline"
            >
              {{ getBusiness(group).text }}
            </router-link>
            <span v-else>No disponible</span>
          </div>
          <div class="text-caption mb-1">
            <strong>Ubicaciones:</strong>
            {{ group.business_units_count ?? group.businessUnits?.length ?? 0 }}
          </div>
        </div>
      </v-card>
    </template>

    <template v-else>
      <div v-if="isLoading" class="text-center py-8">
        <v-progress-circular indeterminate color="primary" size="64" />
        <p class="mt-4">Cargando grupos...</p>
      </div>
      <template v-else-if="!paginatedItems.length">
        <div class="text-center py-8">
          <v-icon size="64" color="grey lighten-1">mdi-domain-off</v-icon>
          <p class="mt-4 text-h6 text-grey-darken-1">No existen grupos</p>
          <p class="text-body-2 text-grey">No se encontraron grupos con los filtros aplicados</p>
        </div>
      </template>
      <template v-else>
        <BusinessUnitGroupsTableMeta
          :items="sortedItems.value"
          :page="page"
          :itemsPerPage="itemsPerPage"
          :sortBy="sortBy"
          :sortDesc="sortDesc"
          :showOrganization="isSuperadmin"
          :showBusiness="showBusiness"
          @update:page="page = $event"
          @sort="toggleSort"
        >
          <template #sort-icon="{ column }">
            <v-icon v-if="sortBy === column" size="16" class="ml-1">
              {{ sortDesc ? mdiChevronDown : mdiChevronUp }}
            </v-icon>
          </template>
          <template #rows="{ showOrganization, showBusiness }">
            <tr
              v-for="group in paginatedItems"
              :key="group.id"
              @click="canView ? goToShow(group) : undefined"
              :class="['row-clickable', { 'row-disabled': !canView }]"
              :style="{ cursor: canView ? 'pointer' : 'default' }"
            >
              <td>
                <router-link v-if="canView" :to="`/grupos-de-ubicaciones/${group.id}`" @click.stop class="blue-link">
                  {{ group.id }}
                </router-link>
                <span v-else>{{ group.id }}</span>
              </td>
              <td>{{ group.name }}</td>
              <td v-if="showOrganization">
                <router-link
                  v-if="getOrganization(group)"
                  :to="`/organizaciones/${getOrganization(group).id}`"
                  @click.stop
                  class="blue-link"
                >
                  {{ getOrganization(group).text }}
                </router-link>
                <span v-else>No disponible</span>
              </td>
              <td v-if="showBusiness">
                <router-link v-if="getBusiness(group)" :to="`/empresas/${getBusiness(group).id}`" @click.stop class="blue-link">
                  {{ getBusiness(group).text }}
                </router-link>
                <span v-else>No disponible</span>
              </td>
              <td>{{ group.business_units_count ?? group.businessUnits?.length ?? 0 }}</td>
              <td>
                <StatusChip :status="group.status" />
              </td>
              <td class="actions-cell" @click.stop>
                <v-menu v-if="canShowDropdown" location="bottom end">
                  <template #activator="{ props }">
                    <v-btn v-bind="props" variant="text" class="pa-0" min-width="0" height="24">
                      <v-icon :icon="mdiDotsHorizontal" size="20" />
                    </v-btn>
                  </template>
                  <v-list class="custom-dropdown elevation-1 rounded-lg" style="min-width: 200px">
                    <v-list-item v-if="canView" @click="goToShow(group)">
                      <template #prepend>
                        <v-icon :icon="mdiEye" size="18" />
                      </template>
                      <v-list-item-title>Ver</v-list-item-title>
                    </v-list-item>
                    <v-divider class="my-1" v-if="canEdit && canView" />
                    <v-list-item v-if="canEdit" @click="goToEdit(group)">
                      <template #prepend>
                        <v-icon :icon="mdiPencil" size="18" />
                      </template>
                      <v-list-item-title>Editar</v-list-item-title>
                    </v-list-item>
                    <v-divider class="my-1" v-if="canToggleStatus" />
                    <v-list-item v-if="canToggleStatus" @click="toggleStatus(group)">
                      <template #prepend>
                        <v-icon :icon="group.status === 'activa' || group.status === 'active' ? mdiCancel : mdiCheckCircle" size="18" />
                      </template>
                      <v-list-item-title>
                        {{ group.status === 'activa' || group.status === 'active' ? 'Desactivar' : 'Activar' }}
                      </v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </td>
            </tr>
          </template>
        </BusinessUnitGroupsTableMeta>
      </template>
    </template>
  </div>
</template>

<style scoped src="@/styles/business_unit_group.css"></style>
