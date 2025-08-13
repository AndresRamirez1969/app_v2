<script setup>
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import BusinessUnitGroupsTableMeta from './BusinessUnitGroupsTableMeta.vue';
import StatusChip from '@/components/status/StatusChip.vue';
import { mdiChevronUp, mdiChevronDown, mdiDotsHorizontal, mdiPencil, mdiEye, mdiCancel, mdiCheckCircle } from '@mdi/js';
import { useAuthStore } from '@/stores/auth';
import axiosInstance from '@/utils/axios';

const props = defineProps({
  items: Array,
  isMobile: Boolean,
  canEditPermission: Boolean,
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
const canToggleStatus = computed(() => isSuperadmin.value || isAdmin.value || isSponsor.value);
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

const sortedItems = computed(() => {
  return [...props.items].sort((a, b) => {
    let aVal, bVal;
    if (sortBy.value === 'businessUnits' || sortBy.value === 'business_units_count') {
      aVal = a.business_units_count ?? a.businessUnits?.length ?? 0;
      bVal = b.business_units_count ?? b.businessUnits?.length ?? 0;
      return (aVal - bVal) * (sortDesc.value ? -1 : 1);
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

watch(
  () => props.items,
  (newItems) => {
    console.log('BusinessUnitGroupsList.vue - items cargados:', newItems);
  },
  { immediate: true }
);

const goToEdit = (group) => router.push({ path: `/grupos-dw/${group.id}/edit` });
const goToShow = (group) => router.push({ path: `/grupos-dw/${group.id}` });

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
    <div v-if="isLoading" class="text-center py-8">
      <v-progress-circular indeterminate color="primary" size="64" />
      <p class="mt-4">Cargando grupos...</p>
    </div>
    <template v-else>
      <div v-if="!paginatedItems.length" class="text-center py-8">
        <v-icon size="64" color="grey lighten-1">mdi-domain-off</v-icon>
        <p class="mt-4 text-h6 text-grey-darken-1">No existen grupos</p>
        <p class="text-body-2 text-grey">No se encontraron grupos con los filtros aplicados</p>
      </div>
      <!-- Modo móvil (cards) -->
      <template v-else-if="isMobile">
        <v-card
          v-for="group in paginatedItems"
          :key="group.id"
          class="mb-4 pa-3 elevation-1 rounded-lg row-clickable"
          @click="canView ? goToShow(group) : undefined"
          :style="{ cursor: canView ? 'pointer' : 'default' }"
        >
          <v-row no-gutters align="center" class="mb-1">
            <v-col cols="10">
              <div class="d-flex align-center mb-1" style="justify-content: space-between">
                <div class="text-caption" style="margin-right: 8px">
                  <router-link v-if="canView" :to="`/grupos-dw/${group.id}`" @click.stop class="link-blue">
                    {{ group.id }}
                  </router-link>
                  <span v-else>{{ group.id }}</span>
                </div>
                <StatusChip :status="group.status" />
              </div>
              <div class="font-weight-medium mb-1">{{ group.name }}</div>
              <div class="text-caption">
                <strong>Ubicaciones:</strong>
                {{ group.business_units_count ?? group.businessUnits?.length ?? 0 }}
              </div>
            </v-col>
            <v-col cols="2" class="d-flex justify-end align-center">
              <v-menu v-if="canShowDropdown" location="bottom end">
                <template #activator="{ props }">
                  <v-btn v-bind="props" variant="text" class="pa-0" min-width="0" height="24">
                    <v-icon :icon="mdiDotsHorizontal" size="20" />
                  </v-btn>
                </template>
                <v-list class="custom-dropdown elevation-1 rounded-lg" style="min-width: 200px">
                  <template v-if="canView">
                    <v-list-item @click="goToShow(group)">
                      <template #prepend>
                        <v-icon :icon="mdiEye" size="18" />
                      </template>
                      <v-list-item-title>Ver</v-list-item-title>
                    </v-list-item>
                    <v-divider class="my-1" />
                  </template>
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
            </v-col>
          </v-row>
        </v-card>
      </template>

      <!-- Modo escritorio (tabla) -->
      <template v-if="!isMobile">
        <BusinessUnitGroupsTableMeta
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
                v-for="group in paginatedItems"
                :key="group.id"
                @click="canView ? goToShow(group) : undefined"
                :class="['row-clickable', { 'row-disabled': !canView }]"
                :style="{ cursor: canView ? 'pointer' : 'default' }"
              >
                <td>
                  <router-link v-if="canView" :to="`/grupos-dw/${group.id}`" @click.stop class="link-blue">
                    {{ group.id }}
                  </router-link>
                  <span v-else>{{ group.id }}</span>
                </td>
                <td>{{ group.name }}</td>
                <td>{{ group.business_units_count ?? group.businessUnits?.length ?? 0 }}</td>
                <td>
                  <StatusChip :status="group.status" />
                </td>
                <td @click.stop>
                  <v-menu v-if="canShowDropdown" location="bottom end">
                    <template #activator="{ props }">
                      <v-btn v-bind="props" variant="text" class="pa-0" min-width="0" height="24">
                        <v-icon :icon="mdiDotsHorizontal" size="20" />
                      </v-btn>
                    </template>
                    <v-list class="custom-dropdown elevation-1 rounded-lg" style="min-width: 200px">
                      <template v-if="canView">
                        <v-list-item @click="goToShow(group)">
                          <template #prepend>
                            <v-icon :icon="mdiEye" size="18" />
                          </template>
                          <v-list-item-title>Ver</v-list-item-title>
                        </v-list-item>
                        <v-divider class="my-1" />
                      </template>
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
          </template>
        </BusinessUnitGroupsTableMeta>
      </template>
    </template>
  </div>
</template>

<style scoped>
.row-clickable:hover {
  background: #f5f5f5;
  transition: background 0.2s;
}
.row-disabled {
  opacity: 0.6;
  pointer-events: none;
}
.link-blue {
  color: #1976d2 !important;
  text-decoration: underline;
  font-weight: 500;
}
</style>
