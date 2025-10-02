<script setup>
import { ref, onMounted, computed } from 'vue';
import axiosInstance from '@/utils/axios';
import { VCard, VCardText } from 'vuetify/components';
import VueApexCharts from 'vue3-apexcharts';

const forms = ref({ data: [], last_page: 1 });
const isLoading = ref(false);

// Variables para el formulario específico
const selectedFormId = ref(null);
const selectedFormDetails = ref(null);
const isLoadingFormDetails = ref(false);
const fieldType = ref(null);

const fetchForms = async () => {
  isLoading.value = true;
  try {
    const res = await axiosInstance.get('/forms');
    forms.value = res.data;
    console.log('Forms', forms.value);
  } catch (err) {
    console.error('Failed to fetch forms', err);
  } finally {
    isLoading.value = false;
  }
};

const fetchFormStatus = async (formId) => {
  if (!formId) return;
  
  isLoadingFormDetails.value = true;
  try {
    const res = await axiosInstance.get(`/forms/${formId}/responses`);
    selectedFormDetails.value = res.data.data || res.data;
    console.log('Form details', selectedFormDetails.value);
  } catch (err) {
    console.error('Failed to fetch form details', err);
    selectedFormDetails.value = null;
  } finally {
    isLoadingFormDetails.value = false;
  }
};

// Calcular estadísticas de formularios generales
const formStats = computed(() => {
  const allForms = forms.value.data || [];
  console.log('All forms', allForms);
  const total = allForms.length;
  const withResponses = allForms.filter(f => (f.responses_count || 0) > 0).length;
  const withoutResponses = allForms.filter(f => (f.responses_count || 0) === 0).length;
  
  return {
    total,
    withResponses,
    withoutResponses
  };
});

// Calcular estadísticas del formulario específico
const selectedFormStats = computed(() => {
  if (!selectedFormDetails.value) return null;
  
  const form = selectedFormDetails.value;
  const totalResponses = form.responses_count || 0;
  
  // Aquí puedes agregar más lógica según los campos que tenga tu formulario
  // Por ejemplo, si tienes campos de diferentes tipos o estados
  return {
    totalResponses,
    formName: form.title || form.name || `Formulario ${form.id}`,
    formStatus: form.status || 'unknown',
    createdAt: form.created_at,
    updatedAt: form.updated_at
  };
});

// Opciones para el select de formularios
const formOptions = computed(() => {
  const allForms = forms.value.data || [];
  return allForms.map(form => ({
    title: form.title || form.name || `Formulario ${form.id}`,
    value: form.id,
    subtitle: `${form.responses_count || 0} respuestas`
  }));
});

// Configuración de la gráfica general
const chartOptions = computed(() => ({
  chart: {
    type: 'bar',
    height: 350,
    toolbar: {
      show: true
    }
  },
  plotOptions: {
    bar: {
      horizontal: false,
      columnWidth: '55%',
      borderRadius: 8,
      dataLabels: {
        position: 'top'
      }
    }
  },
  dataLabels: {
    enabled: true,
    offsetY: -20,
    style: {
      fontSize: '12px',
      colors: ['#304758']
    }
  },
  xaxis: {
    categories: ['Formularios'],
    labels: {
      style: {
        fontSize: '14px',
        fontWeight: 600
      }
    }
  },
  yaxis: {
    title: {
      text: 'Cantidad de Formularios'
    }
  },
  legend: {
    position: 'top',
    horizontalAlign: 'center'
  },
  colors: ['#1976d2', '#4caf50', '#f44336'],
  tooltip: {
    y: {
      formatter: (val) => `${val} formulario${val !== 1 ? 's' : ''}`
    }
  }
}));

const chartSeries = computed(() => [
  {
    name: 'Total',
    data: [formStats.value.total]
  },
  {
    name: 'Con Respuestas',
    data: [formStats.value.withResponses]
  },
  {
    name: 'Sin Respuestas',
    data: [formStats.value.withoutResponses]
  }
]);

// Configuración de la gráfica del formulario específico
const selectedFormChartOptions = computed(() => ({
  chart: {
    type: 'donut',
    height: 350
  },
  labels: ['Respuestas', 'Sin Respuestas'],
  colors: ['#4caf50', '#f44336'],
  legend: {
    position: 'bottom'
  },
  dataLabels: {
    enabled: true,
    formatter: (val) => `${Math.round(val)}%`
  },
  tooltip: {
    y: {
      formatter: (val) => `${val} respuesta${val !== 1 ? 's' : ''}`
    }
  },
  plotOptions: {
    pie: {
      donut: {
        size: '65%',
        labels: {
          show: true,
          total: {
            show: true,
            label: 'Total',
            fontSize: '22px',
            fontWeight: 600,
            formatter: () => selectedFormStats.value?.totalResponses || 0
          }
        }
      }
    }
  }
}));

const selectedFormChartSeries = computed(() => {
  if (!selectedFormStats.value) return [0, 0];
  
  const totalResponses = selectedFormStats.value.totalResponses;
  const maxResponses = Math.max(totalResponses, 1); // Evitar división por 0
  
  return [
    totalResponses,
    maxResponses - totalResponses // Esto es solo visual, no representa datos reales
  ];
});

// Watcher para cargar detalles cuando se selecciona un formulario
const onFormSelected = (formId) => {
  selectedFormId.value = formId;
  if (formId) {
    fetchFormStatus(formId);
  } else {
    selectedFormDetails.value = null;
  }
};

onMounted(() => {
  fetchForms();
});
</script>

<template>
  <v-container fluid>
    <v-row class="mb-4">
      <v-col cols="12">
        <h2 class="text-h4 font-weight-bold">Dashboard</h2>
      </v-col>
    </v-row>

    <!-- Gráfica general -->
    <v-row class="mb-6">
      <v-col cols="12">
        <v-card elevation="2">
          <v-card-text>
            <h3 class="text-h5 font-weight-bold mb-4">Estado General de Formularios</h3>
            <div v-if="isLoading" class="text-center py-8">
              <v-progress-circular indeterminate color="primary" />
            </div>
            <div v-else>
              <VueApexCharts
                type="bar"
                height="350"
                :options="chartOptions"
                :series="chartSeries"
              />
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Selector y gráfica de formulario específico -->
    <v-row>
      <v-col cols="12">
        <v-card elevation="2">
          <v-card-text>
            <h3 class="text-h5 font-weight-bold mb-4">Detalles de Formulario Específico</h3>
            
            <!-- Selector de formulario -->
            <v-row class="mb-4">
              <v-col cols="12" md="6">
                <v-select
                  v-model="selectedFormId"
                  :items="formOptions"
                  item-title="title"
                  item-value="value"
                  label="Seleccionar formulario"
                  variant="outlined"
                  density="compact"
                  clearable
                  @update:model-value="onFormSelected"
                >
                  <template #item="{ props, item }">
                    <v-list-item v-bind="props">
                      <template #title>{{ item.raw.title }}</template>
                      <template #subtitle>{{ item.raw.subtitle }}</template>
                    </v-list-item>
                  </template>
                </v-select>
              </v-col>
            </v-row>

            <!-- Información del formulario seleccionado -->
            <div v-if="selectedFormDetails" class="mb-4">
              <v-row>
                <v-col cols="12" md="3">
                  <v-card variant="outlined" class="pa-3">
                    <div class="text-overline mb-1">Formulario</div>
                    <div class="text-h6">{{ selectedFormStats?.formName }}</div>
                  </v-card>
                </v-col>
                <v-col cols="12" md="3">
                  <v-card variant="outlined" class="pa-3">
                    <div class="text-overline mb-1">Total Respuestas</div>
                    <div class="text-h6 primary--text">{{ selectedFormStats?.totalResponses }}</div>
                  </v-card>
                </v-col>
                <v-col cols="12" md="3">
                  <v-card variant="outlined" class="pa-3">
                    <div class="text-overline mb-1">Estado</div>
                    <div class="text-h6">{{ selectedFormStats?.formStatus }}</div>
                  </v-card>
                </v-col>
                <v-col cols="12" md="3">
                  <v-card variant="outlined" class="pa-3">
                    <div class="text-overline mb-1">Creado</div>
                    <div class="text-h6">{{ selectedFormStats?.createdAt ? new Date(selectedFormStats.createdAt).toLocaleDateString() : 'N/A' }}</div>
                  </v-card>
                </v-col>
              </v-row>
            </div>

            <!-- Gráfica del formulario específico -->
            <div v-if="selectedFormDetails && !isLoadingFormDetails">
              <VueApexCharts
                type="donut"
                height="350"
                :options="selectedFormChartOptions"
                :series="selectedFormChartSeries"
              />
            </div>
            
            <!-- Loading state para detalles -->
            <div v-else-if="isLoadingFormDetails" class="text-center py-8">
              <v-progress-circular indeterminate color="primary" />
              <p class="mt-2">Cargando detalles del formulario...</p>
            </div>
            
            <!-- Mensaje cuando no hay formulario seleccionado -->
            <div v-else-if="!selectedFormId" class="text-center py-8 text-grey">
              <v-icon size="48" color="grey-lighten-1">mdi-chart-donut</v-icon>
              <p class="mt-2">Selecciona un formulario para ver sus detalles</p>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.primary--text {
  color: #1976d2;
}
.success--text {
  color: #4caf50;
}
.error--text {
  color: #f44336;
}
</style>
