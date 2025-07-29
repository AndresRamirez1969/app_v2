<script setup>
import { reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { mdiArrowLeft } from '@mdi/js';
import AddressAutocomplete from '@/utils/helpers/google/AddressAutocomplete.vue';
import axiosInstance from '@/utils/axios';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();

const Regform = ref(null);
const parsedAddress = ref({});
const logoPreview = ref(null);
const errorMsg = ref('');

const form = reactive({
  legal_name: '',
  alias: '',
  description: '',
  logo: null,
  person: {
    first_name: '',
    last_name: '',
    email: '',
    phone_number: ''
  }
});

// Watch para previsualización de logo
watch(
  () => form.logo,
  (file) => {
    let imageFile = null;
    if (Array.isArray(file)) {
      imageFile = file.length > 0 ? file[0] : null;
    } else if (file instanceof File || file instanceof Blob) {
      imageFile = file;
    }
    logoPreview.value = imageFile ? URL.createObjectURL(imageFile) : null;
  }
);

// Callback del autocomplete
const handleParsedAddress = (val) => {
  parsedAddress.value = val;
};

const validate = async () => {
  errorMsg.value = '';

  if (!form.legal_name || !parsedAddress.value || Object.keys(parsedAddress.value).length === 0) {
    errorMsg.value = 'Por favor completa el nombre legal y la dirección.';
    return;
  }

  try {
    const formData = new FormData();
    formData.append('legal_name', form.legal_name);
    formData.append('alias', form.alias || '');
    formData.append('description', form.description || '');

    for (const key in parsedAddress.value) {
      formData.append(`address[${key}]`, parsedAddress.value[key] || '');
    }

    const hasPersonData = Object.values(form.person).some((val) => val?.trim?.() !== '');
    if (hasPersonData) {
      for (const key in form.person) {
        formData.append(`person[${key}]`, form.person[key] || '');
      }
    }

    if (form.logo) {
      const logoFile = Array.isArray(form.logo) ? form.logo[0] : form.logo;
      formData.append('logo', logoFile);
    }

    const res = await axiosInstance.post('/organizations', formData);
    await auth.fetchUser();
    router.push('/organizaciones');
  } catch (err) {
    errorMsg.value = 'Error al crear organización';
    console.error('❌ Error al crear organización:', err);
  }
};
</script>

<template>
  <v-container fluid>
    <!-- Header -->
    <v-row class="align-center mb-6" no-gutters>
      <v-col cols="auto" class="d-flex align-center">
        <v-btn icon variant="text" class="px-3 py-2" style="border-radius: 8px; border: 1px solid #ccc" @click="router.back()">
          <v-icon :icon="mdiArrowLeft" />
        </v-btn>
        <h3 class="font-weight-medium ml-3 mb-0">Agregar Organización</h3>
      </v-col>
    </v-row>

    <v-form ref="Regform" lazy-validation class="mb-10">
      <!-- Info General -->
      <v-row>
        <v-col cols="12">
          <h4 class="font-weight-bold mb-3">Información General</h4>
          <v-divider class="mb-6" />
        </v-col>

        <v-col cols="12" md="6" class="d-flex flex-column align-center justify-center" style="min-height: 300px">
          <template v-if="logoPreview">
            <img :src="logoPreview" alt="Logo Preview" style="max-width: 300px; max-height: 300px; border-radius: 12px" />
          </template>
          <template v-else>
            <div
              style="
                width: 300px;
                height: 300px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #f5f5f5;
                border-radius: 12px;
              "
            >
              <span style="color: #bbb">Sin logo</span>
            </div>
          </template>
        </v-col>

        <v-col cols="12" md="6">
          <v-label>Logo</v-label>
          <v-file-input
            v-model="form.logo"
            variant="outlined"
            color="primary"
            class="mt-2 mb-4"
            accept="image/*"
            density="compact"
            show-size
            :multiple="false"
          />

          <v-label>Nombre Legal</v-label>
          <v-text-field v-model="form.legal_name" variant="outlined" color="primary" class="mt-2 mb-4" required />

          <v-label>Alias</v-label>
          <v-text-field v-model="form.alias" variant="outlined" color="primary" class="mt-2 mb-4" />

          <v-label>Descripción</v-label>
          <v-textarea v-model="form.description" variant="outlined" color="primary" auto-grow rows="3" class="mt-2" />
        </v-col>

        <!-- Dirección -->
        <v-col cols="12" class="mt-4">
          <v-label>Dirección</v-label>
          <AddressAutocomplete class="mt-2" @update:parsedAddress="handleParsedAddress" />
        </v-col>
      </v-row>

      <!-- Contacto -->
      <v-row class="mt-10">
        <v-col cols="12">
          <h4 class="font-weight-bold mb-3">Contacto</h4>
          <v-divider class="mb-6" />
        </v-col>

        <v-col cols="12" sm="6">
          <v-label>Nombre</v-label>
          <v-text-field v-model="form.person.first_name" variant="outlined" color="primary" class="mt-2" />
        </v-col>

        <v-col cols="12" sm="6">
          <v-label>Apellido</v-label>
          <v-text-field v-model="form.person.last_name" variant="outlined" color="primary" class="mt-2" />
        </v-col>

        <v-col cols="12" sm="6">
          <v-label>Email</v-label>
          <v-text-field v-model="form.person.email" variant="outlined" color="primary" class="mt-2" />
        </v-col>

        <v-col cols="12" sm="6">
          <v-label>Teléfono</v-label>
          <v-text-field v-model="form.person.phone_number" variant="outlined" color="primary" class="mt-2" />
        </v-col>
      </v-row>

      <!-- Botón -->
      <v-row>
        <v-col cols="12" class="d-flex justify-end">
          <v-btn color="primary" class="mt-6" @click="validate">Crear Organización</v-btn>
        </v-col>
      </v-row>

      <v-alert
        v-if="errorMsg"
        type="error"
        class="mt-6"
        variant="outlined"
        density="comfortable"
        style="max-width: 500px; margin-left: auto"
      >
        {{ errorMsg }}
      </v-alert>
    </v-form>
  </v-container>
</template>
