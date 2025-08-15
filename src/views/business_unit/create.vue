<script setup>
import { reactive, ref, watch, onMounted, computed, nextTick } from 'vue';
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

const timezoneSearch = ref('');

const user = computed(() => auth.user);

const isSuperadmin = computed(() => user.value?.roles?.includes('superadmin'));
const isAdmin = computed(() => user.value?.roles?.includes('admin'));
const isSponsor = computed(() => user.value?.roles?.includes('sponsor'));
const canSelectBusiness = computed(() => isAdmin.value || isSponsor.value || user.value?.permissions?.includes('businessUnit.create'));

// ORGANIZATION SELECT (solo superadmin)
const organizations = ref([]);
const selectedOrganization = ref(null);
const organizationSearch = ref('');
const loadingOrganizations = ref(false);

// BUSINESS SELECT (admin, sponsor, businessUnit.create)
const businesses = ref([]);
const selectedBusiness = ref(null);
const businessSearch = ref('');
const loadingBusinesses = ref(false);

// Errores de validación por campo
const fieldErrors = reactive({
  legal_name: '',
  timezone: '',
  address: '',
  logo: '',
  business: ''
});

// Referencias a los campos para poder hacer scroll
const fieldRefs = {
  legal_name: ref(null),
  timezone: ref(null),
  address: ref(null),
  logo: ref(null),
  business: ref(null)
};

onMounted(async () => {
  canCreate.value = isAdmin.value || isSuperadmin.value || user.value?.permissions?.includes('businessUnit.create');
  if (user.value?.business_id && !isSuperadmin.value && !isAdmin.value && !user.value?.permissions?.includes('businessUnit.viewAny')) {
    router.replace(`/ubicaciones/${user.value.business_unit_id}`);
  }

  // Si es superadmin, carga organizaciones
  if (isSuperadmin.value) {
    await fetchOrganizations('');
  }
  // Si puede seleccionar business, carga businesses de su organización
  if (canSelectBusiness.value && user.value?.organization_id) {
    selectedOrganization.value = user.value.organization_id;
    await fetchBusinesses('', user.value.organization_id);
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

// Función para limpiar errores de un campo específico
const clearFieldError = (fieldName) => {
  if (fieldErrors[fieldName]) {
    fieldErrors[fieldName] = '';
  }
};

// Función para hacer scroll hacia un campo específico
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

// Función para validar un campo específico
const validateField = (fieldName, value) => {
  clearFieldError(fieldName);

  switch (fieldName) {
    case 'legal_name':
      if (!value) {
        fieldErrors.legal_name = 'El nombre legal es obligatorio';
        return false;
      }
      break;

    case 'timezone':
      if (!value) {
        fieldErrors.timezone = 'La zona horaria es obligatoria';
        return false;
      }
      break;

    case 'address':
      if (!parsedAddress.value || Object.keys(parsedAddress.value).length === 0) {
        fieldErrors.address = 'La dirección es obligatoria';
        return false;
      }
      break;

    case 'business':
      if ((isSuperadmin.value || canSelectBusiness.value) && !value) {
        fieldErrors.business = 'La empresa es obligatoria';
        return false;
      }
      break;

    case 'logo':
      // El logo es opcional, no necesita validación
      break;
  }

  return true;
};

// Función para validar todos los campos y hacer scroll al primero con error
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

  // Validar organización (solo para superadmin)
  if (isSuperadmin.value) {
    if (!validateField('organization', selectedOrganization.value)) {
      isValid = false;
      if (!firstErrorField) firstErrorField = 'organization';
    }
  }

  // Validar business (para superadmin, admin, sponsor, businessUnit.create)
  if (isSuperadmin.value || canSelectBusiness.value) {
    if (!validateField('business', selectedBusiness.value)) {
      isValid = false;
      if (!firstErrorField) firstErrorField = 'business';
    }
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

const fetchOrganizations = async (searchText) => {
  loadingOrganizations.value = true;
  try {
    const { data } = await axiosInstance.get('/organizations', {
      params: {
        q: searchText || '',
        limit: 10
      }
    });
    organizations.value = (data.data || []).map((o) => ({
      ...o,
      display: `${o.folio}${o.legal_name ? ' - ' + o.legal_name : ''}`,
      id: o.id
    }));
  } catch (e) {
    organizations.value = [];
  } finally {
    loadingOrganizations.value = false;
  }
};

watch(organizationSearch, (val) => {
  if (isSuperadmin.value) fetchOrganizations(val);
});

watch(selectedOrganization, async (orgId) => {
  selectedBusiness.value = null;
  clearFieldError('organization');
  if (orgId) await fetchBusinesses('', orgId);
});

const fetchBusinesses = async (searchText, orgId) => {
  if (!orgId) {
    businesses.value = [];
    return;
  }
  loadingBusinesses.value = true;
  try {
    const { data } = await axiosInstance.get('/businesses', {
      params: {
        q: searchText || '',
        organization_id: orgId,
        limit: 10
      }
    });
    businesses.value = (data.data || []).map((b) => ({
      ...b,
      display: `${b.folio}${b.legal_name ? ' - ' + b.legal_name : ''}`,
      id: b.id
    }));
  } catch (e) {
    businesses.value = [];
  } finally {
    loadingBusinesses.value = false;
  }
};

watch(businessSearch, (val) => {
  if (selectedOrganization.value) fetchBusinesses(val, selectedOrganization.value);
});

const handleParsedAddress = (val) => {
  parsedAddress.value = val;
  // Limpiar error de dirección cuando se selecciona una
  if (val && Object.keys(val).length > 0) {
    clearFieldError('address');
  }
};

const isLoading = ref(false);

const validate = async () => {
  // Limpiar mensaje de error general
  errorMsg.value = '';

  // Validar todos los campos
  if (!(await validateAllFields())) {
    return; // No continuar si hay errores de validación
  }

  isLoading.value = true;

  try {
    const formData = new FormData();
    formData.append('legal_name', form.legal_name);
    formData.append('alias', form.alias || '');
    formData.append('description', form.description || '');
    formData.append('timezone', form.timezone || '');

    // Validación de organización para superadmin
    let organization_id = null;
    if (isSuperadmin.value) {
      if (!selectedOrganization.value) {
        errorMsg.value = 'Selecciona una organización.';
        return;
      }
      organization_id = selectedOrganization.value;
    } else if (canSelectBusiness.value) {
      organization_id = user.value.organization_id;
    }

    // Validación de business para superadmin, admin, sponsor, businessUnit.create
    let business_id = null;
    if ((isSuperadmin.value || canSelectBusiness.value) && selectedBusiness.value) {
      business_id = selectedBusiness.value;
    }

    if (organization_id) formData.append('organization_id', organization_id);
    if (business_id) formData.append('business_id', business_id);

    for (const key in parsedAddress.value) {
      if (parsedAddress.value[key]) {
        formData.append(`address[${key}]`, parsedAddress.value[key]);
      }
    }

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

    // Crear unidad de negocio
    const res = await axiosInstance.post('/business-units', formData);

    // Obtener el ID del business unit creado de forma robusta
    const newId = res?.data?.id || res?.data?.business_unit?.id || res?.data?.data?.id;

    if (newId) {
      auth.user.business_unit_id = newId;
      await auth.fetchUser();
      router.replace(`/ubicaciones/${newId}`);
    } else {
      errorMsg.value = 'No se pudo obtener el ID de la ubicación creada.';
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
      if (serverErrors.timezone) {
        fieldErrors.timezone = serverErrors.timezone[0];
        if (!firstServerErrorField) firstServerErrorField = 'timezone';
      }
      if (serverErrors.address) {
        fieldErrors.address = serverErrors.address[0];
        if (!firstServerErrorField) firstServerErrorField = 'address';
      }
      if (serverErrors.logo) {
        fieldErrors.logo = serverErrors.logo[0];
        if (!firstServerErrorField) firstServerErrorField = 'logo';
      }
      if (serverErrors.organization_id) {
        fieldErrors.organization = serverErrors.organization_id[0];
        if (!firstServerErrorField) firstServerErrorField = 'organization';
      }
      if (serverErrors.business_id) {
        fieldErrors.business = serverErrors.business_id[0];
        if (!firstServerErrorField) firstServerErrorField = 'business';
      }

      // Si hay errores del servidor, hacer scroll al primer campo con error
      if (firstServerErrorField) {
        await scrollToField(firstServerErrorField);
      }

      // Si hay errores que no se pueden mapear, mostrarlos en el mensaje general
      const unmappedErrors = Object.keys(serverErrors).filter(
        (key) => !['legal_name', 'timezone', 'address', 'logo', 'organization_id', 'business_id'].includes(key)
      );

      if (unmappedErrors.length > 0) {
        errorMsg.value = unmappedErrors
          .map((key) => serverErrors[key])
          .flat()
          .join(' ');
      }
    } else if (err?.response?.data?.message) {
      errorMsg.value = err.response.data.message;
    } else {
      errorMsg.value = 'Error al crear la ubicación';
    }
    console.error('❌ Error al crear la ubicación:', err);
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
          <h3 class="font-weight-medium ml-3 mb-0">Agregar Ubicación</h3>
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
              ref="fieldRefs.logo"
              v-model="form.logo"
              variant="outlined"
              color="primary"
              class="mt-2 mb-4"
              accept="image/*"
              density="compact"
              show-size
              :multiple="false"
              :error-messages="fieldErrors.logo"
              @update:model-value="clearFieldError('logo')"
            />

            <!-- Select de organización SOLO para superadmin -->
            <template v-if="isSuperadmin">
              <v-label>Organización <span class="text-error">*</span></v-label>
              <v-autocomplete
                ref="fieldRefs.organization"
                v-model="selectedOrganization"
                :items="organizations"
                :loading="loadingOrganizations"
                v-model:search-input="organizationSearch"
                item-title="display"
                item-value="id"
                variant="outlined"
                color="primary"
                class="mt-2 mb-4"
                density="compact"
                placeholder="Buscar organización"
                clearable
                hide-details
                :menu-props="{ maxHeight: '300px' }"
                :error-messages="fieldErrors.organization"
                @update:model-value="clearFieldError('organization')"
              />
              <div style="height: 16px"></div>
            </template>

            <!-- Select de empresa SOLO para superadmin, admin, sponsor, businessUnit.create -->
            <template v-if="selectedOrganization && (isSuperadmin || canSelectBusiness)">
              <v-label>Empresa <span class="text-error">*</span></v-label>
              <v-autocomplete
                ref="fieldRefs.business"
                v-model="selectedBusiness"
                :items="businesses"
                :loading="loadingBusinesses"
                v-model:search-input="businessSearch"
                item-title="display"
                item-value="id"
                variant="outlined"
                color="primary"
                class="mt-2 mb-4"
                density="compact"
                placeholder="Buscar empresa"
                clearable
                hide-details
                :menu-props="{ maxHeight: '300px' }"
                :error-messages="fieldErrors.business"
                @update:model-value="clearFieldError('business')"
              />
              <div style="height: 16px"></div>
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
              required
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
              {{ isLoading ? 'Creando Ubicación...' : 'Crear Ubicación' }}
            </v-btn>
          </v-col>
        </v-row>

        <!-- Mensaje de error general (solo para errores no mapeables) -->
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
