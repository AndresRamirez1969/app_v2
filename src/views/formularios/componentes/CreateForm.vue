<script setup>
import { ref, onMounted } from 'vue';
import axiosInstance from '@/utils/axios';
import { FREQUENCY } from '@/constants/constants';
import { useAuthStore } from '@/stores/auth';
import { mdiArrowLeft } from '@mdi/js';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';

const auth = useAuthStore();
const user = auth.user;
const toast = useToast();
const router = useRouter();
const goBack = () => {
  router.push('/formularios');
};

const Regform = ref('');
const name = ref('');
const supervisor = ref('');
const auditors = ref([]);
const audited = ref([]);
const frequency = ref('');
const businessUnitId = ref('');
const businessId = ref('');
const scope = ref('');
const users = ref([]);
const businesses = ref([]);
const businessUnits = ref([]);

onMounted(async () => {
  try {
    const res = await axiosInstance.get('/users');
    users.value = res.data.data.map((user) => ({
      ...user,
      customLabel: ` ${user.roles?.[0]?.name || 'Sin rol'}`
    }));
    const resBusiness = await axiosInstance.get('/businesses');
    businesses.value = resBusiness.data.data.map((business) => ({
      ...business,
      customLabel: `${business.legal_name}`
    }));
    const resBusinessUnit = await axiosInstance.get('/business-units');
    businessUnits.value = resBusinessUnit.data.data.map((businessUnit) => ({
      ...businessUnit,
      customLabel: `${businessUnit.name}`
    }));
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
    formData.append('assignment_scope', scope.value);

    if (scope.value === 'organization') {
      formData.append('organization_id', user?.organization_id);
    } else if (scope.value === 'business') {
      formData.append('business_id', businessId.value);
      formData.append('organization_id', user?.organization_id);
    } else if (scope.value === 'business_unit') {
      formData.append('business_id', businessId.value);
      formData.append('business_unit_id', businessUnitId.value);
      formData.append('organization_id', user?.organization_id);
    }

    const res = await axiosInstance.post('/forms', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    console.log('Formulario creado', res);
    toast.success('Formulario creado correctamente');

    const newForm = res.data.form;
    if (newForm && newForm.id) {
      router.push({
        name: 'AddFieldsForm',
        params: { id: newForm.id },
        state: { form: newForm }
      });
    }
  } catch (err) {
    console.log('Failed to save form', err);
  }
};
</script>

<template>
  <v-card>
    <v-toolbar class="mb-4" density="compact" title="Creacion de Formulario">
      <template #prepend v-if="!isSponsor">
        <v-btn icon @click="goBack">
          <v-icon :icon="mdiArrowLeft" />
        </v-btn>
      </template>
    </v-toolbar>
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
            <v-col cols="12" sm="6" class="py-0 d-flex flex-column justify-center">
              <v-label class="mb2">Alcance</v-label>
              <v-radio-group v-model="scope" inline>
                <v-radio label="Organizacional" value="organization" />
                <v-radio label="Por Negocio" value="business" />
                <v-radio label="Por Unidad" value="business_unit" />
              </v-radio-group>
            </v-col>
          </v-row>

          <!-- Select de Negocio (solo cuando scope es 'business' o 'business_unit') -->
          <v-row v-if="scope === 'business' || scope === 'business_unit'" class="my-0">
            <v-col cols="12" sm="6" class="py-0">
              <div class="mb-6">
                <v-label>Negocio</v-label>
                <v-select
                  v-model="businessId"
                  :items="businesses"
                  item-title="customLabel"
                  item-value="id"
                  variant="outlined"
                  color="primary"
                  class="mt-2"
                  label="Selecciona el Negocio"
                  required
                />
              </div>
            </v-col>
          </v-row>

          <!-- Select de Unidad de Negocio (solo cuando scope es 'business_unit') -->
          <v-row v-if="scope === 'business_unit'" class="my-0">
            <v-col cols="12" sm="6" class="py-0">
              <div class="mb-6">
                <v-label>Unidad de Negocio</v-label>
                <v-select
                  v-model="businessUnitId"
                  :items="businessUnits"
                  item-title="customLabel"
                  item-value="id"
                  variant="outlined"
                  color="primary"
                  class="mt-2"
                  label="Selecciona la Unidad de Negocio"
                  required
                />
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
              multiple
              item-title="customLabel"
              item-value="id"
              variant="outlined"
              color="primary"
              class="mt-2"
              label="Selecciona a los Auditores"
            />
          </div>
          <div class="mb-6">
            <v-label>Auditados</v-label>
            <v-select
              v-model="audited"
              multiple
              :items="users"
              item-title="customLabel"
              item-value="id"
              variant="outlined"
              color="primary"
              class="mt-2"
              label="Selecciona a los Auditados"
            />
          </div>
          <div class="mb-6">
            <v-label>Frecuencia</v-label>
            <v-select
              v-model="frequency"
              :items="FREQUENCY"
              item-title="label"
              item-value="value"
              variant="outlined"
              color="primary"
              class="mt-2"
              label="Selecciona la frecuencia del formulario"
            />
          </div>
          <div class="d-sm-inline-flex align-center mt-2 mb-7 mb-sm-0 font-weight-bold"></div>
          <v-btn color="primary" block class="mt-4" variant="flat" size="large" @click="validate()">Crear Formulario</v-btn>
        </v-form>
      </v-col>
    </v-row>
  </v-card>
</template>
