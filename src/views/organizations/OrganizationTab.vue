<template>
  <v-container fluid class="pa-0">
    <!-- Header -->
    <v-row align="center" justify="space-between" class="ma-0 px-3 py-2">
      <v-col cols="auto" class="pa-0 d-flex align-center">
        <h1 class="text-h4 text-md-h3 font-weight-bold ma-0">Organizaciones</h1>
      </v-col>

      <!-- Botón -->
      <v-col cols="auto" class="pa-0 d-flex align-center">
        <v-btn color="primary" class="font-weight-bold" @click="goToNewOrganization">
          <v-icon start>mdi-plus</v-icon>
          Agregar<span class="d-none d-sm-inline">&nbsp;Organización</span>
        </v-btn>
      </v-col>
    </v-row>
  </v-container>
  <!-- Superadmin view -->
  <v-row v-if="isSuperAdmin">
    <v-col cols="12" md="12">
      <UiParentCard title="Gestionar Organizaciones">
        <template #action>
          <v-btn color="primary" class="mt-4 px-2 py-1 text-sm" variant="flat" @click="showDialog = true"> Agregar Organizacion </v-btn>
        </template>
        <OrganizationView :organizations="organizations.data" :isLoading="isLoading" />
        <v-pagination v-model="currentPage" :length="organizations.last_page" :total-visible="5" @input="fetchOrganizations" class="mt-6" />
      </UiParentCard>
    </v-col>
  </v-row>

  <!-- Non-superadmin view -->
  <div v-else>
    <v-progress-circular v-if="loadingOrg" indeterminate color="primary" />
    <ShowOrganization v-else-if="auth.user?.organization_id" />
    <OrganizationCreate v-else @organizationCreated="handleOrganizationCreated" />
  </div>
  <v-dialog v-model="showDialog" max_width="500px">
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between"
        >Crear Organizacion
        <v-btn icon @click="showDialog = false">
          <v-icon :icon="mdiCancel" />
        </v-btn>
      </v-card-title>
      <v-card-text>
        <OrganizationCreate @organizationCreated="handleOrganizationCreated" />
      </v-card-text>
    </v-card>
  </v-dialog>
  <v-snackbar v-model="snackbar" color="success" timeout="5000"> Organización creada exitosamente. </v-snackbar>
</template>

<script setup>
import { onMounted, ref, shallowRef, watch, computed } from 'vue';
import OrganizationCreate from './OrganizationCreate.vue';
import OrganizationView from './OrganizationView.vue';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import axiosInstance from '@/utils/axios';
import { mdiCancel } from '@mdi/js';
import { useAuthStore } from '@/stores/auth';
import ShowOrganization from './adminOrganizations/ShowOrganization.vue';
import { useOrganization } from '@/apiCalls/useOrganization';
const { loadingOrg } = useOrganization();

const auth = useAuthStore();

const isSuperAdmin = computed(() => {
  return auth.user?.roles?.some((role) => role.name === 'superadmin');
});

const search = ref('');
const currentPage = ref(1);
const organizations = ref({ data: [], last_page: 1 });
const isLoading = ref(false);

const fetchOrganizations = async () => {
  isLoading.value = true;
  try {
    const res = await axiosInstance.get('/organizations', {
      params: {
        search: search.value,
        page: currentPage.value
      }
    });
    organizations.value = res.data;
  } catch (err) {
    console.error('Failed to fetch organizations', err);
  } finally {
    isLoading.value = false;
  }
};

const showDialog = ref(false);
const page = ref({ title: 'Organizacion' });
const breadcrumbs = shallowRef([
  {
    title: 'Organizaciones',
    disabled: true,
    href: '#'
  }
]);
onMounted(() => {
  fetchOrganizations();
});

const handleOrganizationCreated = async () => {
  showDialog.value = false;
  fetchOrganizations();
  await auth.fetchUser();
  showSuccess();
};

const snackbar = ref(false);
const showSuccess = () => {
  snackbar.value = true;
};
watch(currentPage, fetchOrganizations);
</script>
