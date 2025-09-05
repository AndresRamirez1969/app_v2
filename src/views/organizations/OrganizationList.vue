<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import axiosInstance from '@/utils/axios';
import OrganizationTableMeta from './OrganizationTableMeta.vue';
import StatusChip from '@/components/status/StatusChip.vue';
import { mdiChevronUp, mdiChevronDown, mdiDotsHorizontal, mdiPencil, mdiEye, mdiCancel, mdiCheckCircle } from '@mdi/js';
import { useAuthStore } from '@/stores/auth';

const props = defineProps({
  items: Array,
  isMobile: Boolean,
  isLoading: Boolean,
  page: Number,
  itemsPerPage: Number,
  sortBy: String,
  sortDesc: Boolean,
  /** meta: se espera meta.total o meta.totalItems */
  meta: Object
});

const emit = defineEmits(['update:page', 'sort']);

const router = useRouter();
const auth = useAuthStore();

const user = computed(() => auth.user || { roles: [], permissions: [] });
const roles = computed(() => user.value.roles || []);
const permissions = computed(() => user.value.permissions || []);
const isSuperadmin = computed(() => roles.value.includes('superadmin'));
const canToggleStatus = computed(() => isSuperadmin.value);
const canEdit = computed(() => permissions.value.includes('organization.update'));
const canView = computed(() => permissions.value.includes('organization.view'));
const canShowDropdown = computed(() => canView.value || canEdit.value || canToggleStatus.value);

/** total real, compatible con diferentes backends */
const totalItems = computed(() => {
  const m = props.meta || {};
  return Number(m.total ?? m.totalItems ?? props.items?.length ?? 0);
});

/** páginas totales (>=1) con el total real */
const pageCount = computed(() => {
  const perPage = Number(props.itemsPerPage || 10);
  const len = Math.ceil(totalItems.value / perPage);
  return Math.max(1, len || 1);
});

const fullAddress = (address) => {
  if (!address) return 'No disponible';
  const parts = [
    address.street,
    address.outdoor_number,
    address.indoor_number,
    address.neighborhood,
    address.city,
    address.postal_code,
    address.state,
    address.country
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : 'No disponible';
};

const truncate = (text, max = 50) => (!text ? '' : text.length > max ? text.slice(0, max) + '...' : text);

const goToEdit = (org) => router.push({ path: `/organizaciones/editar/${org.id}` });
const goToShow = (org) => router.push({ path: `/organizaciones/${org.id}` });

const toggleStatus = async (org) => {
  if (!canToggleStatus.value) return;
  const isActive = org.status === 'active';
  const newStatus = isActive ? 'inactive' : 'active';
  try {
    const res = await axiosInstance.put(`/organizations/${org.id}`, { status: newStatus });
    org.status = res.data.status || newStatus;
  } catch (err) {
    alert('No se pudo cambiar el estatus');
  }
};

const handleSort = (column) => {
  emit('sort', {
    sortBy: column,
    sortDesc: props.sortBy === column ? !props.sortDesc : false
  });
};
</script>

<template>
  <div>
    <!-- Loading global -->
    <div v-if="isLoading" class="text-center py-8">
      <v-progress-circular indeterminate color="primary" size="64" />
      <p class="mt-4">Cargando organizaciones...</p>
    </div>

    <!-- Contenido cuando no está cargando -->
    <template v-else>
      <!-- Mensaje cuando no hay organizaciones -->
      <div v-if="!items.length" class="text-center py-8">
        <v-icon size="64" color="grey lighten-1">mdi-domain-off</v-icon>
        <p class="mt-4 text-h6 text-grey-darken-1">No existen organizaciones</p>
        <p class="text-body-2 text-grey">No se encontraron organizaciones con los filtros aplicados</p>
      </div>

      <!-- Modo móvil (solo cards) -->
      <template v-else-if="isMobile">
        <v-card
          v-for="org in items"
          :key="org.id"
          class="mb-4 pa-3 elevation-1 rounded-lg row-clickable"
          @click="canView ? goToShow(org) : undefined"
          :style="{ cursor: canView ? 'pointer' : 'default' }"
        >
          <v-row no-gutters align="center" class="mb-1">
            <v-col cols="3" class="d-flex justify-start align-center">
              <div class="logo-container-mobile">
                <v-avatar v-if="org.logo" class="logo-avatar-mobile" color="grey lighten-2">
                  <img :src="org.logo" alt="Logo" class="logo-img-cover" />
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
                  <router-link :to="`/organizaciones/${org.id}`" @click.stop style="text-decoration: underline; color: #1976d2 !important">
                    {{ org.folio }}
                  </router-link>
                </div>
                <StatusChip :status="org.status" />
              </div>
              <div class="font-weight-medium mb-1">{{ org.legal_name }}</div>
              <div class="text-caption mb-1">
                <strong>Alias:</strong>
                {{ org.alias || 'Sin alias' }}
              </div>
              <div class="text-caption">
                <strong>Dirección:</strong>
                {{ truncate(fullAddress(org.address), 50) }}
              </div>
            </v-col>
          </v-row>
        </v-card>

        <!-- Paginación MOBILE: SIEMPRE visible (chip centrado; flechas off si pageCount=1) -->
        <div class="d-flex flex-column align-center mt-4">
          <v-pagination
            :model-value="page"
            :length="pageCount"
            :total-visible="1"
            color="primary"
            @update:modelValue="emit('update:page', $event)"
            class="mobile-pagination"
          />
        </div>
      </template>

      <!-- Modo escritorio (tabla) -->
      <template v-else>
        <OrganizationTableMeta
          :items="items"
          :page="page"
          :itemsPerPage="itemsPerPage"
          :sortBy="sortBy"
          :sortDesc="sortDesc"
          :totalItems="totalItems"
          @update:page="emit('update:page', $event)"
          @sort="handleSort"
        >
          <template #sort-icon="{ column }">
            <v-icon v-if="sortBy === column" size="16" class="ml-1">
              {{ sortDesc ? mdiChevronDown : mdiChevronUp }}
            </v-icon>
          </template>

          <template #rows>
            <template v-if="items.length">
              <tr
                v-for="org in items"
                :key="org.id"
                @click="canView ? goToShow(org) : undefined"
                :class="['row-clickable', { 'row-disabled': !canView }]"
                :style="{ cursor: canView ? 'pointer' : 'default' }"
              >
                <td class="folio-cell">
                  <router-link :to="`/organizaciones/${org.id}`" @click.stop style="text-decoration: underline; color: #1976d2 !important">
                    {{ org.folio }}
                  </router-link>
                </td>

                <td class="logo-cell">
                  <v-avatar v-if="org.logo" size="48" class="logo-avatar">
                    <img :src="org.logo" alt="Logo" class="logo-img-cover" />
                  </v-avatar>
                  <v-avatar v-else size="48" color="grey lighten-2" class="d-flex align-center justify-center">
                    <span style="font-size: 12px; color: #888">Sin logo</span>
                  </v-avatar>
                </td>

                <td class="legal-cell">{{ org.legal_name }}</td>
                <td class="alias-cell">{{ org.alias || 'Sin alias' }}</td>
                <td class="address-cell">{{ truncate(fullAddress(org.address), 50) }}</td>

                <td class="status-cell">
                  <StatusChip :status="org.status" />
                </td>

                <td class="actions-cell" @click.stop>
                  <v-menu v-if="canShowDropdown" location="bottom end">
                    <template #activator="{ props }">
                      <v-btn v-bind="props" variant="text" class="pa-0" min-width="0" height="24">
                        <v-icon :icon="mdiDotsHorizontal" size="20" />
                      </v-btn>
                    </template>

                    <v-list class="custom-dropdown elevation-1 rounded-lg" style="min-width: 200px">
                      <v-list-item v-if="canView" @click="goToShow(org)">
                        <template #prepend>
                          <v-icon :icon="mdiEye" size="18" />
                        </template>
                        <v-list-item-title>Ver</v-list-item-title>
                      </v-list-item>

                      <v-divider class="my-1" v-if="canEdit && canView" />

                      <v-list-item v-if="canEdit" @click="goToEdit(org)">
                        <template #prepend>
                          <v-icon :icon="mdiPencil" size="18" />
                        </template>
                        <v-list-item-title>Editar</v-list-item-title>
                      </v-list-item>

                      <v-divider class="my-1" v-if="canToggleStatus" />

                      <v-list-item v-if="canToggleStatus" @click="toggleStatus(org)">
                        <template #prepend>
                          <v-icon :icon="org.status === 'active' ? mdiCancel : mdiCheckCircle" size="18" />
                        </template>
                        <v-list-item-title>
                          {{ org.status === 'active' ? 'Desactivar' : 'Activar' }}
                        </v-list-item-title>
                      </v-list-item>
                    </v-list>
                  </v-menu>
                </td>
              </tr>
            </template>
          </template>
        </OrganizationTableMeta>
      </template>
    </template>
  </div>
</template>

<style scoped src="@/styles/organization.css"></style>
