<script setup>
import { ref } from 'vue';
import { mdiPencil, mdiEye, mdiPlus } from '@mdi/js';
import ViewBusiness from './components/ViewBusiness.vue';
import EditBusiness from './components/EditBusiness.vue';
import UnitsList from './components/UnitsList.vue';
import CreateUnit from '../business_units/components/CreateUnit.vue';

const showEditDialog = ref(false);
const showViewDrawer = ref(false);
const selectedBusId = ref(null);
const selectedBus = ref(null);
const showCreateDialog = ref(false);
const expandedPanel = ref([]);

const openEditDialog = (id) => {
  selectedBusId.value = id;
  showEditDialog.value = true;
};

const openViewDrawer = (id) => {
  selectedBusId.value = id;
  showViewDrawer.value = true;
};

const openCreateDialog = (business) => {
  selectedBus.value = business;
  showCreateDialog.value = true;
};
defineProps({
  businesses: Array,
  isLoading: Boolean
});

const headers = [
  { title: 'Nombre Legal', key: 'legal_name' },
  { title: 'Alias', key: 'alias' },
  { title: 'Estado', key: 'status' },
  { title: 'Organizacion', key: 'organization.legal_name' },
  { title: 'Acciones', key: 'actions', sortable: false },
  { title: 'Unidades', key: 'verUnidades', sortable: false }
];
</script>

<template>
  <BaseBreadcrumb></BaseBreadcrumb>
  <v-card>
    <v-data-table
      :headers="headers"
      :items="businesses"
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
      <template #item.actions="{ item }">
        <v-btn icon @click="openEditDialog(item.id)">
          <v-icon :icon="mdiPencil" />
        </v-btn>
        <v-btn icon @click="openViewDrawer(item.id)">
          <v-icon :icon="mdiEye" />
        </v-btn>
      </template>
      <template #item.verUnidades="{ item, index }">
        <div class="d-flex align-center justify-space-between w-100">
          <v-expansion-panels v-model="expandedPanel" multiple class="flex-grow-1 mr-2">
            <v-expansion-panel :value="index">
              <template #title> Ver </template>
              <v-expansion-panel-text>
                <UnitsList v-if="expandedPanel.includes(index)" :business="item" />
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
          <v-btn icon @click="openCreateDialog(item)">
            <v-icon :icon="mdiPlus" />
          </v-btn>
        </div>
      </template>
    </v-data-table>
  </v-card>

  <ViewBusiness v-if="showViewDrawer" v-model:modal="showViewDrawer" :business-id="selectedBusId" />
  <EditBusiness
    v-if="showEditDialog"
    v-model:dialog="showEditDialog"
    :business-id="selectedBusId"
    @update:dialog="editDialog = $event"
    @business-updated="fetchBusinesses"
  />
  <CreateUnit v-if="showCreateDialog" v-model:dialog="showCreateDialog" :business="selectedBus" />
</template>
