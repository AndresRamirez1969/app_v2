<script setup>
import { ref, onMounted } from 'vue';
import AddressAutocomplete from '@/utils/helpers/AddressAutocomplete.vue';
import axiosInstance from '@/utils/axios';
import { TIMEZONES } from '@/constants/constants.ts';
import { mdiCancel } from '@mdi/js';

const Regform = ref('');
const legal_name = ref('');
const alias = ref('');
const description = ref('');
const parsedAddress = ref({});
const logo = ref('');
const timezone = ref('');
const businesses = ref([]);
const belongsTo = ref(null);

const props = defineProps({
  dialog: Boolean,
  business: Object
});
const handleParsedAddress = (val) => {
  parsedAddress.value = val;
};

onMounted(async () => {
  try {
    const res = await axiosInstance.get('/businesses');
    businesses.value = res.data.data;
  } catch (err) {
    console.log(err);
  }
});

const emit = defineEmits(['update:dialog', 'unitCreated']);

const validate = async () => {
  try {
    console.log(props.business);
    const formData = new FormData();
    formData.append('legal_name', legal_name.value);
    formData.append('alias', alias.value || '');
    formData.append('description', description.value || '');
    formData.append('business_id', belongsTo.value.id);
    formData.append('organization_id', belongsTo.value.organization_id);
    formData.append('timezone', timezone.value);
    for (const key in parsedAddress.value) {
      formData.append(`address[${key}]`, parsedAddress.value[key] || '');
    }
    if (logo.value) {
      const file = Array.isArray(logo.value) ? logo.value[0] : logo.value;
      formData.append('logo', file);
      console.log('Logo value:', logo.value);
    }
    const res = await axiosInstance.post('/business-units', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    console.log('Unit added', res);
    emit('unitCreated');
    emit('update:dialog', false);
  } catch (err) {
    console.log('Failed to save org', err);
  }
};
</script>

<template>
  <v-dialog v-model="props.dialog" @update:model-value="(val) => emit('update:dialog', val)" max-width="800">
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        Crear Unidad de Negocio
        <v-btn icon @click="emit('update:dialog', false)">
          <v-icon :icon="mdiCancel" />
        </v-btn>
      </v-card-title>
      <v-card-text>
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
                <v-file-input
                  v-model="logo"
                  :multiple="false"
                  label="Logo"
                  variant="outlined"
                  color="primary"
                  class="mt-2"
                  accept="image/*"
                >
                </v-file-input>
              </div>
            </v-col>
            <div class="mb-6">
              <v-label>Huso Horario</v-label>
              <v-select
                v-model="timezone"
                :items="TIMEZONES"
                item-title="label"
                item-value="value"
                label="Seleciona el huso horario"
                variant="outlined"
                color="primary"
                class="mt-2"
              />
            </div>
          </v-row>
          <div class="mb-6">
            <AddressAutocomplete @update:parsedAddress="handleParsedAddress" />
          </div>
          <div class="mb-6">
            <v-label>Negocio Perteneciente</v-label>
            <v-select
              v-model="belongsTo"
              :items="businesses"
              item-title="legal_name"
              item-value="id"
              return-object
              variant="outlined"
              color="primary"
              class="mt-2"
              label="Selecciona un Negocio"
            />
          </div>
          <div class="d-sm-inline-flex align-center mt-2 mb-7 mb-sm-0 font-weight-bold"></div>
          <v-btn color="primary" block class="mt-4" variant="flat" size="large" @click="validate()">Agregar Unidad</v-btn>
        </v-form>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>
