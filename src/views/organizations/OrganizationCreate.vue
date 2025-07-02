<script setup>
import { reactive, ref, watch } from 'vue';
import AddressAutocomplete from '@/utils/helpers/AddressAutocomplete.vue';
import axiosInstance from '@/utils/axios';

const Regform = ref('');
const parsedAddress = ref({});
const logo = ref(null);
const logoPreview = ref(null);

const form = reactive({
  legal_name: '',
  alias: '',
  description: '',
  logo: null,
  people: {
    first_name: '',
    last_name: '',
    email: '',
    phone_number: ''
  }
});

const handleParsedAddress = (val) => {
  parsedAddress.value = val;
};

//Watch para hacer preview del logo subido
watch(logo, (file) => {
  if (file) {
    logoPreview.value = URL.createObjectURL(file);
  } else {
    logoPreview.value = null;
  }
});

//Emit para dejar saber a componentes padres que se creo la organizacion
const emit = defineEmits(['organizationCreated']);

const validate = async () => {
  try {
    const formData = new FormData();
    formData.append('legal_name', form.legal_name);
    formData.append('alias', form.alias || '');
    formData.append('description', form.description || '');
    for (const key in parsedAddress.value) {
      formData.append(`address[${key}]`, parsedAddress.value[key] || '');
    }
    for (const key in form.people) {
      formData.append(`people[${key}]`, form.people[key]);
    }
    if (form.logo) {
      formData.append('logo', form.logo);
    }
    const res = await axiosInstance.post('/organizations', formData);
    console.log('Organization added', res);
    emit('organizationCreated');
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
              <v-text-field
                v-model="form.legal_name"
                label="Nombre Legal"
                required
                variant="outlined"
                class="mt-2"
                color="primary"
              ></v-text-field>
            </div>
          </v-col>
          <v-col cols="12" sm="6" class="py-0">
            <div class="mb-6">
              <v-label>Alias</v-label>
              <v-text-field v-model="form.alias" label="Alias" class="mt-2" variant="outlined" color="primary"></v-text-field>
            </div>
          </v-col>
        </v-row>
        <v-row class="my-0">
          <v-col cols="12" sm="6" class="py-0">
            <div class="mb-6">
              <v-label>Descripcion</v-label>
              <v-text-field v-model="form.description" label="Descripción" variant="outlined" color="primary" class="mt-2"> </v-text-field>
            </div>
          </v-col>
          <v-col cols="12" sm="6" class="py-0">
            <div class="mb-6">
              <v-label>Logo</v-label>
              <v-file-input
                v-model="form.logo"
                label="Logo"
                :multiple="false"
                variant="outlined"
                color="primary"
                class="mt-2"
                accept="image/*"
              >
              </v-file-input>
            </div>
            <div v-if="logoPreview" class="mt-4 text-center">
              <v-img :src="logoPreview" max-height="100" max-width="100" class="mx-auto rounded" cover />
            </div>
          </v-col>
        </v-row>
        <div class="mb-6">
          <AddressAutocomplete @update:parsedAddress="handleParsedAddress" />
        </div>
        <v-row class="my-0">
          <v-col cols="12" sm="6" class="py-0">
            <div class="mb-6">
              <v-label>Contacto</v-label>
              <v-text-field v-model="form.people.first_name" label="Nombre del Contacto" variant="outlined" color="primary" class="mt-2" />
              <v-text-field v-model="form.people.last_name" label="Apellido del Contacto" variant="outlined" color="primary" class="mt-2" />
              <v-text-field v-model="form.people.email" label="Email del Contacto" variant="outlined" color="primary" class="mt-2" />
              <v-text-field
                v-model="form.people.phone_number"
                label="Teléfono del Contacto"
                variant="outlined"
                color="primary"
                class="mt-2"
              />
            </div>
            <div v-if="logoPreview" class="mt-4 text-center">
              <v-img :src="logoPreview" max-height="100" max-width="100" class="mx-auto rounded" cover />
            </div>
          </v-col>
        </v-row>
        <div class="d-sm-inline-flex align-center mt-2 mb-7 mb-sm-0 font-weight-bold"></div>
        <v-btn color="primary" block class="mt-4" variant="flat" size="large" @click="validate()">Crear Organizacion</v-btn>
      </v-form>
    </v-col>
  </v-row>
</template>
