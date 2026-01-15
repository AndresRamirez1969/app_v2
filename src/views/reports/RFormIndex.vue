<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useDisplay } from "vuetify";
import axios from "@/utils/axios";
import { useAuthStore } from "@/stores/auth";
import ReportList from "./RFormList.vue";
import RFormFilters from "./RFormFilters.vue";

const router = useRouter();
const reports = ref([]);
const totalItems = ref(0);
const meta = ref({});
const { mdAndDown } = useDisplay();

const searchText = ref("");
const filterOptions = ref({});
const page = ref(1);
const itemsPerPage = ref(10);

const auth = useAuthStore();
const canView = ref(false);
const isLoading = ref(false);

// Replica la lógica de viewAny del backend
function canViewReports(user) {
  if (!user) return false;

  if (user.roles?.includes("superadmin")) return true;

  if (user.roles?.includes("admin")) {
    return !!user.organization_id;
  }

  if (user.roles?.includes("sponsor")) {
    return !!user.business_id;
  }

  if (user.roles?.some((r) => ["auditor", "supervisor"].includes(r))) {
    return !!user.has_linked_forms;
  }

  if (user.permissions?.includes("report.view")) {
    return !!user.organization_id;
  }

  return false;
}

function hasPermission(permission) {
  return (
    Array.isArray(auth.user?.permissions) && auth.user.permissions.includes(permission)
  );
}

// Obtiene los reportes según el rol
const fetchReports = async () => {
  isLoading.value = true;
  try {
    let params = {
      ...filterOptions.value,
      search: searchText.value,
      page: page.value,
      per_page: itemsPerPage.value,
    };

    let url = "/forms/responses/all";
    let isAdmin = auth.user?.roles?.includes("admin");
    let isSuperadmin = auth.user?.roles?.includes("superadmin");
    let isSponsor = auth.user?.roles?.includes("sponsor");
    let isAuditorOrSupervisor = auth.user?.roles?.some((r) =>
      ["auditor", "supervisor"].includes(r)
    );

    if (isAdmin) {
      url = "/forms";
    } else if (isSuperadmin) {
      url = "/forms/responses/all";
    } else if (isSponsor) {
      params.business_id = auth.user.business_id;
      url = "/forms/responses/all";
    } else if (isAuditorOrSupervisor) {
      url = "/forms/responses/all";
    }

    const { data } = await axios.get(url, { params });

    if (isAdmin) {
      // Laravel API Resource paginada: data.data, data.total, etc.
      reports.value = data.data || [];
      totalItems.value = data.total ?? 0;
      meta.value = data || {};
    } else {
      reports.value = data.data || [];
      totalItems.value = data.meta?.total ?? data.total ?? 0;
      meta.value = data.meta || data || {};
    }
  } catch (error) {
    reports.value = [];
    totalItems.value = 0;
    meta.value = {};
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  // Si el usuario es auditor o supervisor, necesitamos saber si tiene formularios vinculados
  let user = auth.user;
  if (
    user?.roles?.some((r) => ["auditor", "supervisor"].includes(r)) &&
    user.has_linked_forms === undefined
  ) {
    try {
      // Llama a un endpoint que devuelva si el usuario tiene formularios vinculados
      const { data } = await axios.get("/users/me/has-linked-forms");
      user = { ...user, has_linked_forms: !!data.has_linked_forms };
      auth.user = user; // Actualiza el store si es necesario
    } catch (e) {
      user = { ...user, has_linked_forms: false };
    }
  }

  if (!canViewReports(user)) {
    canView.value = false;
    router.replace("/403");
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

function handlePageChange(newPage) {
  page.value = newPage;
  fetchReports();
}
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
          <ReportList
            :items="reports"
            :isMobile="mdAndDown"
            :isLoading="isLoading"
            :page="page"
            :itemsPerPage="itemsPerPage"
            :totalItems="totalItems"
            :meta="meta"
            @update:page="handlePageChange"
          />
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>
