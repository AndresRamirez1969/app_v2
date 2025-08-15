<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import axiosInstance from '@/utils/axios';
import BusinessTableMeta from './BusinessTableMeta.vue';
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
// Ahora los roles son array de strings, no objetos
const roles = computed(() => user.value.roles || []);
const permissions = computed(() => user.value.permissions || []);
const isSuperadmin = computed(() => roles.value.includes('superadmin'));
const isAdmin = computed(() => roles.value.includes('admin'));
const canToggleStatus = computed(() => isSuperadmin.value || isAdmin.value);
const canEdit = computed(() => permissions.value.includes('business.update'));
const canView = computed(() => permissions.value.includes('business.view'));

// Mostrar menú solo si tiene al menos un permiso relevante
const canShowDropdown = computed(() => canView.value || canEdit.value || canToggleStatus.value);

const sortBy = ref('folio');
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

const truncate = (text, max = 60) => (!text ? '' : text.length > max ? text.slice(0, max) + '...' : text);

const sortedItems = computed(() => {
  return [...props.items].sort((a, b) => {
    const aVal = sortBy.value === 'address' ? fullAddress(a.address).toLowerCase() : (a[sortBy.value]?.toString().toLowerCase() ?? '');
    const bVal = sortBy.value === 'address' ? fullAddress(b.address).toLowerCase() : (b[sortBy.value]?.toString().toLowerCase() ?? '');
    return aVal.localeCompare(bVal) * (sortDesc.value ? -1 : 1);
  });
});

const paginatedItems = computed(() => {
  const start = (page.value - 1) * itemsPerPage.value;
  return sortedItems.value.slice(start, start + itemsPerPage.value);
});

const goToEdit = (bus) => router.push({ path: `/empresas/editar/${bus.id}` });
const goToShow = (bus) => router.push({ path: `/empresas/${bus.id}` });

const toggleStatus = async (bus) => {
  if (!canToggleStatus.value) return;
  const isActive = bus.status === 'activa' || bus.status === 'active';
  const newStatus = isActive ? 'inactive' : 'active';
  try {
    const res = await axiosInstance.put(`/businesses/${bus.id}`, {
      status: newStatus
    });
    bus.status = res.data.status || newStatus;
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
      <p class="mt-4">Cargando negocios...</p>
    </div>

    <!-- Contenido cuando no está cargando -->
    <template v-else>
      <!-- Mensaje cuando no hay empresas -->
      <div v-if="!paginatedItems.length" class="text-center py-8">
        <v-icon size="64" color="grey lighten-1">mdi-domain-off</v-icon>
        <p class="mt-4 text-h6 text-grey-darken-1">No existen empresas</p>
        <p class="text-body-2 text-grey">No se encontraron empresas con los filtros aplicados</p>
      </div>

      <!-- Modo móvil (solo cards) -->
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
                  <router-link v-if="canView" :to="`/empresas/${bus.id}`" @click.stop style="text-decoration: underline">
                    {{ bus.folio }}
                  </router-link>
                  <span v-else>{{ bus.folio }}</span>
                </div>
                <StatusChip :status="bus.status" />
              </div>
              <div class="font-weight-medium mb-1">{{ bus.legal_name }}</div>
              <div class="text-caption">
                <strong>Dirección:</strong>
                {{ truncate(fullAddress(bus.address), 60) }}
              </div>
            </v-col>
          </v-row>
        </v-card>
      </template>

      <!-- Modo escritorio (solo tabla) -->
      <template v-else>
        <BusinessTableMeta
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
                <td class="legal-cell">{{ bus.legal_name }}</td>
                <td class="address-cell">{{ truncate(fullAddress(bus.address), 60) }}</td>
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
<style scoped>
.row-clickable:hover {
  background: #f5f5f5;
  transition: background 0.2s;
}
.row-disabled {
  opacity: 0.6;
  pointer-events: none;
}
</style>
