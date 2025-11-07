<script setup>
import { defineAsyncComponent } from 'vue';
defineProps({
  fieldObj: { type: Object, required: true },
  fieldSearch: { type: Object, required: true },
  pageByField: { type: Object, required: true },
  setPage: { type: Function, required: true }
});

const VueApexCharts = defineAsyncComponent(() => import('vue3-apexcharts').then((m) => m.default || m).catch(() => null));
const pageSize = 10;

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
        :options="getSelectorTopNBarOptions(fieldObj, 8)"
        :series="getSelectorTopNSeries(fieldObj, 8)"
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
              }),
              pageByField
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
