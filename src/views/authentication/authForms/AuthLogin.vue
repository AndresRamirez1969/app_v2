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
const isLoading = ref(false);

const email = ref('');
const password = ref('');
const showPassword = ref(false);

const emailRules = [(v: string) => !!v || 'El correo es obligatorio', (v: string) => /.+@.+\..+/.test(v) || 'Correo no válido'];
const passwordRules = [(v: string) => !!v || 'La contraseña es obligatoria'];

// Solicitar geolocalización cada vez que inicia sesión
const requestGeolocationOnLogin = () => {
  return new Promise<void>((resolve) => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          localStorage.setItem('geo_lat', String(pos.coords.latitude));
          localStorage.setItem('geo_lng', String(pos.coords.longitude));
          resolve();
        },
        () => {
          // Si el usuario rechaza o falla, limpiamos las coordenadas
          localStorage.removeItem('geo_lat');
          localStorage.removeItem('geo_lng');
          resolve();
        }
      );
    } else {
      resolve();
    }
  });
};

const login = async () => {
  try {
    isLoading.value = true;
    await auth.login(email.value, password.value);
    // Pedir geolocalización después de login exitoso y esperar antes de redirigir
    await requestGeolocationOnLogin();
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
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <v-form class="loginForm mt-3" @submit.prevent="login">
    <v-text-field
      v-model="email"
      :rules="emailRules"
      label="Correo"
      placeholder="ejemplo@dominio.com"
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
    </div>

    <v-btn color="primary" block variant="flat" size="large" type="submit" :loading="isLoading"> Iniciar Sesión </v-btn>
  </v-form>
</template>

<style scoped lang="scss">
.loginForm {
  .v-text-field .v-field--active input {
    font-weight: 500;
  }
}
</style>
