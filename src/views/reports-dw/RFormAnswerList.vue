<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import RFormAnswerFilters from './RFormAnswerFilters.vue';
import RFormAnswerTableCards from './RFormAnswerTableCards.vue';
import RFormAnswerCharts from './RFormAnswerCharts.vue';
import { mdiChevronUp, mdiChevronDown, mdiDotsHorizontal, mdiEye, mdiDomainOff, mdiArrowLeft, mdiFileChartCheckOutline } from '@mdi/js';
import axios from '@/utils/axios';

const route = useRoute();
const router = useRouter();

const props = defineProps({
  formId: {
    type: [String, Number],
    required: false
  },
  isMobile: Boolean,
  isLoading: Boolean
});

const items = ref([]);
const loading = ref(false);

const sortBy = ref('folio');
const sortDesc = ref(false);
const page = ref(1);
const itemsPerPage = ref(10);

const formData = ref(null);

// Filtros reactivos
const filters = ref({
  search: '',
  report_status: null,
  user_id: null,
  folio: '',
  score_min: null,
  score_max: null,
  start_date: null,
  end_date: null
});

const resolvedFormId = computed(() => {
  const val = props.formId ?? route.params.formId ?? route.params.form;
  return val && val !== '0' && val !== 0 && val !== '' ? val : null;
});

const hasRating = computed(() => {
  const raw = formData.value?.form?.has_rating ?? formData.value?.has_rating ?? false;
  return raw === true || raw === 1 || raw === '1';
});

const fetchFormData = async () => {
  if (!resolvedFormId.value) return;
  try {
    const { data } = await axios.get(`/forms/${resolvedFormId.value}`);
    formData.value = data.data || data.form || data;
  } catch (e) {
    formData.value = null;
  }
};

const fetchAnswers = async () => {
  loading.value = true;
  try {
    if (!resolvedFormId.value) {
      items.value = [];
      loading.value = false;
      return;
    }
    const params = {
      search: filters.value.search,
      report_status: filters.value.report_status,
      user_id: filters.value.user_id,
      folio: filters.value.folio,
      score_min: filters.value.score_min,
      score_max: filters.value.score_max,
      start_date: filters.value.start_date,
      end_date: filters.value.end_date
    };

    Object.keys(params).forEach((key) => {
      if (params[key] === null || params[key] === '' || params[key] === undefined) {
        delete params[key];
      }
    });

    const { data } = await axios.get(`/forms/${resolvedFormId.value}/responses/reports`, { params });

    if (!data || !Array.isArray(data.responses)) {
      items.value = [];
      loading.value = false;
      return;
    }

    items.value = data.responses.flatMap((resp) => {
      const userName =
        resp.response?.user?.name ||
        resp.response?.user_name ||
        resp.user?.name ||
        resp.user_name ||
        (resp.response?.user && typeof resp.response.user === 'string' ? resp.response.user : undefined) ||
        '—';

      const base = {
        folio: resp.response.folio ?? resp.response.id,
        name: userName,
        answer_date: resp.response.submitted_at || '—',
        score: resp.response.score
      };

      if (!resp.reports || !resp.reports.length) {
        return [
          {
            id: resp.response.id,
            ...base,
            status: resp.response.status,
            ponderacion:
              hasRating.value &&
              resp.response.ponderacion !== null &&
              resp.response.ponderacion !== undefined &&
              Number(resp.response.ponderacion) !== 0
                ? resp.response.ponderacion
                : null,
            reports: [],
            raw: resp
          }
        ];
      }

      return resp.reports.map((report) => ({
        id: report.id,
        ...base,
        status: report.status,
        ponderacion:
          hasRating.value && report.ponderacion !== null && report.ponderacion !== undefined && Number(report.ponderacion) !== 0
            ? report.ponderacion
            : null,
        report,
        raw: { ...resp, report }
      }));
    });
  } catch (e) {
    console.error('Error al obtener reportes:', e);
    items.value = [];
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  await fetchFormData();
  await fetchAnswers();
});

const toggleSort = (column) => {
  if (sortBy.value === column) {
    sortDesc.value = !sortDesc.value;
  } else {
    sortBy.value = column;
    sortDesc.value = false;
  }
};

const formatDate = (dateString) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const sortedItems = computed(() => {
  return [...(items.value || [])].sort((a, b) => {
    const aVal = a[sortBy.value]?.toString().toLowerCase() ?? '';
    const bVal = b[sortBy.value]?.toString().toLowerCase() ?? '';
    return aVal.localeCompare(bVal) * (sortDesc.value ? -1 : 1);
  });
});

const paginatedItems = computed(() => {
  const start = (page.value - 1) * itemsPerPage.value;
  return sortedItems.value.slice(start, start + itemsPerPage.value);
});

const viewAnswer = (answer) => {
  // router.push({ name: 'ShowReport', params: { formId: resolvedFormId.value, responseId: answer.folio, reportId: answer.id } });
};

const goToIndex = () => {
  router.push({ name: 'Reports DW' });
};

const closeReport = async (reportId) => {
  try {
    await axios.put(`/reports/${reportId}`, { status: 'closed' });
    await fetchAnswers();
  } catch (e) {
    console.error('Error cerrando el reporte:', e);
  }
};

watch(
  () => [resolvedFormId.value],
  async () => {
    await fetchFormData();
    await fetchAnswers();
    page.value = 1;
  }
);

watch(
  () => ({ ...filters.value }),
  async () => {
    page.value = 1;
    await fetchAnswers();
  }
);

const handleSearch = (val) => {
  filters.value.search = val;
  page.value = 1;
  fetchAnswers();
};

const handleFilter = (newFilters) => {
  filters.value = { ...filters.value, ...newFilters };
  page.value = 1;
  fetchAnswers();
};

const formatScope = (scope) => {
  switch (scope) {
    case 'organization':
      return 'Organización';
    case 'business':
      return 'Empresa';
    case 'business_unit':
      return 'Ubicación';
    case 'business_unit_group':
      return 'Grupo';
    default:
      return scope;
  }
};
const formatFrequency = (freq) => {
  switch (freq) {
    case 'once_per_day':
      return 'Una vez por día';
    case 'multiple_per_day':
      return 'Múltiples veces por día';
    default:
      return freq;
  }
};
const mapRoleName = (name) => {
  if (!name) return '';
  if (name === 'superadmin') return 'Super Administrador';
  if (name === 'admin') return 'Administrador';
  if (name === 'sponsor') return 'Sponsor';
  return name;
};

// Tabs
const activeTab = ref('table');
</script>

<template>
  <v-container fluid>
    <v-row class="align-center mb-6" no-gutters>
      <v-col cols="auto" class="d-flex align-center">
        <v-btn
          icon
          variant="text"
          class="px-3 py-2"
          style="border-radius: 8px; border: 1px solid #ccc; min-width: 44px; height: 44px"
          @click="goToIndex"
        >
          <v-icon :icon="mdiArrowLeft" />
        </v-btn>
        <h3 class="font-weight-medium ml-3 mb-0" v-if="formData">Reportes - {{ formData.name || formData.form?.name || 'Formulario' }}</h3>
      </v-col>
    </v-row>

    <!-- Información general del formulario -->
    <v-row>
      <v-col cols="12" md="4" class="d-flex justify-center align-center">
        <template v-if="formData?.logo">
          <v-img :src="formData.logo" max-width="320" max-height="320" class="rounded-lg logo-avatar" alt="Logo" style="background: none" />
        </template>
        <template v-else>
          <div
            class="d-flex align-center justify-center logo-avatar"
            style="width: 320px; height: 320px; background-color: #f5f5f5; border-radius: 12px"
          >
            <span class="text-medium-emphasis">Sin logo</span>
          </div>
        </template>
      </v-col>
      <v-col cols="12" md="8">
        <v-card-title class="font-weight-bold text-h6 pb-2" style="padding-left: 0.5rem">Información general</v-card-title>
        <v-table class="rounded-lg elevation-1 card-shadow">
          <tbody>
            <tr>
              <td class="font-weight-bold text-subtitle-1" style="width: 1%; white-space: nowrap">Folio</td>
              <td>
                <span v-if="formData?.folio">{{ formData.folio }}</span>
                <span v-else>No disponible</span>
              </td>
            </tr>
            <tr>
              <td class="font-weight-bold text-subtitle-1" style="width: 1%; white-space: nowrap">Nombre</td>
              <td>{{ formData?.name || 'No disponible' }}</td>
            </tr>
            <tr>
              <td class="font-weight-bold text-subtitle-1" style="width: 1%; white-space: nowrap">Descripción</td>
              <td>{{ formData?.description || 'No disponible' }}</td>
            </tr>
            <tr>
              <td class="font-weight-bold text-subtitle-1" style="width: 1%; white-space: nowrap">Alcance</td>
              <td>
                <template v-if="formData?.assignment_scope === 'organization' && formData?.organization">
                  <a :href="`/organizaciones/${formData.organization.id}`" style="color: #1976d2; text-decoration: underline">
                    {{ formData.organization.folio }} - {{ formData.organization.legal_name || formData.organization.name }}
                  </a>
                </template>
                <template v-else-if="formData?.assignment_scope === 'business' && formData?.business">
                  <a :href="`/negocios/${formData.business.id}`" style="color: #1976d2; text-decoration: underline">
                    {{ formData.business.folio }} - {{ formData.business.name }}
                  </a>
                </template>
                <template v-else-if="formData?.assignment_scope === 'business_unit' && formData?.business_unit">
                  <a :href="`/ubicaciones/${formData.business_unit.id}`" style="color: #1976d2; text-decoration: underline">
                    {{ formData.business_unit.folio }} - {{ formData.business_unit.name }}
                  </a>
                </template>
                <template v-else-if="formData?.assignment_scope === 'business_unit_group' && formData?.business_unit_group">
                  <a :href="`/grupos/${formData.business_unit_group.id}`" style="color: #1976d2; text-decoration: underline">
                    {{ formData.business_unit_group.id }} - {{ formData.business_unit_group.name }}
                  </a>
                </template>
                <template v-else>
                  {{ formatScope(formData?.assignment_scope) }}
                </template>
              </td>
            </tr>
            <tr>
              <td class="font-weight-bold text-subtitle-1" style="width: 1%; white-space: nowrap">Frecuencia</td>
              <td>{{ formatFrequency(formData?.frequency) }}</td>
            </tr>
            <tr>
              <td class="font-weight-bold text-subtitle-1" style="width: 1%; white-space: nowrap">¿Tiene ponderación?</td>
              <td>{{ formData?.has_rating ? 'Sí' : 'No' }}</td>
            </tr>
            <tr>
              <td class="font-weight-bold text-subtitle-1" style="width: 1%; white-space: nowrap">Creado por</td>
              <td>
                <span v-if="formData?.created_by">{{ formData.created_by.name || formData.created_by.email }}</span>
                <span v-else>No disponible</span>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-col>
    </v-row>

    <!-- Filtros entre información general y tabs -->
    <div style="padding-top: 32px">
      <RFormAnswerFilters :key="formData?.id" :hasRating="hasRating" @search="handleSearch" @filter="handleFilter" />
    </div>

    <!-- Tabs para tabla/cards y gráficas -->
    <v-tabs v-model="activeTab" class="mt-6 mb-4">
      <v-tab value="table">Respuestas</v-tab>
      <v-tab value="charts">Gráficas</v-tab>
    </v-tabs>

    <v-window v-model="activeTab">
      <v-window-item value="table">
        <RFormAnswerTableCards
          :items="paginatedItems"
          :sortedItems="sortedItems"
          :page="page"
          :itemsPerPage="itemsPerPage"
          :sortBy="sortBy"
          :sortDesc="sortDesc"
          :hasRating="hasRating"
          :loading="loading"
          @update:page="page = $event"
          @sort="toggleSort"
          @view="viewAnswer"
          @closeReport="closeReport"
        />
      </v-window-item>
      <v-window-item value="charts">
        <RFormAnswerCharts :items="items" :hasRating="hasRating" :loading="loading" :form-id="resolvedFormId" :filters="filters" />
      </v-window-item>
    </v-window>
  </v-container>
</template>

<style scoped>
.logo-avatar {
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  overflow: hidden;
  width: 320px;
  height: 320px;
  min-width: 320px;
  min-height: 320px;
  max-width: 320px;
  max-height: 320px;
}
.logo-avatar img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 12px;
  display: block;
}
.card-shadow {
  box-shadow: 0px 2px 8px 0px rgba(60, 60, 60, 0.08) !important;
  border-radius: 16px !important;
  background: #fff !important;
  border: 1px solid #eaeaea !important;
}
.row-clickable:hover {
  background: #f5f5f5;
  transition: background 0.2s;
}
.folio-cell,
.name-cell,
.answer-date-cell {
  padding: 12px 16px;
  border-bottom: 1px solid #e0e0e0;
}
.actions-cell {
  width: 60px;
  text-align: center;
  padding: 0 8px;
}
.custom-dropdown {
  border-radius: 10px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  padding: 4px 0;
  background: white;
}
.actions-btn {
  min-width: 32px !important;
  min-height: 32px !important;
}
.v-container {
  padding-left: 24px !important;
  padding-right: 24px !important;
  padding-top: 24px !important;
  padding-bottom: 24px !important;
}

/* Responsive table visibility */
.desktop-table {
  display: block;
}
.mobile-table {
  display: none;
}
@media (max-width: 960px) {
  .v-container {
    padding-left: 8px !important;
    padding-right: 8px !important;
    padding-top: 16px !important;
    padding-bottom: 16px !important;
  }
  .answer-mobile-card {
    box-shadow: 0px 2px 8px 0px rgba(60, 60, 60, 0.08) !important;
    border-radius: 16px !important;
    background: #fff !important;
    border: 1px solid #eaeaea !important;
  }
  .desktop-table {
    display: none !important;
  }
  .mobile-table {
    display: block !important;
  }
}

/* Mobile card styles for answers */
.answer-mobile-card .logo-avatar-mobile,
.logo-img-cover {
  display: none !important;
}
.folio-link {
  text-decoration: underline;
  color: #1976d2 !important;
  font-weight: 500;
}
.folio-small {
  font-size: 0.85em;
}
</style>
