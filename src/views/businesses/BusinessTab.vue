<template>
  <!-- Vista no Sponsor (admin/superadmin)-->
  <v-row v-if="!isSponsor">
    <v-container fluid class="pa-0">
      <v-row align="center" justify="space-between" class="ma-0 px-3 py-2">
        <v-col cols="auto" class="pa-0 d-flex align-center">
          <h1 class="text-h4 text-md-h3 font-weight-bold ma-0">Negocios</h1>
        </v-col>
        <v-col cols="12" md="12">
          <UiParentCard title="Gestionar Negocios">
            <template #action>
              <v-btn color="primary" class="mt-4 px-2 py-1 text-sm" variant="flat" @click="showDialog = true"> Agregar Negocio </v-btn>
            </template>
            <BusinessView :businesses="businesses.data" :isLoading="isLoading" />
            <v-pagination v-model="currentPage" :length="businesses.last_page" :total-visible="5" @input="fetchBusinesses" class="mt-6" />
          </UiParentCard>
        </v-col>
      </v-row>
    </v-container>
  </v-row>

  <!-- Vista Sponsor -->
  <div v-else>
    <v-container fluid class="pa-0">
      <!-- Header -->
      <v-row align="center" justify="space-between" class="ma-0 px-3 py-2">
        <v-col cols="auto" class="pa-0 d-flex align-center">
          <h1 class="text-h4 text-md-h3 font-weight-bold ma-0">Tu Negocio</h1>
        </v-col>
      </v-row>
      <ShowBusiness />
    </v-container>
  </div>

  <v-dialog v-model="showDialog" max_width="700px">
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between"
        >Crear Negocio
        <v-btn icon @click="showDialog = false">
          <v-icon :icon="mdiCancel" />
        </v-btn>
      </v-card-title>
      <v-card-text>
        <CreateBusiness @businessCreated="handleBusCreate" />
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { onMounted, ref, watch, computed } from 'vue';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import BusinessView from './BusinessView.vue';
import axiosInstance from '@/utils/axios';
import { mdiCancel } from '@mdi/js';
import CreateBusiness from './components/CreateBusiness.vue';
import { useAuthStore } from '@/stores/auth';
import ShowBusiness from './ShowBusiness.vue';

const auth = useAuthStore();

const isSponsor = computed(() => {
  return auth.user?.roles?.some((role) => role.name === 'sponsor');
});

const search = ref('');
const currentPage = ref(1);
const businesses = ref({ data: [], last_page: 1 });
const isLoading = ref(false);

const fetchBusinesses = async () => {
  isLoading.value = true;
  try {
    const res = await axiosInstance.get('/businesses', {
      params: {
        search: search.value,
        page: currentPage.value
      }
    });
    businesses.value = res.data;
  } catch (err) {
    console.error('Failed to fetch organizations', err);
  } finally {
    isLoading.value = false;
  }
};

const showDialog = ref(false);
onMounted(() => {
  fetchBusinesses();
});

const handleBusCreate = () => {
  showDialog.value = false;
  fetchBusinesses();
};

watch(currentPage, fetchBusinesses);
</script>
