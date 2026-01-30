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

/* --------- NUMÉRICO --------- */
function normalizeNumber(n) {
  if (n === null || n === undefined) return null;
  const x = typeof n === 'string' ? n.replace(',', '.') : n;
  const num = Number(x);
  return Number.isFinite(num) ? num : null;
}

function numberFmt(n) {
  if (n === null || n === undefined) return '-';
  return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(n);
}

function buildBins(values, maxVal, bins) {
  const v = values.filter(Number.isFinite);
  if (!v.length) return { categories: [], counts: [] };
  const X = Number.isFinite(maxVal) && maxVal > 0 ? maxVal : Math.max(...v);
  const step = X > 0 ? X / bins : 1;
  const counts = Array.from({ length: bins }, () => 0);
  const categories = [];
  for (let i = 0; i < bins; i++) {
    const start = Math.floor(i * step);
    const end = i === bins - 1 ? Math.ceil(X) : Math.floor((i + 1) * step);
    categories.push(`${start} - ${end}`);
  }
  for (const score of v) {
    let idx = step > 0 ? Math.floor(score / step) : 0;
    if (idx >= bins) idx = bins - 1;
    counts[idx] += 1;
  }
  return { categories, counts };
}

function getNumericHistogramSeries(fieldObj) {
  const values = fieldObj.responses.map((r) => normalizeNumber(r.value)).filter(Number.isFinite);
  const maxVal = values.length ? Math.max(...values) : 0;
  const bins = 8;
  const { counts } = buildBins(values, maxVal, bins);
  return [{ name: 'Valores', data: counts }];
}

function getNumericHistogramOptions(fieldObj) {
  const labelCampo = fieldObj.field.label || fieldObj.field.title || fieldObj.field.name || `Campo`;
  const values = fieldObj.responses.map((r) => normalizeNumber(r.value)).filter(Number.isFinite);
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
    colors: ['#1976d2'],
    noData: { text: 'Sin datos para este campo' }
  };
}

/* --------- LISTADO + SCORE --------- */
function getPaginatedResponses(fieldId, responses, pageByField) {
  const page = pageByField[fieldId] || 1;
  const start = (page - 1) * pageSize;
  return responses.slice(start, start + pageSize);
}

function filterResponses(responses, search) {
  if (!search) return responses;
  const s = search.toString().toLowerCase();
  return responses.filter(
    (r) =>
      (r.folio && r.folio.toString().toLowerCase().includes(s)) ||
      (r.id && r.id.toString().toLowerCase().includes(s)) ||
      (r.nombre && r.nombre.toString().toLowerCase().includes(s)) ||
      (r.user && typeof r.user === 'object' && r.user.name && r.user.name.toString().toLowerCase().includes(s)) ||
      (r.user && typeof r.user === 'string' && r.user.toLowerCase().includes(s)) ||
      (r.value !== undefined && r.value !== null && r.value.toString().toLowerCase().includes(s))
  );
}

/* === NUEVO === ¿El usuario respondió algo? (contar '0' como válido) */
function isAnswered(resp) {
  const v = resp?.value;
  return v !== undefined && v !== null && String(v).trim() !== '';
}

/* === NUEVO === Mostrar columna de score si el campo o respuestas tienen peso/score */
const hasScore = computed(() => {
  const field = props.fieldObj.field || {};
  if (field.has_rating === true) return true;
  if (['rating', 'score'].includes(field.type)) return true;
  if (Number(field.weight ?? 0) > 0) return true;
  if (
    Array.isArray(props.fieldObj.responses) &&
    props.fieldObj.responses.some((r) => r.weight !== undefined || r.score_obtained !== undefined)
  )
    return true;
  return false;
});

/* === NUEVO === Obtener puntaje: usa score_obtained; si no viene, calcula con weight local/fallback */
function getScoreObtained(resp) {
  if (resp.score_obtained !== undefined && resp.score_obtained !== null) {
    return `${Number(resp.score_obtained)} pts`;
  }
  const answered = isAnswered(resp);
  const weight = Number(resp.weight ?? props.fieldObj.field?.weight ?? 0);
  return `${answered ? (Number.isFinite(weight) ? weight : 0) : 0} pts`;
}
</script>

<template>
  <div>
    <div v-if="props.fieldObj.responses.length">
      <component
        :is="VueApexCharts"
        type="bar"
        height="320"
        :key="`histogram-${props.fieldObj.field.id}-${props.fieldObj.responses.length}`"
        :options="getNumericHistogramOptions(props.fieldObj)"
        :series="getNumericHistogramSeries(props.fieldObj)"
      />
    </div>
    <div v-else class="text-medium-emphasis py-4">No hay datos suficientes para mostrar el gráfico.</div>

    <!-- Searchbar y tabla/cards -->
    <div class="search-table-container mt-6">
      <v-text-field
        v-model="props.fieldSearch[props.fieldObj.field.id]"
        :placeholder="`Buscar por folio, nombre o valor...`"
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
            <th>Respuesta</th>
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
                  <router-link
                    :to="{
                      name: 'Report Answer Show',
                      params: {
                        formId: resp.form_id || resp.formId || props.fieldObj.form_id || props.fieldObj.formId,
                        reportId: resp.report_id || resp.reportId || resp.folio || resp.id
                      }
                    }"
                    style="color: #1976d2; text-decoration: underline; font-weight: 500"
                  >
                    {{ resp.folio || resp.id || '-' }}
                  </router-link>
                </div>
              </td>
              <td>
                <div class="response-value-cell">
                  <span class="font-weight-medium">{{ resp.nombre || resp.user?.name || resp.user || '-' }}</span>
                </div>
              </td>
              <td>
                <div class="response-value-cell">{{ numberFmt(normalizeNumber(resp.value)) }}</div>
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
            <td :colspan="hasScore ? 4 : 3" class="text-medium-emphasis">No hay valores numéricos válidos.</td>
          </tr>
        </tbody>
      </v-table>

      <!-- Cards mobile -->
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
                <router-link
                  :to="{
                    name: 'Report Answer Show',
                    params: {
                      formId: resp.form_id || resp.formId || props.fieldObj.form_id || props.fieldObj.formId,
                      reportId: resp.report_id || resp.reportId || resp.folio || resp.id
                    }
                  }"
                  style="color: #1976d2; text-decoration: underline; font-weight: 500; min-width: 60px; font-size: 0.95rem"
                >
                  {{ resp.folio || resp.id || '-' }}
                </router-link>
                <span class="font-weight-medium" style="color: #333; font-size: 0.95rem">
                  {{ resp.nombre || resp.user?.name || resp.user || '-' }}
                </span>
                <span style="font-size: 0.95rem"> <strong>Respuesta:</strong> {{ numberFmt(normalizeNumber(resp.value)) }} </span>
              </div>
            </v-card>
          </v-col>
          <v-col v-if="filterResponses(props.fieldObj.responses, props.fieldSearch[props.fieldObj.field.id]).length === 0" cols="12">
            <v-card class="response-card pa-3 text-medium-emphasis mb-4 rounded-lg elevation-1"> No hay valores numéricos válidos. </v-card>
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

<style scoped src="@/styles/report_field_charts.css"></style>
