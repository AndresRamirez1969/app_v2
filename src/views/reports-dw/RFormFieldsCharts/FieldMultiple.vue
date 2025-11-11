<script setup>
import { defineAsyncComponent } from 'vue';
import { computed } from 'vue';

const props = defineProps({
  fieldObj: { type: Object, required: true },
  fieldSearch: { type: Object, required: true },
  pageByField: { type: Object, required: true },
  setPage: { type: Function, required: true }
});

const VueApexCharts = defineAsyncComponent(() => import('vue3-apexcharts').then((m) => m.default || m).catch(() => null));
const pageSize = 10;

// Helpers para opciones y gráfico
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

function getSelectorTopNSeries(fieldObj, topN = 8) {
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
  const data = sorted.map(([_, count]) => count);
  return [{ name: 'Respuestas', data }];
}

function getSelectorTopNBarOptions(fieldObj, topN = 8) {
  const labelCampo = fieldObj.field.label || fieldObj.field.title || fieldObj.field.name || `Campo`;
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
  const categories = sorted.map(([label]) => label);

  // Paleta de colores dinámica
  const baseColors = ['#1976d2', '#43a047', '#e53935', '#fbc02d', '#8e24aa', '#00897b', '#fb8c00', '#3949ab', '#d81b60', '#00acc1'];
  const colors = categories.map((_, i) => baseColors[i % baseColors.length]);

  return {
    chart: { type: 'bar', height: 340, toolbar: { show: false } },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: '60%',
        borderRadius: 6,
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

// Filtrado y paginación
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
      (r.value && r.value.toString().toLowerCase().includes(s))
  );
}

function getPaginatedResponses(fieldId, responses, pageByField) {
  const page = pageByField[fieldId] || 1;
  const start = (page - 1) * pageSize;
  return responses.slice(start, start + pageSize);
}

// Mostrar ponderación si existe
const hasPonderacion = computed(() => props.fieldObj.responses.some((r) => r.ponderacion !== undefined && r.ponderacion !== null));

// Mostrar score obtenido si el campo tiene has_rating, tipo rating/score, o alguna respuesta tiene score
const hasScore = computed(() => {
  if (props.fieldObj.field.has_rating === true) return true;
  if (['rating', 'score'].includes(props.fieldObj.field.type)) return true;
  if (Array.isArray(props.fieldObj.responses) && props.fieldObj.responses.some((r) => r.score !== undefined)) return true;
  return false;
});
function getScoreObtained(resp) {
  const weight = resp.weight ?? 0;
  const answered = resp.value !== undefined && resp.value !== null && String(resp.value).trim() !== '';
  return answered ? weight : 0;
}

// Renderizar valor para URL
function renderValue(resp, type) {
  if (type === 'url' && resp.value) {
    let url = resp.value;
    if (Array.isArray(url)) url = url[0];
    if (typeof url === 'object' && url !== null) url = url.label || url.value || '';
    if (typeof url === 'string' && url) {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#1976d2;text-decoration:underline;">${url}</a>`;
    }
    return url || '-';
  }
  return resp.value || '-';
}
</script>

<template>
  <div>
    <div v-if="fieldObj.responses.length">
      <component
        :is="VueApexCharts"
        type="bar"
        height="340"
        :key="`selector-topn-${fieldObj.field.id}-${fieldObj.responses.length}`"
        :options="getSelectorTopNBarOptions(fieldObj, 8)"
        :series="getSelectorTopNSeries(fieldObj, 8)"
      />
    </div>
    <div v-else class="text-medium-emphasis py-4">No hay datos suficientes para mostrar el gráfico.</div>
    <!-- Tabla con búsqueda y ponderación -->
    <div class="search-table-container">
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

      <v-table density="compact" style="width: 100%" class="records-table d-none d-md-table">
        <thead>
          <tr>
            <th>Folio</th>
            <th>Nombre</th>
            <th>
              <template v-if="props.fieldObj.field.type === 'email'">Email</template>
              <template
                v-else-if="
                  props.fieldObj.field.type === 'phone' || props.fieldObj.field.type === 'tel' || props.fieldObj.field.type === 'telefono'
                "
                >Teléfono</template
              >
              <template v-else-if="props.fieldObj.field.type === 'url'">URL</template>
              <template v-else-if="props.fieldObj.field.type === 'textarea'">Respuesta</template>
              <template v-else>Respuesta</template>
            </th>
            <th v-if="hasPonderacion">Ponderación</th>
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
                  <a
                    :href="`/folio/${resp.folio || resp.id}`"
                    target="_blank"
                    rel="noopener noreferrer"
                    style="color: #1976d2; text-decoration: underline; font-weight: 500"
                  >
                    {{ resp.folio || resp.id || '-' }}
                  </a>
                </div>
              </td>
              <td>
                <div class="response-value-cell">
                  <span class="font-weight-medium">{{ resp.nombre || resp.user?.name || resp.user || '-' }}</span>
                </div>
              </td>
              <td>
                <div class="response-value-cell">
                  <span v-if="props.fieldObj.field.type === 'url'" v-html="renderValue(resp, 'url')" />
                  <span v-else>{{ resp.value || '-' }}</span>
                </div>
              </td>
              <td v-if="hasPonderacion">
                <div class="response-value-cell">{{ resp.ponderacion !== undefined ? resp.ponderacion : '-' }}</div>
              </td>
              <td v-if="hasScore">
                <div class="response-value-cell">{{ getScoreObtained(resp) }}pts</div>
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
              <td
                :colspan="hasPonderacion && hasScore ? 5 : hasPonderacion || hasScore ? 4 : 3"
                style="height: 6px; padding: 0; border: none; background: transparent"
              ></td>
            </tr>
          </template>
          <tr v-if="filterResponses(props.fieldObj.responses, props.fieldSearch[props.fieldObj.field.id]).length === 0">
            <td :colspan="hasPonderacion && hasScore ? 5 : hasPonderacion || hasScore ? 4 : 3" class="text-medium-emphasis">
              No hay respuestas registradas.
            </td>
          </tr>
        </tbody>
      </v-table>

      <!-- Cards para mobile -->
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
              <div v-if="hasPonderacion" style="position: absolute; top: 36px; right: 16px; font-size: 0.85rem; font-weight: 500">
                Ponderación: {{ resp.ponderacion !== undefined ? resp.ponderacion : '-' }}
              </div>
              <div class="d-flex flex-column mb-1" style="gap: 8px">
                <a
                  :href="`/folio/${resp.folio || resp.id}`"
                  target="_blank"
                  rel="noopener noreferrer"
                  style="color: #1976d2; text-decoration: underline; font-weight: 500; min-width: 60px; font-size: 0.95rem"
                >
                  {{ resp.folio || resp.id || '-' }}
                </a>
                <span class="font-weight-medium" style="color: #333; font-size: 0.95rem">
                  {{ resp.nombre || resp.user?.name || resp.user || '-' }}
                </span>
                <span style="font-size: 0.95rem">
                  <template v-if="props.fieldObj.field.type === 'email'"><strong>Email:</strong> {{ resp.value || '-' }}</template>
                  <template
                    v-else-if="
                      props.fieldObj.field.type === 'phone' ||
                      props.fieldObj.field.type === 'tel' ||
                      props.fieldObj.field.type === 'telefono'
                    "
                    ><strong>Teléfono:</strong> {{ resp.value || '-' }}</template
                  >
                  <template v-else-if="props.fieldObj.field.type === 'url'">
                    <strong>URL:</strong>
                    <span v-html="renderValue(resp, 'url')" />
                  </template>
                  <template v-else-if="props.fieldObj.field.type === 'textarea'"
                    ><strong>Respuesta:</strong> {{ resp.value || '-' }}</template
                  >
                  <template v-else><strong>Respuesta:</strong> {{ resp.value || '-' }}</template>
                </span>
              </div>
            </v-card>
          </v-col>
          <v-col v-if="filterResponses(props.fieldObj.responses, props.fieldSearch[props.fieldObj.field.id]).length === 0" cols="12">
            <v-card class="response-card pa-3 text-medium-emphasis mb-4 rounded-lg elevation-1"> No hay respuestas registradas. </v-card>
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
