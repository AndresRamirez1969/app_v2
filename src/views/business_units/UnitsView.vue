<script setup>
import { ref } from 'vue';
import { mdiPencil, mdiEye } from '@mdi/js';
import CreateUnit from '../business_units/components/CreateUnit.vue';

const showEditDialog = ref(false);
const showViewDrawer = ref(false);
const selectedBusId = ref(null);
const selectedBus = ref(null);
const showCreateDialog = ref(false);

const openEditDialog = (id) => {
  selectedBusId.value = id;
  showEditDialog.value = true;
};

const openViewDrawer = (id) => {
  selectedBusId.value = id;
  showViewDrawer.value = true;
};

defineProps({
  units: Array,
  isLoading: Boolean
});

const headers = [
  { title: 'Nombre Legal', key: 'legal_name' },
  { title: 'Dirección', key: 'direccion' },
  { title: 'Estado', key: 'status' },
  { title: 'Negocio', key: 'business.legal_name' },
  { title: 'Acciones', key: 'actions', sortable: false }
];
</script>

<template>
  <BaseBreadcrumb></BaseBreadcrumb>
  <v-card>
    <v-data-table
      :headers="headers"
      :items="units"
      class="elevation-1"
      item-value="id"
      density="comfortable"
      :loading="isLoading"
      loading-text="Cargando..."
    >
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
