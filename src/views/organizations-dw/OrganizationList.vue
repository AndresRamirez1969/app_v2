<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import axiosInstance from '@/utils/axios';
import OrganizationTableMeta from './OrganizationTableMeta.vue';
import StatusChip from '@/components/status/StatusChip.vue';
import { mdiChevronUp, mdiChevronDown, mdiDotsHorizontal, mdiPencil, mdiEye, mdiCancel, mdiCheckCircle } from '@mdi/js';

const props = defineProps({
  items: Array,
  isMobile: Boolean
});

const router = useRouter();

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

const truncate = (text, max = 80) => (!text ? '' : text.length > max ? text.slice(0, max) + '...' : text);

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

const goToEdit = (org) => router.push({ path: `/organizaciones-dw/${org.id}/edit` });
const goToShow = (org) => router.push({ path: `/organizaciones-dw/${org.id}` });

const toggleStatus = async (org) => {
  const isActive = org.status === 'activa' || org.status === 'active';
  const newStatus = isActive ? 'inactive' : 'active';
  try {
    const res = await axiosInstance.put(`/organizations/${org.id}`, {
      status: newStatus
    });
    org.status = res.data.status || newStatus;
  } catch (err) {
    alert('No se pudo cambiar el estatus');
  }
};
</script>

<template>
  <div>
    <!-- Modo móvil (solo cards) -->
    <template v-if="isMobile">
      <template v-if="paginatedItems.length">
        <v-card
          v-for="org in paginatedItems"
          :key="org.id"
          class="mb-4 pa-3 elevation-1 rounded-lg row-clickable"
          @click="goToShow(org)"
          style="cursor: pointer"
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
                  <router-link :to="`/organizaciones-dw/${org.id}`" @click.stop style="text-decoration: underline">
                    {{ org.folio }}
                  </router-link>
                </div>
                <StatusChip :status="org.status" />
              </div>
              <div class="font-weight-medium mb-1">{{ org.legal_name }}</div>
              <div class="text-caption">
                <strong>Dirección:</strong>
                {{ truncate(fullAddress(org.address), 80) }}
              </div>
            </v-col>
          </v-row>
        </v-card>
      </template>
      <template v-else>
        <v-card class="mb-4 pa-4 elevation-1 rounded-lg text-center">
          <div class="font-weight-bold mb-2" style="font-size: 1.5rem">No se encontraron organizaciones</div>
        </v-card>
      </template>
    </template>

    <!-- Modo escritorio (solo tabla) -->
    <template v-if="!isMobile">
      <OrganizationTableMeta
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
            <tr v-for="org in paginatedItems" :key="org.id" @click="goToShow(org)" class="row-clickable" style="cursor: pointer">
              <td class="folio-cell">
                <router-link :to="`/organizaciones-dw/${org.id}`" @click.stop style="text-decoration: underline">
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
              <td class="address-cell">{{ truncate(fullAddress(org.address), 80) }}</td>
              <td class="status-cell">
                <StatusChip :status="org.status" />
              </td>
              <td class="actions-cell" @click.stop>
                <v-menu location="bottom end">
                  <template #activator="{ props }">
                    <v-btn v-bind="props" variant="text" class="pa-0" min-width="0" height="24">
                      <v-icon :icon="mdiDotsHorizontal" size="20" />
                    </v-btn>
                  </template>
                  <v-list class="custom-dropdown elevation-1 rounded-lg" style="min-width: 200px">
                    <v-list-item @click="goToShow(org)">
                      <template #prepend>
                        <v-icon :icon="mdiEye" size="18" />
                      </template>
                      <v-list-item-title>Ver</v-list-item-title>
                    </v-list-item>
                    <v-divider class="my-1" />
                    <v-list-item @click="goToEdit(org)">
                      <template #prepend>
                        <v-icon :icon="mdiPencil" size="18" />
                      </template>
                      <v-list-item-title>Editar</v-list-item-title>
                    </v-list-item>
                    <v-divider class="my-1" />
                    <v-list-item @click="toggleStatus(org)">
                      <template #prepend>
                        <v-icon :icon="org.status === 'activa' || org.status === 'active' ? mdiCancel : mdiCheckCircle" size="18" />
                      </template>
                      <v-list-item-title>
                        {{ org.status === 'activa' || org.status === 'active' ? 'Desactivar' : 'Activar' }}
                      </v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </td>
            </tr>
          </template>
          <template v-else>
            <tr>
              <td :colspan="6" class="text-center py-8">
                <div class="font-weight-bold mb-2" style="font-size: 1.5rem">No se encontraron organizaciones</div>
              </td>
            </tr>
          </template>
        </template>
      </OrganizationTableMeta>
    </template>
  </div>
</template>

<style scoped src="@/styles/organization.css"></style>
<style scoped>
.row-clickable:hover {
  background: #f5f5f5;
  transition: background 0.2s;
}
</style>
