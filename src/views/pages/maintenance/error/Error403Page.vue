<template>
  <section class="error-403">
    <div class="card">
      <div class="card__topbar" />
      <div class="card__body">
        <h1 class="code">{{ code }}</h1>
        <p class="title">{{ title }}</p>
        <p class="subtitle">No tienes permisos para acceder a esta página.</p>
        <v-btn color="primary" variant="flat" class="mt-4" @click="$router.back()">Regresar</v-btn>
      </div>
    </div>
  </section>
</template>

<script setup>
const props = defineProps({
  code: { type: [String, Number], default: 403 },
  title: { type: String, default: 'Acceso Denegado' }
});
</script>

<style scoped>
.error-403 {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  background: #cfe1ed;
  padding: 24px;
}

.card {
  position: relative;
  width: min(560px, 96%);
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 10px 30px rgba(37, 66, 97, 0.18);
}

.card__topbar {
  height: 22px;
  background: #1565ff;
  border-top-left-radius: 14px;
  border-top-right-radius: 14px;
}

.card__body {
  padding: 46px 28px 56px;
  text-align: center;
}

.code {
  margin: 0 0 8px 0;
  font-size: clamp(56px, 9vw, 88px);
  line-height: 1;
  font-weight: 800;
  color: #152b44;
  letter-spacing: 1px;
}

.title {
  margin: 0;
  font-size: clamp(16px, 2.8vw, 22px);
  color: #1c3553;
  opacity: 0.9;
}

.subtitle {
  margin: 12px 0 0 0;
  font-size: 16px;
  color: #1c3553;
  opacity: 0.7;
}

.paper {
  display: none;
}

.paper__img {
  display: none;
}

@media (max-width: 420px) {
  .card__body {
    padding-bottom: 48px;
  }
}
</style>
