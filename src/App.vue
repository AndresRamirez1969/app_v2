<template>
  <RouterView />
</template>

<style>
.pac-container {
  z-index: 3000 !important;
}
</style>

<!-- <script setup lang="ts">
import { RouterView } from 'vue-router';
import { onMounted, onUnmounted } from 'vue';
import axiosInstance from '@/utils/axios';

// Polling solo si hay token (usuario autenticado)
let intervalId: number | undefined;

function isAuthenticated() {
  return !!(localStorage.getItem('authToken') || sessionStorage.getItem('authToken'));
}

onMounted(() => {
  intervalId = window.setInterval(async () => {
    if (isAuthenticated()) {
      try {
        await axiosInstance.get('/user');
        // Si el usuario está inactivo, el interceptor lo expulsará automáticamente
      } catch (e) {
        // El interceptor maneja el logout/redirección
      }
    }
  }, 10000); // cada 10 segundos
});

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId);
});
</script> -->
