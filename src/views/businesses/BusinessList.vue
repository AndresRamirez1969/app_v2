<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import axiosInstance from '@/utils/axios';
import BusinessTableMeta from './BusinessTableMeta.vue';
import StatusChip from '@/components/status/StatusChip.vue';
import { mdiChevronUp, mdiChevronDown, mdiDotsHorizontal, mdiPencil, mdiEye, mdiCancel, mdiCheckCircle } from '@mdi/js';
import { useAuthStore } from '@/stores/auth';

const props = defineProps({
  items: Array, // registros ya cargados (de la página o todos, según tu flujo)
  isMobile: Boolean,
  isLoading: Boolean,
  totalItems: Number // total real en BD/endpoint
});

const router = useRouter();
const auth = useAuthStore();

const user = computed(() => auth.user || { roles: [], permissions: [] });
const roles = computed(() => user.value.roles || []);
const permissions = computed(() => user.value.permissions || []);
const isSuperadmin = computed(() => roles.value.includes('superadmin'));
const isAdmin = computed(() => roles.value.includes('admin'));
const canToggleStatus = computed(() => isSuperadmin.value || isAdmin.value);
const canEdit = computed(() => permissions.value.includes('business.update'));
const canView = computed(() => permissions.value.includes('business.view'));

const canShowDropdown = computed(() => canView.value || canEdit.value || canToggleStatus.value);

const sortBy = ref('folio');
const sortDesc = ref(false);
const page = ref(1);
const itemsPerPage = ref(10);

/** páginas totales (>=1) usando el total real */
const pageCount = computed(() => {
  const total = Number(props.totalItems || 0);
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

const sortedItems = computed(() => {
  const list = Array.isArray(props.items) ? [...props.items] : [];
  const column = sortBy.value;
  const desc = sortDesc.value;

  return list.sort((a, b) => {
    let aVal, bVal;
    if (column === 'folio') {
      aVal = a.folio ?? '';
      bVal = b.folio ?? '';
    } else if (column === 'name' || column === 'legal_name') {
      aVal = a.name ?? '';
      bVal = b.name ?? '';
    } else if (column === 'alias') {
      aVal = a.alias ?? '';
      bVal = b.alias ?? '';
    } else if (column === 'address') {
      aVal = fullAddress(a.address);
      bVal = fullAddress(b.address);
    } else {
      aVal = a[column] ?? '';
      bVal = b[column] ?? '';
    }

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return desc ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
    }
    if (desc) return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
    return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
  });
});

const paginatedItems = computed(() => {
  const start = (page.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return sortedItems.value.slice(start, end);
});

const goToEdit = (bus) => router.push({ path: `/empresas/editar/${bus.id}` });
const goToShow = (bus) => router.push({ path: `/empresas/${bus.id}` });

const toggleStatus = async (bus) => {
  if (!canToggleStatus.value) return;
  const isActive = bus.status === 'activa' || bus.status === 'active';
  const newStatus = isActive ? 'inactive' : 'active';
  try {
    const res = await axiosInstance.put(`/businesses/${bus.id}`, { status: newStatus });
    // Opción B: el backend devuelve { business: { ... } }
    bus.status = res?.data?.business?.status ?? newStatus;
  } catch (err) {
    alert('No se pudo cambiar el estatus');
  }
};
</script>

<template>
  <div>
    <!-- Loading global -->
    <div v-if="isLoading" class="text-center py-8">
      <v-progress-circular indeterminate color="primary" size="64" />
      <p class="mt-4">Cargando empresas...</p>
    </div>

    <template v-else>
      <div v-if="!paginatedItems.length" class="text-center py-8">
        <v-icon size="64" color="grey lighten-1">mdi-domain-off</v-icon>
        <p class="mt-4 text-h6 text-grey-darken-1">No existen empresas</p>
        <p class="text-body-2 text-grey">No se encontraron empresas con los filtros aplicados</p>
      </div>

      <!-- MODO MÓVIL -->
      <template v-else-if="isMobile">
        <v-card
          v-for="bus in paginatedItems"
          :key="bus.id"
          class="mb-4 pa-3 elevation-1 rounded-lg row-clickable"
          @click="canView ? goToShow(bus) : undefined"
          :style="{ cursor: canView ? 'pointer' : 'default' }"
        >
          <v-row no-gutters align="center" class="mb-1">
            <v-col cols="3" class="d-flex justify-start align-center">
              <div class="logo-container-mobile">
                <v-avatar v-if="bus.logo" class="logo-avatar-mobile" color="grey lighten-2">
                  <img :src="bus.logo" alt="Logo" class="logo-img-cover" />
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
                  <router-link :to="`/empresas/${bus.id}`" @click.stop style="text-decoration: underline; color: #1976d2">
                    {{ bus.folio }}
                  </router-link>
                </div>
                <StatusChip :status="bus.status" />
              </div>
              <div class="font-weight-medium mb-1">{{ bus.name }}</div>
              <div class="text-caption mb-1">
                <strong>Alias:</strong>
                {{ bus.alias || 'Sin alias' }}
              </div>
              <div class="text-caption">
                <strong>Dirección:</strong>
                {{ truncate(fullAddress(bus.address), 45) }}
              </div>
            </v-col>
          </v-row>
        </v-card>

        <div class="d-flex flex-column align-center mt-4">
          <v-pagination v-model="page" :length="pageCount" :total-visible="1" color="primary" />
        </div>
      </template>

      <!-- MODO DESKTOP -->
      <template v-else>
        <BusinessTableMeta
          :items="paginatedItems"
          :totalItems="totalItems"
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
                v-for="bus in paginatedItems"
                :key="bus.id"
                @click="canView ? goToShow(bus) : undefined"
                :class="['row-clickable', { 'row-disabled': !canView }]"
                :style="{ cursor: canView ? 'pointer' : 'default' }"
              >
                <td class="folio-cell">
                  <router-link v-if="canView" :to="`/empresas/${bus.id}`" @click.stop style="text-decoration: underline">
                    {{ bus.folio }}
                  </router-link>
                  <span v-else>{{ bus.folio }}</span>
                </td>

                <td class="logo-cell">
                  <v-avatar v-if="bus.logo" size="48" class="logo-avatar">
                    <img :src="bus.logo" alt="Logo" class="logo-img-cover" />
                  </v-avatar>
                  <v-avatar v-else size="48" color="grey lighten-2" class="d-flex align-center justify-center">
                    <span style="font-size: 12px; color: #888">Sin logo</span>
                  </v-avatar>
                </td>

                <td class="legal-cell">{{ bus.name }}</td>
                <td class="alias-cell">{{ bus.alias || 'Sin alias' }}</td>
                <td class="address-cell">{{ truncate(fullAddress(bus.address), 45) }}</td>

                <td class="status-cell">
                  <StatusChip :status="bus.status" />
                </td>

                <td class="actions-cell" @click.stop>
                  <v-menu v-if="canShowDropdown" location="bottom end">
                    <template #activator="{ props }">
                      <v-btn v-bind="props" variant="text" class="pa-0" min-width="0" height="24">
                        <v-icon :icon="mdiDotsHorizontal" size="20" />
                      </v-btn>
                    </template>

                    <v-list class="custom-dropdown elevation-1 rounded-lg" style="min-width: 200px">
                      <v-list-item v-if="canView" @click="goToShow(bus)">
                        <template #prepend>
                          <v-icon :icon="mdiEye" size="18" />
                        </template>
                        <v-list-item-title>Ver</v-list-item-title>
                      </v-list-item>

                      <v-divider class="my-1" v-if="canEdit && canView" />

                      <v-list-item v-if="canEdit" @click="goToEdit(bus)">
                        <template #prepend>
                          <v-icon :icon="mdiPencil" size="18" />
                        </template>
                        <v-list-item-title>Editar</v-list-item-title>
                      </v-list-item>

                      <v-divider class="my-1" v-if="canToggleStatus" />

                      <v-list-item v-if="canToggleStatus" @click="toggleStatus(bus)">
                        <template #prepend>
                          <!-- FIX ternario -->
                          <v-icon :icon="bus.status === 'activa' || bus.status === 'active' ? mdiCancel : mdiCheckCircle" size="18" />
                        </template>
                        <v-list-item-title>
                          {{ bus.status === 'activa' || bus.status === 'active' ? 'Desactivar' : 'Activar' }}
                        </v-list-item-title>
                      </v-list-item>
                    </v-list>
                  </v-menu>
                </td>
              </tr>
            </template>
          </template>
        </BusinessTableMeta>
      </template>
    </template>
  </div>
</template>

<style scoped src="@/styles/business.css"></style>
