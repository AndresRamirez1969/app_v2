<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axiosInstance from '@/utils/axios';
import { useToast } from 'vue-toastification';
import { mdiArrowLeft, mdiEye, mdiEyeOff } from '@mdi/js';

import TaskerLogo from '@/assets/images/logos/tasker-logo.svg';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const loading = ref(false);
const formRef = ref(null);

const showPassword = ref(false);
const showConfPassword = ref(false);

const form = ref({
  token: '',
  email: '',
  password: '',
  password_confirmation: ''
});

onMounted(() => {
  form.value.token = route.query.token || '';
  form.value.email = route.query.email || '';
});

const rules = {
  required: (v) => !!v || 'Este campo es obligatorio.',
  min: (v) => v.length >= 8 || 'Debe tener al menos 8 caracteres.'
};

const confirmRule = (v) => v === form.value.password || 'Las contraseñas no coinciden';

const handleSubmit = async () => {
  if (!formRef.value.validate()) return;

  loading.value = true;
  try {
    await axiosInstance.post('/reset-password', form.value);
    toast.success('Contraseña restablecida con éxito.');
    router.push('/login');
  } catch (error) {
    const message = error.response?.data?.message || 'Error al restablecer contraseña.';
    toast.error(message);
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="forgot-password-page">
    <div class="card-wrapper">
      <v-card class="pa-10 login-card" elevation="6" max-width="420">
        <div class="text-center mb-6">
          <img :src="TaskerLogo" alt="Tasker Logo" class="logo-large mb-4" />
        </div>
        <h2 class="text-center text-h5 font-weight-bold mb-4">Restablecer Contraseña</h2>
        <p class="text-center text-body-2 mb-8">Ingresa tu nueva contraseña y confírmala para restablecer el acceso a tu cuenta.</p>
        <v-form @submit.prevent="handleSubmit" ref="formRef" class="mb-6">
          <v-text-field
            v-model="form.password"
            label="Nueva Contraseña"
            :type="showPassword ? 'text' : 'password'"
            :append-inner-icon="showPassword ? mdiEye : mdiEyeOff"
            @click:append-inner="showPassword = !showPassword"
            :rules="[rules.required, rules.min]"
            variant="outlined"
            class="mb-4"
            required
          />
          <v-text-field
            v-model="form.password_confirmation"
            label="Confirmar Contraseña"
            :type="showConfPassword ? 'text' : 'password'"
            :append-inner-icon="showConfPassword ? mdiEye : mdiEyeOff"
            @click:append-inner="showConfPassword = !showConfPassword"
            :rules="[rules.required, confirmRule]"
            variant="outlined"
            class="mb-4"
            required
          />
          <v-btn type="submit" color="primary" class="mt-4" block :loading="loading"> Restablecer Contraseña </v-btn>
        </v-form>
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

.login-card {
  background-color: #fafbfc;
}
</style>
