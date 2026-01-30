<script setup>
import { computed, watch } from 'vue';
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
  getMaxDateForField: { type: Function, required: true },
  // NUEVOS props para manejo de día seleccionado
  selectedDateCalendarDay: { type: Object, required: true },
  onDateCalendarDayClick: { type: Function, required: true },
  getDateRecordsForDay: { type: Function, required: true }
});

const pageSize = 10;

/* ====== SCORE ====== */
const hasScore = computed(() => {
  const f = props.fieldObj.field || {};
  if (f.has_rating === true) return true;
  if (['rating', 'score'].includes(f.type)) return true;
  if (Number(f.weight ?? 0) > 0) return true;
  if (
    Array.isArray(props.fieldObj.responses) &&
    props.fieldObj.responses.some((r) => r.score !== undefined || r.score_obtained !== undefined || r.weight !== undefined)
  )
    return true;
  return false;
});

function isAnswered(resp) {
  const v = resp?.value;
  return v !== undefined && v !== null && String(v).trim() !== '';
}

function getScoreObtained(resp) {
  if (resp.score !== undefined && resp.score !== null) {
    return `${Number(resp.score)} pts`;
  }
  if (resp.score_obtained !== undefined && resp.score_obtained !== null) {
    return `${Number(resp.score_obtained)} pts`;
  }
  const answered = isAnswered(resp);
  const weight = Number(resp.weight ?? props.fieldObj.field?.weight ?? 0);
  return `${answered ? (Number.isFinite(weight) ? weight : 0) : 0} pts`;
}

function formatDateValue(val) {
  if (!val) return '-';
  // Si es formato YYYY-MM-DD o YYYY-MM-DDTHH:mm:ss
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(val);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  return val;
}

function filterRecords(records, search) {
  const s = (search || '').toString().toLowerCase();
  if (!s) return records;
  return records.filter((r) => {
    const value = (r.value ?? '').toString().toLowerCase();
    const user = (r.user?.name || r.user || '').toString().toLowerCase();
    const folio = (r.folio || r.id || '').toString().toLowerCase();
    return value.includes(s) || user.includes(s) || folio.includes(s);
  });
}

function getPaginatedRecords(records, page) {
  const p = Number(page || 1);
  const start = (p - 1) * pageSize;
  return records.slice(start, start + pageSize);
}

function capitalizeMonthTooltip(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getReportShowLink(resp) {
  const formId = resp.form_id || resp.formId || props.fieldObj.form_id || props.fieldObj.formId;
  const reportId = resp.report_id || resp.reportId || resp.folio || resp.id;
  if (formId && reportId) {
    return {
      name: 'Report Answer Show',
      params: { formId, reportId }
    };
  }
  return null;
}

/* ========== Día seleccionado en el calendario (usando prop) ========== */
const fieldId = computed(() => props.fieldObj?.field?.id);
const selectedDay = computed(() => (fieldId.value ? props.selectedDateCalendarDay?.[fieldId.value] : null) || null);

const allRecordsForDay = computed(() => {
  if (!fieldId.value || !selectedDay.value) return [];
  return props.getDateRecordsForDay(fieldId.value, selectedDay.value) || [];
});

const filteredRecords = computed(() => {
  const search = fieldId.value ? props.fieldSearch?.[fieldId.value] : '';
  return filterRecords(allRecordsForDay.value, search);
});

const currentPage = computed(() => {
  if (!fieldId.value) return 1;
  const p = props.pageByField?.[fieldId.value];
  return Number(p || 1);
});

const paginatedRecords = computed(() => {
  return getPaginatedRecords(filteredRecords.value, currentPage.value);
});

/* =========================================================
   INTEGRACIÓN: reset de paginación cuando cambia el día
   o cambia el search (para evitar páginas vacías)
   ========================================================= */
watch(
  () => [fieldId.value, selectedDay.value],
  () => {
    if (!fieldId.value) return;
    props.setPage(fieldId.value, 1);
  }
);

watch(
  () => (fieldId.value ? props.fieldSearch?.[fieldId.value] : ''),
  () => {
    if (!fieldId.value) return;
    props.setPage(fieldId.value, 1);
  }
);
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
        @dayClick="(date) => props.onDateCalendarDayClick(props.fieldObj.field.id, date)"
      />
    </div>
    <div v-else class="text-medium-emphasis py-4">No hay datos suficientes para mostrar el calendario.</div>

    <!-- Search + tabla/cards únicamente si hay día seleccionado y registros -->
    <div v-if="selectedDay && allRecordsForDay.length > 0" class="search-table-container mt-6">
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
          <template v-for="(resp, i) in paginatedRecords" :key="i">
            <tr class="response-row">
              <td>
                <div class="response-value-cell">
                  <router-link
                    v-if="getReportShowLink(resp)"
                    :to="getReportShowLink(resp)"
                    style="color: #1976d2; text-decoration: underline; font-weight: 500"
                  >
                    {{ resp.folio || resp.id || '-' }}
                  </router-link>
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
            <tr v-if="i < paginatedRecords.length - 1">
              <td :colspan="hasScore ? 4 : 3" style="height: 6px; padding: 0; border: none; background: transparent"></td>
            </tr>
          </template>
          <tr v-if="filteredRecords.length === 0">
            <td :colspan="hasScore ? 4 : 3" class="text-medium-emphasis">No hay registros de fechas.</td>
          </tr>
        </tbody>
      </v-table>

      <!-- Cards para mobile/tablet -->
      <div class="records-cards d-md-none">
        <v-row>
          <v-col v-for="(resp, i) in paginatedRecords" :key="i" cols="12">
            <v-card class="mb-4 pa-3 elevation-1 rounded-lg response-card" style="cursor: default; position: relative">
              <div v-if="hasScore" style="position: absolute; top: 12px; right: 16px; font-size: 0.85rem; font-weight: 500">
                {{ getScoreObtained(resp) }}
              </div>
              <div class="d-flex flex-column mb-1" style="gap: 8px">
                <span style="font-size: 0.95rem">
                  <router-link
                    v-if="getReportShowLink(resp)"
                    :to="getReportShowLink(resp)"
                    style="color: #1976d2; text-decoration: underline; font-weight: 500"
                  >
                    {{ resp.folio || resp.id || '-' }}
                  </router-link>
                  <span v-else style="color: #1976d2; font-weight: 500">-</span>
                </span>
                <span class="font-weight-medium" style="color: #333; font-size: 0.95rem">
                  <strong>Usuario:</strong> {{ resp.user?.name || resp.user || '-' }}
                </span>
                <span style="font-size: 0.95rem"><strong>Valor:</strong> {{ formatDateValue(resp.value) }}</span>
              </div>
            </v-card>
          </v-col>
          <v-col v-if="filteredRecords.length === 0" cols="12">
            <v-card class="response-card pa-3 text-medium-emphasis mb-4 rounded-lg elevation-1"> No hay registros de fechas. </v-card>
          </v-col>
        </v-row>
      </div>

      <div class="d-flex flex-column align-center mt-2">
        <v-pagination
          :model-value="props.pageByField[props.fieldObj.field.id]"
          :length="Math.max(1, Math.ceil(filteredRecords.length / pageSize))"
          :total-visible="1"
          color="primary"
          @update:modelValue="props.setPage(props.fieldObj.field.id, $event)"
          class="mobile-pagination"
        />
      </div>
    </div>

    <!-- Mensaje cuando sí hay día seleccionado pero ese día no tiene registros -->
    <div v-else-if="selectedDay && allRecordsForDay.length === 0" class="text-medium-emphasis py-4">
      No hay registros para el día seleccionado.
    </div>
  </div>
</template>

<style scoped src="@/styles/report_field_charts.css"></style>
