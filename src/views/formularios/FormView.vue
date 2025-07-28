<script setup>
import { computed } from 'vue';
import { mdiEye } from '@mdi/js';
import { useAuthStore } from '@/stores/auth';
import { router } from '@/router';
import { getScopes } from '@/constants/constants';

const auth = useAuthStore();

const props = defineProps({
  forms: Array,
  isLoading: Boolean
});

const headers = [
  { title: 'Folio', key: 'folio' },
  { title: 'Nombre', key: 'name' },
  { title: 'Estado', key: 'status' },
  { title: 'Fecha de creación', key: 'created_at' }
];

const formatDate = (dateString) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};
</script>

<template>
  <v-card>
    <v-data-table
      :headers="headers"
      :items="props.forms"
      class="elevation-1"
      item-value="id"
      density="comfortable"
      :loading="isLoading"
      loading-text="Cargando..."
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
        <v-chip :color="item.status === 'draft' ? 'grey' : 'green'" variant="flat" size="small">
          {{ item.status }}
        </v-chip>
      </template>

      <template #item.created_at="{ item }">
        <span class="date-text">{{ formatDate(item.created_at) }}</span>
      </template>
    </v-data-table>
  </v-card>
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
