<script setup>
/**
 * Componente compartido para renderizar las respuestas de un reporte.
 * Usado en RFormAnswerShow y AssignedReportShow.
 */
import { computed, reactive, onMounted, onBeforeUnmount } from 'vue';
import { mdiChevronLeft, mdiChevronRight, mdiClose, mdiDownload, mdiChevronDown, mdiChevronUp, mdiFolderZipOutline } from '@mdi/js';
import axios from '@/utils/axios';
import JSZip from 'jszip';
import GoogleMap from '@/utils/helpers/google/GoogleMap.vue';

const props = defineProps({
  reportData: { type: Object, default: null },
  formData: { type: Object, default: null },
  fieldResponses: { type: Array, default: () => [] },
  groups: { type: Array, default: () => [] },
  ungroupedFields: { type: Array, default: () => [] },
  reportFolio: { type: String, default: '—' }
});

const FILES_BASE_URL = (import.meta.env.VITE_FILES_BASE_URL || import.meta.env.VITE_API_FILES_URL || '').replace(/\/$/, '');
const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const SEMAFORO_COLORS = { Alto: '#e53935', Medio: '#ffd600', Bajo: '#43a047' };
const SEMAFORO_PASTEL = { Alto: '#ffebee', Medio: '#fffde7', Bajo: '#e8f5e9' };
const OPTION_KEYS = {
  alto: 'Alto',
  alta: 'Alto',
  high: 'Alto',
  rojo: 'Alto',
  medio: 'Medio',
  media: 'Medio',
  amarillo: 'Medio',
  medium: 'Medio',
  bajo: 'Bajo',
  baja: 'Bajo',
  low: 'Bajo',
  verde: 'Bajo'
};
const mapOptionKey = (opt) => {
  const k = String(opt ?? '')
    .trim()
    .toLowerCase();
  return OPTION_KEYS[k] || (['alto', 'medio', 'bajo'].includes(k) ? k[0].toUpperCase() + k.slice(1) : opt);
};
const isSemaforo = (field) => {
  const type = String(field?.type || '').toLowerCase();
  if (type === 'semaforo') return true;
  if (field?.attributes?.kind === 'semaforo' || field?.attributes?.display === 'semaforo') return true;
  const opts = (field?.options || []).map((o) => String(o).trim().toLowerCase());
  const has = (arr, any) => arr.some((o) => any.includes(o));
  return (
    type === 'radio' &&
    has(opts, ['alto', 'alta', 'rojo', 'high']) &&
    has(opts, ['medio', 'media', 'amarillo', 'medium']) &&
    has(opts, ['bajo', 'baja', 'verde', 'low'])
  );
};
const chipStyleFilled = (option, isSelected) => {
  const key = mapOptionKey(option);
  const base = SEMAFORO_COLORS[key] || '#9e9e9e';
  const pastel = SEMAFORO_PASTEL[key] || '#f5f5f5';
  const text = key === 'Medio' ? '#111' : '#fff';
  return {
    background: isSelected ? base : pastel,
    color: isSelected ? text : '#222',
    border: 'none',
    padding: '4px 10px',
    fontWeight: isSelected ? '700' : '600',
    boxShadow: isSelected ? '0 0 0 2px rgba(0,0,0,.06), 0 2px 8px rgba(0,0,0,.12)' : 'none',
    transform: isSelected ? 'translateY(-1px)' : 'none',
    transition: 'all .15s ease-in-out',
    userSelect: 'none'
  };
};

const pickUrlish = (obj) => {
  const u = obj?.url ?? obj?.path ?? obj?.file_path ?? obj?.filepath ?? obj?.storage_path ?? obj?.location ?? obj?.key ?? obj?.Key;
  if (!u) return null;
  if (typeof u === 'string' && (/^https?:\/\//i.test(u) || u.startsWith('data:'))) return u;
  return typeof u === 'string' ? (FILES_BASE_URL ? `${FILES_BASE_URL}${u.startsWith('/') ? u : `/${u}`}` : u) : null;
};
function normalizeFileUrls(raw) {
  if (raw === null || raw === undefined || raw === '') return [];
  let val = raw;
  if (typeof val === 'string') {
    const t = val.trim();
    if (!t) return [];
    if (t.startsWith('[') || t.startsWith('{')) {
      try {
        val = JSON.parse(t);
      } catch {
        val = t.split(',').map((s) => s.trim());
      }
    } else {
      val = t.split(',').map((s) => s.trim());
    }
  }
  if (!Array.isArray(val)) val = [val];
  const cleaned = val
    .map((item) => {
      if (!item) return null;
      if (typeof item === 'string') {
        if (/^https?:\/\//i.test(item) || item.startsWith('data:')) return item;
        return FILES_BASE_URL ? `${FILES_BASE_URL}${item.startsWith('/') ? item : `/${item}`}` : item;
      }
      if (typeof item === 'object') {
        const resolved = pickUrlish(item);
        if (!resolved) return null;
        return { ...item, url: resolved };
      }
      return null;
    })
    .filter(Boolean)
    .filter((u) => {
      const s = typeof u === 'object' ? u.url : u;
      return s && !['null', 'undefined', "''", '""', '{}', 'original_name'].includes(String(s));
    });
  return cleaned;
}
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
    if (FILES_BASE_URL && fullUrl.startsWith(FILES_BASE_URL)) return fullUrl.slice(FILES_BASE_URL.length).replace(/^\/+/, '');
    const u = new URL(fullUrl);
    if (u.hostname.includes('s3') || u.hostname.includes('amazonaws.com')) return u.pathname.replace(/^\/+/, '');
    if (!/^https?:\/\//i.test(fullUrl)) return fullUrl.replace(/^\/+/, '');
    return u.pathname.replace(/^\/+/, '');
  } catch {
    return fullUrl;
  }
}
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
    return /(^|\.)(s3[\.-].*|.*\.s3)\.amazonaws\.com$/i.test(h) || h.includes('amazonaws.com') || h.includes('.s3.');
  } catch {
    return false;
  }
}
async function fetchBinaryForUrl(originalUrl) {
  if (!originalUrl) return null;
  const url = typeof originalUrl === 'object' ? originalUrl.url : originalUrl;
  if (typeof url === 'string' && url.startsWith('data:'))
    return { bytes: dataUrlToBlob(url), ext: getFileExtension(originalUrl) || '.png' };
  if (typeof url === 'string' && url.includes('amazonaws.com')) {
    const storagePath = extractStoragePath(url);
    if (!storagePath) return null;
    const res = await axios.get(`${API_BASE_URL}/files/signed-download?path=${storagePath}`, { responseType: 'arraybuffer' });
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
    const res = await axios.get(`${API_BASE_URL}/files/signed-download?path=${storagePath}`, { responseType: 'arraybuffer' });
    const extGuess =
      (storagePath.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '') ||
      (getFileExtension(originalUrl) || '.bin').replace('.', '');
    return { bytes: res.data, ext: `.${extGuess || 'bin'}` };
  }
  const res = await axios.get(url, { responseType: 'arraybuffer' });
  const ext = (getFileExtension(originalUrl) || '').toLowerCase() || (String(url).includes('image') ? '.png' : '.bin');
  return { bytes: res.data, ext: ext || '.bin' };
}
function formatDateDMY(dateStr) {
  if (!dateStr) return '';
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) return dateStr;
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
}
function normalizeSelectorValue(val) {
  if (typeof val === 'string') {
    if (val.trim().startsWith('[')) {
      try {
        val = JSON.parse(val);
      } catch {}
    } else if (val.includes(',')) val = val.split(',').map((v) => v.trim());
  }
  return Array.isArray(val) ? val.filter(Boolean).join(', ') : val || '';
}
function parseGeoValue(raw) {
  if (!raw && raw !== 0) return null;
  if (typeof raw === 'object' && raw !== null) {
    const lat = Number(raw.lat ?? raw.latitude),
      lng = Number(raw.lng ?? raw.longitude);
    let address = raw.address || raw.formatted_address || '';
    if (!address)
      address = [raw.street, raw.outdoor_number, raw.indoor_number, raw.neighborhood, raw.postal_code, raw.city, raw.state, raw.country]
        .filter(Boolean)
        .join(', ');
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng, address };
  }
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (!t) return null;
    if (t.startsWith('{')) {
      try {
        return parseGeoValue(JSON.parse(t));
      } catch {}
    }
    const parts = t.split(',');
    if (parts.length >= 2) {
      const lat = Number(parts[0]),
        lng = Number(parts[1]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng, address: parts.slice(2).join(',').trim() };
    }
  }
  return null;
}

const expandedGroups = reactive({});
const orderedFieldsAndGroups = computed(() => {
  if (props.groups?.length || props.ungroupedFields?.length) {
    const elements = [];
    (props.ungroupedFields || []).forEach((item, idx) => {
      elements.push({ type: 'field', order: item.field?.order ?? idx, field: item.field, key: `field-${item.field?.id}` });
    });
    (props.groups || []).forEach((g, idx) => {
      elements.push({ type: 'group', order: g.group?.order ?? idx, group: g.group, fields: g.fields || [], key: `group-${g.group?.id}` });
      if (expandedGroups[g.group?.id] === undefined) expandedGroups[g.group?.id] = false;
    });
    elements.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return elements;
  }
  if (!props.formData) return [];
  const fields = [...(props.formData.fields || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const groupsArr = [...(props.formData.field_groups || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const groupMap = {};
  groupsArr.forEach((g) => (groupMap[g.id] = { ...g, fields: [] }));
  fields.forEach((f) => {
    if (f.form_field_group_id && groupMap[f.form_field_group_id]) groupMap[f.form_field_group_id].fields.push(f);
  });
  Object.values(groupMap).forEach((g) => g.fields.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
  const elements = [];
  fields.forEach((f) => {
    if (!f.form_field_group_id) elements.push({ type: 'field', order: f.order ?? 0, field: f, key: `field-${f.id}` });
  });
  groupsArr.forEach((g) => {
    elements.push({ type: 'group', order: g.order ?? 0, group: groupMap[g.id], fields: groupMap[g.id].fields, key: `group-${g.id}` });
    if (expandedGroups[g.id] === undefined) expandedGroups[g.id] = false;
  });
  elements.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return elements;
});
const toggleGroup = (id) => (expandedGroups[id] = !expandedGroups[id]);

const getAnswer = (fieldOrId, fieldType, asArray = false, evidence = false) => {
  let fieldId = typeof fieldOrId === 'object' && fieldOrId.id ? fieldOrId.id : fieldOrId;
  let resp = null;
  if (typeof fieldOrId === 'object' && fieldOrId.response !== undefined) {
    resp = fieldOrId.response;
    fieldId = fieldOrId.field?.id || fieldId;
  } else {
    resp = props.fieldResponses?.find((r) => r.form_field_id === fieldId || r.field_id === fieldId);
  }
  if (!resp) return asArray ? [] : '';
  if (evidence) return normalizeFileUrls(resp.evidence_files);
  const t = String(fieldType || '').toLowerCase();
  if (t === 'image' || t === 'document' || t === 'signature') return normalizeFileUrls(resp.value);
  if (t === 'geolocation') return parseGeoValue(resp.value) || '';
  if (['checkbox', 'selector', 'select'].includes(t)) {
    if (asArray) {
      let val = resp.value;
      if (typeof val === 'string') {
        if (val.trim().startsWith('[')) {
          try {
            val = JSON.parse(val);
          } catch {
            val = [val];
          }
        } else if (val.includes(',')) val = val.split(',').map((v) => v.trim());
      }
      return Array.isArray(val) ? val.filter(Boolean) : val ? [val] : [];
    }
    return normalizeSelectorValue(resp.value);
  }
  if (t === 'date') return formatDateDMY(resp.value);
  if (t === 'switch') return resp.value === true || resp.value === 'true' ? 'Activado' : 'Desactivado';
  if (t === 'url') return resp.value;
  return resp.value;
};

const croppedSignatures = reactive({});
function cropSignatureImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let minX = width,
        minY = height,
        maxX = 0,
        maxY = 0,
        found = false;
      for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
          if (a > 32 && (r < 240 || g < 240 || b < 240)) {
            found = true;
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
      if (!found) return resolve(src);
      const cw = maxX - minX + 1,
        ch = maxY - minY + 1;
      const c2 = document.createElement('canvas');
      c2.width = cw;
      c2.height = ch;
      c2.getContext('2d').drawImage(canvas, minX, minY, cw, ch, 0, 0, cw, ch);
      resolve(c2.toDataURL());
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}
function croppedSignatureForField(fieldId, img) {
  const url = typeof img === 'object' ? img.url : img;
  const key = `${fieldId}_${url}`;
  if (croppedSignatures[key]) return croppedSignatures[key];
  cropSignatureImage(url).then((c) => (croppedSignatures[key] = c));
  return url;
}

const imageModal = reactive({ open: false, src: '', images: [], index: 0, fieldType: '' });
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
  imageModal.src =
    typeof imageModal.images[imageModal.index] === 'object'
      ? imageModal.images[imageModal.index]?.url
      : imageModal.images[imageModal.index] || '';
  imageModal.fieldType = fieldType;
  resetZoom();
  imageModal.open = true;
};
const nextImage = () => {
  if (imageModal.index < imageModal.images.length - 1) {
    imageModal.index++;
    imageModal.src =
      typeof imageModal.images[imageModal.index] === 'object'
        ? imageModal.images[imageModal.index]?.url
        : imageModal.images[imageModal.index];
    resetZoom();
  }
};
const prevImage = () => {
  if (imageModal.index > 0) {
    imageModal.index--;
    imageModal.src =
      typeof imageModal.images[imageModal.index] === 'object'
        ? imageModal.images[imageModal.index]?.url
        : imageModal.images[imageModal.index];
    resetZoom();
  }
};
const closeImageModal = () => {
  imageModal.open = false;
  resetZoom();
};
const onImageWheel = (e) => {
  const d = e.deltaY < 0 ? imageZoom.step : -imageZoom.step;
  imageZoom.scale = Math.min(imageZoom.maxScale, Math.max(imageZoom.minScale, imageZoom.scale + d));
  if (imageZoom.scale === imageZoom.minScale) {
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
  imageZoom.scale === 1 ? (imageZoom.scale = 2) : resetZoom();
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

const downloadImagesZip = async (images, label = 'imagenes') => {
  if (!images?.length) return;
  const zip = new JSZip();
  const safe = (label || 'imagenes').replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
  const zipName = `${props.reportFolio} - ${safe}.zip`;
  let added = 0;
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const imgUrl = typeof img === 'object' ? img.url : img;
    if (!imgUrl) continue;
    try {
      const bin = await fetchBinaryForUrl(imgUrl);
      if (!bin || !bin.bytes) continue;
      const ext = (bin.ext || getFileExtension(imgUrl) || '.jpg').replace(/[^.a-z0-9]/gi, '');
      zip.file(`${props.reportFolio} - ${safe} - ${i + 1}${ext || '.jpg'}`, bin.bytes);
      added++;
    } catch (e) {
      console.error('Error agregando archivo al ZIP:', imgUrl, e);
    }
  }
  if (!added) {
    alert('No se pudieron agregar archivos al ZIP.');
    return;
  }
  const content = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(content);
  a.download = zipName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
};
</script>

<template>
  <div v-if="formData?.fields || orderedFieldsAndGroups.length">
    <div v-if="orderedFieldsAndGroups.length">
      <div v-for="(item, idx) in orderedFieldsAndGroups" :key="item.key" class="mb-4">
        <!-- Campo suelto -->
        <template v-if="item.type === 'field'">
          <v-card class="rounded-lg elevation-1 pa-0 card-business-unit">
            <v-row no-gutters>
              <v-col
                cols="auto"
                class="d-flex align-center justify-center question-number-desktop"
                style="min-width: 48px; max-width: 64px; background: #f5f5f5"
              >
                <div class="text-h6 font-weight-bold" style="width: 100%; text-align: center">{{ idx + 1 }}</div>
              </v-col>
              <v-col>
                <div class="question-number-mobile mb-2">
                  <div class="text-h6 font-weight-bold question-number-mobile-inner">{{ idx + 1 }}</div>
                </div>
                <v-card-text>
                  <div class="d-flex align-center justify-space-between">
                    <div class="mb-2 field-label" role="heading" aria-level="3">
                      {{ item.field?.label }}
                      <span v-if="item.field?.is_required" class="required-asterisk">*</span>
                      <span v-if="item.field?.score" class="ml-2 text-caption text-grey" style="font-weight: normal"
                        >({{ item.field.score }} pts)</span
                      >
                    </div>
                  </div>
                  <div v-if="item.field?.description" class="field-description mb-2">
                    <v-icon size="16" color="grey" class="mr-1">mdi-information-outline</v-icon>{{ item.field.description }}
                  </div>
                  <div class="mt-2 answer-row-bg" style="position: relative">
                    <template v-if="getAnswer(item.field, item.field?.type)">
                      <template v-if="item.field?.type === 'image'">
                        <v-btn
                          v-if="filterImages(getAnswer(item.field, 'image', true)).length"
                          variant="text"
                          class="custom-action-btn image-zip-btn px-3 py-2"
                          style="
                            position: absolute;
                            top: 10px;
                            right: 10px;
                            border-radius: 8px;
                            border: 1px solid #ccc;
                            min-width: 44px;
                            height: 44px;
                            z-index: 2;
                          "
                          size="small"
                          color="primary"
                          aria-label="Descargar ZIP"
                          @click="downloadImagesZip(getAnswer(item.field, 'image', true), item.field?.label)"
                        >
                          <v-icon :icon="mdiFolderZipOutline" /><span class="custom-action-label">Descargar Zip</span>
                        </v-btn>
                        <div class="image-preview-row">
                          <img
                            v-for="(img, i) in filterImages(getAnswer(item.field, 'image', true))"
                            :key="i"
                            :src="typeof img === 'object' ? img.url : img"
                            alt="Evidencia"
                            style="width: 120px; height: 120px; object-fit: cover; border-radius: 8px; border: 1px solid #eee"
                            @click="openImageModal(i, filterImages(getAnswer(item.field, 'image', true)))"
                          />
                          <span v-if="!filterImages(getAnswer(item.field, 'image', true)).length">—</span>
                        </div>
                      </template>
                      <template v-else-if="item.field?.type === 'signature'">
                        <div class="signature-row" style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center">
                          <template v-for="(img, i) in filterImages(getAnswer(item.field, 'signature', true))" :key="i">
                            <img v-if="img" :src="croppedSignatureForField(item.field?.id, img)" alt="Firma" class="signature-inline-img" />
                          </template>
                          <span v-if="!filterImages(getAnswer(item.field, 'signature', true)).length">—</span>
                        </div>
                      </template>
                      <template v-else-if="item.field?.type === 'document'">
                        <div class="document-list">
                          <template v-if="filterDocuments(getAnswer(item.field, 'document', true)).length">
                            <div
                              v-for="(doc, i) in filterDocuments(getAnswer(item.field, 'document', true))"
                              :key="i"
                              class="document-card"
                            >
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
                                  {{ getOriginalDocumentName(doc) }}<span class="document-ext">{{ getFileExtension(doc) }}</span>
                                </div>
                              </div>
                              <v-btn
                                icon
                                variant="text"
                                color="primary"
                                class="document-download-btn"
                                @click="downloadDocument(doc, getOriginalDocumentName(doc))"
                                ><v-icon :icon="mdiDownload"
                              /></v-btn>
                            </div>
                          </template>
                          <template v-else><span>—</span></template>
                        </div>
                      </template>
                      <template v-else-if="isSemaforo(item.field)">
                        <div class="semaforo-chips-row semaforo-full-width">
                          <v-chip
                            pill
                            variant="flat"
                            class="semaforo-chip semaforo-chip-full"
                            :style="chipStyleFilled(getAnswer(item.field, item.field?.type), true)"
                            :ripple="false"
                          >
                            <span class="semaforo-chip-grid"
                              ><span class="semaforo-check-left"></span
                              ><span class="semaforo-text">{{ getAnswer(item.field, item.field?.type) }}</span
                              ><span class="semaforo-check-right"></span
                            ></span>
                          </v-chip>
                        </div>
                      </template>
                      <template v-else-if="item.field?.type === 'switch'"
                        ><span>{{ getAnswer(item.field, item.field?.type) }}</span></template
                      >
                      <template v-else-if="item.field?.type === 'url'">
                        <a
                          :href="getAnswer(item.field, item.field?.type)"
                          target="_blank"
                          rel="noopener"
                          style="color: #1976d2; text-decoration: underline; word-break: break-all"
                          >{{ getAnswer(item.field, item.field?.type) }}</a
                        >
                      </template>
                      <template v-else-if="item.field?.type === 'geolocation'">
                        <div v-if="getAnswer(item.field, item.field?.type)">
                          <GoogleMap
                            v-if="getAnswer(item.field, 'geolocation')?.lat && getAnswer(item.field, 'geolocation')?.lng"
                            :points="[
                              {
                                lat: Number(getAnswer(item.field, 'geolocation')?.lat ?? 0),
                                lng: Number(getAnswer(item.field, 'geolocation')?.lng ?? 0),
                                label: getAnswer(item.field, 'geolocation')?.address || 'Ubicación'
                              }
                            ]"
                            layer="points"
                            style="margin-bottom: 16px"
                          />
                          <div v-if="getAnswer(item.field, 'geolocation')?.address" style="margin-bottom: 16px; padding-top: 4px">
                            <strong>Dirección:</strong> {{ getAnswer(item.field, 'geolocation')?.address }}
                          </div>
                          <div>
                            <strong>Coordenadas:</strong> {{ getAnswer(item.field, 'geolocation')?.lat }},
                            {{ getAnswer(item.field, 'geolocation')?.lng }}
                          </div>
                        </div>
                        <span v-else>—</span>
                      </template>
                      <template v-else>{{ getAnswer(item.field, item.field?.type) }}</template>
                    </template>
                    <span v-else>—</span>
                  </div>
                  <div
                    v-if="item.field?.has_evidence"
                    class="mt-2 answer-row-bg"
                    style="background: #f7f7f7; border-radius: 8px; padding: 10px 14px; position: relative"
                  >
                    <template
                      v-if="
                        filterImages(getAnswer(item.field, item.field?.type, true, true)).length ||
                        filterDocuments(getAnswer(item.field, item.field?.type, true, true)).length
                      "
                    >
                      <v-btn
                        v-if="filterImages(getAnswer(item.field, item.field?.type, true, true)).length"
                        variant="text"
                        class="custom-action-btn evidence-zip-btn px-3 py-2"
                        style="
                          position: absolute;
                          top: 10px;
                          right: 10px;
                          border-radius: 8px;
                          border: 1px solid #ccc;
                          min-width: 44px;
                          height: 44px;
                        "
                        size="small"
                        color="primary"
                        aria-label="Descargar ZIP"
                        @click="
                          downloadImagesZip(
                            filterImages(getAnswer(item.field, item.field?.type, true, true)),
                            item.field?.label + ' - Evidencia'
                          )
                        "
                      >
                        <v-icon :icon="mdiFolderZipOutline" /><span class="custom-action-label">Descargar Zip</span>
                      </v-btn>
                      <div v-if="filterImages(getAnswer(item.field, item.field?.type, true, true)).length" class="image-preview-row">
                        <img
                          v-for="(img, i) in filterImages(getAnswer(item.field, item.field?.type, true, true))"
                          :key="i"
                          :src="typeof img === 'object' ? img.url : img"
                          alt="Evidencia"
                          style="width: 120px; height: 120px; object-fit: cover; border-radius: 8px; border: 1px solid #eee"
                          @click="openImageModal(i, filterImages(getAnswer(item.field, item.field?.type, true, true)))"
                        />
                      </div>
                      <div
                        v-if="filterDocuments(getAnswer(item.field, item.field?.type, true, true)).length"
                        class="document-list"
                        style="margin-top: 16px"
                      >
                        <div
                          v-for="(doc, i) in filterDocuments(getAnswer(item.field, item.field?.type, true, true))"
                          :key="i"
                          class="document-card"
                        >
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
                              {{ getOriginalDocumentName(doc) }}<span class="document-ext">{{ getFileExtension(doc) }}</span>
                            </div>
                          </div>
                          <v-btn
                            icon
                            variant="text"
                            color="primary"
                            class="document-download-btn"
                            aria-label="Descargar documento"
                            @click="downloadDocument(doc, getOriginalDocumentName(doc))"
                            ><v-icon :icon="mdiDownload"
                          /></v-btn>
                        </div>
                      </div>
                    </template>
                    <template v-else><span>Sin evidencia</span></template>
                  </div>
                </v-card-text>
              </v-col>
            </v-row>
          </v-card>
        </template>

        <!-- Grupo de preguntas -->
        <template v-else-if="item.type === 'group'">
          <v-card class="rounded-lg elevation-1 pa-0 card-business-unit">
            <v-row no-gutters>
              <v-col
                cols="auto"
                class="d-flex align-center justify-center question-number-desktop"
                style="min-width: 48px; max-width: 64px; background: #f5f5f5"
              >
                <div class="text-h6 font-weight-bold" style="width: 100%; text-align: center">{{ idx + 1 }}</div>
              </v-col>
              <v-col>
                <div class="question-number-mobile mb-2">
                  <div class="text-h6 font-weight-bold question-number-mobile-inner">{{ idx + 1 }}</div>
                </div>
                <v-card-title
                  class="d-flex align-center justify-space-between group-title-row"
                  style="cursor: pointer; padding-bottom: 0; align-items: center"
                  @click="toggleGroup(item.group?.id)"
                >
                  <v-label class="mb-2 field-label" style="margin-bottom: 0">{{ item.group?.name }}</v-label>
                  <v-icon
                    :icon="expandedGroups[item.group?.id] ? mdiChevronUp : mdiChevronDown"
                    size="20"
                    style="margin-left: 8px; vertical-align: middle"
                  />
                </v-card-title>
                <v-expand-transition>
                  <div v-show="expandedGroups[item.group?.id]" class="pa-2">
                    <div v-for="(field, gIdx) in item.group?.fields" :key="field?.id" class="mb-2">
                      <v-card class="rounded-lg elevation-0 pa-0">
                        <v-row no-gutters>
                          <v-col
                            cols="auto"
                            class="d-flex align-center justify-center question-number-desktop"
                            style="min-width: 36px; max-width: 48px; background: #f5f5f5"
                          >
                            <div class="text-h6 font-weight-bold" style="width: 100%; text-align: center">{{ idx + 1 }}.{{ gIdx + 1 }}</div>
                          </v-col>
                          <v-col>
                            <div class="question-number-mobile mb-2">
                              <div class="text-h6 font-weight-bold question-number-mobile-inner">{{ idx + 1 }}.{{ gIdx + 1 }}</div>
                            </div>
                            <v-card-text>
                              <div class="mb-2 field-label" role="heading" aria-level="3">
                                {{ field?.label }}<span v-if="field?.is_required" class="required-asterisk">*</span
                                ><span v-if="field?.score" class="ml-2 text-caption text-grey" style="font-weight: normal"
                                  >({{ field.score }} pts)</span
                                >
                              </div>
                              <div v-if="field?.description" class="field-description mb-2">
                                <v-icon size="16" color="grey" class="mr-1">mdi-information-outline</v-icon>{{ field.description }}
                              </div>
                              <div class="mt-2 answer-row-bg" style="position: relative">
                                <template v-if="getAnswer(field, field?.type)">
                                  <template v-if="field?.type === 'image'">
                                    <v-btn
                                      v-if="filterImages(getAnswer(field, 'image', true)).length"
                                      variant="text"
                                      class="custom-action-btn image-zip-btn px-3 py-2"
                                      style="
                                        position: absolute;
                                        top: 10px;
                                        right: 10px;
                                        border-radius: 8px;
                                        border: 1px solid #ccc;
                                        min-width: 44px;
                                        height: 44px;
                                        z-index: 2;
                                      "
                                      size="small"
                                      color="primary"
                                      aria-label="Descargar ZIP"
                                      @click="downloadImagesZip(getAnswer(field, 'image', true), field?.label)"
                                    >
                                      <v-icon :icon="mdiFolderZipOutline" /><span class="custom-action-label">Descargar Zip</span>
                                    </v-btn>
                                    <div class="image-preview-row">
                                      <img
                                        v-for="(img, i) in filterImages(getAnswer(field, 'image', true))"
                                        :key="i"
                                        :src="typeof img === 'object' ? img.url : img"
                                        alt="Evidencia"
                                        style="width: 120px; height: 120px; object-fit: cover; border-radius: 8px; border: 1px solid #eee"
                                        @click="openImageModal(i, filterImages(getAnswer(field, 'image', true)))"
                                      />
                                      <span v-if="!filterImages(getAnswer(field, 'image', true)).length">—</span>
                                    </div>
                                  </template>
                                  <template v-else-if="field?.type === 'signature'">
                                    <div class="signature-row" style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center">
                                      <template v-for="(img, i) in filterImages(getAnswer(field, 'signature', true))" :key="i">
                                        <img
                                          v-if="img"
                                          :src="croppedSignatureForField(field?.id, img)"
                                          alt="Firma"
                                          class="signature-inline-img"
                                        />
                                      </template>
                                      <span v-if="!filterImages(getAnswer(field, 'signature', true)).length">—</span>
                                    </div>
                                  </template>
                                  <template v-else-if="field?.type === 'document'">
                                    <div class="document-list">
                                      <template v-if="filterDocuments(getAnswer(field, 'document', true)).length">
                                        <div
                                          v-for="(doc, i) in filterDocuments(getAnswer(field, 'document', true))"
                                          :key="i"
                                          class="document-card"
                                        >
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
                                              {{ getOriginalDocumentName(doc)
                                              }}<span class="document-ext">{{ getFileExtension(doc) }}</span>
                                            </div>
                                          </div>
                                          <v-btn
                                            icon
                                            variant="text"
                                            color="primary"
                                            class="document-download-btn"
                                            @click="downloadDocument(doc, getOriginalDocumentName(doc))"
                                            ><v-icon :icon="mdiDownload"
                                          /></v-btn>
                                        </div>
                                      </template>
                                      <template v-else><span>—</span></template>
                                    </div>
                                  </template>
                                  <template v-else-if="isSemaforo(field)">
                                    <div class="semaforo-chips-row semaforo-full-width">
                                      <v-chip
                                        pill
                                        variant="flat"
                                        class="semaforo-chip semaforo-chip-full"
                                        :style="chipStyleFilled(getAnswer(field, field?.type), true)"
                                        :ripple="false"
                                      >
                                        <span class="semaforo-chip-grid"
                                          ><span class="semaforo-check-left"></span
                                          ><span class="semaforo-text">{{ getAnswer(field, field?.type) }}</span
                                          ><span class="semaforo-check-right"></span
                                        ></span>
                                      </v-chip>
                                    </div>
                                  </template>
                                  <template v-else-if="field?.type === 'switch'"
                                    ><span>{{ getAnswer(field, field?.type) }}</span></template
                                  >
                                  <template v-else-if="field?.type === 'url'"
                                    ><a
                                      :href="getAnswer(field, field?.type)"
                                      target="_blank"
                                      rel="noopener"
                                      style="color: #1976d2; text-decoration: underline; word-break: break-all"
                                      >{{ getAnswer(field, field?.type) }}</a
                                    ></template
                                  >
                                  <template v-else-if="field?.type === 'geolocation'">
                                    <div v-if="getAnswer(field, field?.type)">
                                      <GoogleMap
                                        v-if="getAnswer(field, 'geolocation')?.lat && getAnswer(field, 'geolocation')?.lng"
                                        :points="[
                                          {
                                            lat: Number(getAnswer(field, 'geolocation')?.lat ?? 0),
                                            lng: Number(getAnswer(field, 'geolocation')?.lng ?? 0),
                                            label: getAnswer(field, 'geolocation')?.address || 'Ubicación'
                                          }
                                        ]"
                                        layer="points"
                                        style="margin-bottom: 16px"
                                      />
                                      <div v-if="getAnswer(field, 'geolocation')?.address" style="margin-bottom: 16px; padding-top: 4px">
                                        <strong>Dirección:</strong> {{ getAnswer(field, 'geolocation')?.address }}
                                      </div>
                                      <div>
                                        <strong>Coordenadas:</strong> {{ getAnswer(field, 'geolocation')?.lat }},
                                        {{ getAnswer(field, 'geolocation')?.lng }}
                                      </div>
                                    </div>
                                    <span v-else>—</span>
                                  </template>
                                  <template v-else>{{ getAnswer(field, field?.type) }}</template>
                                </template>
                                <span v-else>—</span>
                              </div>
                              <div
                                v-if="field?.has_evidence"
                                class="mt-2 answer-row-bg"
                                style="background: #f7f7f7; border-radius: 8px; padding: 10px 14px; position: relative"
                              >
                                <template
                                  v-if="
                                    filterImages(getAnswer(field, field?.type, true, true)).length ||
                                    filterDocuments(getAnswer(field, field?.type, true, true)).length
                                  "
                                >
                                  <v-btn
                                    v-if="filterImages(getAnswer(field, field?.type, true, true)).length"
                                    variant="text"
                                    class="custom-action-btn evidence-zip-btn px-3 py-2"
                                    style="
                                      position: absolute;
                                      top: 10px;
                                      right: 10px;
                                      border-radius: 8px;
                                      border: 1px solid #ccc;
                                      min-width: 44px;
                                      height: 44px;
                                    "
                                    size="small"
                                    color="primary"
                                    aria-label="Descargar ZIP"
                                    @click="
                                      downloadImagesZip(
                                        filterImages(getAnswer(field, field?.type, true, true)),
                                        field?.label + ' - Evidencia'
                                      )
                                    "
                                  >
                                    <v-icon :icon="mdiFolderZipOutline" /><span class="custom-action-label">Descargar Zip</span>
                                  </v-btn>
                                  <div v-if="filterImages(getAnswer(field, field?.type, true, true)).length" class="image-preview-row">
                                    <img
                                      v-for="(img, i) in filterImages(getAnswer(field, field?.type, true, true))"
                                      :key="i"
                                      :src="typeof img === 'object' ? img.url : img"
                                      alt="Evidencia"
                                      style="width: 120px; height: 120px; object-fit: cover; border-radius: 8px; border: 1px solid #eee"
                                      @click="openImageModal(i, filterImages(getAnswer(field, field?.type, true, true)))"
                                    />
                                  </div>
                                  <div
                                    v-if="filterDocuments(getAnswer(field, field?.type, true, true)).length"
                                    class="document-list"
                                    style="margin-top: 16px"
                                  >
                                    <div
                                      v-for="(doc, i) in filterDocuments(getAnswer(field, field?.type, true, true))"
                                      :key="i"
                                      class="document-card"
                                    >
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
                                          {{ getOriginalDocumentName(doc) }}<span class="document-ext">{{ getFileExtension(doc) }}</span>
                                        </div>
                                      </div>
                                      <v-btn
                                        icon
                                        variant="text"
                                        color="primary"
                                        class="document-download-btn"
                                        aria-label="Descargar documento"
                                        @click="downloadDocument(doc, getOriginalDocumentName(doc))"
                                        ><v-icon :icon="mdiDownload"
                                      /></v-btn>
                                    </div>
                                  </div>
                                </template>
                                <template v-else><span>Sin evidencia</span></template>
                              </div>
                            </v-card-text>
                          </v-col>
                        </v-row>
                      </v-card>
                    </div>
                  </div>
                </v-expand-transition>
              </v-col>
            </v-row>
          </v-card>
        </template>
      </div>
    </div>
    <div v-else class="text-center pa-8">
      <p class="text-grey">No se pudo cargar el formulario o no tiene campos</p>
    </div>
  </div>

  <!-- Image modal -->
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
          ><v-icon :icon="mdiDownload"
        /></v-btn>
        <v-btn icon variant="text" color="grey-darken-2" class="image-toolbar-btn" aria-label="Cerrar" @click="closeImageModal"
          ><v-icon :icon="mdiClose"
        /></v-btn>
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
          ><v-icon :icon="mdiChevronLeft"
        /></v-btn>
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
          ><v-icon :icon="mdiChevronRight"
        /></v-btn>
      </div>
      <v-card-actions class="image-fullscreen-footer">
        <div v-if="imageModal.images.length > 1" class="image-fullscreen-counter">
          {{ imageModal.index + 1 }} / {{ imageModal.images.length }}
        </div>
        <v-spacer />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped src="@/styles/report_answer_show.css"></style>
