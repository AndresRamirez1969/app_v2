<script setup>
import CalendarHeatmap from '@/components/shared/CalendarHeatmap.vue';

defineProps({
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
</script>

<template>
  <div>
    <div class="mb-2 d-flex align-center justify-space-between">
      <div class="text-h6 font-weight-bold">Respuestas por fecha (Calendario)</div>
    </div>

    <div v-if="fieldObj.responses.length" class="calendar-heatmap-center calendar-heatmap-lg">
      <CalendarHeatmap
        :data="getDateHeatmapData(fieldObj.field.id)"
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
      />
    </div>
    <div v-else class="text-medium-emphasis py-4">No hay datos suficientes para mostrar el calendario.</div>

    <!-- Searchbar y tabla de registros debajo del calendario -->
    <div class="search-table-container mt-6">
      <v-text-field
        v-model="fieldSearch[fieldObj.field.id]"
        :placeholder="`Buscar fecha o usuario...`"
        prepend-inner-icon="mdi-magnify"
        clearable
        class="custom-search"
        density="compact"
        variant="outlined"
        color="primary"
        hide-details
        style="width: 100%; min-width: 0; padding-bottom: 12px"
      />
      <v-table density="compact" style="width: 100%">
        <tbody>
          <tr
            v-for="(resp, i) in fieldObj.responses
              .filter((r) => {
                const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                return (
                  !search ||
                  (r.value && r.value.toString().toLowerCase().includes(search)) ||
                  (r.user && r.user.toString().toLowerCase().includes(search))
                );
              })
              .slice((pageByField[fieldObj.field.id] - 1) * pageSize, (pageByField[fieldObj.field.id] || 1) * pageSize)"
            :key="i"
            class="response-row"
          >
            <td>
              <div class="response-value-cell">
                <span>{{ resp.value }}</span>
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
            <td class="text-medium-emphasis">No hay registros de fechas.</td>
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
