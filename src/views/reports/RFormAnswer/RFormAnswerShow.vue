<script setup>
import { ref, onMounted, onBeforeUnmount, computed, reactive } from 'vue';
import { mdiAccountArrowLeft } from '@mdi/js';
import { useRouter, useRoute } from 'vue-router';
import { mdiArrowLeft, mdiChevronLeft, mdiChevronRight, mdiClose, mdiDownload, mdiLock, mdiChevronDown, mdiFilePdfBox } from '@mdi/js';
import StatusChip from '@/components/status/StatusChip.vue';
import CloseReportModal from '@/components/reports/CloseReportModal.vue';
import EditEvidenceModal from '@/components/reports/EditEvidenceModal.vue';
import ReOpenStatusModal from '@/components/reports/ReOpenStatusModal.vue';
import AssignReportModal from './modals/AssignReportModal.vue';
import ReportResponseViewer from '@/components/reports/ReportResponseViewer.vue';

import axios from '@/utils/axios';
import { useAuthStore } from '@/stores/auth';

/* ================== Permisos ================== */
const auth = useAuthStore();
function hasPermission(permission) {
  return Array.isArray(auth.user?.permissions) && auth.user.permissions.includes(permission);
}

/* ================== Protección por permiso report.view ================== */
onMounted(() => {
  if (!hasPermission('report.view')) {
    router.replace('/403');
    return;
  }
});

/* ================== Constantes UI ================== */
const router = useRouter();
const route = useRoute();
const formId = route.params.formId;
const reportId = route.params.reportId;

const FILES_BASE_URL = (import.meta.env.VITE_FILES_BASE_URL || import.meta.env.VITE_API_FILES_URL || '').replace(/\/$/, '');
const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

/* ================== Estado principal ================== */
const loading = ref(true);
const reportData = ref(null);
const formData = ref(null);
const fieldResponses = ref([]);

const reportStatus = ref('—');
const reportFolio = ref('—');
const reportScore = ref(null);
const answeredBy = ref('—');

const formFolio = ref('—');
const formName = ref('—');
const formDescription = ref('—');
const formScope = ref('—');
const formFrequency = ref('—');
const hasRating = ref(false);

/* Alcance */
const scopeFolio = ref('');
const scopeName = ref('');
const scopeLink = ref('');

/* Dialogs */
const showCloseInfo = ref(false);
const closingReport = ref(false);
const downloadingPdf = ref(false);
const showAssignReport = ref(false);
/* ================== NUEVO: Estado para cierre de reporte ================== */
const closeComments = ref('');
const closeEvidences = ref([]);

/* ================== NUEVO: Estado para edición de evidencia ================== */
const showEditEvidence = ref(false);
const editComments = ref('');
const editEvidences = ref([]);

/* ================== Helpers de archivos ================== */

function getFileNameFromUrl(urlOrObj) {
  let s =
    typeof urlOrObj === 'object' && urlOrObj
      ? urlOrObj.url || urlOrObj.path || urlOrObj.file_path || urlOrObj.storage_path || ''
      : urlOrObj;
  if (typeof s !== 'string') return '';
  try {
    if (/^https?:\/\//i.test(s)) s = new URL(s).pathname;
    const parts = s.split('/');
    return parts[parts.length - 1] || s;
  } catch {
    return s;
  }
}
function getFileExtension(file) {
  const name = typeof file === 'object' ? getFileNameFromUrl(file) : getFileNameFromUrl(String(file || ''));
  const m = name.match(/\.([a-zA-Z0-9]+)(?:\?.*)?$/);
  return m ? `.${m[1].toLowerCase()}` : '';
}
function getOriginalDocumentName(doc) {
  const name = (typeof doc === 'object' && doc?.original_name) || getFileNameFromUrl(doc) || '—';
  return name.replace(/\.pdf$/i, '');
}

function _asUrl(u) {
  return typeof u === 'object' ? u?.url : u;
}
function filterImages(list) {
  return (list || []).filter((u) => {
    const s = _asUrl(u);
    return !!s && (/^data:image/i.test(s) || /\.(jpg|jpeg|png|gif)(\?.*)?$/i.test(s));
  });
}
function filterDocuments(list) {
  return (list || []).filter((u) => {
    const s = _asUrl(u);
    return !!s && !(/^data:image/i.test(s) || /\.(jpg|jpeg|png|gif)(\?.*)?$/i.test(s));
  });
}

function extractStoragePath(fullUrl) {
  if (!fullUrl) return '';
  try {
    if (FILES_BASE_URL && fullUrl.startsWith(FILES_BASE_URL)) {
      return fullUrl.slice(FILES_BASE_URL.length).replace(/^\/+/, '');
    }
    const u = new URL(fullUrl);
    if (u.hostname.includes('s3') || u.hostname.includes('amazonaws.com')) {
      return u.pathname.replace(/^\/+/, '');
    }
    if (!/^https?:\/\//i.test(fullUrl)) return fullUrl.replace(/^\/+/, '');
    return u.pathname.replace(/^\/+/, '');
  } catch {
    return fullUrl;
  }
}

/* ========= Helpers binarios para descargas/ZIP ========= */
function dataUrlToBlob(dataUrl) {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1] || 'application/octet-stream';
  const bstr = atob(arr[1] || '');
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new Blob([u8arr], { type: mime });
}

function isS3LikeUrl(url) {
  if (typeof url !== 'string') return false;
  try {
    const h = new URL(url).hostname;
    return /(^|\.)(s3[.-].*|.*\.s3)\.amazonaws\.com$/i.test(h) || h.includes('amazonaws.com') || h.includes('.s3.');
  } catch {
    return false;
  }
}

/**
 * Devuelve bytes listos para ZIP o descarga directa.
 */
async function fetchBinaryForUrl(originalUrl) {
  if (!originalUrl) return null;
  const url = typeof originalUrl === 'object' ? originalUrl.url : originalUrl;

  if (typeof url === 'string' && url.startsWith('data:')) {
    return { bytes: dataUrlToBlob(url), ext: getFileExtension(originalUrl) || '.png' };
  }

  // Si es S3 (aunque sea firmada), SIEMPRE usa el backend para evitar CORS
  if (typeof url === 'string' && url.includes('amazonaws.com')) {
    const storagePath = extractStoragePath(url);
    if (!storagePath) return null;
    const downloadUrl = `${API_BASE_URL}/files/signed-download?path=${storagePath}`;
    const res = await axios.get(downloadUrl, { responseType: 'arraybuffer' });
    const extGuess =
      (storagePath.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '') ||
      (getFileExtension(originalUrl) || '.bin').replace('.', '');
    return { bytes: res.data, ext: `.${extGuess || 'bin'}` };
  }

  const isOurStorage =
    (FILES_BASE_URL && typeof url === 'string' && url.startsWith(FILES_BASE_URL)) ||
    (typeof url === 'string' && !/^https?:\/\//i.test(url)) ||
    (typeof url === 'string' && isS3LikeUrl(url));

  if (isOurStorage) {
    const storagePath = extractStoragePath(url);
    if (!storagePath) return null;
    const downloadUrl = `${API_BASE_URL}/files/signed-download?path=${storagePath}`;
    const res = await axios.get(downloadUrl, { responseType: 'arraybuffer' });
    const extGuess =
      (storagePath.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '') ||
      (getFileExtension(originalUrl) || '.bin').replace('.', '');
    return { bytes: res.data, ext: `.${extGuess || 'bin'}` };
  }

  // Si es una URL pública normal
  const res = await axios.get(url, { responseType: 'arraybuffer' });
  const ext = (getFileExtension(originalUrl) || '').toLowerCase() || (String(url).includes('image') ? '.png' : '.bin');
  return { bytes: res.data, ext: ext || '.bin' };
}

/* ================== Imagen modal (Cierre de Reporte) ================== */
const imageModal = reactive({
  open: false,
  src: '',
  images: [],
  index: 0,
  fieldType: ''
});
const imageZoom = reactive({
  scale: 1,
  minScale: 1,
  maxScale: 4,
  step: 0.25,
  translateX: 0,
  translateY: 0,
  isPanning: false,
  startX: 0,
  startY: 0
});
const resetZoom = () => {
  imageZoom.scale = 1;
  imageZoom.translateX = 0;
  imageZoom.translateY = 0;
  imageZoom.isPanning = false;
};
const openImageModal = (i, images = [], fieldType = '') => {
  imageModal.images = [...images];
  imageModal.index = i ?? 0;
  const c = imageModal.images[imageModal.index];
  imageModal.src = typeof c === 'object' ? c.url : c || '';
  imageModal.fieldType = fieldType;
  resetZoom();
  imageModal.open = true;
};
const nextImage = () => {
  if (imageModal.index < imageModal.images.length - 1) {
    imageModal.index++;
    const c = imageModal.images[imageModal.index];
    imageModal.src = typeof c === 'object' ? c.url : c;
    resetZoom();
  }
};
const prevImage = () => {
  if (imageModal.index > 0) {
    imageModal.index--;
    const c = imageModal.images[imageModal.index];
    imageModal.src = typeof c === 'object' ? c.url : c;
    resetZoom();
  }
};
const closeImageModal = () => {
  imageModal.open = false;
  resetZoom();
};
const onImageWheel = (e) => {
  const d = e.deltaY < 0 ? imageZoom.step : -imageZoom.step;
  const s = Math.min(imageZoom.maxScale, Math.max(imageZoom.minScale, imageZoom.scale + d));
  imageZoom.scale = s;
  if (s === imageZoom.minScale) {
    imageZoom.translateX = 0;
    imageZoom.translateY = 0;
  }
};
const onImageMouseDown = (e) => {
  if (imageZoom.scale === 1) return;
  imageZoom.isPanning = true;
  imageZoom.startX = e.clientX - imageZoom.translateX;
  imageZoom.startY = e.clientY - imageZoom.translateY;
};
const onImageMouseMove = (e) => {
  if (!imageZoom.isPanning) return;
  imageZoom.translateX = e.clientX - imageZoom.startX;
  imageZoom.translateY = e.clientY - imageZoom.startY;
};
const stopPanning = () => {
  imageZoom.isPanning = false;
};
const onImageDblClick = () => {
  if (imageZoom.scale === 1) {
    imageZoom.scale = 2;
  } else {
    resetZoom();
  }
};
const handleKeydown = (e) => {
  if (!imageModal.open) return;
  if (e.key === 'ArrowRight') {
    e.preventDefault();
    nextImage();
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    prevImage();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    closeImageModal();
  }
};
onMounted(() => window.addEventListener('keydown', handleKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown));

/* ================== Navegación & formato ================== */
const goToIndex = () => router.push({ name: 'Report Answers', params: { formId } });
const formatScope = (s) =>
  ({
    organization: 'Organización',
    business: 'Empresa',
    business_unit: 'Ubicación',
    business_unit_group: 'Grupo'
  })[s] ||
  s ||
  '—';
const formatFrequency = (f) => ({ once_per_day: 'Una vez por día', multiple_per_day: 'Múltiples veces por día' })[f] || f || '—';
function setScopeInfo(form) {
  scopeFolio.value = '';
  scopeName.value = '';
  scopeLink.value = '';
  if (!form) return;
  switch (form.assignment_scope) {
    case 'organization':
      if (form.organization) {
        scopeFolio.value = form.organization.folio;
        scopeName.value = form.organization.legal_name || form.organization.name;
        scopeLink.value = `/organizaciones/${form.organization.id}`;
      }
      break;
    case 'business':
      if (form.business) {
        scopeFolio.value = form.business.folio;
        scopeName.value = form.business.name;
        scopeLink.value = `/empresas/${form.business.id}`;
      }
      break;
    case 'business_unit':
      if (form.business_unit) {
        scopeFolio.value = form.business_unit.folio;
        scopeName.value = form.business_unit.name;
        scopeLink.value = `/ubicaciones/${form.business_unit.id}`;
      }
      break;
    case 'business_unit_group':
      if (form.business_unit_group) {
        scopeFolio.value = form.business_unit_group.id;
        scopeName.value = form.business_unit_group.name;
        scopeLink.value = `/grupos-de-ubicaciones/${form.business_unit_group.id}`;
      }
      break;
    default:
      scopeName.value = formatScope(form.assignment_scope);
  }
}

function formatDateTimeDMY(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}-${mm}-${yy} ${hh}:${min}`;
}

/* ================== Datos ================== */
const groups = ref([]);
const ungroupedFields = ref([]);

/* ================== API ================== */
async function fetchResponseDetail() {
  loading.value = true;
  try {
    const { data } = await axios.get(`/reportes/formulario/reportes/${reportId}`);
    reportData.value = data?.report || null;
    formData.value = data?.form || null;
    reportStatus.value = data?.report?.status || '—';
    reportFolio.value = data?.report?.folio || data?.report?.reportable?.folio || '—';
    reportScore.value = data?.report?.reportable?.score ?? null;
    answeredBy.value =
      data?.report?.reportable?.user?.name || data?.report?.reportable?.user?.email || data?.report?.reportable?.user_name || '—';
    formFolio.value = data?.form?.folio || '—';
    formName.value = data?.form?.name || '—';
    formDescription.value = data?.form?.description || '—';
    formScope.value = formatScope(data?.form?.assignment_scope);
    formFrequency.value = formatFrequency(data?.form?.frequency);
    hasRating.value = !!data?.form?.has_rating;
    setScopeInfo(data?.form);
    fieldResponses.value = Array.isArray(data?.field_responses)
      ? data.field_responses
      : Array.isArray(data?.report?.reportable?.field_responses)
        ? data.report.reportable.field_responses
        : [];
    groups.value = Array.isArray(data?.groups) ? data.groups : [];
    ungroupedFields.value = Array.isArray(data?.ungrouped_fields) ? data.ungrouped_fields : [];
  } finally {
    loading.value = false;
  }
}
onMounted(fetchResponseDetail);

/* ================== Descargas ================== */
async function downloadCurrentImage() {
  const url = imageModal.src;
  if (!url) return;
  try {
    const bin = await fetchBinaryForUrl(url);
    if (!bin) throw new Error('no-bytes');
    const name = `evidencia_${imageModal.index + 1}${bin.ext || '.jpg'}`;
    const blob = bin.bytes instanceof Blob ? bin.bytes : new Blob([bin.bytes]);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  } catch {
    alert('No se pudo descargar la imagen');
  }
}

async function downloadDocument(urlOrObj, originalName = 'documento') {
  try {
    const bin = await fetchBinaryForUrl(urlOrObj);
    if (!bin) throw new Error('no-bytes');
    const fromUrl = getFileNameFromUrl(urlOrObj);
    const ext = bin.ext || getFileExtension(fromUrl) || '.bin';
    const finalName = originalName && originalName !== '—' ? `${originalName}${ext}` : fromUrl || `archivo${ext}`;
    const blob = bin.bytes instanceof Blob ? bin.bytes : new Blob([bin.bytes]);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = finalName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  } catch {
    alert('No se pudo descargar el archivo.');
  }
}

/* ================== Acciones reporte ================== */
async function closeReport() {
  if (closingReport.value) return;
  closingReport.value = true;
  try {
    const payload = new FormData();
    payload.append('status', 'closed');
    if (closeComments.value) payload.append('comments', closeComments.value);
    if (closeEvidences.value?.length) {
      closeEvidences.value.forEach((file) => payload.append('evidences[]', file));
    }
    await axios.put(`/reportes/formulario/reportes/${reportId}`, payload, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    await fetchResponseDetail();
    showCloseInfo.value = false;
    closeComments.value = '';
    closeEvidences.value = [];
  } catch {
    alert('No se pudo cerrar el reporte.');
  } finally {
    closingReport.value = false;
  }
}

const downloadPdf = async () => {
  if (downloadingPdf.value) return;
  downloadingPdf.value = true;
  try {
    const createdAt = reportData.value?.created_at || reportData.value?.value?.created_at;
    const localCreatedAt = createdAt ? new Date(createdAt).toLocaleString('es-MX', { hour12: false }) : '';
    const res = await axios.get(`/reports/${reportId}/download-pdf`, {
      params: { local_created_at: localCreatedAt },
      responseType: 'arraybuffer'
    });
    const blob = new Blob([res.data], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Reporte_${reportFolio.value || reportId}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch {
    alert('No se pudo descargar el PDF.');
  } finally {
    downloadingPdf.value = false;
  }
};

/* ========== Utilidad para detectar File en cualquier entorno ========== */
function isFile(obj) {
  return typeof window !== 'undefined' && window.File && obj instanceof window.File;
}

/* ========== Evidences Preview URLs ========== */
const evidencePreviewUrls = computed(() => {
  if (!closeEvidences.value || !Array.isArray(closeEvidences.value)) return [];
  return closeEvidences.value.map((file) => {
    if (isFile(file) && window.URL?.createObjectURL) {
      return window.URL.createObjectURL(file);
    }
    return '';
  });
});

/* ========== Edit Evidence Preview URLs ========== */
const editEvidencePreviewUrls = computed(() => {
  if (!editEvidences.value || !Array.isArray(editEvidences.value)) return [];
  return editEvidences.value.map((file) => {
    if (isFile(file) && window.URL?.createObjectURL) {
      return window.URL.createObjectURL(file);
    }
    if (typeof file === 'string') return file;
    if (typeof file === 'object' && file?.url) return file.url;
    return '';
  });
});

/* ========== Abrir modal edición de evidencia ========== */
function openEditEvidenceModal() {
  editComments.value = reportData.value?.comments || '';
  editEvidences.value = Array.isArray(reportData.value?.evidences) ? [...reportData.value.evidences] : [];
  showEditEvidence.value = true;
}

/* ========== Guardar edición de evidencia ========== */
async function saveEvidenceEdit() {
  try {
    const payload = new FormData();
    payload.append('comments', editComments.value || '');
    payload.append('status', 'closed');
    if (editEvidences.value?.length) {
      editEvidences.value.forEach((file, index) => {
        if (isFile(file)) {
          payload.append(`evidences[${index}]`, file);
        } else if (typeof file === 'string') {
          payload.append(`existing_evidences[${index}]`, file);
        }
      });
    }
    await axios.put(`/reportes/formulario/reportes/${reportId}`, payload, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    await fetchResponseDetail();
    showEditEvidence.value = false;
  } catch (error) {
    console.error('Error al guardar la evidencia:', error);
    alert('No se pudo guardar la evidencia.');
  }
}

const showReopenInfo = ref(false);
const reopeningReport = ref(false);

async function handleReopenReport() {
  reopeningReport.value = true;
  try {
    await axios.put(`/reportes/formulario/reportes/${reportId}`, { status: 'open' });
    await fetchResponseDetail(); // Refresca los datos del reporte
    showReopenInfo.value = false;
  } catch (error) {
    console.error('Error al reabrir el reporte:', error);
    alert('No se pudo reabrir el reporte.');
  } finally {
    reopeningReport.value = false;
  }
}

const asignReport = () => {
  showAssignReport.value = true;
};

const onReportAssigned = () => {
  fetchResponseDetail();
};
</script>

<template>
  <v-container fluid>
    <!-- Header -->
    <v-row class="align-center mb-6" no-gutters>
      <v-col cols="auto" class="d-flex align-center">
        <v-btn
          icon
          variant="text"
          class="px-3 py-2"
          style="border-radius: 8px; border: 1px solid #ccc; min-width: 44px; height: 44px"
          @click="goToIndex"
        >
          <v-icon :icon="mdiArrowLeft" />
        </v-btn>
        <h3 class="font-weight-medium ml-3 mb-0 d-none d-md-block">
          Reporte <span v-if="!loading">- {{ reportFolio }}</span>
          <v-progress-circular v-else indeterminate size="20" color="primary" class="ml-2" />
        </h3>
        <h3 class="font-weight-medium ml-3 mb-0 d-block d-md-none">
          <span v-if="!loading">R-{{ reportFolio }}</span>
          <v-progress-circular v-else indeterminate size="20" color="primary" class="ml-2" />
        </h3>
      </v-col>
      <v-spacer />
      <v-col cols="auto" class="d-flex align-center">
        <v-menu location="bottom end">
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              variant="text"
              class="px-3 py-2"
              style="border-radius: 8px; border: 1px solid #ccc; min-width: 44px; height: 44px"
            >
              Opciones <v-icon :icon="mdiChevronDown" end size="18" />
            </v-btn>
          </template>
          <v-list class="custom-dropdown elevation-1 rounded-lg" style="min-width: 200px">
            <v-list-item @click="downloadPdf">
              <template #prepend><v-icon :icon="mdiFilePdfBox" size="18" /></template>
              <v-list-item-title>Descargar PDF</v-list-item-title>
            </v-list-item>
            <template v-if="reportStatus === 'open'">
              <v-divider class="my-1" />
              <v-list-item v-if="hasPermission('report.update')" @click="showCloseInfo = true">
                <template #prepend>
                  <v-icon :icon="mdiLock" size="18" />
                </template>
                <v-list-item-title>Cerrar reporte</v-list-item-title>
              </v-list-item>
              <v-divider class="my-1" />
              <v-list-item @click="asignReport()">
                <template #prepend>
                  <v-icon :icon="mdiAccountArrowLeft" size="18" />
                </template>
                <v-list-item-title>Asignar reporte</v-list-item-title>
              </v-list-item>
            </template>
            <!-- Nueva opción para reabrir reporte -->
            <template v-if="reportStatus === 'closed' && formData?.organization?.id === 3 && auth.user?.organization_id === 3">
              <v-divider class="my-1" />
              <v-list-item @click="showReopenInfo = true">
                <template #prepend>
                  <v-icon :icon="mdiLock" size="18" />
                </template>
                <v-list-item-title>Reabrir reporte</v-list-item-title>
              </v-list-item>
            </template>
          </v-list>
        </v-menu>
      </v-col>
    </v-row>

    <CloseReportModal
      :showCloseInfo="showCloseInfo"
      :closeComments="closeComments"
      :closeEvidences="closeEvidences"
      :evidencePreviewUrls="evidencePreviewUrls"
      :closingReport="closingReport"
      @update:showCloseInfo="(val) => (showCloseInfo = val)"
      @update:closeComments="(val) => (closeComments = val)"
      @update:closeEvidences="(val) => (closeEvidences = val)"
      @closeReport="closeReport"
    />

    <EditEvidenceModal
      :showEditEvidence="showEditEvidence"
      :editComments="editComments"
      :editEvidences="editEvidences"
      :editEvidencePreviewUrls="editEvidencePreviewUrls"
      :closingReport="closingReport"
      @update:showEditEvidence="(val) => (showEditEvidence = val)"
      @update:editComments="(val) => (editComments = val)"
      @update:editEvidences="(val) => (editEvidences = val)"
      @saveEvidenceEdit="saveEvidenceEdit"
    />

    <AssignReportModal
      v-model="showAssignReport"
      :report-id="reportId"
      :organization-id="formData?.organization?.id"
      :assigned-user="reportData?.assigned_user"
      @assigned="onReportAssigned"
    />

    <!-- Info general -->
    <v-row v-if="formData">
      <v-col cols="12" md="4" class="d-flex justify-center align-center">
        <template v-if="formData.logo">
          <v-img :src="formData.logo" max-width="320" max-height="320" class="rounded-lg logo-avatar" alt="Logo" style="background: none" />
        </template>
        <template v-else>
          <div
            class="d-flex align-center justify-center logo-avatar"
            style="width: 320px; height: 320px; background: #f5f5f5; border-radius: 12px"
          >
            <span class="text-medium-emphasis">Sin logo</span>
          </div>
        </template>
      </v-col>
      <v-col cols="12" md="8">
        <v-card-title class="font-weight-bold text-h6 pb-2" style="padding-left: 0.5rem">Información general</v-card-title>
        <v-table class="rounded-lg elevation-1 card-shadow">
          <tbody>
            <tr>
              <td class="key">Estatus</td>
              <td><StatusChip v-if="reportStatus !== '—'" :status="reportStatus" /><span v-else>—</span></td>
            </tr>
            <tr>
              <td class="key">Folio</td>
              <td>
                <span>{{ reportFolio }}</span>
              </td>
            </tr>
            <tr>
              <td class="key">Formulario</td>
              <td>
                <span>{{ formFolio }} - {{ formName }}</span>
              </td>
            </tr>
            <tr>
              <td class="key">Descripción</td>
              <td>{{ formDescription }}</td>
            </tr>
            <tr>
              <td class="key">Alcance</td>
              <td>
                <template v-if="scopeLink && scopeFolio && scopeName">
                  <a :href="scopeLink" style="color: #1976d2; text-decoration: underline">{{ scopeFolio }} - {{ scopeName }}</a>
                </template>
                <template v-else>{{ formScope }}</template>
              </td>
            </tr>
            <tr>
              <td class="key">Frecuencia</td>
              <td>{{ formFrequency }}</td>
            </tr>
            <tr v-if="hasRating">
              <td class="key">Score obtenido</td>
              <td>
                <span v-if="reportScore !== null">{{ Number(reportScore).toFixed(2) }}</span
                ><span v-else>—</span>
              </td>
            </tr>
            <tr>
              <td class="key">Contestado por</td>
              <td>
                <span>{{ answeredBy }}</span>
              </td>
            </tr>
            <tr>
              <td class="key">Contestado el</td>
              <td>
                <span>{{ reportData?.created_at ? formatDateTimeDMY(reportData.created_at) : '—' }}</span>
              </td>
            </tr>
            <tr>
              <td class="key">Asignado a</td>
              <td>
                <span>{{ [reportData?.assigned_user?.name, reportData?.assigned_user?.email].filter(Boolean).join(' - ') || 'N/A' }}</span>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-col>
    </v-row>

    <!-- Campos y grupos -->

    <v-row v-if="formData?.fields">
      <v-col cols="12">
        <ReportResponseViewer
          :report-data="reportData"
          :form-data="formData"
          :field-responses="fieldResponses"
          :groups="groups"
          :ungrouped-fields="ungroupedFields"
          :report-folio="reportFolio"
        />
      </v-col>
    </v-row>

    <!-- Cierre de Reporte: solo si el reporte está cerrado y hay comentarios o evidencias -->
    <template
      v-if="reportStatus === 'closed' && (reportData?.comments || (Array.isArray(reportData?.evidences) && reportData.evidences.length))"
    >
      <div class="mt-8">
        <div style="display: flex; align-items: center; justify-content: space-between">
          <div class="font-weight-bold text-h6 pb-2" style="padding-left: 0.5rem; font-size: 1.25rem">Cierre de Reporte</div>
          <!-- Botón Editar Evidencia solo para organización 3 y usuarios de esa organización -->
          <v-btn
            v-if="formData?.organization?.id === 3 && auth.user?.organization_id === 3"
            color="primary"
            variant="outlined"
            style="margin-right: 0; margin-bottom: 8px"
            @click="openEditEvidenceModal"
          >
            Editar Evidencia
          </v-btn>
        </div>
        <v-divider class="mb-6" />

        <!-- Card de Comentarios -->
        <v-card v-if="reportData?.comments" class="rounded-lg elevation-1 pa-0 card-business-unit mb-4">
          <v-card-text>
            <div class="field-label mb-2">Comentarios</div>
            <div class="answer-row-bg">{{ reportData.comments }}</div>
          </v-card-text>
        </v-card>

        <!-- Card de Evidencias -->
        <v-card
          v-if="Array.isArray(reportData?.evidences) && reportData.evidences.length"
          class="rounded-lg elevation-1 pa-0 card-business-unit mb-4"
        >
          <v-card-text>
            <div class="field-label mb-2">Evidencias</div>
            <div class="image-preview-row">
              <img
                v-for="(img, i) in filterImages(reportData.evidences)"
                :key="i"
                :src="typeof img === 'object' ? img.url : img"
                alt="Evidencia"
                style="width: 120px; height: 120px; object-fit: cover; border-radius: 8px; border: 1px solid #eee"
                @click="openImageModal(i, filterImages(reportData.evidences), 'image')"
              />
              <span v-if="!filterImages(reportData.evidences).length">—</span>
            </div>
            <div v-if="filterDocuments(reportData.evidences).length" class="document-list" style="margin-top: 16px">
              <div v-for="(doc, i) in filterDocuments(reportData.evidences)" :key="i" class="document-card">
                <v-icon
                  :icon="
                    ['.pdf'].includes(getFileExtension(doc))
                      ? 'mdi-file-pdf-box'
                      : ['.doc', '.docx'].includes(getFileExtension(doc))
                        ? 'mdi-file-word-box'
                        : ['.xls', '.xlsx'].includes(getFileExtension(doc))
                          ? 'mdi-file-excel-box'
                          : ['.ppt', '.pptx'].includes(getFileExtension(doc))
                            ? 'mdi-file-powerpoint-box'
                            : /\.(jpg|jpeg|png|gif)$/i.test(_asUrl(doc))
                              ? 'mdi-file-image-box'
                              : 'mdi-file-document-box'
                  "
                  size="32"
                  color="primary"
                  class="mr-2"
                />
                <div class="document-info">
                  <div class="document-title">
                    {{ getOriginalDocumentName(doc) }}
                    <span class="document-ext">{{ getFileExtension(doc) }}</span>
                  </div>
                </div>
                <v-btn
                  icon
                  variant="text"
                  color="primary"
                  class="document-download-btn"
                  aria-label="Descargar documento"
                  @click="downloadDocument(doc, getOriginalDocumentName(doc))"
                >
                  <v-icon :icon="mdiDownload" />
                </v-btn>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </div>
    </template>

    <!-- Viewer de imagen -->
    <v-dialog v-model="imageModal.open" fullscreen>
      <v-card class="image-fullscreen-card">
        <div class="image-fullscreen-toolbar">
          <v-btn
            v-if="imageModal.fieldType !== 'signature'"
            icon
            variant="text"
            color="grey-darken-2"
            class="image-toolbar-btn"
            aria-label="Descargar imagen"
            @click="downloadCurrentImage"
            ><v-icon :icon="mdiDownload" />
          </v-btn>
          <v-btn icon variant="text" color="grey-darken-2" class="image-toolbar-btn" aria-label="Cerrar" @click="closeImageModal"
            ><v-icon :icon="mdiClose" />
          </v-btn>
        </div>
        <div class="image-fullscreen-wrapper">
          <v-btn
            v-if="imageModal.images.length > 1"
            icon
            variant="text"
            color="grey-darken-2"
            :disabled="imageModal.index === 0"
            @click="prevImage"
            class="image-fullscreen-arrow image-fullscreen-arrow-left"
            ><v-icon :icon="mdiChevronLeft" />
          </v-btn>
          <div
            class="image-zoom-container"
            @wheel.prevent="onImageWheel"
            @mousedown.prevent="onImageMouseDown"
            @mousemove="onImageMouseMove"
            @mouseup="stopPanning"
            @mouseleave="stopPanning"
            @dblclick="onImageDblClick"
          >
            <v-img
              :src="imageModal.src"
              class="image-fullscreen-img"
              max-height="calc(100vh - 120px)"
              :style="{
                transform: `translate(${imageZoom.translateX}px, ${imageZoom.translateY}px) scale(${imageZoom.scale})`,
                cursor: imageZoom.isPanning ? 'grabbing' : imageZoom.scale > 1 ? 'grab' : 'zoom-in'
              }"
            />
          </div>
          <v-btn
            v-if="imageModal.images.length > 1"
            icon
            variant="text"
            color="grey-darken-2"
            :disabled="imageModal.index === imageModal.images.length - 1"
            @click="nextImage"
            class="image-fullscreen-arrow image-fullscreen-arrow-right"
            ><v-icon :icon="mdiChevronRight" />
          </v-btn>
        </div>
        <v-card-actions class="image-fullscreen-footer">
          <div v-if="imageModal.images.length > 1" class="image-fullscreen-counter">
            {{ imageModal.index + 1 }} / {{ imageModal.images.length }}
          </div>
          <v-spacer />
        </v-card-actions>
      </v-card>
    </v-dialog>
    <ReOpenStatusModal
      :showReopenInfo="showReopenInfo"
      :reopeningReport="reopeningReport"
      @update:showReopenInfo="(val) => (showReopenInfo = val)"
      @reopenReport="handleReopenReport"
    />
  </v-container>
</template>

<style scoped src="@/styles/report_answer_show.css"></style>
