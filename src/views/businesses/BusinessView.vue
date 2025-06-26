<script setup>
import { ref } from 'vue';
import { mdiPencil, mdiEye } from '@mdi/js';
import ViewBusiness from './components/ViewBusiness.vue';
import EditBusiness from './components/EditBusiness.vue';

const showEditDialog = ref(false);
const showViewDrawer = ref(false);
const selectedBusId = ref(null);

const openEditDialog = (id) => {
  selectedBusId.value = id
  showEditDialog.value = true
}

const openViewDrawer = (id) => {
  selectedBusId.value = id
  showViewDrawer.value = true
}
defineProps({
    businesses: Array,
    isLoading: Boolean
});

const headers = [
  { title: 'Nombre Legal', key: 'legal_name'},
  { title: 'Alias', key: 'alias'},
  { title: 'Estado', key: 'status'},
  { title: 'Organizacion', key: 'organization.legal_name'},
  { title: 'Acciones', key: 'actions', sortable: false}
]

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
          <template #item.status="{item}">
            <v-chip
              :color="item.status === 'active' ? 'green' : 'red'"
              variant="flat" 
              text-color="white"
              class="mb-2"
              small="small"
            >
              {{  item.status === 'active' ? 'Activa' : 'Inactiva' }}
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
          </v-data-table>
        </v-card>

<ViewBusiness 
  v-if="showViewDrawer"
  v-model:modal="showViewDrawer"
  :business-id="selectedBusId"
/>
<EditBusiness
  v-if="showEditDialog"
  v-model:dialog="showEditDialog"
  :business-d="selectedBusId"
  @update:dialog="editDialog = $event"
  @business-updated="fetchBusinesses"
/>
</template>