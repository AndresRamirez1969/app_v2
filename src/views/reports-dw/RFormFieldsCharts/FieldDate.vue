<script setup>
import { computed } from 'vue';
import CalendarHeatmap from '@/components/shared/CalendarHeatmap.vue';

const props = defineProps({
  fieldObj: { type: Object, required: true },
  fieldSearch: { type: Object, required: true },
  pageByField: { type: Object, required: true },
  setPage: { type: Function, required: true },
  getDateHeatmapData: { type: Function, required: true },
  getCalendarMonthStart: { type: Function, required: true },
  setCalendarMonthStart: { type: Function, required: true },
  getMinDateForField: { type: Function, required: true },
  getMaxDateForField: { type: Function, required: true }
});

const pageSize = 10;

/* ====== SCORE ====== */
/** ¿Mostrar columna de score? */
const hasScore = computed(() => {
  const f = props.fieldObj.field || {};
  if (f.has_rating === true) return true;
  if (['rating', 'score'].includes(f.type)) return true;
  if (Number(f.weight ?? 0) > 0) return true; // <- NUEVO: si el campo tiene ponderación
  if (
    Array.isArray(props.fieldObj.responses) &&
    props.fieldObj.responses.some((r) => r.score !== undefined || r.score_obtained !== undefined || r.weight !== undefined)
  )
    return true;
  return false;
});

/** ¿La respuesta cuenta como “respondida”? (considera '0' como válido) */
function isAnswered(resp) {
  const v = resp?.value;
  return v !== undefined && v !== null && String(v).trim() !== '';
}

/** Devuelve el puntaje a mostrar: usa backend si viene; si no, calcula con weight local/fallback */
function getScoreObtained(resp) {
  if (resp.score !== undefined && resp.score !== null) {
    return `${Number(resp.score)} pts`;
  }
  if (resp.score_obtained !== undefined && resp.score_obtained !== null) {
    return `${Number(resp.score_obtained)} pts`;
  }
  // Fallback local
  const answered = isAnswered(resp);
  const weight = Number(resp.weight ?? props.fieldObj.field?.weight ?? 0);
  return `${answered ? (Number.isFinite(weight) ? weight : 0) : 0} pts`;
}

/* ====== FORMATO DE FECHA ====== */
function formatDateValue(val) {
  if (!val) return '-';
  const d = new Date(val);
  if (isNaN(d)) return val;
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
}

/* ====== LISTADO / BUSCADOR ====== */
function getPaginatedResponses(fieldId, responses, pageByField) {
  const page = pageByField[fieldId] || 1;
  const start = (page - 1) * pageSize;
  return responses.slice(start, start + pageSize);
}

function filterResponses(responses, search) {
  const s = (search || '').toString().toLowerCase();
  if (!s) return responses;
  return responses.filter((r) => {
    const value = (r.value ?? '').toString().toLowerCase();
    const user = (r.user?.name || r.user || '').toString().toLowerCase();
    const folio = (r.folio || '').toString().toLowerCase();
    return value.includes(s) || user.includes(s) || folio.includes(s);
  });
}

/* ====== CALENDARIO ====== */
/** Capitaliza la primera letra del mes para el tooltip del calendario */
function capitalizeMonthTooltip(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
</script>

<template>
  <div>
    <div v-if="props.fieldObj.responses.length" class="calendar-heatmap-center calendar-heatmap-lg">
      <CalendarHeatmap
        :data="props.getDateHeatmapData(props.fieldObj.field.id)"
        :month-start="props.getCalendarMonthStart(props.fieldObj.field.id)"
        :months="1"
        density="tiny"
        :scale="0.92"
        :minColumnWidthPx="220"
        :maxWidthPx="420"
        :allowNavigate="true"
        :minDate="props.getMinDateForField(props.fieldObj.field.id)"
        :maxDate="props.getMaxDateForField(props.fieldObj.field.id)"
        showHeader
        showLegend
        @update:monthStart="(date) => props.setCalendarMonthStart(props.fieldObj.field.id, date)"
        :tooltip-formatter="capitalizeMonthTooltip"
      />
    </div>
    <div v-else class="text-medium-emphasis py-4">No hay datos suficientes para mostrar el calendario.</div>

    <div class="search-table-container mt-6">
      <v-text-field
        v-model="props.fieldSearch[props.fieldObj.field.id]"
        :placeholder="`Buscar fecha, usuario o folio...`"
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
            <th>Usuario</th>
            <th>Valor</th>
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
                    v-if="resp.folio"
                    :href="`/folio/${resp.folio}`"
                    target="_blank"
                    style="color: #1976d2; text-decoration: underline; font-weight: 500"
                  >
                    {{ resp.folio }}
                  </a>
                  <span v-else style="color: #1976d2; font-weight: 500">-</span>
                </div>
              </td>
              <td>
                <div class="response-value-cell">
                  <span class="font-weight-medium">{{ resp.user?.name || resp.user || '-' }}</span>
                </div>
              </td>
              <td>
                <div class="response-value-cell">
                  <span>{{ formatDateValue(resp.value) }}</span>
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
            <td :colspan="hasScore ? 4 : 3" class="text-medium-emphasis">No hay registros de fechas.</td>
          </tr>
        </tbody>
      </v-table>

      <!-- Cards para mobile/tablet -->
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
                <span style="font-size: 0.95rem">
                  <a
                    v-if="resp.folio"
                    :href="`/folio/${resp.folio}`"
                    target="_blank"
                    style="color: #1976d2; text-decoration: underline; font-weight: 500"
                  >
                    {{ resp.folio }}
                  </a>
                  <span v-else style="color: #1976d2; font-weight: 500">-</span>
                </span>
                <span class="font-weight-medium" style="color: #333; font-size: 0.95rem">
                  <strong>Usuario:</strong> {{ resp.user?.name || resp.user || '-' }}
                </span>
                <span style="font-size: 0.95rem"><strong>Valor:</strong> {{ formatDateValue(resp.value) }}</span>
              </div>
            </v-card>
          </v-col>
          <v-col v-if="filterResponses(props.fieldObj.responses, props.fieldSearch[props.fieldObj.field.id]).length === 0" cols="12">
            <v-card class="response-card pa-3 text-medium-emphasis mb-4 rounded-lg elevation-1"> No hay registros de fechas. </v-card>
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
.calendar-heatmap-center {
  width: 100%;
  display: flex;
  justify-content: center;
  padding-bottom: 8px;
  overflow: visible;
}
.calendar-heatmap-lg :deep(.nav-select) {
  min-width: 320px !important;
  max-width: 100% !important;
  width: auto !important;
  white-space: nowrap !important;
  font-size: 16px !important;
  box-sizing: border-box !important;
}
.calendar-heatmap-lg :deep(.calendar-monthly) {
  width: max-content !important;
  max-width: 620px !important;
}
.calendar-heatmap-lg :deep(.calendar-monthly-outer) {
  transform-origin: top center !important;
  overflow: visible !important;
}
@media (max-width: 960px) {
  .calendar-heatmap-lg :deep(.nav-select) {
    min-width: 220px !important;
    font-size: 15px !important;
  }
  .calendar-heatmap-lg :deep(.calendar-monthly) {
    max-width: 420px !important;
  }
}
@media (max-width: 600px) {
  .calendar-heatmap-lg :deep(.nav-select) {
    min-width: 180px !important;
    font-size: 14px !important;
  }
  .calendar-heatmap-lg :deep(.calendar-monthly) {
    max-width: 320px !important;
  }
}
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
