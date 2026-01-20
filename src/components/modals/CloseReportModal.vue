<script setup>
import { computed } from "vue";
import { mdiClose, mdiAlertCircleOutline, mdiPaperclip } from "@mdi/js";

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
        <v-file-input
          v-model="closeEvidencesModel"
          variant="outlined"
          color="primary"
          class="mt-2 mb-4"
          multiple
          accept="image/*"
          show-size
          :prepend-icon="mdiPaperclip"
        />
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
