<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import axios from '@/utils/axios';
import { useAuthStore } from '@/stores/auth';
import ReportList from './RFormList.vue';
import RFormFilters from './RFormFilters.vue';

const router = useRouter();
const reports = ref([]);
const totalItems = ref(0);
const { mdAndDown } = useDisplay();

const searchText = ref('');
const filterOptions = ref({});
const page = ref(1);
const itemsPerPage = ref(10);

const auth = useAuthStore();
const canView = ref(false);
const isLoading = ref(false);

function hasPermission(permission) {
  return Array.isArray(auth.user?.permissions) && auth.user.permissions.includes(permission);
}

const fetchReports = async () => {
  isLoading.value = true;
  try {
    const params = {
      ...filterOptions.value,
      search: searchText.value,
      page: page.value,
      per_page: itemsPerPage.value
    };
    const { data } = await axios.get('/forms/responses/all', { params });
    reports.value = data.data;
    totalItems.value = data.meta?.total || data.total || 0;
  } catch (error) {
    console.error('Error fetching reports:', error);
    reports.value = [];
    totalItems.value = 0;
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  if (!hasPermission('form.viewAny')) {
    canView.value = false;
    router.replace('/403');
    return;
  }
  canView.value = true;
  await fetchReports();
});

function handleSearch(text) {
  searchText.value = text;
  page.value = 1;
  fetchReports();
}

async function handleFilter(filters) {
  filterOptions.value = filters;
  page.value = 1;
  await fetchReports();
}

watch(page, () => {
  fetchReports();
});
</script>

<template>
  <div v-if="canView">
    <v-container fluid>
      <v-row class="align-center justify-space-between mb-4">
        <v-col cols="auto" class="d-flex align-center">
          <h3 class="font-weight-medium mb-0">Reportes</h3>
        </v-col>
      </v-row>

      <RFormFilters @search="handleSearch" @filter="handleFilter" class="mb-4" />

      <v-row>
        <v-col>
          <ReportList :items="reports" :isMobile="mdAndDown" :isLoading="isLoading" />
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>
