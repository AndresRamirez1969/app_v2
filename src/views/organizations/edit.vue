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
const organizationId = route.params.id;
const auth = useAuthStore();

const Regform = ref(null);
const parsedAddress = ref({});
const logoPreview = ref(null);
const errorMsg = ref('');
const timezoneSearch = ref('');
const phoneCountrySearch = ref('');
const isLoading = ref(false);

const fieldErrors = reactive({
  legal_name: '',
  timezone: '',
  address: '',
  logo: '',
  phone_country: ''
});

const fieldRefs = {
  legal_name: ref(null),
  timezone: ref(null),
  address: ref(null),
  logo: ref(null),
  phone_country: ref(null)
};

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
  if (m && m[0]) return m[0].replace(/[()]/g, ''); // "(+54)" -> "+54"
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

const filteredTimezones = computed(() => {
  const search = normalizeString(timezoneSearch.value);
  if (!search) return tzRaw;
  return tzRaw.filter((tz) => normalizeString(tz.label).includes(search) || normalizeString(tz.value).includes(search));
});

const filteredCountries = computed(() => {
  const q = normalizeString(phoneCountrySearch.value);
  if (!q) return UNIQUE_COUNTRIES;
  return UNIQUE_COUNTRIES.filter((item) => {
    const name = baseCountryTitle(item.title);
    const dial = normalizeString(getDialPrefix(item.value, item.title));
    return name.includes(q) || dial.includes(q);
  });
});

const canEdit = computed(() => {
  const user = auth.user;
  if (!user) return false;
  if (user.roles?.includes('admin') || user.roles?.includes('superadmin')) return true;
  if (user.permissions?.includes('organization.update')) return true;
  return false;
});

const form = reactive({
  legal_name: '',
  alias: '',
  description: '',
  logo: null,
  timezone: '',
  contact: {
    first_name: '',
    last_name: '',
    email: '',
    phone_country: '',
    phone_number: ''
  }
});

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
    case 'legal_name':
      if (!value || value.trim() === '') {
        fieldErrors.legal_name = 'El nombre legal es obligatorio';
        return false;
      }
      break;
    case 'timezone':
      if (!value || value.trim() === '') {
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
    case 'logo':
      break;
    case 'phone_country':
      if (form.contact.phone_number && !value) {
        fieldErrors.phone_country = 'Selecciona el país para el teléfono';
        return false;
      }
      break;
  }
  return true;
};

const validateAllFields = async () => {
  let isValid = true;
  let firstErrorField = null;
  if (!validateField('legal_name', form.legal_name)) {
    isValid = false;
    if (!firstErrorField) firstErrorField = 'legal_name';
  }
  if (!validateField('timezone', form.timezone)) {
    isValid = false;
    if (!firstErrorField) firstErrorField = 'timezone';
  }
  if (!validateField('address', parsedAddress.value)) {
    isValid = false;
    if (!firstErrorField) firstErrorField = 'address';
  }
  if (!validateField('phone_country', form.contact.phone_country)) {
    isValid = false;
    if (!firstErrorField) firstErrorField = 'phone_country';
  }
  if (!isValid && firstErrorField) await scrollToField(firstErrorField);
  return isValid;
};

watch(
  () => form.logo,
  (file) => {
    let imageFile = null;
    if (Array.isArray(file)) imageFile = file.length > 0 ? file[0] : null;
    else if (file instanceof File || file instanceof Blob) imageFile = file;
    logoPreview.value = imageFile ? URL.createObjectURL(imageFile) : null;
  }
);

const fullAddress = computed(() => {
  if (parsedAddress.value?.street) {
    return `${parsedAddress.value.street} ${parsedAddress.value.outdoor_number || ''}`.trim();
  }
  if (parsedAddress.value) {
    return [parsedAddress.value.neighborhood, parsedAddress.value.city, parsedAddress.value.state].filter(Boolean).join(', ');
  }
  return '';
});

const handleParsedAddress = (val) => {
  parsedAddress.value = val;
  if (val && Object.keys(val).length > 0) clearFieldError('address');
};

watch(
  () => [form.legal_name, form.timezone, parsedAddress.value, form.logo, form.contact.phone_country],
  () => {
    errorMsg.value = '';
  }
);

onMounted(async () => {
  const user = auth.user;

  const canEdit =
    user?.roles?.includes('admin') || user?.roles?.includes('superadmin') || user?.permissions?.includes('organization.update');

  if (!canEdit) {
    router.replace('/403');
    return;
  }

  try {
    const res = await axiosInstance.get(`/organizations/${organizationId}`);
    const data = res.data.organization || res.data.data || res.data;

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
        indoor_number: data.address.indoor_number || '',
        neighborhood: data.address.neighborhood || '',
        postal_code: data.address.postal_code || '',
        city: data.address.city || '',
        state: data.address.state || '',
        country: data.address.country || ''
      };
    }

    // INTEGRACIÓN: los datos de contacto vienen bajo contact
    if (data.contact) {
      form.contact.first_name = data.contact.first_name || '';
      form.contact.last_name = data.contact.last_name || '';
      form.contact.email = data.contact.email || '';
      form.contact.phone_number = data.contact.phone_number || '';
      form.contact.phone_country = data.contact.phone_country || '';
    }
  } catch (err) {
    console.error('❌ Error al cargar datos de organización', err);
  }
});

const validate = async () => {
  errorMsg.value = '';
  if (!(await validateAllFields())) return;

  isLoading.value = true;
  try {
    const formData = new FormData();
    formData.append('legal_name', form.legal_name);
    formData.append('alias', form.alias || '');
    formData.append('description', form.description || '');
    formData.append('timezone', form.timezone);

    for (const key in parsedAddress.value) {
      formData.append(`address[${key}]`, parsedAddress.value[key] || '');
    }

    // INTEGRACIÓN: enviar datos de contacto bajo 'contact'
    const hasContactData = Object.values(form.contact).some((val) => val && val.trim() !== '');
    if (hasContactData) {
      for (const key in form.contact) {
        formData.append(`contact[${key}]`, form.contact[key] || '');
      }
    }

    if (form.logo) {
      const logoFile = Array.isArray(form.logo) ? form.logo[0] : form.logo;
      formData.append('logo', logoFile);
    }

    await axiosInstance.post(`/organizations/${organizationId}?_method=PUT`, formData);

    if (auth.user?.organization_id && String(auth.user.organization_id) === String(organizationId)) {
      await auth.fetchUser();
    }

    router.push(`/organizaciones/${organizationId}`);
  } catch (err) {
    if (err?.response?.data?.errors) {
      const serverErrors = err.response.data.errors;
      let firstServerErrorField = null;
      if (serverErrors.legal_name) {
        fieldErrors.legal_name = serverErrors.legal_name[0];
        firstServerErrorField = firstServerErrorField || 'legal_name';
      }
      if (serverErrors.timezone) {
        fieldErrors.timezone = serverErrors.timezone[0];
        firstServerErrorField = firstServerErrorField || 'timezone';
      }
      if (serverErrors.address) {
        fieldErrors.address = serverErrors.address[0];
        firstServerErrorField = firstServerErrorField || 'address';
      }
      if (serverErrors.logo) {
        fieldErrors.logo = serverErrors.logo[0];
        firstServerErrorField = firstServerErrorField || 'logo';
      }
      if (serverErrors.phone_country) {
        fieldErrors.phone_country = serverErrors.phone_country[0];
        firstServerErrorField = firstServerErrorField || 'phone_country';
      }
      if (firstServerErrorField) await scrollToField(firstServerErrorField);

      const unmapped = Object.keys(serverErrors).filter((k) => !['legal_name', 'timezone', 'address', 'logo', 'phone_country'].includes(k));
      if (unmapped.length > 0)
        errorMsg.value = unmapped
          .map((k) => serverErrors[k])
          .flat()
          .join(' ');
    } else if (err?.response?.data?.message) {
      errorMsg.value = err.response.data.message;
    } else {
      errorMsg.value = 'Error al actualizar organización';
    }
    console.error('❌ Error al actualizar organización', err.response?.data || err);
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div v-if="canEdit">
    <v-container fluid>
      <v-row class="align-center mb-6" no-gutters>
        <v-col cols="auto" class="d-flex align-center">
          <v-btn icon variant="text" class="px-3 py-2" style="border-radius: 8px; border: 1px solid #ccc" @click="router.back()">
            <v-icon :icon="mdiArrowLeft" />
          </v-btn>
          <h3 class="font-weight-medium ml-3 mb-0">Editar Organización</h3>
        </v-col>
      </v-row>

      <v-form ref="Regform" lazy-validation class="mb-10">
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
              hide-details
              :menu-props="{ maxHeight: '400px' }"
              required
              :error-messages="fieldErrors.timezone"
              @update:model-value="clearFieldError('timezone')"
            />
          </v-col>

          <v-col cols="12" class="mt-4">
            <v-label>Dirección <span class="text-error">*</span></v-label>
            <AddressAutocomplete
              class="mt-2"
              :initial-value="parsedAddress"
              :placeholder="fullAddress"
              @update:parsedAddress="handleParsedAddress"
            />
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

        <v-row class="mt-10">
          <v-col cols="12">
            <h4 class="font-weight-bold mb-3">Contacto</h4>
            <v-divider class="mb-6" />
          </v-col>

          <v-col cols="12" sm="6">
            <v-label>Nombre</v-label>
            <v-text-field v-model="form.contact.first_name" variant="outlined" color="primary" class="mt-2" />
          </v-col>

          <v-col cols="12" sm="6">
            <v-label>Apellido</v-label>
            <v-text-field v-model="form.contact.last_name" variant="outlined" color="primary" class="mt-2" />
          </v-col>

          <v-col cols="12" sm="6">
            <v-label>Correo</v-label>
            <v-text-field v-model="form.contact.email" variant="outlined" color="primary" class="mt-2" />
          </v-col>

          <v-col cols="12" sm="6">
            <v-label>Teléfono</v-label>
            <div class="phone-group phone-group-responsive mt-2">
              <!-- País -->
              <v-autocomplete
                ref="fieldRefs.phone_country"
                v-model="form.contact.phone_country"
                :items="filteredCountries"
                v-model:search-input="phoneCountrySearch"
                item-title="title"
                item-value="value"
                variant="outlined"
                color="primary"
                class="phone-country-field"
                placeholder="País"
                clearable
                hide-details
                :menu-props="{ maxHeight: '400px', width: 320 }"
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
              <v-text-field
                v-model="form.contact.phone_number"
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
  <div v-else>
    <v-alert type="error" class="mt-10" variant="outlined" density="comfortable"> No tienes acceso para editar esta organización. </v-alert>
  </div>
</template>

<style scoped src="@/styles/organization.css"></style>
