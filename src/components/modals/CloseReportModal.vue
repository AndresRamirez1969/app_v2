<script setup>
import { computed } from "vue";
import { mdiClose, mdiAlertCircleOutline, mdiPaperclip, mdiCamera } from "@mdi/js";

// Props
const props = defineProps({
  showCloseInfo: Boolean,
  closeComments: String,
  closeEvidences: Array,
  evidencePreviewUrls: Array,
  closingReport: Boolean,
});

// Emit events
const emit = defineEmits([
  "update:showCloseInfo",
  "update:closeComments",
  "update:closeEvidences",
  "closeReport",
]);

// Computed properties for two-way binding
const showCloseInfoModel = computed({
  get: () => props.showCloseInfo,
  set: (value) => emit("update:showCloseInfo", value),
});

const closeCommentsModel = computed({
  get: () => props.closeComments,
  set: (value) => emit("update:closeComments", value),
});

const closeEvidencesModel = computed({
  get: () => props.closeEvidences,
  set: (value) => {
    // Limitar el número máximo de imágenes a 4
    if (value.length > 4) {
      value.splice(4); // Mantener solo las primeras 4 imágenes
    }
    emit("update:closeEvidences", value);
  },
});

// Función para manejar la selección de imágenes desde la galería
const handleGalleryInput = (event) => {
  const files = Array.from(event.target.files);
  if (files.length > 4) {
    files.splice(4); // Limitar a 4 imágenes
  }
  emit("update:closeEvidences", [...props.closeEvidences, ...files]);
};

// Función para manejar la captura de imágenes desde la cámara
const handleCameraInput = (event) => {
  const files = Array.from(event.target.files);
  if (files.length > 4) {
    files.splice(4); // Limitar a 4 imágenes
  }
  emit("update:closeEvidences", [...props.closeEvidences, ...files]);
};
</script>

<template>
  <v-dialog v-model="showCloseInfoModel" max-width="520">
    <v-card class="close-info-card">
      <v-btn
        icon
        variant="text"
        class="close-info-x"
        @click="$emit('update:showCloseInfo', false)"
        aria-label="Cerrar"
      >
        <v-icon :icon="mdiClose" />
      </v-btn>
      <div class="close-info-icon">
        <div class="icon-wrapper">
          <v-icon :icon="mdiAlertCircleOutline" size="48" color="error" />
        </div>
      </div>
      <v-card-title class="text-center pt-2">
        <span class="close-info-title">Cierre de Reporte</span>
      </v-card-title>
      <v-card-text class="pt-2">
        <p class="mb-4 text-medium-emphasis text-center">
          El reporte pasará a cerrado y no podrá reabrirse.
        </p>
        <p class="mb-4 text-medium-emphasis text-center">
          Espacio para agregar comentarios o evidencias adicionales.
        </p>
        <v-label>Comentarios</v-label>
        <v-textarea
          v-model="closeCommentsModel"
          variant="outlined"
          color="primary"
          class="mt-2 mb-4"
          rows="2"
          auto-grow
          maxlength="1000"
          counter
        />
        <v-label>Evidencias</v-label>
        <div class="d-flex gap-4 mb-4">
          <!-- Botón para abrir la galería -->
          <v-btn
            variant="outlined"
            color="primary"
            class="d-flex align-center"
            style="flex: 1"
          >
            <v-icon :icon="mdiPaperclip" class="mr-2" />
            <label for="gallery-input" style="cursor: pointer; margin: 0">Galería</label>
            <input
              id="gallery-input"
              type="file"
              accept="image/*"
              multiple
              style="display: none"
              @change="handleGalleryInput"
            />
          </v-btn>

          <!-- Botón para abrir la cámara -->
          <v-btn
            variant="outlined"
            color="primary"
            class="d-flex align-center"
            style="flex: 1"
          >
            <v-icon :icon="mdiCamera" class="mr-2" />
            <label for="camera-input" style="cursor: pointer; margin: 0">Cámara</label>
            <input
              id="camera-input"
              type="file"
              accept="image/*"
              capture="camera"
              style="display: none"
              @change="handleCameraInput"
            />
          </v-btn>
        </div>
        <div
          v-if="evidencePreviewUrls && evidencePreviewUrls.length"
          class="image-preview-row"
        >
          <img
            v-for="(file, i) in evidencePreviewUrls"
            :key="i"
            :src="file"
            alt="Evidencia"
            style="
              width: 120px;
              height: 120px;
              object-fit: cover;
              border-radius: 8px;
              border: 1px solid #eee;
            "
          />
        </div>
        <p
          v-if="closeEvidencesModel.length >= 4"
          class="text-caption text-center text-danger"
        >
          Solo puedes agregar un máximo de 4 imágenes.
        </p>
      </v-card-text>
      <v-card-actions class="px-6 pb-6">
        <v-btn
          variant="outlined"
          color="grey"
          @click="$emit('update:showCloseInfo', false)"
        >
          Cancelar
        </v-btn>
        <v-spacer />
        <v-btn
          variant="outlined"
          color="error"
          :loading="closingReport"
          @click="$emit('closeReport')"
        >
          Cerrar reporte
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
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
  background: #f9dfe3;
  display: flex;
  justify-content: center;
  align-items: center;
}

.image-preview-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}
</style>
