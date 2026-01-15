<script setup>
import { ref, onMounted, computed, reactive } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import {
  mdiArrowLeft,
  mdiChevronDown,
  mdiFolderZipOutline,
  mdiDownload,
  mdiFilePdfBox,
  mdiMagnify,
  mdiClose,
  mdiChevronLeft,
  mdiChevronRight,
} from "@mdi/js";
import axios from "@/utils/axios";
import JSZip from "jszip";

const router = useRouter();
const route = useRoute();

const reportId = route.params.reportId;
const fieldId = route.params.fieldId;

const loading = ref(true);
const error = ref("");
const fieldResponse = ref(null);
const reportFolio = ref("");
const questionName = ref("");
const evidenceFiles = ref([]);
const isRequired = ref(false);

const auth = useAuthStore();
function hasPermission(permission) {
  return (
    Array.isArray(auth.user?.permissions) && auth.user.permissions.includes(permission)
  );
}

onMounted(() => {
  if (!hasPermission("report.view")) {
    router.replace("/403");
    return;
  }
});

// ========== helpers de normalización ==========
function safeJSONParse(v) {
  try {
    return typeof v === "string" ? JSON.parse(v) : v;
  } catch {
    return v;
  }
}

const IMG_EXT = /\.(jpg|jpeg|png|gif|webp|bmp|tif|tiff)$/i;
function looksLikeImageUrl(u = "") {
  return typeof u === "string" && (IMG_EXT.test(u) || u.startsWith("data:image"));
}

function normalizeEvidence(input) {
  if (!input) return [];
  let val = safeJSONParse(input);

  if (
    val &&
    typeof val === "object" &&
    !Array.isArray(val) &&
    (val.url || val.original_name)
  ) {
    return [val];
  }
  if (Array.isArray(val)) {
    return val
      .map((it) => (typeof it === "string" ? { url: it } : it))
      .filter((it) => it && it.url);
  }
  if (typeof val === "string") {
    if (val.trim().startsWith("{") || val.trim().startsWith("[")) {
      const parsed = safeJSONParse(val);
      return normalizeEvidence(parsed);
    }
    return [{ url: val }];
  }
  return [];
}

function filterImagesFrom(arr) {
  return (arr || []).filter((it) => it?.url && looksLikeImageUrl(it.url));
}
function filterDocumentsFrom(arr) {
  return (arr || []).filter((it) => {
    const url = it?.url || "";
    const ext = getFileExtension(url);
    return [
      "pdf",
      "doc",
      "docx",
      "xls",
      "xlsx",
      "ppt",
      "pptx",
      "txt",
      "csv",
      "zip",
      "rar",
    ].includes(ext);
  });
}

function getFileExtension(fileName) {
  if (!fileName) return "";
  const name = typeof fileName === "object" ? fileName.url : fileName;
  return (name.split("?")[0].split(".").pop() || "").toLowerCase();
}
function getOriginalDocumentName(doc) {
  if (!doc) return "";
  const name =
    doc.original_name ||
    doc.name ||
    (doc.url ? doc.url.split("/").pop().split("?")[0] : "");
  return (name || "").replace(/\.pdf$/i, "");
}
function getFileIcon(ext) {
  switch (ext) {
    case "pdf":
      return mdiFilePdfBox;
    case "doc":
    case "docx":
      return "mdi-file-word-box";
    case "xls":
    case "xlsx":
      return "mdi-file-excel-box";
    case "ppt":
    case "pptx":
      return "mdi-file-powerpoint-box";
    case "txt":
      return "mdi-file-document-outline";
    case "csv":
      return "mdi-file-delimited-outline";
    case "zip":
    case "rar":
      return mdiFolderZipOutline;
    default:
      return "mdi-file-document-outline";
  }
}

// ========== fetch ==========
const fetchFieldResponse = async () => {
  loading.value = true;
  error.value = "";
  try {
    const { data } = await axios.get(`/reports/${reportId}/field-response/${fieldId}`);
    fieldResponse.value = data.field_response;
    questionName.value = data.field_response?.field_label || "";
    isRequired.value = !!data.field_response?.required;

    // Folio directo de la respuesta del backend
    reportFolio.value = data.report_folio || `#${reportId}`;

    let norm = normalizeEvidence(data.field_response?.evidence_files);

    if (!norm.length) {
      const v = safeJSONParse(data.field_response?.value);
      if (v && (v.url || Array.isArray(v) || typeof v === "string")) {
        norm = normalizeEvidence(v);
      }
    }

    evidenceFiles.value = norm;
  } catch (e) {
    error.value = "No se pudo cargar la información.";
  } finally {
    loading.value = false;
  }
};
onMounted(fetchFieldResponse);

// ========== UI helpers ==========
const images = computed(() => filterImagesFrom(evidenceFiles.value));
const documents = computed(() => filterDocumentsFrom(evidenceFiles.value));

const displayValue = computed(() => {
  const v = fieldResponse.value?.value;
  if (v == null) return "—";
  if (typeof v === "object") return "—";
  const s = String(v).trim();
  if (s.startsWith("{") || s.startsWith("[")) return "—";
  return s || "—";
});

function goToIndex() {
  router.back();
}

// ========== Descargar documento igual que modal ==========
async function downloadDocument(urlOrObj, originalName = "documento") {
  let url = typeof urlOrObj === "object" ? urlOrObj.url : urlOrObj;
  if (!url) return;

  // Extraer storage path (soporta URLs absolutas y relativas)
  let storagePath = "";
  try {
    if (url.startsWith("http")) {
      const urlObj = new URL(url);
      storagePath = decodeURIComponent(urlObj.pathname.replace(/^\/+/, ""));
    } else if (url.startsWith("/storage/") || url.startsWith("storage/")) {
      storagePath = decodeURIComponent(url.replace(/^\/?storage\//, ""));
    } else {
      storagePath = decodeURIComponent(url.replace(/^\/+/, ""));
    }
  } catch {
    storagePath = decodeURIComponent(url.replace(/^\/+/, ""));
  }

  // Sugerir nombre con extensión real
  const fromUrl = url.split("/").pop() || originalName;
  const ext = (fromUrl.split(".").pop() || "").toLowerCase();
  const safeExt = ext.match(/^[a-z0-9]+$/i) ? ext : "pdf";
  const finalName =
    originalName && originalName !== "—"
      ? `${originalName}.${safeExt}`
      : fromUrl || "archivo";

  try {
    const apiUrl = `/files/signed-download?path=${encodeURIComponent(storagePath)}`;
    const res = await axios.get(apiUrl, { responseType: "blob" });
    const blob = new Blob([res.data]);
    const a = document.createElement("a");
    a.href = window.URL.createObjectURL(blob);
    a.download = finalName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(a.href);
  } catch (err) {
    console.error("Error descargando documento:", err);
    alert("No se pudo descargar el documento.");
  }
}

// ========== Descargar ZIP de imágenes y documentos ==========
async function downloadZip() {
  const imgs = images.value;
  const docs = documents.value;
  if (!imgs.length && !docs.length) {
    alert("No hay imágenes ni documentos de evidencia para descargar.");
    return;
  }
  const zip = new JSZip();
  const safeLabel = (questionName.value || "evidencia")
    .replace(/[^\w\s-]/gi, "")
    .replace(/\s+/g, "_");
  const zipName = `${reportFolio.value} - ${safeLabel}.zip`;

  // Helper para agregar archivo al ZIP solo si es válido
  async function addToZip(fileUrl, fileName) {
    let storagePath = "";
    if (fileUrl.startsWith("http")) {
      const urlObj = new URL(fileUrl);
      storagePath = decodeURIComponent(urlObj.pathname.replace(/^\/+/, ""));
    } else if (fileUrl.startsWith("/storage/") || fileUrl.startsWith("storage/")) {
      storagePath = decodeURIComponent(fileUrl.replace(/^\/?storage\//, ""));
    } else {
      storagePath = decodeURIComponent(fileUrl.replace(/^\/+/, ""));
    }
    const apiUrl = `/files/signed-download?path=${encodeURIComponent(storagePath)}`;
    try {
      const response = await axios.get(apiUrl, { responseType: "blob" });
      if (response.status !== 200 || !response.data || response.data.size === 0) {
        console.warn("Archivo no válido o vacío:", apiUrl);
        return;
      }
      // Opcional: verifica si es error HTML/JSON
      const contentType = response.headers["content-type"] || "";
      if (contentType.includes("text/html") || contentType.includes("application/json")) {
        const text = await response.data.text();
        console.warn("Respuesta no binaria:", text.slice(0, 200));
        return;
      }
      const buffer = await response.data.arrayBuffer();
      zip.file(fileName, buffer);
    } catch (err) {
      console.error("Error descargando para ZIP:", apiUrl, err);
    }
  }

  // Agregar imágenes
  for (let i = 0; i < imgs.length; i++) {
    const img = imgs[i];
    const imgUrl = img.url;
    const ext = (imgUrl.split(".").pop() || "jpg").split("?")[0];
    await addToZip(imgUrl, `evidencia_${i + 1}.${ext}`);
  }

  // Agregar documentos
  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    const docUrl = doc.url;
    const ext = (docUrl.split(".").pop() || "pdf").split("?")[0];
    await addToZip(docUrl, `documento_${i + 1}.${ext}`);
  }

  try {
    const content = await zip.generateAsync({ type: "blob" });
    if (content.size === 0) {
      alert("No se pudieron descargar los archivos. El ZIP está vacío.");
      return;
    }
    const a = document.createElement("a");
    a.href = window.URL.createObjectURL(content);
    a.download = zipName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(a.href);
  } catch (err) {
    console.error("Error generando o descargando el ZIP:", err);
    alert("No se pudo generar el ZIP.");
  }
}

// ========== Modal de imagen ==========
const showImageModal = ref(false);
const modalImageIndex = ref(0);
const filteredImages = computed(() => images.value);

// ===== ZOOM Y PANEO EN MODAL DE IMAGEN =====
const imageZoom = reactive({
  scale: 1,
  minScale: 1,
  maxScale: 4,
  step: 0.25,
  translateX: 0,
  translateY: 0,
  isPanning: false,
  startX: 0,
  startY: 0,
});

function resetZoom() {
  imageZoom.scale = 1;
  imageZoom.translateX = 0;
  imageZoom.translateY = 0;
  imageZoom.isPanning = false;
}

function onImageWheel(e) {
  const delta = e.deltaY < 0 ? imageZoom.step : -imageZoom.step;
  const newScale = Math.min(
    imageZoom.maxScale,
    Math.max(imageZoom.minScale, imageZoom.scale + delta)
  );
  if (newScale !== imageZoom.scale) {
    imageZoom.scale = newScale;
    if (newScale === imageZoom.minScale) {
      imageZoom.translateX = 0;
      imageZoom.translateY = 0;
    }
  }
}

function onImageMouseDown(e) {
  if (imageZoom.scale === 1) return;
  imageZoom.isPanning = true;
  imageZoom.startX = e.clientX - imageZoom.translateX;
  imageZoom.startY = e.clientY - imageZoom.translateY;
}

function onImageMouseMove(e) {
  if (!imageZoom.isPanning) return;
  imageZoom.translateX = e.clientX - imageZoom.startX;
  imageZoom.translateY = e.clientY - imageZoom.startY;
}

function stopPanning() {
  imageZoom.isPanning = false;
}

function onImageDblClick() {
  if (imageZoom.scale === 1) {
    imageZoom.scale = 2;
  } else {
    resetZoom();
  }
}

function openImageModal(idx) {
  modalImageIndex.value = idx;
  showImageModal.value = true;
  resetZoom();
}
function closeImageModal() {
  showImageModal.value = false;
  resetZoom();
}
function prevImage() {
  if (modalImageIndex.value > 0) modalImageIndex.value--;
  resetZoom();
}
function nextImage() {
  if (modalImageIndex.value < filteredImages.value.length - 1) modalImageIndex.value++;
  resetZoom();
}
function downloadCurrentImage() {
  const img = filteredImages.value[modalImageIndex.value];
  if (img) {
    const num = modalImageIndex.value + 1;
    downloadDocument(img, `evidencia_${num}`);
  }
}
</script>

<template>
  <v-container fluid>
    <!-- HEADER -->
    <v-row class="align-center mb-6" no-gutters>
      <v-col cols="auto" class="d-flex align-center">
        <v-btn icon variant="text" class="px-3 py-2 header-btn" @click="goToIndex">
          <v-icon :icon="mdiArrowLeft" />
        </v-btn>
        <h3 class="font-weight-medium ml-3 mb-0 d-none d-md-block">
          {{ reportFolio }}
          <span v-if="questionName">
            - {{ questionName }}<span v-if="isRequired" class="asterisk">*</span>
          </span>
        </h3>
        <h3 class="font-weight-medium ml-3 mb-0 d-block d-md-none">{{ reportFolio }}</h3>
      </v-col>
      <v-col class="d-flex justify-end align-center">
        <v-menu location="bottom end">
          <template #activator="{ props }">
            <v-btn v-bind="props" variant="text" class="px-3 py-2 header-btn">
              Opciones
              <v-icon :icon="mdiChevronDown" end size="18" />
            </v-btn>
          </template>
          <v-list class="custom-dropdown elevation-1 rounded-lg" style="min-width: 200px">
            <v-list-item @click="downloadZip">
              <template #prepend
                ><v-icon :icon="mdiFolderZipOutline" size="18"
              /></template>
              <v-list-item-title>Descargar ZIP</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </v-col>
    </v-row>

    <!-- BODY -->
    <v-row>
      <v-col>
        <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>
        <v-progress-circular v-if="loading" indeterminate color="primary" />

        <template v-else-if="fieldResponse">
          <v-card class="pa-6">
            <h4 class="mb-4">
              {{ questionName }}
              <span v-if="isRequired" class="asterisk">*</span>
            </h4>
            <div class="mt-4">
              <div
                v-if="
                  filterImagesFrom(evidenceFiles).length ||
                  filterDocumentsFrom(evidenceFiles).length
                "
                class="answer-row-bg"
                style="
                  background: #f7f7f7;
                  border-radius: 8px;
                  padding: 10px 14px;
                  position: relative;
                "
              >
                <!-- Imágenes -->
                <div
                  class="image-preview-row"
                  style="display: flex; flex-wrap: wrap; gap: 12px"
                >
                  <img
                    v-for="(img, i) in filterImagesFrom(evidenceFiles)"
                    :key="i"
                    :src="typeof img === 'object' ? img.url : img"
                    alt="Evidencia"
                    style="
                      width: 120px;
                      height: 120px;
                      object-fit: cover;
                      border-radius: 8px;
                      border: 1px solid #eee;
                      cursor: pointer;
                    "
                    @click="openImageModal(i)"
                  />
                </div>
                <!-- Documentos -->
                <div class="document-list" style="margin-top: 16px">
                  <div
                    v-for="(doc, i) in filterDocumentsFrom(evidenceFiles)"
                    :key="i"
                    class="document-card"
                    style="
                      display: flex;
                      align-items: center;
                      background: #fff;
                      border-radius: 12px;
                      box-shadow: 0px 2px 8px 0px rgba(60, 60, 60, 0.08);
                      border: 1px solid #eaeaea;
                      margin-bottom: 12px;
                      padding: 10px 16px;
                    "
                  >
                    <div class="document-info" style="flex: 1">
                      <div class="document-title" style="font-weight: 500">
                        {{ getOriginalDocumentName(doc) }}
                        <span
                          class="document-ext"
                          style="color: #888; font-size: 0.95em; margin-left: 6px"
                        >
                          {{ getFileExtension(typeof doc === "object" ? doc.url : doc) }}
                        </span>
                      </div>
                    </div>
                    <v-btn
                      icon
                      variant="text"
                      color="black"
                      class="document-download-btn"
                      aria-label="Descargar documento"
                      @click="downloadDocument(doc, getOriginalDocumentName(doc))"
                    >
                      <v-icon :icon="mdiDownload" size="22" color="black" />
                    </v-btn>
                  </div>
                </div>
              </div>
              <div v-else class="mt-2">Sin evidencia</div>
            </div>
          </v-card>
        </template>
      </v-col>
    </v-row>

    <!-- MODAL DE IMAGEN BLANCO Y FULL SCREEN -->
    <v-dialog v-model="showImageModal" fullscreen persistent class="white-modal-dialog">
      <template #default>
        <div class="white-modal-overlay">
          <div class="white-modal-card">
            <div
              style="
                position: absolute;
                top: 24px;
                right: 32px;
                display: flex;
                align-items: center;
                z-index: 2;
              "
            >
              <v-btn
                icon
                color="black"
                variant="text"
                @click="downloadCurrentImage"
                class="white-modal-download"
                style="margin-right: 4px"
                aria-label="Descargar imagen"
              >
                <v-icon :icon="mdiDownload" size="22" color="black" />
              </v-btn>
              <button
                class="white-modal-close"
                @click="closeImageModal"
                aria-label="Cerrar modal"
                style="padding: 4px"
              >
                <v-icon :icon="mdiClose" size="22" color="black" />
              </button>
            </div>
            <div class="white-modal-content">
              <div
                class="white-modal-image-nav"
                style="position: relative; width: 100%; height: 100%"
              >
                <button
                  class="white-modal-arrow"
                  :disabled="modalImageIndex === 0"
                  @click="prevImage"
                  style="
                    position: absolute;
                    left: 0;
                    top: 50%;
                    transform: translateY(-50%);
                    z-index: 3;
                  "
                  v-if="filteredImages.length > 1"
                >
                  <v-icon :icon="mdiChevronLeft" size="40" />
                </button>
                <div class="white-modal-image-container" style="position: relative">
                  <img
                    :src="filteredImages[modalImageIndex]?.url"
                    :alt="getOriginalDocumentName(filteredImages[modalImageIndex])"
                    class="white-modal-image"
                    :style="{
                      transform: `translate(${imageZoom.translateX}px, ${imageZoom.translateY}px) scale(${imageZoom.scale})`,
                      cursor: imageZoom.isPanning
                        ? 'grabbing'
                        : imageZoom.scale > 1
                        ? 'grab'
                        : 'zoom-in',
                    }"
                    @wheel.prevent="onImageWheel"
                    @mousedown.prevent="onImageMouseDown"
                    @mousemove="onImageMouseMove"
                    @mouseup="stopPanning"
                    @mouseleave="stopPanning"
                    @dblclick="onImageDblClick"
                  />
                  <!-- Título eliminado -->
                </div>
                <button
                  class="white-modal-arrow"
                  :disabled="modalImageIndex === filteredImages.length - 1"
                  @click="nextImage"
                  style="
                    position: absolute;
                    right: 0;
                    top: 50%;
                    transform: translateY(-50%);
                    z-index: 3;
                  "
                  v-if="filteredImages.length > 1"
                >
                  <v-icon :icon="mdiChevronRight" size="40" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>
    </v-dialog>
  </v-container>
</template>

<style scoped src="@/styles/rform_answer.css"></style>
