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

const chipColor = computed(() => {
  if (props.status === 'activa' || props.status === 'active') return 'success';
  if (props.status === 'inactiva' || props.status === 'inactive') return 'grey darken-1';
  return 'grey lighten-2';
});

const chipTextColor = computed(() => {
  if (props.status === 'activa' || props.status === 'active') return 'white';
  if (props.status === 'inactiva' || props.status === 'inactive') return 'white';
  return 'black';
});

const label = computed(() => {
  if (props.status === 'activa' || props.status === 'active') return 'Activo';
  if (props.status === 'inactiva' || props.status === 'inactive') return 'Inactivo';
  return props.status;
});
</script>
