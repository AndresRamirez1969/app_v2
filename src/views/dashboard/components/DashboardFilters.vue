<template>
    <div class="d-flex align-center mb-6" style="gap: 16px">
      <!-- Dropdown de Frecuencia -->
    <v-menu>
      <template #activator="{ props: menuProps }">
        <v-btn
          v-bind="menuProps"
          variant="text"
          style="border-radius: 8px; border: 1px solid #ccc; min-width: 44px; height: 44px"
          color="#222"
        >
          <template v-if="mdAndDown">
            <v-icon>
              <svg viewBox="0 0 24 24" width="22" height="22">
                <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </v-icon>
          </template>
          <template v-else>
            <span class="d-flex align-center">
              <span class="mr-2">{{ frequencyLabel }}</span>
              <v-icon size="small">mdi-chevron-down</v-icon>
            </span>
          </template>
        </v-btn>
      </template>
      <v-list>
        <v-list-item
          v-for="option in frequencyOptions"
          :key="option.value"
          :value="option.value"
          @click="handleFrequencyChange(option.value)"
        >
          <v-list-item-title>{{ option.title }}</v-list-item-title>
        </v-list-item>
        <v-list-item @click="handleFrequencyChange(null)">
          <v-list-item-title>Limpiar</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-menu>
      <!-- Filtros button con indicador -->
      <div class="filter-btn-wrapper ml-2 flex-shrink-0" style="min-width: 44px; position: relative">
        <v-btn
          :icon="mdAndDown"
          variant="text"
          class="filter-btn filter-btn-center"
          style="border-radius: 8px; border: 1px solid #ccc; min-width: 44px; height: 44px; width: 100%"
          color="#222"
          @click="dialog = true"
        >
          <template v-if="mdAndDown">
            <v-icon>
              <svg viewBox="0 0 24 24" width="22" height="22">
                <path fill="currentColor" d="M3 6h18v2H3V6m3 6h12v2H6v-2m3 6h6v2H9v-2z" />
              </svg>
            </v-icon>
          </template>
          <template v-else>
            <span class="filter-btn-content">
              <v-icon class="mr-2">
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="currentColor" d="M3 6h18v2H3V6m3 6h12v2H6v-2m3 6h6v2H9v-2z" />
                </svg>
              </v-icon>
              <span>Filtros</span>
            </span>
          </template>
        </v-btn>
        <span v-if="hasActiveFilters" class="filter-indicator" />
      </div>
  
      <!-- Modal de filtros -->
      <v-dialog v-model="dialog" max-width="420">
        <v-card class="modal-padding" style="position: relative">
          <!-- Botón de cerrar (tachita) -->
          <v-btn
            icon
            variant="text"
            class="position-absolute close-btn"
            style="top: 10px; right: 10px; color: #222; z-index: 10"
            @click="dialog = false"
          >
            <v-icon>
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path
                  fill="currentColor"
                  d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                />
              </svg>
            </v-icon>
          </v-btn>
          <v-card-title class="font-weight-bold">Filtros</v-card-title>
          <v-card-text class="pb-0">

            <!-- Rango de fechas de creación -->
            <div class="mb-3">
              <v-menu
                v-model="menuCreatedStart"
                :close-on-content-click="false"
                transition="scale-transition"
                offset-y
                max-width="290"
                min-width="auto"
              >
                <template #activator="{ props }">
                  <v-text-field
                    :model-value="formatDateOnly(createdAtStart)"
                    label="Fecha de Inicio"
                    readonly
                    v-bind="props"
                    clearable
                    hide-details
                    variant="outlined"
                    color="primary"
                    class="filter-padding date-field mb-2"
                    @click:clear="createdAtStart = null"
                  />
                </template>
                <v-date-picker v-model="createdAtStart" locale="es" @update:modelValue="menuCreatedStart = false">
                  <template #header></template>
                </v-date-picker>
              </v-menu>
              <v-menu
                v-model="menuCreatedEnd"
                :close-on-content-click="false"
                transition="scale-transition"
                offset-y
                max-width="290"
                min-width="auto"
              >
                <template #activator="{ props }">
                  <v-text-field
                    :model-value="formatDateOnly(createdAtEnd)"
                    label="Fecha de Fin"
                    readonly
                    v-bind="props"
                    clearable
                    hide-details
                    variant="outlined"
                    color="primary"
                    class="filter-padding date-field"
                    @click:clear="createdAtEnd = null"
                  />
                </template>
                <v-date-picker v-model="createdAtEnd" locale="es" @update:modelValue="menuCreatedEnd = false">
                  <template #header></template>
                </v-date-picker>
              </v-menu>
            </div>
          </v-card-text>
          <v-card-actions class="d-flex flex-column align-end pt-2" style="gap: 8px">
            <v-btn
              style="background-color: #1677ff; color: white; font-weight: 500; font-size: 14px; width: 100%; text-transform: none"
              @click="applyFilters"
            >
              Aplicar
            </v-btn>
            <v-btn
              variant="text"
              style="width: 100%; color: #555; font-weight: 500; font-size: 13px; text-transform: none"
              @click="clearFilters"
            >
              Limpiar
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </div>
  </template>
  
  <script setup>
import { ref, computed, watch } from 'vue';
import { useDisplay } from 'vuetify';
import '@/styles/filters.css';

const emit = defineEmits(['filter']);

const dialog = ref(false);

const status = ref(null);
const statusOptions = [
  { title: 'Activo', value: 'active' },
  { title: 'Inactivo', value: 'inactive' }
];

const frequency = ref(null);
const frequencyOptions = [
  { title: 'Una vez al dia', value: 'once_per_day' },
  { title: 'Multiples veces al dia', value: 'multiple_per_day' }
];

const frequencyLabel = computed(() => {
  if (!frequency.value) return 'Frecuencia';
  const option = frequencyOptions.find(opt => opt.value === frequency.value);
  return option ? option.title : 'Frecuencia';
});

const createdAtStart = ref(null);
const createdAtEnd = ref(null);
const menuCreatedStart = ref(false);
const menuCreatedEnd = ref(false);

const { mdAndDown } = useDisplay();

const hasActiveFilters = computed(() => !!status.value || !!createdAtStart.value || !!createdAtEnd.value);

function formatDateOnly(val) {
  if (!val) return null;
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  const d = new Date(val);
  return d.toISOString().slice(0, 10);
}

function handleFrequencyChange(value) {
  frequency.value = value;
  // Emitir inmediatamente cuando cambia la frecuencia
  emit('filter', {
    status: status.value,
    frequency: frequency.value,
    created_at_start: formatDateOnly(createdAtStart.value),
    created_at_end: formatDateOnly(createdAtEnd.value)
  });
}

function applyFilters() {
  emit('filter', {
    status: status.value,
    frequency: frequency.value,
    created_at_start: formatDateOnly(createdAtStart.value),
    created_at_end: formatDateOnly(createdAtEnd.value)
  });
  dialog.value = false;
}

function clearFilters() {
  status.value = null;
  createdAtStart.value = null;
  createdAtEnd.value = null;
  emit('filter', {
    status: null,
    frequency: frequency.value,
    created_at_start: null,
    created_at_end: null
  });
}
</script>