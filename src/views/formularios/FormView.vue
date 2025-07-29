<script setup>
import { mdiEye, mdiDotsVertical, mdiPublish, mdiArchive } from '@mdi/js';
import { useAuthStore } from '@/stores/auth';
import { router } from '@/router';
import { useToast } from 'vue-toastification';
import axiosInstance from '@/utils/axios';

const toast = useToast();
const auth = useAuthStore();

const props = defineProps({
  forms: Array,
  isLoading: Boolean
});

const emit = defineEmits(['formUpdated']);

const headers = [
  { title: 'Folio', key: 'folio' },
  { title: 'Nombre', key: 'name' },
  { title: 'Estado', key: 'status' },
  { title: 'Fecha de creación', key: 'created_at' },
  { title: 'Acciones', key: 'actions', sortable: false }
];

// Formatea la fecha para que muestre DD/MM/YYYY
const formatDate = (dateString) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// Cambia el color del estado dependiendo de el
const getStatusColor = (status) => {
  console.log('status: ', status);
  const colors = {
    draft: 'grey',
    active: 'green',
    archived: 'red'
  };
  const color = colors[status];
  console.log(color);
  return color;
};

// Cambia el label del estado dependiendo de el
const getStatusLabel = (status) => {
  const labels = {
    draft: 'Borrador',
    active: 'Activo',
    archived: 'Archivado'
  };
  return labels[status] || status;
};

const viewForm = (form) => {
  router.push({ name: 'FormDetail', params: { id: form.id } });
};

const publishForm = async (form) => {
  try {
    await axiosInstance.put(`/forms/${form.id}/status`, {
      status: 'active'
    });
    toast.success('Se ha publicado el formulario');
    emit('formUpdated');
  } catch (error) {
    toast.error('Error al publicar formulario: ' + error.response.data);
  }
};

const archiveForm = async (form) => {
  try {
    await axiosInstance.put(`/forms/${form.id}/status`, {
      status: 'archived'
    });
    toast.success('Se ha archivado el formulario');
    emit('formUpdated');
  } catch (error) {
    toast.error('Error al archivar formulario: ' + error.response.data);
  }
};
</script>

<template>
  <v-data-table
    :headers="headers"
    :items="props.forms"
    class="elevation-1"
    item-value="id"
    density="comfortable"
    :loading="isLoading"
    loading-text="Cargando..."
    hide-default-footer
  >
    <template #item.folio="{ item }">
      <span class="folio-link" @click="router.push({ name: 'FormDetail', params: { id: item.id } })">
        {{ item.folio }}
      </span>
    </template>

    <template #item.name="{ item }">
      <span>{{ item.name }}</span>
    </template>

    <template #item.status="{ item }">
      <v-chip :color="getStatusColor(item.status)" variant="flat" size="small">
        {{ getStatusLabel(item.status) }}
      </v-chip>
    </template>

    <template #item.created_at="{ item }">
      <span class="date-text">{{ formatDate(item.created_at) }}</span>
    </template>

    <template #item.actions="{ item }">
      <v-menu>
        <template #activator="{ props }">
          <v-btn :icon="mdiDotsVertical" variant="text" size="small" v-bind="props" />
        </template>
        <v-list>
          <v-list-item @click="viewForm(item)">
            <template #prepend>
              <v-icon :icon="mdiEye" size="small" />
            </template>
            <v-list-item-title>Ver</v-list-item-title>
          </v-list-item>
          <v-list-item v-if="item.status === 'draft'" @click="publishForm(item)">
            <template #prepend>
              <v-icon :icon="mdiPublish" size="small" color="green" />
            </template>
            <v-list-item-title>Publicar</v-list-item-title>
          </v-list-item>
          <v-list-item v-if="item.status !== 'archived'" @click="archiveForm(item)">
            <template #prepend>
              <v-icon :icon="mdiArchive" size="small" color="red" />
            </template>
            <v-list-item-title>Archivar</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </template>
  </v-data-table>
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
.date-text {
  font-size: 15px;
  color: #054403;
}
</style>
