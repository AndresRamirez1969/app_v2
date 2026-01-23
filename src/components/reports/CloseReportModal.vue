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
  set: (value) => {
    if (!value) {
      // Limpiar imágenes al cerrar el modal
      emit("update:closeEvidences", []);
    }
    emit("update:showCloseInfo", value);
  },
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
const handleEvidenceInput = (event) => {
  const files = Array.from(event.target.files).filter((file) =>
    ["image/jpeg", "image/png", "image/jpg"].includes(file.type)
  );

  // Limitar el número máximo de imágenes a 4
  const limitedFiles = files.slice(0, 4);

  console.log("Archivos seleccionados:", limitedFiles); // Verificar los archivos
  emit("update:closeEvidences", limitedFiles);
};

// Función para manejar la selección de imágenes desde la cámara
const handleCameraInput = (event) => {
  console.log("Evento de cámara detectado:", event);

  const files = Array.from(event.target.files).filter((file) =>
    ["image/jpeg", "image/png", "image/jpg"].includes(file.type)
  );

  // Combinar las imágenes nuevas con las existentes
  const updatedEvidences = [...props.closeEvidences, ...files];

  // Limitar el número máximo de imágenes a 4
  const limitedFiles = updatedEvidences.slice(0, 4);

  console.log("Imágenes desde la cámara:", limitedFiles); // Verificar los archivos
  emit("update:closeEvidences", limitedFiles);

  // Reset del input para permitir volver a tomar la MISMA foto (o misma ruta) sin que ignore el change
  // (muy común en Android)
  if (event?.target) event.target.value = "";
};

// Función para eliminar una imagen específica desde la vista previa
const removeEvidence = (index) => {
  const updatedEvidences = [...props.closeEvidences];
  updatedEvidences.splice(index, 1); // Eliminar la imagen en el índice especificado
  emit("update:closeEvidences", updatedEvidences);
};

// Función para obtener la URL de vista previa
const getPreviewUrl = (file) => {
  if (file instanceof File) {
    return URL.createObjectURL(file);
  }
  return file; // Si ya es una URL, devolverla directamente
};

// Detectar si el dispositivo es Android
const isAndroid = /Android/i.test(navigator.userAgent);

// Detectar si el dispositivo es móvil
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
  navigator.userAgent
);
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

        <!-- Campo de evidencias -->
        <v-file-input
          v-model="closeEvidencesModel"
          accept="image/jpeg,image/png,image/jpg"
          multiple
          :counter="true"
          :show-size="true"
          variant="outlined"
          :chips="true"
          :clearable="true"
          label=""
          @change="handleEvidenceInput"
        />

        <!-- Botón para abrir la cámara (solo en Android) -->
        <div v-if="isAndroid" class="mt-4 camera-wrap">
          <v-btn variant="outlined" color="primary" class="camera-button">
            <v-icon :icon="mdiCamera" class="me-2" />
            Tomar foto
          </v-btn>

          <input
            id="camera-input"
            type="file"
            accept="image/*"
            capture="environment"
            class="camera-overlay-input"
            @change="handleCameraInput"
          />
        </div>

        <!-- Vista previa de imágenes -->
        <div v-if="closeEvidencesModel.length" class="image-preview-row mt-4">
          <div
            v-for="(file, index) in closeEvidencesModel"
            :key="index"
            class="image-preview-wrapper"
          >
            <img :src="getPreviewUrl(file)" alt="Evidencia" class="image-preview" />
            <!-- Mostrar tachita solo en dispositivos móviles -->
            <v-btn
              v-if="isMobile"
              icon
              small
              class="remove-image-btn"
              @click="removeEvidence(index)"
            >
              <v-icon :icon="mdiClose" />
            </v-btn>
          </div>
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
.image-preview-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.image-preview-wrapper {
  position: relative;
  display: inline-block;
}

.image-preview {
  width: 120px;
  height: 120px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid #eee;
}

.remove-image-btn {
  position: absolute;
  top: -8px;
  right: -8px;
  box-shadow: none;
  background-color: transparent;
  border-radius: 0;
}

/* ✅ Ya no usamos display:none para el input de cámara,
   porque eso rompe el disparo del picker/cámara en varios Android/WebViews */
.camera-wrap {
  position: relative;
}

.camera-overlay-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
}

.camera-button {
  width: 100%; /* Hacer el botón rectangular y ocupar todo el ancho */
  justify-content: center;
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
  background-color: #f9dfe3;
  display: flex;
  justify-content: center;
  align-items: center;
}

.icon-wrapper v-icon {
  color: #e53935;
}
</style>
