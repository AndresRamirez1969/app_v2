<script setup>
import { ref, computed, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import axiosInstance from '@/utils/axios';
import { useToast } from 'vue-toastification';
import { mdiAlertCircleOutline, mdiEmailOutline, mdiArrowLeft } from '@mdi/js';

import TaskerLogo from '@/assets/images/logos/tasker-logo.svg';

const email = ref('');
const loading = ref(false);
const formRef = ref(null);
const toast = useToast();
const router = useRouter();

const rules = {
  required: (v) => !!v || 'Este campo es obligatorio.',
  email: (v) => /.+@.+\..+/.test(v) || 'Ingresa un correo válido.'
};

// Temporizador de 60 segundos
const timer = ref(0);
let intervalId = null;

const formattedTimer = computed(() => {
  return `00:${timer.value.toString().padStart(2, '0')}`;
});

const startTimer = () => {
  timer.value = 60;
  intervalId = setInterval(() => {
    if (timer.value > 0) {
      timer.value--;
    } else {
      clearInterval(intervalId);
      intervalId = null;
    }
  }, 1000);
};

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId);
});

const handleSubmit = async () => {
  if (!formRef.value.validate()) return;

  loading.value = true;
  try {
    await axiosInstance.post('/forgot-password', { email: email.value });
    toast.success('Se ha enviado un correo para reestablecer tu contraseña.');
    email.value = '';
    startTimer();
  } catch (error) {
    toast.error('Este correo aún no está registrado.');
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="forgot-password-page">
    <!-- Card centrado en la pantalla -->
    <div class="card-wrapper">
      <v-card class="pa-10 login-card" elevation="6" max-width="420">
        <div class="text-center mb-6">
          <img :src="TaskerLogo" alt="Tasker Logo" class="logo-large mb-4" />
        </div>
        <h2 class="text-center text-h5 font-weight-bold mb-4">¿Olvidaste tu contraseña?</h2>
        <p class="text-center text-body-2 mb-8">Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.</p>
        <v-form @submit.prevent="handleSubmit" ref="formRef" class="mb-6">
          <v-text-field
            v-model="email"
            :prepend-inner-icon="mdiEmailOutline"
            label="Correo electrónico"
            type="email"
            variant="outlined"
            :rules="[rules.required, rules.email]"
            required
            :disabled="timer > 0"
          />
          <v-btn :loading="loading" type="submit" block color="primary" class="mt-4" :disabled="timer > 0"> Enviar Correo </v-btn>
        </v-form>
        <div v-if="timer > 0" class="text-center mb-4" style="color: #1976d2">
          Puedes volver a enviar el correo en: <b>{{ formattedTimer }}</b>
        </div>
        <v-btn class="mt-6" variant="text" color="secondary" block @click="router.push('/login')">
          <v-icon :icon="mdiArrowLeft" start /> Volver a Iniciar Sesión
        </v-btn>
      </v-card>
    </div>
  </div>
</template>

<style scoped>
.forgot-password-page {
  min-height: 100vh;
  background-color: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-wrapper {
  position: static;
  transform: none;
}

.logo-large {
  max-width: 160px;
}

/* Igual que AuthLogin */
.login-card {
  background-color: #fafbfc;
}
</style>
