<script setup>
import { ref } from 'vue';
import { mdiPencil } from '@mdi/js';
import { CHIPCOLOR } from '@/constants/constants';

const showEditDialog = ref(false);
const selectedUserId = ref(null);

const openEditDialog = (id) => {
  selectedUserId.value = id;
  showEditDialog.value = true;
};

defineProps({
  users: Array
});

const headers = [
  { title: 'ID', key: 'id' },
  { title: 'Nombre', key: 'name' },
  { title: 'Correo', key: 'email' },
  { title: 'Rol', key: 'role' },
  { title: 'Estado', key: 'status' },
  { title: 'Acciones', key: 'actions', sortable: false }
];
</script>

<template>
  <v-data-table :headers="headers" :items="users" class="elevation-1" item-value="id" density="comfortable" hide-default-footer>
    <template #item.role="{ item }">
      <span>
        {{ item.roles?.[0]?.name || '—' }}
      </span>
    </template>
    <template #item.status="{ item }">
      <v-chip :color="CHIPCOLOR(item.status)" text-color="white" class="status-chip" small="small">
        {{ item.status === 'active' ? 'Activo' : 'Inactivo' }}
      </v-chip>
    </template>
    <template #item.actions="{ item }">
      <v-btn icon @click="openEditDialog(item.id)">
        <v-icon :icon="mdiPencil" />
      </v-btn>
    </template>
  </v-data-table>
</template>
