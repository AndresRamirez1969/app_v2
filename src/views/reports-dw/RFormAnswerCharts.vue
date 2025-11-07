<script setup>
import { ref, computed, watch, onMounted, defineAsyncComponent } from 'vue';
import axios from '@/utils/axios';
import { AVAILABLE_FIELDS } from '@/constants/fieldTypes';

// ApexCharts
const VueApexCharts = defineAsyncComponent(() => import('vue3-apexcharts').then((m) => m.default || m).catch(() => null));

// Heatmap Calendar
import CalendarHeatmap from '@/components/shared/CalendarHeatmap.vue';

// Google Map
import GoogleMap from '@/utils/helpers/google/GoogleMap.vue';

const props = defineProps({
  formId: { type: [String, Number], required: true },
  filters: { type: Object, default: false },
  loading: { type: Boolean, default: false },
  showKpis: { type: Boolean, default: true },
  bins: { type: Number, default: 10 }
});

const localLoading = ref(false);
const form = ref(null);

// KPIs
const totalMaxPoints = ref(null);
const minRequiredPoints = ref(0);
const allScores = ref([]);
const sampleSize = computed(() => allScores.value.length);

const maxScore = computed(() => (sampleSize.value ? Math.max(...allScores.value) : 0));
const meanScore = computed(() => {
  if (!sampleSize.value) return 0;
  const s = allScores.value.reduce((a, b) => a + b, 0);
  return s / sampleSize.value;
});
const medianScore = computed(() => {
  if (!sampleSize.value) return 0;
  const arr = [...allScores.value].sort((a, b) => a - b);
  const mid = Math.floor(arr.length / 2);
  return arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
});

const apexReady = ref(true);
const chartSeries = ref([{ name: 'Respuestas', data: [] }]);
const chartOptions = ref({
  chart: { type: 'bar', height: 350, animations: { enabled: true }, toolbar: { show: false } },
  plotOptions: { bar: { columnWidth: '70%', borderRadius: 6 } },
  dataLabels: { enabled: false },
  xaxis: { categories: [], title: { text: 'Puntos (por rangos)' }, labels: { rotateAlways: false } },
  yaxis: { title: { text: 'Conteo de respuestas' }, min: 0, forceNiceScale: true },
  tooltip: { y: { formatter: (val) => `${val}` } }
});

const svgBars = ref([]);
const svgMaxY = ref(0);
const svgCategories = ref([]);

// ================== Helpers numéricos ==================
const normalizeNumber = (n) => {
  if (n === null || n === undefined) return null;
  const x = typeof n === 'string' ? n.replace(',', '.') : n;
  const num = Number(x);
  return Number.isFinite(num) ? num : null;
};

const numberFmt = (n) => new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(n ?? 0);

const pickWeightFromField = (field) => {
  const keys = ['weight', 'ponderacion', 'points', 'max_points', 'maxPoints', 'score_weight'];
  for (const k of keys) {
    const val = normalizeNumber(field?.[k]);
    if (val !== null) return val;
  }
  return 0;
};

const isRequiredField = (field) => {
  const keys = ['required', 'is_required', 'mandatory', 'isRequired'];
  for (const k of keys) {
    const v = field?.[k];
    if (v === true || v === 1 || v === '1' || v === 'true') return true;
  }
  return false;
};

const sumWeightsFromFieldsList = (list) => {
  if (!Array.isArray(list) || !list.length) return { total: null, minRequired: 0 };
  let total = 0;
  let minRequired = 0;
  for (const f of list) {
    const w = pickWeightFromField(f);
    if (w > 0) {
      total += w;
      if (isRequiredField(f)) minRequired += w;
    }
  }
  return { total: total > 0 ? total : null, minRequired };
};

const extractFieldsContainers = (formObj) => {
  return [
    formObj?.form_fields,
    formObj?.fields,
    formObj?.questions,
    formObj?.form?.form_fields,
    formObj?.form?.fields,
    formObj?.form?.questions
  ].filter(Boolean);
};

const sumWeightsFromForm = (formObj) => {
  const containers = extractFieldsContainers(formObj);
  for (const list of containers) {
    const { total, minRequired } = sumWeightsFromFieldsList(list);
    if (total !== null) return { total, minRequired };
  }
  return { total: null, minRequired: 0 };
};

// bins para distribución de puntuaciones
const buildBins = (values, maxPoints, binCount) => {
  const v = values.filter(Number.isFinite);
  if (!v.length) return { categories: [], counts: [] };
  const X = Number.isFinite(maxPoints) && maxPoints > 0 ? maxPoints : Math.max(...v);
  const bins = Math.max(1, Math.floor(binCount));
  const step = X / bins;
  const counts = Array.from({ length: bins }, () => 0);
  const categories = [];
  for (let i = 0; i < bins; i++) {
    const start = Math.floor(i * step);
    const end = i === bins - 1 ? Math.ceil(X) : Math.floor((i + 1) * step);
    categories.push(`${start} - ${end}`);
  }
  for (const score of v) {
    let idx = Math.floor(score / step);
    if (idx >= bins) idx = bins - 1;
    counts[idx] += 1;
  }
  return { categories, counts };
};

const hasRating = ref(false);

// ================== Evolución temporal de respuestas ==================
const allResponses = ref([]);
const timeSeries = ref([]);
const timeChartOptions = ref({
  chart: { type: 'line', height: 350, toolbar: { show: false } },
  xaxis: { categories: [], title: { text: 'Fecha' } },
  yaxis: { title: { text: 'Respuestas' }, min: 0, offsetY: 20 },
  dataLabels: { enabled: false },
  stroke: { curve: 'smooth' },
  tooltip: { y: { formatter: (val) => `${val}` } },
  grid: { padding: { right: 36, left: 10, top: 10, bottom: 8 } }
});
const timePeriod = ref('day');
const timeChartType = ref('line');

function startOfWeekMonday(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
function weekNumberMonday(date) {
  const monday = startOfWeekMonday(date);
  const yearStart = new Date(Date.UTC(monday.getUTCFullYear(), 0, 1));
  const days = Math.floor((monday - startOfWeekMonday(yearStart)) / 86400000);
  return Math.floor(days / 7) + 1;
}
function groupResponsesByPeriod(responses, period = 'day') {
  const map = new Map();
  const meta = new Map();

  for (const r of responses) {
    const dt = r?.response?.submitted_at || r?.submitted_at;
    if (!dt) continue;
    const d = new Date(dt);

    let key, ts;
    if (period === 'week') {
      const y = d.getFullYear();
      const w = String(weekNumberMonday(d)).padStart(2, '0');
      key = `${y}-S${w}`;
      ts = startOfWeekMonday(d).getTime();
    } else if (period === 'month') {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      key = `${y}-${m}`;
      const firstDay = new Date(Date.UTC(y, d.getMonth(), 1));
      ts = firstDay.getTime();
    } else {
      key = d.toISOString().slice(0, 10);
      const t0 = new Date(key + 'T00:00:00Z');
      ts = t0.getTime();
    }

    map.set(key, (map.get(key) || 0) + 1);
    if (!meta.has(key)) meta.set(key, ts);
  }

  const rows = Array.from(map.keys()).map((k) => ({ label: k, ts: meta.get(k), val: map.get(k) }));
  rows.sort((a, b) => a.ts - b.ts);

  const categories = rows.map((r) => r.label);
  const counts = rows.map((r) => r.val);
  return { categories, counts };
}

const buildTimeChart = () => {
  const { categories, counts } = groupResponsesByPeriod(allResponses.value, timePeriod.value);

  const isMonth = timePeriod.value === 'month';
  timeChartType.value = isMonth ? 'bar' : 'line';

  const maxY = Math.max(0, ...counts);
  const yMaxPadded = maxY > 0 ? Math.ceil(maxY * 1.2) : undefined;

  timeSeries.value = [{ name: 'Respuestas', data: counts }];

  timeChartOptions.value = {
    chart: { type: timeChartType.value, height: 350, toolbar: { show: false } },
    xaxis: {
      categories,
      type: 'category',
      title: { text: 'Fecha' },
      labels: { trim: true, rotate: 0, offsetX: 0, hideOverlappingLabels: true },
      tickPlacement: 'between'
    },
    yaxis: {
      title: { text: 'Respuestas' },
      min: 0,
      max: yMaxPadded,
      offsetY: 20
    },
    dataLabels: {
      enabled: isMonth,
      formatter: (val) => `${val}`
    },
    stroke: {
      curve: 'smooth',
      width: isMonth ? 0 : 3
    },
    markers: {
      size: isMonth ? 0 : 8,
      strokeWidth: isMonth ? 0 : 2,
      hover: { sizeOffset: 3 }
    },
    plotOptions: {
      bar: {
        columnWidth: '45%',
        borderRadius: 6,
        dataLabels: { position: 'top' }
      }
    },
    grid: { padding: { top: 10, right: 40, bottom: 10, left: 12 } },
    tooltip: { y: { formatter: (val) => `${val}` } },
    noData: { text: 'Sin datos en este periodo' }
  };
};

// ================== Porcentaje contestadas vs no contestadas ==================
const percentChartSeries = ref([]);
const percentChartOptions = ref({
  chart: { type: 'donut', height: 320, toolbar: { show: false } },
  labels: ['Contestadas', 'No contestadas'],
  legend: { position: 'bottom' },
  dataLabels: {
    enabled: true,
    formatter: (val) => `${Number(val).toFixed(2)}%`
  },
  tooltip: {
    y: {
      formatter: (val) => `${Number(val).toFixed(2)}%`
    }
  },
  colors: ['#81C784', '#4FC3F7'],
  plotOptions: {
    pie: {
      donut: {
        labels: {
          show: true,
          name: { show: true, formatter: (val) => val },
          value: { show: true, formatter: (val) => `${Number(val).toFixed(2)}%` },
          total: {
            show: true,
            label: 'Total',
            formatter: (w) => {
              const total = w.globals.seriesTotals.reduce((a, b) => a + b, 0);
              const pct = total ? (w.globals.series[0] / total) * 100 : 0;
              return Number(pct).toFixed(2) + '%';
            }
          }
        }
      }
    }
  }
});

const percentTotalQuestions = ref(0);
const percentTotalResponses = ref(0);
const percentAnsweredCount = ref(0);
const percentOmittedCount = ref(0);
const percentAnsweredPct = ref(0);

function buildPercentChart() {
  let fields = [];
  if (form.value) {
    fields =
      form.value.form_fields ||
      form.value.fields ||
      form.value.questions ||
      form.value.form?.form_fields ||
      form.value.form?.fields ||
      form.value.form?.questions ||
      [];
  }
  if (!fields.length || !allResponses.value.length) {
    percentChartSeries.value = [];
    percentTotalQuestions.value = 0;
    percentTotalResponses.value = 0;
    percentAnsweredCount.value = 0;
    percentOmittedCount.value = 0;
    percentAnsweredPct.value = 0;
    return;
  }

  let totalQuestions = fields.length;
  let totalResponses = allResponses.value.length;
  let totalPossibleAnswers = totalQuestions * totalResponses;
  let answeredCount = 0;

  for (const field of fields) {
    const fieldId = field.id;
    for (const resp of allResponses.value) {
      const fieldResponses = resp?.response?.field_responses || resp?.response?.fieldResponses || resp?.field_responses || [];
      const fr = fieldResponses.find(
        (f) => f?.form_field_id === fieldId || f?.formFieldId === fieldId || f?.form_field?.id === fieldId || f?.formField?.id === fieldId
      );
      if (fr && fr.value !== null && fr.value !== undefined && fr.value !== '') {
        answeredCount += 1;
      }
    }
  }

  const omittedCount = totalPossibleAnswers - answeredCount;
  percentChartSeries.value =
    totalPossibleAnswers > 0 ? [(answeredCount / totalPossibleAnswers) * 100, (omittedCount / totalPossibleAnswers) * 100] : [];

  percentTotalQuestions.value = totalQuestions;
  percentTotalResponses.value = totalResponses;
  percentAnsweredCount.value = answeredCount;
  percentOmittedCount.value = omittedCount;
  percentAnsweredPct.value = totalPossibleAnswers > 0 ? (answeredCount / totalPossibleAnswers) * 100 : 0;
}

// ================== Fetchers ==================
const fetchForm = async () => {
  const { data } = await axios.get(`/forms/${props.formId}`);
  const payload = data?.data || data?.form || data;
  form.value = payload;
  hasRating.value = !!payload?.has_rating;
  const { total, minRequired } = sumWeightsFromForm(payload);
  totalMaxPoints.value = total;
  minRequiredPoints.value = minRequired;
};

const fetchAllScores = async () => {
  const scores = [];
  const responsesArr = [];
  let page = 1;
  let lastPage = 1;
  const baseParams = { ...props.filters };
  Object.keys(baseParams).forEach((k) => {
    if (baseParams[k] === null || baseParams[k] === '' || baseParams[k] === undefined) delete baseParams[k];
  });
  do {
    const { data } = await axios.get(`/forms/${props.formId}/responses/reports`, {
      params: { ...baseParams, page, per_page: 100 }
    });
    const resp = Array.isArray(data?.responses) ? data.responses : [];
    for (const r of resp) {
      const s = normalizeNumber(r?.response?.score);
      if (s !== null) scores.push(s);
      responsesArr.push(r);
    }
    page = Number(data?.current_page ?? page);
    lastPage = Number(data?.last_page ?? page);
    page += 1;
  } while (page <= lastPage);
  allScores.value = scores;
  allResponses.value = responsesArr;

  if (totalMaxPoints.value === null) {
    const { data } = await axios.get(`/forms/${props.formId}/responses/reports`, {
      params: { ...baseParams, page: 1, per_page: 1 }
    });
    const firstResp = Array.isArray(data?.responses) && data.responses[0];
    const frs = firstResp?.response?.field_responses || firstResp?.response?.fieldResponses || firstResp?.field_responses;
    if (Array.isArray(frs) && frs.length) {
      const weightsByField = new Map();
      let minReqAcc = 0;
      for (const fr of frs) {
        const ff = fr?.form_field || fr?.formField || {};
        const id = ff?.id ?? fr?.form_field_id;
        if (!id || weightsByField.has(id)) continue;
        const w = pickWeightFromField(ff);
        const req = isRequiredField(ff);
        weightsByField.set(id, w);
        if (w > 0 && req) minReqAcc += w;
      }
      const sum = [...weightsByField.values()].reduce((acc, n) => acc + (Number.isFinite(n) ? n : 0), 0);
      totalMaxPoints.value = sum > 0 ? sum : null;
      if (!minRequiredPoints.value) minRequiredPoints.value = minReqAcc;
    }
  }
  if (totalMaxPoints.value === null) totalMaxPoints.value = Math.max(0, ...scores);
};

const buildChart = () => {
  const { categories, counts } = buildBins(allScores.value, totalMaxPoints.value, props.bins);
  if (!VueApexCharts.__asyncResolved && !apexReady.value) {
    const maxCount = Math.max(0, ...counts);
    svgMaxY.value = maxCount;
    svgCategories.value = categories;
    const width = 800;
    const height = 320;
    const padding = { left: 40, right: 20, top: 10, bottom: 50 };
    const innerW = width - padding.left - padding.right;
    const innerH = height - padding.top - padding.bottom;
    const barW = counts.length ? innerW / counts.length : innerW;
    const unitY = maxCount ? innerH / maxCount : 0;
    svgBars.value = counts.map((c, i) => {
      const h = c * unitY;
      return {
        x: padding.left + i * barW + 6,
        y: padding.top + innerH - h,
        width: Math.max(0, barW - 12),
        height: h,
        label: categories[i]
      };
    });
    chartSeries.value = [{ name: 'Respuestas', data: counts }];
    chartOptions.value = { ...chartOptions.value, xaxis: { ...chartOptions.value.xaxis, categories } };
    return;
  }
  chartSeries.value = [{ name: 'Respuestas', data: counts }];
  chartOptions.value = { ...chartOptions.value, xaxis: { ...chartOptions.value.xaxis, categories } };
};

const reloadAll = async () => {
  localLoading.value = true;
  try {
    await fetchForm();
    await fetchAllScores();
    buildChart();
    buildTimeChart();
    buildPercentChart();
  } catch (e) {
    apexReady.value = false;
    try {
      buildChart();
    } catch (_) {}
    console.error('Error cargando gráficas de respuestas:', e);
  } finally {
    localLoading.value = false;
  }
};

onMounted(reloadAll);

watch(
  () => [props.formId, JSON.stringify(props.filters), timePeriod.value],
  () => reloadAll(),
  { deep: false }
);

// ================== Apartado de campos y respuestas ==================
const fieldSearch = ref({});
const fieldPanels = ref([]);
const fieldResponses = ref([]);
const fieldsList = computed(() => {
  return (
    form.value?.form_fields ||
    form.value?.fields ||
    form.value?.questions ||
    form.value?.form?.form_fields ||
    form.value?.form?.fields ||
    form.value?.form?.questions ||
    []
  );
});

function getResponsesByField(fieldId) {
  const responses = [];
  for (const resp of allResponses.value) {
    const fieldResponsesArr = resp?.response?.field_responses || resp?.response?.fieldResponses || resp?.field_responses || [];
    const fr = fieldResponsesArr.find(
      (f) => f?.form_field_id === fieldId || f?.formFieldId === fieldId || f?.form_field?.id === fieldId || f?.formField?.id === fieldId
    );
    if (fr && fr.value !== null && fr.value !== undefined && fr.value !== '') {
      responses.push({
        value: fr.value,
        user: resp?.response?.user || resp?.user || {},
        date: resp?.response?.submitted_at || resp?.submitted_at,
        folio: resp?.folio || resp?.response?.folio || resp?.id || '',
        nombre: resp?.nombre || resp?.response?.nombre || resp?.name || ''
      });
    }
  }
  return responses;
}

function updateFieldResponses() {
  fieldResponses.value = fieldsList.value.map((field) => ({
    field,
    responses: getResponsesByField(field.id)
  }));
}

watch([fieldsList, allResponses], updateFieldResponses, { immediate: true });

const pageByField = ref({});

function getPaginatedResponses(fieldId, responses) {
  const page = pageByField.value[fieldId] || 1;
  const pageSize = 10;
  const start = (page - 1) * pageSize;
  return responses.slice(start, start + pageSize);
}

function setPage(fieldId, page) {
  pageByField.value[fieldId] = page;
}

// ================== IMAGES: Dropdown y Heatmap por fecha ==================
const selectedImageField = ref({});

// Estado para día y registro seleccionado en el calendario de imágenes
const selectedImageCalendarDay = ref({});
const selectedImageCalendarRecord = ref({});

// Maneja el clic en un día del calendario de imágenes
function onImageCalendarDayClick(fieldId, dayObj) {
  selectedImageCalendarDay.value[fieldId] = typeof dayObj === 'object' && dayObj.date ? dayObj.date : dayObj;
  selectedImageCalendarRecord.value[fieldId] = null;
}

// Obtiene los registros (respuestas) que tienen imágenes en ese día
function getImageRecordsForDay(fieldId, date) {
  const fieldObj = fieldResponses.value.find((f) => f.field.id === fieldId);
  if (!fieldObj || !fieldObj.responses.length || !date) return [];
  return fieldObj.responses.filter((r) => {
    let images = r.value;
    if (typeof images === 'string' && images.startsWith('[')) {
      try {
        images = JSON.parse(images);
      } catch {
        images = [images];
      }
    }
    if (!Array.isArray(images)) images = [images];
    return images.some((img) => {
      let imgDate = img?.date ? img.date.slice(0, 10) : r.date ? r.date.slice(0, 10) : null;
      return imgDate === date;
    });
  });
}

function getImageDateOptions(fieldId) {
  const fieldObj = fieldResponses.value.find((f) => f.field.id === fieldId);
  if (!fieldObj || !fieldObj.responses.length) return [];
  const dates = new Set();
  for (const r of fieldObj.responses) {
    const images = Array.isArray(r.value) ? r.value : [r.value];
    for (const img of images) {
      if (img && img.date) dates.add(img.date.slice(0, 10));
    }
  }
  return Array.from(dates).sort();
}

function getImageHeatmapData(fieldId, filterDate = null) {
  const fieldObj = fieldResponses.value.find((f) => f.field.id === fieldId);
  if (!fieldObj || !fieldObj.responses.length) return [];
  const counts = new Map();
  for (const r of fieldObj.responses) {
    const images = Array.isArray(r.value) ? r.value : [r.value];
    for (const img of images) {
      if (!img) continue;
      let date = img.date ? img.date.slice(0, 10) : r.date ? r.date.slice(0, 10) : null;
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      if (!filterDate || date === filterDate) {
        counts.set(date, (counts.get(date) || 0) + 1);
      }
    }
  }
  const rows = [...counts.entries()].map(([date, value]) => ({ date, value }));
  rows.sort((a, b) => (a.date < b.date ? -1 : 1));
  return rows;
}

// ================== CALENDAR MONTH STATE POR CAMPO ==================
const calendarMonthStartByField = ref({});

function getCalendarMonthStart(fieldId) {
  if (calendarMonthStartByField.value[fieldId] instanceof Date) {
    return calendarMonthStartByField.value[fieldId];
  }
  const data = getImageHeatmapData(fieldId);
  if (data.length && data[0].date) {
    const firstDate = new Date(data[0].date);
    const monthStart = new Date(Date.UTC(firstDate.getUTCFullYear(), firstDate.getUTCMonth(), 1));
    calendarMonthStartByField.value[fieldId] = monthStart;
    return monthStart;
  }
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  calendarMonthStartByField.value[fieldId] = monthStart;
  return monthStart;
}

function setCalendarMonthStart(fieldId, date) {
  if (!(date instanceof Date)) date = new Date(date);
  calendarMonthStartByField.value[fieldId] = date;
}

// ================== CALENDAR MIN/MAX DATES POR CAMPO ==================
function getDateHeatmapData(fieldId) {
  const fieldObj = fieldResponses.value.find((f) => f.field.id === fieldId);
  if (!fieldObj || !fieldObj.responses.length) return [];
  const counts = new Map();
  for (const r of fieldObj.responses) {
    let date = r.value;
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date)) {
      date = date.slice(0, 10);
    } else if (r.date) {
      date = r.date.slice(0, 10);
    } else {
      continue;
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    counts.set(date, (counts.get(date) || 0) + 1);
  }
  const rows = [...counts.entries()].map(([date, value]) => ({ date, value }));
  rows.sort((a, b) => (a.date < b.date ? -1 : 1));
  return rows;
}

function getMinDateForField(fieldId) {
  const data = getDateHeatmapData(fieldId);
  if (!data.length) return '2024-01-01';
  return data[0].date;
}

function getMaxDateForField(fieldId) {
  const data = getDateHeatmapData(fieldId);
  if (!data.length) return '2026-12-31';
  return data[data.length - 1].date;
}

// ================== SELECTOR: Barra horizontal Top-N ==================
function getSelectorOptions(field) {
  let opts = field.options || field.choices || field.values || [];
  if (typeof opts === 'string' && opts.startsWith('[')) {
    try {
      opts = JSON.parse(opts);
    } catch {
      opts = [];
    }
  }
  return opts;
}

// --------- NUEVO: helpers para semáforo ---------
const SEMAFORO_COLORS = {
  alto: '#e53935', // rojo
  medio: '#fbc02d', // amarillo
  bajo: '#43a047' // verde
};
function isSemaforoField(fieldObj) {
  const t = (fieldObj?.type || fieldObj?.input_type || '').toString().toLowerCase();
  const n = (fieldObj?.name || fieldObj?.label || '').toString().toLowerCase();
  // Ajusta si tu backend usa otra convención
  // Queremos "radio" + nombre/label que contenga 'semaforo'
  return t.includes('radio') && n.includes('semaforo');
}

function getSelectorTopNSeries(fieldId, topN = 8) {
  const fieldObj = fieldResponses.value.find((f) => f.field.id === fieldId);
  if (!fieldObj || !fieldObj.responses.length) return [{ name: 'Respuestas', data: [] }];

  const options = getSelectorOptions(fieldObj.field);
  const optionLabels = options.map((opt) => (typeof opt === 'string' ? opt : opt.label || opt.name || opt.value || opt));

  const counts = {};
  for (const r of fieldObj.responses) {
    let values = r.value;

    if (typeof values === 'string' && values.startsWith('[')) {
      try {
        values = JSON.parse(values);
      } catch {
        values = [values];
      }
    }

    const pushOne = (raw) => {
      if (!raw) return;
      let label = typeof raw === 'object' ? raw.label || raw.name || raw.value : raw;
      if (typeof label !== 'string') return;
      label = label.trim();
      if (!label) return;
      const found = optionLabels.find((o) => o && o.toString().trim().toLowerCase() === label.toLowerCase());
      const key = found || label;
      counts[key] = (counts[key] || 0) + 1;
    };

    if (Array.isArray(values)) values.forEach(pushOne);
    else pushOne(values);
  }

  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN);
  const isSem = isSemaforoField(fieldObj.field);

  if (isSem) {
    // Serie con fillColor por punto
    const data = sorted.map(([label, count]) => {
      const key = label.toString().toLowerCase();
      const fillColor =
        key === 'alto' ? SEMAFORO_COLORS.alto : key === 'medio' ? SEMAFORO_COLORS.medio : key === 'bajo' ? SEMAFORO_COLORS.bajo : '#1976d2';
      return { x: label, y: count, fillColor };
    });
    return [{ name: 'Respuestas', data }];
  }

  // No semáforo: serie normal
  const data = sorted.map(([_, count]) => count);
  return [{ name: 'Respuestas', data }];
}

function getSelectorTopNBarOptions(fieldId, topN = 8) {
  const fieldObj = fieldResponses.value.find((f) => f.field.id === fieldId);
  const labelCampo = fieldObj?.field?.label || fieldObj?.field?.title || fieldObj?.field?.name || `Campo ${fieldId}`;
  const options = getSelectorOptions(fieldObj.field);
  const optionLabels = options.map((opt) => (typeof opt === 'string' ? opt : opt.label || opt.name || opt.value || opt));
  const isSem = isSemaforoField(fieldObj?.field);

  // Re-computamos categorías (para xaxis.categories)
  const counts = {};
  for (const r of fieldObj.responses) {
    let values = r.value;
    if (typeof values === 'string' && values.startsWith('[')) {
      try {
        values = JSON.parse(values);
      } catch {
        values = [values];
      }
    }
    const pushOne = (raw) => {
      if (!raw) return;
      let label = typeof raw === 'object' ? raw.label || raw.name || raw.value : raw;
      if (typeof label !== 'string') return;
      label = label.trim();
      if (!label) return;
      const found = optionLabels.find((o) => o && o.toString().trim().toLowerCase() === label.toLowerCase());
      const key = found || label;
      counts[key] = (counts[key] || 0) + 1;
    };
    if (Array.isArray(values)) values.forEach(pushOne);
    else pushOne(values);
  }
  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN);
  const categories = sorted.map(([label]) => label);

  // Paleta fallback (si no se usa fillColor por punto)
  let colors = ['#1976d2'];
  if (isSem) {
    colors = categories.map((cat) => {
      const k = cat.toString().toLowerCase();
      if (k === 'alto') return SEMAFORO_COLORS.alto;
      if (k === 'medio') return SEMAFORO_COLORS.medio;
      if (k === 'bajo') return SEMAFORO_COLORS.bajo;
      return '#1976d2';
    });
  }

  return {
    chart: { type: 'bar', height: 340, toolbar: { show: false } },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: '60%',
        borderRadius: 6,
        // Clave: colores por data point
        distributed: true
      }
    },
    dataLabels: { enabled: true, formatter: (val) => `${val}` },
    xaxis: { categories, title: { text: `${labelCampo} (Top ${topN})` } },
    yaxis: { title: { text: 'Conteo' }, min: 0, forceNiceScale: true },
    tooltip: { y: { formatter: (val) => `${val}` } },
    colors,
    noData: { text: 'Sin datos para este campo' }
  };
}

// ================== NUMERIC HISTOGRAM FOR NUMBER FIELDS ==================
function getNumericHistogramSeries(fieldId) {
  const fieldObj = fieldResponses.value.find((f) => f.field.id === fieldId);
  if (!fieldObj || !fieldObj.responses.length) return [{ name: 'Valores', data: [] }];
  const values = fieldObj.responses.map((r) => normalizeNumber(r.value)).filter(Number.isFinite);
  const maxVal = Math.max(...values);
  const bins = 8;
  const { categories, counts } = buildBins(values, maxVal, bins);
  return [{ name: 'Valores', data: counts }];
}

function getNumericHistogramOptions(fieldId) {
  const fieldObj = fieldResponses.value.find((f) => f.field.id === fieldId);
  const labelCampo = fieldObj?.field?.label || fieldObj?.field?.title || fieldObj?.field?.name || `Campo ${fieldId}`;
  const values = fieldObj.responses.map((r) => normalizeNumber(r.value)).filter(Number.isFinite);
  const maxVal = Math.max(...values);
  const bins = 8;
  const { categories } = buildBins(values, maxVal, bins);
  return {
    chart: { type: 'bar', height: 320, toolbar: { show: false } },
    plotOptions: { bar: { columnWidth: '70%', borderRadius: 6 } },
    dataLabels: { enabled: true, formatter: (val) => `${val}` },
    xaxis: { categories, title: { text: `${labelCampo} (Histograma)` } },
    yaxis: { title: { text: 'Conteo' }, min: 0, forceNiceScale: true },
    tooltip: { y: { formatter: (val) => `${val}` } },
    colors: ['#1976d2'],
    noData: { text: 'Sin datos para este campo' }
  };
}

// ================== CAMPO RANGO NUMÉRICO ==================
function getRangeHistogramSeries(fieldId) {
  const fieldObj = fieldResponses.value.find((f) => f.field.id === fieldId);
  if (!fieldObj || !fieldObj.responses.length) return [{ name: 'Valores', data: [] }];
  const values = fieldObj.responses.map((r) => normalizeNumber(r.value)).filter(Number.isFinite);
  const maxVal = Math.max(...values);
  const bins = 8;
  const { categories, counts } = buildBins(values, maxVal, bins);
  return [{ name: 'Valores', data: counts }];
}

function getRangeHistogramOptions(fieldId) {
  const fieldObj = fieldResponses.value.find((f) => f.field.id === fieldId);
  const labelCampo = fieldObj?.field?.label || fieldObj?.field?.title || fieldObj?.field?.name || `Campo ${fieldId}`;
  const values = fieldObj.responses.map((r) => normalizeNumber(r.value)).filter(Number.isFinite);
  const maxVal = Math.max(...values);
  const bins = 8;
  const { categories } = buildBins(values, maxVal, bins);
  return {
    chart: { type: 'bar', height: 320, toolbar: { show: false } },
    plotOptions: { bar: { columnWidth: '70%', borderRadius: 6 } },
    dataLabels: { enabled: true, formatter: (val) => `${val}` },
    xaxis: { categories, title: { text: `${labelCampo} (Histograma)` } },
    yaxis: { title: { text: 'Conteo' }, min: 0, forceNiceScale: true },
    tooltip: { y: { formatter: (val) => `${val}` } },
    colors: ['#0288d1'],
    noData: { text: 'Sin datos para este campo' }
  };
}

// ================== CAMPO SWITCH ==================
function getSwitchDonutSeries(fieldId) {
  const fieldObj = fieldResponses.value.find((f) => f.field.id === fieldId);
  if (!fieldObj || !fieldObj.responses.length) return [];
  let on = 0,
    off = 0;
  for (const r of fieldObj.responses) {
    if (r.value === true || r.value === 1 || r.value === '1' || r.value === 'true' || r.value === 'on' || r.value === 'activo') on++;
    else off++;
  }
  return [on, off];
}

function getSwitchDonutOptions(fieldId) {
  return {
    chart: { type: 'donut', height: 320, toolbar: { show: false } },
    labels: ['Activado', 'Desactivado'],
    legend: { position: 'bottom' },
    dataLabels: {
      enabled: true,
      formatter: (val, opts) => `${Number(val).toFixed(2)}%`
    },
    tooltip: {
      y: {
        formatter: (val, opts) => {
          const total = opts?.w?.globals?.seriesTotals?.reduce((a, b) => a + b, 0) || 1;
          const percent = total ? (val / total) * 100 : 0;
          return `${percent.toFixed(2)}%`;
        }
      }
    },
    colors: ['#81C784', '#E57373'],
    plotOptions: {
      pie: {
        donut: {
          labels: {
            show: true,
            name: { show: true },
            value: {
              show: true,
              formatter: (val, opts) => {
                const total = opts?.w?.globals?.seriesTotals?.reduce((a, b) => a + b, 0) || 1;
                const percent = total ? (val / total) * 100 : 0;
                return `${percent.toFixed(2)}%`;
              }
            },
            total: {
              show: true,
              label: 'Activados',
              formatter: (w) => {
                const total = w.globals.seriesTotals.reduce((a, b) => a + b, 0);
                const activados = w.globals.series[0];
                const pct = total ? (activados / total) * 100 : 0;
                return Number(pct).toFixed(2) + '%';
              }
            }
          }
        }
      }
    },
    noData: { text: 'Sin datos para este campo' }
  };
}

// --------- GEO NORMALIZATION HELPERS ----------
const geoLayerByField = ref({});

function toNum(v) {
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

// Acepta varios formatos y regresa {lat, lng, label}
function normalizeGeoEntry(raw, label = '-') {
  if (!raw) return null;

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        return normalizeGeoEntry(parsed, label);
      } catch (e) {}
    }
    const parts = trimmed
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      const lat = toNum(parts[0]);
      const lng = toNum(parts[1]);
      if (lat !== null && lng !== null) return { lat, lng, label };
    }
    if (trimmed.includes('=')) {
      const map = Object.fromEntries(trimmed.split('&').map((p) => p.split('=').map((s) => decodeURIComponent(s))));
      const lat = toNum(map.lat ?? map.latitude);
      const lng = toNum(map.lng ?? map.lon ?? map.longitude);
      if (lat !== null && lng !== null) return { lat, lng, label };
    }
    return null;
  }

  if (typeof raw === 'object') {
    let lat = toNum(raw.lat ?? raw.latitude);
    let lng = toNum(raw.lng ?? raw.lon ?? raw.longitude);
    if (lat !== null && lng !== null) return { lat, lng, label };

    const coords = raw.coordinates || raw.coords;
    if (raw.type === 'Point' && Array.isArray(coords) && coords.length >= 2) {
      const _lng = toNum(coords[0]);
      const _lat = toNum(coords[1]);
      if (_lat !== null && _lng !== null) return { lat: _lat, lng: _lng, label };
    }

    const nested = raw.position || raw.geo || raw.location || raw.address || raw.coords || raw.coordinates || raw.point;
    if (nested) return normalizeGeoEntry(nested, label);
  }

  return null;
}

function getGeoPoints(fieldId) {
  const fieldObj = fieldResponses.value.find((f) => f.field.id === fieldId);
  if (!fieldObj) return [];

  const search = (fieldSearch.value?.[fieldId] || '').toString().toLowerCase();

  const filtered = fieldObj.responses.filter((r) => {
    if (!search) return true;
    const folio = (r.folio || r.id || '').toString().toLowerCase();
    const user = (r.user && (r.user.name || r.user).toString().toLowerCase()) || '';
    return folio.includes(search) || user.includes(search);
  });

  const points = [];
  for (const r of filtered) {
    const label = r.folio || r.id || '-';
    const p = normalizeGeoEntry(r.value, label);
    if (p && Number.isFinite(p.lat) && Number.isFinite(p.lng)) points.push(p);
  }
  return points;
}

function getGeoCenter(fieldId) {
  const pts = getGeoPoints(fieldId);
  if (!pts.length) return { lat: 19.432608, lng: -99.133209 }; // CDMX fallback
  const acc = pts.reduce((a, p) => ({ lat: a.lat + p.lat, lng: a.lng + p.lng }), { lat: 0, lng: 0 });
  return { lat: acc.lat / pts.length, lng: acc.lng / pts.length };
}

function getGeoZoom(fieldId) {
  const count = getGeoPoints(fieldId).length;
  if (count <= 1) return 16;
  if (count <= 5) return 14;
  if (count <= 20) return 12;
  return 11;
}

function getGeoAddress(val) {
  let obj = val;
  if (typeof val === 'string') {
    try {
      obj = JSON.parse(val);
    } catch {
      obj = {};
    }
  }
  return (
    [obj?.street, obj?.outdoor_number, obj?.indoor_number, obj?.neighborhood, obj?.postal_code, obj?.city, obj?.state, obj?.country]
      .filter((v) => v && v !== '')
      .join(', ') || '-'
  );
}

function getGeoCoords(val) {
  let obj = val;
  if (typeof val === 'string') {
    try {
      obj = JSON.parse(val);
    } catch {
      obj = {};
    }
  }
  const lat = obj?.lat ?? obj?.latitude ?? obj?.coordinates?.[1] ?? obj?.coords?.[1];
  const lng = obj?.lng ?? obj?.lon ?? obj?.longitude ?? obj?.coordinates?.[0] ?? obj?.coords?.[0];
  if (lat && lng) return `${lat}, ${lng}`;
  return '-';
}

const selectedGroup = ref(null);
const selectedField = ref({});

const groupedFields = computed(() => {
  const groups = {};
  for (const field of fieldsList.value) {
    const groupName = field.group || field.group_name || 'Sin grupo';
    if (!groups[groupName]) groups[groupName] = [];
    groups[groupName].push(field);
  }
  // Ordena preguntas dentro de cada grupo si hay una propiedad 'order'
  Object.keys(groups).forEach((g) => {
    groups[g].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  });
  return groups;
});
</script>

<template>
  <section>
    <h4 class="font-weight-bold mb-3">Información General</h4>
    <v-divider class="mb-6" />

    <v-expansion-panels multiple class="custom-expansion-panels">
      <!-- 1. Evolución temporal de respuestas -->
      <v-expansion-panel>
        <v-expansion-panel-title> Evolución temporal de respuestas </v-expansion-panel-title>
        <v-expansion-panel-text>
          <v-card class="elevation-1 rounded-lg pa-4">
            <div class="d-flex flex-wrap align-center justify-space-between mb-2">
              <div class="text-h6 font-weight-bold">Respuestas por periodo</div>
              <v-btn-toggle v-model="timePeriod" mandatory>
                <v-btn value="day" size="small">Día</v-btn>
                <v-btn value="week" size="small">Semana</v-btn>
                <v-btn value="month" size="small">Mes</v-btn>
              </v-btn-toggle>
            </div>
            <div v-if="sampleSize && apexReady">
              <component :is="VueApexCharts" :type="timeChartType" height="350" :options="timeChartOptions" :series="timeSeries" />
            </div>
            <div v-if="localLoading || loading" class="d-flex align-center justify-center py-6">
              <v-progress-circular indeterminate size="28" />
              <span class="ml-3 text-medium-emphasis">Cargando gráficas…</span>
            </div>
          </v-card>
        </v-expansion-panel-text>
      </v-expansion-panel>

      <!-- 2. Porcentaje de preguntas contestadas vs no contestadas -->
      <v-expansion-panel>
        <v-expansion-panel-title>Porcentaje de preguntas contestadas vs. no contestadas</v-expansion-panel-title>
        <v-expansion-panel-text>
          <v-card class="elevation-1 rounded-lg pa-4">
            <div class="text-h6 font-weight-bold mb-2">Porcentaje de preguntas contestadas vs. no contestadas</div>
            <v-row class="mb-2 kpi-row" dense>
              <v-col cols="12" md="4">
                <div class="d-flex flex-column">
                  <v-card class="kpi-card pa-3 mb-2">
                    <div class="text-caption text-medium-emphasis">Total de preguntas</div>
                    <div class="text-h6">{{ numberFmt(percentTotalQuestions) }}</div>
                  </v-card>
                  <v-card class="kpi-card pa-3 mb-2">
                    <div class="text-caption text-medium-emphasis">Total de respuestas</div>
                    <div class="text-h6">{{ numberFmt(percentTotalResponses) }}</div>
                  </v-card>
                  <v-card class="kpi-card pa-3 mb-2">
                    <div class="text-caption text-medium-emphasis">Total posibles respuestas</div>
                    <div class="text-h6">{{ numberFmt(percentTotalQuestions * percentTotalResponses) }}</div>
                  </v-card>
                  <v-card class="kpi-card pa-3 mb-2">
                    <div class="text-caption text-medium-emphasis">Contestadas</div>
                    <div class="text-h6">{{ numberFmt(percentAnsweredCount) }}</div>
                  </v-card>
                  <v-card class="kpi-card pa-3">
                    <div class="text-caption text-medium-emphasis">No contestadas</div>
                    <div class="text-h6">{{ numberFmt(percentOmittedCount) }}</div>
                  </v-card>
                </div>
              </v-col>
              <v-col cols="12" md="8" class="d-flex align-center justify-center">
                <div v-if="percentChartSeries.length" style="width: 100%; max-width: 400px">
                  <component :is="VueApexCharts" type="donut" height="320" :options="percentChartOptions" :series="percentChartSeries" />
                </div>
                <div v-else class="text-medium-emphasis py-4">No hay datos suficientes para mostrar el gráfico.</div>
              </v-col>
            </v-row>
          </v-card>
        </v-expansion-panel-text>
      </v-expansion-panel>

      <!-- 3. Distribución de puntuaciones -->
      <v-expansion-panel v-if="hasRating">
        <v-expansion-panel-title>Distribución de puntuaciones</v-expansion-panel-title>
        <v-expansion-panel-text>
          <v-card class="elevation-1 rounded-lg pa-4">
            <div class="d-flex flex-wrap align-center justify-space-between">
              <div class="text-h6 font-weight-bold mb-2">Distribución de puntuaciones</div>
              <div class="text-body-2 text-medium-emphasis">
                Eje X (tope): <strong>{{ numberFmt(totalMaxPoints ?? 0) }}</strong> puntos totales del formulario
              </div>
            </div>
            <div class="mt-2">
              <v-alert v-if="!sampleSize" type="info" variant="tonal" class="mb-4">
                No hay respuestas que cumplan los filtros seleccionados.
              </v-alert>
              <v-row v-if="showKpis" class="mb-2" dense>
                <v-col cols="6" md="2">
                  <v-card class="kpi-card pa-3">
                    <div class="text-caption text-medium-emphasis">Respuestas</div>
                    <div class="text-h6">{{ numberFmt(sampleSize) }}</div>
                  </v-card>
                </v-col>
                <v-col cols="6" md="2">
                  <v-card class="kpi-card pa-3">
                    <div class="text-caption text-medium-emphasis">Mínimo requerido</div>
                    <div class="text-h6">{{ numberFmt(minRequiredPoints) }}</div>
                  </v-card>
                </v-col>
                <v-col cols="6" md="2">
                  <v-card class="kpi-card pa-3">
                    <div class="text-caption text-medium-emphasis">Máximo</div>
                    <div class="text-h6">{{ numberFmt(maxScore) }}</div>
                  </v-card>
                </v-col>
                <v-col cols="6" md="3">
                  <v-card class="kpi-card pa-3">
                    <div class="text-caption text-medium-emphasis">Media</div>
                    <div class="text-h6">{{ numberFmt(meanScore) }}</div>
                  </v-card>
                </v-col>
                <v-col cols="6" md="3">
                  <v-card class="kpi-card pa-3">
                    <div class="text-caption text-medium-emphasis">Mediana</div>
                    <div class="text-h6">{{ numberFmt(medianScore) }}</div>
                  </v-card>
                </v-col>
              </v-row>
              <div v-if="sampleSize && apexReady">
                <component :is="VueApexCharts" type="bar" height="350" :options="chartOptions" :series="chartSeries" />
              </div>
              <div v-else-if="sampleSize && !apexReady" class="chart-fallback">
                <svg :width="820" :height="360" role="img" aria-label="Histograma de puntuaciones">
                  <line x1="40" y1="20" x2="40" y2="310" stroke="#ccc" />
                  <line x1="40" y1="310" x2="800" y2="310" stroke="#ccc" />
                  <template v-for="(b, i) in svgBars" :key="i">
                    <rect :x="b.x" :y="b.y" :width="b.width" :height="b.height" fill="#3f51b5" opacity="0.85" />
                  </template>
                  <template v-for="(cat, i) in svgCategories" :key="'cat-' + i">
                    <text
                      :x="50 + i * ((800 - 60) / Math.max(1, svgCategories.length))"
                      y="340"
                      font-size="10"
                      fill="#666"
                      transform="rotate(20, 50, 340)"
                    >
                      {{ cat }}
                    </text>
                  </template>
                </svg>
              </div>
              <div v-if="localLoading || loading" class="d-flex align-center justify-center py-6">
                <v-progress-circular indeterminate size="28" />
                <span class="ml-3 text-medium-emphasis">Cargando gráficas…</span>
              </div>
            </div>
          </v-card>
        </v-expansion-panel-text>
      </v-expansion-panel>
      <!-- FIN Información General -->
    </v-expansion-panels>

    <!-- Apartado de campos y respuestas -->
    <h4 class="font-weight-bold mt-10 mb-3">Campos y Respuestas</h4>
    <v-divider class="mb-6" />

    <v-expansion-panels multiple class="custom-expansion-panels">
      <template v-for="(fieldObj, idx) in fieldResponses" :key="fieldObj.field.id">
        <v-expansion-panel>
          <v-expansion-panel-title>
            <span v-if="fieldObj.field.type === 'text'">
              Campo de texto: {{ fieldObj.field.label || fieldObj.field.title || fieldObj.field.name || `Campo ${idx + 1}` }}
            </span>
            <span v-else-if="fieldObj.field.type === 'textarea'">
              Área de texto: {{ fieldObj.field.label || fieldObj.field.title || fieldObj.field.name || `Campo ${idx + 1}` }}
            </span>
            <span v-else-if="fieldObj.field.type === 'email'">
              Email: {{ fieldObj.field.label || fieldObj.field.title || fieldObj.field.name || `Campo ${idx + 1}` }}
            </span>
            <span v-else-if="fieldObj.field.type === 'time'">
              Hora: {{ fieldObj.field.label || fieldObj.field.title || fieldObj.field.name || `Campo ${idx + 1}` }}
            </span>
            <span v-else-if="fieldObj.field.type === 'number' || fieldObj.field.type === 'integer' || fieldObj.field.type === 'float'">
              Campo numérico: {{ fieldObj.field.label || fieldObj.field.title || fieldObj.field.name || `Campo ${idx + 1}` }}
            </span>
            <span v-else>
              {{ fieldObj.field.label || fieldObj.field.title || fieldObj.field.name || `Campo ${idx + 1}` }}
              <span class="ml-2 text-caption text-medium-emphasis">({{ fieldObj.field.type }})</span>
            </span>
          </v-expansion-panel-title>

          <v-expansion-panel-text>
            <!-- Campo de texto -->
            <div v-if="fieldObj.field.type === 'text'">
              <div class="search-table-container">
                <v-table density="compact" style="width: 100%">
                  <tbody>
                    <tr>
                      <td>
                        <v-text-field
                          v-model="fieldSearch[fieldObj.field.id]"
                          :placeholder="`Buscar respuesta...`"
                          prepend-inner-icon="mdi-magnify"
                          clearable
                          class="custom-search"
                          density="compact"
                          variant="outlined"
                          color="primary"
                          hide-details
                          style="width: 100%; min-width: 0; padding-bottom: 12px"
                        />
                      </td>
                    </tr>
                    <tr
                      v-for="(resp, i) in getPaginatedResponses(
                        fieldObj.field.id,
                        fieldObj.responses.filter((r) => {
                          const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                          return !search || (r.value && r.value.toString().toLowerCase().includes(search));
                        })
                      )"
                      :key="i"
                      class="response-row"
                    >
                      <td>
                        <div class="response-value-cell">{{ resp.value }}</div>
                      </td>
                    </tr>
                    <tr
                      v-if="
                        fieldObj.responses.filter((r) => {
                          const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                          return !search || (r.value && r.value.toString().toLowerCase().includes(search));
                        }).length === 0
                      "
                    >
                      <td class="text-medium-emphasis">No hay respuestas registradas.</td>
                    </tr>
                  </tbody>
                </v-table>
                <div class="d-flex flex-column align-center mt-2">
                  <v-pagination
                    :model-value="pageByField[fieldObj.field.id]"
                    :length="
                      Math.max(
                        1,
                        Math.ceil(
                          fieldObj.responses.filter((r) => {
                            const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                            return !search || (r.value && r.value.toString().toLowerCase().includes(search));
                          }).length / 10
                        )
                      )
                    "
                    :total-visible="1"
                    color="primary"
                    @update:modelValue="setPage(fieldObj.field.id, $event)"
                    class="mobile-pagination"
                  />
                </div>
              </div>
            </div>

            <!-- Área de texto -->
            <div v-else-if="fieldObj.field.type === 'textarea'">
              <div class="search-table-container">
                <v-table density="compact" style="width: 100%">
                  <tbody>
                    <tr>
                      <td>
                        <v-textarea
                          v-model="fieldSearch[fieldObj.field.id]"
                          :placeholder="`Buscar respuesta...`"
                          prepend-inner-icon="mdi-magnify"
                          clearable
                          class="custom-search"
                          density="compact"
                          variant="outlined"
                          color="primary"
                          hide-details
                          style="width: 100%; min-width: 0; padding-bottom: 12px"
                          rows="1"
                          auto-grow
                        />
                      </td>
                    </tr>
                    <tr
                      v-for="(resp, i) in getPaginatedResponses(
                        fieldObj.field.id,
                        fieldObj.responses.filter((r) => {
                          const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                          return !search || (r.value && r.value.toString().toLowerCase().includes(search));
                        })
                      )"
                      :key="i"
                      class="response-row"
                    >
                      <td>
                        <div class="response-value-cell">{{ resp.value }}</div>
                      </td>
                    </tr>
                    <tr
                      v-if="
                        fieldObj.responses.filter((r) => {
                          const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                          return !search || (r.value && r.value.toString().toLowerCase().includes(search));
                        }).length === 0
                      "
                    >
                      <td class="text-medium-emphasis">No hay respuestas registradas.</td>
                    </tr>
                  </tbody>
                </v-table>
                <div class="d-flex flex-column align-center mt-2">
                  <v-pagination
                    :model-value="pageByField[fieldObj.field.id]"
                    :length="
                      Math.max(
                        1,
                        Math.ceil(
                          fieldObj.responses.filter((r) => {
                            const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                            return !search || (r.value && r.value.toString().toLowerCase().includes(search));
                          }).length / 10
                        )
                      )
                    "
                    :total-visible="1"
                    color="primary"
                    @update:modelValue="setPage(fieldObj.field.id, $event)"
                    class="mobile-pagination"
                  />
                </div>
              </div>
            </div>

            <!-- Campo email -->
            <div v-else-if="fieldObj.field.type === 'email'">
              <div class="search-table-container">
                <v-table density="compact" style="width: 100%">
                  <tbody>
                    <tr>
                      <td>
                        <v-text-field
                          v-model="fieldSearch[fieldObj.field.id]"
                          :placeholder="`Buscar email...`"
                          prepend-inner-icon="mdi-magnify"
                          clearable
                          class="custom-search"
                          density="compact"
                          variant="outlined"
                          color="primary"
                          hide-details
                          style="width: 100%; min-width: 0; padding-bottom: 12px"
                        />
                      </td>
                    </tr>
                    <tr
                      v-for="(resp, i) in getPaginatedResponses(
                        fieldObj.field.id,
                        fieldObj.responses.filter((r) => {
                          const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                          return !search || (r.value && r.value.toString().toLowerCase().includes(search));
                        })
                      )"
                      :key="i"
                      class="response-row"
                    >
                      <td>
                        <div class="response-value-cell">{{ resp.value }}</div>
                      </td>
                    </tr>
                    <tr
                      v-if="
                        fieldObj.responses.filter((r) => {
                          const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                          return !search || (r.value && r.value.toString().toLowerCase().includes(search));
                        }).length === 0
                      "
                    >
                      <td class="text-medium-emphasis">No hay emails registrados.</td>
                    </tr>
                  </tbody>
                </v-table>
                <div class="d-flex flex-column align-center mt-2">
                  <v-pagination
                    :model-value="pageByField[fieldObj.field.id]"
                    :length="
                      Math.max(
                        1,
                        Math.ceil(
                          fieldObj.responses.filter((r) => {
                            const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                            return !search || (r.value && r.value.toString().toLowerCase().includes(search));
                          }).length / 10
                        )
                      )
                    "
                    :total-visible="1"
                    color="primary"
                    @update:modelValue="setPage(fieldObj.field.id, $event)"
                    class="mobile-pagination"
                  />
                </div>
              </div>
            </div>

            <!-- ======= CAMPO NUMÉRICO: Histograma + tabla ======= -->
            <div v-else-if="fieldObj.field.type === 'number' || fieldObj.field.type === 'integer' || fieldObj.field.type === 'float'">
              <div class="mb-2 d-flex align-center justify-space-between">
                <div class="text-h6 font-weight-bold">Distribución (Histograma)</div>
              </div>

              <div v-if="fieldObj.responses.length">
                <component
                  :is="VueApexCharts"
                  type="bar"
                  height="320"
                  :key="`histogram-${fieldObj.field.id}-${fieldObj.responses.length}`"
                  :options="getNumericHistogramOptions(fieldObj.field.id)"
                  :series="getNumericHistogramSeries(fieldObj.field.id)"
                />
              </div>
              <div v-else class="text-medium-emphasis py-4">No hay datos suficientes para mostrar el gráfico.</div>

              <!-- Tabla simple con búsqueda -->
              <div class="search-table-container mt-6">
                <v-table density="compact" style="width: 100%">
                  <tbody>
                    <tr>
                      <td>
                        <v-text-field
                          v-model="fieldSearch[fieldObj.field.id]"
                          :placeholder="`Buscar valor...`"
                          prepend-inner-icon="mdi-magnify"
                          clearable
                          class="custom-search"
                          density="compact"
                          variant="outlined"
                          color="primary"
                          hide-details
                          style="width: 100%; min-width: 0; padding-bottom: 12px"
                        />
                      </td>
                    </tr>
                    <tr
                      v-for="(resp, i) in getPaginatedResponses(
                        fieldObj.field.id,
                        fieldObj.responses.filter((r) => {
                          const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                          return !search || (r.value && r.value.toString().toLowerCase().includes(search));
                        })
                      )"
                      :key="i"
                      class="response-row"
                    >
                      <td>
                        <div class="response-value-cell">{{ numberFmt(normalizeNumber(resp.value)) }}</div>
                      </td>
                    </tr>
                    <tr
                      v-if="
                        fieldObj.responses.filter((r) => {
                          const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                          return !search || (r.value && r.value.toString().toLowerCase().includes(search));
                        }).length === 0
                      "
                    >
                      <td class="text-medium-emphasis">No hay valores numéricos válidos.</td>
                    </tr>
                  </tbody>
                </v-table>
                <div class="d-flex flex-column align-center mt-2">
                  <v-pagination
                    :model-value="pageByField[fieldObj.field.id]"
                    :length="
                      Math.max(
                        1,
                        Math.ceil(
                          fieldObj.responses.filter((r) => {
                            const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                            return !search || (r.value && r.value.toString().toLowerCase().includes(search));
                          }).length / 10
                        )
                      )
                    "
                    :total-visible="1"
                    color="primary"
                    @update:modelValue="setPage(fieldObj.field.id, $event)"
                    class="mobile-pagination"
                  />
                </div>
              </div>
            </div>

            <!-- Campo FECHA: Heatmap + searchbar + tabla de registros -->
            <div v-else-if="fieldObj.field.type === 'date'">
              <div class="mb-2 d-flex align-center justify-space-between">
                <div class="text-h6 font-weight-bold">Respuestas por fecha (Calendario)</div>
              </div>

              <div v-if="fieldObj.responses.length" class="calendar-heatmap-center calendar-heatmap-lg">
                <CalendarHeatmap
                  :data="getDateHeatmapData(fieldObj.field.id)"
                  :month-start="getCalendarMonthStart(fieldObj.field.id)"
                  :months="1"
                  density="tiny"
                  :scale="0.92"
                  :minColumnWidthPx="220"
                  :maxWidthPx="420"
                  :allowNavigate="true"
                  :minDate="getMinDateForField(fieldObj.field.id)"
                  :maxDate="getMaxDateForField(fieldObj.field.id)"
                  showHeader
                  showLegend
                  @update:monthStart="(date) => setCalendarMonthStart(fieldObj.field.id, date)"
                />
              </div>
              <div v-else class="text-medium-emphasis py-4">No hay datos suficientes para mostrar el calendario.</div>

              <!-- Searchbar y tabla de registros debajo del calendario -->
              <div class="search-table-container mt-6">
                <v-text-field
                  v-model="fieldSearch[fieldObj.field.id]"
                  :placeholder="`Buscar fecha o usuario...`"
                  prepend-inner-icon="mdi-magnify"
                  clearable
                  class="custom-search"
                  density="compact"
                  variant="outlined"
                  color="primary"
                  hide-details
                  style="width: 100%; min-width: 0; padding-bottom: 12px"
                />
                <v-table density="compact" style="width: 100%">
                  <tbody>
                    <tr
                      v-for="(resp, i) in getPaginatedResponses(
                        fieldObj.field.id,
                        fieldObj.responses.filter((r) => {
                          const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                          return (
                            !search ||
                            (r.value && r.value.toString().toLowerCase().includes(search)) ||
                            (r.user && r.user.toString().toLowerCase().includes(search))
                          );
                        })
                      )"
                      :key="i"
                      class="response-row"
                    >
                      <td>
                        <div class="response-value-cell">
                          <span>{{ resp.value }}</span>
                          <span v-if="resp.user" class="ml-2 text-caption text-medium-emphasis">({{ resp.user }})</span>
                        </div>
                      </td>
                    </tr>
                    <tr
                      v-if="
                        fieldObj.responses.filter((r) => {
                          const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                          return (
                            !search ||
                            (r.value && r.value.toString().toLowerCase().includes(search)) ||
                            (r.user && r.user.toString().toLowerCase().includes(search))
                          );
                        }).length === 0
                      "
                    >
                      <td class="text-medium-emphasis">No hay registros de fechas.</td>
                    </tr>
                  </tbody>
                </v-table>
                <div class="d-flex flex-column align-center mt-2">
                  <v-pagination
                    :model-value="pageByField[fieldObj.field.id]"
                    :length="
                      Math.max(
                        1,
                        Math.ceil(
                          fieldObj.responses.filter((r) => {
                            const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                            return (
                              !search ||
                              (r.value && r.value.toString().toLowerCase().includes(search)) ||
                              (r.user && r.user.toString().toLowerCase().includes(search))
                            );
                          }).length / 10
                        )
                      )
                    "
                    :total-visible="1"
                    color="primary"
                    @update:modelValue="setPage(fieldObj.field.id, $event)"
                    class="mobile-pagination"
                  />
                </div>
              </div>
            </div>

            <div
              v-else-if="
                fieldObj.field.type === 'selector' ||
                fieldObj.field.type === 'select' ||
                fieldObj.field.type === 'dropdown' ||
                fieldObj.field.type === 'radio' ||
                fieldObj.field.type === 'checkbox'
              "
            >
              <div class="mb-2 d-flex align-center justify-space-between">
                <div class="text-h6">
                  Top opciones seleccionadas
                  <span v-if="fieldObj.field.type === 'radio'">(Radio)</span>
                  <span v-if="fieldObj.field.type === 'checkbox'">(Checkbox)</span>
                </div>
              </div>
              <div v-if="fieldObj.responses.length">
                <component
                  :is="VueApexCharts"
                  type="bar"
                  height="340"
                  :key="`selector-topn-${fieldObj.field.id}-${fieldObj.responses.length}`"
                  :options="getSelectorTopNBarOptions(fieldObj.field.id, 8)"
                  :series="getSelectorTopNSeries(fieldObj.field.id, 8)"
                />
              </div>
              <div v-else class="text-medium-emphasis py-4">No hay datos suficientes para mostrar el gráfico.</div>
              <!-- Tabla simple con búsqueda -->
              <div class="search-table-container mt-6">
                <v-table density="compact" style="width: 100%">
                  <tbody>
                    <tr>
                      <td>
                        <v-text-field
                          v-model="fieldSearch[fieldObj.field.id]"
                          :placeholder="`Buscar opción o usuario...`"
                          prepend-inner-icon="mdi-magnify"
                          clearable
                          class="custom-search"
                          density="compact"
                          variant="outlined"
                          color="primary"
                          hide-details
                          style="width: 100%; min-width: 0; padding-bottom: 12px"
                        />
                      </td>
                    </tr>
                    <tr
                      v-for="(resp, i) in getPaginatedResponses(
                        fieldObj.field.id,
                        fieldObj.responses.filter((r) => {
                          const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                          return (
                            !search ||
                            (r.value && r.value.toString().toLowerCase().includes(search)) ||
                            (r.user && r.user.toString().toLowerCase().includes(search))
                          );
                        })
                      )"
                      :key="i"
                      class="response-row"
                    >
                      <td>
                        <div class="response-value-cell">
                          <template v-if="Array.isArray(resp.value)">
                            {{
                              resp.value
                                .map((v) => (typeof v === 'object' && v !== null ? v.label || v.name || v.value || '' : v))
                                .filter((v) => v !== '')
                                .join(', ')
                            }}
                          </template>
                          <template v-else-if="typeof resp.value === 'string' && resp.value.startsWith('[')">
                            {{
                              JSON.parse(resp.value)
                                .map((v) => (typeof v === 'object' && v !== null ? v.label || v.name || v.value || '' : v))
                                .filter((v) => v !== '')
                                .join(', ')
                            }}
                          </template>
                          <template v-else>
                            {{
                              typeof resp.value === 'object' && resp.value !== null
                                ? resp.value.label || resp.value.name || resp.value.value || ''
                                : resp.value
                            }}
                          </template>
                          <span v-if="resp.user" class="ml-2 text-caption text-medium-emphasis">({{ resp.user }})</span>
                        </div>
                      </td>
                    </tr>
                    <tr
                      v-if="
                        fieldObj.responses.filter((r) => {
                          const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                          return (
                            !search ||
                            (r.value && r.value.toString().toLowerCase().includes(search)) ||
                            (r.user && r.user.toString().toLowerCase().includes(search))
                          );
                        }).length === 0
                      "
                    >
                      <td class="text-medium-emphasis">No hay registros de opciones.</td>
                    </tr>
                  </tbody>
                </v-table>
                <div class="d-flex flex-column align-center mt-2">
                  <v-pagination
                    :model-value="pageByField[fieldObj.field.id]"
                    :length="
                      Math.max(
                        1,
                        Math.ceil(
                          fieldObj.responses.filter((r) => {
                            const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                            return (
                              !search ||
                              (r.value && r.value.toString().toLowerCase().includes(search)) ||
                              (r.user && r.user.toString().toLowerCase().includes(search))
                            );
                          }).length / 10
                        )
                      )
                    "
                    :total-visible="1"
                    color="primary"
                    @update:modelValue="setPage(fieldObj.field.id, $event)"
                    class="mobile-pagination"
                  />
                </div>
              </div>
            </div>

            <!-- Campo IMAGEN, DOCUMENTO y FIRMA: solo heatmap y tabla de registros, sin visualización de archivos -->
            <div v-if="['image', 'imagenes', 'document', 'documento', 'firma', 'signature'].includes(fieldObj.field.type)">
              <div class="mb-2 d-flex align-center justify-space-between">
                <div class="text-h6 font-weight-bold">
                  {{
                    fieldObj.field.type === 'image' || fieldObj.field.type === 'imagenes'
                      ? 'Imágenes por fecha'
                      : fieldObj.field.type === 'document' || fieldObj.field.type === 'documento'
                        ? 'Documentos por fecha'
                        : 'Firmas por fecha'
                  }}
                </div>
              </div>

              <div v-if="fieldObj.responses.length" class="calendar-heatmap-center calendar-heatmap-lg">
                <CalendarHeatmap
                  :data="getImageHeatmapData(fieldObj.field.id, selectedImageField[fieldObj.field.id])"
                  :month-start="getCalendarMonthStart(fieldObj.field.id)"
                  :months="1"
                  density="tiny"
                  :scale="0.92"
                  :minColumnWidthPx="220"
                  :maxWidthPx="420"
                  :allowNavigate="true"
                  :minDate="getMinDateForField(fieldObj.field.id)"
                  :maxDate="getMaxDateForField(fieldObj.field.id)"
                  showHeader
                  showLegend
                  @update:monthStart="(date) => setCalendarMonthStart(fieldObj.field.id, date)"
                  @dayClick="(date) => onImageCalendarDayClick(fieldObj.field.id, date)"
                />
              </div>
              <div v-else class="text-medium-emphasis py-4">No hay datos suficientes para mostrar el calendario.</div>

              <!-- Registros del día seleccionado con searchbar y paginación, sin visualización de archivos -->
              <div v-if="selectedImageCalendarDay[fieldObj.field.id]">
                <div class="search-table-container">
                  <v-text-field
                    v-model="fieldSearch[fieldObj.field.id]"
                    :placeholder="`Buscar folio o usuario...`"
                    prepend-inner-icon="mdi-magnify"
                    clearable
                    class="custom-search"
                    density="compact"
                    variant="outlined"
                    color="primary"
                    hide-details
                    style="width: 100%; min-width: 0; padding-bottom: 12px"
                  />

                  <!-- Tabla en desktop -->
                  <v-table density="compact" style="width: 100%" class="image-records-table d-none d-md-table">
                    <thead>
                      <tr>
                        <th>Folio</th>
                        <th>Usuario</th>
                        <th>
                          {{
                            fieldObj.field.type === 'image' || fieldObj.field.type === 'imagenes'
                              ? 'Imágenes'
                              : fieldObj.field.type === 'document' || fieldObj.field.type === 'documento'
                                ? 'Documentos'
                                : 'Firmas'
                          }}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <template
                        v-for="(resp, i) in getPaginatedResponses(
                          fieldObj.field.id,
                          getImageRecordsForDay(fieldObj.field.id, selectedImageCalendarDay[fieldObj.field.id]).filter((r) => {
                            const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                            return (
                              !search ||
                              (r.folio && r.folio.toString().toLowerCase().includes(search)) ||
                              (r.user && r.user.toString().toLowerCase().includes(search))
                            );
                          })
                        )"
                        :key="i"
                      >
                        <tr class="response-row record-row">
                          <td class="response-value-cell">
                            <span class="folio-link" style="color: #1976d2; text-decoration: underline; font-weight: 500">
                              {{ resp.folio || resp.id || '-' }}
                            </span>
                          </td>
                          <td class="response-value-cell">
                            <span class="font-weight-medium">{{ resp.user?.name || '-' }}</span>
                          </td>
                          <td class="response-value-cell">
                            {{
                              Array.isArray(resp.value)
                                ? resp.value.length
                                : typeof resp.value === 'string' && resp.value.startsWith('[')
                                  ? JSON.parse(resp.value).length
                                  : resp.value
                                    ? 1
                                    : 0
                            }}
                          </td>
                        </tr>
                      </template>
                      <tr
                        v-if="
                          getImageRecordsForDay(fieldObj.field.id, selectedImageCalendarDay[fieldObj.field.id]).filter((r) => {
                            const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                            return (
                              !search ||
                              (r.folio && r.folio.toString().toLowerCase().includes(search)) ||
                              (r.user && r.user.toString().toLowerCase().includes(search))
                            );
                          }).length === 0
                        "
                      >
                        <td colspan="3" class="text-medium-emphasis">No hay registros para este día.</td>
                      </tr>
                    </tbody>
                  </v-table>

                  <!-- Cards en móvil/tablet, sin visualización de archivos -->
                  <div class="image-records-cards d-md-none">
                    <v-row>
                      <v-col
                        v-for="(resp, i) in getPaginatedResponses(
                          fieldObj.field.id,
                          getImageRecordsForDay(fieldObj.field.id, selectedImageCalendarDay[fieldObj.field.id]).filter((r) => {
                            const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                            return (
                              !search ||
                              (r.folio && r.folio.toString().toLowerCase().includes(search)) ||
                              (r.user && r.user.toString().toLowerCase().includes(search))
                            );
                          })
                        )"
                        :key="i"
                        cols="12"
                      >
                        <v-card class="mb-4 pa-3 elevation-1 rounded-lg response-card" style="cursor: default">
                          <div class="d-flex flex-column mb-1" style="gap: 8px">
                            <span
                              class="folio-link text-caption"
                              style="color: #1976d2; text-decoration: underline; font-weight: 500; min-width: 60px"
                            >
                              {{ resp.folio || resp.id || '-' }}
                            </span>
                            <span class="font-weight-medium" style="color: #333; font-size: 1.08rem">
                              {{ resp.user?.name || '-' }}
                            </span>
                            <span style="font-size: 1.08rem; color: #1976d2">
                              <strong>
                                {{
                                  fieldObj.field.type === 'image' || fieldObj.field.type === 'imagenes'
                                    ? 'Imágenes:'
                                    : fieldObj.field.type === 'document' || fieldObj.field.type === 'documento'
                                      ? 'Documentos:'
                                      : 'Firmas:'
                                }}
                              </strong>
                              {{
                                Array.isArray(resp.value)
                                  ? resp.value.length
                                  : typeof resp.value === 'string' && resp.value.startsWith('[')
                                    ? JSON.parse(resp.value).length
                                    : resp.value
                                      ? 1
                                      : 0
                              }}
                            </span>
                          </div>
                        </v-card>
                      </v-col>
                      <v-col
                        v-if="
                          getImageRecordsForDay(fieldObj.field.id, selectedImageCalendarDay[fieldObj.field.id]).filter((r) => {
                            const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                            return (
                              !search ||
                              (r.folio && r.folio.toString().toLowerCase().includes(search)) ||
                              (r.user && r.user.toString().toLowerCase().includes(search))
                            );
                          }).length === 0
                        "
                        cols="12"
                      >
                        <v-card class="response-card pa-3 text-medium-emphasis mb-4 rounded-lg elevation-1">
                          No hay registros para este día.
                        </v-card>
                      </v-col>
                    </v-row>
                  </div>

                  <div class="d-flex flex-column align-center mt-2">
                    <v-pagination
                      :model-value="pageByField[fieldObj.field.id]"
                      :length="
                        Math.max(
                          1,
                          Math.ceil(
                            getImageRecordsForDay(fieldObj.field.id, selectedImageCalendarDay[fieldObj.field.id]).filter((r) => {
                              const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                              return (
                                !search ||
                                (r.folio && r.folio.toString().toLowerCase().includes(search)) ||
                                (r.user && r.user.toString().toLowerCase().includes(search))
                              );
                            }).length / 10
                          )
                        )
                      "
                      :total-visible="1"
                      color="primary"
                      @update:modelValue="setPage(fieldObj.field.id, $event)"
                      class="mobile-pagination"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Campo RANGO: Histograma + searchbar + tabla de registros -->
            <div v-else-if="fieldObj.field.type === 'range'">
              <div class="mb-2 d-flex align-center justify-space-between">
                <div class="text-h6 font-weight-bold">Distribución (Histograma de rango)</div>
              </div>

              <div v-if="fieldObj.responses.length">
                <component
                  :is="VueApexCharts"
                  type="bar"
                  height="320"
                  :key="`range-histogram-${fieldObj.field.id}-${fieldObj.responses.length}`"
                  :options="getRangeHistogramOptions(fieldObj.field.id)"
                  :series="getRangeHistogramSeries(fieldObj.field.id)"
                />
              </div>
              <div v-else class="text-medium-emphasis py-4">No hay datos suficientes para mostrar el gráfico.</div>

              <!-- Searchbar y tabla/cards de registros debajo del histograma -->
              <div class="search-table-container mt-6">
                <v-text-field
                  v-model="fieldSearch[fieldObj.field.id]"
                  :placeholder="`Buscar folio, usuario o valor...`"
                  prepend-inner-icon="mdi-magnify"
                  clearable
                  class="custom-search"
                  density="compact"
                  variant="outlined"
                  color="primary"
                  hide-details
                  style="width: 100%; min-width: 0; padding-bottom: 12px"
                />

                <!-- Tabla en desktop -->
                <v-table density="compact" style="width: 100%" class="image-records-table d-none d-md-table">
                  <thead>
                    <tr>
                      <th>Folio</th>
                      <th>Usuario</th>
                      <th>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    <template
                      v-for="(resp, i) in getPaginatedResponses(
                        fieldObj.field.id,
                        fieldObj.responses.filter((r) => {
                          const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                          return (
                            !search ||
                            (r.folio && r.folio.toString().toLowerCase().includes(search)) ||
                            (r.user && r.user.toString().toLowerCase().includes(search)) ||
                            (r.value && r.value.toString().toLowerCase().includes(search))
                          );
                        })
                      )"
                      :key="i"
                    >
                      <tr class="response-row record-row">
                        <td class="response-value-cell">
                          <span class="folio-link" style="color: #1976d2; text-decoration: underline; font-weight: 500">
                            {{ resp.folio || resp.id || '-' }}
                          </span>
                        </td>
                        <td class="response-value-cell">
                          <span class="font-weight-medium">{{ resp.user?.name || resp.user || '-' }}</span>
                        </td>
                        <td class="response-value-cell">
                          {{ numberFmt(normalizeNumber(resp.value)) }}
                        </td>
                      </tr>
                    </template>
                    <tr
                      v-if="
                        fieldObj.responses.filter((r) => {
                          const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                          return (
                            !search ||
                            (r.folio && r.folio.toString().toLowerCase().includes(search)) ||
                            (r.user && r.user.toString().toLowerCase().includes(search)) ||
                            (r.value && r.value.toString().toLowerCase().includes(search))
                          );
                        }).length === 0
                      "
                    >
                      <td colspan="3" class="text-medium-emphasis">No hay registros de rango.</td>
                    </tr>
                  </tbody>
                </v-table>

                <!-- Cards en móvil/tablet -->
                <div class="image-records-cards d-md-none">
                  <v-row>
                    <v-col
                      v-for="(resp, i) in getPaginatedResponses(
                        fieldObj.field.id,
                        fieldObj.responses.filter((r) => {
                          const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                          return (
                            !search ||
                            (r.folio && r.folio.toString().toLowerCase().includes(search)) ||
                            (r.user && r.user.toString().toLowerCase().includes(search)) ||
                            (r.value && r.value.toString().toLowerCase().includes(search))
                          );
                        })
                      )"
                      :key="i"
                      cols="12"
                    >
                      <v-card class="mb-4 pa-3 elevation-1 rounded-lg response-card" style="cursor: default">
                        <div class="d-flex flex-column mb-1" style="gap: 8px">
                          <span
                            class="folio-link text-caption"
                            style="color: #1976d2; text-decoration: underline; font-weight: 500; min-width: 60px"
                          >
                            {{ resp.folio || resp.id || '-' }}
                          </span>
                          <span class="font-weight-medium" style="color: #333; font-size: 0.9rem">
                            {{ resp.user?.name || resp.user || '-' }}
                          </span>
                          <span style="font-size: 0.9rem; color: #1976d2">
                            <strong>Valor:</strong> {{ numberFmt(normalizeNumber(resp.value)) }}
                          </span>
                        </div>
                      </v-card>
                    </v-col>
                    <v-col
                      v-if="
                        fieldObj.responses.filter((r) => {
                          const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                          return (
                            !search ||
                            (r.folio && r.folio.toString().toLowerCase().includes(search)) ||
                            (r.user && r.user.toString().toLowerCase().includes(search)) ||
                            (r.value && r.value.toString().toLowerCase().includes(search))
                          );
                        }).length === 0
                      "
                      cols="12"
                    >
                      <v-card class="response-card pa-3 text-medium-emphasis mb-4 rounded-lg elevation-1">
                        No hay registros de rango.
                      </v-card>
                    </v-col>
                  </v-row>
                </div>

                <div class="d-flex flex-column align-center mt-2">
                  <v-pagination
                    :model-value="pageByField[fieldObj.field.id]"
                    :length="
                      Math.max(
                        1,
                        Math.ceil(
                          fieldObj.responses.filter((r) => {
                            const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                            return (
                              !search ||
                              (r.folio && r.folio.toString().toLowerCase().includes(search)) ||
                              (r.user && r.user.toString().toLowerCase().includes(search)) ||
                              (r.value && r.value.toString().toLowerCase().includes(search))
                            );
                          }).length / 10
                        )
                      )
                    "
                    :total-visible="1"
                    color="primary"
                    @update:modelValue="setPage(fieldObj.field.id, $event)"
                    class="mobile-pagination"
                  />
                </div>
              </div>
            </div>

            <!-- Campo SWITCH: gráfica de dona + KPIs + tabla/cards de registros -->
            <div v-else-if="fieldObj.field.type === 'switch'">
              <div class="mb-2 d-flex align-center justify-space-between">
                <div class="text-h6 font-weight-bold">Distribución de respuestas (Switch)</div>
              </div>

              <v-row class="mb-2 kpi-row" dense>
                <v-col cols="12" md="4">
                  <div class="d-flex flex-column">
                    <v-card class="kpi-card pa-3 mb-2">
                      <div class="text-caption text-medium-emphasis">Total de respuestas</div>
                      <div class="text-h6">{{ numberFmt(fieldObj.responses.length) }}</div>
                    </v-card>
                    <v-card class="kpi-card pa-3 mb-2">
                      <div class="text-caption text-medium-emphasis">Activados</div>
                      <div class="text-h6">
                        {{
                          fieldObj.responses.filter(
                            (r) =>
                              r.value === true ||
                              r.value === 1 ||
                              r.value === '1' ||
                              r.value === 'true' ||
                              r.value === 'on' ||
                              r.value === 'activo'
                          ).length
                        }}
                      </div>
                    </v-card>
                    <v-card class="kpi-card pa-3 mb-2">
                      <div class="text-caption text-medium-emphasis">Desactivados</div>
                      <div class="text-h6">
                        {{
                          fieldObj.responses.filter(
                            (r) =>
                              !(
                                r.value === true ||
                                r.value === 1 ||
                                r.value === '1' ||
                                r.value === 'true' ||
                                r.value === 'on' ||
                                r.value === 'activo'
                              )
                          ).length
                        }}
                      </div>
                    </v-card>
                  </div>
                </v-col>
                <v-col cols="12" md="8" class="d-flex align-center justify-center">
                  <div v-if="fieldObj.responses.length" style="width: 100%; max-width: 400px">
                    <component
                      :is="VueApexCharts"
                      type="donut"
                      height="320"
                      :key="`switch-donut-${fieldObj.field.id}-${fieldObj.responses.length}`"
                      :options="getSwitchDonutOptions(fieldObj.field.id)"
                      :series="getSwitchDonutSeries(fieldObj.field.id)"
                    />
                  </div>
                  <div v-else class="text-medium-emphasis py-4">No hay datos suficientes para mostrar el gráfico.</div>
                </v-col>
              </v-row>

              <!-- Searchbar y tabla/cards de registros debajo de la gráfica -->
              <div class="search-table-container mt-6">
                <v-text-field
                  v-model="fieldSearch[fieldObj.field.id]"
                  :placeholder="`Buscar folio, usuario o estado...`"
                  prepend-inner-icon="mdi-magnify"
                  clearable
                  class="custom-search"
                  density="compact"
                  variant="outlined"
                  color="primary"
                  hide-details
                  style="width: 100%; min-width: 0; padding-bottom: 12px"
                />

                <!-- Tabla en desktop -->
                <v-table density="compact" style="width: 100%" class="image-records-table d-none d-md-table">
                  <thead>
                    <tr>
                      <th>Folio</th>
                      <th>Usuario</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    <template
                      v-for="(resp, i) in getPaginatedResponses(
                        fieldObj.field.id,
                        fieldObj.responses.filter((r) => {
                          const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                          const estado =
                            r.value === true ||
                            r.value === 1 ||
                            r.value === '1' ||
                            r.value === 'true' ||
                            r.value === 'on' ||
                            r.value === 'activo'
                              ? 'Activado'
                              : 'Desactivado';
                          return (
                            !search ||
                            (r.folio && r.folio.toString().toLowerCase().includes(search)) ||
                            (r.user && r.user.toString().toLowerCase().includes(search)) ||
                            estado.toLowerCase().includes(search)
                          );
                        })
                      )"
                      :key="i"
                    >
                      <tr class="response-row record-row">
                        <td class="response-value-cell">
                          <span class="folio-link" style="color: #1976d2; text-decoration: underline; font-weight: 500">
                            {{ resp.folio || resp.id || '-' }}
                          </span>
                        </td>
                        <td class="response-value-cell">
                          <span class="font-weight-medium">{{ resp.user?.name || resp.user || '-' }}</span>
                        </td>
                        <td class="response-value-cell">
                          {{
                            resp.value === true ||
                            resp.value === 1 ||
                            resp.value === '1' ||
                            resp.value === 'true' ||
                            resp.value === 'on' ||
                            resp.value === 'activo'
                              ? 'Activado'
                              : 'Desactivado'
                          }}
                        </td>
                      </tr>
                    </template>
                    <tr
                      v-if="
                        fieldObj.responses.filter((r) => {
                          const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                          const estado =
                            r.value === true ||
                            r.value === 1 ||
                            r.value === '1' ||
                            r.value === 'true' ||
                            r.value === 'on' ||
                            r.value === 'activo'
                              ? 'Activado'
                              : 'Desactivado';
                          return (
                            !search ||
                            (r.folio && r.folio.toString().toLowerCase().includes(search)) ||
                            (r.user && r.user.toString().toLowerCase().includes(search)) ||
                            estado.toLowerCase().includes(search)
                          );
                        }).length === 0
                      "
                    >
                      <td colspan="3" class="text-medium-emphasis">No hay registros de switch.</td>
                    </tr>
                  </tbody>
                </v-table>

                <!-- Cards en móvil/tablet -->
                <div class="image-records-cards d-md-none">
                  <v-row>
                    <v-col
                      v-for="(resp, i) in getPaginatedResponses(
                        fieldObj.field.id,
                        fieldObj.responses.filter((r) => {
                          const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                          const estado =
                            r.value === true ||
                            r.value === 1 ||
                            r.value === '1' ||
                            r.value === 'true' ||
                            r.value === 'on' ||
                            r.value === 'activo'
                              ? 'Activado'
                              : 'Desactivado';
                          return (
                            !search ||
                            (r.folio && r.folio.toString().toLowerCase().includes(search)) ||
                            (r.user && r.user.toString().toLowerCase().includes(search)) ||
                            estado.toLowerCase().includes(search)
                          );
                        })
                      )"
                      :key="i"
                      cols="12"
                    >
                      <v-card class="mb-4 pa-3 elevation-1 rounded-lg response-card" style="cursor: default">
                        <div class="d-flex flex-column mb-1" style="gap: 8px">
                          <span
                            class="folio-link text-caption"
                            style="color: #1976d2; text-decoration: underline; font-weight: 500; min-width: 60px"
                          >
                            {{ resp.folio || resp.id || '-' }}
                          </span>
                          <span class="font-weight-medium" style="color: #333; font-size: 0.9rem">
                            {{ resp.user?.name || resp.user || '-' }}
                          </span>
                          <span style="font-size: 0.9rem; color: #1976d2">
                            <strong>Estado:</strong>
                            {{
                              resp.value === true ||
                              resp.value === 1 ||
                              resp.value === '1' ||
                              resp.value === 'true' ||
                              resp.value === 'on' ||
                              resp.value === 'activo'
                                ? 'Activado'
                                : 'Desactivado'
                            }}
                          </span>
                        </div>
                      </v-card>
                    </v-col>
                    <v-col
                      v-if="
                        fieldObj.responses.filter((r) => {
                          const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                          const estado =
                            r.value === true ||
                            r.value === 1 ||
                            r.value === '1' ||
                            r.value === 'true' ||
                            r.value === 'on' ||
                            r.value === 'activo'
                              ? 'Activado'
                              : 'Desactivado';
                          return (
                            !search ||
                            (r.folio && r.folio.toString().toLowerCase().includes(search)) ||
                            (r.user && r.user.toString().toLowerCase().includes(search)) ||
                            estado.toLowerCase().includes(search)
                          );
                        }).length === 0
                      "
                      cols="12"
                    >
                      <v-card class="response-card pa-3 text-medium-emphasis mb-4 rounded-lg elevation-1">
                        No hay registros de switch.
                      </v-card>
                    </v-col>
                  </v-row>
                </div>

                <div class="d-flex flex-column align-center mt-2">
                  <v-pagination
                    :model-value="pageByField[fieldObj.field.id]"
                    :length="
                      Math.max(
                        1,
                        Math.ceil(
                          fieldObj.responses.filter((r) => {
                            const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                            const estado =
                              r.value === true ||
                              r.value === 1 ||
                              r.value === '1' ||
                              r.value === 'true' ||
                              r.value === 'on' ||
                              r.value === 'activo'
                                ? 'Activado'
                                : 'Desactivado';
                            return (
                              !search ||
                              (r.folio && r.folio.toString().toLowerCase().includes(search)) ||
                              (r.user && r.user.toString().toLowerCase().includes(search)) ||
                              estado.toLowerCase().includes(search)
                            );
                          }).length / 10
                        )
                      )
                    "
                    :total-visible="1"
                    color="primary"
                    @update:modelValue="setPage(fieldObj.field.id, $event)"
                    class="mobile-pagination"
                  />
                </div>
              </div>
            </div>

            <!-- Campo URL: searchbar + tabla/cards con folio, usuario y URL como link -->
            <div v-else-if="fieldObj.field.type === 'url'">
              <div class="mb-2 d-flex align-center justify-space-between">
                <div class="text-h6 font-weight-bold">Registros de URLs</div>
              </div>
              <div class="search-table-container mt-6">
                <v-text-field
                  v-model="fieldSearch[fieldObj.field.id]"
                  :placeholder="`Buscar folio, usuario o URL...`"
                  prepend-inner-icon="mdi-magnify"
                  clearable
                  class="custom-search"
                  density="compact"
                  variant="outlined"
                  color="primary"
                  hide-details
                  style="width: 100%; min-width: 0; padding-bottom: 12px"
                />

                <!-- Tabla en desktop -->
                <v-table density="compact" style="width: 100%" class="image-records-table d-none d-md-table">
                  <thead>
                    <tr>
                      <th>Folio</th>
                      <th>Usuario</th>
                      <th>URL</th>
                    </tr>
                  </thead>
                  <tbody>
                    <template
                      v-for="(resp, i) in getPaginatedResponses(
                        fieldObj.field.id,
                        fieldObj.responses.filter((r) => {
                          const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                          return (
                            !search ||
                            (r.folio && r.folio.toString().toLowerCase().includes(search)) ||
                            (r.user && r.user.toString().toLowerCase().includes(search)) ||
                            (r.value && r.value.toString().toLowerCase().includes(search))
                          );
                        })
                      )"
                      :key="i"
                    >
                      <tr class="response-row record-row">
                        <td class="response-value-cell">
                          <span class="folio-link" style="color: #1976d2; text-decoration: underline; font-weight: 500">
                            {{ resp.folio || resp.id || '-' }}
                          </span>
                        </td>
                        <td class="response-value-cell">
                          <span class="font-weight-medium">{{ resp.user?.name || resp.user || '-' }}</span>
                        </td>
                        <td class="response-value-cell">
                          <a
                            v-if="resp.value"
                            :href="resp.value"
                            target="_blank"
                            rel="noopener noreferrer"
                            style="color: #1976d2; text-decoration: underline; word-break: break-all"
                          >
                            {{ resp.value }}
                          </a>
                          <span v-else>-</span>
                        </td>
                      </tr>
                    </template>
                    <tr
                      v-if="
                        fieldObj.responses.filter((r) => {
                          const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                          return (
                            !search ||
                            (r.folio && r.folio.toString().toLowerCase().includes(search)) ||
                            (r.user && r.user.toString().toLowerCase().includes(search)) ||
                            (r.value && r.value.toString().toLowerCase().includes(search))
                          );
                        }).length === 0
                      "
                    >
                      <td colspan="3" class="text-medium-emphasis">No hay URLs registradas.</td>
                    </tr>
                  </tbody>
                </v-table>

                <!-- Cards en móvil/tablet -->
                <div class="image-records-cards d-md-none">
                  <v-row>
                    <v-col
                      v-for="(resp, i) in getPaginatedResponses(
                        fieldObj.field.id,
                        fieldObj.responses.filter((r) => {
                          const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                          return (
                            !search ||
                            (r.folio && r.folio.toString().toLowerCase().includes(search)) ||
                            (r.user && r.user.toString().toLowerCase().includes(search)) ||
                            (r.value && r.value.toString().toLowerCase().includes(search))
                          );
                        })
                      )"
                      :key="i"
                      cols="12"
                    >
                      <v-card class="mb-4 pa-3 elevation-1 rounded-lg response-card" style="cursor: default">
                        <div class="d-flex flex-column mb-1" style="gap: 8px">
                          <span
                            class="folio-link text-caption"
                            style="color: #1976d2; text-decoration: underline; font-weight: 500; min-width: 60px"
                          >
                            {{ resp.folio || resp.id || '-' }}
                          </span>
                          <span class="font-weight-medium" style="color: #333; font-size: 0.9rem">
                            {{ resp.user?.name || resp.user || '-' }}
                          </span>
                          <span style="font-size: 0.9rem; color: #1976d2">
                            <strong>URL:</strong>
                            <a
                              v-if="resp.value"
                              :href="resp.value"
                              target="_blank"
                              rel="noopener noreferrer"
                              style="color: #1976d2; text-decoration: underline; word-break: break-all"
                            >
                              {{ resp.value }}
                            </a>
                            <span v-else>-</span>
                          </span>
                        </div>
                      </v-card>
                    </v-col>
                    <v-col
                      v-if="
                        fieldObj.responses.filter((r) => {
                          const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                          return (
                            !search ||
                            (r.folio && r.folio.toString().toLowerCase().includes(search)) ||
                            (r.user && r.user.toString().toLowerCase().includes(search)) ||
                            (r.value && r.value.toString().toLowerCase().includes(search))
                          );
                        }).length === 0
                      "
                      cols="12"
                    >
                      <v-card class="response-card pa-3 text-medium-emphasis mb-4 rounded-lg elevation-1">
                        No hay URLs registradas.
                      </v-card>
                    </v-col>
                  </v-row>
                </div>

                <div class="d-flex flex-column align-center mt-2">
                  <v-pagination
                    :model-value="pageByField[fieldObj.field.id]"
                    :length="
                      Math.max(
                        1,
                        Math.ceil(
                          fieldObj.responses.filter((r) => {
                            const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                            return (
                              !search ||
                              (r.folio && r.folio.toString().toLowerCase().includes(search)) ||
                              (r.user && r.user.toString().toLowerCase().includes(search)) ||
                              (r.value && r.value.toString().toLowerCase().includes(search))
                            );
                          }).length / 10
                        )
                      )
                    "
                    :total-visible="1"
                    color="primary"
                    @update:modelValue="setPage(fieldObj.field.id, $event)"
                    class="mobile-pagination"
                  />
                </div>
              </div>
            </div>

            <!-- Campo TELÉFONO: searchbar + tabla/cards con folio, usuario y teléfono (sin link) -->
            <div v-else-if="fieldObj.field.type === 'phone' || fieldObj.field.type === 'tel' || fieldObj.field.type === 'telefono'">
              <div class="mb-2 d-flex align-center justify-space-between">
                <div class="text-h6 font-weight-bold">Registros de teléfonos</div>
              </div>
              <div class="search-table-container mt-6">
                <v-text-field
                  v-model="fieldSearch[fieldObj.field.id]"
                  :placeholder="`Buscar folio, usuario o teléfono...`"
                  prepend-inner-icon="mdi-magnify"
                  clearable
                  class="custom-search"
                  density="compact"
                  variant="outlined"
                  color="primary"
                  hide-details
                  style="width: 100%; min-width: 0; padding-bottom: 12px"
                />

                <!-- Tabla en desktop -->
                <v-table density="compact" style="width: 100%" class="image-records-table d-none d-md-table">
                  <thead>
                    <tr>
                      <th>Folio</th>
                      <th>Usuario</th>
                      <th>Teléfono</th>
                    </tr>
                  </thead>
                  <tbody>
                    <template
                      v-for="(resp, i) in getPaginatedResponses(
                        fieldObj.field.id,
                        fieldObj.responses.filter((r) => {
                          const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                          return (
                            !search ||
                            (r.folio && r.folio.toString().toLowerCase().includes(search)) ||
                            (r.user && r.user.toString().toLowerCase().includes(search)) ||
                            (r.value && r.value.toString().toLowerCase().includes(search))
                          );
                        })
                      )"
                      :key="i"
                    >
                      <tr class="response-row record-row">
                        <td class="response-value-cell">
                          <span class="folio-link" style="color: #1976d2; text-decoration: underline; font-weight: 500">
                            {{ resp.folio || resp.id || '-' }}
                          </span>
                        </td>
                        <td class="response-value-cell">
                          <span class="font-weight-medium">{{ resp.user?.name || resp.user || '-' }}</span>
                        </td>
                        <td class="response-value-cell" style="font-weight: 500">
                          {{ resp.value || '-' }}
                        </td>
                      </tr>
                    </template>
                    <tr
                      v-if="
                        fieldObj.responses.filter((r) => {
                          const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                          return (
                            !search ||
                            (r.folio && r.folio.toString().toLowerCase().includes(search)) ||
                            (r.user && r.user.toString().toLowerCase().includes(search)) ||
                            (r.value && r.value.toString().toLowerCase().includes(search))
                          );
                        }).length === 0
                      "
                    >
                      <td colspan="3" class="text-medium-emphasis">No hay teléfonos registrados.</td>
                    </tr>
                  </tbody>
                </v-table>

                <!-- Cards en móvil/tablet -->
                <div class="image-records-cards d-md-none">
                  <v-row>
                    <v-col
                      v-for="(resp, i) in getPaginatedResponses(
                        fieldObj.field.id,
                        fieldObj.responses.filter((r) => {
                          const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                          return (
                            !search ||
                            (r.folio && r.folio.toString().toLowerCase().includes(search)) ||
                            (r.user && r.user.toString().toLowerCase().includes(search)) ||
                            (r.value && r.value.toString().toLowerCase().includes(search))
                          );
                        })
                      )"
                      :key="i"
                      cols="12"
                    >
                      <v-card class="mb-4 pa-3 elevation-1 rounded-lg response-card" style="cursor: default">
                        <div class="d-flex flex-column mb-1" style="gap: 8px">
                          <span
                            class="folio-link text-caption"
                            style="color: #1976d2; text-decoration: underline; font-weight: 500; min-width: 60px"
                          >
                            {{ resp.folio || resp.id || '-' }}
                          </span>
                          <span class="font-weight-medium" style="color: #333; font-size: 0.9rem">
                            {{ resp.user?.name || resp.user || '-' }}
                          </span>
                          <span style="font-size: 0.9rem; font-weight: 500">
                            <strong>Teléfono:</strong>
                            {{ resp.value || '-' }}
                          </span>
                        </div>
                      </v-card>
                    </v-col>
                    <v-col
                      v-if="
                        fieldObj.responses.filter((r) => {
                          const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                          return (
                            !search ||
                            (r.folio && r.folio.toString().toLowerCase().includes(search)) ||
                            (r.user && r.user.toString().toLowerCase().includes(search)) ||
                            (r.value && r.value.toString().toLowerCase().includes(search))
                          );
                        }).length === 0
                      "
                      cols="12"
                    >
                      <v-card class="response-card pa-3 text-medium-emphasis mb-4 rounded-lg elevation-1">
                        No hay teléfonos registrados.
                      </v-card>
                    </v-col>
                  </v-row>
                </div>

                <div class="d-flex flex-column align-center mt-2">
                  <v-pagination
                    :model-value="pageByField[fieldObj.field.id]"
                    :length="
                      Math.max(
                        1,
                        Math.ceil(
                          fieldObj.responses.filter((r) => {
                            const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                            return (
                              !search ||
                              (r.folio && r.folio.toString().toLowerCase().includes(search)) ||
                              (r.user && r.user.toString().toLowerCase().includes(search)) ||
                              (r.value && r.value.toString().toLowerCase().includes(search))
                            );
                          }).length / 10
                        )
                      )
                    "
                    :total-visible="1"
                    color="primary"
                    @update:modelValue="setPage(fieldObj.field.id, $event)"
                    class="mobile-pagination"
                  />
                </div>
              </div>
            </div>

            <!-- Campo GEOLOCALIZACIÓN -->
            <div v-else-if="fieldObj.field.type === 'geolocation' || fieldObj.field.type === 'geo' || fieldObj.field.type === 'location'">
              <div class="mb-2 d-flex align-center justify-space-between">
                <div class="text-h6 font-weight-bold">Registros de geolocalización</div>
              </div>

              <div class="search-table-container mt-6">
                <!-- Selector de capa -->
                <v-btn-toggle
                  v-model="geoLayerByField[fieldObj.field.id]"
                  mandatory
                  class="mb-4"
                  color="primary"
                  density="compact"
                  style="max-width: 320px"
                >
                  <v-btn value="points">Puntos</v-btn>
                  <v-btn value="heatmap">Heatmap</v-btn>
                </v-btn-toggle>

                <template v-if="getGeoPoints(fieldObj.field.id).length">
                  <GoogleMap
                    class="map-container"
                    :points="getGeoPoints(fieldObj.field.id)"
                    :center="getGeoCenter(fieldObj.field.id)"
                    :zoom="getGeoZoom(fieldObj.field.id)"
                    :fit-bounds="true"
                    :layer="geoLayerByField[fieldObj.field.id] || 'points'"
                    :key="`geo-${fieldObj.field.id}-${getGeoPoints(fieldObj.field.id).length}-${geoLayerByField[fieldObj.field.id]}`"
                  />
                </template>
                <template v-else>
                  <v-card class="pa-6 text-medium-emphasis" style="background: #f5f5f5; border-radius: 12px">
                    No hay ubicaciones válidas para mostrar.
                  </v-card>
                </template>

                <!-- Searchbar y tabla/cards de registros debajo del mapa -->
                <v-text-field
                  v-model="fieldSearch[fieldObj.field.id]"
                  :placeholder="`Buscar folio, usuario o dirección...`"
                  prepend-inner-icon="mdi-magnify"
                  clearable
                  class="custom-search mt-4"
                  density="compact"
                  variant="outlined"
                  color="primary"
                  hide-details
                  style="width: 100%; min-width: 0; padding-bottom: 12px"
                />

                <!-- Tabla en desktop -->
                <v-table density="compact" style="width: 100%" class="image-records-table d-none d-md-table">
                  <thead>
                    <tr>
                      <th>Folio</th>
                      <th>Usuario</th>
                      <th>Dirección</th>
                      <th>Coordenadas</th>
                      <!-- Nueva columna -->
                    </tr>
                  </thead>
                  <tbody>
                    <template
                      v-for="(resp, i) in getPaginatedResponses(
                        fieldObj.field.id,
                        fieldObj.responses.filter((r) => {
                          const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                          const folio = (r.folio || r.id || '').toString().toLowerCase();
                          const user = (r.user?.name || r.user || '').toString().toLowerCase();
                          const address = r.value?.address || r.value?.direccion || r.value?.formatted_address || '';
                          return (
                            !search ||
                            folio.includes(search) ||
                            user.includes(search) ||
                            (address && address.toString().toLowerCase().includes(search))
                          );
                        })
                      )"
                      :key="i"
                    >
                      <tr class="response-row record-row">
                        <td class="response-value-cell">
                          <span class="folio-link" style="color: #1976d2; text-decoration: underline; font-weight: 500">
                            {{ resp.folio || resp.id || '-' }}
                          </span>
                        </td>
                        <td class="response-value-cell">
                          <span class="font-weight-medium">{{ resp.user?.name || resp.user || '-' }}</span>
                        </td>
                        <td class="response-value-cell">
                          <a
                            v-if="getGeoAddress(resp.value) !== '-'"
                            :href="`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(getGeoAddress(resp.value))}`"
                            target="_blank"
                            rel="noopener noreferrer"
                            style="color: #1976d2; text-decoration: underline"
                          >
                            {{ getGeoAddress(resp.value) }}
                          </a>
                          <span v-else>{{ getGeoAddress(resp.value) }}</span>
                        </td>
                        <td class="response-value-cell">
                          {{ getGeoCoords(resp.value) }}
                        </td>
                      </tr>
                    </template>
                    <tr
                      v-if="
                        fieldObj.responses.filter((r) => {
                          const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                          const folio = (r.folio || r.id || '').toString().toLowerCase();
                          const user = (r.user?.name || r.user || '').toString().toLowerCase();
                          const address = r.value?.address || r.value?.direccion || r.value?.formatted_address || '';
                          return (
                            !search ||
                            folio.includes(search) ||
                            user.includes(search) ||
                            (address && address.toString().toLowerCase().includes(search))
                          );
                        }).length === 0
                      "
                    >
                      <td colspan="3" class="text-medium-emphasis">No hay registros de geolocalización.</td>
                    </tr>
                  </tbody>
                </v-table>

                <!-- Cards en móvil/tablet -->
                <div class="image-records-cards d-md-none">
                  <v-row>
                    <v-col
                      v-for="(resp, i) in getPaginatedResponses(
                        fieldObj.field.id,
                        fieldObj.responses.filter((r) => {
                          const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                          const folio = (r.folio || r.id || '').toString().toLowerCase();
                          const user = (r.user?.name || r.user || '').toString().toLowerCase();
                          const address = r.value?.address || r.value?.direccion || r.value?.formatted_address || '';
                          return (
                            !search ||
                            folio.includes(search) ||
                            user.includes(search) ||
                            (address && address.toString().toLowerCase().includes(search))
                          );
                        })
                      )"
                      :key="i"
                      cols="12"
                    >
                      <v-card class="mb-4 pa-3 elevation-1 rounded-lg response-card" style="cursor: default">
                        <div class="d-flex flex-column mb-1" style="gap: 8px">
                          <a
                            v-if="resp.folio || resp.id"
                            class="folio-link text-caption"
                            :href="`/folio/${resp.folio || resp.id}`"
                            target="_blank"
                            rel="noopener noreferrer"
                            style="color: #1976d2; text-decoration: underline; font-weight: 500; min-width: 60px; font-size: 13px"
                          >
                            {{ resp.folio || resp.id || '-' }}
                          </a>
                          <span v-else class="folio-link text-caption" style="font-size: 13px">
                            {{ resp.folio || resp.id || '-' }}
                          </span>
                          <span class="text-caption" style="font-size: 13px">
                            <strong>Dirección:</strong>
                            <a
                              v-if="getGeoAddress(resp.value) !== '-'"
                              :href="`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(getGeoAddress(resp.value))}`"
                              target="_blank"
                              rel="noopener noreferrer"
                              style="color: #1976d2; text-decoration: underline; font-size: 13px"
                            >
                              {{ getGeoAddress(resp.value) }}
                            </a>
                            <span v-else>{{ getGeoAddress(resp.value) }}</span>
                          </span>
                          <span class="text-caption" style="font-size: 13px">
                            <strong>Coordenadas:</strong>
                            {{ getGeoCoords(resp.value) }}
                          </span>
                        </div>
                      </v-card>
                    </v-col>
                    <v-col
                      v-if="
                        fieldObj.responses.filter((r) => {
                          const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                          const folio = (r.folio || r.id || '').toString().toLowerCase();
                          const user = (r.user?.name || r.user || '').toString().toLowerCase();
                          const address = r.value?.address || r.value?.direccion || r.value?.formatted_address || '';
                          return (
                            !search ||
                            folio.includes(search) ||
                            user.includes(search) ||
                            (address && address.toString().toLowerCase().includes(search))
                          );
                        }).length === 0
                      "
                      cols="12"
                    >
                      <v-card class="response-card pa-3 text-medium-emphasis mb-4 rounded-lg elevation-1">
                        No hay registros de geolocalización.
                      </v-card>
                    </v-col>
                  </v-row>
                </div>

                <div class="d-flex flex-column align-center mt-2">
                  <v-pagination
                    :model-value="pageByField[fieldObj.field.id]"
                    :length="
                      Math.max(
                        1,
                        Math.ceil(
                          fieldObj.responses.filter((r) => {
                            const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                            const folio = (r.folio || r.id || '').toString().toLowerCase();
                            const user = (r.user?.name || r.user || '').toString().toLowerCase();
                            const address = r.value?.address || r.value?.direccion || r.value?.formatted_address || '';
                            return (
                              !search ||
                              folio.includes(search) ||
                              user.includes(search) ||
                              (address && address.toString().toLowerCase().includes(search))
                            );
                          }).length / 10
                        )
                      )
                    "
                    :total-visible="1"
                    color="primary"
                    @update:modelValue="setPage(fieldObj.field.id, $event)"
                    class="mobile-pagination"
                  />
                </div>
              </div>
            </div>

            <!-- Campo semáforo como dropdown con colores personalizados -->
            <div v-if="fieldObj.field.type === 'semaforo'">
              <v-label class="mb-1">Selecciona semáforo</v-label>
              <v-select
                v-model="fieldSearch[fieldObj.field.id]"
                :items="[
                  { text: 'Alto', value: 'Alto', color: 'red' },
                  { text: 'Medio', value: 'Medio', color: 'yellow' },
                  { text: 'Bajo', value: 'Bajo', color: 'green' }
                ]"
                item-title="text"
                item-value="value"
                hide-details
                outlined
                density="compact"
                style="max-width: 260px"
              >
                <template #item="{ item, props }">
                  <v-list-item v-bind="props">
                    <v-icon :color="item.color" class="mr-2">mdi-circle</v-icon>
                    <span :style="{ color: item.color, fontWeight: 'bold' }">{{ item.text }}</span>
                  </v-list-item>
                </template>
                <template #selection="{ item }">
                  <v-icon :color="item.color" class="mr-2">mdi-circle</v-icon>
                  <span :style="{ color: item.color, fontWeight: 'bold' }">{{ item.text }}</span>
                </template>
              </v-select>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </template>
    </v-expansion-panels>
  </section>
</template>

<style scoped>
.map-container {
  height: 360px; /* asegúralo */
  width: 100%;
  border-radius: 8px;
  border: 1px solid #ccc;
  overflow: hidden;
}

.image-records-table tr.record-row {
  background: #f5f5f5;
}
.image-records-table tr.record-row > td.response-value-cell {
  border-radius: 0;
  /* Mantén el padding si lo deseas */
  padding: 6px 12px;
}
.image-records-table tbody tr.record-row:not(:last-child) {
  border-bottom: 12px solid #fff;
}
.record-row > td.response-value-cell {
  padding-bottom: 14px;
}
.image-records-cards .response-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0px 2px 8px 0px rgba(60, 60, 60, 0.08);
  border: 1px solid #eaeaea;
  margin-bottom: 16px;
  transition:
    box-shadow 0.2s,
    border-color 0.2s;
}
.image-records-cards .response-card.selected-row {
  border-color: #1976d2;
  box-shadow: 0px 4px 16px 0px rgba(25, 118, 210, 0.12);
}
@media (min-width: 768px) {
  .image-records-cards {
    display: none !important;
  }
}
@media (max-width: 767px) {
  .image-records-table {
    display: none !important;
  }
  .image-records-cards {
    display: block !important;
  }
}
.selected-row {
  background: #e3f2fd;
}
.kpi-card {
  border: 1px solid #eaeaea;
  border-radius: 12px;
}
.kpi-row > .v-col {
  padding-left: 4px !important;
  padding-right: 4px !important;
}
.custom-expansion-panels > .v-expansion-panel {
  margin-bottom: 18px;
}

/* Unifica el diseño del search field con el de los filtros */
.search-table-container {
  width: 100%;
  display: flex;
  flex-direction: column;
}
.custom-search {
  width: 100% !important;
  margin-left: 0 !important;
  margin-right: 0 !important;
  min-width: 0 !important;
}
.custom-search .v-field__outline {
  border-width: 0.5px !important;
  border-radius: 8px !important;
  border-color: #ccc !important;
}
.custom-search .v-field__input {
  font-size: 15px !important;
  padding: 8px 12px !important;
}
.custom-search .v-field__prepend-inner {
  color: #1677ff !important;
}
.custom-search .v-label {
  font-size: 14px !important;
  color: #555 !important;
}
.custom-search .v-field__clearable {
  color: #555 !important;
}
.response-value-cell {
  background: #f5f5f5;
  border-radius: 6px;
  padding: 6px 12px;
}

/* ---- CALENDARIO: contenedor y ajustes para dropdown sin scroll ---- */
.calendar-heatmap-center {
  width: 100%;
  display: flex;
  justify-content: center;
  padding-bottom: 8px;
  overflow: visible;
}

/* Calendario más grande */
.calendar-heatmap-lg :deep(.nav-select) {
  min-width: 320px !important;
  max-width: 100% !important;
  width: auto !important;
  white-space: nowrap !important;
  font-size: 16px !important;
  box-sizing: border-box !important;
}

.calendar-heatmap-lg :deep(.calendar-monthly) {
  width: max-content !important;
  max-width: 620px !important;
}

.calendar-heatmap-lg :deep(.calendar-monthly-outer) {
  transform-origin: top center !important;
  overflow: visible !important;
}

/* Responsivo */
@media (max-width: 960px) {
  .calendar-heatmap-lg :deep(.nav-select) {
    min-width: 220px !important;
    font-size: 15px !important;
  }
  .calendar-heatmap-lg :deep(.calendar-monthly) {
    max-width: 420px !important;
  }
}
@media (max-width: 600px) {
  .calendar-heatmap-lg :deep(.nav-select) {
    min-width: 180px !important;
    font-size: 14px !important;
  }
  .calendar-heatmap-lg :deep(.calendar-monthly) {
    max-width: 320px !important;
  }
}

/* Overlay tip (si lo usas en v-menu con content-class="calendar-menu") */
:global(.v-overlay__content.calendar-menu) {
  max-height: none !important;
  overflow: visible !important;
  padding: 8px !important;
}

.chart-fallback {
  width: 100%;
  overflow-x: auto;
  border: 1px dashed #e0e0e0;
  border-radius: 12px;
  padding: 8px;
}
.mobile-pagination {
  margin-top: 8px;
  margin-bottom: 8px;
  justify-content: center;
  display: flex;
}
</style>
