<script setup>
import { reactive, ref, watch, onMounted, nextTick, computed } from 'vue';
import { useRouter } from 'vue-router';
import { mdiArrowLeft } from '@mdi/js';
import AddressAutocomplete from '@/utils/helpers/google/AddressAutocomplete.vue';
import axiosInstance from '@/utils/axios';
import { useAuthStore } from '@/stores/auth';
import { timezones as tzRaw } from '@/utils/constants/timezones';
import { toVuetifyItems, findCountryByCode } from '@/utils/constants/countries';

const auth = useAuthStore();
const router = useRouter();

const Regform = ref(null);
const parsedAddress = ref({});
const logoPreview = ref(null);
const errorMsg = ref('');
const canCreate = ref(false);

const timezoneSearch = ref('');
const phoneCountrySearch = ref('');

/* -------------------- helpers -------------------- */
function normalizeString(str) {
  return str
    ? str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
    : '';
}

/** Quita el "(+###)" al final del título, espacios y normaliza */
function baseCountryTitle(title = '') {
  return normalizeString(
    String(title)
      .replace(/\s*\(\+\d+\)\s*$/, '')
      .trim()
  );
}

/** Obtiene el prefijo telefónico (+###) */
function getDialPrefix(value, titleFallback = '') {
  const c = findCountryByCode(value);
  const fromModel = c?.dial_code ?? c?.calling_code ?? c?.callingCode ?? c?.phoneCode ?? null;
  if (fromModel) return String(fromModel).startsWith('+') ? fromModel : `+${fromModel}`;
  const m = String(titleFallback).match(/\(\+[\d]+\)/);
  if (m && m[0]) return m[0].replace(/[()]/g, ''); // "(+54)" -> "+54"
  return '';
}

/** Escoge el mejor item entre duplicados */
function betterCountryItem(a, b) {
  const score = (it) => {
    const dial = getDialPrefix(it.value, it.title);
    let s = 0;
    if (dial) s += 2;
    if (it.value) s += 1;
    if (String(it.value || '').length <= 3) s += 1; // ISO2/ISO3 suele ser corto
    return s;
  };
  return score(a) >= score(b) ? a : b;
}

/** Construye UNA sola lista única de países (se ejecuta 1 vez) */
function buildUniqueCountries() {
  const raw = toVuetifyItems(); // [{ title, value }, ...] con y sin (+###)

  // 1) Elimina duplicados por value (código de país)
  const seen = new Set();
  const filtered = raw.filter((item) => {
    if (seen.has(item.value)) return false;
    seen.add(item.value);
    return true;
  });

  // 2) Agrupa por nombre base (sin (+###)), escoge el mejor item
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

  // 3) Normaliza el title final: solo nombre (sin (+###))
  const result = Array.from(byName.values()).map((it) => ({
    ...it,
    title: it.title.replace(/\s*\(\+\d+\)\s*$/, '').trim()
  }));

  // 4) Orden alfabético por nombre base
  result.sort((a, b) => baseCountryTitle(a.title).localeCompare(baseCountryTitle(b.title)));

  return result;
}

/* --------- datos reactivos / estados --------- */
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

onMounted(() => {
  const user = auth.user;
  canCreate.value =
    user?.roles?.includes('admin') || user?.roles?.includes('superadmin') || user?.permissions?.includes('organization.create');
  if (user?.organization_id && !user?.roles?.includes('superadmin')) {
    router.replace(`/organizaciones/${user.organization_id}`);
  }
});

const form = reactive({
  legal_name: '',
  alias: '',
  description: '',
  logo: null,
  timezone: '',
  person: {
    first_name: '',
    last_name: '',
    email: '',
    phone_country: '',
    phone_number: ''
  }
});

/* --------- computeds --------- */
const filteredTimezones = computed(() => {
  const search = normalizeString(timezoneSearch.value);
  if (!search) return tzRaw;
  return tzRaw.filter((tz) => normalizeString(tz.label).includes(search) || normalizeString(tz.value).includes(search));
});

/** Países únicos (memoizado a través de cierre) */
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

/* --------- validaciones y envío --------- */
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
      if (form.person.phone_number && !value) {
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
  if (!validateField('phone_country', form.person.phone_country)) {
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

const handleParsedAddress = (val) => {
  parsedAddress.value = val;
  if (val && Object.keys(val).length > 0) clearFieldError('address');
};

const isLoading = ref(false);

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
    for (const key in parsedAddress.value) formData.append(`address[${key}]`, parsedAddress.value[key] || '');

    const hasPersonData = Object.values(form.person).some((val) => val?.trim?.() !== '');
    if (hasPersonData) {
      for (const key in form.person) formData.append(`person[${key}]`, form.person[key] || '');
    }
    if (form.logo) {
      const logoFile = Array.isArray(form.logo) ? form.logo[0] : form.logo;
      formData.append('logo', logoFile);
    }

    const res = await axiosInstance.post('/organizations', formData);
    const org = res.data.organization || res.data.data || res.data;
    if (org?.id) {
      auth.user.organization_id = org.id;
      await auth.fetchUser();
      router.replace(`/organizaciones/${org.id}`);
    }
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
      errorMsg.value = 'Error al crear organización';
    }
    console.error('❌ Error al crear organización:', err);
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div v-if="canCreate">
    <v-container fluid>
      <v-row class="align-center mb-6" no-gutters>
        <v-col cols="auto" class="d-flex align-center">
          <template v-if="auth.user?.roles?.includes('superadmin') || auth.user?.permissions?.includes('organization.viewAny')">
            <v-btn icon variant="text" class="px-3 py-2" style="border-radius: 8px; border: 1px solid #ccc" @click="router.back()">
              <v-icon :icon="mdiArrowLeft" />
            </v-btn>
          </template>
          <h3 class="font-weight-medium ml-3 mb-0">Agregar Organización</h3>
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
              required
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
            <div class="phone-group mt-2">
              <!-- País -->
              <v-autocomplete
                ref="fieldRefs.phone_country"
                v-model="form.person.phone_country"
                :items="filteredCountries"
                v-model:search-input="phoneCountrySearch"
                item-title="title"
                item-value="value"
                variant="outlined"
                color="primary"
                density="compact"
                class="phone-country-field"
                placeholder="País"
                clearable
                hide-details
                :menu-props="{ maxHeight: '400px', width: 320 }"
                :error-messages="fieldErrors.phone_country"
                @update:model-value="clearFieldError('phone_country')"
              >
                <!-- En el input: bandera + prefijo -->
                <template #selection="{ item }">
                  <template v-if="item && item.value">
                    <span>{{ findCountryByCode(item.value)?.flag }}</span>
                    <span style="margin-left: 6px">{{ getDialPrefix(item.value, item.title) }}</span>
                  </template>
                </template>

                <!-- Menú: bandera + nombre + prefijo a la derecha -->
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

              <!-- Número -->
              <v-text-field
                v-model="form.person.phone_number"
                variant="outlined"
                color="primary"
                density="compact"
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
              {{ isLoading ? 'Creando Organización...' : 'Crear Organización' }}
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

<style scoped src="@/styles/organization.css"></style>
