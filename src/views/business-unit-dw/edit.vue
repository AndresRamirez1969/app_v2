<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { mdiArrowLeft } from '@mdi/js';
import axiosInstance from '@/utils/axios';
import AddressAutocomplete from '@/utils/helpers/google/AddressAutocomplete.vue';
import { useAuthStore } from '@/stores/auth';
import { timezones } from '@/utils/constants/timezones';

const router = useRouter();
const route = useRoute();
const business_unitId = route.params.id;
const auth = useAuthStore();

// Organización y Empresa
const organizations = ref([]);
const selectedOrganization = ref(null);
const organizationSearch = ref('');
const loadingOrganizations = ref(false);

const businesses = ref([]);
const selectedBusiness = ref(null);
const businessSearch = ref('');
const loadingBusinesses = ref(false);

const timezoneSearch = ref('');

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

const parsedAddress = ref({});
const logoPreview = ref(null);
const errorMsg = ref('');

// Roles y permisos
const user = computed(() => auth.user || { roles: [], permissions: [] });
const roles = computed(() => (Array.isArray(user.value.roles) ? user.value.roles : user.value.roles?.map?.((r) => r.name) || []));
const permissions = computed(() =>
  Array.isArray(user.value.permissions) ? user.value.permissions : user.value.permissions?.map?.((p) => p.name) || []
);

const isSuperadmin = computed(() => roles.value.includes('superadmin'));
const isAdmin = computed(() => roles.value.includes('admin'));
const isSponsor = computed(() => roles.value.includes('sponsor'));
const canSelectBusiness = computed(() => isAdmin.value || isSponsor.value || permissions.value.includes('businessUnit.create'));
const canEdit = computed(() => isSuperadmin.value || isAdmin.value || permissions.value.includes('businessUnit.update'));

const fullAddress = computed(() => {
  if (parsedAddress.value?.street) {
    return `${parsedAddress.value.street} ${parsedAddress.value.outdoor_number || ''}`.trim();
  }
  if (parsedAddress.value) {
    return [parsedAddress.value.neighborhood, parsedAddress.value.city, parsedAddress.value.state].filter(Boolean).join(', ');
  }
  return '';
});

// GET de la organización y empresa a la que pertenece la unidad de negocio
const fetchOrganizationById = async (id) => {
  if (!id) return;
  loadingOrganizations.value = true;
  try {
    const { data } = await axiosInstance.get(`/organizations/${id}`);
    organizations.value = [
      {
        ...data,
        display: `${data.folio}${data.legal_name ? ' - ' + data.legal_name : ''}`,
        id: data.id
      }
    ];
  } catch (e) {
    organizations.value = [];
  } finally {
    loadingOrganizations.value = false;
  }
};

const fetchBusinessById = async (id, orgId) => {
  if (!id || !orgId) return;
  loadingBusinesses.value = true;
  try {
    const { data } = await axiosInstance.get(`/businesses/${id}`);
    businesses.value = [
      {
        ...data,
        display: `${data.folio}${data.legal_name ? ' - ' + data.legal_name : ''}`,
        id: data.id
      }
    ];
  } catch (e) {
    businesses.value = [];
  } finally {
    loadingBusinesses.value = false;
  }
};

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

onMounted(async () => {
  try {
    const res = await axiosInstance.get(`/business-units/${business_unitId}`);
    const data = res.data;

    form.legal_name = data.legal_name || '';
    form.alias = data.alias || '';
    form.description = data.description || '';
    form.timezone = data.timezone || '';

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
      form.person.first_name = data.person.first_name || '';
      form.person.last_name = data.person.last_name || '';
      form.person.email = data.person.email || '';
      form.person.phone_number = data.person.phone_number || '';
    }

    // GET de la organización y empresa a la que pertenece
    if (data.organization_id) {
      await fetchOrganizationById(data.organization_id);
      selectedOrganization.value = data.organization_id;
    }
    if (data.business_id && data.organization_id) {
      await fetchBusinessById(data.business_id, data.organization_id);
      selectedBusiness.value = data.business_id;
    }

    // --- NUEVO: Organización y Empresa para selects dinámicos ---
    if (isSuperadmin.value) {
      await fetchOrganizations('');
    }
    if ((isSuperadmin.value || canSelectBusiness.value) && data.organization_id) {
      await fetchBusinesses('', data.organization_id);
    }
  } catch (err) {
    console.error('❌ Error al cargar datos de ubicación', err);
  }
});

// Actualiza la previsualización del logo si el usuario selecciona uno nuevo
watch(
  () => form.logo,
  (file) => {
    let imageFile = null;
    if (Array.isArray(file)) {
      imageFile = file.length > 0 ? file[0] : null;
    } else if (file instanceof File || file instanceof Blob) {
      imageFile = file;
    }
    logoPreview.value = imageFile ? URL.createObjectURL(imageFile) : logoPreview.value;
  }
);

const handleParsedAddress = (val) => {
  parsedAddress.value = val;
};

const validate = async () => {
  errorMsg.value = '';
  if (!form.legal_name || !parsedAddress.value || Object.keys(parsedAddress.value).length === 0) {
    errorMsg.value = 'Por favor completa el nombre legal y la dirección.';
    return;
  }

  // Validación de organización y empresa
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

  let business_id = null;
  if ((isSuperadmin.value || canSelectBusiness.value) && selectedBusiness.value) {
    business_id = selectedBusiness.value;
  }

  try {
    const formData = new FormData();
    formData.append('legal_name', form.legal_name);
    formData.append('alias', form.alias || '');
    formData.append('description', form.description || '');
    formData.append('timezone', form.timezone || '');
    if (organization_id) formData.append('organization_id', organization_id);
    if (business_id) formData.append('business_id', business_id);

    for (const key in parsedAddress.value) {
      formData.append(`address[${key}]`, parsedAddress.value[key] || '');
    }

    const hasPersonData = Object.values(form.person).some((val) => val && val.trim() !== '');
    if (hasPersonData) {
      for (const key in form.person) {
        const val = form.person[key];
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

    await axiosInstance.post(`/business-units/${business_unitId}?_method=PUT`, formData);

    // Refresca datos del usuario si edita su propia ubicación
    if (auth.user?.business_unit_id && String(auth.user.business_unit_id) === String(business_unitId)) {
      await auth.fetchUser();
    }

    router.push(`/ubicaciones-dw/${business_unitId}`);
  } catch (err) {
    errorMsg.value = 'Error al actualizar ubicación';
    console.error('❌ Error al actualizar ubicación', err.response?.data || err);
  }
};
</script>

<template>
  <v-container fluid v-if="canEdit">
    <v-row class="align-center mb-6" no-gutters>
      <v-col cols="auto" class="d-flex align-center">
        <v-btn icon variant="text" class="px-3 py-2" style="border-radius: 8px; border: 1px solid #ccc" @click="router.back()">
          <v-icon :icon="mdiArrowLeft" />
        </v-btn>
        <h3 class="font-weight-medium ml-3 mb-0">Editar Ubicación</h3>
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

          <!-- Select de organización SOLO para superadmin -->
          <template v-if="isSuperadmin">
            <v-label>Organización</v-label>
            <v-autocomplete
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
            />
            <div style="height: 16px"></div>
          </template>

          <!-- Select de empresa SOLO para superadmin, admin, sponsor, businessUnit.create -->
          <template v-if="selectedOrganization && (isSuperadmin || canSelectBusiness)">
            <v-label>Empresa</v-label>
            <v-autocomplete
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
            />
            <div style="height: 16px"></div>
          </template>

          <v-label>Nombre Legal</v-label>
          <v-text-field v-model="form.legal_name" variant="outlined" color="primary" class="mt-2 mb-4" required />

          <v-label>Alias</v-label>
          <v-text-field v-model="form.alias" variant="outlined" color="primary" class="mt-2 mb-4" />

          <v-label>Descripción</v-label>
          <v-textarea v-model="form.description" variant="outlined" color="primary" auto-grow rows="3" class="mt-2" />

          <v-label>Zona Horaria</v-label>
          <v-autocomplete
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
          />
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
  <div v-else>
    <v-alert type="error" class="mt-10" variant="outlined" density="comfortable"> No tienes acceso para editar esta ubicación. </v-alert>
  </div>
</template>
