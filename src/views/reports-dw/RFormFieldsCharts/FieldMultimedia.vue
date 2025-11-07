<script setup>
import CalendarHeatmap from '@/components/shared/CalendarHeatmap.vue';

defineProps({
  fieldObj: { type: Object, required: true },
  fieldSearch: { type: Object, required: true },
  pageByField: { type: Object, required: true },
  setPage: { type: Function, required: true },
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
</script>

<template>
  <div>
    <div class="mb-2 d-flex align-center justify-space-between">
      <div class="text-h6 font-weight-bold">
        {{
          fieldObj.field.type === 'image' || fieldObj.field.type === 'imagenes'
            ? 'Imágenes por fecha'
            : fieldObj.field.type === 'document' || fieldObj.field.type === 'documento'
              ? 'Documentos por fecha'
              : 'Firmas por fecha'
        }}
      </div>
    </div>

    <div v-if="fieldObj.responses.length" class="calendar-heatmap-center calendar-heatmap-lg">
      <CalendarHeatmap
        :data="getImageHeatmapData(fieldObj.field.id)"
        :month-start="getCalendarMonthStart(fieldObj.field.id)"
        :months="1"
        density="tiny"
        :scale="0.92"
        :minColumnWidthPx="220"
        :maxWidthPx="420"
        :allowNavigate="true"
        :minDate="getMinDateForField(fieldObj.field.id)"
        :maxDate="getMaxDateForField(fieldObj.field.id)"
        showHeader
        showLegend
        @update:monthStart="(date) => setCalendarMonthStart(fieldObj.field.id, date)"
        @dayClick="(date) => onImageCalendarDayClick(fieldObj.field.id, date)"
      />
    </div>
    <div v-else class="text-medium-emphasis py-4">No hay datos suficientes para mostrar el calendario.</div>

    <!-- Registros del día seleccionado con searchbar y paginación, sin visualización de archivos -->
    <div v-if="selectedImageCalendarDay[fieldObj.field.id]">
      <div class="search-table-container">
        <v-text-field
          v-model="fieldSearch[fieldObj.field.id]"
          :placeholder="`Buscar folio o usuario...`"
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
              <th>
                {{
                  fieldObj.field.type === 'image' || fieldObj.field.type === 'imagenes'
                    ? 'Imágenes'
                    : fieldObj.field.type === 'document' || fieldObj.field.type === 'documento'
                      ? 'Documentos'
                      : 'Firmas'
                }}
              </th>
            </tr>
          </thead>
          <tbody>
            <template
              v-for="(resp, i) in getImageRecordsForDay(fieldObj.field.id, selectedImageCalendarDay[fieldObj.field.id])
                .filter((r) => {
                  const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                  return (
                    !search ||
                    (r.folio && r.folio.toString().toLowerCase().includes(search)) ||
                    (r.user && r.user.toString().toLowerCase().includes(search))
                  );
                })
                .slice((pageByField[fieldObj.field.id] - 1) * pageSize, (pageByField[fieldObj.field.id] || 1) * pageSize)"
              :key="i"
            >
              <tr class="response-row record-row">
                <td class="response-value-cell">
                  <span class="folio-link" style="color: #1976d2; text-decoration: underline; font-weight: 500">
                    {{ resp.folio || resp.id || '-' }}
                  </span>
                </td>
                <td class="response-value-cell">
                  <span class="font-weight-medium">{{ resp.user?.name || '-' }}</span>
                </td>
                <td class="response-value-cell">
                  {{
                    Array.isArray(resp.value)
                      ? resp.value.length
                      : typeof resp.value === 'string' && resp.value.startsWith('[')
                        ? JSON.parse(resp.value).length
                        : resp.value
                          ? 1
                          : 0
                  }}
                </td>
              </tr>
            </template>
            <tr
              v-if="
                getImageRecordsForDay(fieldObj.field.id, selectedImageCalendarDay[fieldObj.field.id]).filter((r) => {
                  const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                  return (
                    !search ||
                    (r.folio && r.folio.toString().toLowerCase().includes(search)) ||
                    (r.user && r.user.toString().toLowerCase().includes(search))
                  );
                }).length === 0
              "
            >
              <td colspan="3" class="text-medium-emphasis">No hay registros para este día.</td>
            </tr>
          </tbody>
        </v-table>

        <!-- Cards en móvil/tablet, sin visualización de archivos -->
        <div class="image-records-cards d-md-none">
          <v-row>
            <v-col
              v-for="(resp, i) in getImageRecordsForDay(fieldObj.field.id, selectedImageCalendarDay[fieldObj.field.id])
                .filter((r) => {
                  const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                  return (
                    !search ||
                    (r.folio && r.folio.toString().toLowerCase().includes(search)) ||
                    (r.user && r.user.toString().toLowerCase().includes(search))
                  );
                })
                .slice((pageByField[fieldObj.field.id] - 1) * pageSize, (pageByField[fieldObj.field.id] || 1) * pageSize)"
              :key="i"
              cols="12"
            >
              <v-card class="mb-4 pa-3 elevation-1 rounded-lg response-card" style="cursor: default">
                <div class="d-flex flex-column mb-1" style="gap: 8px">
                  <span
                    class="folio-link text-caption"
                    style="color: #1976d2; text-decoration: underline; font-weight: 500; min-width: 60px"
                  >
                    {{ resp.folio || resp.id || '-' }}
                  </span>
                  <span class="font-weight-medium" style="color: #333; font-size: 1.08rem">
                    {{ resp.user?.name || '-' }}
                  </span>
                  <span style="font-size: 1.08rem; color: #1976d2">
                    <strong>
                      {{
                        fieldObj.field.type === 'image' || fieldObj.field.type === 'imagenes'
                          ? 'Imágenes:'
                          : fieldObj.field.type === 'document' || fieldObj.field.type === 'documento'
                            ? 'Documentos:'
                            : 'Firmas:'
                      }}
                    </strong>
                    {{
                      Array.isArray(resp.value)
                        ? resp.value.length
                        : typeof resp.value === 'string' && resp.value.startsWith('[')
                          ? JSON.parse(resp.value).length
                          : resp.value
                            ? 1
                            : 0
                    }}
                  </span>
                </div>
              </v-card>
            </v-col>
            <v-col
              v-if="
                getImageRecordsForDay(fieldObj.field.id, selectedImageCalendarDay[fieldObj.field.id]).filter((r) => {
                  const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                  return (
                    !search ||
                    (r.folio && r.folio.toString().toLowerCase().includes(search)) ||
                    (r.user && r.user.toString().toLowerCase().includes(search))
                  );
                }).length === 0
              "
              cols="12"
            >
              <v-card class="response-card pa-3 text-medium-emphasis mb-4 rounded-lg elevation-1"> No hay registros para este día. </v-card>
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
                  getImageRecordsForDay(fieldObj.field.id, selectedImageCalendarDay[fieldObj.field.id]).filter((r) => {
                    const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                    return (
                      !search ||
                      (r.folio && r.folio.toString().toLowerCase().includes(search)) ||
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
  </div>
</template>
