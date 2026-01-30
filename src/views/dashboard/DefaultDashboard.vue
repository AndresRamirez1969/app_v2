<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import axiosInstance from '@/utils/axios';
import VueApexCharts from 'vue3-apexcharts';
import { useAuthStore } from '@/stores/auth';
import { useToast } from 'vue-toastification';
import { mdiArrowLeft, mdiInformationSlabCircle, mdiMapMarkerOff } from '@mdi/js';
import SACards from '@/layouts/dashboard/cards/SACards.vue';
import GUCards from '@/layouts/dashboard/cards/GUCards.vue';
import { useRouter } from 'vue-router';
import { useCompletionData } from '@/composables/useCompletionData';
import { getTodayDate } from '@/constants/constants';
import DashboardFilters from './components/DashboardFilters.vue';
import FormDetailChart from './components/FormDetailChart.vue';
import { useTheme } from 'vuetify';

const theme = useTheme();
const isDark = computed(() => theme.global.current.value.dark);

const { completion } = useCompletionData();
const router = useRouter();
const todayFormatted = getTodayDate();
const forms = ref({ data: [], last_page: 1 });
const isLoading = ref(false);
const currentPage = ref(1);

const dateFilters = ref({
  created_at_start: null,
  created_at_end: null
});

const frequencyFilter = ref(null);

const auth = useAuthStore();
const roles = computed(() => auth.user?.roles || []);
const isSuperadmin = computed(() => roles.value.includes('superadmin'));
const isAdmin = computed(() => roles.value.includes('admin'));

const checkDashboard = async () => {
  if (isAdmin.value || isSuperadmin.value) {
    return true;
  }
  try {
    const { data } = await axiosInstance.get('/my-forms', {
      params: { page: 1, per_page: 1 }
    });

    const hasForms = (data.data?.length || 0) > 0;

    if (!hasForms) {
      router.replace('/mis-formularios');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error checking dashboard access:', error);
    // En caso de error, redirigir por seguridad
    router.replace('/mis-formularios');
    return false;
  }
};

//Variables para organizations
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

const selectedFormId = ref(null);
const formResponseByRole = ref([]);
const isLoadingFormResponse = ref(false);

const getOrgParams = () => {
  const params = {};

  if (isSuperadmin.value) {
    if (selectedOrgForDashboard.value) {
      params.organization_id = selectedOrgForDashboard.value;
    }
  } else {
    selectedOrgForDashboard.value = userOrganizationId.value;
  }
  return params;
};

const dateRangeForAPI = computed(() => {
  if (dateFilters.value.created_at_start && dateFilters.value.created_at_end) {
    return {
      start: dateFilters.value.created_at_start,
      end: dateFilters.value.created_at_end
    };
  }
  const todayStr = getTodayDate();
  return {
    start: todayStr,
    end: todayStr
  };
});

const fetchFormResponseByRole = async (formId) => {
  if (!formId) return;

  isLoadingFormResponse.value = true;
  try {
    const dateRange = dateRangeForAPI.value;
    const todayStr = getTodayDate();

    const startDate = dateRange?.start || todayStr;
    const endDate = dateRange?.end || todayStr;

    const params = {
      ...getOrgParams(),
      start_date: startDate,
      end_date: endDate
    };
    if (frequencyFilter.value) {
      params.frequency = frequencyFilter.value;
    }
    let allResponses = [];
    let page = 1;
    let lastPage = 1;

    do {
      const { data } = await axiosInstance.get(`/forms/${formId}/responses/reports`, {
        params: { ...params, page, per_page: 100 }
      });

      const responses = Array.isArray(data?.responses) ? data.responses : [];
      allResponses = [...allResponses, ...responses];
      console.log('📋 Responses data received:', {
        responsesCount: responses.length,
        allResponsesCount: allResponses.length,
        responses: responses.map((r) => r.response?.user?.name || r.user?.name || 'Sin nombre')
      });

      if (data.last_page !== undefined) {
        lastPage = data.last_page;
        page++;
      } else {
        break;
      }
    } while (page <= lastPage);

    const nameCounts = {};

    allResponses.forEach((resp) => {
      const user = resp.response?.user || resp.user || {};
      const name = user.name || user.email || user.id || 'Sin nombre';

      if (!name) {
        nameCounts['Sin Rol'] = (nameCounts['Sin Rol'] || 0) + 1;
      } else {
        nameCounts[name] = (nameCounts[name] || 0) + 1;
      }
    });

    formResponseByRole.value = Object.entries(nameCounts).map(([name, count]) => ({
      name: name,
      count: count
    }));
  } catch (err) {
    console.error('Failed to fetch form response by role', err);
  } finally {
    isLoadingFormResponse.value = false;
  }
};

const handleFilter = (filters) => {
  dateFilters.value = {
    created_at_start: filters.created_at_start || null,
    created_at_end: filters.created_at_end || null
  };

  frequencyFilter.value = filters.frequency || null;

  fetchForms();
};

//const hasFrequencyFilter = computed(() => !!frequencyFilter.value);

const fetchForms = async () => {
  isLoading.value = true;
  try {
    const dateRange = dateRangeForAPI.value;
    const todayStr = getTodayDate();

    const startDate = dateRange?.start || todayStr;
    const endDate = dateRange?.end || todayStr;

    const params = {
      page: currentPage.value,
      ...getOrgParams(),
      start_date: startDate,
      end_date: endDate
    };

    if (frequencyFilter.value) {
      params.frequency = frequencyFilter.value;
    }

    const res = await axiosInstance.get('/forms', { params: params });
    forms.value = res.data;

    console.log('📋 Forms data received:', {
      formsCount: res.data.data?.length || 0,
      totalResponses: res.data.data?.reduce((sum, f) => sum + (f.responses_count || 0), 0) || 0,
      forms: res.data.data?.map((f) => ({ name: f.name, responses_count: f.responses_count })) || []
    });
  } catch (err) {
    console.error('Failed to fetch forms', err);
  } finally {
    isLoading.value = false;
  }
};

watch(selectedFormId, (newFormId) => {
  if (newFormId) {
    fetchFormResponseByRole(newFormId);
  } else {
    formResponseByRole.value = [];
  }
});

watch(
  () => userOrganizationId.value,
  (orgId) => {
    if (!isSuperadmin.value && orgId) {
      // Solo llamar si no es superadmin, GUCards manejará su propia llamada
      // fetchCompletion(orgId, dateRangeForAPI.value, frequencyFilter.value);
    }
  },
  { immediate: true }
);

watch(selectedOrgForDashboard, () => {
  selectedFormId.value = null;
  fetchForms();
});

watch(
  () => dateRangeForAPI.value,
  () => {},
  { deep: true }
);

const getDaysInRange = (startStr, endStr) => {
  if (!startStr || !endStr) return 1;
  const start = new Date(startStr + 'T12:00:00');
  const end = new Date(endStr + 'T12:00:00');
  if (end < start) return 1;
  const diffMs = end - start;
  const days = Math.ceil(diffMs / (24 * 60 * 60 * 1000)) + 1;
  return Math.max(1, days);
};

const formsChartData = computed(() => {
  // Si hay un formulario seleccionado, mostrar datos por roles
  if (selectedFormId.value && formResponseByRole.value.length > 0) {
    return {
      categories: formResponseByRole.value.map((item) => item.name),
      responseData: formResponseByRole.value.map((item) => item.count),
      assignmentsData: [],
      formNames: [],
      formIds: [],
      totalExpected: 0,
      totalCompleted: 0,
      isRoleView: true
    };
  }

  // Vista normal: por formularios
  const allForms = forms.value.data || [];

  if (isSuperadmin.value && !selectedOrgForDashboard.value) {
    return {
      categories: [],
      responseData: [],
      assignmentsData: [],
      formNames: [],
      totalExpected: 0,
      totalCompleted: 0,
      isRoleView: false
    };
  }

  const range = dateRangeForAPI.value;
  const daysInRange = getDaysInRange(range?.start, range?.end);

  const categories = allForms.map((form) => form.name || form.folio);
  const responseData = allForms.map((form) => form.responses_count || 0);
  const assignmentsData = allForms.map((form) => {
    const assignedCount = form.auditadoRoles?.length || 0;
    const responses = form.responses_count || 0;
    const frequency = form.frequency || form.frequency_type;
    const expectedInRange = frequency === 'once_per_day' ? assignedCount * daysInRange : assignedCount;
    return Math.max(0, expectedInRange - responses);
  });
  const formNames = allForms.map((form) => form.name || form.folio);
  const formIds = allForms.map((form) => form.id);

  return {
    categories,
    responseData,
    assignmentsData,
    formNames,
    formIds,
    totalExpected: completion.value.expected,
    totalCompleted: completion.value.completed,
    isRoleView: false
  };
});

const hasNoForms = computed(() => {
  // No mostrar el mensaje si está cargando
  if (isLoading.value) {
    console.log('hasNoForms: isLoading is true, returning false');
    return false;
  }

  // Si es superadmin y no hay organización seleccionada, no mostrar el mensaje
  if (isSuperadmin.value && !selectedOrgForDashboard.value) {
    console.log('hasNoForms: superadmin without org, returning false');
    return false;
  }

  // Verificar si hay formularios
  const allForms = forms.value?.data || [];
  const hasOrg = isSuperadmin.value ? !!selectedOrgForDashboard.value : true;
  const shouldShow = hasOrg && allForms.length === 0;

  // Debug temporal
  console.log('hasNoForms final check:', {
    isLoading: isLoading.value,
    isSuperadmin: isSuperadmin.value,
    selectedOrgForDashboard: selectedOrgForDashboard.value,
    frequencyFilter: frequencyFilter.value,
    allFormsLength: allForms.length,
    hasOrg,
    shouldShow,
    willReturn: shouldShow
  });

  return shouldShow;
});

const chartOptions = computed(() => {
  const isRoleView = formsChartData.value.isRoleView;
  const dark = isDark.value;
  const textColor = dark ? '#e0e0e0' : undefined;
  const titleColor = dark ? '#fff' : undefined;

  return {
    chart: {
      type: 'bar',
      height: 350,
      toolbar: { show: true },
      stacked: !isRoleView,
      events: isRoleView
        ? {}
        : {
            dataPointSelection: (event, chartContext, config) => {
              const dataPointIndex = config.dataPointIndex;
              const clickedFormId = formsChartData.value.formIds[dataPointIndex];
              const hasResponses = formsChartData.value.responseData[dataPointIndex] > 0;
              if (clickedFormId && hasResponses) {
                selectedFormId.value = clickedFormId;
              } else {
                console.log('No hay respuestas para este formulario en el rango de fechas seleccionado.');
              }
            }
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
        colors: [dark ? '#fff' : '#304758']
      }
    },
    xaxis: {
      categories: formsChartData.value.categories,
      labels: {
        style: { fontSize: '12px', colors: textColor },
        rotate: -45,
        rotateAlways: formsChartData.value.categories.length > 5
      },
      title: {
        text: isRoleView ? 'Roles' : 'Formularios',
        style: { color: titleColor }
      }
    },
    yaxis: {
      title: {
        text: 'Cantidad de Respuestas',
        style: { color: titleColor }
      }
    },
    legend: {
      position: 'top',
      horizontalAlign: 'center',
      show: !isRoleView,
      labels: { colors: textColor }
    },
    colors: isRoleView ? ['#171781'] : ['#171781', '#64261C'],
    tooltip: {
      theme: dark ? 'dark' : 'light',
      y: {
        formatter: (val) => `${val}`
      }
    },
    title: {
      text: isRoleView ? 'Respuestas por Rol' : 'Respuestas vs Asignaciones por Formulario',
      align: 'left',
      style: { fontSize: '18px', fontWeight: 600, color: titleColor }
    },
    fill: {
      opacity: 1
    }
  };
});

const showFormDetails = computed(() => !!selectedFormId.value);

const chartSeries = computed(() => {
  const isRoleView = formsChartData.value.isRoleView;
  if (isRoleView) {
    return [
      {
        name: 'Respuestas',
        data: formsChartData.value.responseData
      }
    ];
  }
  return [
    {
      name: 'Respuestas',
      data: formsChartData.value.responseData
    },
    {
      name: 'Faltantes',
      data: formsChartData.value.assignmentsData
    }
  ];
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

onMounted(async () => {
  const hasAccess = await checkDashboard();
  if (!hasAccess) {
    return;
  }
  fetchForms();
  if (isSuperadmin.value) {
    fetchOrganizations();
  }
  checkGeoPermission();
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
      :icon="mdiMapMarkerOff"
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
          <DashboardFilters @filter="handleFilter" />
        </div>
      </v-col>
      <template v-if="isSuperadmin && !selectedOrgForDashboard">
        <SACards />
      </template>
      <template v-if="selectedOrgForDashboard">
        <GUCards :selected-organization-id="selectedOrgForDashboard" :date-range="dateRangeForAPI" :frequency="frequencyFilter" />
      </template>
    </v-row>

    <!-- <template v-if="!hasFrequencyFilter">
    <v-row class="mb-6">
      <v-col cols="12">
        <v-card elevation="2">
          <v-card-text class="text-center py-12">
            <v-icon size="64" color="primary" class="mb-4">mdi-filter</v-icon>
            <h3 class="text-h5 font-weight-bold mb-2">Selecciona una frecuencia</h3>
            <p class="text-body-1 text-medium-emphasis">
              Por favor, selecciona una frecuencia de formulario para ver los datos del dashboard.
            </p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </template> -->

    <template v-if="isSuperadmin">
      <div class="d-flex align-center justify-between mb-2">
        <v-label>Organización para filtrar graficas <span class="text-error">*</span></v-label>
        <v-icon :icon="mdiInformationSlabCircle" color="primary" size="22" class="ml-2" style="cursor: pointer" />
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
            <div class="d-flex justify-space-between align-center mb-4">
              <h3 class="text-h5 font-weight-bold">Respuestas x Formulario</h3>
              <v-btn v-if="showFormDetails" variant="outlined" color="primary" @click="selectedFormId = null">
                <v-icon :icon="mdiArrowLeft" start />
                Volver a vista general
              </v-btn>
            </div>
            <div v-if="isLoading" class="text-center py-8">
              <v-progress-circular indeterminate color="primary" />
            </div>
            <div v-else-if="hasNoForms" class="text-center py-8">
              <p class="text-h6 text-medium-emphasis">No existen formularios con esa frecuencia</p>
            </div>
            <div v-else>
              <VueApexCharts type="bar" height="350" :options="chartOptions" :series="chartSeries" />
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <FormDetailChart
      v-if="showFormDetails"
      :form-id="selectedFormId"
      :organization-id="selectedOrgForDashboard"
      :date-range="dateRangeForAPI"
      @close="selectedFormId = null"
    />
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
