<script setup>
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useDisplay } from "vuetify";
import { mdiPlus } from "@mdi/js";
import axios from "@/utils/axios";
import { useAuthStore } from "@/stores/auth";

import RoleList from "./RoleList.vue";
import RoleFilters from "./RoleFilters.vue";

const router = useRouter();
const roles = ref([]);
const total = ref(0);
const perPage = ref(10);
const currentPage = ref(1);
const lastPage = ref(1);
const { mdAndDown } = useDisplay();

const searchText = ref("");
const filterOptions = ref({});

const auth = useAuthStore();
const canView = ref(false);
const canCreate = ref(false);
const isLoading = ref(false);

function hasPermission(permission) {
  return (
    Array.isArray(auth.user?.permissions) && auth.user.permissions.includes(permission)
  );
}

const fetchRoles = async (params = {}) => {
  try {
    isLoading.value = true;
    const { data } = await axios.get("/roles", {
      params: {
        page: currentPage.value,
        per_page: perPage.value,
        search: searchText.value,
        ...filterOptions.value,
        ...params,
      },
    });
    roles.value = data.data || [];
    total.value = data.total || 0;
    perPage.value = data.per_page || 10;
    currentPage.value = data.current_page || 1;
    lastPage.value = data.last_page || 1;
  } catch (error) {
    console.error("Error fetching roles:", error);
    roles.value = [];
    total.value = 0;
    perPage.value = 10;
    currentPage.value = 1;
    lastPage.value = 1;
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  if (!hasPermission("role.viewAny")) {
    canView.value = false;
    return;
  }
  canView.value = true;
  canCreate.value = hasPermission("role.create");
  await fetchRoles();
});

const goToCreate = () => {
  router.push("/roles/crear");
};

function handleSearch(text) {
  searchText.value = text;
  currentPage.value = 1;
  fetchRoles();
}

async function handleFilter(filters) {
  filterOptions.value = { ...filters };
  currentPage.value = 1;
  await fetchRoles();
}

function handlePageChange(page) {
  currentPage.value = page;
  fetchRoles();
}
</script>

<template>
  <div v-if="canView">
    <v-container fluid>
      <v-row class="align-center justify-space-between mb-4">
        <v-col cols="auto" class="d-flex align-center">
          <h3 class="font-weight-medium mb-0">Roles</h3>
        </v-col>
        <v-col cols="auto" class="d-flex align-center justify-end" v-if="canCreate">
          <v-btn color="primary" class="text-white" elevation="1" @click="goToCreate">
            <template v-if="mdAndDown">
              <v-icon :icon="mdiPlus" start />
              <span>Agregar</span>
            </template>
            <template v-else>
              <v-icon :icon="mdiPlus" start />
              <span>Agregar Rol</span>
            </template>
          </v-btn>
        </v-col>
      </v-row>

      <RoleFilters @search="handleSearch" @filter="handleFilter" class="mb-4" />

      <v-row>
        <v-col>
          <RoleList
            :items="roles"
            :isMobile="mdAndDown"
            :isLoading="isLoading"
            :totalItems="total"
            :page="currentPage"
            :itemsPerPage="perPage"
            @update:page="handlePageChange"
          />
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>
