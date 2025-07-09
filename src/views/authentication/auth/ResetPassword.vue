<template>
  <v-container class="d-flex justify-center align-center" style="min-height: 100vh">
    <v-card class="pa-6" max-width="500">
      <v-card-title class="text-h6 mb-4">Restablecer Contraseña</v-card-title>

      <v-form @submit.prevent="handleSubmit" ref="formRef">
        <v-text-field
          v-model="form.password"
          label="Nueva Contraseña"
          type="password"
          :rules="[rules.required, rules.min]"
          variant="outlined"
        />

        <v-text-field
          v-model="form.password_confirmation"
          label="Confirmar Contraseña"
          type="password"
          :rules="[rules.required, confirmRule]"
          variant="outlined"
        />

        <v-btn type="submit" color="primary" class="mt-4" block :loading="loading"> Restablecer Contraseña </v-btn>
      </v-form>

      <v-btn class="mt-4" variant="text" color="secondary" to="/login" block> Volver al inicio de sesión </v-btn>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axiosInstance from '@/utils/axios';
import { useToast } from 'vue-toastification';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const loading = ref(false);
const formRef = ref(null);

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
