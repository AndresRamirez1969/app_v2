<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs"></BaseBreadcrumb>
  <v-row>
      <v-col cols="12" md="12">
          <UiParentCard title="Gestionar Usuarios">
              <UsersView :users="users.data" />
             <v-pagination 
                v-model="currentPage"
                :length="users.last_page"
                :total-visible="5"
                @input="fetchUsers"
                class="mt-6"
               />
      </UiParentCard>
      </v-col>
  </v-row>
</template>

<script setup>
import { onMounted, ref, shallowRef, watch } from 'vue'
import UsersView from './UsersView.vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
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
  console.error("Failed to fetch users", err);
}
};

const page = ref({ title: 'Usuarios' });
const breadcrumbs = shallowRef([
  {
      title: 'Usuarios',
      disabled: true,
      href: '#'
  }
  ]);
  onMounted(() => {
      fetchUsers();
  })
  
  watch(currentPage, fetchUsers);
</script>

