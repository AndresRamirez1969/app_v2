<script setup>
import { reactive, ref, watch, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { mdiArrowLeft } from '@mdi/js';
import AddressAutocomplete from '@/utils/helpers/google/AddressAutocomplete.vue';
import axiosInstance from '@/utils/axios';
import { useAuthStore } from '@/stores/auth';
import { timezones } from '@/utils/constants/timezones';

const auth = useAuthStore();
const router = useRouter();

const Regform = ref(null);
const parsedAddress = ref({});
const logoPreview = ref(null);
const errorMsg = ref('');
const canCreate = ref(false);
const isLoading = ref(false);

// Organización para superadmin
const organizations = ref([]);
const selectedOrganization = ref(null);

// Zona horaria (igual que business unit)
const timezoneSearch = ref('');

// Errores de validación por campo
const fieldErrors = reactive({
  legal_name: '',
  timezone: '',
  address: '',
  logo: ''
});

// Referencias a los campos para poder hacer scroll
const fieldRefs = {
  legal_name: ref(null),
  timezone: ref(null),
  address: ref(null),
  logo: ref(null)
};

onMounted(async () => {
  const user = auth.user;
  canCreate.value = user?.roles?.includes('admin') || user?.roles?.includes('superadmin') || user?.permissions?.includes('business.create');
  if (
    user?.business_id &&
    !user?.roles?.includes('superadmin') &&
    !user?.roles?.includes('admin') &&
    !user?.permissions?.includes('business.viewAny')
  ) {
    router.replace(`/negocios-dw/${user.business_id}`);
  }

  // Si es superadmin, carga organizaciones
  if (user?.roles?.includes('superadmin')) {
    try {
      const res = await axiosInstance.get('/organizations');
      organizations.value = Array.isArray(res.data) ? res.data : res.data.data;
    } catch (e) {
      organizations.value = [];
    }
  }
});

const form = reactive({
  legal_name: '',
  alias: '',
  description: '',
  timezone: '',
  logo: null,
  person: {
    first_name: '',
    last_name: '',
    email: '',
    phone_number: ''
  }
});

const clearFieldError = (fieldName) => {
  if (fieldErrors[fieldName]) {
    fieldErrors[fieldName] = '';
  }
};

const scrollToField = async (fieldName) => {
  await nextTick();

  const fieldRef = fieldRefs[fieldName];
  if (fieldRef && fieldRef.value) {
    const element = fieldRef.value.$el || fieldRef.value;

    // Hacer scroll suave hacia el elemento
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest'
    });

    // Enfocar el campo si es posible
    if (element.focus) {
      element.focus();
    } else if (element.$el && element.$el.focus) {
      element.$el.focus();
    }
  }
};

const validateField = (fieldName, value) => {
  clearFieldError(fieldName);
  switch (fieldName) {
    case 'legal_name':
      if (!value || value.trim() === '') {
        fieldErrors.legal_name = 'El nombre legal es obligatorio';
        return false;
      }
      break;
    case 'address':
      if (!parsedAddress.value || Object.keys(parsedAddress.value).length === 0) {
        fieldErrors.address = 'La dirección es obligatoria';
        return false;
      }
      break;
    case 'logo':
      if (!value) {
        fieldErrors.logo = 'El logo es obligatorio';
        return false;
      }
      break;
    case 'timezone':
      if (!value) {
        fieldErrors.timezone = 'La zona horaria es obligatoria';
        return false;
      }
      break;
  }
  return true;
};

const validateAllFields = async () => {
  let isValid = true;
  let firstErrorField = null;

  // Validar nombre legal
  if (!validateField('legal_name', form.legal_name)) {
    isValid = false;
    if (!firstErrorField) firstErrorField = 'legal_name';
  }

  // Validar zona horaria
  if (!validateField('timezone', form.timezone)) {
    isValid = false;
    if (!firstErrorField) firstErrorField = 'timezone';
  }

  // Validar dirección
  if (!validateField('address', parsedAddress.value)) {
    isValid = false;
    if (!firstErrorField) firstErrorField = 'address';
  }

  // Si hay errores, hacer scroll al primer campo con error
  if (!isValid && firstErrorField) {
    await scrollToField(firstErrorField);
  }

  return isValid;
};

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

const handleParsedAddress = (val) => {
  parsedAddress.value = val;
  // Limpiar error de dirección cuando se selecciona una
  if (val && Object.keys(val).length > 0) {
    clearFieldError('address');
  }
};

const validate = async () => {
  errorMsg.value = '';

  if (!(await validateAllFields())) {
    return;
  }

  // Validación de organización para superadmin
  const user = auth.user;
  let organization_id = null;
  if (user?.roles?.includes('superadmin')) {
    if (!selectedOrganization.value) {
      errorMsg.value = 'Selecciona una organización.';
      return;
    }
    organization_id = selectedOrganization.value;
  } else if (user?.permissions?.includes('business.create')) {
    organization_id = user.organization_id;
  }

  try {
    isLoading.value = true;

    const formData = new FormData();
    formData.append('legal_name', form.legal_name);
    formData.append('alias', form.alias || '');
    formData.append('description', form.description || '');
    formData.append('timezone', form.timezone || '');
    formData.append('organization_id', organization_id);

    // Solo agrega los campos de dirección si tienen valor
    for (const key in parsedAddress.value) {
      if (parsedAddress.value[key]) {
        formData.append(`address[${key}]`, parsedAddress.value[key]);
      }
    }

    // Solo agrega los campos de persona si tienen valor
    const hasPersonData = Object.values(form.person).some((val) => val?.trim?.() !== '');
    if (hasPersonData) {
      for (const key in form.person) {
        if (form.person[key]) {
          formData.append(`person[${key}]`, form.person[key]);
        }
      }
    }

    if (form.logo) {
      const logoFile = Array.isArray(form.logo) ? form.logo[0] : form.logo;
      formData.append('logo', logoFile);
    }

    // Crear empresa
    const res = await axiosInstance.post('/businesses', formData);

    // SOLUCIÓN: Obtén el ID correctamente
    let newBusinessId = null;
    if (res?.data?.business?.id) {
      newBusinessId = res.data.business.id;
      auth.user.business_id = newBusinessId;
    } else if (res?.data?.business_unit?.id) {
      newBusinessId = res.data.business_unit.id;
      auth.user.business_id = newBusinessId;
    } else if (res?.data?.id) {
      newBusinessId = res.data.id;
      auth.user.business_id = newBusinessId;
    }

    await auth.fetchUser();

    if (newBusinessId) {
      router.replace(`/negocios-dw/${newBusinessId}`);
    } else {
      errorMsg.value = 'No se pudo obtener el ID de la empresa creada.';
    }
  } catch (err) {
    if (err?.response?.data?.errors) {
      // Mapear errores del servidor a campos específicos
      const serverErrors = err.response.data.errors;
      let firstServerErrorField = null;

      if (serverErrors.legal_name) {
        fieldErrors.legal_name = serverErrors.legal_name[0];
        if (!firstServerErrorField) firstServerErrorField = 'legal_name';
      }
      if (serverErrors.address) {
        fieldErrors.address = serverErrors.address[0];
        if (!firstServerErrorField) firstServerErrorField = 'address';
      }
      if (serverErrors.logo) {
        fieldErrors.logo = serverErrors.logo[0];
        if (!firstServerErrorField) firstServerErrorField = 'logo';
      }

      // Si hay errores del servidor, hacer scroll al primer campo con error
      if (firstServerErrorField) {
        await scrollToField(firstServerErrorField);
      }

      // Si hay errores que no se pueden mapear, mostrarlos en el mensaje general
      const unmappedErrors = Object.keys(serverErrors).filter((key) => !['legal_name', 'address', 'logo'].includes(key));

      if (unmappedErrors.length > 0) {
        errorMsg.value = unmappedErrors
          .map((key) => serverErrors[key])
          .flat()
          .join(' ');
      }
    } else {
      errorMsg.value = 'Error al crear empresa';
    }
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div v-if="canCreate">
    <v-container fluid>
      <!-- Header -->
      <v-row class="align-center mb-6" no-gutters>
        <v-col cols="auto" class="d-flex align-center">
          <v-btn icon variant="text" class="px-3 py-2" style="border-radius: 8px; border: 1px solid #ccc" @click="router.back()">
            <v-icon :icon="mdiArrowLeft" />
          </v-btn>
          <h3 class="font-weight-medium ml-3 mb-0">Agregar Empresa</h3>
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
            <v-label>Logo <span class="text-error">*</span></v-label>
            <v-file-input
              ref="fieldRefs.logo"
              v-model="form.logo"
              variant="outlined"
              color="primary"
              class="mt-2 mb-4"
              accept="image/*"
              density="compact"
              required
              show-size
              :multiple="false"
              :error-messages="fieldErrors.logo"
              @update:model-value="clearFieldError('logo')"
            />

            <!-- Select de organización SOLO para superadmin -->
            <template v-if="auth.user?.roles?.includes('superadmin')">
              <v-label>Organización</v-label>
              <v-select
                v-model="selectedOrganization"
                :items="organizations"
                item-title="legal_name"
                item-value="id"
                variant="outlined"
                color="primary"
                class="mt-2 mb-4"
                density="compact"
                :searchable="true"
                placeholder="Buscar organización"
                required
              />
            </template>

            <v-label>Nombre Legal <span class="text-error">*</span></v-label>
            <v-text-field
              ref="fieldRefs.legal_name"
              v-model="form.legal_name"
              variant="outlined"
              color="primary"
              class="mt-2 mb-4"
              required
              :error-messages="fieldErrors.legal_name"
              @update:model-value="clearFieldError('legal_name')"
            />

            <v-label>Alias</v-label>
            <v-text-field v-model="form.alias" variant="outlined" color="primary" class="mt-2 mb-4" />

            <v-label>Descripción</v-label>
            <v-textarea v-model="form.description" variant="outlined" color="primary" auto-grow rows="3" class="mt-2" />

            <v-label>Zona Horaria <span class="text-error">*</span></v-label>
            <v-autocomplete
              ref="fieldRefs.timezone"
              v-model="form.timezone"
              :items="timezones.map((tz) => ({ label: tz, value: tz }))"
              v-model:search-input="timezoneSearch"
              item-title="label"
              item-value="value"
              variant="outlined"
              color="primary"
              class="mt-2 mb-4"
              density="compact"
              placeholder="Selecciona una zona horaria"
              clearable
              hide-details
              :menu-props="{ maxHeight: '300px' }"
              :error-messages="fieldErrors.timezone"
              @update:model-value="clearFieldError('timezone')"
            />
          </v-col>

          <!-- Dirección -->
          <v-col cols="12" class="mt-4">
            <v-label>Dirección <span class="text-error">*</span></v-label>
            <AddressAutocomplete class="mt-2" @update:parsedAddress="handleParsedAddress" />
            <v-text-field
              ref="fieldRefs.address"
              v-if="fieldErrors.address"
              :model-value="''"
              variant="outlined"
              color="error"
              class="mt-2"
              :error-messages="fieldErrors.address"
              readonly
              hide-details
            />
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
            <v-btn color="primary" class="mt-6" :loading="isLoading" :disabled="isLoading" @click="validate">
              <template v-slot:loader>
                <v-progress-circular indeterminate color="white" size="20" />
              </template>
              {{ isLoading ? 'Creando Empresa...' : 'Crear Empresa' }}
            </v-btn>
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
  </div>
</template>
