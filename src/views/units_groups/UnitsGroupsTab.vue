<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs"></BaseBreadcrumb>
  <v-row>
    <v-col cols="12" md="12">
      <UiParentCard title="Gestionar Unidades">
        <template #action>
          <v-btn color="primary" class="mt-4 px-2 py-1 text-sm" variant="flat" @click="showDialog = true"> Agregar Unidad </v-btn>
        </template>
        <v-pagination v-model="currentPage" :length="units.last_page" :total-visible="5" @input="fetchUnits" class="mt-6" />
      </UiParentCard>
    </v-col>
  </v-row>
</template>

<script setup>
import { onMounted, ref, shallowRef, watch } from 'vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import axiosInstance from '@/utils/axios';

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

const showDialog = ref(false);
const page = ref({ title: 'Grupos' });
const breadcrumbs = shallowRef([
  {
    title: 'Unidades de Negocio',
    disabled: true,
    href: '#'
  }
]);
onMounted(() => {
  fetchUnits();
});

watch(currentPage, fetchUnits);
</script>
