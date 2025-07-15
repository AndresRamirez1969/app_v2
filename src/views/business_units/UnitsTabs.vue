<template>
  <v-container fluid class="pa-0">
    <v-row align="center" justify="space-between" class="ma-0 px-3 py-2">
      <v-col cols="auto" class="pa-0 d-flex align-center">
        <h1 class="text-h4 text-md-h3 font-weight-bold ma-0">Unidades</h1>
      </v-col>
      <v-col cols="12" md="12">
        <UiParentCard title="Gestionar Unidades">
          <template #action>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="filters.search"
                label="Buscar por Nombre o Alias"
                clearable
                variant="outlined"
                hide-details
                @keyup.enter="fetchUnits"
                prepend-inner-icon="mdi-magnify"
              />
            </v-col>
            <v-btn v-if="canCreate" color="primary" class="mt-4 px-2 py-1 text-sm" variant="flat" @click="showDialog = true">
              <v-icon start :icon="mdiPlus" /> Agregar<span class="d-none d-sm-inline">&nbsp;Unidad</span>
            </v-btn>
          </template>
          <UnitsView :units="units.data" :isLoading="isLoading" />
          <v-pagination v-model="currentPage" :length="units.last_page" :total-visible="5" @input="fetchUnits" class="mt-6" />
        </UiParentCard>
      </v-col>
    </v-row>
  </v-container>
  <v-card>
    <v-card-text>
      <CreateUnit v-model:dialog="showDialog" @unitCreated="handleUnitCreated" />
    </v-card-text>
  </v-card>
</template>

<script setup>
import { onMounted, ref, watch, computed } from 'vue';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import axiosInstance from '@/utils/axios';
import UnitsView from './UnitsView.vue';
import CreateUnit from './components/CreateUnit.vue';
import { useAuthStore } from '@/stores/auth';
import debounce from 'lodash/debounce';
import { mdiPencil, mdiPlus } from '@mdi/js';

const filters = ref({
  search: '',
  folio: ''
});

const auth = useAuthStore();
const currentPage = ref(1);
const units = ref({ data: [], last_page: 1 });
const isLoading = ref(false);

const canCreate = computed(() => {
  return auth.hasPermissions('businessUnit.create');
});

const fetchUnits = async () => {
  isLoading.value = true;
  try {
    const res = await axiosInstance.get('/business-units', {
      params: {
        search: filters.value.search,
        page: currentPage.value
      }
    });
    units.value = res.data;
  } catch (err) {
    console.error('Failed to fetch organizations', err);
  } finally {
    isLoading.value = false;
  }
};

const debouncedFetch = debounce(fetchUnits, 400);

const handleUnitCreated = () => {
  fetchUnits();
  showDialog.value = false;
};

const showDialog = ref(false);

onMounted(() => {
  fetchUnits();
});

watch(
  () => filters.value.search,
  () => {
    currentPage.value = 1;
    debouncedFetch();
  }
);
</script>
