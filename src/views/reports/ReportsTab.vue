<template>
  <v-row>
    <v-container fluid class="pa-0">
      <v-row align="center" justify="space-between" class="ma-0 px-3 py-2">
        <v-col cols="auto" class="pa-0 d-flex align-center">
          <h1 class="text-h4 text-md-h3 font-weight-bold ma-0">Reportes</h1>
        </v-col>
      </v-row>
      <v-row class="mb-4 px-3">
        <v-col cols="12">
          <ReportCards :items="forms.data" />
        </v-col>
      </v-row>
      <v-row class="px-3">
        <v-col cols="12" md="12">
          <UiParentCard>
            <template #action>
              <v-col cols="12" class="pa-0">
                <v-text-field
                  v-model="filters.search"
                  label="Buscar por Nombre o Folio"
                  clearable
                  density="comfortable"
                  variant="outlined"
                  hide-details
                  @keyup.enter="fetchForms"
                  prepend-inner-icon="mdi-magnify"
                  class="w-100"
                />
              </v-col>
            </template>
            <ReportsView :items="forms.data" :isMobile="isMobile" :isLoading="isLoading" @formUpdated="fetchForms" />
          </UiParentCard>
        </v-col>
      </v-row>
    </v-container>
  </v-row>
</template>

<script setup>
import { ref, watch, computed, onMounted } from 'vue';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import ReportsView from './ReportsView.vue';
import ReportCards from './components/ReportCards.vue';
import axiosInstance from '@/utils/axios';
import { useAuthStore } from '@/stores/auth';
import debounce from 'lodash/debounce';

const filters = ref({
  search: '',
  folio: ''
});

const auth = useAuthStore();

// Detectar si es móvil
const isMobile = ref(false);

const checkMobile = () => {
  isMobile.value = window.innerWidth < 768;
};

const currentRole = computed(() => {
  return auth.user?.roles?.[0]?.id || null;
});

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
    const res = await axiosInstance.get('/forms', {
      params: {
        search: filters.value.search,
        page: currentPage.value,
        supervisor_role_id: currentRole.value,
        status: 'active'
      }
    });
    forms.value = res.data;
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

const debouncedFetch = debounce(fetchForms, 400);

watch(
  () => filters.value.search,
  () => {
    currentPage.value = 1;
    debouncedFetch();
  }
);
</script>
