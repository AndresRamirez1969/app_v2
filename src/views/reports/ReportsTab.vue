<template>
  <v-row>
    <v-container fluid class="pa-0">
      <v-row align="center" justify="space-between" class="ma-0 px-3 py-2">
        <v-col cols="auto" class="pa-0 d-flex align-center">
          <h1 class="text-h4 text-md-h3 font-weight-bold ma-0">Reportes</h1>
        </v-col>
      </v-row>

      <!-- Mover ReportCards debajo de ReportsView -->
      <v-row class="px-3">
        <v-col cols="12" md="12">
          <v-col cols="12" class="pa-0">
            <div class="d-flex align-center mb-2" style="gap: 16px">
              <v-text-field
                v-model="filters.search"
                placeholder="Buscar por Nombre o Folio"
                clearable
                density="compact"
                variant="outlined"
                hide-details
                style="min-width: 220px"
                @keyup.enter="fetchForms"
                :prepend-inner-icon="mdiMagnify"
                class="flex-grow-1"
              />

              <!-- Date Picker mejorado -->
              <v-menu v-model="dateMenu" :close-on-content-click="false" transition="scale-transition" offset-y min-width="auto">
                <template #activator="{ props }">
                  <v-text-field
                    v-bind="props"
                    v-model="filters.date"
                    placeholder="Filtrar por fecha"
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

              <!-- Botón para aplicar filtros -->
              <v-btn color="primary" variant="flat" @click="applyFilters" :loading="isLoading" :prepend-icon="mdiFilter"> Filtrar </v-btn>
            </div>

            <!-- Mostrar filtros activos -->
            <div v-if="hasActiveFilters" class="d-flex align-center gap-2 mb-3">
              <span class="text-caption text-grey">Filtros activos:</span>

              <v-chip v-if="filters.search" closable size="small" color="primary" variant="outlined" @click:close="clearSearchFilter">
                Búsqueda: {{ filters.search }}
              </v-chip>

              <v-chip v-if="filters.date" closable size="small" color="primary" variant="outlined" @click:close="clearDateFilter">
                Fecha: {{ formatDate(filters.date) }}
              </v-chip>

              <v-btn size="small" variant="text" color="error" @click="clearAllFilters"> Limpiar todos </v-btn>
            </div>
          </v-col>

          <ReportsView :items="forms.data" :isMobile="isMobile" :isLoading="isLoading" @formUpdated="fetchForms" />
        </v-col>
      </v-row>
      <v-row class="mb-4 px-3">
        <v-col cols="12">
          <ReportCards :items="forms.data" />
        </v-col>
      </v-row>
    </v-container>
  </v-row>
</template>

<script setup>
import { ref, watch, computed, onMounted, onUnmounted } from 'vue';
import ReportsView from './ReportsView.vue';
import ReportCards from './components/ReportCards.vue';
import axiosInstance from '@/utils/axios';
import { useAuthStore } from '@/stores/auth';
import debounce from 'lodash/debounce';
import { mdiCalendar, mdiFilter, mdiMagnify } from '@mdi/js';

const filters = ref({
  search: '',
  folio: '',
  date: null
});

const dateMenu = ref(false);
const auth = useAuthStore();

// Detectar si es móvil
const isMobile = ref(false);

const checkMobile = () => {
  isMobile.value = window.innerWidth < 768;
};

const currentRole = computed(() => {
  return auth.user?.roles?.[0]?.id || null;
});

// Computed para verificar si hay filtros activos
const hasActiveFilters = computed(() => {
  return filters.value.search || filters.value.date;
});

// Formatear fecha para mostrar en chips
const formatDate = (dateString) => {
  if (!dateString) return '';

  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Limpiar filtros individuales
const clearSearchFilter = () => {
  filters.value.search = '';
  fetchForms();
};

const clearDateFilter = () => {
  filters.value.date = null;
  fetchForms();
};

const clearAllFilters = () => {
  filters.value.search = '';
  filters.value.date = null;
  currentPage.value = 1;
  fetchForms();
};

// Manejar cambio de fecha
const onDateChange = (date) => {
  dateMenu.value = false;
  // No hacer fetch automático, esperar a que el usuario haga clic en "Filtrar"
};

// Aplicar filtros
const applyFilters = () => {
  currentPage.value = 1;
  fetchForms();
};

watch(
  () => auth.permissions,
  (perms) => {
    if (perms.length > 0) {
      console.log('Permisos cargados', perms);
    }
  },
  { immediate: true }
);

const currentPage = ref(1);
const forms = ref({ data: [], last_page: 1 });
const isLoading = ref(false);

const fetchForms = async () => {
  isLoading.value = true;
  try {
    const params = {
      search: filters.value.search,
      page: currentPage.value
    };

    // Agregar filtro de fecha si está seleccionada
    if (filters.value.date) {
      // Convertir fecha a formato YYYY-MM-DD
      const selectedDate = new Date(filters.value.date);
      const formattedDate = selectedDate.toISOString().split('T')[0];

      // Filtrar por fecha de creación (created_at)
      params.created_at = formattedDate;
    }

    const res = await axiosInstance.get('/forms/responses/all');
    forms.value = res.data;

    console.log('Formularios filtrados:', {
      total: res.data.total,
      fecha: filters.value.date,
      params: params
    });
  } catch (err) {
    console.error('Failed to fetch forms', err);
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  fetchForms();
  checkMobile();
  window.addEventListener('resize', checkMobile);
});

// Solo hacer debounce para la búsqueda de texto, no para la fecha
const debouncedFetch = debounce(() => {
  if (filters.value.search !== '') {
    currentPage.value = 1;
    fetchForms();
  }
}, 400);

watch(
  () => filters.value.search,
  (newValue) => {
    if (newValue === '') {
      // Si se limpia la búsqueda, hacer fetch inmediatamente
      currentPage.value = 1;
      fetchForms();
    } else {
      // Si hay texto, usar debounce
      debouncedFetch();
    }
  }
);

// Cleanup del event listener
onUnmounted(() => {
  window.removeEventListener('resize', checkMobile);
});
</script>

<style scoped>
.gap-2 {
  gap: 8px;
}

.flex-grow-1 {
  flex-grow: 1;
}
</style>
