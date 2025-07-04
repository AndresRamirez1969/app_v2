<script setup>
import { ref, onMounted } from 'vue';
import axiosInstance from '@/utils/axios';
import { ROLES } from '@/constants/constants';

const Regform = ref('');
const name = ref('');
const email = ref('');
const organization_id = ref('');
const business_id = ref('');
const role = ref('');
const orgs = ref([]);
const biz = ref([]);

const emit = defineEmits(['userCreated']);

onMounted(async () => {
  try {
    const orgsRes = await axiosInstance.get('/organizations');
    orgs.value = orgsRes.data.data;

    const bizRes = await axiosInstance.get('/businesses');
    biz.value = bizRes.data.data;
  } catch (err) {
    console.log(err);
  }
});

const validate = async () => {
  try {
    const formData = new FormData();
    formData.append('name', name.value);
    formData.append('email', email.value || '');
    formData.append('organization_id', organization_id.value || '');
    formData.append('role', role.value);
    if (role.value === 'sponsor') {
      formData.append('business_id', business_id.value || '');
    } else {
      formData.append('business_id', '');
    }
    const res = await axiosInstance.post('/users', formData);
    console.log('User added', res);
    emit('userCreated');
  } catch (err) {
    console.log('Failed to save org', err);
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
              <v-label>Nombre Completo</v-label>
              <v-text-field v-model="name" required variant="outlined" class="mt-2" color="primary"></v-text-field>
            </div>
          </v-col>
          <v-col cols="12" sm="6" class="py-0">
            <div class="mb-6">
              <v-label>Correo</v-label>
              <v-text-field v-model="email" class="mt-2" variant="outlined" color="primary"></v-text-field>
            </div>
          </v-col>
        </v-row>
        <v-row class="my-0">
          <v-col cols="12" sm="6" class="py-0">
            <div class="mb-6">
              <v-label>Rol</v-label>
              <v-select
                v-model="role"
                :items="ROLES"
                item-title="label"
                item-value="value"
                variant="outlined"
                color="primary"
                class="mt-2"
                label="Selecciona el Rol"
              />
            </div>
          </v-col>
        </v-row>
        <div class="mb-6">
          <v-label>Organizacion Perteneciente</v-label>
          <v-select
            v-model="organization_id"
            :items="orgs"
            item-title="legal_name"
            item-value="id"
            variant="outlined"
            color="primary"
            class="mt-2"
            label="Selecciona una organizacion"
          />
        </div>
        <div class="mb-6" v-if="role === 'sponsor'">
          <v-label>Negocio Perteneciente</v-label>
          <v-select
            v-model="business_id"
            :items="biz"
            item-title="legal_name"
            item-value="id"
            variant="outlined"
            color="primary"
            class="mt-2"
            label="Selecciona un Negocio"
          />
        </div>
        <div class="d-sm-inline-flex align-center mt-2 mb-7 mb-sm-0 font-weight-bold"></div>
        <v-btn color="primary" block class="mt-4" variant="flat" size="large" @click="validate()">Crear Usuario</v-btn>
      </v-form>
    </v-col>
  </v-row>
</template>
