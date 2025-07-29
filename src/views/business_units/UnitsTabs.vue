<template>
  <v-container fluid class="pa-0">
    <v-row align="center" justify="space-between" class="ma-0 px-3 py-2">
      <v-tabs v-model="tab" background-color="primary" dark grow class="mb-4">
        <v-tab value="unidades">Unidades</v-tab>
        <v-tab value="grupos">Grupos</v-tab>
      </v-tabs>
      <template v-if="tab === 'unidades'">
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
              <v-btn v-if="canCreate" color="primary" class="mt-4 px-2 py-1 text-sm" variant="flat" @click="showGroupDialog = true">
                <v-icon start :icon="mdiPlus" /> Agregar<span class="d-none d-sm-inline">&nbsp;Grupo</span>
              </v-btn>
            </template>
            <UnitsView :units="units.data" :isLoading="isLoading" />
          </UiParentCard>
        </v-col>
      </template>
      <template v-else-if="tab === 'grupos'">
        <UnitsGroupsTab />
      </template>
    </v-row>
  </v-container>

  <CreateUnitGroup v-model:dialog="showGroupDialog" @groupCreated="handleGroupCreated" />
  <CreateUnit v-model:dialog="showDialog" @unitCreated="handleUnitCreated" />
</template>

<script setup>
import { onMounted, ref, watch, computed } from 'vue';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import axiosInstance from '@/utils/axios';
import UnitsView from './UnitsView.vue';
import CreateUnit from './components/CreateUnit.vue';
import { useAuthStore } from '@/stores/auth';
import debounce from 'lodash/debounce';
import { mdiPlus } from '@mdi/js';
import UnitsGroupsTab from './unit_groups/UnitsGroupsTab.vue';
import CreateUnitGroup from './unit_groups/component/CreateUnitGroup.vue';

const tab = ref('unidades');
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

const handleGroupCreated = () => {
  fetchUnits();
  showGroupDialog.value = false;
};

const showDialog = ref(false);
const showGroupDialog = ref(false);

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
