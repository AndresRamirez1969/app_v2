<template>
  <v-card-text class="pb-0">
    <v-row>
      <v-col cols="12">
        <v-text-field
          v-model="filters.search"
          label="Buscar por usuario"
          variant="outlined"
          density="compact"
          :prepend-inner-icon="mdiMagnify"
          @keyup.enter="handleFilterChange"
          @update:model-value="handleFilterChange"
        />
      </v-col>
      <v-col cols="12">
        <v-select
          v-model="filters.dateRange"
          :items="dateFilterOptions"
          label="Rango de fechas"
          variant="outlined"
          density="compact"
          @update:model-value="handleFilterChange"
        />
      </v-col>
      <v-col cols="12" md="6" v-if="filters.dateRange === 'custom'">
        <v-text-field
          v-model="filters.startDate"
          type="date"
          label="Fecha inicial"
          variant="outlined"
          density="compact"
          @update:model-value="handleFilterChange"
        />
      </v-col>
      <v-col cols="12" md="6" v-if="filters.dateRange === 'custom'">
        <v-text-field
          v-model="filters.endDate"
          type="date"
          label="Fecha final"
          variant="outlined"
          density="compact"
          @update:model-value="handleFilterChange"
        />
      </v-col>
    </v-row>
  </v-card-text>
</template>

<script setup>
import { ref } from 'vue';
import { mdiMagnify } from '@mdi/js';
import { DATE_FILTER_OPTIONS } from '@/constants/constants';

const props = defineProps({
  filters: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['update:filters']);

const dateFilterOptions = ref(DATE_FILTER_OPTIONS);

const handleFilterChange = () => {
  emit('update:filters', { ...props.filters });
};
</script>
