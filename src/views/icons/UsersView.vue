<script setup>
import { ref } from 'vue';
import { mdiPencil, mdiEye } from '@mdi/js';

const showEditDialog = ref(false);
const selectedUserId = ref(null);

const openEditDialog = (id) => {
  selectedUserId.value = id
  showEditDialog.value = true
}
defineProps({
    users: Array
});

const headers = [
  { title: 'ID', key: 'id'},
  { title: 'Nombre', key: 'name'},
  { title: 'Correo', key: 'email'},
  { title: 'Estado', key: 'status'},
  { title: 'Acciones', key: 'actions', sortable: false}
]

</script>

<template>
  <BaseBreadcrumb></BaseBreadcrumb>
      <v-card>
        <v-data-table
          :headers="headers"
          :items="users"
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
              {{  item.status === 'active' ? 'Activo' : 'Inactivo' }}
            </v-chip>
          </template>
          <template #item.actions="{ item }">
              <v-btn icon @click="openEditDialog(item.id)">
                <v-icon :icon="mdiPencil" />
              </v-btn>
            </template>
          </v-data-table>
        </v-card>

  <EditOrganization
    v-if="showEditDialog"
    v-model:dialog="showEditDialog"
    :users-id="selectedUserId"
    @update:dialog="editDialog = $event"
    @users-updated="fetchUsers"
  />
</template>