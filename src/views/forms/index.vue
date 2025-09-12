<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import { mdiPlus, mdiHelpCircleOutline } from '@mdi/js';
import FormList from './FormList.vue';
import FormFilters from './FormFilters.vue';
import axios from '@/utils/axios';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const forms = ref([]);
const filteredForms = ref([]);
const { mdAndDown } = useDisplay();

const searchText = ref('');
const filterOptions = ref({});

const auth = useAuthStore();
const canView = ref(false);
const canCreate = ref(false);
const isLoading = ref(false);

function hasPermission(permission) {
  return Array.isArray(auth.user?.permissions) && auth.user.permissions.includes(permission);
}

onMounted(async () => {
  if (!hasPermission('form.viewAny')) {
    canView.value = false;
    router.replace('/403');
    return;
  }
  canView.value = true;
  canCreate.value = hasPermission('form.create');
  try {
    isLoading.value = true;
    const { data } = await axios.get('/forms');
    forms.value = data.data;
    filteredForms.value = data.data;
  } catch (error) {
    console.error('Error fetching forms:', error);
  } finally {
    isLoading.value = false;
  }
});

const goToCreate = () => {
  router.push('/formularios-dw/crear');
};

function handleSearch(text) {
  searchText.value = text;
  applyFilters();
}

async function handleFilter(filters) {
  filterOptions.value = filters;
  try {
    const { data } = await axios.get('/forms', { params: filters });
    filteredForms.value = data.data;
  } catch (error) {
    console.error('Error fetching filtered forms:', error);
    filteredForms.value = [];
  }
}

function applyFilters() {
  let result = forms.value;

  // Buscar por nombre y folio
  if (searchText.value) {
    const q = searchText.value.toLowerCase();
    result = result.filter(
      (form) => (form.name && form.name.toLowerCase().includes(q)) || (form.folio && form.folio.toLowerCase().includes(q))
    );
  }

  // Filtro por status
  if (filterOptions.value.status) {
    result = result.filter((form) => form.status === filterOptions.value.status);
  }

  // Filtro por business_unit_id
  if (filterOptions.value.business_unit_id) {
    result = result.filter((form) => form.business_unit_id === filterOptions.value.business_unit_id);
  }

  // Filtro por supervisor_role_id
  if (filterOptions.value.supervisor_role_id) {
    result = result.filter((form) => form.supervisor_role_id === filterOptions.value.supervisor_role_id);
  }

  // Filtro por user_role_ids (auditor_role_ids)
  if (filterOptions.value.user_role_ids && Array.isArray(filterOptions.value.user_role_ids)) {
    result = result.filter(
      (form) => form.auditor_role_ids && filterOptions.value.user_role_ids.some((roleId) => form.auditor_role_ids.includes(roleId))
    );
  }

  // Filtro por fecha exacta (si quieres igualar backend)
  if (filterOptions.value.created_at) {
    result = result.filter((form) => form.created_at && form.created_at.slice(0, 10) === filterOptions.value.created_at);
  } else {
    // Si prefieres rango, mantén tu lógica actual
    if (filterOptions.value.createdAtStart) {
      result = result.filter((form) => form.created_at && form.created_at >= filterOptions.value.createdAtStart);
    }
    if (filterOptions.value.createdAtEnd) {
      result = result.filter((form) => form.created_at && form.created_at <= filterOptions.value.createdAtEnd);
    }
  }

  filteredForms.value = result;
}
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
          <FormList :items="filteredForms" :isMobile="mdAndDown" :isLoading="isLoading" />
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>
