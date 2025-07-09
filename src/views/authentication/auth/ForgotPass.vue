<!-- eslint-disable @typescript-eslint/no-unused-vars -->
<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import axiosInstance from '@/utils/axios';
import { useToast } from 'vue-toastification';

const email = ref('');
const loading = ref(false);
const formRef = ref(null);
const toast = useToast();
const router = useRouter();

const rules = {
  required: (v) => !!v || 'Este campo es obligatorio.',
  email: (v) => /.+@.+\..+/.test(v) || 'Ingresa un correo válido.'
};

const handleSubmit = async () => {
  if (!formRef.value.validate()) return;

  loading.value = true;
  try {
    await axiosInstance.post('/forgot-password', { email: email.value });
    toast.success('Se ha enviado un correo para reestablecer tu contrasena');
    email.value = '';
  } catch (error) {
    const message = 'Este correo aun no esta registrado.';
    toast.error(message);
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <v-container class="d-flex justify-center align-center" style="min-height: 100vh">
    <v-card class="pa-6" max-width="500">
      <v-card-title class="text-h6 mb-4">¿Olvidaste tu contraseña?</v-card-title>

      <v-form @submit.prevent="handleSubmit" ref="formRef">
        <v-text-field
          v-model="email"
          label="Ingresa tu Correo"
          type="email"
          :rules="[rules.required, rules.email]"
          required
          variant="outlined"
        />
        <v-btn :loading="loading" type="submit" color="primary" block>Enviar Correo</v-btn>
      </v-form>
      <v-btn class="mt-4" variant="text" color="secondary" to="/login" block> Volver a Iniciar Sesion </v-btn>
    </v-card>
  </v-container>
</template>
