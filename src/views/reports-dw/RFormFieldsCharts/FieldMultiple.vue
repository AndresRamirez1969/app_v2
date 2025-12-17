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
   Helpers genéricos / selector
   =========================== */
function getSelectorOptions(field) {
  let opts = field?.options || field?.choices || field?.values || [];
  if (typeof opts === 'string' && opts.trim().startsWith('[')) {
    try {
      opts = JSON.parse(opts);
    } catch {
      opts = [];
    }
  }
  return Array.isArray(opts) ? opts : [];
}

function norm(v) {
  return (v ?? '').toString().trim().toLowerCase();
}

/* ===========================
   Series para Top N (selector)
   =========================== */
function getSelectorTopNSeries(fieldObj, topN = 8) {
  const options = getSelectorOptions(fieldObj.field);
  const optionLabels = options.map((opt) => (typeof opt === 'string' ? opt : opt.label || opt.name || opt.value || opt));

  const counts = {};
  for (const r of fieldObj.responses || []) {
    let values = r?.value;

    if (typeof values === 'string') {
      if (values.trim().startsWith('[')) {
        try {
          values = JSON.parse(values);
        } catch {
          values = [values];
        }
      } else if (values.includes(',')) {
        values = values
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean);
      }
    }

    const pushOne = (raw) => {
      if (!raw) return;
      let label = typeof raw === 'object' ? raw.label || raw.name || raw.value : raw;
      if (typeof label !== 'string') return;
      const k = norm(label);
      if (!k) return;
      const pretty = optionLabels.find((o) => norm(o) === k) || label;
      counts[pretty] = (counts[pretty] || 0) + 1;
    };

    Array.isArray(values) ? values.forEach(pushOne) : pushOne(values);
  }

  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN);
  const data = sorted.map(([, count]) => count);
  return [{ name: 'Respuestas', data }];
}

/* ===========================
   Soporte Semáforo (colores)
   =========================== */
function isSemaforo(field) {
  const t = norm(field?.type);
  if (['semaforo', 'trafficlight', 'semaforo_radio'].includes(t)) return true;
  const n = norm(field?.name);
  const l = norm(field?.label || field?.title);
  return n.includes('semaforo') || l.includes('semaforo');
}
function colorForSemaforo(label) {
  const v = norm(label);
  if (v === 'alto') return '#e53935';
  if (v === 'medio') return '#fbc02d';
  if (v === 'bajo') return '#43a047';
  return '#bdbdbd';
}

/* ======================================
   Opciones del gráfico (Top N por selector)
   ====================================== */
function getSelectorTopNBarOptions(fieldObj, topN = 8) {
  const labelCampo = fieldObj.field?.label || fieldObj.field?.title || fieldObj.field?.name || `Campo`;

  const options = getSelectorOptions(fieldObj.field);
  const optionLabels = options.map((opt) => (typeof opt === 'string' ? opt : opt.label || opt.name || opt.value || opt));

  const counts = {};
  for (const r of fieldObj.responses || []) {
    let values = r?.value;

    if (typeof values === 'string') {
      if (values.trim().startsWith('[')) {
        try {
          values = JSON.parse(values);
        } catch {
          values = [values];
        }
      } else if (values.includes(',')) {
        values = values
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean);
      }
    }

    const pushOne = (raw) => {
      if (!raw) return;
      let label = typeof raw === 'object' ? raw.label || raw.name || raw.value : raw;
      if (typeof label !== 'string') return;
      const k = norm(label);
      if (!k) return;
      const pretty = optionLabels.find((o) => norm(o) === k) || label;
      counts[pretty] = (counts[pretty] || 0) + 1;
    };

    Array.isArray(values) ? values.forEach(pushOne) : pushOne(values);
  }

  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN);
  const categories = sorted.map(([label]) => label);

  let colors;
  if (isSemaforo(fieldObj.field)) {
    colors = categories.map((cat) => colorForSemaforo(cat));
  } else {
    const base = ['#1976d2', '#43a047', '#e53935', '#fbc02d', '#8e24aa', '#00897b', '#fb8c00', '#3949ab', '#d81b60', '#00acc1'];
    colors = categories.map((_, i) => base[i % base.length]);
  }

  return {
    chart: { type: 'bar', height: 340, toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, barHeight: '60%', borderRadius: 6, distributed: true } },
    dataLabels: { enabled: true, formatter: (val) => `${val}` },
    xaxis: { categories, title: { text: `${labelCampo} (Top ${topN})` } },
    yaxis: { title: { text: 'Conteo' }, min: 0, forceNiceScale: true },
    tooltip: { y: { formatter: (val) => `${val}` } },
    colors,
    noData: { text: 'Sin datos para este campo' }
  };
}

/* ===================
   Búsqueda / tabla
   =================== */
function filterResponses(responses, search) {
  if (!search) return responses;
  const s = search.toString().toLowerCase();
  return responses.filter(
    (r) =>
      (r?.folio && r.folio.toString().toLowerCase().includes(s)) ||
      (r?.id && r.id.toString().toLowerCase().includes(s)) ||
      (r?.nombre && r.nombre.toString().toLowerCase().includes(s)) ||
      (r?.user && typeof r.user === 'object' && r.user?.name && r.user.name.toString().toLowerCase().includes(s)) ||
      (r?.user && typeof r.user === 'string' && r.user.toLowerCase().includes(s)) ||
      (r?.value && r.value.toString().toLowerCase().includes(s))
  );
}
function getPaginatedResponses(fieldId, responses, pageByField) {
  const page = pageByField[fieldId] || 1;
  const start = (page - 1) * pageSize;
  return responses.slice(start, start + pageSize);
}

/* ==========================
   Score robusto
   ========================== */

/** Intenta leer un número desde distintos tipos */
function toNum(x) {
  if (typeof x === 'number') return x;
  if (typeof x === 'string' && x.trim() !== '' && !isNaN(+x)) return +x;
  return undefined;
}

/** Puntos configurados a nivel del campo/objeto (múltiples claves posibles) */
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

/** ¿Debemos mostrar la columna de score? */
const hasScore = computed(() => {
  if (fieldConfiguredPoints.value > 0) return true;
  if (props.fieldObj.field?.has_rating === true) return true;
  if (['rating', 'score'].includes(norm(props.fieldObj.field?.type))) return true;

  return (
    Array.isArray(props.fieldObj.responses) &&
    props.fieldObj.responses.some((r) => {
      const explicitKeys = ['score', 'points', 'puntos', 'score_obtenido', 'obtained'];
      return explicitKeys.some((k) => toNum(r?.[k]) !== undefined);
    })
  );
});

/** Texto “Score obtenido” por respuesta */
function getScoreObtained(resp) {
  // 1) Preferimos score explícito en la respuesta (acepta number o string numérica)
  const explicitKeys = ['score', 'points', 'puntos', 'score_obtenido', 'obtained'];
  for (const k of explicitKeys) {
    const v = toNum(resp?.[k]);
    if (v !== undefined) return `${v} pts`;
  }

  // 2) Si no trae, y HAY respuesta, usamos los puntos del campo
  const answered = resp?.value !== null && resp?.value !== undefined && String(resp?.value).trim() !== '';
  const pts = answered ? fieldConfiguredPoints.value : 0;
  return `${pts} pts`;
}

/* ===================
   Render helpers
   =================== */
function renderValue(resp, type) {
  if (type === 'url' && resp?.value) {
    let url = resp.value;
    if (Array.isArray(url)) url = url[0];
    if (typeof url === 'object' && url !== null) url = url.label || url.value || '';
    if (typeof url === 'string' && url) {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#1976d2;text-decoration:underline;">${url}</a>`;
    }
    return url || '-';
  }
  return resp?.value || '-';
}
function renderSelectorValue(resp) {
  let val = resp?.value;
  if (typeof val === 'string') {
    if (val.trim().startsWith('[')) {
      try {
        val = JSON.parse(val);
      } catch {}
    } else if (val.includes(',')) {
      val = val.split(',').map((v) => v.trim());
    }
  }
  if (Array.isArray(val)) return val.filter((v) => v && v.length > 0).join(', ');
  return val || '-';
}
</script>

<template>
  <div>
    <!-- Gráfico Top N -->
    <div v-if="(fieldObj.responses || []).length">
      <component
        :is="VueApexCharts"
        type="bar"
        height="340"
        :key="`selector-topn-${fieldObj.field?.id}-${(fieldObj.responses || []).length}`"
        :options="getSelectorTopNBarOptions(fieldObj, 8)"
        :series="getSelectorTopNSeries(fieldObj, 8)"
      />
    </div>
    <div v-else class="text-medium-emphasis py-4">No hay datos suficientes para mostrar el gráfico.</div>

    <!-- Tabla con búsqueda -->
    <div class="search-table-container">
      <v-text-field
        v-model="fieldSearch[fieldObj.field?.id]"
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
              fieldObj.field?.id,
              filterResponses(fieldObj.responses || [], fieldSearch[fieldObj.field?.id]),
              pageByField
            )"
            :key="i"
          >
            <tr class="response-row">
              <td>
                <div class="response-value-cell">
                  <a
                    :href="`/folio/${resp?.folio || resp?.id}`"
                    target="_blank"
                    rel="noopener noreferrer"
                    style="color: #1976d2; text-decoration: underline; font-weight: 500"
                  >
                    {{ resp?.folio || resp?.id || '-' }}
                  </a>
                </div>
              </td>

              <td>
                <div class="response-value-cell">
                  <span class="font-weight-medium">
                    {{ resp?.nombre || resp?.user?.name || resp?.user || '-' }}
                  </span>
                </div>
              </td>

              <td>
                <div class="response-value-cell">
                  <template v-if="isSemaforo(fieldObj.field)">
                    <span
                      :style="{
                        display: 'inline-block',
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        background: colorForSemaforo(resp?.value),
                        marginRight: '8px',
                        verticalAlign: 'middle'
                      }"
                    ></span>
                    {{ resp?.value || '-' }}
                  </template>

                  <template v-else-if="['select', 'checkbox', 'selector'].includes(norm(fieldObj.field?.type))">
                    {{ renderSelectorValue(resp) }}
                  </template>

                  <template v-else-if="norm(fieldObj.field?.type) === 'url'">
                    <span v-html="renderValue(resp, 'url')" />
                  </template>

                  <template v-else>
                    {{ resp?.value || '-' }}
                  </template>
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
                  fieldObj.field?.id,
                  filterResponses(fieldObj.responses || [], fieldSearch[fieldObj.field?.id]),
                  pageByField
                ).length -
                  1
              "
            >
              <td :colspan="hasScore ? 4 : 3" style="height: 6px; padding: 0; border: none; background: transparent"></td>
            </tr>
          </template>

          <tr v-if="filterResponses(fieldObj.responses || [], fieldSearch[fieldObj.field?.id]).length === 0">
            <td :colspan="hasScore ? 4 : 3" class="text-medium-emphasis">No hay respuestas registradas.</td>
          </tr>
        </tbody>
      </v-table>

      <!-- Cards mobile -->
      <div class="records-cards d-md-none">
        <v-row>
          <v-col
            v-for="(resp, i) in getPaginatedResponses(
              fieldObj.field?.id,
              filterResponses(fieldObj.responses || [], fieldSearch[fieldObj.field?.id]),
              pageByField
            )"
            :key="i"
            cols="12"
          >
            <v-card class="mb-4 pa-3 elevation-1 rounded-lg response-card" style="cursor: default; position: relative">
              <div v-if="hasScore" style="position: absolute; top: 12px; right: 16px; font-size: 0.85rem; font-weight: 500">
                {{ getScoreObtained(resp) }}
              </div>

              <div class="d-flex flex-column mb-1" style="gap: 8px">
                <a
                  :href="`/folio/${resp?.folio || resp?.id}`"
                  target="_blank"
                  rel="noopener noreferrer"
                  style="color: #1976d2; text-decoration: underline; font-weight: 500; min-width: 60px; font-size: 0.95rem"
                >
                  {{ resp?.folio || resp?.id || '-' }}
                </a>

                <span class="font-weight-medium" style="color: #333; font-size: 0.95rem">
                  {{ resp?.nombre || resp?.user?.name || resp?.user || '-' }}
                </span>

                <span style="font-size: 0.95rem">
                  <template v-if="isSemaforo(fieldObj.field)">
                    <strong>Semáforo:</strong>
                    <span
                      :style="{
                        display: 'inline-block',
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        background: colorForSemaforo(resp?.value),
                        marginRight: '8px',
                        verticalAlign: 'middle'
                      }"
                    ></span>
                    {{ resp?.value || '-' }}
                  </template>

                  <template v-else-if="['select', 'checkbox', 'selector'].includes(norm(fieldObj.field?.type))">
                    <strong>Respuesta:</strong> {{ renderSelectorValue(resp) }}
                  </template>

                  <template v-else-if="norm(fieldObj.field?.type) === 'url'">
                    <strong>URL:</strong> <span v-html="renderValue(resp, 'url')" />
                  </template>

                  <template v-else> <strong>Respuesta:</strong> {{ resp?.value || '-' }} </template>
                </span>
              </div>
            </v-card>
          </v-col>

          <v-col v-if="filterResponses(fieldObj.responses || [], fieldSearch[fieldObj.field?.id]).length === 0" cols="12">
            <v-card class="response-card pa-3 text-medium-emphasis mb-4 rounded-lg elevation-1"> No hay respuestas registradas. </v-card>
          </v-col>
        </v-row>
      </div>

      <div class="d-flex flex-column align-center mt-2">
        <v-pagination
          :model-value="pageByField[fieldObj.field?.id]"
          :length="Math.max(1, Math.ceil(filterResponses(fieldObj.responses || [], fieldSearch[fieldObj.field?.id]).length / pageSize))"
          :total-visible="1"
          color="primary"
          @update:modelValue="setPage(fieldObj.field?.id, $event)"
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
