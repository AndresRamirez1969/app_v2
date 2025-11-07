<script setup>
const pageSize = 10;

const props = defineProps({
  fieldObj: { type: Object, required: true },
  fieldSearch: { type: Object, required: true },
  pageByField: { type: Object, required: true },
  setPage: { type: Function, required: true },
  semaforoColors: {
    type: Object,
    default: () => ({
      alto: '#e53935',
      medio: '#fbc02d',
      bajo: '#43a047'
    })
  },
  showChart: { type: Boolean, default: true },
  VueApexCharts: { type: [Object, Function], required: true },
  getSelectorTopNBarOptions: { type: Function, required: true },
  getSelectorTopNSeries: { type: Function, required: true }
});

// Detecta si el campo es semáforo (igual que en el archivo principal)
function isSemaforoField(fieldObj) {
  const t = (fieldObj?.type || fieldObj?.input_type || '').toString().toLowerCase();
  const n = (fieldObj?.name || fieldObj?.label || '').toString().toLowerCase();
  return t.includes('radio') && n.includes('semaforo');
}

// Opciones con color
const semaforoOptions = [
  { text: 'Alto', value: 'Alto', color: props.semaforoColors.alto },
  { text: 'Medio', value: 'Medio', color: props.semaforoColors.medio },
  { text: 'Bajo', value: 'Bajo', color: props.semaforoColors.bajo }
];

// Helper para color
function getSemaforoColor(value) {
  const v = (value || '').toString().toLowerCase();
  if (v === 'alto') return props.semaforoColors.alto;
  if (v === 'medio') return props.semaforoColors.medio;
  if (v === 'bajo') return props.semaforoColors.bajo;
  return '#bdbdbd';
}

// Paginación igual que antes
function getPaginatedResponses(fieldId, responses) {
  const page = props.pageByField[fieldId] || 1;
  const start = (page - 1) * pageSize;
  return responses.slice(start, start + pageSize);
}
</script>

<template>
  <div v-if="isSemaforoField(fieldObj.field)">
    <!-- Gráfica de semáforo con colores -->
    <div v-if="showChart" class="mb-4">
      <component
        :is="VueApexCharts"
        type="bar"
        height="340"
        :options="getSelectorTopNBarOptions(fieldObj.field.id, 3)"
        :series="getSelectorTopNSeries(fieldObj.field.id, 3)"
      />
    </div>
    <v-label class="mb-1">Selecciona semáforo</v-label>
    <v-select
      v-model="fieldSearch[fieldObj.field.id]"
      :items="semaforoOptions"
      item-title="text"
      item-value="value"
      hide-details
      outlined
      density="compact"
      style="max-width: 260px"
    >
      <template #item="{ item, props }">
        <v-list-item v-bind="props">
          <v-icon :color="item.color" class="mr-2">mdi-circle</v-icon>
          <span :style="{ color: item.color, fontWeight: 'bold' }">{{ item.text }}</span>
        </v-list-item>
      </template>
      <template #selection="{ item }">
        <v-icon :color="item.color" class="mr-2">mdi-circle</v-icon>
        <span :style="{ color: item.color, fontWeight: 'bold' }">{{ item.text }}</span>
      </template>
    </v-select>

    <div class="search-table-container mt-4">
      <v-table density="compact" style="width: 100%">
        <tbody>
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
              })
            )"
            :key="i"
            class="response-row"
          >
            <td>
              <div class="response-value-cell">
                <v-icon :color="getSemaforoColor(resp.value)" class="mr-2">mdi-circle</v-icon>
                <span
                  :style="{
                    color: getSemaforoColor(resp.value),
                    fontWeight: 'bold'
                  }"
                >
                  {{ resp.value }}
                </span>
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
            <td class="text-medium-emphasis">No hay registros de semáforo.</td>
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

<style scoped>
.response-row {
  background: #f5f5f5;
}
.response-value-cell {
  padding-bottom: 16px;
}
</style>
