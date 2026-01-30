<script setup>
import { computed } from 'vue';
import CalendarHeatmap from '@/components/shared/CalendarHeatmap.vue';

const props = defineProps({
  fieldObj: { type: Object, required: true },
  fieldSearch: { type: Object, required: true },
  pageByField: { type: Object, required: true },
  setPage: { type: Function, required: true },

  // Calendario (inyectados desde el padre)
  selectedImageCalendarDay: { type: Object, required: true },
  onImageCalendarDayClick: { type: Function, required: true },
  getImageRecordsForDay: { type: Function, required: true },
  getImageHeatmapData: { type: Function, required: true },
  getCalendarMonthStart: { type: Function, required: true },
  setCalendarMonthStart: { type: Function, required: true },
  getMinDateForField: { type: Function, required: true },
  getMaxDateForField: { type: Function, required: true }
});

const pageSize = 10;

function toNum(x) {
  if (typeof x === 'number') return x;
  if (typeof x === 'string' && x.trim() !== '' && !isNaN(+x)) return +x;
  return undefined;
}

const isImageOrDocument = computed(() => {
  const t = (props.fieldObj?.field?.type || '').toString().toLowerCase();
  return ['image', 'imagenes', 'document', 'documento'].includes(t);
});

const hasScore = computed(() => {
  const field = props.fieldObj.field || {};
  if (field.has_rating === true) return true;

  const t = (field.type || '').toString().toLowerCase();
  if (['rating', 'score'].includes(t)) return true;

  if (Array.isArray(props.fieldObj.responses)) {
    return props.fieldObj.responses.some((r) => toNum(r?.score) !== undefined);
  }
  return false;
});

function getScoreObtained(resp) {
  const n = toNum(resp?.score);
  const score = n !== undefined ? n : 0;
  return `${score} pts`;
}

function filterRecords(records, search) {
  const s = (search || '').toString().toLowerCase();
  if (!s) return records;
  return records.filter(
    (r) =>
      (r.folio && r.folio.toString().toLowerCase().includes(s)) ||
      (r.id && r.id.toString().toLowerCase().includes(s)) ||
      (r.user && typeof r.user === 'object' && r.user.name && r.user.name.toString().toLowerCase().includes(s)) ||
      (r.user && typeof r.user === 'string' && r.user.toLowerCase().includes(s))
  );
}

function getPaginatedRecords(records, page) {
  const p = page || 1;
  const start = (p - 1) * pageSize;
  return records.slice(start, start + pageSize);
}

function getImagesCount(val) {
  if (Array.isArray(val)) return val.length;
  if (typeof val === 'string' && val.trim().startsWith('[')) {
    try {
      return JSON.parse(val).length;
    } catch {
      return 0;
    }
  }
  return val ? 1 : 0;
}

const selectedDay = computed(() => props.selectedImageCalendarDay[props.fieldObj.field.id] || null);

const allRecordsForDay = computed(() => {
  if (!selectedDay.value) return [];
  return props.getImageRecordsForDay(props.fieldObj.field.id, selectedDay.value) || [];
});

const filteredRecords = computed(() => filterRecords(allRecordsForDay.value, props.fieldSearch[props.fieldObj.field.id]));

const paginatedRecords = computed(() => getPaginatedRecords(filteredRecords.value, props.pageByField[props.fieldObj.field.id]));

// Siempre toma el form_id del fieldObj si no viene en resp, y si sigue vacío, lo infiere del primer registro disponible.
// Si sigue vacío, fuerza un valor por defecto para evitar errores de navegación.
function getDetailLink(resp) {
  let formId = resp.form_id || resp.formId || resp.form || props.fieldObj.form_id || props.fieldObj.formId || '';

  if (!formId && allRecordsForDay.value.length > 0) {
    formId = allRecordsForDay.value[0].form_id || allRecordsForDay.value[0].formId || allRecordsForDay.value[0].form || '';
  }

  if (!formId) formId = '1'; // Valor por defecto para evitar errores

  const reportId = resp.report_id || resp.reportId || resp.report || resp.folio || resp.id || '';
  const fieldResponseId = resp.field_response_id || resp.fieldResponseId || resp.id || '';

  const count = getImagesCount(resp?.value);
  if (formId && reportId && fieldResponseId && Number(count) > 0) {
    return {
      name: 'Report Answer Details',
      params: { formId, reportId, fieldId: fieldResponseId }
    };
  }
  return undefined; // Nunca retornar null
}

function getReportShowLink(resp) {
  let formId = resp.form_id || resp.formId || props.fieldObj.form_id || props.fieldObj.formId;
  if (!formId && allRecordsForDay.value.length > 0) {
    formId = allRecordsForDay.value[0].form_id || allRecordsForDay.value[0].formId || allRecordsForDay.value[0].form || '';
  }
  if (!formId) formId = '1'; // Valor por defecto para evitar errores
  const reportId = resp.report_id || resp.reportId || resp.folio || resp.id;
  if (formId && reportId) {
    return {
      name: 'Report Answer Show',
      params: { formId, reportId }
    };
  }
  return undefined;
}
</script>

<template>
  <div>
    <!-- Calendario -->
    <div class="calendar-row">
      <div v-if="props.fieldObj.responses && props.fieldObj.responses.length" class="calendar-heatmap-center calendar-heatmap-lg">
        <CalendarHeatmap
          :data="props.getImageHeatmapData(props.fieldObj.field.id)"
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
          @dayClick="(date) => props.onImageCalendarDayClick(props.fieldObj.field.id, date)"
        />
      </div>
      <div v-else class="text-medium-emphasis py-4">No hay datos suficientes para mostrar el calendario.</div>
    </div>

    <!-- Search + tabla/cards únicamente si hay día seleccionado y registros -->
    <div v-if="selectedDay && allRecordsForDay.length > 0" class="search-table-container" style="margin-top: 24px">
      <v-text-field
        v-model="props.fieldSearch[props.fieldObj.field.id]"
        :placeholder="`Buscar por folio o usuario...`"
        clearable
        class="custom-search"
        density="compact"
        variant="outlined"
        color="primary"
        hide-details
        style="width: 100%; min-width: 0; padding-bottom: 12px"
        prepend-inner-icon="mdi-magnify"
      />

      <!-- Tabla (desktop) -->
      <v-table density="compact" style="width: 100%" class="records-table d-none d-md-table">
        <thead>
          <tr>
            <th>Folio</th>
            <th>Nombre</th>
            <th>
              {{
                props.fieldObj.field.type === 'image' || props.fieldObj.field.type === 'imagenes'
                  ? 'Imágenes'
                  : props.fieldObj.field.type === 'document' || props.fieldObj.field.type === 'documento'
                    ? 'Documentos'
                    : 'Firmas'
              }}
            </th>
            <th v-if="hasScore">Score obtenido</th>
          </tr>
        </thead>

        <tbody>
          <template v-for="(resp, i) in paginatedRecords" :key="i">
            <tr class="response-row">
              <!-- Folio -->
              <td>
                <div class="response-value-cell">
                  <router-link
                    v-if="getReportShowLink(resp)"
                    :to="getReportShowLink(resp)"
                    style="color: #1976d2; text-decoration: underline; font-weight: 500"
                  >
                    {{ resp.folio || resp.id || '-' }}
                  </router-link>
                  <span v-else>
                    {{ resp.folio || resp.id || '-' }}
                  </span>
                </div>
              </td>

              <!-- Nombre -->
              <td>
                <div class="response-value-cell">
                  <span class="font-weight-medium">{{ resp.user?.name || resp.user || '-' }}</span>
                </div>
              </td>

              <!-- Count con link -->
              <td>
                <div class="response-value-cell">
                  <router-link
                    v-if="getDetailLink(resp)"
                    :to="getDetailLink(resp)"
                    style="color: #1976d2; text-decoration: underline; font-weight: 500"
                  >
                    {{ getImagesCount(resp.value) }}
                  </router-link>
                  <span v-else>
                    {{ getImagesCount(resp.value) }}
                  </span>
                </div>
              </td>

              <!-- Score -->
              <td v-if="hasScore">
                <div class="response-value-cell">
                  {{ getScoreObtained(resp) }}
                </div>
              </td>
            </tr>
          </template>

          <tr v-if="filteredRecords.length === 0">
            <td :colspan="hasScore ? 4 : 3" class="text-medium-emphasis">No hay registros para este día.</td>
          </tr>
        </tbody>
      </v-table>

      <!-- Cards (mobile) -->
      <div class="records-cards d-md-none">
        <v-row>
          <v-col v-for="(resp, i) in paginatedRecords" :key="i" cols="12">
            <v-card class="mb-4 pa-3 elevation-1 rounded-lg response-card" style="cursor: default; position: relative">
              <div v-if="hasScore" style="position: absolute; top: 12px; right: 16px; font-size: 0.85rem; font-weight: 500">
                {{ getScoreObtained(resp) }}
              </div>

              <div class="d-flex flex-column mb-1" style="gap: 8px">
                <router-link
                  v-if="getReportShowLink(resp)"
                  :to="getReportShowLink(resp)"
                  style="color: #1976d2; text-decoration: underline; font-weight: 500; min-width: 60px; font-size: 0.95rem"
                >
                  {{ resp.folio || resp.id || '-' }}
                </router-link>
                <span v-else style="color: #1976d2; text-decoration: underline; font-weight: 500; min-width: 60px; font-size: 0.95rem">
                  {{ resp.folio || resp.id || '-' }}
                </span>

                <span class="font-weight-medium" style="color: #333; font-size: 0.95rem">
                  {{ resp.user?.name || resp.user || '-' }}
                </span>

                <span style="font-size: 0.95rem">
                  <strong>
                    {{
                      props.fieldObj.field.type === 'image' || props.fieldObj.field.type === 'imagenes'
                        ? 'Imágenes:'
                        : props.fieldObj.field.type === 'document' || props.fieldObj.field.type === 'documento'
                          ? 'Documentos:'
                          : 'Firmas:'
                    }}
                  </strong>
                  <router-link
                    v-if="getDetailLink(resp)"
                    :to="getDetailLink(resp)"
                    style="color: #1976d2; text-decoration: underline; font-weight: 500"
                  >
                    {{ getImagesCount(resp.value) }}
                  </router-link>
                  <span v-else>
                    {{ getImagesCount(resp.value) }}
                  </span>
                </span>
              </div>
            </v-card>
          </v-col>

          <v-col v-if="filteredRecords.length === 0" cols="12">
            <v-card class="response-card pa-3 text-medium-emphasis mb-4 rounded-lg elevation-1"> No hay registros para este día. </v-card>
          </v-col>
        </v-row>
      </div>

      <!-- Paginación -->
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
  </div>
</template>

<style scoped src="@/styles/report_field_charts.css"></style>
