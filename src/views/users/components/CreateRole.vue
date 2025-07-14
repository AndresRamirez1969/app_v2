<script setup>
import { ref } from 'vue';
import axiosInstance from '@/utils/axios';
import { ADMIN_ORG_ROLES, ADMIN_BUSINESS_ROLES, ADMIN_UNIT_ROLES, ADMIN_USER_ROLES } from '@/constants/constants';

const Regform = ref('');
const name = ref('');
const orgPermissions = ref([]);
const businessPermissions = ref([]);
const userPermissions = ref([]);
const unitPermissions = ref([]);

const emit = defineEmits(['userCreated']);

const validate = async () => {
  try {
    const allPermissions = [
      ...orgPermissions.value,
      ...businessPermissions.value,
      ...userPermissions.value,
      ...unitPermissions.value
    ].filter((p) => p !== null && p !== undefined);

    const res = await axiosInstance.post('/roles', {
      name: name.value,
      permissions: allPermissions
    });

    console.log('User added', res);
    emit('userCreated');
  } catch (err) {
    console.error('Failed to save org', err);
  }
};
</script>

<template>
  <v-row>
    <v-col cols="12" md="12">
      <v-form ref="Regform" lazy-validation action="/dashboards/analytical" class="container mt-5">
        <v-row class="my-0">
          <v-col cols="12" sm="6" class="py-0">
            <div class="mb-6">
              <v-label>Nombre del Rol</v-label>
              <v-text-field v-model="name" required variant="outlined" class="mt-2" color="primary"></v-text-field>
            </div>
          </v-col>
        </v-row>
        <v-row class="my-0">
          <v-col cols="12" sm="6" class="py-0">
            <div class="mb-6">
              <v-label>Permisos de Organización</v-label>
              <v-select
                v-model="orgPermissions"
                :items="ADMIN_ORG_ROLES"
                item-title="label"
                item-value="value"
                variant="outlined"
                color="primary"
                class="mt-2"
                label="Selecciona el Rol"
                multiple
              />
            </div>
          </v-col>
          <v-col cols="12" sm="6" class="py-0">
            <div class="mb-6">
              <v-label>Permisos de Negocios</v-label>
              <v-select
                v-model="businessPermissions"
                :items="ADMIN_BUSINESS_ROLES"
                item-title="label"
                item-value="value"
                variant="outlined"
                color="primary"
                class="mt-2"
                label="Selecciona el Rol"
                multiple
              />
            </div>
          </v-col>
        </v-row>
        <v-row class="my-0">
          <v-col cols="12" sm="6" class="py-0">
            <div class="mb-6">
              <v-label>Permisos de Unidades</v-label>
              <v-select
                v-model="unitPermissions"
                :items="ADMIN_UNIT_ROLES"
                item-title="label"
                item-value="value"
                variant="outlined"
                color="primary"
                class="mt-2"
                label="Selecciona el Rol"
                multiple
              />
            </div>
          </v-col>
          <v-col cols="12" sm="6" class="py-0">
            <div class="mb-6">
              <v-label>Permisos de Usuarios</v-label>
              <v-select
                v-model="userPermissions"
                :items="ADMIN_USER_ROLES"
                item-title="label"
                item-value="value"
                variant="outlined"
                color="primary"
                class="mt-2"
                label="Selecciona el Rol"
                multiple
              />
            </div>
          </v-col>
        </v-row>
        <div class="d-sm-inline-flex align-center mt-2 mb-7 mb-sm-0 font-weight-bold"></div>
        <v-btn color="primary" block class="mt-4" variant="flat" size="large" @click="validate()">Crear Rol</v-btn>
      </v-form>
    </v-col>
  </v-row>
</template>
