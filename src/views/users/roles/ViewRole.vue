<script setup>
import { ref, onMounted } from 'vue';
import axiosInstance from '@/utils/axios';
import ViewRoles from './CreateRole.vue';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import { mdiPlus } from '@mdi/js';

const roles = ref([]);
const expanded = ref([]);
const fetchRoles = async () => {
  try {
    const res = await axiosInstance.get('/roles');
    roles.value = res.data;
  } catch (err) {
    console.error(err);
  }
};
const roleHeaders = [
  { title: 'Nombre del Rol', key: 'name' },
  { title: 'Despliegar Permisos', key: 'data-table-expand' }
];

onMounted(() => {
  fetchRoles();
});

const handleRoleCreated = () => {
  fetchRoles();
  showDialog.value = false;
};

const showDialog = ref(false);
</script>

<template>
  <v-container fluid class="pa-0">
    <v-row align="center" justify="space-between" class="ma-0 px-3 py-2">
      <v-col cols="auto" class="pa-0 d-flex align-center">
        <h1 class="text-h4 text-md-h3 font-weight-bold ma-0">Roles</h1>
      </v-col>
      <v-col cols="12" md="12">
        <UiParentCard title="Gestionar Roles">
          <template #action>
            <v-btn color="primary" class="mt-4 px-2 py-1 text-sm" variant="flat" @click="showDialog = true">
              <v-icon start :icon="mdiPlus" /> Agregar<span class="d-none d-sm-inline">&nbsp;Rol</span>
            </v-btn>
          </template>
        </UiParentCard>
        <v-data-table
          :items="roles.data"
          :headers="roleHeaders"
          class="elevation-1"
          item-value="id"
          show-expand
          v-model:expanded="expanded"
          hide-default-footer
        >
          <template #expanded-row="{ item }">
            <v-card flat class="pa-4 bg-grey-lighten-4">
              <h3 class="text-subtitle-1 font-weight-bold mb-2">Permisos</h3>
              <v-chip
                v-for="permission in item.permissions"
                :key="permission.id"
                class="ma-1"
                color="primary"
                variant="elevated"
                label
                small
              >
                {{ permission.name }}
              </v-chip>
            </v-card>
          </template>
        </v-data-table>
      </v-col>
    </v-row>
  </v-container>
  <v-card>
    <v-card-text>
      <ViewRoles v-model:dialog="showDialog" @roleCreated="handleRoleCreated" />
    </v-card-text>
  </v-card>
</template>
