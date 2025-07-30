<script setup>
import { ref, watch, onMounted } from 'vue';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import UserFormView from './UserFormView.vue';
import axiosInstance from '@/utils/axios';
import { useAuthStore } from '@/stores/auth';
import debounce from 'lodash/debounce';

const filters = ref({
  search: '',
  folio: ''
});

const auth = useAuthStore();

const isMobile = ref(false);

const checkMobile = () => {
  isMobile.value = window.innerWidth < 768;
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
    const res = await axiosInstance.get('/my-forms', {
      params: {
        search: filters.value.search,
        page: currentPage.value
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

<template>
  <v-row>
    <v-container fluid class="pa-0">
      <v-row align="center" justify="space-between" class="ma-0 px-3 py-2">
        <v-col cols="auto" class="pa-0 d-flex align-center">
          <h1 class="text-h4 text-md-h3 font-weight-bold ma-0">Formularios</h1>
        </v-col>
        <v-col cols="12" md="12">
          <UiParentCard title="Gestionar Formularios">
            <template #action>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="filters.search"
                  label="Buscar por Nombre o Folio"
                  clearable
                  density="comfortable"
                  variant="outlined"
                  hide-details
                  @keyup.enter="fetchForms"
                  prepend-inner-icon="mdi-magnify"
                />
              </v-col>
            </template>
            <UserFormView :items="forms.data" :isMobile="isMobile" :isLoading="isLoading" @formUpdated="fetchForms" />
          </UiParentCard>
        </v-col>
      </v-row>
    </v-container>
  </v-row>
</template>
