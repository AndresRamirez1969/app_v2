<template>
  <v-container fluid class="pa-0">
    <v-row align="center" justify="space-between" class="ma-0 px-3 py-2">
      <v-col cols="auto" class="pa-0 d-flex align-center">
        <h1 class="text-h4 text-md-h3 font-weight-bold ma-0">Unidades</h1>
      </v-col>
      <v-col cols="12" md="12">
        <UiParentCard title="Gestionar Unidades">
          <template #action>
            <v-btn color="primary" class="mt-4 px-2 py-1 text-sm" variant="flat" @click="showDialog = true">
              <v-icon start :icon="mdiPlus" /> Agregar<span class="d-none d-sm-inline">&nbsp;Organización</span>
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
import { onMounted, ref, watch } from 'vue';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import axiosInstance from '@/utils/axios';
import UnitsView from './UnitsView.vue';
import CreateUnit from './components/CreateUnit.vue';

const search = ref('');
const currentPage = ref(1);
const units = ref({ data: [], last_page: 1 });
const isLoading = ref(false);

const fetchUnits = async () => {
  isLoading.value = true;
  try {
    const res = await axiosInstance.get('/business-units', {
      params: {
        search: search.value,
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

const handleUnitCreated = () => {
  fetchUnits();
  showDialog.value = false;
};

const showDialog = ref(false);

onMounted(() => {
  fetchUnits();
});

watch(currentPage, fetchUnits);
</script>
