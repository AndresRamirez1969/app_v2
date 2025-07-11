<script setup>
import { ref } from 'vue';
import { mdiPencil } from '@mdi/js';
import CreateUser from './components/CreateUser.vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const tab = ref(null);

const navigateTo = (routeName) => {
  router.push({ name: routeName });
};

const showEditDialog = ref(false);
const selectedUserId = ref(null);
const showDialog = ref(false);

const openEditDialog = (id) => {
  selectedUserId.value = id;
  showEditDialog.value = true;
};

const handleUserCreate = () => {
  showDialog.value = true;
};

defineProps({
  users: Array
});

const headers = [
  { title: 'ID', key: 'id' },
  { title: 'Nombre', key: 'name' },
  { title: 'Correo', key: 'email' },
  { title: 'Estado', key: 'status' },
  { title: 'Acciones', key: 'actions', sortable: false }
];
</script>

<template>
  <v-card>
    <v-tabs v-model="tab" background-color="primary" dark grow class="mb-4">
      <v-tab @click="navigateTo('Users')">Usuarios</v-tab>
      <v-tab @click="navigateTo('Roles')">Roles</v-tab>
    </v-tabs>
    <div class="d-flex justify-end mb-4">
      <v-btn color="primary" class="px-2 py-1 text-sm" variant="flat" @click="showDialog = true"> Agregar Usuario </v-btn>
    </div>
    <v-data-table :headers="headers" :items="users" class="elevation-1" item-value="id" density="comfortable">
      <template #item.status="{ item }">
        <v-chip :color="item.status === 'active' ? 'green' : 'red'" variant="flat" text-color="white" class="mb-2" small="small">
          {{ item.status === 'active' ? 'Activo' : 'Inactivo' }}
        </v-chip>
      </template>
      <template #item.actions="{ item }">
        <v-btn icon @click="openEditDialog(item.id)">
          <v-icon :icon="mdiPencil" />
        </v-btn>
      </template>
    </v-data-table>
  </v-card>

  <v-dialog v-model="showDialog" max_width="700px">
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between"
        >Crear Usuario
        <v-btn icon @click="showDialog = false">
          <v-icon :icon="mdiCancel" />
        </v-btn>
      </v-card-title>
      <v-card-text>
        <CreateUser @userCreated="handleUserCreate" />
      </v-card-text>
    </v-card>
  </v-dialog>
</template>
