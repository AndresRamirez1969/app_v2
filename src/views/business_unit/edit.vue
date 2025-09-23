<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { mdiArrowLeft } from '@mdi/js';
import axiosInstance from '@/utils/axios';
import AddressAutocomplete from '@/utils/helpers/google/AddressAutocomplete.vue';
import { useAuthStore } from '@/stores/auth';
import { timezones as tzRaw } from '@/utils/constants/timezones';
import { toVuetifyItems, findCountryByCode } from '@/utils/constants/countries';

const router = useRouter();
const route = useRoute();
const business_unitId = route.params.id;
const auth = useAuthStore();

const organizations = ref([]);
const selectedOrganization = ref(null);
const organizationSearch = ref('');
const loadingOrganizations = ref(false);

const businesses = ref([]);
const selectedBusiness = ref(null);
const businessSearch = ref('');
const loadingBusinesses = ref(false);

const timezoneSearch = ref('');
const phoneCountrySearch = ref('');

const parsedAddress = ref({});
const logoPreview = ref(null);
const errorMsg = ref('');
const isLoading = ref(false);

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

function normalizeString(str) {
  return str
    ? str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
    : '';
}

function baseCountryTitle(title = '') {
  return normalizeString(
    String(title)
      .replace(/\s*\(\+\d+\)\s*$/, '')
      .trim()
  );
}

function getDialPrefix(value, titleFallback = '') {
  const c = findCountryByCode(value);
  const fromModel = c?.dial_code ?? c?.calling_code ?? c?.callingCode ?? c?.phoneCode ?? null;
  if (fromModel) return String(fromModel).startsWith('+') ? fromModel : `+${fromModel}`;
  const m = String(titleFallback).match(/\(\+[\d]+\)/);
  if (m && m[0]) return m[0].replace(/[()]/g, '');
  return '';
}

function betterCountryItem(a, b) {
  const score = (it) => {
    const dial = getDialPrefix(it.value, it.title);
    let s = 0;
    if (dial) s += 2;
    if (it.value) s += 1;
    if (String(it.value || '').length <= 3) s += 1;
    return s;
  };
  return score(a) >= score(b) ? a : b;
}

function buildUniqueCountries() {
  const raw = toVuetifyItems();
  const seen = new Set();
  const filtered = raw.filter((item) => {
    if (seen.has(item.value)) return false;
    seen.add(item.value);
    return true;
  });
  const byName = new Map();
  for (const item of filtered) {
    const key = baseCountryTitle(item.title);
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, item);
    } else {
      byName.set(key, betterCountryItem(existing, item));
    }
  }
  const result = Array.from(byName.values()).map((it) => ({
    ...it,
    title: it.title.replace(/\s*\(\+\d+\)\s*$/, '').trim()
  }));
  result.sort((a, b) => baseCountryTitle(a.title).localeCompare(baseCountryTitle(b.title)));
  return result;
}

const UNIQUE_COUNTRIES = buildUniqueCountries();

const filteredCountries = computed(() => {
  const q = normalizeString(phoneCountrySearch.value);
  if (!q) return UNIQUE_COUNTRIES;
  return UNIQUE_COUNTRIES.filter((item) => {
    const name = baseCountryTitle(item.title);
    const dial = normalizeString(getDialPrefix(item.value, item.title));
    return name.includes(q) || dial.includes(q);
  });
});

const filteredTimezones = computed(() => {
  const search = normalizeString(timezoneSearch.value);
  if (!search) return tzRaw;
  return tzRaw.filter((tz) => normalizeString(tz.label).includes(search) || normalizeString(tz.value).includes(search));
});

const form = reactive({
  name: '',
  alias: '',
  description: '',
  timezone: '',
  logo: null,
  person: {
    first_name: '',
    last_name: '',
    email: '',
    phone_country: '',
    phone_number: ''
  }
});

const fieldErrors = reactive({
  name: '',
  timezone: '',
  address: '',
  logo: '',
  phone_country: '',
  organization_id: '',
  business_id: ''
});

const fieldRefs = {
  name: ref(null),
  timezone: ref(null),
  address: ref(null),
  logo: ref(null),
  phone_country: ref(null),
  organization_id: ref(null),
  business_id: ref(null)
};

const clearFieldError = (fieldName) => {
  if (fieldErrors[fieldName]) fieldErrors[fieldName] = '';
};

const scrollToField = async (fieldName) => {
  await nextTick();
  const fieldRef = fieldRefs[fieldName];
  if (fieldRef && fieldRef.value) {
    const element = fieldRef.value.$el || fieldRef.value;
    element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    if (element.focus) element.focus();
    else if (element.$el && element.$el.focus) element.$el.focus();
  }
};

const validateField = (fieldName, value) => {
  clearFieldError(fieldName);
  switch (fieldName) {
    case 'name':
      if (!value || value.trim() === '') {
        fieldErrors.name = 'El nombre es obligatorio.';
        return false;
      }
      break;
    case 'timezone':
      if (!value || value.trim() === '') {
        fieldErrors.timezone = 'La zona horaria es obligatoria.';
        return false;
      }
      break;
    case 'address':
      if (
        !parsedAddress.value ||
        Object.keys(parsedAddress.value).length === 0 ||
        !parsedAddress.value.street ||
        parsedAddress.value.street.trim() === ''
      ) {
        fieldErrors.address = 'La dirección es obligatoria.';
        return false;
      }
      break;
    case 'phone_country':
      if (form.person.phone_number && !value) {
        fieldErrors.phone_country = 'Selecciona el país para el teléfono.';
        return false;
      }
      break;
    case 'organization_id':
      if (isSuperadmin.value && !selectedOrganization.value) {
        fieldErrors.organization_id = 'La organización es obligatoria.';
        return false;
      }
      break;
    case 'business_id':
      if ((isSuperadmin.value || canSelectBusiness.value) && !selectedBusiness.value) {
        fieldErrors.business_id = 'La empresa es obligatoria.';
        return false;
      }
      break;
  }
  return true;
};

const validateAllFields = async () => {
  let isValid = true;
  let firstErrorField = null;
  if (!validateField('name', form.name)) {
    isValid = false;
    if (!firstErrorField) firstErrorField = 'name';
  }
  if (!validateField('timezone', form.timezone)) {
    isValid = false;
    if (!firstErrorField) firstErrorField = 'timezone';
  }
  if (!validateField('address', parsedAddress.value)) {
    isValid = false;
    if (!firstErrorField) firstErrorField = 'address';
  }
  if (!validateField('phone_country', form.person.phone_country)) {
    isValid = false;
    if (!firstErrorField) firstErrorField = 'phone_country';
  }
  if (!validateField('organization_id', selectedOrganization.value)) {
    isValid = false;
    if (!firstErrorField) firstErrorField = 'organization_id';
  }
  if (!validateField('business_id', selectedBusiness.value)) {
    isValid = false;
    if (!firstErrorField) firstErrorField = 'business_id';
  }
  if (!isValid && firstErrorField) await scrollToField(firstErrorField);
  return isValid;
};

const fullAddress = computed(() => {
  if (parsedAddress.value?.street) {
    return `${parsedAddress.value.street} ${parsedAddress.value.outdoor_number || ''}`.trim();
  }
  if (parsedAddress.value) {
    return [parsedAddress.value.neighborhood, parsedAddress.value.city, parsedAddress.value.state].filter(Boolean).join(', ');
  }
  return '';
});

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
        display: `${data.folio}${data.name ? ' - ' + data.name : ''}`,
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
      display: `${b.folio}${b.name ? ' - ' + b.name : ''}`,
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
    const data = res.data?.data || res.data?.business_unit || res.data;

    const orgId = data.organization_id ?? data.organization?.id;
    const busId = data.business_id ?? data.business?.id;

    const currentUser = auth.user || {};
    const userOrgId = currentUser.organization_id;
    const userBusId = currentUser.business_id;
    const userRoles = Array.isArray(currentUser.roles) ? currentUser.roles : currentUser.roles?.map?.((r) => r.name) || [];
    const userPerms = Array.isArray(currentUser.permissions)
      ? currentUser.permissions
      : currentUser.permissions?.map?.((p) => p.name) || [];

    let canEditUnit = false;

    if (userRoles.includes('superadmin')) {
      canEditUnit = true;
    } else if (userRoles.includes('admin')) {
      if (orgId && busId && orgId === userOrgId) {
        canEditUnit = true;
      }
    } else if (userRoles.includes('sponsor')) {
      if (orgId && busId && orgId === userOrgId && busId === userBusId) {
        canEditUnit = true;
      }
    } else if (
      userPerms.includes('businessUnit.viewAny') &&
      userPerms.includes('businessUnit.view') &&
      userPerms.includes('businessUnit.update')
    ) {
      if (orgId && busId && orgId === userOrgId && busId === userBusId) {
        canEditUnit = true;
      }
    } else if (
      userPerms.includes('businessUnit.view') &&
      userPerms.includes('businessUnit.update') &&
      !userPerms.includes('businessUnit.viewAny')
    ) {
      if (busId && busId === userBusId) {
        canEditUnit = true;
      }
    }

    if (!canEditUnit) {
      router.push('/403');
      return;
    }

    // Rellenar formulario
    form.name = data.name || '';
    form.alias = data.alias || '';
    form.description = data.description || '';
    form.timezone = data.timezone || '';
    form.logo = null;

    // Logo preview
    if (data.logo) {
      logoPreview.value = data.logo.startsWith('http') ? data.logo : `/storage/${data.logo}`;
    } else if (data.logo_url) {
      logoPreview.value = data.logo_url;
    } else {
      logoPreview.value = null;
    }

    // Address
    if (data.address) {
      parsedAddress.value = {
        street: data.address.street || '',
        outdoor_number: data.address.outdoor_number || '',
        indoor_number: data.address.indoor_number || '',
        neighborhood: data.address.neighborhood || '',
        postal_code: data.address.postal_code || '',
        city: data.address.city || '',
        state: data.address.state || '',
        country: data.address.country || '',
        latitude: data.address.latitude || '',
        longitude: data.address.longitude || '',
        geofence_radius: data.address.geofence_radius || ''
      };
    } else {
      parsedAddress.value = {};
    }

    // Contact
    if (data.contact) {
      form.person.first_name = data.contact.first_name || '';
      form.person.last_name = data.contact.last_name || '';
      form.person.email = data.contact.email || '';
      form.person.phone_country = data.contact.phone_country || '';
      form.person.phone_number = data.contact.phone_number || '';
    } else {
      form.person.first_name = '';
      form.person.last_name = '';
      form.person.email = '';
      form.person.phone_country = '';
      form.person.phone_number = '';
    }

    // INTEGRACIÓN CORRECTA DE ORGANIZACIÓN Y EMPRESA
    if (userRoles.includes('superadmin')) {
      await fetchOrganizationById(orgId);
      await fetchOrganizations('');
      selectedOrganization.value = orgId;

      await fetchBusinessById(busId, orgId);
      await fetchBusinesses('', orgId);
      selectedBusiness.value = busId;
    } else if (
      userRoles.includes('admin') ||
      userRoles.includes('sponsor') ||
      userPerms.includes('business.viewAny') ||
      userPerms.includes('business.view') ||
      userPerms.includes('business.update')
    ) {
      await fetchBusinessById(busId, orgId);
      await fetchBusinesses('', orgId);
      selectedBusiness.value = busId;
    }
  } catch (err) {
    errorMsg.value = 'Error al cargar datos de ubicación';
  }
});

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
  if (val && Object.keys(val).length > 0) clearFieldError('address');
};

const validate = async () => {
  errorMsg.value = '';
  if (!(await validateAllFields())) return;

  isLoading.value = true;

  let organization_id = null;
  if (isSuperadmin.value) {
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
    formData.append('name', form.name);
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

    if (auth.user?.business_unit_id && String(auth.user.business_unit_id) === String(business_unitId)) {
      await auth.fetchUser();
    }

    router.push(`/ubicaciones/${business_unitId}`);
  } catch (err) {
    errorMsg.value = 'Error al actualizar ubicación';
  } finally {
    isLoading.value = false;
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

          <template v-if="isSuperadmin">
            <v-label>Organización <span class="text-error">*</span></v-label>
            <v-autocomplete
              ref="fieldRefs.organization_id"
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
              :menu-props="{ maxHeight: '300px' }"
              :error-messages="fieldErrors.organization_id"
              @update:model-value="clearFieldError('organization_id')"
            />
            <div style="height: 14px"></div>
          </template>

          <template v-if="selectedOrganization && (isSuperadmin || canSelectBusiness)">
            <v-label>Empresa <span class="text-error">*</span></v-label>
            <v-autocomplete
              ref="fieldRefs.business_id"
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
              :menu-props="{ maxHeight: '300px' }"
              :error-messages="fieldErrors.business_id"
              @update:model-value="clearFieldError('business_id')"
            />
            <div style="height: 14px"></div>
          </template>

          <v-label>Nombre<span class="text-error">*</span></v-label>
          <v-text-field
            ref="fieldRefs.name"
            v-model="form.name"
            variant="outlined"
            color="primary"
            class="mt-2 mb-4"
            required
            :error-messages="fieldErrors.name"
            @update:model-value="clearFieldError('name')"
          />

          <v-label>Alias</v-label>
          <v-text-field v-model="form.alias" variant="outlined" color="primary" class="mt-2 mb-4" />

          <v-label>Descripción</v-label>
          <v-textarea v-model="form.description" variant="outlined" color="primary" auto-grow rows="3" class="mt-2" />

          <v-label>Zona Horaria <span class="text-error">*</span></v-label>
          <v-autocomplete
            ref="fieldRefs.timezone"
            v-model="form.timezone"
            :items="filteredTimezones"
            v-model:search-input="timezoneSearch"
            item-title="label"
            item-value="value"
            variant="outlined"
            color="primary"
            class="mt-2 mb-4"
            density="compact"
            placeholder="Selecciona una zona horaria"
            clearable
            required
            :menu-props="{ maxHeight: '300px' }"
            :error-messages="fieldErrors.timezone"
            @update:model-value="clearFieldError('timezone')"
          />
        </v-col>

        <v-col cols="12" class="mt-4">
          <v-label>Dirección <span class="text-error">*</span></v-label>
          <AddressAutocomplete
            ref="fieldRefs.address"
            class="mt-2"
            :initial-value="parsedAddress"
            :placeholder="fullAddress"
            @update:parsedAddress="handleParsedAddress"
            :addressError="fieldErrors.address"
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
          <v-label>Correo</v-label>
          <v-text-field v-model="form.person.email" variant="outlined" color="primary" class="mt-2" />
        </v-col>

        <v-col cols="12" sm="6">
          <v-label>Teléfono</v-label>
          <div class="phone-group phone-group-responsive mt-2">
            <div style="display: flex; flex-direction: column">
              <v-autocomplete
                ref="fieldRefs.phone_country"
                v-model="form.person.phone_country"
                :items="filteredCountries"
                v-model:search-input="phoneCountrySearch"
                item-title="title"
                item-value="value"
                variant="outlined"
                color="primary"
                class="phone-country-field"
                placeholder="País"
                clearable
                :menu-props="{ maxHeight: '400px', width: 320 }"
                hide-details
                :error-messages="fieldErrors.phone_country"
                @update:model-value="clearFieldError('phone_country')"
              >
                <template #selection="{ item }">
                  <template v-if="item && item.value">
                    <span>{{ findCountryByCode(item.value)?.flag }}</span>
                    <span style="margin-left: 6px">{{ getDialPrefix(item.value, item.title) }}</span>
                  </template>
                </template>
                <template #item="{ item, props }">
                  <v-list-item v-bind="props">
                    <template #title>
                      <div class="d-flex align-center justify-space-between">
                        <span>
                          <span>{{ findCountryByCode(item.value)?.flag }}</span>
                          <span style="margin-left: 8px">
                            {{ item.title.replace(/^.*?\s/, '') }}
                          </span>
                        </span>
                        <span class="text-medium-emphasis">{{ getDialPrefix(item.value, item.title) }}</span>
                      </div>
                    </template>
                  </v-list-item>
                </template>
              </v-autocomplete>
              <div v-if="fieldErrors.phone_country" class="text-error" style="font-size: 0.78rem; margin-top: 6px; margin-bottom: 0">
                {{ fieldErrors.phone_country }}
              </div>
            </div>
            <v-text-field
              v-model="form.person.phone_number"
              variant="outlined"
              color="primary"
              class="phone-number-field"
              placeholder="Número"
              hide-details
            />
          </div>
        </v-col>
      </v-row>

      <v-row>
        <v-col cols="12" class="d-flex justify-end">
          <v-btn color="primary" class="mt-6" :loading="isLoading" :disabled="isLoading" @click="validate">
            <template v-slot:loader>
              <v-progress-circular indeterminate color="white" size="20" />
            </template>
            {{ isLoading ? 'Guardando...' : 'Guardar Cambios' }}
          </v-btn>
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

<style scoped src="@/styles/business_unit.css"></style>
