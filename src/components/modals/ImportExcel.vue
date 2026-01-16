<template>
  <v-dialog
    v-model="internalValue"
    persistent
    max-width="460"
    transition="scale-transition"
    content-class="mw-dialog-content"
    overlay-class="mw-dialog-overlay"
  >
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

      <!-- Icono de importación -->
      <div class="mw-icon">
        <v-icon :icon="mdiFileUploadOutline" color="primary" size="64" />
      </div>

      <!-- Título -->
      <h2 class="mw-title" id="mw-title">Importar usuarios</h2>

      <!-- Formulario de importación -->
      <div class="mw-info-text">
        <v-label>Archivo CSV, XLS, XLSX o TXT <span class="text-error">*</span></v-label>
        <v-file-input
          v-model="importFile"
          variant="outlined"
          color="primary"
          class="mt-2 mb-4 mw-file-input"
          accept=".csv,.xls,.xlsx,.txt"
          density="compact"
          show-size
          :multiple="false"
          :error-messages="importError"
          :disabled="importLoading"
        />

        <!-- Botón para descargar plantilla -->
        <v-btn
          variant="outlined"
          color="grey"
          class="mb-1"
          style="
            width: 100%;
            border-color: #d1d5db;
            color: #222;
            background: transparent;
            font-weight: 500;
            font-size: 14px;
            text-transform: none;
            margin-bottom: 6px;
          "
          @click="downloadTemplate"
        >
          Descargar plantilla XLSX
        </v-btn>

        <v-alert v-if="importError" type="error" dense class="mt-2">
          {{ importError }}
        </v-alert>
        <v-alert v-if="importSuccess" type="success" dense class="mt-2">
          {{ importSuccess }}
        </v-alert>
        <div v-if="importResult.errors && importResult.errors.length" class="mt-2">
          <strong>Errores:</strong>
          <ul>
            <li v-for="err in importResult.errors" :key="err.row">
              Fila {{ err.row }}: {{ err.errors.join(", ") }}
            </li>
          </ul>
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
          margin-top: 0px;
        "
        :loading="importLoading"
        :disabled="!importFile || importLoading"
        @click="handleImport"
      >
        Importar
      </v-btn>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch } from "vue";
import { mdiFileUploadOutline } from "@mdi/js";
import { useImportProgressStore } from "@/stores/importProgress";
import axios from "@/utils/axios";

const props = defineProps({
  modelValue: Boolean,
  importLoading: Boolean,
  importError: String,
  importSuccess: String,
  importResult: { type: Object, default: () => ({ errors: [] }) },
});
const emit = defineEmits(["update:modelValue", "import", "download-template"]);

const internalValue = ref(props.modelValue);
const importFile = ref(null);

const importProgress = useImportProgressStore();

let intervalId = null;

watch(
  () => props.modelValue,
  (val) => {
    internalValue.value = val;
  }
);
watch(internalValue, (val) => {
  if (val !== props.modelValue) emit("update:modelValue", val);
  if (!val && intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
});

function close() {
  emit("update:modelValue", false);
}

async function handleImport() {
  emit("import", importFile.value);

  importProgress.resetProgress();
  try {
    const formData = new FormData();
    formData.append("file", importFile.value);
    await axios.post("/users/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    console.log("Import request finished");
    startPolling();
  } catch (err) {
    importProgress.status = "failed";
  }
}

function startPolling() {
  intervalId = setInterval(async () => {
    try {
      const { data } = await axios.get("/users/import-progress");
      importProgress.setProgress(data);
      if (data.status === "finished" || data.status === "failed") {
        clearInterval(intervalId);
        intervalId = null;
      }
    } catch (e) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }, 1000);
}

function downloadTemplate() {
  emit("download-template");
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
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  margin: 14px 0 0 0;
  font-size: 16px;
}

.mw-file-input {
  width: 100%;
  min-width: 320px;
  max-width: 100%;
}
</style>
