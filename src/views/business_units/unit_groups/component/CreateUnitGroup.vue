<script setup>
import { ref, onMounted } from 'vue';
import axiosInstance from '@/utils/axios';
import { mdiCancel } from '@mdi/js';

const Regform = ref('');
const name = ref('');
const businesses = ref([]);
const businessUnits = ref([]);
const belongsTo = ref(null);
const selectedUnits = ref([]);

const props = defineProps({
  dialog: Boolean,
  businessUnit: Object
});

onMounted(async () => {
  try {
    const res = await axiosInstance.get('/businesses');
    const resUnits = await axiosInstance.get('/business-units');
    businessUnits.value = resUnits.data.data;
    businesses.value = res.data.data;
  } catch (err) {
    console.log(err);
  }
});

const emit = defineEmits(['update:dialog', 'unitCreated']);

const validate = async () => {
  try {
    const formData = new FormData();
    formData.append('name', name.value);
    formData.append('business_id', belongsTo.value.id);
    formData.append('organization_id', belongsTo.value.organization_id);
    selectedUnits.value.forEach((unitId, index) => {
      formData.append(`business_units[${index}]`, unitId);
    });
    const res = await axiosInstance.post('/business-unit-groups', formData, {
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
        Crear Grupo
        <v-btn icon @click="emit('update:dialog', false)">
          <v-icon :icon="mdiCancel" />
        </v-btn>
      </v-card-title>
      <v-card-text>
        <v-form ref="Regform" lazy-validation action="/dashboards/analytical" class="container mt-5">
          <v-row class="my-0">
            <v-col cols="12" class="py-0">
              <div class="mb-6">
                <v-label>Nombre del Grupo</v-label>
                <v-text-field v-model="name" required variant="outlined" class="mt-2" color="primary"></v-text-field>
              </div>
            </v-col>
          </v-row>
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
          <div class="mb-6">
            <v-label>Unidades Pertenecientes</v-label>
            <v-select
              v-model="selectedUnits"
              :items="businessUnits"
              item-title="legal_name"
              item-value="id"
              multiple
              chips
              clearable
              variant="outlined"
              color="primary"
              class="mt-2"
              label="Selecciona Unidades"
            />
          </div>
          <div class="d-sm-inline-flex align-center mt-2 mb-7 mb-sm-0 font-weight-bold"></div>
          <v-btn color="primary" block class="mt-4" variant="flat" size="large" @click="validate()">Agregar Unidad</v-btn>
        </v-form>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>
