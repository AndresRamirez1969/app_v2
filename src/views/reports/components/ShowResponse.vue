<script setup>
import { ref, onMounted, computed } from 'vue';
import axiosInstance from '@/utils/axios';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { mdiDownload, mdiRefresh, mdiArrowLeft, mdiMagnify } from '@mdi/js';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const formId = route.params.id;

const form = ref({});
const responses = ref([]);
const isLoading = ref(false);
const currentPage = ref(1);
const itemsPerPage = ref(20);
const totalResponses = ref(0);

const goBack = () => {
  router.back();
};

// Filtros
const filters = ref({
  dateRange: 'all', // 'all', 'today', 'week', 'month', 'custom'
  startDate: null,
  endDate: null,
  search: ''
});

// Opciones de filtro por fecha
const dateFilterOptions = [
  { label: 'Todas las fechas', value: 'all' },
  { label: 'Hoy', value: 'today' },
  { label: 'Esta semana', value: 'week' },
  { label: 'Este mes', value: 'month' },
  { label: 'Personalizado', value: 'custom' }
];

const getReports = async () => {
  isLoading.value = true;
  try {
    // Obtener información del formulario
    const formRes = await axiosInstance.get(`/forms/${formId}`);
    form.value = formRes.data;

    // Obtener respuestas con filtros y paginación
    const params = {
      page: currentPage.value,
      per_page: itemsPerPage.value,
      search: filters.value.search
    };

    // Agregar filtros de fecha
    if (filters.value.dateRange !== 'all') {
      const now = new Date();
      let startDate = new Date();

      switch (filters.value.dateRange) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'custom':
          if (filters.value.startDate && filters.value.endDate) {
            params.start_date = filters.value.startDate;
            params.end_date = filters.value.endDate;
          }
          break;
      }

      if (filters.value.dateRange !== 'custom') {
        params.start_date = startDate.toISOString().split('T')[0];
        params.end_date = now.toISOString().split('T')[0];
      }
    }

    const responsesRes = await axiosInstance.get(`/forms/${formId}/responses`, { params });
    responses.value = responsesRes.data.responses.data;
    totalResponses.value = responsesRes.data.responses.total;
  } catch (err) {
    console.error('Error fetching reports:', err);
    toast.error('Error al cargar los reportes');
  } finally {
    isLoading.value = false;
  }
};

const exportExcel = async () => {
  try {
    const response = await axiosInstance.get(`/forms/${formId}/export-excel`);
    if (response.data.download_url) {
      window.open(response.data.download_url, '_blank', 'noopener noreferrer');
    }
    toast.success('Reporte exportado correctamente');
  } catch (err) {
    console.error('Error exporting responses:', err);
    toast.error('Error al exportar el reporte');
  }
};

const exportResponse = async (responseId) => {
  try {
    const response = await axiosInstance.get(`/form-responses/${responseId}/pdf`);

    const pdfUrl = response.data.download_url;
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';

    const fileName = response.data.file_name || `respuestas_${form.value.name}_${new Date().toISOString().split('T')[0]}.pdf`;
    link.setAttribute('download', fileName);
    link.click();

    toast.success('Reporte exportado correctamente');
  } catch (err) {
    console.error('Error exporting responses:', err);
    toast.error('Error al exportar el reporte');
  }
};

const viewUserResponse = (response) => {
  router.push({
    name: 'UserResponse',
    params: {
      formId,
      responseId: response.id,
      userId: response.user.id
    }
  });
};

const formatDate = (dateString) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getFieldValue = (fieldId, fieldResponses) => {
  const response = fieldResponses.find((r) => r.form_field_id === fieldId);
  return response ? response.value : '—';
};

const totalPages = computed(() => {
  return Math.ceil(totalResponses.value / itemsPerPage.value);
});

const handlePageChange = (page) => {
  currentPage.value = page;
  getReports();
};

const handleFilterChange = () => {
  currentPage.value = 1;
  getReports();
};

onMounted(() => {
  getReports();
});
</script>

<template>
  <v-container fluid>
    <!-- Header con información del formulario -->
    <v-row class="mb-4">
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex align-center justify-space-between">
            <v-btn icon variant="text" @click="goBack" class="mr-3">
              <v-icon :icon="mdiArrowLeft" />
            </v-btn>
            <div>
              <h2 class="text-h5 mb-1">{{ form.name }}</h2>
              <p class="text-body-2 text-grey-darken-1 mb-0">
                {{ form.description || 'Sin descripción' }}
              </p>
            </div>
            <div class="d-flex gap-2">
              <v-btn color="primary" variant="outlined" @click="exportExcel" :loading="isLoading" :prepend-icon="mdiDownload">
                Exportar Todos (Excel)
              </v-btn>
              <v-btn color="secondary" variant="outlined" @click="getReports" :loading="isLoading" :prepend-icon="mdiRefresh">
                Actualizar
              </v-btn>
            </div>
          </v-card-title>
        </v-card>
      </v-col>
    </v-row>

    <!-- Filtros -->
    <v-row class="mb-4">
      <v-col cols="12">
        <v-card>
          <v-card-title>Filtros</v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12" md="3">
                <v-select
                  v-model="filters.dateRange"
                  :items="dateFilterOptions"
                  label="Rango de fechas"
                  variant="outlined"
                  density="comfortable"
                  @update:model-value="handleFilterChange"
                />
              </v-col>
              <v-col cols="12" md="3" v-if="filters.dateRange === 'custom'">
                <v-text-field
                  v-model="filters.startDate"
                  type="date"
                  label="Fecha inicial"
                  variant="outlined"
                  density="comfortable"
                  @update:model-value="handleFilterChange"
                />
              </v-col>
              <v-col cols="12" md="3" v-if="filters.dateRange === 'custom'">
                <v-text-field
                  v-model="filters.endDate"
                  type="date"
                  label="Fecha final"
                  variant="outlined"
                  density="comfortable"
                  @update:model-value="handleFilterChange"
                />
              </v-col>
              <v-col cols="12" md="3">
                <v-text-field
                  v-model="filters.search"
                  label="Buscar por usuario"
                  variant="outlined"
                  density="comfortable"
                  :prepend-inner-icon="mdiMagnify"
                  @keyup.enter="handleFilterChange"
                  @update:model-value="handleFilterChange"
                />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Tabla de respuestas -->
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title>
            Respuestas de Usuarios
            <v-spacer />
            <v-chip color="primary" size="small"> Página {{ currentPage }} de {{ totalPages }} </v-chip>
          </v-card-title>
          <v-card-text>
            <div v-if="isLoading" class="text-center py-8">
              <v-progress-circular indeterminate color="primary" size="64" />
              <p class="mt-4">Cargando respuestas...</p>
            </div>

            <div v-else-if="responses.length === 0" class="text-center py-8">
              <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-clipboard-text</v-icon>
              <h3 class="text-h6 text-grey-darken-1">No hay respuestas</h3>
              <p class="text-body-2 text-grey">No se encontraron respuestas con los filtros aplicados</p>
            </div>

            <div v-else>
              <!-- Tabla de respuestas -->
              <v-table>
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Fecha de respuesta</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="response in responses" :key="response.id" @click="viewUserResponse(response)" style="cursor: pointer">
                    <td>{{ response.user?.name || 'Usuario desconocido' }}</td>
                    <td>{{ formatDate(response.submitted_at) }}</td>
                    <td @click.stop>
                      <div class="d-flex gap-2">
                        <v-btn color="primary" variant="outlined" @click="exportResponse(response.id)"> Exportar PDF </v-btn>
                        <v-btn color="secondary" variant="outlined" @click="viewUserResponse(response)"> Ver Usuario </v-btn>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </v-table>

              <!-- Paginación -->
              <div class="d-flex justify-center mt-4">
                <v-pagination v-model="currentPage" :length="totalPages" :total-visible="7" @update:model-value="handlePageChange" />
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.gap-2 {
  gap: 8px;
}

/* Estilos para filas clickeables */
.clickable-row {
  transition: background-color 0.2s ease;
}

.clickable-row:hover {
  background-color: rgba(var(--v-theme-primary), 0.05) !important;
}

.clickable-row:active {
  background-color: rgba(var(--v-theme-primary), 0.1) !important;
}

/* Evitar que el hover afecte las celdas de acciones */
.clickable-row td:last-child:hover {
  background-color: transparent !important;
}
</style>
