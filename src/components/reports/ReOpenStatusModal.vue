<script setup>
import { computed } from "vue";
import { mdiClose, mdiAlertCircleOutline } from "@mdi/js";

// Props
const props = defineProps({
  showReopenInfo: Boolean,
  reopeningReport: Boolean,
});

// Emit events
const emit = defineEmits(["update:showReopenInfo", "reopenReport"]);

// Computed properties for two-way binding
const showReopenInfoModel = computed({
  get: () => props.showReopenInfo,
  set: (value) => emit("update:showReopenInfo", value),
});
</script>

<template>
  <v-dialog v-model="showReopenInfoModel" max-width="520">
    <v-card class="close-info-card">
      <!-- Botón para cerrar el modal -->
      <v-btn
        icon
        variant="text"
        class="close-info-x"
        @click="$emit('update:showReopenInfo', false)"
        aria-label="Cerrar"
      >
        <v-icon :icon="mdiClose" />
      </v-btn>

      <!-- Ícono de alerta -->
      <div class="close-info-icon">
        <div class="icon-wrapper">
          <v-icon :icon="mdiAlertCircleOutline" size="48" color="error" />
        </div>
      </div>

      <!-- Título del modal -->
      <v-card-title class="text-center pt-2">
        <span class="close-info-title">Reabrir Reporte</span>
      </v-card-title>

      <!-- Texto de confirmación -->
      <v-card-text class="pt-2">
        <p class="mb-4 text-medium-emphasis text-center">
          ¿Estás seguro de que deseas reabrir este reporte? Los comentarios y evidencias
          actuales se eliminarán.
        </p>
      </v-card-text>

      <!-- Botones de acción -->
      <v-card-actions class="px-6 pb-6">
        <v-btn
          variant="outlined"
          color="grey"
          @click="$emit('update:showReopenInfo', false)"
        >
          Cancelar
        </v-btn>
        <v-spacer />
        <v-btn
          variant="outlined"
          class="reopen-report-btn"
          :loading="reopeningReport"
          @click="$emit('reopenReport')"
        >
          Reabrir reporte
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.close-info-card {
  border-radius: 16px !important;
  padding-top: 28px;
  position: relative;
}
.close-info-x {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
  color: #2f2f2f;
}
.close-info-icon {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 16px auto;
}
.icon-wrapper {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background-color: #f9dfe3; /* Fondo rojo claro */
  display: flex;
  justify-content: center;
  align-items: center;
}
.icon-wrapper v-icon {
  color: #e53935; /* Rojo */
}
.close-info-title {
  font-size: 1.25rem;
  font-weight: 500;
}
.reopen-report-btn {
  color: #e53935 !important; /* Texto rojo */
  border-color: #e53935 !important; /* Borde rojo */
}
.reopen-report-btn:hover {
  background-color: rgba(
    229,
    57,
    53,
    0.1
  ) !important; /* Fondo rojo claro al pasar el mouse */
}
</style>
