<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { mdiArrowLeft } from '@mdi/js';
import axiosInstance from '@/utils/axios';
import AddressAutocomplete from '@/utils/helpers/google/AddressAutocomplete.vue';

const router = useRouter();
const route = useRoute();
const organizationId = route.params.id;

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

const parsedAddress = ref({});
const logoPreview = ref(null);
const errorMsg = ref('');

// Computed para mostrar dirección fallback en el autocomplete si no hay 'street'
const fullAddress = computed(() => {
  if (parsedAddress.value?.street) {
    return `${parsedAddress.value.street} ${parsedAddress.value.outdoor_number || ''}`.trim();
  }

  if (parsedAddress.value) {
    return [parsedAddress.value.neighborhood, parsedAddress.value.city, parsedAddress.value.state].filter(Boolean).join(', ');
  }

  return '';
});

onMounted(async () => {
  try {
    const res = await axiosInstance.get(`/organizations/${organizationId}`);
    const data = res.data;

    form.legal_name = data.legal_name || '';
    form.alias = data.alias || '';
    form.description = data.description || '';

    // Validar si es URL absoluta o relativa
    if (data.logo) {
      logoPreview.value = data.logo.startsWith('http') ? data.logo : `/storage/${data.logo}`;
    }

    if (data.address) {
      parsedAddress.value = {
        street: data.address.street || '',
        outdoor_number: data.address.outdoor_number || '',
        neighborhood: data.address.neighborhood || '',
        postal_code: data.address.postal_code || '',
        city: data.address.city || '',
        state: data.address.state || '',
        country: data.address.country || ''
      };
    }

    if (data.person) {
      form.people.first_name = data.person.first_name || '';
      form.people.last_name = data.person.last_name || '';
      form.people.email = data.person.email || '';
      form.people.phone_number = data.person.phone_number || '';
    }
  } catch (err) {
    console.error('❌ Error al cargar datos de organización', err);
  }
});

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

    const hasPersonData = Object.values(form.people).some((val) => val && val.trim() !== '');
    if (hasPersonData) {
      for (const key in form.people) {
        const val = form.people[key];
        formData.append(`person[${key}]`, typeof val === 'string' ? val : '');
      }
    }

    if (form.logo) {
      if (Array.isArray(form.logo)) {
        formData.append('logo', form.logo[0]);
      } else {
        formData.append('logo', form.logo);
      }
    }

    console.log('📤 Datos enviados:', [...formData.entries()]);

    await axiosInstance.post(`/organizations/${organizationId}?_method=PUT`, formData);
    router.push('/organizaciones');
  } catch (err) {
    errorMsg.value = 'Error al actualizar organización';
    console.error('❌ Error al actualizar organización', err.response?.data || err);
  }
};
</script>

<template>
  <v-container fluid>
    <v-row class="align-center mb-6" no-gutters>
      <v-col cols="auto" class="d-flex align-center">
        <v-btn icon variant="text" class="px-3 py-2" style="border-radius: 8px; border: 1px solid #ccc" @click="router.back()">
          <v-icon :icon="mdiArrowLeft" />
        </v-btn>
        <h3 class="font-weight-medium ml-3 mb-0">Editar Organización</h3>
      </v-col>
    </v-row>

    <v-form class="mb-10">
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

        <v-col cols="12" class="mt-4">
          <v-label>Dirección</v-label>
          <AddressAutocomplete
            class="mt-2"
            :initial-value="parsedAddress"
            :placeholder="fullAddress"
            @update:parsedAddress="handleParsedAddress"
          />
        </v-col>
      </v-row>

      <v-row class="mt-10">
        <v-col cols="12">
          <h4 class="font-weight-bold mb-3">Contacto</h4>
          <v-divider class="mb-6" />
        </v-col>

        <v-col cols="12" sm="6">
          <v-label>Nombre</v-label>
          <v-text-field v-model="form.people.first_name" variant="outlined" color="primary" class="mt-2" />
        </v-col>

        <v-col cols="12" sm="6">
          <v-label>Apellido</v-label>
          <v-text-field v-model="form.people.last_name" variant="outlined" color="primary" class="mt-2" />
        </v-col>

        <v-col cols="12" sm="6">
          <v-label>Email</v-label>
          <v-text-field v-model="form.people.email" variant="outlined" color="primary" class="mt-2" />
        </v-col>

        <v-col cols="12" sm="6">
          <v-label>Teléfono</v-label>
          <v-text-field v-model="form.people.phone_number" variant="outlined" color="primary" class="mt-2" />
        </v-col>
      </v-row>

      <v-row>
        <v-col cols="12" class="d-flex justify-end">
          <v-btn color="primary" class="mt-6" @click="validate">Guardar Cambios</v-btn>
        </v-col>
      </v-row>

      <v-row v-if="errorMsg" class="mt-4">
        <v-col cols="12">
          <v-alert type="error" dense>{{ errorMsg }}</v-alert>
        </v-col>
      </v-row>
    </v-form>
  </v-container>
</template>
