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
  total: Number,
  error: Boolean,
  isMobile: {
    type: Boolean,
    default: false
  }
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
  <div>
    <!-- Mobile Responsive -->
    <template v-if="isMobile">
      <v-card
        v-for="unit in items"
        :key="unit.id"
        class="mb-4 pa-3 elevation-1 rounded-lg row-clickable"
        :class="{ 'selected-row': isSelected(unit.id) }"
        @click="() => emit('toggle', unit.id)"
        :style="{ cursor: 'pointer', border: isSelected(unit.id) ? '2px solid #1976d2' : '1px solid #eee' }"
      >
        <v-row no-gutters align="center" class="mb-1">
          <!-- Checkbox on the left -->
          <v-col cols="2" class="d-flex justify-center align-center">
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
          </v-col>
          <v-col cols="3" class="d-flex justify-start align-center">
            <div class="logo-container-mobile">
              <v-avatar v-if="unit.logo" class="logo-avatar-mobile" color="grey lighten-2">
                <img :src="unit.logo" alt="Logo" class="logo-img-cover" />
              </v-avatar>
              <v-avatar v-else class="logo-avatar-mobile" color="grey lighten-2">
                <span style="font-size: 12px; color: #888">Sin logo</span>
              </v-avatar>
            </div>
          </v-col>
          <v-col cols="7">
            <div class="d-flex align-center mb-1" style="justify-content: space-between">
              <div class="text-caption" style="margin-right: 8px">
                {{ unit.folio }}
              </div>
              <StatusChip :status="unit.status" />
            </div>
            <div class="font-weight-medium mb-1">{{ unit.legal_name }}</div>
            <div class="text-caption">
              <strong>Dirección:</strong>
              {{ unit.addressFormatted }}
            </div>
          </v-col>
        </v-row>
      </v-card>
      <v-row v-if="Math.ceil(total / itemsPerPage) > 1">
        <v-col class="d-flex justify-center">
          <v-pagination
            v-model="props.page"
            :length="Math.ceil(total / itemsPerPage)"
            @update:model-value="handlePageChange"
            color="primary"
          />
        </v-col>
      </v-row>
    </template>

    <!-- Desktop Table -->
    <template v-else>
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
          <v-pagination
            v-model="props.page"
            :length="Math.ceil(total / itemsPerPage)"
            @update:model-value="handlePageChange"
            color="primary"
          />
        </v-col>
      </v-row>
    </template>
  </div>
</template>

<style scoped src="@/styles/business_unit_select_table.css"></style>
