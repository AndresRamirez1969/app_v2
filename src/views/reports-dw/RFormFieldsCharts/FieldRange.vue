<script setup>
import { defineAsyncComponent, computed } from 'vue';

const props = defineProps({
  fieldObj: { type: Object, required: true },
  fieldSearch: { type: Object, required: true },
  pageByField: { type: Object, required: true },
  setPage: { type: Function, required: true }
});

const VueApexCharts = defineAsyncComponent(() => import('vue3-apexcharts').then((m) => m.default || m).catch(() => null));

const pageSize = 10;

/* ===========================
   Utilidades de números/rango
   =========================== */
function normalizeNumber(n) {
  if (n === null || n === undefined) return null;
  const x = typeof n === 'string' ? n.replace(',', '.') : n;
  const num = Number(x);
  return Number.isFinite(num) ? num : null;
}

function numberFmt(n) {
  return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(n ?? 0);
}

function buildBins(values, maxVal, bins) {
  const v = values.filter(Number.isFinite);
  if (!v.length) return { categories: [], counts: [] };

  const X = Number.isFinite(maxVal) && maxVal > 0 ? maxVal : Math.max(...v);
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
}

function getRangeHistogramSeries(fieldObj) {
  const values = (fieldObj.responses || []).map((r) => normalizeNumber(r.value)).filter(Number.isFinite);
  const maxVal = values.length ? Math.max(...values) : 0;
  const bins = 8;
  const { counts } = buildBins(values, maxVal, bins);
  return [{ name: 'Valores', data: counts }];
}

function getRangeHistogramOptions(fieldObj) {
  const labelCampo = fieldObj?.field?.label || fieldObj?.field?.title || fieldObj?.field?.name || `Campo`;
  const values = (fieldObj.responses || []).map((r) => normalizeNumber(r.value)).filter(Number.isFinite);
  const maxVal = values.length ? Math.max(...values) : 0;
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

/* ==========================
   Score robusto (mismas reglas
   que el componente anterior)
   ========================== */
function toNum(x) {
  if (typeof x === 'number') return x;
  if (typeof x === 'string' && x.trim() !== '' && !isNaN(+x)) return +x;
  return undefined;
}

const fieldConfiguredPoints = computed(() => {
  const f = props.fieldObj?.field || {};
  const o = props.fieldObj || {};

  // Ampliado: cubre la mayoría de variantes que solemos ver
  const keys = [
    'points',
    'point',
    'pts',
    'puntos',
    'max_points',
    'score',
    'score_max',
    'maxScore',
    'max_score',
    'total_points',
    'points_total',
    'puntaje',
    'puntaje_max',
    'max',
    'maxPts',
    'maxpts',
    'value',
    'valor',
    'weight',
    'weight_points'
  ];

  for (const src of [f, o]) {
    for (const k of keys) {
      const n = toNum(src?.[k]);
      if (n !== undefined) return n;
    }
  }
  return 0;
});

const hasScore = computed(() => {
  if (fieldConfiguredPoints.value > 0) return true;
  if (props.fieldObj?.field?.has_rating === true) return true;

  const t = (props.fieldObj?.field?.type || '').toLowerCase();
  if (['rating', 'score'].includes(t)) return true;

  return (
    Array.isArray(props.fieldObj?.responses) &&
    props.fieldObj.responses.some((r) => {
      const explicitKeys = ['score', 'points', 'puntos', 'score_obtenido', 'obtained'];
      return explicitKeys.some((k) => toNum(r?.[k]) !== undefined);
    })
  );
});

function getScoreObtained(resp) {
  // 1) Si la respuesta trae puntaje explícito, se respeta
  const explicitKeys = ['score', 'points', 'puntos', 'score_obtenido', 'obtained'];
  for (const k of explicitKeys) {
    const v = toNum(resp?.[k]);
    if (v !== undefined) return `${v} pts`;
  }

  // 2) Si no, y hay respuesta, usamos los puntos del campo
  const answered = resp?.value !== null && resp?.value !== undefined && String(resp?.value).trim() !== '';
  const pts = answered ? fieldConfiguredPoints.value : 0;
  return `${pts} pts`;
}

/* ==========================
   Búsqueda y paginación
   ========================== */
function filterResponses(responses, search) {
  if (!search) return responses;
  const s = search.toString().toLowerCase();
  return responses.filter(
    (r) =>
      (r?.folio && r.folio.toString().toLowerCase().includes(s)) ||
      (r?.id && r.id.toString().toLowerCase().includes(s)) ||
      (r?.user && typeof r.user === 'object' && r.user?.name && r.user.name.toString().toLowerCase().includes(s)) ||
      (r?.user && typeof r.user === 'string' && r.user.toLowerCase().includes(s)) ||
      (r?.value && String(r.value).toLowerCase().includes(s))
  );
}

function getPaginatedResponses(fieldId, responses, pageByField) {
  const page = pageByField[fieldId] || 1;
  const start = (page - 1) * pageSize;
  return responses.slice(start, start + pageSize);
}
</script>

<template>
  <div>
    <div class="mb-2 d-flex align-center justify-space-between">
      <div class="text-h6 font-weight-bold">Distribución (Histograma de rango)</div>
    </div>

    <div v-if="props.fieldObj.responses.length">
      <component
        :is="VueApexCharts"
        type="bar"
        height="320"
        :key="`range-histogram-${props.fieldObj.field.id}-${props.fieldObj.responses.length}`"
        :options="getRangeHistogramOptions(props.fieldObj)"
        :series="getRangeHistogramSeries(props.fieldObj)"
      />
    </div>
    <div v-else class="text-medium-emphasis py-4">No hay datos suficientes para mostrar el gráfico.</div>

    <!-- Searchbar y tabla/cards debajo del histograma -->
    <div class="search-table-container mt-6">
      <v-text-field
        v-model="props.fieldSearch[props.fieldObj.field.id]"
        :placeholder="`Buscar por folio, usuario o valor...`"
        prepend-inner-icon="mdi-magnify"
        clearable
        class="custom-search"
        density="compact"
        variant="outlined"
        color="primary"
        hide-details
        style="width: 100%; min-width: 0; padding-bottom: 12px"
      />

      <!-- Tabla desktop -->
      <v-table density="compact" style="width: 100%" class="records-table d-none d-md-table">
        <thead>
          <tr>
            <th>Folio</th>
            <th>Nombre</th>
            <th>Rango</th>
            <th v-if="hasScore">Score obtenido</th>
          </tr>
        </thead>
        <tbody>
          <template
            v-for="(resp, i) in getPaginatedResponses(
              props.fieldObj.field.id,
              filterResponses(props.fieldObj.responses, props.fieldSearch[props.fieldObj.field.id]),
              props.pageByField
            )"
            :key="i"
          >
            <tr class="response-row">
              <td>
                <div class="response-value-cell">
                  <a :href="`/folio/${resp?.folio || resp?.id}`" target="_blank" rel="noopener noreferrer" class="folio-link">
                    {{ resp.folio || resp.id || '-' }}
                  </a>
                </div>
              </td>
              <td>
                <div class="response-value-cell">
                  <span class="font-weight-medium">{{ resp.user?.name || resp.user || '-' }}</span>
                </div>
              </td>
              <td>
                <div class="response-value-cell">
                  {{ numberFmt(normalizeNumber(resp.value)) }}
                </div>
              </td>
              <td v-if="hasScore">
                <div class="response-value-cell">{{ getScoreObtained(resp) }}</div>
              </td>
            </tr>

            <tr
              v-if="
                i <
                getPaginatedResponses(
                  props.fieldObj.field.id,
                  filterResponses(props.fieldObj.responses, props.fieldSearch[props.fieldObj.field.id]),
                  props.pageByField
                ).length -
                  1
              "
            >
              <td :colspan="hasScore ? 4 : 3" style="height: 6px; padding: 0; border: none; background: transparent"></td>
            </tr>
          </template>

          <tr v-if="filterResponses(props.fieldObj.responses, props.fieldSearch[props.fieldObj.field.id]).length === 0">
            <td :colspan="hasScore ? 4 : 3" class="text-medium-emphasis">No hay registros de rango.</td>
          </tr>
        </tbody>
      </v-table>

      <!-- Cards móvil -->
      <div class="records-cards d-md-none">
        <v-row>
          <v-col
            v-for="(resp, i) in getPaginatedResponses(
              props.fieldObj.field.id,
              filterResponses(props.fieldObj.responses, props.fieldSearch[props.fieldObj.field.id]),
              props.pageByField
            )"
            :key="i"
            cols="12"
          >
            <v-card class="mb-4 pa-3 elevation-1 rounded-lg response-card" style="cursor: default; position: relative">
              <div v-if="hasScore" style="position: absolute; top: 12px; right: 16px; font-size: 0.85rem; font-weight: 500">
                {{ getScoreObtained(resp) }}
              </div>
              <div class="d-flex flex-column mb-1" style="gap: 8px">
                <span class="folio-link text-caption" style="color: #1976d2; text-decoration: underline; font-weight: 500; min-width: 60px">
                  {{ resp.folio || resp.id || '-' }}
                </span>
                <span class="font-weight-medium" style="color: #333; font-size: 0.9rem">
                  {{ resp.user?.name || resp.user || '-' }}
                </span>
                <span style="font-size: 0.9rem"> <strong>Rango:</strong> {{ numberFmt(normalizeNumber(resp.value)) }} </span>
              </div>
            </v-card>
          </v-col>

          <v-col v-if="filterResponses(props.fieldObj.responses, props.fieldSearch[props.fieldObj.field.id]).length === 0" cols="12">
            <v-card class="response-card pa-3 text-medium-emphasis mb-4 rounded-lg elevation-1"> No hay registros de rango. </v-card>
          </v-col>
        </v-row>
      </div>

      <div class="d-flex flex-column align-center mt-2">
        <v-pagination
          :model-value="props.pageByField[props.fieldObj.field.id]"
          :length="
            Math.max(1, Math.ceil(filterResponses(props.fieldObj.responses, props.fieldSearch[props.fieldObj.field.id]).length / pageSize))
          "
          :total-visible="1"
          color="primary"
          @update:modelValue="props.setPage(props.fieldObj.field.id, $event)"
          class="mobile-pagination"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.records-table {
  border-collapse: separate !important;
}
.response-row {
  background: #f5f5f5;
  border-radius: 8px;
}
.records-table tr > td {
  padding-bottom: 12px;
  padding-top: 12px;
}
.folio-link {
  color: #1976d2;
  text-decoration: underline;
  cursor: pointer;
}
.records-cards .response-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0px 2px 8px 0px rgba(60, 60, 60, 0.08);
  border: 1px solid #eaeaea;
  margin-bottom: 16px;
}
@media (min-width: 768px) {
  .records-cards {
    display: none !important;
  }
}
@media (max-width: 767px) {
  .records-table {
    display: none !important;
  }
  .records-cards {
    display: block !important;
  }
}
</style>
