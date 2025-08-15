<script setup>
import StatusChip from '@/components/status/StatusChip.vue';

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  },
  page: Number,
  itemsPerPage: {
    type: Number,
    default: 10
  },
  sortBy: String,
  sortDesc: Boolean,
  selectedBusinessUnits: Array,
  total: Number
});
const emit = defineEmits(['update:page', 'sort', 'toggle']);

// Saber si está seleccionada
function isSelected(id) {
  return props.selectedBusinessUnits?.includes(id);
}

// Handler para seleccionar al hacer click en la fila
function handleRowClick(unit, event) {
  // Evita el toggle si el click fue sobre el checkbox
  if (event && (event.target.closest('.checkbox-compact') || event.target.tagName === 'INPUT' || event.target.tagName === 'LABEL')) {
    return;
  }
  emit('toggle', unit.id);
}

function handleSort(column) {
  emit('sort', column);
}

function handlePageChange(val) {
  emit('update:page', val);
}
</script>

<template>
  <v-table class="rounded-lg elevation-1 uniform-table" style="width: 100%">
    <thead>
      <tr>
        <th class="font-weight-bold text-center uniform-col" style="width: 80px"></th>
        <th class="font-weight-bold text-center uniform-col cursor-pointer" style="width: 80px" @click="handleSort('folio')">Folio</th>
        <th class="font-weight-bold text-center uniform-col" style="width: 72px">Logo</th>
        <th class="font-weight-bold text-center uniform-col cursor-pointer" style="width: 180px" @click="handleSort('legal_name')">
          Nombre Legal
        </th>
        <th class="font-weight-bold text-center uniform-col cursor-pointer" style="width: 120px" @click="handleSort('alias')">Alias</th>
        <th class="font-weight-bold text-center uniform-col cursor-pointer" style="width: 240px" @click="handleSort('address')">
          Dirección
        </th>
        <th class="font-weight-bold text-center uniform-col" style="width: 120px">Estado</th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="unit in items"
        :key="unit.id"
        class="row-clickable"
        :class="{ 'selected-row': isSelected(unit.id) }"
        :style="{ cursor: 'pointer' }"
        @click="(event) => handleRowClick(unit, event)"
      >
        <td class="text-center uniform-col" style="padding-left: 0; padding-right: 8px">
          <div class="d-flex justify-center align-center" style="height: 100%">
            <v-checkbox
              :model-value="isSelected(unit.id)"
              @update:model-value="emit('toggle', unit.id)"
              color="primary"
              hide-details
              :ripple="false"
              class="pa-0 ma-0 checkbox-compact"
              style="--v-checkbox-bg: #1976d2; --v-checkbox-checked-color: #fff"
              @click.stop
            />
          </div>
        </td>
        <td class="text-center uniform-col">{{ unit.folio }}</td>
        <td class="text-center uniform-col">
          <v-avatar v-if="unit.logo" size="48" class="logo-avatar">
            <img :src="unit.logo" alt="Logo" />
          </v-avatar>
          <v-avatar v-else size="48" color="grey lighten-2" class="logo-avatar">
            <span style="font-size: 12px; color: #888">Sin logo</span>
          </v-avatar>
        </td>
        <td class="text-center uniform-col">{{ unit.legal_name }}</td>
        <td class="text-center uniform-col">{{ unit.alias }}</td>
        <td class="text-center uniform-col">{{ unit.addressFormatted }}</td>
        <td class="text-center uniform-col">
          <StatusChip :status="unit.status" />
        </td>
      </tr>
      <tr v-if="items.length === 0">
        <td colspan="7" class="text-center text-medium-emphasis">No hay ubicaciones disponibles.</td>
      </tr>
    </tbody>
  </v-table>
  <v-row v-if="Math.ceil(total / itemsPerPage) > 1">
    <v-col class="d-flex justify-center">
      <v-pagination v-model="props.page" :length="Math.ceil(total / itemsPerPage)" @update:model-value="handlePageChange" color="primary" />
    </v-col>
  </v-row>
</template>

<style scoped src="@/styles/business_unit_select_table.css"></style>
