<script setup>
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import axiosInstance from '@/utils/axios';
import BusinessUnitTableMeta from './BusinessUnitTableMeta.vue';
import StatusChip from '@/components/status/StatusChip.vue';
import { mdiChevronUp, mdiChevronDown, mdiDotsHorizontal, mdiPencil, mdiEye, mdiCancel, mdiCheckCircle } from '@mdi/js';
import { useAuthStore } from '@/stores/auth';

const props = defineProps({
  items: Array,
  total: Number,
  page: Number,
  itemsPerPage: Number,
  sortBy: String,
  sortDesc: Boolean,
  isMobile: Boolean,
  canEditPermission: Boolean,
  isLoading: Boolean
});

const emit = defineEmits(['update:page', 'sort']);

const router = useRouter();
const auth = useAuthStore();

const user = computed(() => auth.user || { roles: [], permissions: [] });
const roles = computed(() => user.value.roles || []);
const permissions = computed(() => user.value.permissions || []);
const isSuperadmin = computed(() => roles.value.includes('superadmin'));
const isAdmin = computed(() => roles.value.includes('admin'));
const isSponsor = computed(() => roles.value.includes('sponsor'));
const canToggleStatus = computed(() => isSuperadmin.value || isAdmin.value || isSponsor.value);
const canEdit = computed(() => permissions.value.includes('businessUnit.update') || props.canEditPermission);
const canView = computed(() => permissions.value.includes('businessUnit.view'));
const canShowDropdown = computed(() => canView.value || canEdit.value || canToggleStatus.value);

const showBusinessIdColumn = computed(() => isAdmin.value);

const sortBy = ref(props.sortBy || 'id');
const sortDesc = ref(props.sortDesc || false);
const page = ref(props.page || 1);
const itemsPerPage = ref(props.itemsPerPage || 10);

// --- COPIA LOCAL REACTIVA ---
const localItems = ref([]);
watch(
  () => props.items,
  (val) => {
    localItems.value = val ? val.map((item) => ({ ...item })) : [];
  },
  { immediate: true }
);

const pageCount = computed(() => {
  const total = Number(props.total || 0);
  const perPage = Number(itemsPerPage.value || 10);
  const len = Math.ceil(total / perPage);
  return Math.max(1, len || 1);
});

const toggleSort = (column) => {
  if (sortBy.value === column) {
    sortDesc.value = !sortDesc.value;
  } else {
    sortBy.value = column;
    sortDesc.value = false;
  }
  emit('sort', column);
};

const fullAddress = (address) => {
  if (!address) return 'No disponible';
  const parts = [
    address.street,
    address.outdoor_number,
    address.neighborhood,
    address.city,
    address.postal_code,
    address.state,
    address.country
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : 'No disponible';
};

const truncate = (text, max = 45) => (!text ? '' : text.length > max ? text.slice(0, max) + '...' : text);

const getBusinessUnitParent = (uni) => {
  if (uni.business_unit_parent && uni.business_unit_parent.folio && uni.business_unit_parent.name) {
    return `${uni.business_unit_parent.folio} - ${uni.business_unit_parent.name}`;
  }
  return 'No disponible';
};

// OJO: aquí mapeamos a nuevos objetos para agregar campos derivados
const sortedItems = computed(() => {
  const items = Array.isArray(localItems.value) ? localItems.value : [];
  return items.length
    ? items.map((item) => ({
        ...item,
        name: item.name,
        alias: item.alias,
        logo: item.logo_url ?? item.logo,
        businessUnitParent: getBusinessUnitParent(item)
      }))
    : [];
});

const paginatedItems = computed(() => {
  const start = (page.value - 1) * itemsPerPage.value;
  return sortedItems.value.slice(start, start + itemsPerPage.value);
});

const goToEdit = (uni) => router.push({ path: `/ubicaciones/editar/${uni.id}` });
const goToShow = (uni) => router.push({ path: `/ubicaciones/${uni.id}` });

// FIX: actualizar el origen (localItems) para que el mapeo refleje el cambio
const toggleStatus = async (uni) => {
  if (!canToggleStatus.value) return;
  const isActive = uni.status === 'activa' || uni.status === 'active';
  const newStatus = isActive ? 'inactive' : 'active';

  // Optimistic UI sobre el origen
  const idx = localItems.value.findIndex((it) => String(it.id) === String(uni.id));
  const prev = idx !== -1 ? localItems.value[idx].status : null;
  if (idx !== -1) localItems.value[idx].status = newStatus;

  try {
    const res = await axiosInstance.put(`/business-units/${uni.id}`, { status: newStatus });
    const confirmed = res?.data?.business_unit?.status ?? newStatus;

    // Asegura que el origen queda con el confirmado
    if (idx !== -1) localItems.value[idx].status = confirmed;

    // Por consistencia, también actualiza el objeto mapeado actual (no imprescindible)
    uni.status = confirmed;
  } catch (err) {
    // Rollback si falla
    if (idx !== -1 && prev !== null) localItems.value[idx].status = prev;
    alert('No se pudo cambiar el estatus');
  }
};

function handlePageChange(newPage) {
  page.value = newPage;
  emit('update:page', newPage);
}
</script>

<template>
  <div>
    <!-- MOBILE -->
    <template v-if="isMobile">
      <div v-if="isLoading" class="text-center py-8">
        <v-progress-circular indeterminate color="primary" size="64" />
        <p class="mt-4">Cargando ubicaciones...</p>
      </div>

      <div v-else-if="!paginatedItems.length" class="text-center py-8">
        <p class="mt-4 text-h6 text-grey-darken-1">No existen ubicaciones</p>
        <p class="text-body-2 text-grey">No se encontraron ubicaciones con los filtros aplicados</p>
      </div>

      <v-card
        v-for="uni in paginatedItems"
        :key="uni.id"
        class="mb-4 pa-3 elevation-1 rounded-lg row-clickable"
        @click="canView ? goToShow(uni) : undefined"
        :style="{ cursor: canView ? 'pointer' : 'default' }"
      >
        <v-row no-gutters align="center" class="mb-1">
          <v-col cols="3" class="d-flex justify-start align-center">
            <div class="logo-container-mobile">
              <v-avatar v-if="uni.logo" class="logo-avatar-mobile" color="grey lighten-2">
                <img :src="uni.logo" alt="Logo" class="logo-img-cover" />
              </v-avatar>
              <v-avatar v-else class="logo-avatar-mobile" color="grey lighten-2">
                <span style="font-size: 12px; color: #888">Sin logo</span>
              </v-avatar>
            </div>
          </v-col>
          <v-col cols="1" />
          <v-col cols="8">
            <div class="d-flex align-center mb-1" style="justify-content: space-between">
              <div class="text-caption" style="margin-right: 8px">
                <router-link v-if="canView" :to="`/ubicaciones/${uni.id}`" @click.stop class="blue-link" style="text-decoration: underline">
                  {{ uni.folio }}
                </router-link>
                <span v-else>{{ uni.folio }}</span>
              </div>
              <StatusChip :status="uni.status" />
            </div>
            <div class="font-weight-medium mb-1">{{ uni.name }}</div>
            <div class="text-caption mb-1">
              <strong>Alias:</strong>
              {{ truncate(uni.alias, 40) }}
            </div>
            <div class="text-caption mb-1">
              <strong>Dirección:</strong>
              {{ truncate(fullAddress(uni.address), 45) }}
            </div>
            <div v-if="showBusinessIdColumn" class="text-caption">
              <strong>Unidad de Negocio:</strong>
              {{ truncate(uni.businessUnitParent, 60) }}
            </div>
          </v-col>
        </v-row>
      </v-card>

      <div class="d-flex flex-column align-center mt-4">
        <v-pagination
          v-model="page"
          :length="pageCount"
          :total-visible="1"
          color="primary"
          @update:modelValue="handlePageChange"
          class="mobile-pagination"
        />
      </div>
    </template>

    <!-- DESKTOP -->
    <template v-else>
      <div v-if="isLoading" class="text-center py-8">
        <v-progress-circular indeterminate color="primary" size="64" />
        <p class="mt-4">Cargando ubicaciones...</p>
      </div>

      <template v-else-if="!paginatedItems.length">
        <div class="text-center py-8">
          <p class="mt-4 text-h6 text-grey-darken-1">No existen ubicaciones</p>
          <p class="text-body-2 text-grey">No se encontraron ubicaciones con los filtros aplicados</p>
        </div>
      </template>

      <template v-else>
        <BusinessUnitTableMeta
          :items="paginatedItems"
          :page="page"
          :itemsPerPage="itemsPerPage"
          :sortBy="sortBy"
          :sortDesc="sortDesc"
          :showBusinessIdColumn="showBusinessIdColumn"
          @update:page="handlePageChange"
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
                v-for="uni in paginatedItems"
                :key="uni.id"
                @click="canView ? goToShow(uni) : undefined"
                :class="['row-clickable', { 'row-disabled': !canView }]"
                :style="{ cursor: canView ? 'pointer' : 'default' }"
              >
                <td class="folio-cell">
                  <router-link
                    v-if="canView"
                    :to="`/ubicaciones/${uni.id}`"
                    @click.stop
                    class="blue-link"
                    style="text-decoration: underline"
                  >
                    {{ uni.folio }}
                  </router-link>
                  <span v-else>{{ uni.folio }}</span>
                </td>

                <td class="logo-cell">
                  <v-avatar v-if="uni.logo" size="48" class="logo-avatar">
                    <img :src="uni.logo" alt="Logo" class="logo-img-cover" />
                  </v-avatar>
                  <v-avatar v-else size="48" color="grey lighten-2" class="d-flex align-center justify-center">
                    <span style="font-size: 12px; color: #888">Sin logo</span>
                  </v-avatar>
                </td>

                <td class="legal-cell">{{ uni.name }}</td>
                <td class="alias-cell">{{ truncate(uni.alias, 40) }}</td>
                <td class="address-cell">{{ truncate(fullAddress(uni.address), 45) }}</td>

                <td v-if="showBusinessIdColumn" class="business-id-cell">
                  {{ truncate(uni.businessUnitParent, 60) }}
                </td>

                <td class="status-cell">
                  <StatusChip :status="uni.status" />
                </td>

                <td class="actions-cell" @click.stop>
                  <v-menu v-if="canShowDropdown" location="bottom end">
                    <template #activator="{ props }">
                      <v-btn v-bind="props" variant="text" class="pa-0" min-width="0" height="24">
                        <v-icon :icon="mdiDotsHorizontal" size="20" />
                      </v-btn>
                    </template>

                    <v-list class="custom-dropdown elevation-1 rounded-lg" style="min-width: 200px">
                      <v-list-item v-if="canView" @click="goToShow(uni)">
                        <template #prepend>
                          <v-icon :icon="mdiEye" size="18" />
                        </template>
                        <v-list-item-title>Ver</v-list-item-title>
                      </v-list-item>

                      <v-divider class="my-1" v-if="canEdit && canView" />

                      <v-list-item v-if="canEdit" @click="goToEdit(uni)">
                        <template #prepend>
                          <v-icon :icon="mdiPencil" size="18" />
                        </template>
                        <v-list-item-title>Editar</v-list-item-title>
                      </v-list-item>

                      <v-divider class="my-1" v-if="canToggleStatus" />

                      <v-list-item v-if="canToggleStatus" @click="toggleStatus(uni)">
                        <template #prepend>
                          <v-icon :icon="uni.status === 'activa' || uni.status === 'active' ? mdiCancel : mdiCheckCircle" size="18" />
                        </template>
                        <v-list-item-title>
                          {{ uni.status === 'activa' || uni.status === 'active' ? 'Desactivar' : 'Activar' }}
                        </v-list-item-title>
                      </v-list-item>
                    </v-list>
                  </v-menu>
                </td>
              </tr>
            </template>
          </template>
        </BusinessUnitTableMeta>
      </template>
    </template>
  </div>
</template>

<style scoped src="@/styles/business_unit.css"></style>
