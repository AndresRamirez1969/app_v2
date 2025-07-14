<script setup>
import { ref, computed } from 'vue';
import { mdiEye } from '@mdi/js';
import EditBusiness from './components/EditBusiness.vue';
import { useAuthStore } from '@/stores/auth';
import { router } from '@/router';

const showEditDialog = ref(false);
const selectedBusId = ref(null);

const auth = useAuthStore();

const props = defineProps({
  businesses: Array,
  isLoading: Boolean
});

//Filtrar negocios para solo mostrar los que esten ligados al usuario
const filter = computed(() => {
  if (auth.user?.roles?.some((role) => role.name === 'superadmin')) {
    return props.businesses;
  }
  return props.businesses.filter((b) => b.organization_id === auth.user?.organization_id);
});

const headers = [
  { title: 'Folio', key: 'folio' },
  { title: 'Nombre Legal', key: 'legal_name' },
  { title: 'Alias', key: 'alias' },
  { title: 'Estado', key: 'status' },
  { title: 'Organizacion', key: 'organization.legal_name' },
  { title: 'Acciones', key: 'actions', sortable: false }
];
</script>

<template>
  <v-card>
    <v-data-table
      :headers="headers"
      :items="filter"
      class="elevation-1"
      item-value="id"
      density="comfortable"
      :loading="isLoading"
      loading-text="Cargando..."
    >
      <template #item.folio="{ item }">
        <span class="folio-link" @click="router.push({ name: 'BusinessDetail', params: { id: item.id } })">
          {{ item.folio }}
        </span>
      </template>
      <template #item.legal_name="{ item }">
        <div class="d-flex align-center gap-2">
          <v-avatar v-if="item.logo" size="30" class="me-2">
            <v-img :src="item.logo" alt="Logo" />
          </v-avatar>
          <span>{{ item.legal_name }}</span>
        </div>
      </template>
      <template #item.status="{ item }">
        <v-chip :color="item.status === 'active' ? 'green' : 'red'" variant="flat" text-color="white" class="mb-2" small="small">
          {{ item.status === 'active' ? 'Activa' : 'Inactiva' }}
        </v-chip>
      </template>
      <template #item.actions="{ item }">
        <v-btn icon @click="router.push({ name: 'BusinessDetail', params: { id: item.id } })">
          <v-icon :icon="mdiEye" />
        </v-btn>
      </template>
    </v-data-table>
  </v-card>

  <EditBusiness
    v-if="showEditDialog"
    v-model:dialog="showEditDialog"
    :business-id="selectedBusId"
    @update:dialog="editDialog = $event"
    @business-updated="fetchBusinesses"
  />
</template>

<style scoped>
.folio-link {
  color: #1976d2;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}
.folio-link:hover {
  text-decoration: underline;
  color: #125ea8;
}
</style>
