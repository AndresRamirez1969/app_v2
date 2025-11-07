<script setup>
defineProps({
  fieldObj: { type: Object, required: true },
  fieldSearch: { type: Object, required: true },
  pageByField: { type: Object, required: true },
  setPage: { type: Function, required: true }
});

import { defineAsyncComponent } from 'vue';
const VueApexCharts = defineAsyncComponent(() => import('vue3-apexcharts').then((m) => m.default || m).catch(() => null));

const pageSize = 10;

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

function getNumericHistogramSeries(fieldObj) {
  const values = fieldObj.responses.map((r) => normalizeNumber(r.value)).filter(Number.isFinite);
  const maxVal = Math.max(...values);
  const bins = 8;
  const { counts } = buildBins(values, maxVal, bins);
  return [{ name: 'Valores', data: counts }];
}

function getNumericHistogramOptions(fieldObj) {
  const labelCampo = fieldObj.field.label || fieldObj.field.title || fieldObj.field.name || `Campo`;
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

function getPaginatedResponses(fieldId, responses, pageByField) {
  const page = pageByField[fieldId] || 1;
  const start = (page - 1) * pageSize;
  return responses.slice(start, start + pageSize);
}
</script>

<template>
  <div>
    <div class="mb-2 d-flex align-center justify-space-between">
      <div class="text-h6 font-weight-bold">Distribución (Histograma)</div>
    </div>

    <div v-if="fieldObj.responses.length">
      <component
        :is="VueApexCharts"
        type="bar"
        height="320"
        :key="`histogram-${fieldObj.field.id}-${fieldObj.responses.length}`"
        :options="getNumericHistogramOptions(fieldObj)"
        :series="getNumericHistogramSeries(fieldObj)"
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
              }),
              pageByField
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
                }).length / pageSize
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
</template>
