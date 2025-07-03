<script setup>
import { ref, onMounted } from 'vue';
import AddressAutocomplete from '@/utils/helpers/AddressAutocomplete.vue';
import axiosInstance from '@/utils/axios';

const Regform = ref('');
const legal_name = ref('');
const alias = ref('');
const description = ref('');
const parsedAddress = ref({});
const logo = ref('');
const orgs = ref([]);
const belongsTo = ref(null);

const handleParsedAddress = (val) => {
  parsedAddress.value = val;
};

const emit = defineEmits(['businessCreated']);

onMounted(async () => {
  try {
    const res = await axiosInstance.get('/organizations');
    orgs.value = res.data.data;
  } catch (err) {
    console.log(err);
  }
});

const validate = async () => {
  try {
    const formData = new FormData();
    formData.append('legal_name', legal_name.value);
    formData.append('alias', alias.value || '');
    formData.append('description', description.value || '');
    formData.append('organization_id', belongsTo.value);
    for (const key in parsedAddress.value) {
      formData.append(`address[${key}]`, parsedAddress.value[key] || '');
    }
    if (logo.value) {
      const file = Array.isArray(logo.value) ? logo.value[0] : logo.value;
      formData.append('logo', file);
      console.log('Logo value:', logo.value);
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
              <v-label>Nombre Legal</v-label>
              <v-text-field v-model="legal_name" required variant="outlined" class="mt-2" color="primary"></v-text-field>
            </div>
          </v-col>
          <v-col cols="12" sm="6" class="py-0">
            <div class="mb-6">
              <v-label>Alias</v-label>
              <v-text-field v-model="alias" class="mt-2" variant="outlined" color="primary"></v-text-field>
            </div>
          </v-col>
        </v-row>
        <v-row class="my-0">
          <v-col cols="12" sm="6" class="py-0">
            <div class="mb-6">
              <v-label>Descripcion</v-label>
              <v-text-field v-model="description" variant="outlined" color="primary" class="mt-2"> </v-text-field>
            </div>
          </v-col>
          <v-col cols="12" sm="6" class="py-0">
            <div class="mb-6">
              <v-label>Logo</v-label>
              <v-file-input v-model="logo" :multiple="false" label="Logo" variant="outlined" color="primary" class="mt-2" accept="image/*">
              </v-file-input>
            </div>
          </v-col>
        </v-row>
        <div class="mb-6">
          <AddressAutocomplete @update:parsedAddress="handleParsedAddress" />
        </div>
        <div class="mb-6">
          <v-label>Organizacion Perteneciente</v-label>
          <v-select
            v-model="belongsTo"
            :items="orgs"
            item-title="legal_name"
            item-value="id"
            variant="outlined"
            color="primary"
            class="mt-2"
            label="Selecciona una organizacion"
          />
        </div>
        <div class="d-sm-inline-flex align-center mt-2 mb-7 mb-sm-0 font-weight-bold"></div>
        <v-btn color="primary" block class="mt-4" variant="flat" size="large" @click="validate()">Guardar Negocio</v-btn>
      </v-form>
    </v-col>
  </v-row>
</template>
