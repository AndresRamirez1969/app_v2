<script setup>
defineProps({
  fieldObj: { type: Object, required: true },
  fieldSearch: { type: Object, required: true },
  pageByField: { type: Object, required: true },
  setPage: { type: Function, required: true }
});

import { ref, computed, defineAsyncComponent } from 'vue';

const VueApexCharts = defineAsyncComponent(() => import('vue3-apexcharts').then((m) => m.default || m).catch(() => null));

const pageSize = 10;

function getPaginatedResponses(fieldId, responses, pageByField) {
  const page = pageByField[fieldId] || 1;
  const start = (page - 1) * pageSize;
  return responses.slice(start, start + pageSize);
}

function getSwitchDonutSeries(responses) {
  let on = 0,
    off = 0;
  for (const r of responses) {
    if (r.value === true || r.value === 1 || r.value === '1' || r.value === 'true' || r.value === 'on' || r.value === 'activo') on++;
    else off++;
  }
  return [on, off];
}

function getSwitchDonutOptions() {
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

function numberFmt(n) {
  return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(n ?? 0);
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
            <div class="text-h6">{{ numberFmt(fieldObj.responses.length) }}</div>
          </v-card>
          <v-card class="kpi-card pa-3 mb-2">
            <div class="text-caption text-medium-emphasis">Activados</div>
            <div class="text-h6">
              {{
                fieldObj.responses.filter(
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
            :options="getSwitchDonutOptions()"
            :series="getSwitchDonutSeries(fieldObj.responses)"
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
          :model-value="pageByField[fieldObj.field.id]"
          :length="
            Math.max(
              1,
              Math.ceil(
                fieldObj.responses.filter((r) => {
                  const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
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
