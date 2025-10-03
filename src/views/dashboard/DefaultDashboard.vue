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
  const total = allForms.length;
  const withResponses = allForms.filter(f => (f.responses_count || 0) > 0).length;
  const withoutResponses = allForms.filter(f => (f.responses_count || 0) === 0).length;
  
  return {
    total,
    withResponses,
    withoutResponses
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

// Analizar campos de tipo select y checkbox
const selectAndCheckboxFields = computed(() => {
  if (!selectedFormDetails.value) return [];
  
  const fields = selectedFormDetails.value.form.fields || [];
  console.log('Fields', fields);
  return fields.filter(field => 
    field.type === 'select' || field.type === 'checkbox'
  );
});

// Contar respuestas por cada campo de select/checkbox
const fieldResponseStats = computed(() => {
  if (!selectedFormDetails.value) return [];
  
  const fields = selectAndCheckboxFields.value;
  const userResponses = selectedFormDetails.value.user_responses || [];
  
  return fields.map(field => {
    const options = field.options || [];
    
    // Inicializar contador para cada opción
    const optionCounts = {};
    options.forEach(option => {
      optionCounts[option] = 0;
    });
    
    // Contar respuestas
    userResponses.forEach(userResponse => {
      const fieldResponses = userResponse.field_responses || [];
      
      fieldResponses.forEach(fieldResponse => {
        // Buscar si esta respuesta corresponde a este campo
        if (fieldResponse.field_id === field.id || fieldResponse.label === field.label) {
          const value = fieldResponse.value;
          
          // Para checkbox puede ser un array, para select es un string
          if (field.type === 'checkbox' && Array.isArray(value)) {
            value.forEach(v => {
              if (optionCounts.hasOwnProperty(v)) {
                optionCounts[v]++;
              }
            });
          } else if (field.type === 'select' && typeof value === 'string') {
            if (optionCounts.hasOwnProperty(value)) {
              optionCounts[value]++;
            }
          }
        }
      });
    });
    
    return {
      fieldId: field.id,
      fieldLabel: field.label,
      fieldType: field.type,
      options: options,
      optionCounts: optionCounts,
      totalResponses: Object.values(optionCounts).reduce((sum, count) => sum + count, 0)
    };
  });
});

// Generar configuraciones de gráficas para cada campo
const getChartOptionsForField = (fieldStat) => {
  return {
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
      categories: fieldStat.options,
      labels: {
        style: {
          fontSize: '12px'
        },
        rotate: -45,
        rotateAlways: fieldStat.options.length > 5
      }
    },
    yaxis: {
      title: {
        text: 'Cantidad de Respuestas'
      }
    },
    title: {
      text: fieldStat.fieldLabel,
      align: 'left',
      style: {
        fontSize: '16px',
        fontWeight: 600
      }
    },
    colors: ['#2196f3'],
    tooltip: {
      y: {
        formatter: (val) => `${val} respuesta${val !== 1 ? 's' : ''}`
      }
    }
  };
};

const getChartSeriesForField = (fieldStat) => {
  return [{
    name: 'Respuestas',
    data: fieldStat.options.map(option => fieldStat.optionCounts[option] || 0)
  }];
};

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

    <!-- Selector y gráficas de formulario específico -->
    <v-row>
      <v-col cols="12">
        <v-card elevation="2">
          <v-card-text>
            <h3 class="text-h5 font-weight-bold mb-4">Análisis de Formulario Específico</h3>
            
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

            <!-- Loading state para detalles -->
            <div v-if="isLoadingFormDetails" class="text-center py-8">
              <v-progress-circular indeterminate color="primary" />
              <p class="mt-2">Cargando detalles del formulario...</p>
            </div>
            
            <!-- Gráficas de campos select/checkbox -->
            <div v-else-if="selectedFormDetails && fieldResponseStats.length > 0">
              <v-row>
                <v-col 
                  v-for="fieldStat in fieldResponseStats" 
                  :key="fieldStat.fieldId"
                  cols="12"
                  :md="fieldResponseStats.length === 1 ? 12 : 6"
                >
                  <v-card variant="outlined" class="mb-4">
                    <v-card-text>
                      <div class="d-flex justify-space-between align-center mb-2">
                        <div>
                          <v-chip 
                            size="small" 
                            :color="fieldStat.fieldType === 'select' ? 'primary' : 'success'"
                            class="mb-2"
                          >
                            {{ fieldStat.fieldType === 'select' ? 'Selección' : 'Múltiple' }}
                          </v-chip>
                          <div class="text-caption text-grey">
                            Total de respuestas: {{ fieldStat.totalResponses }}
                          </div>
                        </div>
                      </div>
                      <VueApexCharts
                        type="bar"
                        height="300"
                        :options="getChartOptionsForField(fieldStat)"
                        :series="getChartSeriesForField(fieldStat)"
                      />
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>
            </div>

            <!-- Mensaje cuando el formulario no tiene campos select/checkbox -->
            <div v-else-if="selectedFormDetails && fieldResponseStats.length === 0" class="text-center py-8 text-grey">
              <v-icon size="48" color="grey-lighten-1">mdi-chart-box-outline</v-icon>
              <p class="mt-2">Este formulario no tiene campos de tipo selección o múltiple</p>
            </div>
            
            <!-- Mensaje cuando no hay formulario seleccionado -->
            <div v-else-if="!selectedFormId" class="text-center py-8 text-grey">
              <v-icon size="48" color="grey-lighten-1">mdi-chart-bar</v-icon>
              <p class="mt-2">Selecciona un formulario para ver el análisis de respuestas</p>
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
