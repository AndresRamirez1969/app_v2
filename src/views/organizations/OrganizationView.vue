<script setup>
import EditOrganization from './components/EditOrganization.vue';
import { ref } from 'vue';
import { mdiPencil, mdiEye } from '@mdi/js';

const showEditDialog = ref(false);
const selectedOrgId = ref(null);

const openEditDialog = (id) => {
  selectedOrgId.value = id
  showEditDialog.value = true
}
defineProps({
    organizations: Array
});

const headers = [
  { title: 'Nombre Legal', key: 'legal_name'},
  { title: 'Alias', key: 'alias'},
  { title: 'Folio', key: 'folio'},
  { title: 'Estado', key: 'status'},
  { title: 'Acciones', key: 'actions', sortable: false}
]

</script>

<template>
  <BaseBreadcrumb></BaseBreadcrumb>
      <v-card>
        <v-data-table
          :headers="headers"
          :items="organizations"
          class="elevation-1"
          item-value="id"
          density="comfortable"
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
              <v-btn icon>
                <v-icon :icon="mdiEye" />
              </v-btn>
            </template>
          </v-data-table>
        </v-card>

  <EditOrganization
    v-if="showEditDialog"
    v-model:dialog="showEditDialog"
    :organization-id="selectedOrgId"
    @update:dialog="editDialog = $event"
    @organization-updated="fetchOrganizations"
  />
</template>