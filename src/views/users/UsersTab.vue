<template>
  <v-container fluid class="pa-0">
    <v-row align="center" justify="space-between" class="ma-0 px-3 py-2">
      <v-col cols="auto" class="pa-0 d-flex align-center">
        <h1 class="text-h4 text-md-h3 font-weight-bold ma-0">Usuarios</h1>
      </v-col>
      <v-col cols="12" md="12">
        <UiParentCard title="Gestionar Usuarios">
          <UsersView :users="users.data" />
          <v-pagination v-model="currentPage" :length="users.last_page" :total-visible="5" @input="fetchUsers" class="mt-6" />
        </UiParentCard>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue';
import UsersView from './UsersView.vue';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import axiosInstance from '@/utils/axios';

const search = ref('');
const currentPage = ref(1);
const users = ref({ data: [], last_page: 1 });

const fetchUsers = async () => {
  try {
    const res = await axiosInstance.get('/users', {
      params: {
        search: search.value,
        page: currentPage.value
      }
    });
    users.value = res.data;
  } catch (err) {
    console.error('Failed to fetch users', err);
  }
};

onMounted(() => {
  fetchUsers();
});

watch(currentPage, fetchUsers);
</script>
