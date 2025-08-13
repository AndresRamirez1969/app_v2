<script setup>
import { useDisplay } from 'vuetify';
import StatusChip from '@/components/status/StatusChip.vue';

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  },
  page: Number,
  itemsPerPage: {
    type: Number,
    default: 8
  },
  sortBy: String,
  sortDesc: Boolean,
  selectedBusinessUnits: Array
});
const emit = defineEmits(['update:page', 'sort', 'toggle']);

const { mdAndDown } = useDisplay();

// Handler para seleccionar al hacer click en la fila/card
function handleRowClick(unit, event) {
  // Evita el toggle si el click fue sobre el checkbox
  if (event && (event.target.closest('.checkbox-compact') || event.target.tagName === 'INPUT' || event.target.tagName === 'LABEL')) {
    return;
  }
  emit('toggle', unit.id);
}

// Saber si está seleccionada
function isSelected(id) {
  return props.selectedBusinessUnits?.includes(id);
}
</script>

<template>
  <div>
    <!-- Desktop Table -->
    <v-table v-if="!mdAndDown" density="comfortable" class="fixed-table elevation-1 rounded-lg">
      <thead>
        <tr>
          <th class="select-header"></th>
          <th @click="emit('sort', 'folio')" class="cursor-pointer folio-header">Folio</th>
          <th class="logo-header">Logo</th>
          <th @click="emit('sort', 'legal_name')" class="cursor-pointer legal-header">Nombre Legal</th>
          <th @click="emit('sort', 'alias')" class="cursor-pointer alias-header">Alias</th>
          <th @click="emit('sort', 'address')" class="cursor-pointer address-header">Dirección</th>
          <th class="status-header">Estado</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="unit in items"
          :key="unit.id"
          class="row-clickable"
          :class="{ 'selected-row': isSelected(unit.id) }"
          @click="(event) => handleRowClick(unit, event)"
        >
          <td class="select-cell">
            <v-checkbox
              :model-value="isSelected(unit.id)"
              @update:model-value="emit('toggle', unit.id)"
              hide-details
              density="compact"
              class="checkbox-compact"
              color="primary"
              @click.stop
            />
          </td>
          <td class="folio-cell">{{ unit.folio }}</td>
          <td class="logo-cell">
            <v-avatar v-if="unit.logo" size="48" class="logo-avatar">
              <img :src="unit.logo" alt="Logo" />
            </v-avatar>
            <v-avatar v-else size="48" color="grey lighten-2" class="logo-avatar">
              <span style="font-size: 12px; color: #888">Sin logo</span>
            </v-avatar>
          </td>
          <td class="legal-cell">{{ unit.legal_name }}</td>
          <td class="alias-cell">{{ unit.alias }}</td>
          <td class="address-cell">{{ unit.addressFormatted }}</td>
          <td class="status-cell">
            <StatusChip :status="unit.status" />
          </td>
        </tr>
        <tr v-if="!items.length">
          <td colspan="7" class="text-center py-8">No hay ubicaciones disponibles</td>
        </tr>
      </tbody>
    </v-table>

    <!-- Mobile Cards -->
    <div v-else>
      <v-card
        v-for="unit in items"
        :key="unit.id"
        class="mb-3 elevation-1 rounded-lg row-clickable business-unit-card"
        :class="{ 'selected-card': isSelected(unit.id) }"
        style="cursor: pointer; padding: 16px 12px"
        @click="(event) => handleRowClick(unit, event)"
      >
        <v-row no-gutters align="center">
          <!-- Checkbox cuadrado igual que en la tabla -->
          <v-col cols="2" class="d-flex justify-center align-center" style="max-width: 40px">
            <v-checkbox
              :model-value="isSelected(unit.id)"
              @update:model-value="emit('toggle', unit.id)"
              hide-details
              density="compact"
              class="checkbox-compact"
              color="primary"
              @click.stop
            />
          </v-col>
          <v-col cols="2" class="d-flex justify-center align-center" style="max-width: 56px">
            <v-avatar v-if="unit.logo" size="48" class="logo-avatar-mobile">
              <img :src="unit.logo" alt="Logo" />
            </v-avatar>
            <v-avatar v-else size="48" color="grey lighten-2" class="logo-avatar-mobile">
              <span style="font-size: 12px; color: #888">Sin logo</span>
            </v-avatar>
          </v-col>
          <v-col cols="8" class="pl-2">
            <div class="d-flex align-center mb-1" style="justify-content: space-between">
              <div class="text-caption" style="margin-right: 8px">
                <strong>{{ unit.folio }}</strong>
              </div>
              <StatusChip :status="unit.status" />
            </div>
            <div class="font-weight-medium mb-1">{{ unit.legal_name }}</div>
            <div class="text-caption"><strong>Alias:</strong> {{ unit.alias }}</div>
            <div class="text-caption"><strong>Dirección:</strong> {{ unit.addressFormatted }}</div>
          </v-col>
        </v-row>
      </v-card>
      <v-card v-if="!items.length" class="mb-4 pa-4 elevation-1 rounded-lg text-center">
        <div class="font-weight-bold mb-2" style="font-size: 1.2rem">No hay ubicaciones disponibles</div>
      </v-card>
    </div>

    <div class="d-flex justify-center mt-4">
      <v-pagination
        v-model="props.page"
        :length="Math.ceil((props.items?.length || 1) / 8)"
        total-visible="7"
        color="primary"
        @update:modelValue="emit('update:page', $event)"
      />
    </div>
  </div>
</template>

<style scoped src="@/styles/business_unit_select_table.css"></style>
