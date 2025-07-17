<script setup>
import { ref, onMounted } from 'vue';
import axiosInstance from '@/utils/axios';
import { FREQUENCY } from '@/constants/constants';

const Regform = ref('');
const name = ref('');
const supervisor = ref('');
const auditors = ref([]);
const audited = ref([]);
const frequency = ref('');
const businessUnitId = ref('');
const scope = ref('');
const users = ref([]);

const emit = defineEmits(['businessCreated']);

onMounted(async () => {
  try {
    const res = await axiosInstance.get('/users');
    users.value = res.data.data.map((user) => ({
      ...user,
      customLabel: ` ${user.roles?.[0]?.name || 'Sin rol'}`
    }));
    console.log(users);
  } catch (err) {
    console.log(err);
  }
});

const validate = async () => {
  try {
    const formData = new FormData();
    formData.append('name', name.value);
    formData.append('supervisor_role_id', supervisor.value);
    auditors.value.forEach((auditorId, index) => {
      formData.append(`auditor_role_ids[${index}]`, auditorId);
    });
    audited.value.forEach((auditedId, index) => {
      formData.append(`auditado_role_ids[${index}]`, auditedId);
    });
    formData.append('frequency', frequency.value);
    if (scope.value === 'business_unit') {
      formData.append('business_unit_id', businessUnitId.value);
    } else {
      formData.append('business_unit_id', '');
    }
    const res = await axiosInstance.post('/businesses', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    console.log('Business added', res);
    emit('businessCreated');
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
              <v-label>Nombre del Formulario</v-label>
              <v-text-field v-model="name" required variant="outlined" class="mt-2" color="primary"></v-text-field>
            </div>
          </v-col>
        </v-row>
        <div class="mb-6">
          <v-label>Supervisor</v-label>
          <v-select
            v-model="supervisor"
            :items="users"
            item-title="customLabel"
            item-value="id"
            variant="outlined"
            color="primary"
            class="mt-2"
            label="Selecciona al Supervisor"
          />
        </div>
        <div class="mb-6">
          <v-label>Auditores</v-label>
          <v-select
            v-model="auditors"
            :items="users"
            item-title="customLabel"
            item-value="id"
            variant="outlined"
            color="primary"
            class="mt-2"
            label="Selecciona a los Auditores"
          />
        </div>
        <div class="mb-6">
          <v-label>Auditores</v-label>
          <v-select
            v-model="auditors"
            :items="users"
            item-title="customLabel"
            item-value="id"
            variant="outlined"
            color="primary"
            class="mt-2"
            label="Selecciona a los Auditores"
          />
        </div>
        <div class="d-sm-inline-flex align-center mt-2 mb-7 mb-sm-0 font-weight-bold"></div>
        <v-btn color="primary" block class="mt-4" variant="flat" size="large" @click="validate()">Guardar Negocio</v-btn>
      </v-form>
    </v-col>
  </v-row>
</template>
