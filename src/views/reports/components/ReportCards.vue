<template>
  <v-row>
    <v-col cols="12" md="6">
      <v-card class="h-100">
        <v-card-title class="d-flex flex-column align-center">
          <v-icon class="mr-2" color="primary">mdi-account-group</v-icon>
          Respuestas
        </v-card-title>
        <v-card-text class="text-center">
          <div class="d-flex justify-space-between align-center mb-2">
            <div>
              <div class="text-h4 font-weight-bold text-success">{{ uniqueUsers }}</div>
              <div class="text-caption text-grey-darken-1">Actuales</div>
            </div>
            <v-icon class="mx-4" color="grey">mdi-arrow-right</v-icon>
            <div>
              <div class="text-h4 font-weight-bold text-primary">{{ assignmentsUsers }}</div>
              <div class="text-caption text-grey-darken-1">Esperadas</div>
            </div>
          </div>
          <v-progress-linear :model-value="completionPercentage" color="success" height="8" rounded class="mb-2" />
          <div class="text-body-2 text-grey-darken-1">{{ completionPercentage }}% completado</div>
        </v-card-text>
      </v-card>
    </v-col>
    <v-col cols="12" md="6">
      <v-card class="h-100">
        <v-card-text class="text-center">
          <apexchart v-if="!isLoading" type="pie" height="300" :options="chartOptions" :series="chartSeries" />
          <div v-else class="text-center py-8">
            <v-progress-circular indeterminate color="primary" size="64" />
            <p class="mt-4">Cargando gráfico...</p>
          </div>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup>
import { computed } from 'vue';
import ApexCharts from 'apexcharts';

const props = defineProps({
  items: {
    type: Array
  },
  isLoading: {
    type: Boolean
  }
});

const uniqueUsers = computed(() => {
  if (!props.items || props.items.length === 0) return [];

  const responses = props.items.map((item) => item.responses.length);
  return responses.reduce((acc, curr) => acc + curr, 0);
});

const assignmentsUsers = computed(() => {
  if (!props.items || props.items.length === 0) return [];

  const assignments = props.items.map((item) => item.assignments.length);
  return assignments.reduce((acc, curr) => acc + curr, 0);
});

const completionPercentage = computed(() => {
  if (uniqueUsers.value === 0) return 0;
  return Math.round((uniqueUsers.value / assignmentsUsers.value) * 100);
});

// Configuración de la gráfica
const chartOptions = computed(() => ({
  chart: {
    type: 'pie',
    height: 200,
    fontFamily: 'inherit',
    foreColor: '#a1aab2'
  },
  labels: ['Usuarios que han respondido', 'Usuarios esperados'],
  colors: ['#4CAF50', '#2196F3'],
  dataLabels: {
    enabled: true,
    formatter: function (val, opts) {
      return opts.w.globals.seriesTotals[opts.seriesIndex];
    }
  },
  legend: {
    position: 'bottom',
    horizontalAlign: 'center'
  },
  responsive: [
    {
      breakpoint: 480,
      options: {
        chart: {
          height: 250
        },
        legend: {
          position: 'bottom'
        }
      }
    }
  ]
}));

const chartSeries = computed(() => [uniqueUsers.value, assignmentsUsers.value - uniqueUsers.value]);
</script>

<style scoped>
.h-100 {
  height: 100%;
}

.chart {
  width: 100%;
  height: 100%;
}
</style>
