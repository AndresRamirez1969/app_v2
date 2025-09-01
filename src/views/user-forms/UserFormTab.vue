<script setup>
import { ref, watch, onMounted } from 'vue';
import { useDisplay } from 'vuetify';
import UserFormView from './UserFormView.vue';
import axiosInstance from '@/utils/axios';
import { useAuthStore } from '@/stores/auth';
import debounce from 'lodash/debounce';
import UserFormFilters from './UserFormFilters.vue';

const { mdAndDown } = useDisplay();

const filters = ref({
  search: '',
  folio: ''
});

const auth = useAuthStore();

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

    const formResponseStatus = await Promise.all(
      res.data.data.map(async (form) => {
        try {
          const responseRes = await axiosInstance.get(`/forms/${form.id}/check-response`);
          return {
            ...form,
            has_responded: responseRes.data.has_responded,
            frequency: responseRes.data.frequency,
            can_respond: responseRes.data.can_respond
          };
        } catch (err) {
          console.error('Failed to fetch form response status', err);
          isLoading.value = false;
        }
      })
    );

    forms.value = {
      ...res.data,
      data: formResponseStatus
    };
    console.log(formResponseStatus);
  } catch (err) {
    console.error('Failed to fetch forms', err);
  } finally {
    isLoading.value = false;
  }
};

const handleSearch = (search) => {
  filters.value.search = search;
  fetchForms();
};

const handleFilter = (filter) => {
  filters.value.filter = filter;
  fetchForms();
};

onMounted(() => {
  fetchForms();
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
  <v-container fluid>
    <v-row class="align-center justify-space-between mb-4">
      <v-col cols="auto" class="d-flex align-center">
        <h3 class="font-weight-medium mb-0">Tus Formularios</h3>
      </v-col>
    </v-row>
    <UserFormFilters @search="handleSearch" @filter="handleFilter" />
    <v-row>
      <v-col>
        <UserFormView :items="forms.data" :isMobile="mdAndDown" :isLoading="isLoading" @formUpdated="fetchForms" />
      </v-col>
    </v-row>
  </v-container>
</template>
