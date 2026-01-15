<script setup>
import { ref, computed, watch, onMounted, defineAsyncComponent } from "vue";
import axios from "@/utils/axios";

import FieldText from "../RFormFieldsCharts/FieldSimpleList.vue";
import FieldMultiple from "../RFormFieldsCharts/FieldMultiple.vue";
import FieldNumber from "../RFormFieldsCharts/FieldNumber.vue";
import FieldDate from "../RFormFieldsCharts/FieldDate.vue";
import FieldHour from "../RFormFieldsCharts/FieldHour.vue";
import FieldMultimedia from "../RFormFieldsCharts/FieldMultimedia.vue";
import FieldRange from "../RFormFieldsCharts/FieldRange.vue";
import FieldSwitch from "../RFormFieldsCharts/FieldSwitch.vue";
import FieldGeo from "../RFormFieldsCharts/FieldGeo.vue";

// ApexCharts
const VueApexCharts = defineAsyncComponent(() =>
  import("vue3-apexcharts")
    .then((m) => m.default || m)
    .catch(() => null)
);

const props = defineProps({
  formId: { type: [String, Number], required: true },
  filters: { type: Object, default: false },
  loading: { type: Boolean, default: false },
  showKpis: { type: Boolean, default: true },
  bins: { type: Number, default: 10 },
});

const localLoading = ref(false);
const form = ref(null);

// ================== KPIs / Scores ==================
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

const hasRating = ref(false);

// ================== Histograma de puntuaciones ==================
const apexReady = ref(true);
const chartSeries = ref([{ name: "Respuestas", data: [] }]);
const chartOptions = ref({
  chart: {
    type: "bar",
    height: 350,
    animations: { enabled: true },
    toolbar: { show: false },
  },
  plotOptions: { bar: { columnWidth: "70%", borderRadius: 6 } },
  dataLabels: { enabled: false },
  xaxis: {
    categories: [],
    title: { text: "Puntos (por rangos)" },
    labels: { rotateAlways: false },
  },
  yaxis: { title: { text: "Conteo de respuestas" }, min: 0, forceNiceScale: true },
  tooltip: { y: { formatter: (val) => `${val}` } },
});

// fallback SVG si falla Apex
const svgBars = ref([]);
const svgCategories = ref([]);

// ================== Helpers numéricos ==================
const normalizeNumber = (n) => {
  if (n === null || n === undefined) return null;
  const x = typeof n === "string" ? n.replace(",", ".") : n;
  const num = Number(x);
  return Number.isFinite(num) ? num : null;
};

const numberFmt = (n) =>
  new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 }).format(n ?? 0);

const pickWeightFromField = (field) => {
  const keys = [
    "weight",
    "ponderacion",
    "points",
    "max_points",
    "maxPoints",
    "score_weight",
  ];
  for (const k of keys) {
    const val = normalizeNumber(field?.[k]);
    if (val !== null) return val;
  }
  return 0;
};

const isRequiredField = (field) => {
  const keys = ["required", "is_required", "mandatory", "isRequired"];
  for (const k of keys) {
    const v = field?.[k];
    if (v === true || v === 1 || v === "1" || v === "true") return true;
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
    formObj?.form?.questions,
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

// ================== Evolución temporal de respuestas ==================
const allResponses = ref([]);
const timeSeries = ref([]);
const timeChartOptions = ref({
  chart: { type: "line", height: 350, toolbar: { show: false } },
  xaxis: { categories: [], title: { text: "Fecha" } },
  yaxis: { title: { text: "Respuestas" }, min: 0, offsetY: 20 },
  dataLabels: { enabled: false },
  stroke: { curve: "smooth" },
  tooltip: { y: { formatter: (val) => `${val}` } },
  grid: { padding: { right: 36, left: 10, top: 10, bottom: 8 } },
});
const timePeriod = ref("day");
const timeChartType = ref("line");

const pad2 = (n) => String(n).padStart(2, "0");

function toLocalDateKey(input) {
  if (!input) return null;
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}T/.test(input)) {
    const dIso = new Date(input);
    if (!Number.isNaN(dIso.getTime())) {
      return `${dIso.getFullYear()}-${pad2(dIso.getMonth() + 1)}-${pad2(dIso.getDate())}`;
    }
    return input.slice(0, 10);
  }
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function ymdLocal(input) {
  return toLocalDateKey(input);
}

function startOfWeekMondayLocal(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function weekNumberMondayLocal(date) {
  const monday = startOfWeekMondayLocal(date);
  const yearStart = new Date(monday.getFullYear(), 0, 1);
  const yearStartMonday = startOfWeekMondayLocal(yearStart);
  const days = Math.floor((monday - yearStartMonday) / 86400000);
  return Math.floor(days / 7) + 1;
}

function groupResponsesByPeriod(responses, period = "day") {
  const map = new Map();
  const meta = new Map();

  for (const r of responses) {
    const dt = r?.response?.submitted_at || r?.submitted_at;
    if (!dt) continue;

    const d = new Date(dt);
    if (isNaN(d)) continue;

    let key, ts;

    if (period === "week") {
      const y = d.getFullYear();
      const w = String(weekNumberMondayLocal(d)).padStart(2, "0");
      key = `${y}-S${w}`;
      ts = startOfWeekMondayLocal(d).getTime();
    } else if (period === "month") {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      key = `${y}-${m}`;
      const firstDay = new Date(y, d.getMonth(), 1);
      firstDay.setHours(0, 0, 0, 0);
      ts = firstDay.getTime();
    } else {
      const ymd = ymdLocal(dt);
      if (!ymd) continue;
      key = ymd;
      const t0 = new Date(ymd + "T00:00:00");
      ts = t0.getTime();
    }

    map.set(key, (map.get(key) || 0) + 1);
    if (!meta.has(key)) meta.set(key, ts);
  }

  const rows = Array.from(map.keys()).map((k) => ({
    label: k,
    ts: meta.get(k),
    val: map.get(k),
  }));
  rows.sort((a, b) => a.ts - b.ts);

  const categories = rows.map((r) => r.label);
  const counts = rows.map((r) => r.val);
  return { categories, counts };
}

const buildTimeChart = () => {
  const { categories, counts } = groupResponsesByPeriod(
    allResponses.value,
    timePeriod.value
  );

  const isMonth = timePeriod.value === "month";
  timeChartType.value = isMonth ? "bar" : "line";

  const maxY = Math.max(0, ...counts);
  const yMaxPadded = maxY > 0 ? Math.ceil(maxY * 1.2) : undefined;

  timeSeries.value = [{ name: "Respuestas", data: counts }];

  timeChartOptions.value = {
    chart: { type: timeChartType.value, height: 350, toolbar: { show: false } },
    xaxis: {
      categories,
      type: "category",
      title: { text: "Fecha" },
      labels: { trim: true, rotate: 0, offsetX: 0, hideOverlappingLabels: true },
      tickPlacement: "between",
    },
    yaxis: {
      title: { text: "Respuestas" },
      min: 0,
      max: yMaxPadded,
      offsetY: 20,
    },
    dataLabels: {
      enabled: isMonth,
      formatter: (val) => `${val}`,
    },
    stroke: {
      curve: "smooth",
      width: isMonth ? 0 : 3,
    },
    markers: {
      size: isMonth ? 0 : 8,
      strokeWidth: isMonth ? 0 : 2,
      hover: { sizeOffset: 3 },
    },
    plotOptions: {
      bar: {
        columnWidth: "45%",
        borderRadius: 6,
        dataLabels: { position: "top" },
      },
    },
    grid: { padding: { top: 10, right: 40, bottom: 10, left: 12 } },
    tooltip: { y: { formatter: (val) => `${val}` } },
    noData: { text: "Sin datos en este periodo" },
  };
};

// ================== Porcentaje contestadas vs no contestadas ==================
const percentChartSeries = ref([]);
const percentChartOptions = ref({
  chart: { type: "donut", height: 320, toolbar: { show: false } },
  labels: ["Contestadas", "No contestadas"],
  legend: { position: "bottom" },
  dataLabels: {
    enabled: true,
    formatter: (val) => `${Number(val).toFixed(2)}%`,
  },
  tooltip: {
    y: {
      formatter: (val) => `${Number(val).toFixed(2)}%`,
    },
  },
  colors: ["#81C784", "#4FC3F7"],
  plotOptions: {
    pie: {
      donut: {
        labels: {
          show: true,
          name: { show: true, formatter: (val) => val },
          value: { show: true, formatter: (val) => `${Number(val).toFixed(2)}%` },
          total: {
            show: true,
            label: "Total",
            formatter: (w) => {
              const total = w.globals.seriesTotals.reduce((a, b) => a + b, 0);
              const pct = total ? (w.globals.series[0] / total) * 100 : 0;
              return Number(pct).toFixed(2) + "%";
            },
          },
        },
      },
    },
  },
});

const percentTotalQuestions = ref(0);
const percentTotalResponses = ref(0);
const percentAnsweredCount = ref(0);
const percentOmittedCount = ref(0);

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
    return;
  }

  let totalQuestions = fields.length;
  let totalResponses = allResponses.value.length;
  let totalPossibleAnswers = totalQuestions * totalResponses;
  let answeredCount = 0;

  for (const field of fields) {
    const fieldId = field.id;
    for (const resp of allResponses.value) {
      const fieldResponses =
        resp?.response?.field_responses ||
        resp?.response?.fieldResponses ||
        resp?.field_responses ||
        [];
      const fr = fieldResponses.find(
        (f) =>
          f?.form_field_id === fieldId ||
          f?.formFieldId === fieldId ||
          f?.form_field?.id === fieldId ||
          f?.formField?.id === fieldId
      );
      if (fr && fr.value !== null && fr.value !== undefined && fr.value !== "") {
        answeredCount += 1;
      }
    }
  }

  const omittedCount = totalPossibleAnswers - answeredCount;
  percentChartSeries.value =
    totalPossibleAnswers > 0
      ? [
          (answeredCount / totalPossibleAnswers) * 100,
          (omittedCount / totalPossibleAnswers) * 100,
        ]
      : [];

  percentTotalQuestions.value = totalQuestions;
  percentTotalResponses.value = totalResponses;
  percentAnsweredCount.value = answeredCount;
  percentOmittedCount.value = omittedCount;
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
    if (baseParams[k] === null || baseParams[k] === "" || baseParams[k] === undefined)
      delete baseParams[k];
  });

  do {
    const { data } = await axios.get(`/forms/${props.formId}/responses/reports`, {
      params: { ...baseParams, page, per_page: 100 },
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
      params: { ...baseParams, page: 1, per_page: 1 },
    });
    const firstResp = Array.isArray(data?.responses) && data.responses[0];
    const frs =
      firstResp?.response?.field_responses ||
      firstResp?.response?.fieldResponses ||
      firstResp?.field_responses;

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
      const sum = [...weightsByField.values()].reduce(
        (acc, n) => acc + (Number.isFinite(n) ? n : 0),
        0
      );
      totalMaxPoints.value = sum > 0 ? sum : null;
      if (!minRequiredPoints.value) minRequiredPoints.value = minReqAcc;
    }
  }

  if (totalMaxPoints.value === null) totalMaxPoints.value = Math.max(0, ...scores);
};

const buildChart = () => {
  const { categories, counts } = buildBins(
    allScores.value,
    totalMaxPoints.value,
    props.bins
  );

  // Si ApexCharts falla, pinta fallback SVG
  if (!VueApexCharts.__asyncResolved && !apexReady.value) {
    const maxCount = Math.max(0, ...counts);
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
        label: categories[i],
      };
    });

    svgCategories.value = categories;
  }

  chartSeries.value = [{ name: "Respuestas", data: counts }];
  chartOptions.value = {
    ...chartOptions.value,
    xaxis: { ...chartOptions.value.xaxis, categories },
  };
};

const reloadAll = async () => {
  localLoading.value = true;
  try {
    await fetchForm();
    await fetchAllScores();
    buildChart();
    buildTimeChart();
    buildPercentChart();
    const sample =
      allResponses.value?.[0]?.response?.submitted_at ||
      allResponses.value?.[0]?.submitted_at;
  } catch (e) {
    apexReady.value = false;
    try {
      buildChart();
    } catch (_) {}
    console.error("Error cargando gráficas de respuestas:", e);
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
const fieldResponses = ref([]);

// Utilidad para ordenar por la columna "order"
function sortByOrder(arr) {
  return [...arr].sort((a, b) => {
    const aOrder = a?.order ?? 0;
    const bOrder = b?.order ?? 0;
    return aOrder - bOrder;
  });
}

// Computed para obtener la lista de campos y grupos en orden (mezclando campos sueltos y grupos según order)
const fieldsList = computed(() => {
  const formObj = form.value;
  if (!formObj) return [];

  // Grupos (con order)
  const groups = Array.isArray(formObj.field_groups)
    ? sortByOrder(formObj.field_groups)
    : [];

  // Todas las preguntas/campos
  const allFields =
    formObj.form_fields ||
    formObj.fields ||
    formObj.questions ||
    formObj.form?.form_fields ||
    formObj.form?.fields ||
    formObj.form?.questions ||
    [];

  // Campos con grupo
  const fieldsWithGroup = allFields.filter((f) => f.form_field_group_id);
  // Campos sin grupo
  const fieldsWithoutGroup = allFields.filter((f) => !f.form_field_group_id);

  // Construye una lista combinada de elementos (campos sueltos y grupos)
  const combined = [
    ...fieldsWithoutGroup.map((f) => ({
      type: "field",
      order: f.order ?? 0,
      field: f,
    })),
    ...groups.map((g) => ({
      type: "group",
      order: g.order ?? 0,
      group: g,
      fields: fieldsWithGroup
        .filter((f) => f.form_field_group_id === g.id)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    })),
  ];

  // Ordena por order
  combined.sort((a, b) => a.order - b.order);

  // Expande los grupos en la lista final
  const finalList = [];
  for (const item of combined) {
    if (item.type === "field") {
      finalList.push(item.field);
    } else if (item.type === "group") {
      for (const f of item.fields) {
        finalList.push({ ...f, _group: item.group });
      }
    }
  }

  return finalList;
});

function getResponsesByField(fieldId) {
  const responses = [];
  for (const resp of allResponses.value) {
    const fieldResponsesArr =
      resp?.response?.field_responses ||
      resp?.response?.fieldResponses ||
      resp?.field_responses ||
      [];
    const fr = fieldResponsesArr.find(
      (f) =>
        f?.form_field_id === fieldId ||
        f?.formFieldId === fieldId ||
        f?.form_field?.id === fieldId ||
        f?.formField?.id === fieldId
    );
    if (fr && fr.value !== null && fr.value !== undefined && fr.value !== "") {
      const firstReport =
        Array.isArray(resp.reports) && resp.reports.length > 0 ? resp.reports[0] : null;
      responses.push({
        value: fr.value,
        user: resp?.response?.user || resp?.user || {},
        date: resp?.response?.submitted_at || resp?.submitted_at,
        folio: resp?.folio || resp?.response?.folio || resp?.id || "",
        nombre: resp?.nombre || resp?.response?.nombre || resp?.name || "",
        form_id: firstReport?.form_id || "",
        report_id: firstReport?.id || "",
        field_response_id: fr.id,
      });
    }
  }
  return responses;
}

function updateFieldResponses() {
  fieldResponses.value = fieldsList.value.map((field) => ({
    field,
    responses: getResponsesByField(field.id),
  }));
}

watch([fieldsList, allResponses], updateFieldResponses, { immediate: true });

const pageByField = ref({});

function setPage(fieldId, page) {
  pageByField.value[fieldId] = page;
}

// ================== IMAGES: Dropdown y Heatmap por fecha ==================
const selectedImageCalendarDay = ref({});

function onImageCalendarDayClick(fieldId, dayObj) {
  selectedImageCalendarDay.value[fieldId] =
    typeof dayObj === "object" && dayObj.date ? dayObj.date : dayObj;
}

function getImageHeatmapData(fieldId) {
  const fieldObj = fieldResponses.value.find((f) => f.field.id === fieldId);
  if (!fieldObj || !fieldObj.responses.length) return [];

  const counts = new Map();

  for (const r of fieldObj.responses) {
    let images = r.value;
    if (typeof images === "string" && images.startsWith("[")) {
      try {
        images = JSON.parse(images);
      } catch {
        images = [images];
      }
    }
    if (!Array.isArray(images)) images = [images];

    for (const img of images) {
      const raw = (typeof img === "object" && img?.date) || r.date || null;
      const dKey = toLocalDateKey(raw);
      if (!dKey || !/^\d{4}-\d{2}-\d{2}$/.test(dKey)) continue;
      counts.set(dKey, (counts.get(dKey) || 0) + 1);
    }
  }

  const rows = [...counts.entries()].map(([date, value]) => ({ date, value }));
  rows.sort((a, b) => (a.date < b.date ? -1 : 1));
  return rows;
}

function getImageRecordsForDay(fieldId, date) {
  const fieldObj = fieldResponses.value.find((f) => f.field.id === fieldId);
  if (!fieldObj || !fieldObj.responses.length || !date) return [];

  const selectedKey = toLocalDateKey(
    typeof date === "object" && date?.date ? date.date : date
  );
  if (!selectedKey) return [];

  return fieldObj.responses.filter((r) => {
    let images = r.value;
    if (typeof images === "string" && images.startsWith("[")) {
      try {
        images = JSON.parse(images);
      } catch {
        images = [images];
      }
    }
    if (!Array.isArray(images)) images = [images];

    return images.some((img) => {
      const raw = img && typeof img === "object" && img.date ? img.date : r.date;
      const imgKey = toLocalDateKey(raw);
      return imgKey === selectedKey;
    });
  });
}

// ================== DATES: Dropdown y Heatmap por fecha ==================
const selectedDateCalendarDay = ref({});

function onDateCalendarDayClick(fieldId, dayObj) {
  selectedDateCalendarDay.value[fieldId] =
    typeof dayObj === "object" && dayObj.date ? dayObj.date : dayObj;
}

function getDateRecordsForDay(fieldId, date) {
  const fieldObj = fieldResponses.value.find((f) => f.field.id === fieldId);
  if (!fieldObj || !fieldObj.responses.length || !date) return [];

  const selectedKey = toLocalDateKey(
    typeof date === "object" && date?.date ? date.date : date
  );
  if (!selectedKey) return [];

  return fieldObj.responses.filter((r) => {
    const key = toLocalDateKey(r.value) || toLocalDateKey(r.date);
    return key === selectedKey;
  });
}

// ================== CALENDAR MONTH STATE POR CAMPO ==================
const calendarMonthStartByField = ref({});

function getCalendarMonthStart(fieldId) {
  if (calendarMonthStartByField.value[fieldId] instanceof Date) {
    return calendarMonthStartByField.value[fieldId];
  }

  const dataDates = getDateHeatmapData(fieldId);
  if (dataDates.length && dataDates[0].date) {
    const firstDate = new Date(dataDates[0].date + "T00:00:00");
    const monthStart = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);
    calendarMonthStartByField.value[fieldId] = monthStart;
    return monthStart;
  }

  const dataMedia = getImageHeatmapData(fieldId);
  if (dataMedia.length && dataMedia[0].date) {
    const firstDate = new Date(dataMedia[0].date + "T00:00:00");
    const monthStart = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);
    calendarMonthStartByField.value[fieldId] = monthStart;
    return monthStart;
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  monthStart.setHours(0, 0, 0, 0);
  calendarMonthStartByField.value[fieldId] = monthStart;
  return monthStart;
}

function setCalendarMonthStart(fieldId, date) {
  if (!(date instanceof Date)) date = new Date(date);
  calendarMonthStartByField.value[fieldId] = date;
}

// ================== CALENDAR MIN/MAX DATES POR CAMPO (para fechas) ==================
function getDateHeatmapData(fieldId) {
  const fieldObj = fieldResponses.value.find((f) => f.field.id === fieldId);
  if (!fieldObj || !fieldObj.responses.length) return [];

  const counts = new Map();

  for (const r of fieldObj.responses) {
    const key = toLocalDateKey(r.value) || toLocalDateKey(r.date);
    if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const rows = [...counts.entries()].map(([date, value]) => ({ date, value }));
  rows.sort((a, b) => (a.date < b.date ? -1 : 1));
  return rows;
}

function getMinDateForField(fieldId) {
  const dataDates = getDateHeatmapData(fieldId);
  if (dataDates.length) return dataDates[0].date;
  const dataMedia = getImageHeatmapData(fieldId);
  if (dataMedia.length) return dataMedia[0].date;
  return "2024-01-01";
}

function getMaxDateForField(fieldId) {
  const dataDates = getDateHeatmapData(fieldId);
  if (dataDates.length) return dataDates[dataDates.length - 1].date;
  const dataMedia = getImageHeatmapData(fieldId);
  if (dataMedia.length) return dataMedia[dataMedia.length - 1].date;
  return "2026-12-31";
}

// ================== GEO HELPERS (para FieldGeo) ==================
const geoLayerByField = ref({});

function toNum(v) {
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function normalizeGeoEntry(raw, label = "-") {
  if (!raw) return null;

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
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
    if (trimmed.includes("=")) {
      const map = Object.fromEntries(
        trimmed.split("&").map((p) => p.split("=").map((s) => decodeURIComponent(s)))
      );
      const lat = toNum(map.lat ?? map.latitude);
      const lng = toNum(map.lng ?? map.lon ?? map.longitude);
      if (lat !== null && lng !== null) return { lat, lng, label };
    }
    return null;
  }

  if (typeof raw === "object") {
    let lat = toNum(raw.lat ?? raw.latitude);
    let lng = toNum(raw.lng ?? raw.lon ?? raw.longitude);
    if (lat !== null && lng !== null) return { lat, lng, label };

    const coords = raw.coordinates || raw.coords;
    if (raw.type === "Point" && Array.isArray(coords) && coords.length >= 2) {
      const _lng = toNum(coords[0]);
      const _lat = toNum(coords[1]);
      if (_lat !== null && _lng !== null) return { lat: _lat, lng: _lng, label };
    }

    const nested =
      raw.position ||
      raw.geo ||
      raw.location ||
      raw.address ||
      raw.coords ||
      raw.coordinates ||
      raw.point;
    if (nested) return normalizeGeoEntry(nested, label);
  }

  return null;
}

function getGeoPoints(fieldId) {
  const fieldObj = fieldResponses.value.find((f) => f.field.id === fieldId);
  if (!fieldObj) return [];

  const search = (fieldSearch.value?.[fieldId] || "").toString().toLowerCase();

  const filtered = fieldObj.responses.filter((r) => {
    if (!search) return true;
    const folio = (r.folio || r.id || "").toString().toLowerCase();
    const user = (r.user && (r.user.name || r.user).toString().toLowerCase()) || "";
    return folio.includes(search) || user.includes(search);
  });

  const points = [];
  for (const r of filtered) {
    const label = r.folio || r.id || "-";
    const p = normalizeGeoEntry(r.value, label);
    if (p && Number.isFinite(p.lat) && Number.isFinite(p.lng)) points.push(p);
  }
  return points;
}

function getGeoCenter(fieldId) {
  const pts = getGeoPoints(fieldId);
  if (!pts.length) return { lat: 19.432608, lng: -99.133209 };
  const acc = pts.reduce((a, p) => ({ lat: a.lat + p.lat, lng: a.lng + p.lng }), {
    lat: 0,
    lng: 0,
  });
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
  if (typeof val === "string") {
    try {
      obj = JSON.parse(val);
    } catch {
      obj = {};
    }
  }
  return (
    [
      obj?.street,
      obj?.outdoor_number,
      obj?.indoor_number,
      obj?.neighborhood,
      obj?.postal_code,
      obj?.city,
      obj?.state,
      obj?.country,
    ]
      .filter((v) => v && v !== "")
      .join(", ") || "-"
  );
}

function getGeoCoords(val) {
  let obj = val;
  if (typeof val === "string") {
    try {
      obj = JSON.parse(val);
    } catch {
      obj = {};
    }
  }
  const lat = obj?.lat ?? obj?.latitude ?? obj?.coordinates?.[1] ?? obj?.coords?.[1];
  const lng =
    obj?.lng ?? obj?.lon ?? obj?.longitude ?? obj?.coordinates?.[0] ?? obj?.coords?.[0];
  if (lat && lng) return `${lat}, ${lng}`;
  return "-";
}
</script>

<template>
  <section>
    <h4 class="font-weight-bold mb-3">Información General</h4>
    <v-divider class="mb-6" />

    <v-expansion-panels multiple class="custom-expansion-panels">
      <!-- 1. Evolución temporal de respuestas -->
      <v-expansion-panel>
        <v-expansion-panel-title>
          Evolución temporal de respuestas
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <v-card class="elevation-1 rounded-lg pa-4">
            <div class="d-flex flex-wrap align-center justify-space-between mb-2">
              <v-btn-toggle v-model="timePeriod" mandatory>
                <v-btn value="day" size="small">Día</v-btn>
                <v-btn value="week" size="small">Semana</v-btn>
                <v-btn value="month" size="small">Mes</v-btn>
              </v-btn-toggle>
            </div>
            <div v-if="sampleSize && apexReady">
              <component
                :is="VueApexCharts"
                :type="timeChartType"
                height="350"
                :options="timeChartOptions"
                :series="timeSeries"
              />
            </div>
            <div
              v-if="localLoading || loading"
              class="d-flex align-center justify-center py-6"
            >
              <v-progress-circular indeterminate size="28" />
              <span class="ml-3 text-medium-emphasis">Cargando gráficas…</span>
            </div>
          </v-card>
        </v-expansion-panel-text>
      </v-expansion-panel>

      <!-- 2. Porcentaje de preguntas contestadas vs no contestadas -->
      <v-expansion-panel>
        <v-expansion-panel-title>
          Porcentaje de preguntas contestadas vs. no contestadas
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <v-card class="elevation-1 rounded-lg pa-4">
            <v-row class="mb-2 kpi-row" dense>
              <v-col cols="12" md="4">
                <div class="d-flex flex-column">
                  <v-card class="kpi-card pa-3 mb-2">
                    <div class="text-caption text-medium-emphasis">
                      Total de preguntas
                    </div>
                    <div class="text-h6">{{ numberFmt(percentTotalQuestions) }}</div>
                  </v-card>
                  <v-card class="kpi-card pa-3 mb-2">
                    <div class="text-caption text-medium-emphasis">
                      Total de respuestas
                    </div>
                    <div class="text-h6">{{ numberFmt(percentTotalResponses) }}</div>
                  </v-card>
                  <v-card class="kpi-card pa-3 mb-2">
                    <div class="text-caption text-medium-emphasis">
                      Total posibles respuestas
                    </div>
                    <div class="text-h6">
                      {{ numberFmt(percentTotalQuestions * percentTotalResponses) }}
                    </div>
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
                <div
                  v-if="percentChartSeries.length"
                  style="width: 100%; max-width: 400px"
                >
                  <component
                    :is="VueApexCharts"
                    type="donut"
                    height="320"
                    :options="percentChartOptions"
                    :series="percentChartSeries"
                  />
                </div>
                <div v-else class="text-medium-emphasis py-4">
                  No hay datos suficientes para mostrar el gráfico.
                </div>
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
              <div class="text-body-2 text-medium-emphasis">
                Eje X (tope):
                <strong>{{ numberFmt(totalMaxPoints ?? 0) }}</strong> puntos totales del
                formulario
              </div>
            </div>
            <div class="mt-2">
              <v-alert v-if="!sampleSize" type="info" variant="tonal" class="mb-4">
                No hay respuestas que cumplan los filtros seleccionados.
              </v-alert>
              <v-row v-if="showKpis" class="mb-2 kpi-row" dense>
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
                <component
                  :is="VueApexCharts"
                  type="bar"
                  height="350"
                  :options="chartOptions"
                  :series="chartSeries"
                />
              </div>

              <div v-else-if="sampleSize && !apexReady" class="chart-fallback">
                <svg
                  :width="820"
                  :height="360"
                  role="img"
                  aria-label="Histograma de puntuaciones"
                >
                  <line x1="40" y1="20" x2="40" y2="310" stroke="#ccc" />
                  <line x1="40" y1="310" x2="800" y2="310" stroke="#ccc" />
                  <template v-for="(b, i) in svgBars" :key="i">
                    <rect
                      :x="b.x"
                      :y="b.y"
                      :width="b.width"
                      :height="b.height"
                      fill="#3f51b5"
                      opacity="0.85"
                    />
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

              <div
                v-if="localLoading || loading"
                class="d-flex align-center justify-center py-6"
              >
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
            <div
              style="
                display: flex;
                align-items: center;
                justify-content: space-between;
                width: 100%;
              "
            >
              <div>
                <template v-if="fieldObj.field.form_field_group_id">
                  Grupo:
                  {{
                    form?.field_groups?.find(
                      (g) => g.id === fieldObj.field.form_field_group_id
                    )?.name || "Sin nombre"
                  }}
                  &rarr;
                  {{
                    fieldObj.field.label ||
                    fieldObj.field.title ||
                    fieldObj.field.name ||
                    `Campo ${idx + 1}`
                  }}
                </template>
                <template v-else>
                  {{
                    fieldObj.field.label ||
                    fieldObj.field.title ||
                    fieldObj.field.name ||
                    `Campo ${idx + 1}`
                  }}
                </template>
                <span
                  v-if="isRequiredField(fieldObj.field)"
                  style="color: #e53935; font-weight: bold; margin-left: 4px"
                  aria-label="Requerido"
                  title="Requerido"
                  >*</span
                >
                <span class="ml-2 text-caption text-medium-emphasis">
                  (
                  <template v-if="fieldObj.field.type === 'text'">Texto</template>
                  <template v-else-if="fieldObj.field.type === 'textarea'"
                    >Área de texto</template
                  >
                  <template v-else-if="fieldObj.field.type === 'email'">Email</template>
                  <template v-else-if="fieldObj.field.type === 'time'">Hora</template>
                  <template
                    v-else-if="
                      fieldObj.field.type === 'number' ||
                      fieldObj.field.type === 'integer' ||
                      fieldObj.field.type === 'float'
                    "
                  >
                    Numérico
                  </template>
                  <template v-else-if="fieldObj.field.type === 'date'">Fecha</template>
                  <template
                    v-else-if="
                      fieldObj.field.type === 'selector' ||
                      fieldObj.field.type === 'select' ||
                      fieldObj.field.type === 'dropdown'
                    "
                  >
                    Selector
                  </template>
                  <template v-else-if="fieldObj.field.type === 'radio'">Radio</template>
                  <template v-else-if="fieldObj.field.type === 'checkbox'"
                    >Checkbox</template
                  >
                  <template
                    v-else-if="
                      fieldObj.field.type === 'image' ||
                      fieldObj.field.type === 'imagenes'
                    "
                  >
                    Imágenes
                  </template>
                  <template
                    v-else-if="
                      fieldObj.field.type === 'document' ||
                      fieldObj.field.type === 'documento'
                    "
                  >
                    Documentos
                  </template>
                  <template
                    v-else-if="
                      fieldObj.field.type === 'firma' ||
                      fieldObj.field.type === 'signature'
                    "
                  >
                    Firma
                  </template>
                  <template v-else-if="fieldObj.field.type === 'range'">Rango</template>
                  <template v-else-if="fieldObj.field.type === 'switch'">Switch</template>
                  <template v-else-if="fieldObj.field.type === 'url'">URL</template>
                  <template
                    v-else-if="
                      fieldObj.field.type === 'phone' ||
                      fieldObj.field.type === 'tel' ||
                      fieldObj.field.type === 'telefono'
                    "
                  >
                    Teléfono
                  </template>
                  <template
                    v-else-if="
                      fieldObj.field.type === 'geolocation' ||
                      fieldObj.field.type === 'geo' ||
                      fieldObj.field.type === 'location'
                    "
                  >
                    Geolocalización
                  </template>
                  <template v-else>{{ fieldObj.field.type }}</template>
                  )
                </span>
              </div>
              <span v-if="hasRating" style="min-width: 48px; text-align: right">
                {{ fieldObj.field.weight ?? 0 }} pts
              </span>
            </div>
          </v-expansion-panel-title>

          <v-expansion-panel-text>
            <!-- CAMPOS SIMPLE LIST-->
            <div
              v-if="
                ['text', 'textarea', 'email', 'url', 'tel'].includes(fieldObj.field.type)
              "
            >
              <FieldText
                :fieldObj="fieldObj"
                :fieldSearch="fieldSearch"
                :pageByField="pageByField"
                :setPage="setPage"
              />
            </div>

            <!-- CAMPO NUMÉRICO -->
            <div v-else-if="['number', 'integer', 'float'].includes(fieldObj.field.type)">
              <FieldNumber
                :fieldObj="fieldObj"
                :fieldSearch="fieldSearch"
                :pageByField="pageByField"
                :setPage="setPage"
              />
            </div>

            <!-- CAMPO FECHA-->
            <div v-else-if="fieldObj.field.type === 'date'">
              <FieldDate
                :fieldObj="fieldObj"
                :fieldSearch="fieldSearch"
                :pageByField="pageByField"
                :setPage="setPage"
                :getDateHeatmapData="getDateHeatmapData"
                :getCalendarMonthStart="getCalendarMonthStart"
                :setCalendarMonthStart="setCalendarMonthStart"
                :getMinDateForField="getMinDateForField"
                :getMaxDateForField="getMaxDateForField"
                :selectedDateCalendarDay="selectedDateCalendarDay"
                :onDateCalendarDayClick="onDateCalendarDayClick"
                :getDateRecordsForDay="getDateRecordsForDay"
              />
            </div>

            <!-- CAMPOS MULTIPLES -->
            <div
              v-else-if="
                fieldObj.field.type === 'select' ||
                fieldObj.field.type === 'dropdown' ||
                fieldObj.field.type === 'radio' ||
                fieldObj.field.type === 'checkbox' ||
                fieldObj.field.type === 'semaforo'
              "
            >
              <FieldMultiple
                :fieldObj="fieldObj"
                :fieldSearch="fieldSearch"
                :pageByField="pageByField"
                :setPage="setPage"
              />
            </div>

            <!-- CAMPO HORA -->
            <div v-else-if="fieldObj.field.type === 'time'">
              <FieldHour
                :fieldObj="fieldObj"
                :fieldSearch="fieldSearch"
                :pageByField="pageByField"
                :setPage="setPage"
              />
            </div>

            <!-- Campo MULTIMEDIA -->
            <FieldMultimedia
              v-else-if="
                [
                  'image',
                  'imagenes',
                  'document',
                  'documento',
                  'firma',
                  'signature',
                ].includes(fieldObj.field.type)
              "
              :fieldObj="fieldObj"
              :fieldSearch="fieldSearch"
              :pageByField="pageByField"
              :setPage="setPage"
              :selectedImageCalendarDay="selectedImageCalendarDay"
              :onImageCalendarDayClick="onImageCalendarDayClick"
              :getImageRecordsForDay="getImageRecordsForDay"
              :getImageHeatmapData="getImageHeatmapData"
              :getCalendarMonthStart="getCalendarMonthStart"
              :setCalendarMonthStart="setCalendarMonthStart"
              :getMinDateForField="getMinDateForField"
              :getMaxDateForField="getMaxDateForField"
            />

            <!-- Campo RANGO -->
            <FieldRange
              v-else-if="fieldObj.field.type === 'range'"
              :fieldObj="fieldObj"
              :fieldSearch="fieldSearch"
              :pageByField="pageByField"
              :setPage="setPage"
            />

            <!-- Campo SWITCH -->
            <FieldSwitch
              v-else-if="fieldObj.field.type === 'switch'"
              :fieldObj="fieldObj"
              :fieldSearch="fieldSearch"
              :pageByField="pageByField"
              :setPage="setPage"
            />

            <!-- Campo GEOLOCALIZACIÓN -->
            <FieldGeo
              v-else-if="['geolocation', 'geo', 'location'].includes(fieldObj.field.type)"
              :fieldObj="fieldObj"
              :fieldSearch="fieldSearch"
              :pageByField="pageByField"
              :setPage="setPage"
              :geoLayerByField="geoLayerByField"
              :getGeoPoints="getGeoPoints"
              :getGeoCenter="getGeoCenter"
              :getGeoZoom="getGeoZoom"
              :getGeoAddress="getGeoAddress"
              :getGeoCoords="getGeoCoords"
            />
          </v-expansion-panel-text>
        </v-expansion-panel>
      </template>
    </v-expansion-panels>
  </section>
</template>

<style scoped src="@/styles/rform_answer.css"></style>
