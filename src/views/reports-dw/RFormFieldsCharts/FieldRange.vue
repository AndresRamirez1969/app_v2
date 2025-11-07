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

function getRangeHistogramSeries(fieldObj) {
  const values = fieldObj.responses.map((r) => normalizeNumber(r.value)).filter(Number.isFinite);
  const maxVal = Math.max(...values);
  const bins = 8;
  const { counts } = buildBins(values, maxVal, bins);
  return [{ name: 'Valores', data: counts }];
}

function getRangeHistogramOptions(fieldObj) {
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
    colors: ['#0288d1'],
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
      <div class="text-h6 font-weight-bold">Distribución (Histograma de rango)</div>
    </div>

    <div v-if="fieldObj.responses.length">
      <component
        :is="VueApexCharts"
        type="bar"
        height="320"
        :key="`range-histogram-${fieldObj.field.id}-${fieldObj.responses.length}`"
        :options="getRangeHistogramOptions(fieldObj)"
        :series="getRangeHistogramSeries(fieldObj)"
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
              }),
              pageByField
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
              }),
              pageByField
            )"
            :key="i"
            cols="12"
          >
            <v-card class="mb-4 pa-3 elevation-1 rounded-lg response-card" style="cursor: default">
              <div class="d-flex flex-column mb-1" style="gap: 8px">
                <span class="folio-link text-caption" style="color: #1976d2; text-decoration: underline; font-weight: 500; min-width: 60px">
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
            <v-card class="response-card pa-3 text-medium-emphasis mb-4 rounded-lg elevation-1"> No hay registros de rango. </v-card>
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
