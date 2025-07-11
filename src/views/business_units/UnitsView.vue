<script setup>
import { ref, computed } from 'vue';
import { mdiPencil, mdiEye } from '@mdi/js';
import CreateUnit from '../business_units/components/CreateUnit.vue';
import { useAuthStore } from '@/stores/auth';
import { router } from '@/router';

const showEditDialog = ref(false);
const showViewDrawer = ref(false);
const selectedBusId = ref(null);
const selectedBus = ref(null);
const showCreateDialog = ref(false);

const auth = useAuthStore();

const openEditDialog = (id) => {
  selectedBusId.value = id;
  showEditDialog.value = true;
};

const openViewDrawer = (id) => {
  selectedBusId.value = id;
  showViewDrawer.value = true;
};

const props = defineProps({
  units: Array,
  isLoading: Boolean
});

//Filtra unidades para solo mostrar las que pertenecen a la organizacion ligada al usuario
const filter = computed(() => {
  if (auth.user?.role === 'superadmin') {
    return props.units;
  }
  return props.units.filter((b) => b.organization_id === auth.user?.organization_id);
});

const headers = [
  { title: 'Folio', key: 'folio' },
  { title: 'Nombre Legal', key: 'legal_name' },
  { title: 'Dirección', key: 'direccion' },
  { title: 'Negocio', key: 'business.legal_name' },
  { title: 'Estado', key: 'status' },
  { title: 'Formularios', key: 'Forms' },
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
        <span class="folio-link" @click="router.push({ name: 'UnitDetail', params: { id: item.id } })">
          {{ item.folio }}
        </span>
      </template>
      <template #item.status="{ item }">
        <v-chip :color="item.status === 'active' ? 'green' : 'red'" variant="flat" text-color="white" class="mb-2" small="small">
          {{ item.status === 'active' ? 'Activa' : 'Inactiva' }}
        </v-chip>
      </template>
      <template #item.direccion="{ item }">
        {{ item.address.street }}, {{ item.address.neighborhood }}, {{ item.address.city }}, {{ item.address.state }}
      </template>
      <template #item.actions="{ item }">
        <v-btn icon @click="openEditDialog(item.id)">
          <v-icon :icon="mdiPencil" />
        </v-btn>
        <v-btn icon @click="openViewDrawer(item.id)">
          <v-icon :icon="mdiEye" />
        </v-btn>
      </template>
    </v-data-table>
  </v-card>
  <CreateUnit v-if="showCreateDialog" v-model:dialog="showCreateDialog" :business="selectedBus" />
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
