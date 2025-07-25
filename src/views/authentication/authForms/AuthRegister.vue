<script setup lang="ts">
import { ref } from 'vue';
import axiosInstance from '@/utils/axios';
import { useRouter } from 'vue-router';
import { mdiEye, mdiEyeOff } from '@mdi/js';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const auth = useAuthStore();

const showPassword = ref(false);
const showConfPassword = ref(false);
const name = ref('');
const email = ref('');
const password = ref('');
const confPassword = ref('');

const eyeIcon = mdiEye;
const eyeOffIcon = mdiEyeOff;

const nameRules = [(v: string) => !!v || 'El nombre es obligatorio'];
const emailRules = [(v: string) => !!v || 'El correo es obligatorio', (v: string) => /.+@.+\..+/.test(v) || 'Correo no válido'];
const passwordRules = [(v: string) => !!v || 'La contraseña es obligatoria'];
const confPasswordRules = [
  (v: string) => !!v || 'Confirma la contraseña',
  (v: string) => v === password.value || 'Las contraseñas no coinciden'
];

const register = async () => {
  try {
    const res = await axiosInstance.post('/register', {
      name: name.value,
      email: email.value,
      password: password.value,
      password_confirmation: confPassword.value
    });
    auth.loginWithTokenAndUser(res.data.access_token || res.data.token, res.data.user, res.data.permissions || []);
    router.push('/dashboard');
  } catch (err) {
    console.error('Error en registro:', err);
  }
};
</script>

<template>
  <v-form class="mt-7 loginForm">
    <v-text-field v-model="name" :rules="nameRules" label="Nombre" required variant="outlined" color="primary" class="mb-4" />
    <v-text-field v-model="email" :rules="emailRules" label="Correo" required variant="outlined" color="primary" class="mb-4" />
    <v-text-field
      v-model="password"
      :rules="passwordRules"
      label="Contraseña"
      :type="showPassword ? 'text' : 'password'"
      required
      variant="outlined"
      color="primary"
      class="mb-4"
      :append-inner-icon="showPassword ? eyeIcon : eyeOffIcon"
      @click:append-inner="showPassword = !showPassword"
    />
    <v-text-field
      v-model="confPassword"
      :rules="confPasswordRules"
      label="Confirmar Contraseña"
      :type="showConfPassword ? 'text' : 'password'"
      required
      variant="outlined"
      color="primary"
      class="mb-4"
      :append-inner-icon="showConfPassword ? eyeIcon : eyeOffIcon"
      @click:append-inner="showConfPassword = !showConfPassword"
    />
    <v-btn color="primary" block class="mt-4" variant="flat" size="large" @click="register"> Crear Cuenta </v-btn>
  </v-form>
</template>

<style scoped>
.loginForm {
  .v-text-field .v-field--active input {
    font-weight: 500;
  }
}
</style>
