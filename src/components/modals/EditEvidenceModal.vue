<script setup>
import { computed } from "vue";
import { mdiClose, mdiAlertCircleOutline, mdiPaperclip } from "@mdi/js";

// Props
const props = defineProps({
  showEditEvidence: Boolean,
  editComments: String,
  editEvidences: Array,
  editEvidencePreviewUrls: Array,
  closingReport: Boolean,
});

// Emit events
const emit = defineEmits([
  "update:showEditEvidence",
  "update:editComments",
  "update:editEvidences",
  "saveEvidenceEdit",
]);

// Computed properties for two-way binding
const showEditEvidenceModel = computed({
  get: () => props.showEditEvidence,
  set: (value) => emit("update:showEditEvidence", value),
});

const editCommentsModel = computed({
  get: () => props.editComments,
  set: (value) => emit("update:editComments", value),
});

const editEvidencesModel = computed({
  get: () => props.editEvidences,
  set: (value) => emit("update:editEvidences", value),
});
</script>

<template>
  <v-dialog v-model="showEditEvidenceModel" max-width="520">
    <v-card class="close-info-card">
      <v-btn
        icon
        variant="text"
        class="close-info-x"
        @click="$emit('update:showEditEvidence', false)"
        aria-label="Cerrar"
      >
        <v-icon :icon="mdiClose" />
      </v-btn>
      <div class="close-info-icon">
        <div class="icon-wrapper">
          <v-icon :icon="mdiAlertCircleOutline" size="48" color="primary" />
        </div>
      </div>
      <v-card-title class="text-center pt-2">
        <span class="close-info-title">Editar Evidencia</span>
      </v-card-title>
      <v-card-text class="pt-2">
        <v-label>Comentarios</v-label>
        <v-textarea
          v-model="editCommentsModel"
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
          v-model="editEvidencesModel"
          variant="outlined"
          color="primary"
          class="mt-2 mb-4"
          multiple
          accept="image/png, image/jpeg, image/jpg"
          show-size
          :prepend-icon="mdiPaperclip"
        />
        <div
          v-if="editEvidencePreviewUrls && editEvidencePreviewUrls.length"
          class="image-preview-row"
        >
          <img
            v-for="(file, i) in editEvidencePreviewUrls"
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
      </v-card-text>
      <v-card-actions class="px-6 pb-6">
        <v-btn
          variant="outlined"
          color="grey"
          @click="$emit('update:showEditEvidence', false)"
        >
          Cancelar
        </v-btn>
        <v-spacer />
        <v-btn
          variant="outlined"
          color="primary"
          :loading="closingReport"
          @click="$emit('saveEvidenceEdit')"
        >
          Guardar
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
  background: #deedff;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
