<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import { mdiPlus, mdiHelpCircleOutline } from '@mdi/js';
import FormList from './FormList.vue';
import FormFilters from './FormFilters.vue';
import axios from '@/utils/axios';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const forms = ref([]);
const totalItems = ref(0);
const { mdAndDown } = useDisplay();

const searchText = ref('');
const filterOptions = ref({});
const page = ref(1);
const itemsPerPage = ref(10);

const auth = useAuthStore();
const canView = ref(false);
const canCreate = ref(false);
const isLoading = ref(false);

function hasPermission(permission) {
  return Array.isArray(auth.user?.permissions) && auth.user.permissions.includes(permission);
}

const fetchForms = async () => {
  isLoading.value = true;
  try {
    const params = {
      ...filterOptions.value,
      search: searchText.value,
      page: page.value,
      per_page: itemsPerPage.value
    };
    const { data } = await axios.get('/forms', { params });
    // Laravel paginator: data.data = items, data.meta.total = total
    forms.value = data.data;
    totalItems.value = data.meta?.total || data.total || 0;
  } catch (error) {
    console.error('Error fetching forms:', error);
    forms.value = [];
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
  canCreate.value = hasPermission('form.create');
  await fetchForms();
});

const goToCreate = () => {
  router.push('/formularios/crear');
};

function handleSearch(text) {
  searchText.value = text;
  page.value = 1;
  fetchForms();
}

async function handleFilter(filters) {
  filterOptions.value = filters;
  page.value = 1;
  await fetchForms();
}

watch(page, () => {
  fetchForms();
});
</script>

<template>
  <div v-if="canView">
    <v-container fluid>
      <v-row class="align-center justify-space-between mb-4">
        <v-col cols="auto" class="d-flex align-center">
          <h3 class="font-weight-medium mb-0">Formularios</h3>
        </v-col>
        <v-col cols="auto" class="d-flex align-center justify-end" v-if="canCreate">
          <v-btn color="primary" class="text-white" elevation="1" @click="goToCreate">
            <template v-if="mdAndDown">
              <v-icon :icon="mdiPlus" start />
              <span>Agregar</span>
            </template>
            <template v-else>
              <v-icon :icon="mdiPlus" start />
              <span>Agregar Formulario</span>
            </template>
          </v-btn>
        </v-col>
      </v-row>

      <FormFilters @search="handleSearch" @filter="handleFilter" class="mb-4" />

      <v-row>
        <v-col>
          <FormList
            :items="forms"
            :isMobile="mdAndDown"
            :isLoading="isLoading"
            :page="page"
            :itemsPerPage="itemsPerPage"
            :totalItems="totalItems"
            @update:page="page = $event"
          />
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>
