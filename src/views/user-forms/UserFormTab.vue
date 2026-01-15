<script setup>
import { ref, watch, onMounted } from "vue";
import { useDisplay } from "vuetify";
import UserFormView from "./UserFormView.vue";
import axiosInstance from "@/utils/axios";
import { useAuthStore } from "@/stores/auth";
import debounce from "lodash/debounce";
import UserFormFilters from "./UserFormFilters.vue";

const { mdAndDown } = useDisplay();

const filters = ref({
  search: "",
  folio: "",
});

const auth = useAuthStore();

const currentPage = ref(1);
const forms = ref({ data: [], last_page: 1 });
const isLoading = ref(false);

const fetchForms = async () => {
  isLoading.value = true;
  try {
    const res = await axiosInstance.get("/my-forms", {
      params: {
        search: filters.value.search,
        page: currentPage.value,
      },
    });

    forms.value = res.data;
  } catch (err) {
    console.error("Failed to fetch forms", err);
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
        <UserFormView
          :items="forms.data"
          :isMobile="mdAndDown"
          :isLoading="isLoading"
          @formUpdated="fetchForms"
        />
      </v-col>
    </v-row>
  </v-container>
</template>
