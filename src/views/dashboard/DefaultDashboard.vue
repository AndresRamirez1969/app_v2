<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import axiosInstance from '@/utils/axios';
import { VCard, VCardText } from 'vuetify/components';
import VueApexCharts from 'vue3-apexcharts';
import { useAuthStore } from '@/stores/auth';
import AnalyticsReport from './components/AnalyticsReport.vue';
import { useToast } from 'vue-toastification';
import { mdiCalendar } from '@mdi/js';
import GeolocationMap from '@/utils/helpers/google/GeolocationMap.vue';
import SACards from '@/layouts/dashboard/cards/SACards.vue';
import GUCards from '@/layouts/dashboard/cards/GUCards.vue';
import { useCompletionData } from '@/composables/useCompletionData';

const { completion, scope, fetchCompletion } = useCompletionData();

const today = new Date();
const dd = String(today.getDate());
const mm = String(today.getMonth() + 1);
const yyyy = today.getFullYear();
const todayFormatted = `${yyyy}-${mm}-${dd}`;
const forms = ref({ data: [], last_page: 1 });
const isLoading = ref(false);
const filters = ref({
  dateRange: null
});
const dateMenu = ref(false);
const currentPage = ref(1);
const dateRangeText = ref('');

const auth = useAuthStore();
const roles = computed(() => auth.user?.roles || []);
const isSuperadmin = computed(() => roles.value.includes('superadmin'));

const organizationOptions = ref([]);
const loadingOrganizations = ref(false);
const selectedOrgForDashboard = ref(null);

const userOrganizationId = computed(() => auth.user?.organization_id);

const fetchOrganizations = async () => {
  if (!isSuperadmin.value) return;
  loadingOrganizations.value = true;
  try {
    const { data } = await axiosInstance.get('/organizations');
    organizationOptions.value = (data.data || []).map((o) => ({
      ...o,
      title: `${o.folio} - ${o.legal_name}`,
      value: o.id,
      logo: o.logo || null
    }));
  } catch {
    organizationOptions.value = [];
  } finally {
    loadingOrganizations.value = false;
  }
};
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
  filters.value.dateRange = null;
  dateRangeText.value = '';
  if (selectedFormId.value) {
    fetchFormStatus(selectedFormId.value);
  }
};

const onDateRangeChange = (dateRange) => {
  dateMenu.value = false;
  if (dateRange && dateRange.length === 2) {
    const [start, end] = dateRange;
    dateRangeText.value = `${formatDateForAPI(start)} - ${formatDateForAPI(end)}`;
    filters.value.dateRange = {
      start: formatDateForAPI(start),
      end: formatDateForAPI(end)
    };
  } else {
    dateRangeText.value = '';
    filters.value.dateRange = null;
  }
  fetchForms();
  if (selectedFormId.value) {
    fetchFormStatus(selectedFormId.value);
  }
};

const getOrgParams = () => {
  const params = {};

  if (isSuperadmin.value) {
    if (selectedOrgForDashboard.value) {
      params.organization_id = selectedOrgForDashboard.value;
    }
  } else {
    if (userOrganizationId.value) {
      params.organization_id = userOrganizationId.value;
    }
  }
  return params;
};

const fetchForms = async () => {
  isLoading.value = true;
  try {
    const params = { page: currentPage.value, ...getOrgParams(), start_date: filters.value.dateRange?.start, end_date: filters.value.dateRange?.end };

    const res = await axiosInstance.get('/forms', { params: params });
    forms.value = res.data;
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
    const params = { ...getOrgParams() };

    if (filters.value.dateRange) {
      params.start_date = filters.value.dateRange.start;
      params.end_date = filters.value.dateRange.end;
    }

    const res = await axiosInstance.get(`/forms/${formId}/responses`, { params: params });
    selectedFormDetails.value = res.data.data || res.data;
  } catch (err) {
    console.error('Failed to fetch form details', err);
    selectedFormDetails.value = null;
  } finally {
    isLoadingFormDetails.value = false;
  }
};

const dateRangeForAPI = computed(() => {
  if (filters.value.dateRange && filters.value.dateRange.start && filters.value.dateRange.end) {
    return {
      start: filters.value.dateRange.start,
      end: filters.value.dateRange.end
    };
  }
  // Por defecto: día actual
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;
  return {
    start: todayStr,
    end: todayStr
  };
});

watch(selectedOrgForDashboard, () => {
  selectedFormId.value = null;
  selectedFormDetails.value = null;
  fetchForms();
  // Actualizar completion data
  if (selectedOrgForDashboard.value) {
    fetchCompletion(selectedOrgForDashboard.value, dateRangeForAPI.value);
  }
});

watch(
  () => dateRangeForAPI.value,
  () => {
    if (selectedOrgForDashboard.value) {
      fetchCompletion(selectedOrgForDashboard.value, dateRangeForAPI.value);
    }
  },
  { deep: true }
);

const getDateFilterText = () => {
  if (filters.value.dateRange) {
    return ` (${filters.value.dateRange.start} - ${filters.value.dateRange.end})`;
  }
  return '';
};

// Calcular estadísticas de formularios generales
const formStats = computed(() => {
  const allForms = forms.value.data || [];
  const total = allForms.length;

  let withResponses = 0;
  let withoutResponses = 0;

  if (isSuperadmin.value && !selectedOrgForDashboard.value) {
    return { total: 0, withResponses: 0, withoutResponses: 0 };
  }

  withResponses = allForms.filter((f) => (f.responses_count || 0) > 0).length;
  withoutResponses = allForms.filter((f) => (f.responses_count || 0) === 0).length;

  return { total, withResponses, withoutResponses };
});

// Opciones para el select de formularios
const formOptions = computed(() => {
  const allForms = forms.value.data || [];
  return allForms.map((form) => ({
    title: form.title || form.name || `Formulario ${form.id}`,
    value: form.id,
    subtitle: `${form.responses_count || 0} respuestas`
  }));
});

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

  let responses = selectedFormDetails.value.form.user_responses || [];

  if (filters.value.dateRange) {
    responses = responses.filter((response) => {
      if (!response.submitted_at) return false;
      const responseDate = formatDateForAPI(response.submitted_at);
      return responseDate >= filters.value.dateRange.start && responseDate <= filters.value.dateRange.end;
    });
  }

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

// Contar respuestas por cada campo de select/checkbox
const fieldResponseStats = computed(() => {
  if (!selectedFormDetails.value) return [];

  const fields = selectAndCheckboxFields.value;
  let userResponses = selectedFormDetails.value.form.user_responses || [];

  // Filtrar respuestas por fecha de submitted_at si hay filtro activo
  if (filters.value.dateRange) {
    userResponses = userResponses.filter((response) => {
      if (!response.submitted_at) return false;
      const responseDate = formatDateForAPI(response.submitted_at);
      return responseDate >= filters.value.dateRange.start && responseDate <= filters.value.dateRange.end;
    });
  }

  return fields.map((field) => {
    const options = field.options || [];

    // Inicializar contador para cada opción
    const optionCounts = {};
    options.forEach((option) => {
      optionCounts[option] = 0;
    });

    // Contar respuestas filtradas
    userResponses.forEach((userResponse) => {
      const fieldResponses = userResponse.field_responses || [];

      fieldResponses.forEach((fieldResponse) => {
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

// Generar configuraciones de gráficas para cada campo
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
      text: `${fieldStat.fieldLabel}${getDateFilterText()}`,
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

const formsChartData = computed(() => {
  const allForms = forms.value.data || [];

  if (isSuperadmin.value && !selectedOrgForDashboard.value) {
    return {
      categories: [],
      responseData: [],
      assignmentsData: [],
      formNames: [],
      totalExpected: 0,
      totalCompleted: 0
    };
  }

  const categories = allForms.map(form => form.name || form.folio);
  const responseData = allForms.map(form => form.responses_count || 0);
  const assignmentsData = allForms.map(form => {
    const totalAssignments = form.auditadoRoles?.length || 0;
    const responses = form.responses_count || 0;
    return Math.max(0, totalAssignments - responses);
  });
  const formNames = allForms.map(form => form.name || form.folio);
  
  return {
    categories,
    responseData,
    assignmentsData,
    formNames,
    // Agregar datos agregados del composable
    totalExpected: completion.value.expected,
    totalCompleted: completion.value.completed
  };
});

const chartOptions = computed(() => ({
  chart: {
    type: 'bar',
    height: 350,
    toolbar: { show: true },
    stacked: true,  // Gráfica apilada

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
    categories: formsChartData.value.categories,
    labels: {
      style: { fontSize: '12px' },
      rotate: -45,
      rotateAlways: formsChartData.value.categories.length > 5
    }
  },
  yaxis: {
    title: { text: 'Cantidad' }
  },
  legend: {
    position: 'top',
    horizontalAlign: 'center'
  },
  colors: ['#4caf50', '#2196f3'],  
  tooltip: {
    y: {
      formatter: (val) => `${val}`
    }
  },
  title: {
    text: 'Respuestas vs Asignaciones por Formulario',
    align: 'left',
    style: { fontSize: '18px', fontWeight: 600 }
  },
  fill: {
    opacity: 1
  }
}));

const chartSeries = computed(() => [
  {
    name: 'Respuestas',
    data: formsChartData.value.responseData
  },
  {
    name: 'Faltantes',
    data: formsChartData.value.assignmentsData
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
// Datos para el componente AnalyticsReport
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

const toast = useToast();
const geoPermissionWarning = ref(false);

const checkGeoPermission = async () => {
  // Si ya está aceptado en localStorage, nunca mostrar el warning
  if (localStorage.getItem('geo_permission_granted') === '1') {
    geoPermissionWarning.value = false;
    return;
  }
  // Soporte para navegadores que no implementan navigator.permissions
  if (navigator.permissions && navigator.permissions.query) {
    try {
      const status = await navigator.permissions.query({ name: 'geolocation' });
      geoPermissionWarning.value = status.state !== 'granted';
      // Revalidación automática si el usuario cambia el permiso en tiempo real
      status.onchange = () => {
        if (status.state === 'granted') {
          localStorage.setItem('geo_permission_granted', '1');
          geoPermissionWarning.value = false;
        } else {
          localStorage.removeItem('geo_permission_granted');
          geoPermissionWarning.value = true;
        }
      };
    } catch {
      // Si ocurre un error, fallback a localStorage
      geoPermissionWarning.value = localStorage.getItem('geo_permission_granted') !== '1';
    }
  } else {
    // Fallback para navegadores antiguos: solo mostramos el warning si no está en localStorage
    geoPermissionWarning.value = localStorage.getItem('geo_permission_granted') !== '1';
    // Opcional: puedes mostrar un toast informativo
    toast.info('Tu navegador no soporta la detección automática de permisos de ubicación. Si ya diste permiso, recarga la página.');
  }
};

const requestGeolocation = () => {
  if (typeof window !== 'undefined' && navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        localStorage.setItem('geo_lat', String(pos.coords.latitude));
        localStorage.setItem('geo_lng', String(pos.coords.longitude));
        localStorage.setItem('geo_permission_granted', '1');
        geoPermissionWarning.value = false;
        toast.success('Permiso de ubicación aceptado.');
      },
      () => {
        localStorage.removeItem('geo_lat');
        localStorage.removeItem('geo_lng');
        localStorage.removeItem('geo_permission_granted');
        geoPermissionWarning.value = true;
        toast.warning('No se otorgó permiso de ubicación.');
      }
    );
  } else {
    toast.warning('Tu navegador no soporta geolocalización.');
  }
};

watch(
  () => filters.value.dateRange,
  () => {
    fetchForms();
  },
  { deep: true }
)

onMounted(() => {
  fetchForms();
  if (isSuperadmin.value) {
    fetchOrganizations();
  }
  checkGeoPermission();

  if (selectedOrgForDashboard.value) {
    fetchCompletion(selectedOrgForDashboard.value, dateRangeForAPI.value);
  }
});

</script>

<template>
  <v-container fluid>
    <!-- Warning de geolocalización con botón -->
    <v-alert
      v-if="geoPermissionWarning"
      type="warning"
      variant="tonal"
      class="mb-4 text-left geo-warning"
      border="start"
      prominent
      icon="mdi-map-marker-off"
    >
      <div class="d-flex align-center">
        <div class="flex-grow-1">
          <strong>Advertencia:</strong> No has aceptado el permiso de ubicación. Varias funcionalidades de la plataforma pueden no funcionar
          correctamente hasta que lo permitas en tu navegador.
        </div>
        <v-btn color="warning" variant="outlined" class="ml-4" @click="requestGeolocation"> Permitir ubicación </v-btn>
      </div>
    </v-alert>

    <!-- Header -->
    <v-row class="mb-4">
      <v-col cols="12">
        <div class="d-flex justify-space-between align-center">
          <div class="d-flex flex-column">
            <h2 class="text-h4 font-weight-bold">Dashboard</h2>
            <p class="text-body-1 text-grey-darken-1">Hoy es {{ todayFormatted }}</p>
          </div>
          <div class="d-flex align-center" style="min-width: 300px">
            <!-- Filtro por rango de fechas -->
            <v-menu v-model="dateMenu" :close-on-content-click="false" transition="scale-transition" offset-y min-width="auto">
              <template #activator="{ props }">
                <v-text-field
                  v-bind="props"
                  v-model="dateRangeText"
                  placeholder="Seleccionar rango de fechas (vacío para ver todos)"
                  :prepend-inner-icon="mdiCalendarRange"
                  readonly
                  clearable
                  density="compact"
                  variant="outlined"
                  hide-details
                  style="min-width: 280px"
                  @click:clear="clearDateFilter"
                />
              </template>
              <v-date-picker
                v-model="filters.dateRange"
                range
                @update:model-value="onDateRangeChange"
                :max="new Date().toISOString().substr(0, 10)"
                locale="es"
              />
            </v-menu>
          </div>
        </div>
      </v-col>
      <template v-if="isSuperadmin && !selectedOrgForDashboard">
        <SACards /> 
      </template>
      <template v-if="selectedOrgForDashboard">
        <GUCards :selected-organization-id="selectedOrgForDashboard" :date-range="dateRangeForAPI" />
      </template>
    </v-row>
    <template v-if="isSuperadmin">
      <div class="d-flex align-center justify-between mb-2">
        <v-label>Organización para filtrar graficas <span class="text-error">*</span></v-label>
        <v-icon :icon="mdiInformationSlabCircleOutline" color="primary" size="22" class="ml-2" style="cursor: pointer" />
      </div>
      <div class="padding-bottom: 18px;">
        <v-select
          v-model="selectedOrgForDashboard"
          :items="organizationOptions"
          :loading="loadingOrganizations"
          item-title="title"
          item-value="value"
          clearable
          hide-details
          variant="outlined"
          color="primary"
          class="mt-2 mb-4 asignaciones-full-length"
          required
        />
      </div>
    </template>

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
              <VueApexCharts type="bar" height="350" :options="chartOptions" :series="chartSeries" />
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

            <!-- Mostrar contenido cuando hay detalles cargados -->
            <div v-else-if="selectedFormDetails">
              <!-- Mapas de geolocalización -->
              <v-row v-if="geolocationFields.length > 0" class="mb-6">
                <v-col cols="12">
                  <v-card elevation="2">
                    <v-card-text>
                      <h3 class="text-h5 font-weight-bold mb-4">Mapas de Geolocalización{{ getDateFilterText() }}</h3>

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

            <!-- Mensaje cuando no hay formulario seleccionado -->
            <div v-else-if="!selectedFormId" class="text-center py-8 text-grey">
              <v-icon size="48" color="grey-lighten-1">mdi-chart-bar</v-icon>
              <p class="mt-2">Selecciona un formulario para ver el análisis de respuestas</p>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
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
/* Solo dejamos layout, quitamos color de fondo/texto para warning */
.geo-warning {
  text-align: left !important;
  padding-left: 24px;
}
</style>
