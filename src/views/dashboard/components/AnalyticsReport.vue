<script setup>
import { computed } from 'vue';

// Props que recibirá el componente
const props = defineProps({
  formResponsesData: { type: Array, default: () => [] },
  selectedForm: { type: Object, default: null },
  isLoading: { type: Boolean, default: false }
});

const getLast7Days = () => {
  const days = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const day = d.getDate();
    const month = d.getMonth() + 1;
    days.push({
      label: `${day}/${month}`,
      key: `${d.getFullYear()}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    });
  }
  return days;
};

const groupResponsesByDay = (responses) => {
  const dailyData = {};
  const last7Days = getLast7Days();

  last7Days.forEach((day) => {
    dailyData[day.key] = 0;
  });

  responses.forEach((response) => {
    const dateStr = response.submitted_at || response.created_at;
    if (dateStr) {
      const d = new Date(dateStr);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (Object.hasOwn(dailyData, key)) {
        dailyData[key]++;
      }
    }
  });

  return last7Days.map((day) => ({ label: day.label, value: dailyData[day.key] }));
};

// Computed para los datos de la gráfica
const chartData = computed(() => {
  if (!props.formResponsesData || props.formResponsesData.length === 0) {
    return { labels: getLast7Days().map((d) => d.label), values: new Array(7).fill(0) };
  }
  const dailyData = groupResponsesByDay(props.formResponsesData);
  return { labels: dailyData.map((d) => d.label), values: dailyData.map((d) => d.value) };
});

// Estadísticas calculadas
const stats = computed(() => {
  if (!props.formResponsesData || props.formResponsesData.length === 0) {
    return { totalResponses: 0, averagePerDay: 0, trend: 'neutral' };
  }

  const dailyData = groupResponsesByDay(props.formResponsesData);
  const totalResponses = dailyData.reduce((sum, day) => sum + day.value, 0);
  const averagePerDay = totalResponses > 0 ? (totalResponses / 7).toFixed(1) : 0;

  // Tendencia: primeros 3 días vs últimos 3 días
  const firstPart = dailyData.slice(0, 3).reduce((sum, day) => sum + day.value, 0);
  const lastPart = dailyData.slice(-3).reduce((sum, day) => sum + day.value, 0);

  let trend = 'neutral';
  if (lastPart > firstPart * 1.2) trend = 'up';
  else if (firstPart > 0 && lastPart < firstPart * 0.8) trend = 'down';

  return { totalResponses, averagePerDay, trend };
});

const chartOptions1 = computed(() => {
  return {
    chart: { type: 'line', height: 340, fontFamily: `inherit`, foreColor: '#a1aab2', toolbar: { show: true } },
    colors: ['rgba(var(--v-theme-primary), var(--v-medium-opacity))'],
    dataLabels: { enabled: true, offsetY: -5, style: { fontSize: '10px', colors: ['#304758'] } },
    labels: chartData.value.labels,
    xaxis: {
      crosshairs: { width: 1 },
      labels: { offsetX: 8, style: { fontSize: '11px' } },
      axisTicks: { show: false },
      axisBorder: { show: false }
    },
    yaxis: {
      show: true,
      title: { text: 'Respuestas', style: { fontSize: '12px', color: '#666' } },
      labels: { style: { fontSize: '11px' } }
    },
    stroke: { curve: 'smooth', width: 2.5 },
    grid: { strokeDashArray: 4, borderColor: 'rgba(var(--v-theme-borderLight), var(--v-high-opacity))' },
    tooltip: {
      fixed: { enabled: false },
      x: { show: true },
      marker: { show: true },
      y: { formatter: (val) => `${val} respuesta${val !== 1 ? 's' : ''}` }
    },
    title: {
      text: props.selectedForm
        ? `Tendencias de Respuestas - ${props.selectedForm.title || props.selectedForm.name}`
        : 'Tendencias de Respuestas',
      align: 'left',
      style: { fontSize: '16px', fontWeight: 600, color: '#304758' }
    }
  };
});

// Serie de datos para la gráfica
const lineChart1 = computed(() => ({ series: [{ name: 'Respuestas por Mes', data: chartData.value.values }] }));

const reports = computed(() => [
  { name: 'Total de Respuestas', value: stats.value.totalResponses, icon: 'mdi-clipboard-text', color: 'primary' },
  { name: 'Promedio por día', value: stats.value.averagePerDay, icon: 'mdi-chart-line', color: 'success' },
  {
    name: 'Tendencia',
    value: stats.value.trend === 'up' ? '↗ Creciente' : stats.value.trend === 'down' ? '↘ Decreciente' : '→ Estable',
    icon: stats.value.trend === 'up' ? 'mdi-trending-up' : stats.value.trend === 'down' ? 'mdi-trending-down' : 'mdi-trending-neutral',
    color: stats.value.trend === 'up' ? 'success' : stats.value.trend === 'down' ? 'error' : 'warning'
  }
]);
</script>

<template>
  <div>
    <h3 class="text-h5 font-weight-bold mb-4">Análisis de Tendencias</h3>

    <!-- Estadísticas -->
    <v-list class="py-0 mb-4" aria-busy="true" aria-label="Report list" border>
      <v-list-item :value="item.name" v-for="(item, i) in reports" :key="i">
        <template #prepend>
          <v-icon :icon="item.icon" :color="item.color" size="24" />
        </template>
        <div class="d-inline-flex align-center justify-space-between w-100 ga-2">
          <h6 class="text-h6 mb-0">{{ item.name }}</h6>
          <h5 class="ml-auto text-h5 mb-0" :class="`text-${item.color}`">{{ item.value }}</h5>
        </div>
      </v-list-item>
    </v-list>

    <v-divider class="mb-4"></v-divider>

    <!-- Loading state -->
    <div v-if="isLoading" class="text-center py-8">
      <v-progress-circular indeterminate color="primary" />
      <p class="mt-2">Cargando tendencias...</p>
    </div>

    <!-- Mensaje cuando no hay datos -->
    <div v-else-if="!formResponsesData || formResponsesData.length === 0" class="text-center py-8 text-grey">
      <v-icon size="48" color="grey-lighten-1" class="mb-4">mdi-chart-line</v-icon>
      <h3 class="text-h6 text-grey-darken-1">Sin datos de tendencias</h3>
      <p class="text-body-2 text-grey">
        {{
          selectedForm
            ? 'Este formulario no tiene respuestas suficientes para mostrar tendencias'
            : 'Selecciona un formulario para ver las tendencias de respuestas'
        }}
      </p>
    </div>

    <!-- Gráfica de líneas -->
    <div v-else>
      <apexchart type="line" height="340" :options="chartOptions1" :series="lineChart1.series" />
    </div>
  </div>
</template>
