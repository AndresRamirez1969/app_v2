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
              <v-btn
                v-if="canCreate"
                color="primary"
                class="mt-4 px-2 py-1 text-sm"
                variant="flat"
                @click="router.push({ name: 'CreateForm', params: { id: auth.user.id } })"
              >
                <v-icon start :icon="mdiPlus" /> Crear<span class="d-none d-sm-inline">&nbsp;Formulario</span>
              </v-btn>
            </template>
            <FormView :items="forms.data" :isMobile="isMobile" :isLoading="isLoading" @formUpdated="fetchForms" />
          </UiParentCard>
        </v-col>
      </v-row>
    </v-container>
  </v-row>
</template>

<script setup>
import { ref, watch, computed, onMounted } from 'vue';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import FormView from './FormView.vue';
import axiosInstance from '@/utils/axios';
import { mdiPlus } from '@mdi/js';
import { useAuthStore } from '@/stores/auth';
import debounce from 'lodash/debounce';
import { useRouter } from 'vue-router';

const filters = ref({
  search: '',
  folio: ''
});

const auth = useAuthStore();
const router = useRouter();

// Detectar si es móvil
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

const canCreate = computed(() => {
  return auth.hasPermissions('business.create');
});

const currentPage = ref(1);
const forms = ref({ data: [], last_page: 1 });
const isLoading = ref(false);

const fetchForms = async () => {
  isLoading.value = true;
  try {
    const res = await axiosInstance.get('/forms', {
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
