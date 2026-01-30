<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
  fieldObj: { type: Object, required: true },
  fieldSearch: { type: Object, required: false, default: () => ({}) },
  pageByField: { type: Object, required: false, default: () => ({}) },
  setPage: { type: Function, required: false, default: () => {} }
});

const pad2 = (n) => String(n).padStart(2, '0');

const minutes = Array.from({ length: 60 }, (_, i) => i);
const hoursDesc = Array.from({ length: 24 }, (_, i) => 23 - i);

function toHHmm(v) {
  if (typeof v !== 'string') return null;
  const m = v.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const mm = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  return `${pad2(h)}:${pad2(mm)}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d)) return '-';
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

const countsMap = computed(() => {
  const map = Object.create(null);
  for (const r of Array.isArray(props.fieldObj.responses) ? props.fieldObj.responses : []) {
    const k = toHHmm(r?.value);
    if (!k) continue;
    map[k] = (map[k] || 0) + 1;
  }
  return map;
});

const maxCount = computed(() => {
  const vals = Object.values(countsMap.value);
  return vals.length ? Math.max(...vals) : 0;
});

function getCount(h, m) {
  return countsMap.value[`${pad2(h)}:${pad2(m)}`] || 0;
}

function intensity(c) {
  if (!c) return 'none';
  if (maxCount.value <= 1) return 'low';
  const tMed = Math.max(2, Math.round(maxCount.value * 0.33));
  const tAlt = Math.max(tMed + 1, Math.round(maxCount.value * 0.66));
  if (c >= tAlt) return 'high';
  if (c >= tMed) return 'mid';
  return 'low';
}

/* ---------------- Tooltip ---------------- */
const tooltip = ref({
  show: false,
  x: 0,
  y: 0,
  hora: '',
  respuestas: 0
});

/** Posiciona el tooltip y actualiza su contenido */
function showTooltip(e, h, m, c) {
  tooltip.value.show = true;
  tooltip.value.hora = `${pad2(h)}:${pad2(m)}`;
  tooltip.value.respuestas = c;
  updateTooltipPosition(e);
}

/** Sigue al cursor mientras estás sobre la celda */
function moveTooltip(e) {
  if (!tooltip.value.show) return;
  updateTooltipPosition(e);
}

/** Oculta tooltip */
function hideTooltip() {
  tooltip.value.show = false;
}

/** Calcula posición sin salirse de viewport */
function updateTooltipPosition(e) {
  const margin = 12; // separación respecto al cursor
  const ttW = 160; // ancho estimado del tooltip
  const ttH = 60; // alto estimado del tooltip

  let x = e.clientX;
  let y = e.clientY;

  // Evita bordes (usa coordenadas de viewport porque el tooltip es fixed)
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  x = Math.min(vw - margin, Math.max(margin, x));
  y = Math.min(vh - margin, Math.max(margin, y));

  // Colócalo sobre el cursor
  tooltip.value.x = x;
  tooltip.value.y = y;

  // Si quedaría cortado arriba, empújalo hacia abajo (se ajusta con CSS transform)
  if (y - ttH < 0) tooltip.value.y = ttH + margin;
}

/* ========== Tabla y búsqueda ========== */
const pageSize = 10;

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

function getPaginatedResponses(responses, page) {
  const p = page || 1;
  const start = (p - 1) * pageSize;
  return responses.slice(start, start + pageSize);
}

const hasScore = computed(() => {
  const f = props.fieldObj.field || {};
  const fieldDefinesPoints = [f.points, f.score, f.max_points, f.weight].some((v) => typeof v === 'number');
  const responsesHavePoints =
    Array.isArray(props.fieldObj.responses) &&
    props.fieldObj.responses.some((r) =>
      [r?.score, r?.points, r?.obtained_points, r?.value_score, r?.rating, r?.puntaje].some((v) => typeof v === 'number')
    );
  return fieldDefinesPoints || responsesHavePoints;
});

function getScoreObtained(resp) {
  const direct = [resp?.score, resp?.points, resp?.obtained_points, resp?.value_score, resp?.rating, resp?.puntaje].find(
    (v) => typeof v === 'number'
  );

  if (typeof direct === 'number') return `${direct} pts`;

  const f = props.fieldObj.field || {};
  const full = [f.score, f.points, f.max_points, f.weight].find((v) => typeof v === 'number');

  const answered = resp?.value !== null && resp?.value !== '' && typeof resp?.value !== 'undefined';

  const finalScore = answered && typeof full === 'number' ? full : 0;
  return `${finalScore} pts`;
}

function getHourMinute(resp) {
  return toHHmm(resp.value) || '-';
}
</script>

<template>
  <div class="hm-wrap">
    <!-- Heatmap solo visible en >= 768px -->
    <div class="hm-heatmap-scroll hide-on-mobile">
      <div class="hm-layout">
        <!-- Eje Y -->
        <div class="axis-y" aria-hidden="true">Hora</div>

        <!-- Horas 23 → 00 -->
        <div class="hours-col">
          <div v-for="h in hoursDesc" :key="'h' + h" class="hour-tick">{{ pad2(h) }}</div>
        </div>

        <!-- Grilla principal -->
        <div class="grid-col">
          <div class="grid-row" v-for="h in hoursDesc" :key="'r' + h">
            <div
              v-for="m in minutes"
              :key="'c' + h + '-' + m"
              class="cell"
              :class="{
                none: getCount(h, m) === 0,
                low: intensity(getCount(h, m)) === 'low',
                mid: intensity(getCount(h, m)) === 'mid',
                high: intensity(getCount(h, m)) === 'high'
              }"
              @mouseenter="showTooltip($event, h, m, getCount(h, m))"
              @mousemove="moveTooltip"
              @mouseleave="hideTooltip"
            />
          </div>
        </div>

        <!-- espacio bajo horas -->
        <div class="minutes-left" aria-hidden="true"></div>

        <!-- Minutos alineados con columnas -->
        <div class="minutes-row">
          <div v-for="m in minutes" :key="'m' + m" class="minute-tick">{{ pad2(m) }}</div>
        </div>
      </div>
    </div>

    <!-- Eje X + leyenda centrados (solo desktop) -->
    <div class="legend-x-wrap hide-on-mobile">
      <div class="axis-x">Minuto</div>
      <div class="legend">
        <span class="leg-item"><span class="swatch sw-none" /> Sin respuestas</span>
        <span class="leg-item"><span class="swatch sw-low" /> Bajo</span>
        <span class="leg-item"><span class="swatch sw-mid" /> Medio</span>
        <span class="leg-item"><span class="swatch sw-high" /> Alto</span>
      </div>
    </div>

    <!-- Tooltip blanco -->
    <div v-if="tooltip.show" class="custom-tooltip hide-on-mobile" :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }">
      <div class="tt-line"><strong>Hora:</strong> {{ tooltip.hora }}</div>
      <div class="tt-line"><strong>Respuestas:</strong> {{ tooltip.respuestas }}</div>
    </div>

    <!-- ================= TABLA Y SEARCHBAR ================ -->
    <div class="search-table-container" style="margin-top: 32px">
      <!-- Searchbar -->
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
        v-if="fieldSearch && fieldObj.field && fieldObj.field.id"
      />

      <!-- Tabla desktop -->
      <v-table density="compact" style="width: 100%" class="records-table d-none d-md-table">
        <thead>
          <tr>
            <th>Folio</th>
            <th>Nombre</th>
            <th>Fecha de respuesta</th>
            <th>Hora</th>
            <th v-if="hasScore">Score obtenido</th>
          </tr>
        </thead>
        <tbody>
          <template
            v-for="(resp, i) in getPaginatedResponses(
              filterResponses(fieldObj.responses, fieldSearch[fieldObj.field?.id]),
              pageByField[fieldObj.field?.id]
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
                        formId: resp.form_id || resp.formId || fieldObj.form_id || fieldObj.formId,
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
                <div class="response-value-cell">
                  {{ formatDate(resp.created_at || resp.fecha || resp.date) }}
                </div>
              </td>
              <td>
                <div class="response-value-cell">
                  {{ getHourMinute(resp) }}
                </div>
              </td>
              <td v-if="hasScore">
                <div class="response-value-cell">{{ getScoreObtained(resp) }}</div>
              </td>
            </tr>
          </template>
          <tr v-if="filterResponses(fieldObj.responses, fieldSearch[fieldObj.field?.id]).length === 0">
            <td :colspan="hasScore ? 5 : 4" class="text-medium-emphasis">No hay respuestas registradas.</td>
          </tr>
        </tbody>
      </v-table>

      <!-- Cards mobile -->
      <div class="records-cards d-md-none">
        <v-row>
          <v-col
            v-for="(resp, i) in getPaginatedResponses(
              filterResponses(fieldObj.responses, fieldSearch[fieldObj.field?.id]),
              pageByField[fieldObj.field?.id]
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
                      formId: resp.form_id || resp.formId || fieldObj.form_id || fieldObj.formId,
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
                <span style="font-size: 0.95rem">
                  <strong>Fecha de respuesta:</strong> {{ formatDate(resp.created_at || resp.fecha || resp.date) }}
                </span>
                <span style="font-size: 0.95rem"> <strong>Hora:</strong> {{ getHourMinute(resp) }} </span>
              </div>
            </v-card>
          </v-col>
          <v-col v-if="filterResponses(fieldObj.responses, fieldSearch[fieldObj.field?.id]).length === 0" cols="12">
            <v-card class="response-card pa-3 text-medium-emphasis mb-4 rounded-lg elevation-1"> No hay respuestas registradas. </v-card>
          </v-col>
        </v-row>
      </div>

      <div class="d-flex flex-column align-center mt-2">
        <v-pagination
          :model-value="pageByField[fieldObj.field?.id]"
          :length="Math.max(1, Math.ceil(filterResponses(fieldObj.responses, fieldSearch[fieldObj.field?.id]).length / pageSize))"
          :total-visible="1"
          color="primary"
          @update:modelValue="setPage(fieldObj.field?.id, $event)"
          class="mobile-pagination"
        />
      </div>
    </div>
  </div>
</template>

<style scoped src="@/styles/report_field_charts.css"></style>
