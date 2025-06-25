<template>
    <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs"></BaseBreadcrumb>
    <v-row>
        <v-col cols="12" md="12">
            <UiParentCard title="Gestionar Negocios">
                <template #action>
                    <v-btn color="primary" class="mt-4 px-2 py-1 text-sm" variant="flat" @click="showDialog = true">
                        Agregar Negocio
                    </v-btn>
                </template>
                <BusinessView :businesses="businesses.data" :isLoading="isLoading" />
               <v-pagination 
                  v-model="currentPage"
                  :length="businesses.last_page"
                  :total-visible="5"
                  @input="fetchBusinesses"
                  class="mt-6"
                 />
        </UiParentCard>
        </v-col>
    </v-row>

    <v-dialog v-model="showDialog" max_width="700px">
      <v-card>
        <v-card-title>Crear Negocio
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
  import { onMounted, ref, shallowRef, watch } from 'vue'
  import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
  import UiParentCard from '@/components/shared/UiParentCard.vue';
  import BusinessView from './BusinessView.vue';
  import axiosInstance from '@/utils/axios';
  import { mdiCancel } from '@mdi/js';
  import CreateBusiness from './components/CreateBusiness.vue';

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
    console.error("Failed to fetch organizations", err);
  } finally {
    isLoading.value = false;
  }
};

  const showDialog = ref(false);
  const page = ref({ title: 'Negocios' });
  const breadcrumbs = shallowRef([
    {
        title: 'Negocios',
        disabled: true,
        href: '#'
    }
    ]);
    onMounted(() => {
        fetchBusinesses();
    })

    const handleBusCreate = () => {
      showDialog.value = false;
      fetchBusinesses();
    }
    
    watch(currentPage, fetchBusinesses);
  </script>