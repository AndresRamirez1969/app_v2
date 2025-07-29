<script setup>
import { ref, onMounted } from 'vue';
import axiosInstance from '@/utils/axios';
const isLoading = ref(false);
const currentPage = ref(1);
const groups = ref({ data: [], last_page: 1 });

const fetchGroups = async () => {
  isLoading.value = true;
  try {
    const res = await axiosInstance.get('/business-unit-groups', {
      params: {
        page: currentPage.value
      }
    });
    groups.value = res.data;
  } catch (err) {
    console.error('Error al agarrar grupos', err);
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  fetchGroups();
});

const headers = [
  { title: 'Nombre', key: 'name' },
  { title: 'Unidades', key: 'business_unit' }
];
</script>

<template>
  <v-data-table
    :headers="headers"
    :items="groups.data"
    class="elevation-1"
    item-value="id"
    density="comfortable"
    :loading="isLoading"
    loading-text="Cargando..."
    hide-default-footer
  >
    <template #item.name="{ item }">
      {{ item.name }}
    </template>
    <template #item.business_unit="{ item }">
      <span v-if="item.business_units && item.business_units.length">
        {{ item.business_units.map((unit) => unit.legal_name).join(', ') }}
      </span>
    </template>
  </v-data-table>
</template>
