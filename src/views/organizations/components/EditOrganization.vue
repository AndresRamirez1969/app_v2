<script setup>
import axiosInstance from '@/utils/axios';
import { ref, watch, nextTick } from 'vue';
import { cleanObject } from '@/utils/helpers/cleanObjects';

const props = defineProps({
  dialog: Boolean,
  organizationId: Number
});
const emit = defineEmits(['update:dialog']);

const activeForm = ref('edit');

const snackbar = ref(false);
const showSuccess = () => {
  snackbar.value = true;
};

const form = ref({
  legal_name: '',
  alias: '',
  description: '',
  status: '',
  logo: '',
  people: [
    {
      first_name: '',
      last_name: '',
      email: '',
      phone_number: ''
    }
  ],
  businesses: [
    {
      legal_name: '',
      alias: '',
      description: ''
    }
  ]
});

const switchStatus = ref('active');

const loadOrg = async (id) => {
  try {
    const res = await axiosInstance.get(`/organizations/${id}`);
    const org = res.data;

    form.value = {
      legal_name: org.legal_name || '',
      alias: org.alias || '',
      description: org.description || '',
      status: org.status || 'active',
      people: [{ first_name: '', last_name: '', phone_number: '', email: '' }],
      businesses: [{ legal_name: '', alias: '', description: '' }]
    };

    switchStatus.value = form.value.status;
  } catch (err) {
    console.error(err);
  }
};

watch(
  () => props.organizationId,
  (newId) => {
    if (newId) {
      loadOrg(newId);
    }
  },
  { immediate: true }
);

const editOrg = async () => {
  try {
    form.value.status = switchStatus.value;
    const cleanedForm = cleanObject(form.value);
    const formData = new FormData();
    for (const key in cleanedForm.value) {
      if (key === 'logo' && cleanedForm.value.logo instanceof File) {
        formData.append('logo', cleanedForm.value.logo);
      } else {
        formData.append(key, cleanedForm.value[key]);
      }
    }
    await axiosInstance.put(`/organizations/${props.organizationId}`, formData);
    closeDialog();

    await nextTick();

    showSuccess();
    emit('organization-updated');
  } catch (err) {
    console.log(err);
  }
};

const closeDialog = () => {
  emit('update:dialog', false);
  activeForm.value = 'edit';
  form.value.people = [
    {
      first_name: '',
      last_name: '',
      email: '',
      phone_number: ''
    }
  ];
  form.value.businesses = [
    {
      legal_name: '',
      alias: '',
      description: ''
    }
  ];
};
</script>

<template>
  <v-dialog v-model="props.dialog" max-width="700px">
    <v-card>
      <v-card-title>
        <span v-if="activeForm === 'edit'">Editar Organizacion</span>
        <span v-else-if="activeForm === 'contact'">Agregar Contacto</span>
        <span v-else-if="activeForm === 'business'">Agregar Negocio</span>
      </v-card-title>
      <v-card-actions>
        <v-btn
          rounded="xl"
          density="compact"
          :color="activeForm === 'edit' ? 'primary' : 'grey'"
          :variant="activeForm === 'edit' ? 'flat' : 'outlined'"
          @click="activeForm = 'edit'"
        >
          Editar Organizacion
        </v-btn>
        <v-btn
          rounded="xl"
          density="compact"
          :color="activeForm === 'contact' ? 'primary' : 'grey'"
          :variant="activeForm === 'contact' ? 'flat' : 'outlined'"
          @click="activeForm = 'contact'"
        >
          Agregar Contacto
        </v-btn>
        <v-btn
          rounded="xl"
          density="compact"
          :color="activeForm === 'business' ? 'primary' : 'grey'"
          :variant="activeForm === 'business' ? 'flat' : 'outlined'"
          @click="activeForm = 'business'"
        >
          Agregar Negocio
        </v-btn>
      </v-card-actions>
      <v-card-text>
        <div v-if="activeForm === 'edit'">
          <v-text-field label="Nombre Legal" v-model="form.legal_name" variant="outlined" />
          <v-text-field label="Alias" v-model="form.alias" variant="outlined" />
          <v-textarea label="Descripción" v-model="form.description" variant="outlined" />
          <v-file-input label="Logo" v-model="form.logo" :multiple="false" accept="image/*"></v-file-input>
          <v-switch :label="switchStatus === 'active' ? 'Desactivar' : 'Activar'" v-model="form.status" color="primary" />
        </div>
        <div v-else-if="activeForm === 'contact'">
          <v-text-field label="Primer Nombre" v-model="form.people[0].first_name" variant="outlined" placeholder="" />
          <v-text-field label="Apellido" v-model="form.people[0].last_name" variant="outlined" placeholder="" />
          <v-text-field label="Correo" v-model="form.people[0].email" variant="outlined" placeholder="" />
          <v-text-field label="Numero de Contacto" v-model="form.people[0].phone_number" variant="outlined" placeholder="" />
        </div>
        <div v-else-if="activeForm === 'business'">
          <v-text-field label="Nombre Legal" v-model="form.businesses[0].legal_name" variant="outlined" />
          <v-text-field label="Alias" v-model="form.businesses[0].alias" variant="outlined" />
          <v-text-field label="Descripcion del Negocio" v-model="form.businesses[0].description" variant="outlined" />
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn text @click="closeDialog">Cancelar</v-btn>
        <v-btn color="primary" @click="editOrg">Actualizar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-snackbar v-model="snackbar" color="success" timeout="5000"> Organización actualizada. </v-snackbar>
</template>
