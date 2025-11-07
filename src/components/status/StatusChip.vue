<template>
  <v-chip :color="chipColor" :text-color="chipTextColor" small class="status-chip">
    {{ label }}
  </v-chip>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  status: { type: String, required: true }
});

// Lógica específica para formularios y reportes
const chipColor = computed(() => {
  if (props.status === 'activa' || props.status === 'active') return 'success';
  if (props.status === 'inactiva' || props.status === 'inactive') return 'grey darken-1';
  if (props.status === 'borrador' || props.status === 'draft') return 'primary';
  if (props.status === 'archivado' || props.status === 'archived') return 'red';
  if (props.status === 'abierto' || props.status === 'open') return 'success';
  if (props.status === 'cerrado' || props.status === 'closed') return 'grey darken-1';
  return 'grey lighten-2';
});

const chipTextColor = computed(() => {
  if (
    props.status === 'activa' ||
    props.status === 'active' ||
    props.status === 'inactiva' ||
    props.status === 'inactive' ||
    props.status === 'borrador' ||
    props.status === 'draft' ||
    props.status === 'archivado' ||
    props.status === 'archived' ||
    props.status === 'abierto' ||
    props.status === 'open' ||
    props.status === 'cerrado' ||
    props.status === 'closed'
  ) {
    return 'white';
  }
  return 'black';
});

const label = computed(() => {
  if (props.status === 'activa' || props.status === 'active') return 'Activo';
  if (props.status === 'inactiva' || props.status === 'inactive') return 'Inactivo';
  if (props.status === 'borrador' || props.status === 'draft') return 'Borrador';
  if (props.status === 'archivado' || props.status === 'archived') return 'Archivado';
  if (props.status === 'abierto' || props.status === 'open') return 'Abierto';
  if (props.status === 'cerrado' || props.status === 'closed') return 'Cerrado';
  return props.status;
});
</script>
