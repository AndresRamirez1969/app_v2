<template>
  <!-- Backdrop con fade -->
  <v-fade-transition>
    <div v-if="modelValue" @click="close" />
  </v-fade-transition>

  <!-- Modal con pop -->
  <v-dialog
    v-model="internalValue"
    persistent
    max-width="460"
    transition="scale-transition"
    content-class="mw-dialog-content"
    overlay-class="mw-dialog-overlay"
  >
    <template #default>
      <v-card class="mw-card" style="position: relative">
        <!-- Botón de cerrar (tachita) -->
        <v-btn
          icon
          variant="text"
          class="mw-close"
          style="top: 10px; right: 10px; color: #222; z-index: 10; position: absolute"
          @click="close"
        >
          <v-icon>
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path
                fill="currentColor"
                d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
              />
            </svg>
          </v-icon>
        </v-btn>

        <!-- Icono azul -->
        <div class="mw-icon">
          <v-icon :icon="mdiInformationSlabCircleOutline" color="primary" size="64" />
        </div>

        <!-- Title -->
        <h2 class="mw-title" id="mw-title">Información de <span>Grupo de Ubicaciones</span></h2>

        <!-- Texto informativo -->
        <div class="mw-info-text">
          <div>
            <p class="mw-intro">Al crear y/o editar un grupo de ubicaciones, toma en cuenta lo siguiente:</p>
            <ul class="mw-list">
              <li>
                Primero selecciona la <strong>organización</strong> y después la <strong>empresa</strong>, para que se muestren las
                ubicaciones que les pertenecen.
              </li>
              <li v-if="isSuperadmin">Todas las ubicaciones deben ser de la <strong>misma organización</strong>.</li>
              <li>Todas las ubicaciones deben pertenecer a la <strong>misma empresa</strong>.</li>
            </ul>
            <div style="height: 18px"></div>
          </div>
        </div>

        <v-btn
          style="
            background-color: #1677ff;
            color: white;
            font-weight: 500;
            font-size: 14px;
            width: 100%;
            text-transform: none;
            margin-top: 0;
          "
          @click="close"
        >
          Cerrar
        </v-btn>
      </v-card>
    </template>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { mdiInformationSlabCircleOutline, mdiAlertOctagonOutline } from '@mdi/js';
import { useAuthStore } from '@/stores/auth';

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void }>();

const internalValue = ref(props.modelValue);

const auth = useAuthStore();
const roles = computed(() => auth.user?.roles || []);
const isSuperadmin = computed(() => roles.value.includes('superadmin'));

watch(
  () => props.modelValue,
  (val) => {
    internalValue.value = val;
  }
);
watch(internalValue, (val) => {
  if (val !== props.modelValue) emit('update:modelValue', val);
});

function close() {
  emit('update:modelValue', false);
}
</script>

<style scoped>
.mw-dialog-content {
  box-shadow: none !important;
  background: transparent !important;
  padding: 0 !important;
}

.mw-card {
  position: relative;
  width: min(92vw, 460px);
  background: #fff;
  border-radius: 20px;
  padding: 24px 28px 28px;
  box-shadow: 0 20px 50px rgba(22, 22, 40, 0.2);
}

.mw-close {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 32px !important;
  height: 32px !important;
  min-width: 32px !important;
  display: grid;
  place-items: center;
  border-radius: 10px !important;
  background: #f5f6ff !important;
  font-size: 18px;
  line-height: 1;
  border: none;
}
.mw-close:hover {
  opacity: 0.9;
}

.mw-icon {
  width: 88px;
  height: 88px;
  margin: 6px auto 10px;
  border-radius: 50%;
  background: #eef2ff;
  display: grid;
  place-items: center;
}

.mw-title {
  text-align: center;
  margin: 10px 0 14px;
  font-size: 28px;
  font-weight: 800;
  color: #1f2240;
}
.mw-title span {
  color: #1677ff;
}

.mw-info-text {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 14px 0 0 0;
  font-size: 16px;
}

.mw-list {
  margin: 8px 0 10px 0;
  padding-left: 18px;
  line-height: 1.6;
}
.mw-list li {
  margin: 6px 0;
}

.mw-callout-warning {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: #f5f5f5;
  border-left: 4px solid #d32f2f;
  color: #000;
  font-weight: 500;
}
</style>
