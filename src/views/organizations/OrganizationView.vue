<script setup>
import EditOrganization from './components/EditOrganization.vue';
import ViewOrganization from './components/ViewOrganization.vue';
import { ref } from 'vue';
import { mdiPencil, mdiEye } from '@mdi/js';

const showEditDialog = ref(false);
const showViewDrawer = ref(false);
const selectedOrgId = ref(null);

const openEditDialog = (id) => {
  selectedOrgId.value = id;
  showEditDialog.value = true;
};

const openViewDrawer = (id) => {
  selectedOrgId.value = id;
  showViewDrawer.value = true;
};
defineProps({
  organizations: Array,
  isLoading: Boolean
});

const headers = [
  { title: 'Nombre Legal', key: 'legal_name' },
  { title: 'Alias', key: 'alias' },
  { title: 'Folio', key: 'folio' },
  { title: 'Estado', key: 'status' },
  { title: 'Acciones', key: 'actions', sortable: false }
];
</script>

<template>
  <v-data-table
    :headers="headers"
    :items="organizations"
    class="elevation-1"
    item-value="id"
    density="comfortable"
    :loading="isLoading"
    loading-text="Cargando..."
    hide-default-footer
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
  </v-data-table>
  <EditOrganization
    v-if="showEditDialog"
    v-model:dialog="showEditDialog"
    :organization-id="selectedOrgId"
    @update:dialog="editDialog = $event"
    @organization-updated="fetchOrganizations"
  />
  <ViewOrganization v-if="showViewDrawer" v-model:modal="showViewDrawer" :organization-id="selectedOrgId" />
</template>
