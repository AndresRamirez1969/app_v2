<script setup>
import { defineAsyncComponent, computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { mdiMagnify } from '@mdi/js';

const props = defineProps({
  fieldObj: { type: Object, required: true },
  fieldSearch: { type: Object, required: true },
  pageByField: { type: Object, required: true },
  setPage: { type: Function, required: true }
});

const router = useRouter();

const VueApexCharts = defineAsyncComponent(() => import('vue3-apexcharts').then((m) => m.default || m).catch(() => null));

const pageSize = 10;

/* ===========================
   Helpers para score en tabla
   =========================== */
function toNum(x) {
  if (typeof x === 'number') return x;
  if (typeof x === 'string' && x.trim() !== '' && !isNaN(+x)) return +x;
  return undefined;
}

function numberFmt(n) {
  return typeof n === 'number' ? n.toLocaleString('es-MX') : n;
}

const fieldConfiguredPoints = computed(() => {
  const f = props.fieldObj?.field || {};
  const o = props.fieldObj || {};
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
      const explicit = ['score', 'points', 'puntos', 'score_obtenido', 'obtained'];
      return explicit.some((k) => toNum(r?.[k]) !== undefined);
    })
  );
});

function getScoreObtained(resp) {
  const explicit = ['score', 'points', 'puntos', 'score_obtenido', 'obtained'];
  for (const k of explicit) {
    const v = toNum(resp?.[k]);
    if (v !== undefined) return `${v} pts`;
  }
  const answered = resp?.value !== null && resp?.value !== undefined && String(resp?.value).trim() !== '';
  const pts = answered ? fieldConfiguredPoints.value : 0;
  return `${pts} pts`;
}

/* ===========================
   Paginación para tabla/cards
   =========================== */
function getPaginatedResponses(fieldId, responses, pageByField) {
  const page = pageByField[fieldId] || 1;
  const start = (page - 1) * pageSize;
  return responses.slice(start, start + pageSize);
}

/* ===========================
   Serie y opciones de la dona
   =========================== */
function getSwitchDonutSeries(responses) {
  let on = 0,
    off = 0;
  for (const r of responses) {
    const v = r.value;
    if (v === true || v === 1 || v === '1' || v === 'true' || v === 'on' || v === 'activo') on++;
    else off++;
  }
  return [on, off];
}

/** Calcula % con base en config.series (no globals) */
function pctFromConfig(w, idx) {
  const arr = (w?.config?.series || []).map((n) => Number(n) || 0);
  const total = arr.reduce((a, b) => a + b, 0);
  const value = arr[idx] || 0;
  return total ? (value / total) * 100 : 0;
}

// === INTEGRACIÓN REACTIVA PARA EL CENTRO DE LA DONA ===
const activeSlice = ref(0);

const donutOptions = computed(() => ({
  chart: {
    type: 'donut',
    height: 320,
    toolbar: { show: false },
    events: {
      dataPointMouseEnter: (_e, _ctx, cfg) => {
        activeSlice.value = cfg?.dataPointIndex ?? 0;
      },
      dataPointMouseLeave: () => {
        activeSlice.value = 0;
      },
      dataPointSelection: (_e, _ctx, cfg) => {
        activeSlice.value = cfg?.dataPointIndex ?? 0;
      }
    }
  },
  labels: ['Activados', 'Desactivados'],
  legend: { position: 'bottom' },
  dataLabels: {
    enabled: true,
    formatter: (val) => `${Number(val).toFixed(2)}%`
  },
  tooltip: {
    y: {
      formatter: function (_val, opts) {
        const w = opts?.w;
        const idx = opts?.seriesIndex ?? 0;
        const series = w?.globals?.series || [];
        const total = series.reduce((a, b) => a + b, 0);
        const value = series[idx] ?? 0;
        const pct = total > 0 ? (value / total) * 100 : 0;
        return `${pct.toFixed(2)}%`;
      }
    }
  },
  colors: ['#81C784', '#E57373'],
  plotOptions: {
    pie: {
      donut: {
        labels: {
          show: true,
          name: {
            show: true,
            formatter: (_val, opts) => {
              const labels = opts?.w?.config?.labels || ['Activados', 'Desactivados'];
              const idx = typeof activeSlice.value === 'number' ? activeSlice.value : 0;
              return labels[idx] ?? labels[0];
            }
          },
          value: {
            show: true,
            formatter: (_val, opts) => {
              const w = opts?.w;
              const idx = typeof activeSlice.value === 'number' ? activeSlice.value : 0;
              const series = w?.globals?.series || [];
              const total = series.reduce((a, b) => a + b, 0);
              const value = series[idx] ?? 0;
              const pct = total > 0 ? (value / total) * 100 : 0;
              return `${pct.toFixed(2)}%`;
            }
          },
          total: {
            show: true,
            label: (w) => {
              const labels = w?.config?.labels || ['Activados', 'Desactivados'];
              const idx = typeof activeSlice.value === 'number' ? activeSlice.value : 0;
              return labels[idx] ?? labels[0];
            },
            formatter: (w) => {
              const series = w?.globals?.series || [];
              const idx = typeof activeSlice.value === 'number' ? activeSlice.value : 0;
              const total = series.reduce((a, b) => a + b, 0);
              const value = series[idx] ?? 0;
              const pct = total > 0 ? (value / total) * 100 : 0;
              return `${pct.toFixed(2)}%`;
            }
          }
        }
      }
    }
  },
  noData: { text: 'Sin datos para este campo' }
}));

/* ===========================
   Navegación al show del reporte
   =========================== */
function goToReportShow(resp) {
  // Se asume que resp tiene formId y reportId, si no, ajusta según tu estructura
  if (resp && (resp.folio || resp.id)) {
    router.push({
      name: 'Report Answer Show',
      params: {
        formId: resp.form_id || resp.formId || props.fieldObj.form_id || props.fieldObj.formId,
        reportId: resp.report_id || resp.reportId || resp.folio || resp.id
      }
    });
  }
}
</script>

<template>
  <div>
    <div class="mb-2 d-flex align-center justify-space-between">
      <div class="text-h6 font-weight-bold">Distribución de respuestas (Switch)</div>
    </div>

    <v-row class="mb-2 kpi-row" dense>
      <v-col cols="12" md="4">
        <div class="d-flex flex-column">
          <v-card class="kpi-card pa-3 mb-2">
            <div class="text-caption text-medium-emphasis">Total de respuestas</div>
            <div class="text-h6">{{ numberFmt(props.fieldObj.responses.length) }}</div>
          </v-card>
          <v-card class="kpi-card pa-3 mb-2">
            <div class="text-caption text-medium-emphasis">Activados</div>
            <div class="text-h6">
              {{
                props.fieldObj.responses.filter(
                  (r) =>
                    r.value === true || r.value === 1 || r.value === '1' || r.value === 'true' || r.value === 'on' || r.value === 'activo'
                ).length
              }}
            </div>
          </v-card>
          <v-card class="kpi-card pa-3 mb-2">
            <div class="text-caption text-medium-emphasis">Desactivados</div>
            <div class="text-h6">
              {{
                props.fieldObj.responses.filter(
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
        <div v-if="props.fieldObj.responses.length" style="width: 100%; max-width: 400px">
          <component
            :is="VueApexCharts"
            type="donut"
            height="320"
            :key="`switch-donut-${props.fieldObj.field.id}-${props.fieldObj.responses.length}`"
            :options="donutOptions"
            :series="getSwitchDonutSeries(props.fieldObj.responses)"
          />
        </div>
        <div v-else class="text-medium-emphasis py-4">No hay datos suficientes para mostrar el gráfico.</div>
      </v-col>
    </v-row>

    <!-- Buscador y tabla/cards -->
    <div class="search-table-container mt-6">
      <v-text-field
        v-model="props.fieldSearch[props.fieldObj.field.id]"
        :placeholder="`Buscar folio, usuario o estado...`"
        clearable
        class="custom-search"
        density="compact"
        variant="outlined"
        color="primary"
        hide-details
        style="width: 100%; min-width: 0; padding-bottom: 12px"
      >
        <template #prepend-inner>
          <v-icon :icon="mdiMagnify" />
        </template>
      </v-text-field>

      <!-- Tabla (desktop) -->
      <v-table density="compact" style="width: 100%" class="image-records-table d-none d-md-table">
        <thead>
          <tr>
            <th>Folio</th>
            <th>Usuario</th>
            <th>Estado</th>
            <th v-if="hasScore">Score obtenido</th>
          </tr>
        </thead>
        <tbody>
          <template
            v-for="(resp, i) in getPaginatedResponses(
              props.fieldObj.field.id,
              props.fieldObj.responses.filter((r) => {
                const search = (props.fieldSearch[props.fieldObj.field.id] || '').toString().toLowerCase();
                const estado =
                  r.value === true || r.value === 1 || r.value === '1' || r.value === 'true' || r.value === 'on' || r.value === 'activo'
                    ? 'Activado'
                    : 'Desactivado';
                return (
                  !search ||
                  (r.folio && r.folio.toString().toLowerCase().includes(search)) ||
                  (r.user && r.user.toString().toLowerCase().includes(search)) ||
                  estado.toLowerCase().includes(search)
                );
              }),
              props.pageByField
            )"
            :key="i"
          >
            <tr class="response-row record-row">
              <td class="response-value-cell">
                <span
                  class="folio-link"
                  style="color: #1976d2; text-decoration: underline; font-weight: 500; cursor: pointer"
                  @click="goToReportShow(resp)"
                >
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
              <td v-if="hasScore" class="response-value-cell">
                {{ getScoreObtained(resp) }}
              </td>
            </tr>
          </template>
          <tr
            v-if="
              props.fieldObj.responses.filter((r) => {
                const search = (props.fieldSearch[props.fieldObj.field.id] || '').toString().toLowerCase();
                const estado =
                  r.value === true || r.value === 1 || r.value === '1' || r.value === 'true' || r.value === 'on' || r.value === 'activo'
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
            <td :colspan="hasScore ? 4 : 3" class="text-medium-emphasis">No hay registros de switch.</td>
          </tr>
        </tbody>
      </v-table>

      <!-- Cards (móvil/tablet) -->
      <div class="image-records-cards d-md-none">
        <v-row>
          <v-col
            v-for="(resp, i) in getPaginatedResponses(
              props.fieldObj.field.id,
              props.fieldObj.responses.filter((r) => {
                const search = (props.fieldSearch[props.fieldObj.field.id] || '').toString().toLowerCase();
                const estado =
                  r.value === true || r.value === 1 || r.value === '1' || r.value === 'true' || r.value === 'on' || r.value === 'activo'
                    ? 'Activado'
                    : 'Desactivado';
                return (
                  !search ||
                  (r.folio && r.folio.toString().toLowerCase().includes(search)) ||
                  (r.user && r.user.toString().toLowerCase().includes(search)) ||
                  estado.toLowerCase().includes(search)
                );
              }),
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
                <span
                  class="folio-link text-caption"
                  style="color: #1976d2; text-decoration: underline; font-weight: 500; min-width: 60px; cursor: pointer"
                  @click="goToReportShow(resp)"
                >
                  {{ resp.folio || resp.id || '-' }}
                </span>
                <span class="font-weight-medium" style="color: #333; font-size: 0.9rem">
                  {{ resp.user?.name || resp.user || '-' }}
                </span>
                <span style="font-size: 0.9rem">
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
              props.fieldObj.responses.filter((r) => {
                const search = (props.fieldSearch[props.fieldObj.field.id] || '').toString().toLowerCase();
                const estado =
                  r.value === true || r.value === 1 || r.value === '1' || r.value === 'true' || r.value === 'on' || r.value === 'activo'
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
            <v-card class="response-card pa-3 text-medium-emphasis mb-4 rounded-lg elevation-1"> No hay registros de switch. </v-card>
          </v-col>
        </v-row>
      </div>

      <div class="d-flex flex-column align-center mt-2">
        <v-pagination
          :model-value="props.pageByField[props.fieldObj.field.id]"
          :length="
            Math.max(
              1,
              Math.ceil(
                props.fieldObj.responses.filter((r) => {
                  const search = (props.fieldSearch[props.fieldObj.field.id] || '').toString().toLowerCase();
                  const estado =
                    r.value === true || r.value === 1 || r.value === '1' || r.value === 'true' || r.value === 'on' || r.value === 'activo'
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
          @update:modelValue="props.setPage(props.fieldObj.field.id, $event)"
          class="mobile-pagination"
        />
      </div>
    </div>
  </div>
</template>

<style scoped src="@/styles/report_field_charts.css"></style>
