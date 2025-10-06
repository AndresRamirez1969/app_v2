<script setup>
import { ref, onMounted, computed } from 'vue';
import axiosInstance from '@/utils/axios';
import { VCard, VCardText } from 'vuetify/components';
import VueApexCharts from 'vue3-apexcharts';

const today = new Date();
const dd = String(today.getDate());
const mm = String(today.getMonth() + 1);
const yyyy = today.getFullYear();
const todayFormatted = `${yyyy}-${mm}-${dd}`;
const forms = ref({ data: [], last_page: 1 });
const isLoading = ref(false);
const filters = ref({
  date: null
});
const dateMenu = ref(false);
const currentPage = ref(1);
const dateRange = ref('');

// Variables para el formulario específico
const selectedFormId = ref(null);
const selectedFormDetails = ref(null);
const isLoadingFormDetails = ref(false);

const formatDateForAPI = (date) => {
  if (!date) return null;
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

const clearDateFilter = () => {
  filters.value.date = null;
  dateRange.value = '';
  fetchForms();
  if (selectedFormId.value) {
    fetchFormStatus(selectedFormId.value);
  }
};

const onDateChange = (date) => {
  dateMenu.value = false;
  if (date) {
    dateRange.value = formatDateForAPI(date);
  } else {
    dateRange.value = '';
  }
  fetchForms();
  if (selectedFormId.value) {
    fetchFormStatus(selectedFormId.value);
  }
}

const fetchForms = async () => {
  isLoading.value = true;
  try {
    const params = {
      page: currentPage.value
    };

    if (dateRange.value) {
      params.submitted_at = dateRange.value;
    }

    const res = await axiosInstance.get('/forms', {
      params: params
    });
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
    const params = {};
    if (dateRange.value) {
      params.submitted_at = dateRange.value;
    }

    const res = await axiosInstance.get(`/forms/${formId}/responses`, {
      params: params
    });
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

  let withResponses = 0;
  let withoutResponses = 0;

  if (dateRange.value) {
    allForms.forEach(form => {
      if ((form.responses_count || 0) > 0) {
        withResponses++;
      } else {
        withoutResponses++;
      }
    })
  } else {
    withResponses = allForms.filter(f => (f.responses_count || 0) > 0).length;
    withoutResponses = allForms.filter(f => (f.responses_count || 0) === 0).length;
  }
  
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
  let userResponses = selectedFormDetails.value.form.user_responses || [];
  
  // Filtrar respuestas por fecha de submitted_at si hay filtro activo
  if (dateRange.value) {
    userResponses = userResponses.filter(response => {
      if (!response.submitted_at) return false;
      const responseDate = formatDateForAPI(response.submitted_at);
      return responseDate === dateRange.value;
    });
  }
  
  console.log('Filtered user responses', userResponses);
  
  return fields.map(field => {
    const options = field.options || [];
    
    // Inicializar contador para cada opción
    const optionCounts = {};
    options.forEach(option => {
      optionCounts[option] = 0;
    });
    
    // Contar respuestas filtradas
    userResponses.forEach(userResponse => {
      const fieldResponses = userResponse.field_responses || [];
      
      fieldResponses.forEach(fieldResponse => {
        // Buscar si esta respuesta corresponde a este campo por field_id
        if (fieldResponse.field_id === field.id) {
          let value = fieldResponse.value;
          
          // Tanto checkbox como select pueden venir como JSON string
          let values = [];
          
          try {
            // Intentar parsear como JSON
            const parsed = JSON.parse(value);
            values = Array.isArray(parsed) ? parsed : [parsed];
          } catch (e) {
            // Si no es JSON, tratar como string simple
            values = [value];
          }
          
          // Contar cada valor
          values.forEach(v => {
            if (Object.prototype.hasOwnProperty.call(optionCounts, v)) {
              optionCounts[v]++;
            }
          });
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
      text: `${fieldStat.fieldLabel}${dateRange.value ? ` (${dateRange.value})` : ''}`,
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
  },
  title: {
    text: `Estado General de Formularios${dateRange.value ? ` (${dateRange.value})` : ''}`,
    align: 'left',
    style: {
      fontSize: '18px',
      fontWeight: 600
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
        <div class="d-flex flex-column">
        <h2 class="text-h4 font-weight-bold">Tu Dashboard</h2>
        <p class="text-body-1 text-grey-darken-1">
          Hoy es {{ todayFormatted }}
        </p>
      </div>
      </v-col>
    </v-row>
    <v-row class="mb-4">
      <v-col cols="12" md="4">
        <!-- Filtro de fecha -->
        <v-menu v-model="dateMenu" :close-on-content-click="false" transition="scale-transition" offset-y min-width="auto">
          <template #activator="{ props }">
            <v-text-field
              v-bind="props"
              v-model="dateRange"
              placeholder="Filtrar por fecha de respuesta"
              :prepend-inner-icon="mdiCalendar"
              readonly
              clearable
              density="compact"
              variant="outlined"
              hide-details
              style="min-width: 220px"
              @click:clear="clearDateFilter"
            />
          </template>

          <v-date-picker
            v-model="filters.date"
            @update:model-value="onDateChange"
            :max="new Date().toISOString().substr(0, 10)"
            locale="es"
          />
        </v-menu>
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
