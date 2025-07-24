<template>
  <v-form @submit.prevent="emitUpdate">
    <v-text-field v-model="form.name" label="Nombre Completo" variant="outlined" density="compact" class="mb-4" />
    <v-text-field v-model="form.email" label="Correo Electrónico" variant="outlined" density="compact" class="mb-2" />

    <v-row class="mt-0" justify="end">
      <v-col cols="auto">
        <v-btn color="secondary" class="text-none" @click="$emit('open-change-password')"> Cambiar Contraseña </v-btn>
      </v-col>

      <v-col cols="auto">
        <v-btn color="primary" type="submit" class="text-none"> Guardar Cambios </v-btn>
      </v-col>
    </v-row>
  </v-form>
</template>

<script setup>
import { reactive, watch } from 'vue';

const props = defineProps({ user: Object });
const emit = defineEmits(['update', 'open-change-password']);

const form = reactive({ name: '', email: '' });

watch(
  () => props.user,
  (val) => {
    form.name = val.name || '';
    form.email = val.email || '';
  },
  { immediate: true }
);

const emitUpdate = () => {
  emit('update', { ...form });
};
</script>
