<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import axiosInstance from '@/utils/axios';
import { FIXED_ROLES } from '@/constants/constants';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();

const Regform = ref('');
const name = ref('');
const email = ref('');
const business_id = ref('');
const organization_id = ref('');
const selectedFixedRole = ref('');
const selectedDynamicRole = ref('');
const biz = ref([]);
const org = ref([]);
const roles = ref([]);

const props = defineProps({
  dialog: Boolean,
  user: Object
});

const isSponsor = computed(() => {
  return auth.user?.roles?.some((role) => role.name === 'sponsor');
});

const fetchRoles = async () => {
  const res = await axiosInstance.get('/roles');
  roles.value = res.data.data;
  console.log('Fetched roles:', res.data);
};

onMounted(async () => {
  await fetchRoles();
  try {
    const bizRes = await axiosInstance.get('/businesses');
    biz.value = bizRes.data.data;
    const orgRes = await axiosInstance.get('/organizations');
    org.value = orgRes.data.data;
  } catch (err) {
    console.log(err);
  }
});

const emit = defineEmits(['update:dialog', 'userCreated']);

const validate = async () => {
  try {
    const formData = new FormData();
    formData.append('name', name.value);
    formData.append('email', email.value || '');
    formData.append('organization_id', auth?.user?.organization_id || organization_id.value);
    const selectedRole = selectedFixedRole.value || selectedDynamicRole.value;
    formData.append('role', selectedRole || '');
    if (selectedRole === 'sponsor') {
      formData.append('business_id', business_id.value || '');
    } else {
      formData.append('business_id', auth?.user?.business_id || '');
    }
    const res = await axiosInstance.post('/users', formData);
    console.log('User added', res);
    emit('userCreated');
    emit('update:dialog', false);
  } catch (err) {
    console.log('Failed to save org', err);
  }
};

watch(selectedFixedRole, (val) => {
  if (val) selectedDynamicRole.value = '';
});
watch(selectedDynamicRole, (val) => {
  if (val) selectedFixedRole.value = '';
});
</script>

<template>
  <v-dialog v-model="props.dialog" @update:model-value="(val) => emit('update:dialog', val)" max-width="800">
    <v-card>
      <v-card-title class="d-flex flex-column align-start justify-space-between">
        <div class="d-flex w-100 justify-space-between align-center">
          <span class="text-h6">Crear Usuario</span>
          <v-btn icon @click="emit('update:dialog', false)">
            <v-icon :icon="mdiCancel" />
          </v-btn>
        </div>
        <h1 class="text-subtitle-2 text-grey-darken-1 mt-1">¡Asegúrate de haber creado el rol primero!</h1>
      </v-card-title>
      <v-card-text>
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
                <v-label>Rol Fijo</v-label>
                <v-select
                  v-model="selectedFixedRole"
                  :items="FIXED_ROLES"
                  item-title="label"
                  item-value="value"
                  variant="outlined"
                  color="primary"
                  class="mt-2"
                  label="Selecciona Rol Fijo"
                />
              </div>
            </v-col>
            <v-col cols="12" sm="6" class="py-0">
              <div class="mb-6">
                <v-label>Roles Creado</v-label>
                <v-select
                  v-model="selectedDynamicRole"
                  :items="roles"
                  item-title="name"
                  item-value="name"
                  variant="outlined"
                  color="primary"
                  class="mt-2"
                  label="Selecciona Rol Personalizado"
                />
              </div>
            </v-col>
          </v-row>
          <div class="mb-6" v-if="!isSponsor">
            <v-label>Negocio Perteneciente (opcional)</v-label>
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
          <div class="mb-6" v-if="!isSponsor">
            <v-label>Organizacion Perteneciente (opcional)</v-label>
            <v-select
              v-model="organization_id"
              :items="org"
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
      </v-card-text>
    </v-card>
  </v-dialog>
</template>
