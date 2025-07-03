<script setup>
import { ref, computed } from 'vue';
import { mdiPencil, mdiEye, mdiPlus } from '@mdi/js';
import ViewBusiness from './components/ViewBusiness.vue';
import EditBusiness from './components/EditBusiness.vue';
import UnitsList from './components/UnitsList.vue';
import CreateUnit from '../business_units/components/CreateUnit.vue';
import { useAuthStore } from '@/stores/auth';

const showEditDialog = ref(false);
const showViewDrawer = ref(false);
const selectedBusId = ref(null);
const selectedBus = ref(null);
const showCreateDialog = ref(false);
const expandedPanel = ref([]);

const auth = useAuthStore();

const openEditDialog = (id) => {
  selectedBusId.value = id;
  showEditDialog.value = true;
};

const openViewDrawer = (id) => {
  selectedBusId.value = id;
  showViewDrawer.value = true;
};

const openCreateDialog = (business) => {
  console.log('Opening unit dialog with business:', business);
  selectedBus.value = business;
  showCreateDialog.value = true;
};
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
  { title: 'Nombre Legal', key: 'legal_name' },
  { title: 'Alias', key: 'alias' },
  { title: 'Estado', key: 'status' },
  { title: 'Organizacion', key: 'organization.legal_name' },
  { title: 'Acciones', key: 'actions', sortable: false },
  { title: 'Unidades', key: 'verUnidades', sortable: false }
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
  <CreateUnit v-if="showCreateDialog && selectedBus" v-model:dialog="showCreateDialog" :business="selectedBus" />
</template>
