<template>
  <v-container fluid>
    <v-row class="align-center justify-space-between mb-4">
      <v-col cols="auto" class="d-flex align-center">
        <h3 class="font-weight-medium mb-0">Formularios</h3>
        <v-btn :icon="mdiHelpCircleOutline" variant="text" color="primary" size="small" class="ml-2" @click="infoModal = true" />
      </v-col>
      <v-col cols="auto" class="d-flex align-center justify-end" v-if="canCreate">
        <v-btn color="primary" class="text-white" elevation="1" @click="router.push({ name: 'CreateForm', params: { id: auth.user.id } })">
          <v-icon start :icon="mdiPlus" />
          <span>Crear Formulario</span>
        </v-btn>
      </v-col>
    </v-row>

    <!-- Filtros -->
    <FormFilters @search="handleSearch" @filter="handleFilter" />

    <!-- Lista de formularios -->
    <v-row>
      <v-col>
        <FormView :items="forms.data" :isMobile="mdAndDown" :isLoading="isLoading" @formUpdated="fetchForms" />
      </v-col>
    </v-row>

    <v-dialog v-model="infoModal" max-width="600">
      <v-card>
        <v-card-title>Información sobre Formularios</v-card-title>
        <v-card-text>
          <p>Aqui podras ver los formularios que has creado, editarlos o publicarlos.</p>
          <p>
            Para publicar un formulario, haz click en el boton de "Acciones" y selecciona "Publicar". Una vez que se publique un formulario,
            estara disponible para que usuarios asignados lo contesten.
          </p>
          <p>Para editar o ver mas informacion sobre un formulario, haz click en cualquier parte de la fila del formulario.</p>
        </v-card-text>
        <v-card-actions>
          <v-btn color="primary" @click="infoModal = false">Cerrar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, watch, computed, onMounted } from 'vue';
import { useDisplay } from 'vuetify';
import FormView from './FormView.vue';
import FormFilters from './FormFilters.vue';
import axiosInstance from '@/utils/axios';
import { mdiPlus, mdiHelpCircleOutline } from '@mdi/js';
import { useAuthStore } from '@/stores/auth';
import debounce from 'lodash/debounce';
import { useRouter } from 'vue-router';

const { mdAndDown } = useDisplay();

const filters = ref({
  search: '',
  status: null,
  createdAtStart: null,
  createdAtEnd: null
});

const auth = useAuthStore();
const router = useRouter();
const isLoading = ref(false);
const infoModal = ref(false);

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
  return auth.hasPermissions('form.create');
});

const currentPage = ref(1);
const forms = ref({ data: [], last_page: 1 });

const handleSearch = (searchValue) => {
  filters.value.search = searchValue;
  currentPage.value = 1;
  debouncedFetch();
};

const handleFilter = (filterData) => {
  filters.value.status = filterData.status;
  filters.value.createdAtStart = filterData.createdAtStart;
  filters.value.createdAtEnd = filterData.createdAtEnd;
  currentPage.value = 1;
  fetchForms();
};

const fetchForms = async () => {
  try {
    isLoading.value = true;
    const res = await axiosInstance.get('/forms', {
      params: {
        search: filters.value.search,
        page: currentPage.value,
        status: filters.value.status,
        created_at_start: filters.value.createdAtStart,
        created_at_end: filters.value.createdAtEnd
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
watch(
  () => filters.value.status,
  () => {
    currentPage.value = 1;
    fetchForms();
  }
);
</script>
