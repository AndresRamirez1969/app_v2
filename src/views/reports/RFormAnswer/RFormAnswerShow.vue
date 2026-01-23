<script setup>
import { ref, onMounted, onBeforeUnmount, computed, reactive } from "vue";
import { mdiPaperclip } from "@mdi/js";
import { useRouter, useRoute } from "vue-router";
import {
  mdiArrowLeft,
  mdiChevronLeft,
  mdiChevronRight,
  mdiClose,
  mdiDownload,
  mdiLock,
  mdiChevronDown,
  mdiChevronUp,
  mdiFilePdfBox,
} from "@mdi/js";
import { mdiFolderZipOutline, mdiAlertCircleOutline } from "@mdi/js";
import StatusChip from "@/components/status/StatusChip.vue";
import CloseReportModal from "@/components/reports/CloseReportModal.vue";
import EditEvidenceModal from "@/components/reports/EditEvidenceModal.vue";
import ReOpenStatusModal from "@/components/reports/ReOpenStatusModal.vue";

import axios from "@/utils/axios";
import JSZip from "jszip";
import GoogleMap from "@/utils/helpers/google/GoogleMap.vue";
import { useAuthStore } from "@/stores/auth";

/* ================== Permisos ================== */
const auth = useAuthStore();
function hasPermission(permission) {
  return (
    Array.isArray(auth.user?.permissions) && auth.user.permissions.includes(permission)
  );
}

/* ================== Protección por permiso report.view ================== */
onMounted(() => {
  if (!hasPermission("report.view")) {
    router.replace("/403");
    return;
  }
});

/* ================== Constantes UI ================== */
const router = useRouter();
const route = useRoute();
const formId = route.params.formId;
const reportId = route.params.reportId;

const FILES_BASE_URL = (
  import.meta.env.VITE_FILES_BASE_URL ||
  import.meta.env.VITE_API_FILES_URL ||
  ""
).replace(/\/$/, "");
const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

/* ========== Semáforo (mismo estilo y lógica) ========== */
const SEMAFORO_COLORS = { Alto: "#e53935", Medio: "#ffd600", Bajo: "#43a047" };
const SEMAFORO_PASTEL = { Alto: "#ffebee", Medio: "#fffde7", Bajo: "#e8f5e9" };
const OPTION_KEYS = {
  alto: "Alto",
  alta: "Alto",
  high: "Alto",
  rojo: "Alto",
  medio: "Medio",
  media: "Medio",
  amarillo: "Medio",
  medium: "Medio",
  bajo: "Bajo",
  baja: "Bajo",
  low: "Bajo",
  verde: "Bajo",
};
const mapOptionKey = (opt) => {
  const k = String(opt ?? "")
    .trim()
    .toLowerCase();
  return (
    OPTION_KEYS[k] ||
    (["alto", "medio", "bajo"].includes(k) ? k[0].toUpperCase() + k.slice(1) : opt)
  );
};
const isSemaforo = (field) => {
  const type = String(field?.type || "").toLowerCase();
  if (type === "semaforo") return true;
  if (field?.attributes?.kind === "semaforo" || field?.attributes?.display === "semaforo")
    return true;
  const opts = (field?.options || []).map((o) => String(o).trim().toLowerCase());
  const has = (arr, any) => arr.some((o) => any.includes(o));
  return (
    type === "radio" &&
    has(opts, ["alto", "alta", "rojo", "high"]) &&
    has(opts, ["medio", "media", "amarillo", "medium"]) &&
    has(opts, ["bajo", "baja", "verde", "low"])
  );
};
const chipStyleFilled = (option, isSelected) => {
  const key = mapOptionKey(option);
  const base = SEMAFORO_COLORS[key] || "#9e9e9e";
  const pastel = SEMAFORO_PASTEL[key] || "#f5f5f5";
  const text = key === "Medio" ? "#111" : "#fff";
  return {
    background: isSelected ? base : pastel,
    color: isSelected ? text : "#222",
    border: "none",
    padding: "4px 10px",
    fontWeight: isSelected ? "700" : "600",
    boxShadow: isSelected
      ? "0 0 0 2px rgba(0,0,0,.06), 0 2px 8px rgba(0,0,0,.12)"
      : "none",
    transform: isSelected ? "translateY(-1px)" : "none",
    transition: "all .15s ease-in-out",
    userSelect: "none",
  };
};

/* ================== Estado principal ================== */
const loading = ref(true);
const reportData = ref(null);
const formData = ref(null);
const fieldResponses = ref([]);

const reportStatus = ref("—");
const reportFolio = ref("—");
const reportScore = ref(null);
const answeredBy = ref("—");

const formFolio = ref("—");
const formName = ref("—");
const formDescription = ref("—");
const formScope = ref("—");
const formFrequency = ref("—");
const hasRating = ref(false);

/* Alcance */
const scopeFolio = ref("");
const scopeName = ref("");
const scopeLink = ref("");

/* Dialogs */
const showCloseInfo = ref(false);
const closingReport = ref(false);
const downloadingPdf = ref(false);

/* ================== NUEVO: Estado para cierre de reporte ================== */
const closeComments = ref("");
const closeEvidences = ref([]);

/* ================== NUEVO: Estado para edición de evidencia ================== */
const showEditEvidence = ref(false);
const editComments = ref("");
const editEvidences = ref([]);

/* ================== Helpers de archivos ================== */
const pickUrlish = (obj) => {
  const u =
    obj?.url ??
    obj?.path ??
    obj?.file_path ??
    obj?.filepath ??
    obj?.storage_path ??
    obj?.location ??
    obj?.key ??
    obj?.Key;
  if (!u) return null;
  if (typeof u === "string" && (/^https?:\/\//i.test(u) || u.startsWith("data:")))
    return u;
  return typeof u === "string"
    ? FILES_BASE_URL
      ? `${FILES_BASE_URL}${u.startsWith("/") ? u : `/${u}`}`
      : u
    : null;
};

function normalizeFileUrls(raw) {
  if (raw === null || raw === undefined || raw === "") return [];
  let val = raw;

  if (typeof val === "string") {
    const t = val.trim();
    if (!t) return [];
    if (t.startsWith("[") || t.startsWith("{")) {
      try {
        val = JSON.parse(t);
      } catch {
        val = t.split(",").map((s) => s.trim());
      }
    } else {
      val = t.split(",").map((s) => s.trim());
    }
  }
  if (!Array.isArray(val)) val = [val];

  const cleaned = val
    .map((item) => {
      if (!item) return null;

      if (typeof item === "string") {
        if (/^https?:\/\//i.test(item) || item.startsWith("data:")) return item;
        return FILES_BASE_URL
          ? `${FILES_BASE_URL}${item.startsWith("/") ? item : `/${item}`}`
          : item;
      }
      if (typeof item === "object") {
        const resolved = pickUrlish(item);
        if (!resolved) return null;
        return { ...item, url: resolved };
      }
      return null;
    })
    .filter(Boolean)
    .filter((u) => {
      const s = typeof u === "object" ? u.url : u;
      return (
        s && !["null", "undefined", "''", '""', "{}", "original_name"].includes(String(s))
      );
    });

  return cleaned;
}

function getFileNameFromUrl(urlOrObj) {
  let s =
    typeof urlOrObj === "object" && urlOrObj
      ? urlOrObj.url || urlOrObj.path || urlOrObj.file_path || urlOrObj.storage_path || ""
      : urlOrObj;
  if (typeof s !== "string") return "";
  try {
    if (/^https?:\/\//i.test(s)) s = new URL(s).pathname;
    const parts = s.split("/");
    return parts[parts.length - 1] || s;
  } catch {
    return s;
  }
}
function getFileExtension(file) {
  const name =
    typeof file === "object"
      ? getFileNameFromUrl(file)
      : getFileNameFromUrl(String(file || ""));
  const m = name.match(/\.([a-zA-Z0-9]+)(?:\?.*)?$/);
  return m ? `.${m[1].toLowerCase()}` : "";
}
function getOriginalDocumentName(doc) {
  const name =
    (typeof doc === "object" && doc?.original_name) || getFileNameFromUrl(doc) || "—";
  return name.replace(/\.pdf$/i, "");
}

function _asUrl(u) {
  return typeof u === "object" ? u?.url : u;
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
  if (!fullUrl) return "";
  try {
    if (FILES_BASE_URL && fullUrl.startsWith(FILES_BASE_URL)) {
      return fullUrl.slice(FILES_BASE_URL.length).replace(/^\/+/, "");
    }
    const u = new URL(fullUrl);
    if (u.hostname.includes("s3") || u.hostname.includes("amazonaws.com")) {
      return u.pathname.replace(/^\/+/, "");
    }
    if (!/^https?:\/\//i.test(fullUrl)) return fullUrl.replace(/^\/+/, "");
    return u.pathname.replace(/^\/+/, "");
  } catch {
    return fullUrl;
  }
}

/* ========= Helpers binarios para descargas/ZIP ========= */
function dataUrlToBlob(dataUrl) {
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)[1] || "application/octet-stream";
  const bstr = atob(arr[1] || "");
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new Blob([u8arr], { type: mime });
}

function isS3LikeUrl(url) {
  if (typeof url !== "string") return false;
  try {
    const h = new URL(url).hostname;
    return (
      /(^|\.)(s3[\.-].*|.*\.s3)\.amazonaws\.com$/i.test(h) ||
      h.includes("amazonaws.com") ||
      h.includes(".s3.")
    );
  } catch {
    return false;
  }
}

/**
 * Devuelve bytes listos para ZIP o descarga directa.
 */
async function fetchBinaryForUrl(originalUrl) {
  if (!originalUrl) return null;
  const url = typeof originalUrl === "object" ? originalUrl.url : originalUrl;

  if (typeof url === "string" && url.startsWith("data:")) {
    return { bytes: dataUrlToBlob(url), ext: getFileExtension(originalUrl) || ".png" };
  }

  // Si es S3 (aunque sea firmada), SIEMPRE usa el backend para evitar CORS
  if (typeof url === "string" && url.includes("amazonaws.com")) {
    const storagePath = extractStoragePath(url);
    if (!storagePath) return null;
    const downloadUrl = `${API_BASE_URL}/files/signed-download?path=${storagePath}`;
    const res = await axios.get(downloadUrl, { responseType: "arraybuffer" });
    const extGuess =
      (storagePath.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "") ||
      (getFileExtension(originalUrl) || ".bin").replace(".", "");
    return { bytes: res.data, ext: `.${extGuess || "bin"}` };
  }

  const isOurStorage =
    (FILES_BASE_URL && typeof url === "string" && url.startsWith(FILES_BASE_URL)) ||
    (typeof url === "string" && !/^https?:\/\//i.test(url)) ||
    (typeof url === "string" && isS3LikeUrl(url));

  if (isOurStorage) {
    const storagePath = extractStoragePath(url);
    if (!storagePath) return null;
    const downloadUrl = `${API_BASE_URL}/files/signed-download?path=${storagePath}`;
    const res = await axios.get(downloadUrl, { responseType: "arraybuffer" });
    const extGuess =
      (storagePath.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "") ||
      (getFileExtension(originalUrl) || ".bin").replace(".", "");
    return { bytes: res.data, ext: `.${extGuess || "bin"}` };
  }

  // Si es una URL pública normal
  const res = await axios.get(url, { responseType: "arraybuffer" });
  const ext =
    (getFileExtension(originalUrl) || "").toLowerCase() ||
    (String(url).includes("image") ? ".png" : ".bin");
  return { bytes: res.data, ext: ext || ".bin" };
}

async function forceDownloadByPath(storagePath, suggestedName = "archivo") {
  if (!storagePath) return;
  const url = `${API_BASE_URL}/files/signed-download?path=${storagePath}`;
  const res = await axios.get(url, { responseType: "arraybuffer" });
  const blob = new Blob([res.data]);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = suggestedName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

/* ================== Firma recortada (igual UX) ================== */
const croppedSignatures = reactive({});
function cropSignatureImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = function () {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
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
      const c2 = document.createElement("canvas");
      c2.width = cw;
      c2.height = ch;
      c2.getContext("2d").drawImage(canvas, minX, minY, cw, ch, 0, 0, cw, ch);
      resolve(c2.toDataURL());
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}
function croppedSignatureForField(fieldId, img) {
  const url = typeof img === "object" ? img.url : img;
  const key = `${fieldId}_${url}`;
  if (croppedSignatures[key]) return croppedSignatures[key];
  cropSignatureImage(url).then((c) => (croppedSignatures[key] = c));
  return url;
}

/* ================== Imagen modal (zoom, flechas) ================== */
const imageModal = reactive({
  open: false,
  src: "",
  images: [],
  index: 0,
  fieldType: "",
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
  startY: 0,
});
const resetZoom = () => {
  imageZoom.scale = 1;
  imageZoom.translateX = 0;
  imageZoom.translateY = 0;
  imageZoom.isPanning = false;
};
const openImageModal = (i, images = [], fieldType = "") => {
  imageModal.images = [...images];
  imageModal.index = i ?? 0;
  const c = imageModal.images[imageModal.index];
  imageModal.src = typeof c === "object" ? c.url : c || "";
  imageModal.fieldType = fieldType;
  resetZoom();
  imageModal.open = true;
};
const nextImage = () => {
  if (imageModal.index < imageModal.images.length - 1) {
    imageModal.index++;
    const c = imageModal.images[imageModal.index];
    imageModal.src = typeof c === "object" ? c.url : c;
    resetZoom();
  }
};
const prevImage = () => {
  if (imageModal.index > 0) {
    imageModal.index--;
    const c = imageModal.images[imageModal.index];
    imageModal.src = typeof c === "object" ? c.url : c;
    resetZoom();
  }
};
const closeImageModal = () => {
  imageModal.open = false;
  resetZoom();
};
const onImageWheel = (e) => {
  const d = e.deltaY < 0 ? imageZoom.step : -imageZoom.step;
  const s = Math.min(
    imageZoom.maxScale,
    Math.max(imageZoom.minScale, imageZoom.scale + d)
  );
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
  imageZoom.scale === 1 ? (imageZoom.scale = 2) : resetZoom();
};
const handleKeydown = (e) => {
  if (!imageModal.open) return;
  if (e.key === "ArrowRight") {
    e.preventDefault();
    nextImage();
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    prevImage();
  } else if (e.key === "Escape") {
    e.preventDefault();
    closeImageModal();
  }
};
onMounted(() => window.addEventListener("keydown", handleKeydown));
onBeforeUnmount(() => window.removeEventListener("keydown", handleKeydown));

/* ================== Navegación & formato ================== */
const goToIndex = () => router.push({ name: "Report Answers", params: { formId } });
const formatScope = (s) =>
  ({
    organization: "Organización",
    business: "Empresa",
    business_unit: "Ubicación",
    business_unit_group: "Grupo",
  }[s] ||
  s ||
  "—");
const formatFrequency = (f) =>
  ({ once_per_day: "Una vez por día", multiple_per_day: "Múltiples veces por día" }[f] ||
  f ||
  "—");
function setScopeInfo(form) {
  scopeFolio.value = "";
  scopeName.value = "";
  scopeLink.value = "";
  if (!form) return;
  switch (form.assignment_scope) {
    case "organization":
      if (form.organization) {
        scopeFolio.value = form.organization.folio;
        scopeName.value = form.organization.legal_name || form.organization.name;
        scopeLink.value = `/organizaciones/${form.organization.id}`;
      }
      break;
    case "business":
      if (form.business) {
        scopeFolio.value = form.business.folio;
        scopeName.value = form.business.name;
        scopeLink.value = `/empresas/${form.business.id}`;
      }
      break;
    case "business_unit":
      if (form.business_unit) {
        scopeFolio.value = form.business_unit.folio;
        scopeName.value = form.business_unit.name;
        scopeLink.value = `/ubicaciones/${form.business_unit.id}`;
      }
      break;
    case "business_unit_group":
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
function formatDateDMY(dateStr) {
  if (!dateStr) return "";
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) return dateStr;
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const dd = String(d.getDate()).padStart(2, "0"),
    mm = String(d.getMonth() + 1).padStart(2, "0"),
    yy = d.getFullYear();
  return `${dd}-${mm}-${yy}`;
}
function formatDateTimeDMY(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}-${mm}-${yy} ${hh}:${min}`;
}
function normalizeSelectorValue(val) {
  if (typeof val === "string") {
    if (val.trim().startsWith("[")) {
      try {
        val = JSON.parse(val);
      } catch {}
    } else if (val.includes(",")) {
      val = val.split(",").map((v) => v.trim());
    }
  }
  return Array.isArray(val) ? val.filter(Boolean).join(", ") : val || "";
}
function parseGeoValue(raw) {
  if (!raw && raw !== 0) return null;
  if (typeof raw === "object" && raw !== null) {
    const lat = Number(raw.lat ?? raw.latitude),
      lng = Number(raw.lng ?? raw.longitude);
    let address = raw.address || raw.formatted_address || "";
    if (!address) {
      const parts = [
        raw.street,
        raw.outdoor_number,
        raw.indoor_number,
        raw.neighborhood,
        raw.postal_code,
        raw.city,
        raw.state,
        raw.country,
      ].filter(Boolean);
      address = parts.join(", ");
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng, address };
  }
  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t) return null;
    if (t.startsWith("{")) {
      try {
        return parseGeoValue(JSON.parse(t));
      } catch {}
    }
    const parts = t.split(",");
    if (parts.length >= 2) {
      const lat = Number(parts[0]),
        lng = Number(parts[1]);
      const addr = parts.slice(2).join(",").trim();
      if (Number.isFinite(lat) && Number.isFinite(lng))
        return { lat, lng, address: addr };
    }
  }
  return null;
}

/* ================== Datos ================== */
const expandedGroups = reactive({});
const groups = ref([]);
const ungroupedFields = ref([]);
const orderedFieldsAndGroups = computed(() => {
  // Si tienes datos de backend (groups y ungrouped_fields), úsalos
  if (groups.value.length || ungroupedFields.value.length) {
    const elements = [];
    ungroupedFields.value.forEach((item, idx) => {
      elements.push({
        type: "field",
        order: item.field.order ?? idx,
        field: item.field,
        key: `field-${item.field.id}`,
      });
    });
    groups.value.forEach((g, idx) => {
      elements.push({
        type: "group",
        order: g.group.order ?? idx,
        group: g.group,
        fields: g.fields,
        key: `group-${g.group.id}`,
      });
      if (expandedGroups[g.group.id] === undefined) expandedGroups[g.group.id] = false;
    });
    elements.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return elements;
  }
  // Fallback a la lógica anterior si no hay datos
  if (!formData.value) return [];
  const fields = [...(formData.value.fields || [])].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0)
  );
  const groupsArr = [...(formData.value.field_groups || [])].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0)
  );
  const groupMap = {};
  groupsArr.forEach((g) => (groupMap[g.id] = { ...g, fields: [] }));
  fields.forEach((f) => {
    if (f.form_field_group_id && groupMap[f.form_field_group_id])
      groupMap[f.form_field_group_id].fields.push(f);
  });
  Object.values(groupMap).forEach((g) =>
    g.fields.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  );
  const elements = [];
  fields.forEach((f) => {
    if (!f.form_field_group_id)
      elements.push({
        type: "field",
        order: f.order ?? 0,
        field: f,
        key: `field-${f.id}`,
      });
  });
  groupsArr.forEach((g) => {
    elements.push({
      type: "group",
      order: g.order ?? 0,
      group: groupMap[g.id],
      fields: groupMap[g.id].fields,
      key: `group-${g.id}`,
    });
    if (expandedGroups[g.id] === undefined) expandedGroups[g.id] = false;
  });
  elements.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return elements;
});
const toggleGroup = (id) => (expandedGroups[id] = !expandedGroups[id]);

/* ================== Lectura API ================== */
async function fetchResponseDetail() {
  loading.value = true;
  try {
    const { data } = await axios.get(`/reportes/formulario/reportes/${reportId}`);
    reportData.value = data?.report || null;
    formData.value = data?.form || null;

    // Report
    reportStatus.value = data?.report?.status || "—";
    reportFolio.value = data?.report?.folio || data?.report?.reportable?.folio || "—";
    reportScore.value = data?.report?.reportable?.score ?? null;
    answeredBy.value =
      data?.report?.reportable?.user?.name ||
      data?.report?.reportable?.user?.email ||
      data?.report?.reportable?.user_name ||
      "—";

    // Form
    formFolio.value = data?.form?.folio || "—";
    formName.value = data?.form?.name || "—";
    formDescription.value = data?.form?.description || "—";
    formScope.value = formatScope(data?.form?.assignment_scope);
    formFrequency.value = formatFrequency(data?.form?.frequency);
    hasRating.value = !!data?.form?.has_rating;
    setScopeInfo(data?.form);

    // Respuestas
    fieldResponses.value = Array.isArray(data?.field_responses)
      ? data.field_responses
      : Array.isArray(data?.report?.reportable?.field_responses)
      ? data.report.reportable.field_responses
      : [];

    // Integración grupos y campos sueltos
    groups.value = Array.isArray(data?.groups) ? data.groups : [];
    ungroupedFields.value = Array.isArray(data?.ungrouped_fields)
      ? data.ungrouped_fields
      : [];
  } finally {
    loading.value = false;
  }
}
onMounted(fetchResponseDetail);

/* ================== GetAnswer central ================== */
const getAnswer = (fieldOrId, fieldType, asArray = false, evidence = false) => {
  let fieldId = typeof fieldOrId === "object" && fieldOrId.id ? fieldOrId.id : fieldOrId;
  let resp = null;

  if (typeof fieldOrId === "object" && fieldOrId.response !== undefined) {
    resp = fieldOrId.response;
    fieldId = fieldOrId.field?.id || fieldId;
  } else {
    resp = fieldResponses.value?.find(
      (r) => r.form_field_id === fieldId || r.field_id === fieldId
    );
  }
  if (!resp) return asArray ? [] : "";

  if (evidence) {
    const urls = normalizeFileUrls(resp.evidence_files);
    return asArray ? urls : urls;
  }

  const t = String(fieldType || "").toLowerCase();
  if (t === "image" || t === "document" || t === "signature") {
    const urls = normalizeFileUrls(resp.value);
    return asArray ? urls : urls;
  }
  if (t === "geolocation") {
    return parseGeoValue(resp.value) || "";
  }
  if (["checkbox", "selector", "select"].includes(t)) {
    if (asArray) {
      let val = resp.value;
      if (typeof val === "string") {
        if (val.trim().startsWith("[")) {
          try {
            val = JSON.parse(val);
          } catch {
            val = [val];
          }
        } else if (val.includes(",")) {
          val = val.split(",").map((v) => v.trim());
        }
      }
      return Array.isArray(val) ? val.filter(Boolean) : val ? [val] : [];
    }
    return normalizeSelectorValue(resp.value);
  }
  if (t === "date") return formatDateDMY(resp.value);
  if (t === "switch")
    return resp.value === true || resp.value === "true" ? "Activado" : "Desactivado";
  if (t === "url") return resp.value;
  return resp.value;
};

/* ================== Descargas ================== */
async function downloadCurrentImage() {
  const url = imageModal.src;
  if (!url) return;
  try {
    const bin = await fetchBinaryForUrl(url);
    if (!bin) throw new Error("no-bytes");
    const name = `evidencia_${imageModal.index + 1}${bin.ext || ".jpg"}`;
    const blob = bin.bytes instanceof Blob ? bin.bytes : new Blob([bin.bytes]);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  } catch {
    alert("No se pudo descargar la imagen");
  }
}

async function downloadDocument(urlOrObj, originalName = "documento") {
  try {
    const bin = await fetchBinaryForUrl(urlOrObj);
    if (!bin) throw new Error("no-bytes");
    const fromUrl = getFileNameFromUrl(urlOrObj);
    const ext = bin.ext || getFileExtension(fromUrl) || ".bin";
    const finalName =
      originalName && originalName !== "—"
        ? `${originalName}${ext}`
        : fromUrl || `archivo${ext}`;
    const blob = bin.bytes instanceof Blob ? bin.bytes : new Blob([bin.bytes]);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = finalName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  } catch {
    alert("No se pudo descargar el archivo.");
  }
}

const downloadImagesZip = async (images, label = "imagenes") => {
  if (!images?.length) return;
  const zip = new JSZip();
  const safe = (label || "imagenes").replace(/[^\w\s-]/g, "").replace(/\s+/g, "_");
  const zipName = `${reportFolio.value} - ${safe}.zip`;

  let added = 0;
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const imgUrl = typeof img === "object" ? img.url : img;
    if (!imgUrl) continue;

    try {
      const bin = await fetchBinaryForUrl(imgUrl);
      if (!bin || !bin.bytes) continue;
      const ext = (bin.ext || getFileExtension(imgUrl) || ".jpg").replace(
        /[^.a-z0-9]/gi,
        ""
      );
      const filename = `${reportFolio.value} - ${safe} - ${i + 1}${ext || ".jpg"}`;
      zip.file(filename, bin.bytes);
      added++;
    } catch (e) {
      console.error("Error agregando archivo al ZIP:", imgUrl, e);
    }
  }

  if (!added) {
    alert("No se pudieron agregar archivos al ZIP (verifica permisos o URLs).");
    return;
  }

  const content = await zip.generateAsync({ type: "blob" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(content);
  a.download = zipName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
};

/* ================== Acciones reporte ================== */
async function closeReport() {
  if (closingReport.value) return;
  closingReport.value = true;
  try {
    const formData = new FormData();
    formData.append("status", "closed");
    if (closeComments.value) formData.append("comments", closeComments.value);
    if (closeEvidences.value && closeEvidences.value.length) {
      closeEvidences.value.forEach((file) => {
        formData.append("evidences[]", file);
      });
    }
    await axios.put(`/reportes/formulario/reportes/${reportId}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    await fetchResponseDetail();
    showCloseInfo.value = false;
    closeComments.value = "";
    closeEvidences.value = [];
  } catch {
    alert("No se pudo cerrar el reporte.");
  } finally {
    closingReport.value = false;
  }
}

const downloadPdf = async () => {
  if (downloadingPdf.value) return;
  downloadingPdf.value = true;
  try {
    const createdAt = reportData.value?.created_at || reportData.value?.value?.created_at;
    const localCreatedAt = createdAt
      ? new Date(createdAt).toLocaleString("es-MX", { hour12: false })
      : "";
    const res = await axios.get(`/reports/${reportId}/download-pdf`, {
      params: { local_created_at: localCreatedAt },
      responseType: "arraybuffer",
    });
    const blob = new Blob([res.data], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Reporte_${reportFolio.value || reportId}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch {
    alert("No se pudo descargar el PDF.");
  } finally {
    downloadingPdf.value = false;
  }
};

/* ========== Utilidad para detectar File en cualquier entorno ========== */
function isFile(obj) {
  return typeof window !== "undefined" && window.File && obj instanceof window.File;
}

/* ========== Evidences Preview URLs ========== */
const evidencePreviewUrls = computed(() => {
  if (!closeEvidences.value || !Array.isArray(closeEvidences.value)) return [];
  return closeEvidences.value.map((file) => {
    if (isFile(file) && window.URL?.createObjectURL) {
      return window.URL.createObjectURL(file);
    }
    return "";
  });
});

/* ========== Edit Evidence Preview URLs ========== */
const editEvidencePreviewUrls = computed(() => {
  if (!editEvidences.value || !Array.isArray(editEvidences.value)) return [];
  return editEvidences.value.map((file) => {
    if (isFile(file) && window.URL?.createObjectURL) {
      return window.URL.createObjectURL(file);
    }
    if (typeof file === "string") return file;
    if (typeof file === "object" && file?.url) return file.url;
    return "";
  });
});

/* ========== Abrir modal edición de evidencia ========== */
function openEditEvidenceModal() {
  editComments.value = reportData.value?.comments || "";
  editEvidences.value = Array.isArray(reportData.value?.evidences)
    ? [...reportData.value.evidences]
    : [];
  showEditEvidence.value = true;
}

/* ========== Guardar edición de evidencia ========== */
async function saveEvidenceEdit() {
  try {
    const formData = new FormData();
    formData.append("comments", editComments.value || "");
    formData.append("status", "closed");

    if (editEvidences.value && editEvidences.value.length) {
      editEvidences.value.forEach((file, index) => {
        if (isFile(file)) {
          formData.append(`evidences[${index}]`, file);
        } else if (typeof file === "string") {
          formData.append(`existing_evidences[${index}]`, file);
        }
      });
    }

    await axios.put(`/reportes/formulario/reportes/${reportId}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    await fetchResponseDetail();
    showEditEvidence.value = false;
  } catch (error) {
    console.error("Error al guardar la evidencia:", error);
    alert("No se pudo guardar la evidencia.");
  }
}

/* ================== Reabrir Reporte ================== */
async function reopenReport() {
  if (closingReport.value) return;
  closingReport.value = true;
  try {
    const formData = new FormData();
    formData.append("status", "open");

    await axios.put(`/reportes/formulario/reportes/${reportId}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    await fetchResponseDetail();
    alert("El reporte ha sido reabierto correctamente.");
  } catch {
    alert("No se pudo reabrir el reporte.");
  } finally {
    closingReport.value = false;
  }
}

const showReopenInfo = ref(false);
const reopeningReport = ref(false);

async function handleReopenReport() {
  reopeningReport.value = true;
  try {
    await axios.put(`/reportes/formulario/reportes/${reportId}`, { status: "open" });
    await fetchResponseDetail(); // Refresca los datos del reporte
    showReopenInfo.value = false;
  } catch (error) {
    console.error("Error al reabrir el reporte:", error);
    alert("No se pudo reabrir el reporte.");
  } finally {
    reopeningReport.value = false;
  }
}
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
          style="
            border-radius: 8px;
            border: 1px solid #ccc;
            min-width: 44px;
            height: 44px;
          "
          @click="goToIndex"
        >
          <v-icon :icon="mdiArrowLeft" />
        </v-btn>
        <h3 class="font-weight-medium ml-3 mb-0 d-none d-md-block">
          Reporte <span v-if="!loading">- {{ reportFolio }}</span>
          <v-progress-circular
            v-else
            indeterminate
            size="20"
            color="primary"
            class="ml-2"
          />
        </h3>
        <h3 class="font-weight-medium ml-3 mb-0 d-block d-md-none">
          <span v-if="!loading">R-{{ reportFolio }}</span>
          <v-progress-circular
            v-else
            indeterminate
            size="20"
            color="primary"
            class="ml-2"
          />
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
              style="
                border-radius: 8px;
                border: 1px solid #ccc;
                min-width: 44px;
                height: 44px;
              "
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
              <v-list-item
                v-if="hasPermission('report.update')"
                @click="showCloseInfo = true"
              >
                <template #prepend>
                  <v-icon :icon="mdiLock" size="18" />
                </template>
                <v-list-item-title>Cerrar reporte</v-list-item-title>
              </v-list-item>
            </template>
            <!-- Nueva opción para reabrir reporte -->
            <template
              v-if="
                reportStatus === 'closed' &&
                formData?.organization?.id === 3 &&
                auth.user?.organization_id === 3
              "
            >
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

    <!-- Info general -->
    <v-row v-if="formData">
      <v-col cols="12" md="4" class="d-flex justify-center align-center">
        <template v-if="formData.logo">
          <v-img
            :src="formData.logo"
            max-width="320"
            max-height="320"
            class="rounded-lg logo-avatar"
            alt="Logo"
            style="background: none"
          />
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
        <v-card-title class="font-weight-bold text-h6 pb-2" style="padding-left: 0.5rem"
          >Información general</v-card-title
        >
        <v-table class="rounded-lg elevation-1 card-shadow">
          <tbody>
            <tr>
              <td class="key">Estatus</td>
              <td>
                <StatusChip v-if="reportStatus !== '—'" :status="reportStatus" /><span
                  v-else
                  >—</span
                >
              </td>
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
                  <a :href="scopeLink" style="color: #1976d2; text-decoration: underline"
                    >{{ scopeFolio }} - {{ scopeName }}</a
                  >
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
                <span v-if="reportScore !== null">{{
                  Number(reportScore).toFixed(2)
                }}</span
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
                <span>
                  {{
                    reportData?.value?.created_at || reportData?.created_at
                      ? formatDateTimeDMY(
                          reportData?.value?.created_at || reportData?.created_at
                        )
                      : "—"
                  }}
                </span>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-col>
    </v-row>

    <!-- Campos y grupos -->
    <v-row v-if="formData?.fields">
      <v-col cols="12">
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
                    <div
                      class="text-h6 font-weight-bold"
                      style="width: 100%; text-align: center"
                    >
                      {{ idx + 1 }}
                    </div>
                  </v-col>
                  <v-col>
                    <div class="question-number-mobile mb-2">
                      <div class="text-h6 font-weight-bold question-number-mobile-inner">
                        {{ idx + 1 }}
                      </div>
                    </div>
                    <v-card-text>
                      <div class="d-flex align-center justify-space-between">
                        <div class="mb-2 field-label" role="heading" aria-level="3">
                          {{ item.field.label }}
                          <span v-if="item.field.is_required" class="required-asterisk"
                            >*</span
                          >
                          <span
                            v-if="item.field.score"
                            class="ml-2 text-caption text-grey"
                            style="font-weight: normal"
                          >
                            ({{ item.field.score }} pts)
                          </span>
                        </div>
                      </div>
                      <div v-if="item.field.description" class="field-description mb-2">
                        <v-icon size="16" color="grey" class="mr-1"
                          >mdi-information-outline</v-icon
                        >{{ item.field.description }}
                      </div>
                      <!-- Respuesta principal -->
                      <div class="mt-2 answer-row-bg" style="position: relative">
                        <template v-if="getAnswer(item.field, item.field.type)">
                          <!-- Imagen -->
                          <template v-if="item.field.type === 'image'">
                            <v-btn
                              v-if="
                                filterImages(getAnswer(item.field, 'image', true)).length
                              "
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
                              @click="
                                downloadImagesZip(
                                  getAnswer(item.field, 'image', true),
                                  item.field.label
                                )
                              "
                            >
                              <v-icon :icon="mdiFolderZipOutline" /><span
                                class="custom-action-label"
                                >Descargar Zip</span
                              >
                            </v-btn>
                            <div class="image-preview-row">
                              <img
                                v-for="(img, i) in filterImages(
                                  getAnswer(item.field, 'image', true)
                                )"
                                :key="i"
                                :src="typeof img === 'object' ? img.url : img"
                                alt="Evidencia"
                                style="
                                  width: 120px;
                                  height: 120px;
                                  object-fit: cover;
                                  border-radius: 8px;
                                  border: 1px solid #eee;
                                "
                                @click="
                                  openImageModal(
                                    i,
                                    filterImages(getAnswer(item.field, 'image', true))
                                  )
                                "
                              />
                              <span
                                v-if="
                                  !filterImages(getAnswer(item.field, 'image', true))
                                    .length
                                "
                                >—</span
                              >
                            </div>
                          </template>
                          <!-- Firma -->
                          <template v-else-if="item.field.type === 'signature'">
                            <div
                              class="signature-row"
                              style="
                                display: flex;
                                flex-wrap: wrap;
                                gap: 12px;
                                align-items: center;
                              "
                            >
                              <template
                                v-for="(img, i) in filterImages(
                                  getAnswer(item.field, 'signature', true)
                                )"
                                :key="i"
                              >
                                <img
                                  v-if="img"
                                  :src="croppedSignatureForField(item.field.id, img)"
                                  alt="Firma"
                                  class="signature-inline-img"
                                />
                              </template>
                              <span
                                v-if="
                                  !filterImages(getAnswer(item.field, 'signature', true))
                                    .length
                                "
                                >—</span
                              >
                            </div>
                          </template>
                          <!-- Documentos -->
                          <template v-else-if="item.field.type === 'document'">
                            <div class="document-list">
                              <template
                                v-if="
                                  filterDocuments(getAnswer(item.field, 'document', true))
                                    .length
                                "
                              >
                                <div
                                  v-for="(doc, i) in filterDocuments(
                                    getAnswer(item.field, 'document', true)
                                  )"
                                  :key="i"
                                  class="document-card"
                                >
                                  <v-icon
                                    :icon="
                                      ['.pdf'].includes(getFileExtension(doc))
                                        ? 'mdi-file-pdf-box'
                                        : ['.doc', '.docx'].includes(
                                            getFileExtension(doc)
                                          )
                                        ? 'mdi-file-word-box'
                                        : ['.xls', '.xlsx'].includes(
                                            getFileExtension(doc)
                                          )
                                        ? 'mdi-file-excel-box'
                                        : ['.ppt', '.pptx'].includes(
                                            getFileExtension(doc)
                                          )
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
                                      <span class="document-ext">{{
                                        getFileExtension(doc)
                                      }}</span>
                                    </div>
                                  </div>
                                  <v-btn
                                    icon
                                    variant="text"
                                    color="primary"
                                    class="document-download-btn"
                                    @click="
                                      downloadDocument(doc, getOriginalDocumentName(doc))
                                    "
                                  >
                                    <v-icon :icon="mdiDownload" />
                                  </v-btn>
                                </div>
                              </template>
                              <template v-else><span>—</span></template>
                            </div>
                          </template>
                          <!-- Tipos simples -->
                          <template v-else-if="isSemaforo(item.field)">
                            <div class="semaforo-chips-row semaforo-full-width">
                              <v-chip
                                pill
                                variant="flat"
                                class="semaforo-chip semaforo-chip-full"
                                :style="
                                  chipStyleFilled(
                                    getAnswer(item.field, item.field.type),
                                    true
                                  )
                                "
                                :ripple="false"
                              >
                                <span class="semaforo-chip-grid"
                                  ><span class="semaforo-check-left"></span
                                  ><span class="semaforo-text">{{
                                    getAnswer(item.field, item.field.type)
                                  }}</span
                                  ><span class="semaforo-check-right"></span
                                ></span>
                              </v-chip>
                            </div>
                          </template>
                          <template v-else-if="item.field.type === 'switch'">
                            <span>{{ getAnswer(item.field, item.field.type) }}</span>
                          </template>
                          <template v-else-if="item.field.type === 'url'">
                            <a
                              :href="getAnswer(item.field, item.field.type)"
                              target="_blank"
                              rel="noopener"
                              style="
                                color: #1976d2;
                                text-decoration: underline;
                                word-break: break-all;
                              "
                            >
                              {{ getAnswer(item.field, item.field.type) }}
                            </a>
                          </template>
                          <template v-else-if="item.field.type === 'geolocation'">
                            <div v-if="getAnswer(item.field, item.field.type)">
                              <GoogleMap
                                v-if="
                                  getAnswer(item.field, 'geolocation')?.lat &&
                                  getAnswer(item.field, 'geolocation')?.lng
                                "
                                :points="[
                                  {
                                    lat: Number(
                                      getAnswer(item.field, 'geolocation')?.lat ?? 0
                                    ),
                                    lng: Number(
                                      getAnswer(item.field, 'geolocation')?.lng ?? 0
                                    ),
                                    label:
                                      getAnswer(item.field, 'geolocation')?.address ||
                                      'Ubicación',
                                  },
                                ]"
                                layer="points"
                                style="margin-bottom: 16px"
                              />
                              <div
                                v-if="getAnswer(item.field, 'geolocation')?.address"
                                style="margin-bottom: 16px; padding-top: 4px"
                              >
                                <strong>Dirección:</strong>
                                {{ getAnswer(item.field, "geolocation")?.address }}
                              </div>
                              <div>
                                <strong>Coordenadas:</strong>
                                {{ getAnswer(item.field, "geolocation")?.lat }},
                                {{ getAnswer(item.field, "geolocation")?.lng }}
                              </div>
                            </div>
                            <span v-else>—</span>
                          </template>
                          <template v-else>
                            {{ getAnswer(item.field, item.field.type) }}
                          </template>
                        </template>
                        <span v-else>—</span>
                      </div>
                      <!-- Evidencias (CORS-safe) -->
                      <div
                        v-if="item.field.has_evidence"
                        class="mt-2 answer-row-bg"
                        style="
                          background: #f7f7f7;
                          border-radius: 8px;
                          padding: 10px 14px;
                          position: relative;
                        "
                      >
                        <template
                          v-if="
                            filterImages(
                              getAnswer(item.field, item.field.type, true, true)
                            ).length ||
                            filterDocuments(
                              getAnswer(item.field, item.field.type, true, true)
                            ).length
                          "
                        >
                          <v-btn
                            v-if="
                              filterImages(
                                getAnswer(item.field, item.field.type, true, true)
                              ).length
                            "
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
                                filterImages(
                                  getAnswer(item.field, item.field.type, true, true)
                                ),
                                item.field.label + ' - Evidencia'
                              )
                            "
                          >
                            <v-icon :icon="mdiFolderZipOutline" /><span
                              class="custom-action-label"
                              >Descargar Zip</span
                            >
                          </v-btn>
                          <div
                            v-if="
                              filterImages(
                                getAnswer(item.field, item.field.type, true, true)
                              ).length
                            "
                            class="image-preview-row"
                          >
                            <img
                              v-for="(img, i) in filterImages(
                                getAnswer(item.field, item.field.type, true, true)
                              )"
                              :key="i"
                              :src="typeof img === 'object' ? img.url : img"
                              alt="Evidencia"
                              style="
                                width: 120px;
                                height: 120px;
                                object-fit: cover;
                                border-radius: 8px;
                                border: 1px solid #eee;
                              "
                              @click="
                                openImageModal(
                                  i,
                                  filterImages(
                                    getAnswer(item.field, item.field.type, true, true)
                                  )
                                )
                              "
                            />
                          </div>
                          <div
                            v-if="
                              filterDocuments(
                                getAnswer(item.field, item.field.type, true, true)
                              ).length
                            "
                            class="document-list"
                            style="margin-top: 16px"
                          >
                            <div
                              v-for="(doc, i) in filterDocuments(
                                getAnswer(item.field, item.field.type, true, true)
                              )"
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
                                  {{ getOriginalDocumentName(doc) }}
                                  <span class="document-ext">{{
                                    getFileExtension(doc)
                                  }}</span>
                                </div>
                              </div>
                              <v-btn
                                icon
                                variant="text"
                                color="primary"
                                class="document-download-btn"
                                aria-label="Descargar documento"
                                @click="
                                  downloadDocument(doc, getOriginalDocumentName(doc))
                                "
                              >
                                <v-icon :icon="mdiDownload" />
                              </v-btn>
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
                    <div
                      class="text-h6 font-weight-bold"
                      style="width: 100%; text-align: center"
                    >
                      {{ idx + 1 }}
                    </div>
                  </v-col>
                  <v-col>
                    <div class="question-number-mobile mb-2">
                      <div class="text-h6 font-weight-bold question-number-mobile-inner">
                        {{ idx + 1 }}
                      </div>
                    </div>
                    <!-- Cambia v-card-title por un div con field-label -->
                    <v-card-title
                      class="d-flex align-center justify-space-between group-title-row"
                      style="cursor: pointer; padding-bottom: 0; align-items: center"
                      @click="toggleGroup(item.group.id)"
                    >
                      <v-label class="mb-2 field-label" style="margin-bottom: 0">
                        {{ item.group.name }}
                      </v-label>
                      <v-icon
                        :icon="
                          expandedGroups[item.group.id] ? mdiChevronUp : mdiChevronDown
                        "
                        size="20"
                        style="margin-left: 8px; vertical-align: middle"
                      />
                    </v-card-title>
                    <v-expand-transition>
                      <div v-show="expandedGroups[item.group.id]" class="pa-2">
                        <div
                          v-for="(field, gIdx) in item.group.fields"
                          :key="field.id"
                          class="mb-2"
                        >
                          <v-card class="rounded-lg elevation-0 pa-0">
                            <v-row no-gutters>
                              <v-col
                                cols="auto"
                                class="d-flex align-center justify-center question-number-desktop"
                                style="
                                  min-width: 36px;
                                  max-width: 48px;
                                  background: #f5f5f5;
                                "
                              >
                                <div
                                  class="text-h6 font-weight-bold"
                                  style="width: 100%; text-align: center"
                                >
                                  {{ idx + 1 }}.{{ gIdx + 1 }}
                                </div>
                              </v-col>
                              <v-col>
                                <div class="question-number-mobile mb-2">
                                  <div
                                    class="text-h6 font-weight-bold question-number-mobile-inner"
                                  >
                                    {{ idx + 1 }}.{{ gIdx + 1 }}
                                  </div>
                                </div>
                                <v-card-text>
                                  <div class="d-flex align-center justify-space-between">
                                    <div
                                      class="mb-2 field-label"
                                      role="heading"
                                      aria-level="3"
                                    >
                                      {{ field.label }}
                                      <span
                                        v-if="field.is_required"
                                        class="required-asterisk"
                                        >*</span
                                      >
                                      <span
                                        v-if="field.score"
                                        class="ml-2 text-caption text-grey"
                                        style="font-weight: normal"
                                      >
                                        ({{ field.score }} pts)
                                      </span>
                                    </div>
                                  </div>
                                  <div
                                    v-if="field.description"
                                    class="field-description mb-2"
                                  >
                                    <v-icon size="16" color="grey" class="mr-1"
                                      >mdi-information-outline</v-icon
                                    >{{ field.description }}
                                  </div>
                                  <!-- Respuesta principal -->
                                  <div
                                    class="mt-2 answer-row-bg"
                                    style="position: relative"
                                  >
                                    <template v-if="getAnswer(field, field.type)">
                                      <!-- Imagen -->
                                      <template v-if="field.type === 'image'">
                                        <v-btn
                                          v-if="
                                            filterImages(getAnswer(field, 'image', true))
                                              .length
                                          "
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
                                          @click="
                                            downloadImagesZip(
                                              getAnswer(field, 'image', true),
                                              field.label
                                            )
                                          "
                                        >
                                          <v-icon :icon="mdiFolderZipOutline" /><span
                                            class="custom-action-label"
                                            >Descargar Zip</span
                                          >
                                        </v-btn>
                                        <div class="image-preview-row">
                                          <img
                                            v-for="(img, i) in filterImages(
                                              getAnswer(field, 'image', true)
                                            )"
                                            :key="i"
                                            :src="typeof img === 'object' ? img.url : img"
                                            alt="Evidencia"
                                            style="
                                              width: 120px;
                                              height: 120px;
                                              object-fit: cover;
                                              border-radius: 8px;
                                              border: 1px solid #eee;
                                            "
                                            @click="
                                              openImageModal(
                                                i,
                                                filterImages(
                                                  getAnswer(field, 'image', true)
                                                )
                                              )
                                            "
                                          />
                                          <span
                                            v-if="
                                              !filterImages(
                                                getAnswer(field, 'image', true)
                                              ).length
                                            "
                                            >—</span
                                          >
                                        </div>
                                      </template>
                                      <!-- Firma -->
                                      <template v-else-if="field.type === 'signature'">
                                        <div
                                          class="signature-row"
                                          style="
                                            display: flex;
                                            flex-wrap: wrap;
                                            gap: 12px;
                                            align-items: center;
                                          "
                                        >
                                          <template
                                            v-for="(img, i) in filterImages(
                                              getAnswer(field, 'signature', true)
                                            )"
                                            :key="i"
                                          >
                                            <img
                                              v-if="img"
                                              :src="
                                                croppedSignatureForField(field.id, img)
                                              "
                                              alt="Firma"
                                              class="signature-inline-img"
                                            />
                                          </template>
                                          <span
                                            v-if="
                                              !filterImages(
                                                getAnswer(field, 'signature', true)
                                              ).length
                                            "
                                            >—</span
                                          >
                                        </div>
                                      </template>
                                      <!-- Documentos -->
                                      <template v-else-if="field.type === 'document'">
                                        <div class="document-list">
                                          <template
                                            v-if="
                                              filterDocuments(
                                                getAnswer(field, 'document', true)
                                              ).length
                                            "
                                          >
                                            <div
                                              v-for="(doc, i) in filterDocuments(
                                                getAnswer(field, 'document', true)
                                              )"
                                              :key="i"
                                              class="document-card"
                                            >
                                              <v-icon
                                                :icon="
                                                  ['.pdf'].includes(getFileExtension(doc))
                                                    ? 'mdi-file-pdf-box'
                                                    : ['.doc', '.docx'].includes(
                                                        getFileExtension(doc)
                                                      )
                                                    ? 'mdi-file-word-box'
                                                    : ['.xls', '.xlsx'].includes(
                                                        getFileExtension(doc)
                                                      )
                                                    ? 'mdi-file-excel-box'
                                                    : ['.ppt', '.pptx'].includes(
                                                        getFileExtension(doc)
                                                      )
                                                    ? 'mdi-file-powerpoint-box'
                                                    : /\.(jpg|jpeg|png|gif)$/i.test(
                                                        _asUrl(doc)
                                                      )
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
                                                  <span class="document-ext">{{
                                                    getFileExtension(doc)
                                                  }}</span>
                                                </div>
                                              </div>
                                              <v-btn
                                                icon
                                                variant="text"
                                                color="primary"
                                                class="document-download-btn"
                                                @click="
                                                  downloadDocument(
                                                    doc,
                                                    getOriginalDocumentName(doc)
                                                  )
                                                "
                                              >
                                                <v-icon :icon="mdiDownload" />
                                              </v-btn>
                                            </div>
                                          </template>
                                          <template v-else><span>—</span></template>
                                        </div>
                                      </template>
                                      <!-- Tipos simples -->
                                      <template v-else-if="isSemaforo(field)">
                                        <div
                                          class="semaforo-chips-row semaforo-full-width"
                                        >
                                          <v-chip
                                            pill
                                            variant="flat"
                                            class="semaforo-chip semaforo-chip-full"
                                            :style="
                                              chipStyleFilled(
                                                getAnswer(field, field.type),
                                                true
                                              )
                                            "
                                            :ripple="false"
                                          >
                                            <span class="semaforo-chip-grid"
                                              ><span class="semaforo-check-left"></span
                                              ><span class="semaforo-text">{{
                                                getAnswer(field, field.type)
                                              }}</span
                                              ><span class="semaforo-check-right"></span
                                            ></span>
                                          </v-chip>
                                        </div>
                                      </template>
                                      <template v-else-if="field.type === 'switch'">
                                        <span>{{ getAnswer(field, field.type) }}</span>
                                      </template>
                                      <template v-else-if="field.type === 'url'">
                                        <a
                                          :href="getAnswer(field, field.type)"
                                          target="_blank"
                                          rel="noopener"
                                          style="
                                            color: #1976d2;
                                            text-decoration: underline;
                                            word-break: break-all;
                                          "
                                        >
                                          {{ getAnswer(field, field.type) }}
                                        </a>
                                      </template>
                                      <template v-else-if="field.type === 'geolocation'">
                                        <div v-if="getAnswer(field, field.type)">
                                          <GoogleMap
                                            v-if="
                                              getAnswer(field, 'geolocation')?.lat &&
                                              getAnswer(field, 'geolocation')?.lng
                                            "
                                            :points="[
                                              {
                                                lat: Number(
                                                  getAnswer(field, 'geolocation')?.lat ??
                                                    0
                                                ),
                                                lng: Number(
                                                  getAnswer(field, 'geolocation')?.lng ??
                                                    0
                                                ),
                                                label:
                                                  getAnswer(field, 'geolocation')
                                                    ?.address || 'Ubicación',
                                              },
                                            ]"
                                            layer="points"
                                            style="margin-bottom: 16px"
                                          />
                                          <div
                                            v-if="
                                              getAnswer(field, 'geolocation')?.address
                                            "
                                            style="margin-bottom: 16px; padding-top: 4px"
                                          >
                                            <strong>Dirección:</strong>
                                            {{ getAnswer(field, "geolocation")?.address }}
                                          </div>
                                          <div>
                                            <strong>Coordenadas:</strong>
                                            {{ getAnswer(field, "geolocation")?.lat }},
                                            {{ getAnswer(field, "geolocation")?.lng }}
                                          </div>
                                        </div>
                                        <span v-else>—</span>
                                      </template>
                                      <template v-else>
                                        {{ getAnswer(field, field.type) }}
                                      </template>
                                    </template>
                                    <span v-else>—</span>
                                  </div>
                                  <!-- Evidencias -->
                                  <div
                                    v-if="field.has_evidence"
                                    class="mt-2 answer-row-bg"
                                    style="
                                      background: #f7f7f7;
                                      border-radius: 8px;
                                      padding: 10px 14px;
                                      position: relative;
                                    "
                                  >
                                    <template
                                      v-if="
                                        filterImages(
                                          getAnswer(field, field.type, true, true)
                                        ).length ||
                                        filterDocuments(
                                          getAnswer(field, field.type, true, true)
                                        ).length
                                      "
                                    >
                                      <v-btn
                                        v-if="
                                          filterImages(
                                            getAnswer(field, field.type, true, true)
                                          ).length
                                        "
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
                                            filterImages(
                                              getAnswer(field, field.type, true, true)
                                            ),
                                            field.label + ' - Evidencia'
                                          )
                                        "
                                      >
                                        <v-icon :icon="mdiFolderZipOutline" /><span
                                          class="custom-action-label"
                                          >Descargar Zip</span
                                        >
                                      </v-btn>
                                      <div
                                        v-if="
                                          filterImages(
                                            getAnswer(field, field.type, true, true)
                                          ).length
                                        "
                                        class="image-preview-row"
                                      >
                                        <img
                                          v-for="(img, i) in filterImages(
                                            getAnswer(field, field.type, true, true)
                                          )"
                                          :key="i"
                                          :src="typeof img === 'object' ? img.url : img"
                                          alt="Evidencia"
                                          style="
                                            width: 120px;
                                            height: 120px;
                                            object-fit: cover;
                                            border-radius: 8px;
                                            border: 1px solid #eee;
                                          "
                                          @click="
                                            openImageModal(
                                              i,
                                              filterImages(
                                                getAnswer(field, field.type, true, true)
                                              )
                                            )
                                          "
                                        />
                                      </div>
                                      <div
                                        v-if="
                                          filterDocuments(
                                            getAnswer(field, field.type, true, true)
                                          ).length
                                        "
                                        class="document-list"
                                        style="margin-top: 16px"
                                      >
                                        <div
                                          v-for="(doc, i) in filterDocuments(
                                            getAnswer(field, field.type, true, true)
                                          )"
                                          :key="i"
                                          class="document-card"
                                        >
                                          <v-icon
                                            :icon="
                                              ['.pdf'].includes(getFileExtension(doc))
                                                ? 'mdi-file-pdf-box'
                                                : ['.doc', '.docx'].includes(
                                                    getFileExtension(doc)
                                                  )
                                                ? 'mdi-file-word-box'
                                                : ['.xls', '.xlsx'].includes(
                                                    getFileExtension(doc)
                                                  )
                                                ? 'mdi-file-excel-box'
                                                : ['.ppt', '.pptx'].includes(
                                                    getFileExtension(doc)
                                                  )
                                                ? 'mdi-file-powerpoint-box'
                                                : /\.(jpg|jpeg|png|gif)$/i.test(
                                                    _asUrl(doc)
                                                  )
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
                                              <span class="document-ext">{{
                                                getFileExtension(doc)
                                              }}</span>
                                            </div>
                                          </div>
                                          <v-btn
                                            icon
                                            variant="text"
                                            color="primary"
                                            class="document-download-btn"
                                            aria-label="Descargar documento"
                                            @click="
                                              downloadDocument(
                                                doc,
                                                getOriginalDocumentName(doc)
                                              )
                                            "
                                          >
                                            <v-icon :icon="mdiDownload" />
                                          </v-btn>
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
      </v-col>
    </v-row>

    <!-- Cierre de Reporte: solo si el reporte está cerrado y hay comentarios o evidencias -->
    <template
      v-if="
        reportStatus === 'closed' &&
        (reportData?.comments ||
          (Array.isArray(reportData?.evidences) && reportData.evidences.length))
      "
    >
      <div class="mt-8">
        <div style="display: flex; align-items: center; justify-content: space-between">
          <div
            class="font-weight-bold text-h6 pb-2"
            style="padding-left: 0.5rem; font-size: 1.25rem"
          >
            Cierre de Reporte
          </div>
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
        <v-card
          v-if="reportData?.comments"
          class="rounded-lg elevation-1 pa-0 card-business-unit mb-4"
        >
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
                style="
                  width: 120px;
                  height: 120px;
                  object-fit: cover;
                  border-radius: 8px;
                  border: 1px solid #eee;
                "
                @click="openImageModal(i, filterImages(reportData.evidences), 'image')"
              />
              <span v-if="!filterImages(reportData.evidences).length">—</span>
            </div>
            <div
              v-if="filterDocuments(reportData.evidences).length"
              class="document-list"
              style="margin-top: 16px"
            >
              <div
                v-for="(doc, i) in filterDocuments(reportData.evidences)"
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
          <v-btn
            icon
            variant="text"
            color="grey-darken-2"
            class="image-toolbar-btn"
            aria-label="Cerrar"
            @click="closeImageModal"
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
                cursor: imageZoom.isPanning
                  ? 'grabbing'
                  : imageZoom.scale > 1
                  ? 'grab'
                  : 'zoom-in',
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

<style scoped>
/* Display helpers */
.d-none {
  display: none !important;
}
.d-block {
  display: block !important;
}
@media (min-width: 960px) {
  .d-md-block {
    display: block !important;
  }
  .d-md-none {
    display: none !important;
  }
}
@media (max-width: 959px) {
  .d-md-block {
    display: none !important;
  }
  .d-md-none {
    display: block !important;
  }
}
.v-container {
  padding: 24px !important;
}
@media (max-width: 960px) {
  .v-container {
    padding: 16px 8px !important;
  }
}

/* Logo */
.logo-avatar {
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  overflow: hidden;
  width: 320px;
  height: 320px;
  min-width: 320px;
}

/* Cards / table */
.card-shadow {
  box-shadow: 0 2px 8px rgba(60, 60, 60, 0.08) !important;
  border-radius: 16px !important;
  background: #fff !important;
  border: 1px solid #eaeaea !important;
}
.card-business-unit,
.v-card.rounded-lg.elevation-1.pa-0,
.v-table.rounded-lg {
  border-radius: 12px !important;
  background: #fff;
  border: 1px solid #f0f0f0;
  box-shadow: 0 2px 8px rgba(60, 60, 60, 0.08) !important;
}
.key {
  width: 1%;
  white-space: nowrap;
  font-weight: bold;
}

/* Answer row */
.answer-row-bg {
  background: #f7f7f7;
  border-radius: 8px;
  padding: 10px 14px;
}

/* Labels */
.required-asterisk {
  color: #e53935;
  font-weight: bold;
  margin-left: 4px;
}
.field-label {
  color: #23272f;
  font-weight: 500;
}
.field-description {
  font-size: 13px;
  background: #f9f9f9;
  color: #23272f;
  border-radius: 12px;
  padding: 6px 10px;
  margin-top: 4px;
  font-style: italic;
  display: flex;
  align-items: flex-start;
  gap: 0.4em;
}

/* Question number */
.question-number-mobile {
  display: none;
}
.question-number-mobile-inner {
  width: 100%;
  min-width: 0;
  height: 48px;
  background: #f5f5f5;
  border-radius: 8px 8 0 0; /* typo fixed with proper colon? Keep previous */
  border-radius: 8px 8px 0 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
}
@media (max-width: 900px) {
  .question-number-desktop {
    display: none !important;
  }
  .question-number-mobile {
    display: block;
  }
  .card-business-unit .v-card-text {
    padding-top: 16px !important;
  }
  .question-number-mobile-inner {
    border-radius: 12px 12px 0 0 !important;
    font-size: 1.25rem;
    font-weight: 700;
  }
}

/* Images */
.image-preview-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding-top: 0;
  padding-left: 16px;
}

/* Signature */
.signature-inline-img {
  width: 240px;
  max-width: 100%;
  height: auto;
  background: transparent;
}
@media (max-width: 900px) {
  .signature-inline-img {
    width: 98vw;
    max-width: 98vw;
    min-width: 220px;
    display: block;
    margin: 0 auto;
  }
}

/* Document list */
.document-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.document-card {
  display: flex;
  align-items: center;
  background: #f7f7f7;
  border-radius: 8px;
  padding: 10px 16px;
  border: 1px solid #e0e0e0;
  gap: 12px;
  width: 100%;
  overflow: hidden;
}
.document-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.document-title {
  font-weight: 500;
  color: #23272f;
  font-size: 15px;
  display: flex;
  align-items: baseline;
  gap: 8px;
  max-width: 60vw;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.document-ext {
  font-size: 13px;
  color: #888;
  font-weight: 400;
  flex-shrink: 0;
}
.document-download-btn {
  margin-left: 12px;
  flex-shrink: 0;
}
.document-download-btn .v-icon {
  color: #888 !important;
}
@media (max-width: 900px) {
  .document-card {
    flex-wrap: wrap !important;
    padding: 12px;
  }
  .document-info {
    width: 100% !important;
    min-width: 100% !important;
  }
  .document-title {
    white-space: normal !important;
    word-break: break-word !important;
    overflow-wrap: break-word !important;
    max-width: 100% !important;
    font-size: 14px;
    margin-bottom: 4px;
    line-height: 1.3;
  }
  .document-ext {
    font-size: 13px;
    margin-bottom: 8px;
  }
  .document-download-btn {
    width: 100%;
    margin-left: 0;
    margin-top: 6px;
  }
}

/* Semáforo */
.semaforo-chips-row {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
}
.semaforo-full-width {
  width: 100%;
}
.semaforo-chip {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.01em;
  min-width: 80px;
  width: 100%;
  justify-content: center;
  border-radius: 999px !important;
  box-shadow: 0 1px 4px rgba(60, 60, 60, 0.06);
  margin: 0;
  padding: 0;
  display: flex;
  align-items: center;
}
.semaforo-chip-full {
  width: 100% !important;
  min-width: 0 !important;
  justify-content: center;
  display: flex;
}
.semaforo-chip-grid {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 0.5em;
  justify-content: center;
}
.semaforo-text {
  font-size: 15px;
  font-weight: 700;
}
.semaforo-check-left,
.semaforo-check-right {
  width: 0.8em;
  display: inline-block;
}

/* Action buttons */
.custom-action-btn {
  border-radius: 8px;
  border: 1px solid #ccc;
  min-width: 44px;
  height: 44px;
  font-weight: 500;
  font-size: 15px;
  transition: box-shadow 0.1s;
  box-shadow: 0 1px 4px rgba(60, 60, 60, 0.04);
  color: #23272f !important;
  display: flex;
  align-items: center;
  gap: 8px;
}
.custom-action-btn:hover {
  box-shadow: 0 2px 8px rgba(60, 60, 60, 0.08);
}
.custom-action-btn .v-icon {
  color: #888 !important;
}
.custom-action-label {
  margin-left: 8px;
  font-weight: 400;
  font-size: 15px;
  display: inline-block;
  color: #23272f;
}
@media (max-width: 900px) {
  .custom-action-label {
    display: none;
  }
}

/* Image viewer */
.image-fullscreen-card {
  background: #fff;
  color: #23272f;
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: relative;
}
.image-fullscreen-toolbar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 20;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  padding: 24px 24px 0 0;
  background: transparent;
}
.image-toolbar-btn {
  min-width: 36px;
  height: 36px;
  padding: 0;
  border-radius: 999px;
  background: transparent;
  box-shadow: none;
}
.image-toolbar-btn .v-icon {
  font-size: 22px;
}
.image-fullscreen-wrapper {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 80px;
}
.image-zoom-container {
  width: 100%;
  height: 100%;
  max-height: calc(100vh - 120px);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.image-fullscreen-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  box-shadow: 0 0 24px rgba(60, 60, 60, 0.08);
  border-radius: 8px;
  background: #f7f7f7;
  transition: transform 0.08s ease-out;
}
.image-fullscreen-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
}
.image-fullscreen-arrow-left {
  left: 24px;
}
.image-fullscreen-arrow-right {
  right: 24px;
}
.image-fullscreen-footer {
  padding: 8px 24px 16px;
}
.image-fullscreen-counter {
  font-size: 0.9rem;
  opacity: 0.8;
}
@media (max-width: 900px) {
  .image-fullscreen-wrapper {
    padding: 16px 40px;
  }
  .image-fullscreen-arrow-left {
    left: 8px;
  }
  .image-fullscreen-arrow-right {
    right: 8px;
  }
  .image-fullscreen-toolbar {
    top: 12px;
    right: 12px;
    left: 0;
    padding: 12px 12px 0 0;
  }
}

/* Close modal */
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
  width: 72px;
  height: 72px;
  border-radius: 999px;
  background: #ffebee;
  border: 1px solid #ffcdd2;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 8px;
}
.close-info-title {
  font-weight: 800;
  font-size: 1.25rem;
  line-height: 1.2;
  display: inline-block;
  text-align: center;
}
</style>
