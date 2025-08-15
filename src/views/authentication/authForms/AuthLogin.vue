<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useToast } from 'vue-toastification';
import { mdiEye, mdiEyeOff } from '@mdi/js';

const eyeIcon = mdiEye;
const eyeOffIcon = mdiEyeOff;

const router = useRouter();
const auth = useAuthStore();
const toast = useToast();

const email = ref('');
const password = ref('');
const showPassword = ref(false);
const rememberMe = ref(false);

const emailRules = [(v: string) => !!v || 'El correo es obligatorio', (v: string) => /.+@.+\..+/.test(v) || 'Correo no válido'];
const passwordRules = [(v: string) => !!v || 'La contraseña es obligatoria'];

const login = async () => {
  try {
    await auth.login(email.value, password.value, rememberMe.value);
    const roles = auth.user?.roles || [];
    const isAdmin = roles.includes('admin');
    const hasOrg = !!auth.user?.organization_id;

    if (isAdmin && !hasOrg) {
      router.push('/organizaciones/crear');
    } else {
      router.push('/dashboard');
    }
  } catch (err) {
    toast.error('Credenciales inválidas');
    console.error('Login error:', err);
  }
};
</script>

<template>
  <v-form class="loginForm mt-3" @submit.prevent="login">
    <v-text-field
      v-model="email"
      :rules="emailRules"
      label="Correo"
      placeholder="example@domain.com"
      required
      variant="outlined"
      color="primary"
      class="mb-4"
      autocomplete="username"
    />

    <v-text-field
      v-model="password"
      :rules="passwordRules"
      label="Contraseña"
      placeholder="*******"
      :type="showPassword ? 'text' : 'password'"
      required
      variant="outlined"
      color="primary"
      class="mb-4"
      autocomplete="current-password"
      :append-inner-icon="showPassword ? eyeIcon : eyeOffIcon"
      @click:append-inner="showPassword = !showPassword"
    />

    <div class="d-flex justify-space-between align-center mt-4 mb-7">
      <router-link to="/forgot_password" class="text-darkText link-hover"> ¿Olvidaste tu contraseña? </router-link>
      <v-checkbox v-model="rememberMe" label="Recuérdame" density="compact" hide-details class="ma-0 pa-0" />
    </div>

    <v-btn color="primary" block variant="flat" size="large" type="submit"> Iniciar Sesión </v-btn>
  </v-form>
</template>

<style scoped>
.loginForm {
  .v-text-field .v-field--active input {
    font-weight: 500;
  }
}
</style>
