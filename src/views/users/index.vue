<script setup>
import { onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useDisplay } from "vuetify";
import { mdiPlus, mdiFileUploadOutline } from "@mdi/js";
import UserList from "./UserList.vue";
import UserFilters from "./UserFilters.vue";
import ImportExcel from "@/components/modals/ImportExcel.vue";
import axios from "@/utils/axios";
import { useAuthStore } from "@/stores/auth";

const router = useRouter();
const users = ref([]);
const { mdAndDown } = useDisplay();

const searchText = ref("");
const filterOptions = ref({});

const auth = useAuthStore();
const canView = ref(false);
const canCreate = ref(false);
const isLoading = ref(false);

const currentPage = ref(1);
const perPage = ref(10);
const total = ref(0);

const sortBy = ref("id");
const sortDesc = ref(false);

function hasPermission(permission) {
  return (
    Array.isArray(auth.user?.permissions) && auth.user.permissions.includes(permission)
  );
}

async function fetchUsers() {
  try {
    isLoading.value = true;
    const { data } = await axios.get("/users", {
      params: {
        page: currentPage.value,
        per_page: perPage.value,
        search: searchText.value,
        sort_by: sortBy.value,
        sort_desc: sortDesc.value ? 1 : 0,
        ...filterOptions.value,
      },
    });
    users.value = data.data;
    total.value = data.meta.total;
  } catch (error) {
    console.error("Error fetching users:", error);
    users.value = [];
    total.value = 0;
  } finally {
    isLoading.value = false;
  }
}

onMounted(async () => {
  if (!hasPermission("user.viewAny")) {
    canView.value = false;
    router.replace("/403");
    return;
  }
  canView.value = true;
  canCreate.value = hasPermission("user.create");
  await fetchUsers();
});

watch(
  [currentPage, searchText, filterOptions, sortBy, sortDesc],
  () => {
    fetchUsers();
  },
  { deep: true }
);

const goToCreate = () => {
  router.push("/usuarios/crear");
};

function handleSearch(text) {
  searchText.value = text;
  currentPage.value = 1;
}

async function handleFilter(filters) {
  filterOptions.value = filters;
  currentPage.value = 1;
}

function handleSort(column) {
  if (sortBy.value === column) {
    sortDesc.value = !sortDesc.value;
  } else {
    sortBy.value = column;
    sortDesc.value = false;
  }
  currentPage.value = 1;
}

// --- Importación masiva ---
const showImportDialog = ref(false);
const importLoading = ref(false);
const importError = ref("");
const importSuccess = ref("");
const importResult = ref({ errors: [] });

const handleImport = async (file) => {
  importError.value = "";
  importSuccess.value = "";
  importResult.value = { errors: [] };
  if (!file) return;
  importLoading.value = true;
  try {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await axios.post("/users/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    if (data.imported && data.imported.length) {
      importSuccess.value = `Usuarios importados: ${data.imported.join(", ")}`;
    }
    importResult.value = data;
    await fetchUsers();
  } catch (err) {
    importError.value = err?.response?.data?.message || "Error al importar usuarios.";
  } finally {
    importLoading.value = false;
  }
};

// --- Descarga de plantilla con Bearer Token ---
async function downloadTemplate() {
  try {
    const response = await axios.get("/users/template", {
      responseType: "blob",
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "usuarios_template.xlsx");
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (e) {
    console.error("Error al descargar la plantilla:", e);
    alert("No se pudo descargar la plantilla.");
  }
}
</script>

<template>
  <div v-if="canView">
    <v-container fluid>
      <v-row class="align-center justify-space-between mb-4">
        <v-col cols="auto" class="d-flex align-center">
          <h3 class="font-weight-medium mb-0">Usuarios</h3>
        </v-col>
        <v-col cols="auto" class="d-flex align-center justify-end" v-if="canCreate">
          <!-- Botón de importación masiva solo en desktop -->
          <v-btn
            v-if="!mdAndDown"
            color="primary"
            class="text-white mr-2"
            elevation="1"
            @click="showImportDialog = true"
            style="min-width: 44px"
          >
            <v-icon :icon="mdiFileUploadOutline" start />
            <span>Importar Usuarios</span>
          </v-btn>
          <!-- Botón de agregar usuario -->
          <v-btn color="primary" class="text-white" elevation="1" @click="goToCreate">
            <template v-if="mdAndDown">
              <v-icon :icon="mdiPlus" start />
              <span>Agregar</span>
            </template>
            <template v-else>
              <v-icon :icon="mdiPlus" start />
              <span>Agregar Usuario</span>
            </template>
          </v-btn>
        </v-col>
      </v-row>

      <!-- MODAL ImportExcel -->
      <ImportExcel
        v-model="showImportDialog"
        :importLoading="importLoading"
        :importError="importError"
        :importSuccess="importSuccess"
        :importResult="importResult"
        @import="handleImport"
        @download-template="downloadTemplate"
      />

      <UserFilters @search="handleSearch" @filter="handleFilter" class="mb-4" />

      <v-row>
        <v-col>
          <UserList
            :items="users"
            :isMobile="mdAndDown"
            :isLoading="isLoading"
            :totalItems="total"
            :page="currentPage"
            :itemsPerPage="perPage"
            :sortBy="sortBy"
            :sortDesc="sortDesc"
            @update:page="
              (val) => {
                currentPage = Number(val);
              }
            "
          />
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>
