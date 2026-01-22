<template>
    <v-row>
      <v-col cols="12">
        <v-card elevation="2">
          <v-card-text>
            <div class="d-flex justify-space-between align-center mb-4">
              <h3 class="text-h5 font-weight-bold">Análisis de Formulario</h3>
              <v-btn variant="outlined" color="primary" @click="$emit('close')">
                <v-icon start>mdi-close</v-icon>
                Cerrar
              </v-btn>
            </div>
  
            <!-- Loading state -->
            <div v-if="isLoadingFormDetails" class="text-center py-8">
              <v-progress-circular indeterminate color="primary" />
              <p class="mt-2">Cargando detalles del formulario...</p>
            </div>
  
            <!-- Mostrar contenido cuando hay detalles cargados -->
            <div v-else-if="selectedFormDetails">
              <!-- Mapas de geolocalización -->
              <v-row v-if="geolocationFields.length > 0" class="mb-6">
                <v-col cols="12">
                  <v-card elevation="2">
                    <v-card-text>
                      <h3 class="text-h5 font-weight-bold mb-4">Mapas de Geolocalización</h3>
  
                      <div v-for="field in geolocationFields" :key="field.id" class="mb-6">
                        <v-card variant="outlined">
                          <v-card-title class="text-subtitle-1">
                            {{ field.label }}
                            <v-chip size="small" color="info" class="ml-2">
                              {{ geolocationResponses(field.id).length }} ubicaciones
                            </v-chip>
                          </v-card-title>
                          <v-card-text>
                            <GeolocationMap :locations="geolocationResponses(field.id)" height="500px" />
                          </v-card-text>
                        </v-card>
                      </div>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>
  
              <!-- Gráficas de campos select/checkbox -->
              <div v-if="fieldResponseStats.length > 0">
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
                            <v-chip size="small" :color="fieldStat.fieldType === 'select' ? 'primary' : 'success'" class="mb-2">
                              {{ fieldStat.fieldType === 'select' ? 'Selección' : 'Múltiple' }}
                            </v-chip>
                            <div class="text-caption text-grey">Total de respuestas: {{ fieldStat.totalResponses }}</div>
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
  
              <!-- Mensaje cuando no hay campos para mostrar -->
              <div v-if="geolocationFields.length === 0 && fieldResponseStats.length === 0" class="text-center py-8 text-grey">
                <v-icon size="48" color="grey-lighten-1">mdi-chart-box-outline</v-icon>
                <p class="mt-2">Este formulario no tiene campos de tipo selección, múltiple o geolocalización</p>
              </div>
            </div>
  
            <!-- Mensaje cuando no hay datos -->
            <div v-else class="text-center py-8 text-grey">
              <v-icon size="48" color="grey-lighten-1">mdi-alert-circle-outline</v-icon>
              <p class="mt-2">No se pudieron cargar los detalles del formulario</p>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  
    <!-- Analytics Report -->
    <v-row>
      <v-col cols="12">
        <v-card elevation="2">
          <v-card-text>
            <AnalyticsReport
              :form-responses-data="analyticsData"
              :selected-form="selectedFormForAnalytics"
              :is-loading="isLoadingFormDetails"
            />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </template>
  
  <script setup>
  import { ref, computed, watch, onMounted } from 'vue';
  import axiosInstance from '@/utils/axios';
  import VueApexCharts from 'vue3-apexcharts';
  import GeolocationMap from '@/utils/helpers/google/GeolocationMap.vue';
  import AnalyticsReport from './AnalyticsReport.vue';
  import { useAuthStore } from '@/stores/auth';
  
  const props = defineProps({
    formId: {
      type: Number,
      required: true
    },
    organizationId: {
      type: Number,
      default: null
    },
    dateRange: {
      type: Object,
      default: () => ({ start: null, end: null })
    }
  });
  
  const emit = defineEmits(['close']);
  
  const auth = useAuthStore();
  const selectedFormDetails = ref(null);
  const isLoadingFormDetails = ref(false);
  
  const isSuperadmin = computed(() => auth.user?.roles?.includes('superadmin') || false);
  const userOrganizationId = computed(() => auth.user?.organization_id);
  
  const getOrgParams = () => {
    const params = {};
  
    if (isSuperadmin.value) {
      if (props.organizationId) {
        params.organization_id = props.organizationId;
      }
    } else {
      params.organization_id = userOrganizationId.value;
    }
    return params;
  };
  
  const fetchFormStatus = async () => {
    if (!props.formId) return;
  
    isLoadingFormDetails.value = true;
    try {
      const params = {
        ...getOrgParams(),
        start_date: props.dateRange.start,
        end_date: props.dateRange.end
      };
  
      const res = await axiosInstance.get(`/forms/${props.formId}/responses`, { params });
      selectedFormDetails.value = res.data.data || res.data;
    } catch (err) {
      console.error('Failed to fetch form details', err);
      selectedFormDetails.value = null;
    } finally {
      isLoadingFormDetails.value = false;
    }
  };
  
  // Analizar campos de tipo select y checkbox
  const selectAndCheckboxFields = computed(() => {
    if (!selectedFormDetails.value) return [];
    const fields = selectedFormDetails.value.form.fields || [];
    return fields.filter((field) => field.type === 'select' || field.type === 'checkbox');
  });
  
  const geolocationFields = computed(() => {
    if (!selectedFormDetails.value) return [];
    const fields = selectedFormDetails.value.form.fields || [];
    return fields.filter((field) => field.type === 'geolocation');
  });
  
  const geolocationResponses = (fieldId) => {
    const locations = [];
    const responses = selectedFormDetails.value?.form?.user_responses || [];
  
    responses.forEach((response) => {
      const fieldResponse = response.field_responses?.find((fr) => fr.field_id === fieldId && fr.value);
  
      if (fieldResponse && fieldResponse.value) {
        try {
          const locationData = JSON.parse(fieldResponse.value);
          if (locationData.latitude && locationData.longitude) {
            locations.push({
              lat: parseFloat(locationData.latitude),
              lng: parseFloat(locationData.longitude),
              address:
                [locationData.street, locationData.outdoor_number, locationData.city]
                  .filter(Boolean)
                  .join(' ')
                  .replace(/ +,/g, ',')
                  .replace(/ ,/g, ',')
                  .trim() || ''
            });
          }
        } catch (e) {
          console.error('Error parsing location data:', e);
        }
      }
    });
  
    return locations;
  };
  
  const fieldResponseStats = computed(() => {
    if (!selectedFormDetails.value) return [];
  
    const fields = selectAndCheckboxFields.value;
    const userResponses = selectedFormDetails.value.form.user_responses || [];
  
    return fields.map((field) => {
      const options = field.options || [];
      const optionCounts = {};
      options.forEach((option) => {
        optionCounts[option] = 0;
      });
  
      userResponses.forEach((userResponse) => {
        const fieldResponses = userResponse.field_responses || [];
  
        fieldResponses.forEach((fieldResponse) => {
          if (fieldResponse.field_id === field.id) {
            let value = fieldResponse.value;
            let values = [];
  
            try {
              const parsed = JSON.parse(value);
              values = Array.isArray(parsed) ? parsed : [parsed];
            } catch (e) {
              values = [value];
            }
  
            values.forEach((v) => {
              if (Object.prototype.hasOwnProperty.call(optionCounts, v)) {
                optionCounts[v]++;
              }
            });
          }
        });
      });
  
      const uniqueUserResponses = new Set();
      userResponses.forEach((userResponse) => {
        const fieldResponses = userResponse.field_responses || [];
        const hasResponse = fieldResponses.some((fieldResponse) => fieldResponse.field_id === field.id);
        if (hasResponse) {
          uniqueUserResponses.add(userResponse.user?.id || userResponse.id);
        }
      });
  
      return {
        fieldId: field.id,
        fieldLabel: field.label,
        fieldType: field.type,
        options: options,
        optionCounts: optionCounts,
        totalResponses: uniqueUserResponses.size
      };
    });
  });
  
  const getChartOptionsForField = (fieldStat) => {
    return {
      chart: { type: 'bar', height: 350, toolbar: { show: true } },
      plotOptions: { bar: { horizontal: false, columnWidth: '55%', borderRadius: 8, dataLabels: { position: 'top' } } },
      dataLabels: { enabled: true, offsetY: -20, style: { fontSize: '12px', colors: ['#304758'] } },
      xaxis: {
        categories: fieldStat.options,
        labels: { style: { fontSize: '12px' }, rotate: -45, rotateAlways: fieldStat.options.length > 5 }
      },
      yaxis: { title: { text: 'Cantidad de Respuestas' } },
      title: {
        text: fieldStat.fieldLabel,
        align: 'left',
        style: { fontSize: '16px', fontWeight: 600 }
      },
      colors: ['#2196f3'],
      tooltip: { y: { formatter: (val) => `${val} respuesta${val !== 1 ? 's' : ''}` } }
    };
  };
  
  const getChartSeriesForField = (fieldStat) => {
    return [{ name: 'Respuestas', data: fieldStat.options.map((option) => fieldStat.optionCounts[option] || 0) }];
  };
  
  const analyticsData = computed(() => {
    if (!selectedFormDetails.value || !selectedFormDetails.value.form.user_responses) {
      return [];
    }
    return selectedFormDetails.value.form.user_responses;
  });
  
  const selectedFormForAnalytics = computed(() => {
    if (!selectedFormDetails.value) return null;
    return selectedFormDetails.value.form;
  });
  
  watch(() => props.formId, () => {
    if (props.formId) {
      fetchFormStatus();
    } else {
      selectedFormDetails.value = null;
    }
  }, { immediate: true });
  
  watch(() => props.dateRange, () => {
    if (props.formId) {
      fetchFormStatus();
    }
  }, { deep: true });
  
  onMounted(() => {
    if (props.formId) {
      fetchFormStatus();
    }
  });
  </script>