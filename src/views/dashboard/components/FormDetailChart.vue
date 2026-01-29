<template>
    <v-row>
      <v-col cols="12">
        <v-card elevation="2">
          <v-card-text>
            <div class="d-flex justify-space-between align-center mb-4">
              <h3 class="text-h5 font-weight-bold">Análisis de Formulario</h3>
              <v-btn variant="outlined" color="primary" @click="$emit('close')">
                <v-icon :icon="mdiClose" start />
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

              <div v-if="numberFieldStats.length > 0" class="mb-6">
                <h3 class="text-h5 font-weight-bold mb-4">Campos Numéricos</h3>
                <v-row>
                  <v-col
                    v-for="numberStat in numberFieldStats"
                    :key="numberStat.fieldId"
                    cols="12"
                    :md="numberFieldStats.length === 1 ? 12 : 6"
                    >
                    <v-card variant="outlined" class="mb-4">
                      <v-card-text>
                        <div class="d-flex justify-space-between align-center mb-2">
                          <div>
                            <v-chip size="small" color="info" class="mb-2">
                              Numérico
                            </v-chip>
                            <div class="text-caption text-grey">Total de respuestas: {{ numberStat.totalResponses }}</div>
                          </div>
                        </div>
                        <div class="text-center py-4">
                          <div class="text-h3 font-weight-bold text-primary mb-2">
                            {{ numberStat.average.toFixed(2) }}
                          </div>
                          <div class="text-body-2 text-grey mb-3">Promedio</div>
                          <div class="d-flex justify-space-around mt-4">
                            <div class="text-center">
                              <div class="text-h6 font-weight-medium">{{ numberStat.min !== null ? numberStat.min.toFixed(2) : '—' }}</div>
                              <div class="text-caption text-grey">Mínimo</div>
                            </div>
                            <div class="text-center">
                              <div class="text-h6 font-weight-medium">{{ numberStat.max !== null ? numberStat.max.toFixed(2) : '—' }}</div>
                              <div class="text-caption text-grey">Máximo</div>
                            </div>
                          </div>
                        </div>
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
  import { mdiClose } from '@mdi/js';
  
  const props = defineProps({
    formId: {
      type: Number,
      required: true
    },
    organizationId: {
      type: Number,
      default: null
    },
    businessId: {
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
    if (props.businessId) {
      params.business_id = props.businessId;
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
  
      // Obtener primero los datos del formulario
      const formRes = await axiosInstance.get(`/forms/${props.formId}`);
      const formData = formRes.data.data || formRes.data.form || formRes.data;
      
      // Obtener TODAS las respuestas usando paginación
      let allResponses = [];
      let page = 1;
      let lastPage = 1;
      
      do {
        const { data } = await axiosInstance.get(`/forms/${props.formId}/responses/reports`, {
          params: { ...params, page, per_page: 100 }
        });
        
        const responses = Array.isArray(data?.responses) ? data.responses : [];
        allResponses = [...allResponses, ...responses];
        
        // Verificar paginación
        if (data.last_page !== undefined) {
          lastPage = data.last_page;
          page++;
        } else {
          break;
        }
      } while (page <= lastPage);
      
      // Transformar las respuestas al formato esperado
      const userResponses = allResponses.map((resp) => ({
        id: resp.response?.id || resp.id,
        user: resp.response?.user || resp.user || {},
        submitted_at: resp.response?.submitted_at || resp.submitted_at,
        field_responses: resp.response?.field_responses || resp.field_responses || []
      }));
      
      // Construir la estructura de datos esperada
      selectedFormDetails.value = {
        form: {
          ...formData,
          fields: formData.fields || [],
          user_responses: userResponses
        }
      };
    
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
    
    // Filtrar campos que se pueden graficar (select/checkbox con opciones)
    const graphableFields = fields.filter((field) => {
      const isValidType = field.type === 'select' || field.type === 'checkbox';
      const hasOptions = Array.isArray(field.options) && field.options.length > 0;
      
      if (isValidType && !hasOptions) {
        console.warn('Campo sin opciones (no se puede graficar):', { id: field.id, label: field.label, type: field.type });
      }
      
      return isValidType && hasOptions;
    });
    
    return graphableFields;
  });

  const numberFields = computed(() => {
    if (!selectedFormDetails.value) return [];
    const fields = selectedFormDetails.value.form.fields || []; 

    const graphableFields = fields.filter((field) => field.type === 'number');
    return graphableFields;
  });
  
  const geolocationFields = computed(() => {
    if (!selectedFormDetails.value) return [];
    const fields = selectedFormDetails.value.form.fields || [];
    
    const graphableFields = fields.filter((field) => field.type === 'geolocation');
    return graphableFields;
  });
  
  const geolocationResponses = (fieldId) => {
    const locations = [];
    const responses = selectedFormDetails.value?.form?.user_responses || [];

    responses.forEach((response) => {
      const fieldResponses = response.field_responses || [];
      
      // Buscar la respuesta del campo usando la misma lógica flexible
      const fieldResponse = fieldResponses.find((fr) => {
        const fieldIdMatch = fr.field_id === fieldId || 
                             String(fr.field_id) === String(fieldId) ||
                             fr.form_field_id === fieldId ||
                             String(fr.form_field_id) === String(fieldId);
        return fieldIdMatch && fr.value;
      });

      if (fieldResponse && fieldResponse.value) {
        try {
          let locationData = fieldResponse.value;
          
          // Si es string, intentar parsear como JSON
          if (typeof locationData === 'string') {
            const trimmed = locationData.trim();
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
              locationData = JSON.parse(trimmed);
            } else {
              // Si no es JSON, podría ser un formato diferente
              console.warn('⚠️ Formato de geolocalización no reconocido (string):', trimmed);
              return;
            }
          }
          
          // Manejar diferentes estructuras de datos de geolocalización
          let lat = null;
          let lng = null;
          let address = '';
          
          // Estructura 1: { latitude, longitude } o { lat, lng }
          if (locationData.latitude !== undefined && locationData.longitude !== undefined) {
            lat = parseFloat(locationData.latitude);
            lng = parseFloat(locationData.longitude);
          } else if (locationData.lat !== undefined && locationData.lng !== undefined) {
            lat = parseFloat(locationData.lat);
            lng = parseFloat(locationData.lng);
          }
          // Estructura 2: { coordinates: [lng, lat] } (GeoJSON)
          else if (locationData.coordinates && Array.isArray(locationData.coordinates)) {
            lng = parseFloat(locationData.coordinates[0]);
            lat = parseFloat(locationData.coordinates[1]);
          }
          // Estructura 3: { coords: { lat, lng } }
          else if (locationData.coords) {
            lat = parseFloat(locationData.coords.lat || locationData.coords.latitude);
            lng = parseFloat(locationData.coords.lng || locationData.coords.longitude);
          }
          
          // Construir dirección si está disponible
          if (locationData.address) {
            address = locationData.address;
          } else {
            const addressParts = [
              locationData.street,
              locationData.outdoor_number,
              locationData.indoor_number,
              locationData.neighborhood,
              locationData.postal_code,
              locationData.city,
              locationData.state,
              locationData.country
            ].filter(Boolean);
            address = addressParts.join(', ') || '';
          }
          
          if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
            locations.push({
              lat: lat,
              lng: lng,
              address: address.trim() || ''
            });
          } else {
            console.warn('Datos de geolocalización inválidos:', {
              fieldId,
              fieldResponse,
              locationData
            });
          }
        } catch (e) {
          console.error('Error parsing location data:', e, {
            fieldId,
            fieldResponseValue: fieldResponse.value
          });
        }
      }
    });
    
    return locations;
  };

  const numberFieldStats = computed(() => {
    const fields = numberFields.value;
    const userResponses = selectedFormDetails.value?.form?.user_responses || [];
    
    return fields.map((field) => {
      const numericValues = [];
      let totalResponses = 0;

      userResponses.forEach((userResponse) => {
        const fieldResponses = userResponse.field_responses || [];

        fieldResponses.forEach((fieldResponse) => { 
          const fieldIdMatch = fieldResponse.field_id === field.id ||
                              String(fieldResponse.field_id) === String(field.id) ||
                              fieldResponse.form_field_id === field.id ||
                              String(fieldResponse.form_field_id) === String(field.id);
          if (fieldIdMatch && fieldResponse.value !== null ) {
            totalResponses++;

            const numValue = parseFloat(fieldResponse.value);
            if (!isNaN(numValue)) {
              numericValues.push(numValue);
            }
          }
      });
    });

    const average = numericValues.length > 0
      ? numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length
      : 0;

      const min = numericValues.length > 0 ? Math.min(...numericValues) : 0;
      const max = numericValues.length > 0 ? Math.max(...numericValues) : 0;

      return {
        fieldId: field.id,
        fieldLabel: field.label,
        fieldType: field.type,
        average: average,
        totalResponses: totalResponses,
        validValues: numericValues.length,
        min: min,
        max: max
      }
    });
  });

  
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
  
      // Contar TODAS las respuestas, no solo usuarios únicos
      let totalResponseCount = 0;
      let matchedResponses = [];
      
      userResponses.forEach((userResponse) => {
        const fieldResponses = userResponse.field_responses || [];
  
        fieldResponses.forEach((fieldResponse) => {
          const fieldIdMatch = fieldResponse.field_id === field.id || 
                               String(fieldResponse.field_id) === String(field.id) ||
                               fieldResponse.form_field_id === field.id ||
                               String(fieldResponse.form_field_id) === String(field.id);
          
          if (fieldIdMatch) {
            totalResponseCount++; // Contar cada respuesta individual
            
            let value = fieldResponse.value;
            let values = [];
  
            try {
              // Intentar parsear como JSON
              if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
                const parsed = JSON.parse(value);
                values = Array.isArray(parsed) ? parsed : [parsed];
              } else {
                values = [value];
              }
            } catch (e) {
              values = [value];
            }
  
            values.forEach((v) => {
              const valueStr = String(v).trim();
              if (Object.prototype.hasOwnProperty.call(optionCounts, valueStr)) {
                optionCounts[valueStr]++;
              } else {
                console.warn('Opción no encontrada en el campo:', { 
                  fieldId: field.id, 
                  fieldLabel: field.label, 
                  value: valueStr, 
                  rawValue: v,
                  availableOptions: options 
                });
              }
            });
            
            matchedResponses.push({
              fieldResponse,
              values,
              userResponseId: userResponse.id
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
        totalResponses: totalResponseCount
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