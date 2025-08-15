<template>
  <v-container fluid class="login-container d-flex pa-0" style="height: 100vh">
    <!-- Panel Izquierdo con imagen de fondo -->
    <div class="left-panel" />

    <!-- Panel Derecho con formulario -->
    <div class="right-panel d-flex align-center justify-center">
      <v-card elevation="0" class="pa-8 d-flex flex-column justify-center login-card" style="width: 600px; min-height: 500px">
        <!-- Logo arriba -->
        <div class="text-center mb-6">
          <img src="@/assets/images/logos/tasker-logo.svg" alt="Tasker logo" class="tasker-logo" />
        </div>

        <h3 class="h4 text-center font-weight-bold mb-4">Iniciar Sesión</h3>
        <p class="text-subtitle-3 text-center mb-8">Ingresa tus credenciales para acceder a tu cuenta</p>

        <AuthLogin />

        <!-- <div class="text-center mt-6">
          <small style="font-size: 0.95rem"> ¿No tienes una cuenta? <a href="/register">Regístrate</a> </small>
        </div> -->
      </v-card>
    </div>
  </v-container>
</template>

<script setup>
import AuthLogin from '@/views/authentication/authForms/AuthLogin.vue';
</script>

<style scoped>
.login-container {
  display: flex;
}

/* Panel izquierdo con imagen de fondo */
.left-panel {
  width: 50%;
  background-image: url('@/assets/images/register.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

/* Panel derecho con fondo blanco */
.right-panel {
  width: 50%;
  background-color: white;
}

/* Logo más grande */
.tasker-logo {
  max-width: 260px;
  height: auto;
}

/* Card con tonalidad más clara */
.login-card {
  background-color: #fafbfc;
}

/* Responsive: ocultar imagen en móviles */
@media (max-width: 900px) {
  .left-panel {
    display: none;
  }
  .right-panel {
    width: 100%;
  }
}
</style>
