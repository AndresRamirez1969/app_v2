<script setup>
import { reactive, ref, watch, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { mdiArrowLeft } from '@mdi/js';
import axiosInstance from '@/utils/axios';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const Regform = ref(null);
const profilePreview = ref(null);
const canEdit = ref(false);

const organizationSearch = ref('');
const businessSearch = ref('');
const businessUnitSearch = ref('');
const roleSearch = ref('');
const orgRoleSearch = ref('');

const organizationOptions = ref([]);
const businessOptions = ref([]);
const businessUnitOptions = ref([]);
const roleOptions = ref([]);
const allRoleOptions = ref([]);
const orgRoleOptions = ref([]);

const loadingOrganizations = ref(false);
const loadingBusinesses = ref(false);
const loadingBusinessUnits = ref(false);
const loadingRoles = ref(false);
const loadingOrgRoles = ref(false);

const selectedOrgForRoles = ref(null);

const fieldErrors = reactive({
  name: '',
  email: '',
  profile_picture: '',
  orgRole: '',
  role: '',
  organization_id: '',
  business_id: '',
  business_unit_id: ''
});

const fieldRefs = {
  name: ref(null),
  email: ref(null),
  profile_picture: ref(null),
  orgRole: ref(null),
  role: ref(null),
  organization_id: ref(null),
  business_id: ref(null),
  business_unit_id: ref(null)
};

const clearFieldError = (fieldName) => {
  if (fieldErrors[fieldName]) fieldErrors[fieldName] = '';
};

const validateField = (fieldName, value) => {
  clearFieldError(fieldName);
  switch (fieldName) {
    case 'name':
      if (!value || value.trim() === '') {
        fieldErrors.name = 'El campo nombre es obligatorio.';
        return false;
      }
      break;
    case 'email':
      if (!value || value.trim() === '') {
        fieldErrors.email = 'El campo correo es obligatorio.';
        return false;
      }
      break;
    case 'orgRole':
      if (!value) {
        fieldErrors.orgRole = 'El campo es obligatorio.';
        return false;
      }
      break;
    case 'role':
      if (!value || value.trim() === '') {
        fieldErrors.role = 'El campo rol es obligatorio.';
        return false;
      }
      break;
    case 'organization_id':
    case 'business_id':
    case 'business_unit_id':
      if (!value) {
        fieldErrors[fieldName] = 'Es obligatorio escoger un alcance.';
        return false;
      }
      break;
  }
  return true;
};

const form = reactive({
  profile_picture: null,
  name: '',
  email: '',
  organization_id: null,
  business_id: null,
  business_unit_id: null,
  role: null,
  contact: {
    first_name: '',
    last_name: '',
    email: '',
    phone_number: ''
  }
});

const isSuperadmin = computed(() => auth.user?.roles?.includes('superadmin'));
const isAdmin = computed(() => auth.user?.roles?.includes('admin'));
const isSponsor = computed(() => auth.user?.roles?.includes('sponsor'));
const userOrgId = computed(() => auth.user?.organization_id);
const userBusinessId = computed(() => auth.user?.business_id);

const scopeOrgId = ref(null);
const scopeBusinessId = ref(null);
const suppressScopeWatchers = ref(false);

const isOrgOnly = ref(false);
const isBusinessOnly = ref(false);
const isBusinessUnitOnly = ref(false);

// --- FLAG PARA BLOQUEAR EDICIÓN DE ROL Y ALCANCE SI ES EL MISMO USUARIO ---
const isSelf = computed(() => {
  const userId = auth.user?.id;
  return userId && String(userId) === String(route.params.id);
});

// --- FLAG PARA BLOQUEAR EDICIÓN DE ROL Y ALCANCE SEGÚN PERMISOS ---
const canEditRoleAndScope = computed(() => {
  // No puede editar su propio rol ni alcance
  if (isSelf.value) return false;

  // Superadmin puede editar todos menos rol/alcance propio
  if (isSuperadmin.value) return true;

  // Admin solo usuarios de su organización
  if (isAdmin.value) {
    return form.organization_id === userOrgId.value || scopeOrgId.value === userOrgId.value;
  }

  // Sponsor solo usuarios de su empresa
  if (isSponsor.value) {
    return form.business_id === userBusinessId.value || scopeBusinessId.value === userBusinessId.value;
  }

  // Otros no pueden editar rol/alcance
  return false;
});

// --- ORGANIZATION AUTOCOMPLETE ---
const fetchOrganizations = async (searchText = '') => {
  loadingOrganizations.value = true;
  try {
    const params = searchText ? { q: searchText } : {};
    const { data } = await axiosInstance.get('/users/available-organizations', { params });
    organizationOptions.value = (data || []).map((o) => ({
      ...o,
      display: `${o.folio}${o.legal_name ? ' - ' + o.legal_name : ''}`
    }));
  } catch (e) {
    organizationOptions.value = [];
  } finally {
    loadingOrganizations.value = false;
  }
};

watch(organizationSearch, (val) => fetchOrganizations(val));
onMounted(() => fetchOrganizations(''));

// --- BUSINESS AUTOCOMPLETE (con filtros) ---
const fetchBusinesses = async (searchText = '', { organization_id } = {}) => {
  loadingBusinesses.value = true;
  try {
    const params = {};
    if (searchText) params.q = searchText;
    if (organization_id) params.organization_id = organization_id;
    const { data } = await axiosInstance.get('/users/available-businesses', { params });
    businessOptions.value = (data || []).map((b) => ({
      ...b,
      display: `${b.folio}${b.name ? ' - ' + b.name : ''}`,
      organization_id: b.organization_id
    }));
  } catch (e) {
    businessOptions.value = [];
  } finally {
    loadingBusinesses.value = false;
  }
};

watch(businessSearch, (val) => {
  const orgFilter = scopeOrgId.value || form.organization_id || userOrgId.value || undefined;
  fetchBusinesses(val, { organization_id: orgFilter });
});
onMounted(() => {
  const orgFilter = userOrgId.value || undefined;
  fetchBusinesses('', { organization_id: orgFilter });
});

// --- BUSINESS UNIT AUTOCOMPLETE (con filtros) ---
const fetchBusinessUnits = async (searchText = '', { organization_id, business_id } = {}) => {
  loadingBusinessUnits.value = true;
  try {
    const params = {};
    if (searchText) params.q = searchText;
    if (organization_id) params.organization_id = organization_id;
    if (business_id) params.business_id = business_id;
    const { data } = await axiosInstance.get('/users/available-business-units', { params });
    businessUnitOptions.value = (data || []).map((u) => ({
      ...u,
      display: `${u.folio}${u.name ? ' - ' + u.name : ''}`,
      organization_id: u.organization_id,
      business_id: u.business_id
    }));
  } catch (e) {
    businessUnitOptions.value = [];
  } finally {
    loadingBusinessUnits.value = false;
  }
};

watch(businessUnitSearch, (val) => {
  const orgFilter = scopeOrgId.value || form.organization_id || userOrgId.value || undefined;
  const bizFilter = scopeBusinessId.value || form.business_id || userBusinessId.value || undefined;
  fetchBusinessUnits(val, { organization_id: orgFilter, business_id: bizFilter });
});
onMounted(() => {
  const orgFilter = userOrgId.value || undefined;
  const bizFilter = userBusinessId.value || undefined;
  fetchBusinessUnits('', { organization_id: orgFilter, business_id: bizFilter });
});

// --- FOTO DE PERFIL PREVIEW ---
watch(
  () => form.profile_picture,
  (file) => {
    if (file && typeof file === 'object') {
      const imgFile = Array.isArray(file) ? file[0] : file;
      profilePreview.value = URL.createObjectURL(imgFile);
    } else if (typeof file === 'string' && file) {
      profilePreview.value = file;
      form.profile_picture = null;
    } else {
      profilePreview.value = null;
    }
  }
);

// --- ROLES AUTOCOMPLETE ---
const fetchAllRoles = async () => {
  loadingRoles.value = true;
  try {
    const { data } = await axiosInstance.get('/roles', { params: { q: roleSearch.value } });
    allRoleOptions.value = (data.data || []).filter((r) => r.name !== 'superadmin');
  } catch {
    allRoleOptions.value = [];
  } finally {
    loadingRoles.value = false;
  }
};

const fetchOrgRoles = async (orgId) => {
  loadingOrgRoles.value = true;
  try {
    const { data } = await axiosInstance.get('/roles', { params: { organization_id: orgId } });
    orgRoleOptions.value = (data.data || []).filter((r) => r.name !== 'superadmin');
    if (form.role) {
      const found = orgRoleOptions.value.find((r) => r.name === form.role);
      if (!found) form.role = null;
    }
  } catch {
    orgRoleOptions.value = [];
  } finally {
    loadingOrgRoles.value = false;
  }
};

const filteredRoleOptions = computed(() => {
  if (isSuperadmin.value) {
    if (!selectedOrgForRoles.value) return [];
    const orgRoles = orgRoleOptions.value.filter((r) => r.organization_id === selectedOrgForRoles.value);
    return [
      { name: 'admin', display: 'Administrador' },
      { name: 'sponsor', display: 'Sponsor' },
      ...orgRoles.filter((r) => r.name !== 'admin' && r.name !== 'sponsor').map((r) => ({ ...r, display: r.name }))
    ];
  }
  if (isAdmin.value) {
    const orgRoles = allRoleOptions.value.filter((r) => r.organization_id === userOrgId.value);
    return [
      { name: 'admin', display: 'Administrador' },
      { name: 'sponsor', display: 'Sponsor' },
      ...orgRoles.filter((r) => r.name !== 'admin' && r.name !== 'sponsor').map((r) => ({ ...r, display: r.name }))
    ];
  }
  if (isSponsor.value) {
    return allRoleOptions.value
      .filter((r) => r.organization_id === userOrgId.value && r.name !== 'admin' && r.name !== 'sponsor')
      .map((r) => ({ ...r, display: r.name }));
  }
  return allRoleOptions.value
    .filter((r) => r.organization_id === userOrgId.value || r.name === 'admin' || r.name === 'sponsor')
    .map((r) => ({ ...r, display: r.name === 'admin' ? 'Administrador' : r.name === 'sponsor' ? 'Sponsor' : r.name }));
});

// --- FLAGS DE ALCANCE ---
const isLoading = ref(false);

// --- CARGA DE USUARIO Y CONTROL DE PERMISOS ---
const fetchUser = async () => {
  isLoading.value = true;
  try {
    const { data } = await axiosInstance.get(`/users/${route.params.id}`);
    const user = data.data || data.user || data;

    // --- INTEGRACIÓN DE CONTROL DE EDICIÓN ---
    let allowEdit = false;

    // Superadmin: puede editar cualquier usuario
    if (isSuperadmin.value) {
      allowEdit = true;
    }
    // Admin: solo usuarios de su organización
    else if (isAdmin.value) {
      if (user.organization_id && String(user.organization_id) === String(userOrgId.value)) {
        allowEdit = true;
      }
    }
    // Sponsor: solo usuarios de su empresa y usuarios de ubicaciones de su empresa
    else if (isSponsor.value) {
      if (
        (user.business_id && String(user.business_id) === String(userBusinessId.value)) ||
        (user.business_unit_id &&
          businessUnitOptions.value.some(
            (unit) => String(unit.id) === String(user.business_unit_id) && String(unit.business_id) === String(userBusinessId.value)
          ))
      ) {
        allowEdit = true;
      }
    }

    canEdit.value = allowEdit;

    if (!canEdit.value) {
      router.replace('/403');
      return;
    }

    suppressScopeWatchers.value = true;
    form.name = user.name || '';
    form.email = user.email || '';
    form.role = user.roles?.[0]?.name || '';
    form.organization_id = user.organization_id ?? null;
    form.business_id = user.business_id ?? null;
    form.business_unit_id = user.business_unit_id ?? null;
    profilePreview.value = user.profile_picture || null;
    form.profile_picture = null;
    form.contact = {
      first_name: user.contact?.first_name || '',
      last_name: user.contact?.last_name || '',
      email: user.contact?.email || '',
      phone_number: user.contact?.phone_number || ''
    };

    scopeOrgId.value = user.organization_id ?? null;
    scopeBusinessId.value = user.business_id ?? null;

    if (user.organization_id && !user.business_id && !user.business_unit_id) {
      isOrgOnly.value = true;
      isBusinessOnly.value = false;
      isBusinessUnitOnly.value = false;
      await fetchOrganizations('');
      form.business_id = null;
      form.business_unit_id = null;
    } else if (user.organization_id && user.business_id && !user.business_unit_id) {
      isOrgOnly.value = false;
      isBusinessOnly.value = true;
      isBusinessUnitOnly.value = false;
      await fetchBusinesses('', { organization_id: scopeOrgId.value });
      form.organization_id = null;
      form.business_unit_id = null;
    } else if (user.organization_id && user.business_id && user.business_unit_id) {
      isOrgOnly.value = false;
      isBusinessOnly.value = false;
      isBusinessUnitOnly.value = true;
      await fetchBusinessUnits('', { organization_id: scopeOrgId.value, business_id: scopeBusinessId.value });
      form.organization_id = null;
      form.business_id = null;
    } else {
      isOrgOnly.value = false;
      isBusinessOnly.value = false;
      isBusinessUnitOnly.value = false;
      await fetchOrganizations('');
      await fetchBusinesses('');
      await fetchBusinessUnits('');
    }
    suppressScopeWatchers.value = false;

    if (isSuperadmin.value && user.organization_id) {
      selectedOrgForRoles.value = user.organization_id;
      await fetchOrgRoles(user.organization_id);
      if (form.role && !orgRoleOptions.value.find((r) => r.name === form.role)) form.role = null;
    }
  } catch (err) {
    canEdit.value = false;
    router.replace('/403');
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  fetchUser();
  fetchAllRoles();
  if (isSuperadmin.value && auth.user?.organization_id) {
    selectedOrgForRoles.value = auth.user.organization_id;
    fetchOrgRoles(auth.user.organization_id);
  }
});

watch(roleSearch, () => {
  if (isSuperadmin.value) {
    if (selectedOrgForRoles.value) fetchOrgRoles(selectedOrgForRoles.value);
  } else {
    fetchAllRoles();
  }
});

watch(selectedOrgForRoles, async (orgId) => {
  if (isSuperadmin.value && orgId) {
    await fetchOrgRoles(orgId);
    if (form.role) {
      const found = orgRoleOptions.value.find((r) => r.name === form.role);
      if (!found) form.role = null;
    }
  }
});

// --- WATCHERS DE ALCANCE (respetan el guard) ---
watch(
  () => form.organization_id,
  (val, oldVal) => {
    if (suppressScopeWatchers.value) return;
    if (val && val !== oldVal) {
      isOrgOnly.value = true;
      isBusinessOnly.value = false;
      isBusinessUnitOnly.value = false;
      form.business_id = null;
      form.business_unit_id = null;
      fetchOrganizations('');
    } else if (!val && !form.business_id && !form.business_unit_id) {
      isOrgOnly.value = false;
      isBusinessOnly.value = false;
      isBusinessUnitOnly.value = false;
      fetchOrganizations('');
      fetchBusinesses('');
      fetchBusinessUnits('');
    }
  }
);

watch(
  () => form.business_id,
  (val, oldVal) => {
    if (suppressScopeWatchers.value) return;
    if (val && val !== oldVal) {
      isOrgOnly.value = false;
      isBusinessOnly.value = true;
      isBusinessUnitOnly.value = false;
      form.organization_id = null;
      form.business_unit_id = null;
      const orgFilter = scopeOrgId.value || undefined;
      fetchBusinesses('', { organization_id: orgFilter });
    } else if (!val && !form.organization_id && !form.business_unit_id) {
      isOrgOnly.value = false;
      isBusinessOnly.value = false;
      isBusinessUnitOnly.value = false;
      fetchOrganizations('');
      fetchBusinesses('');
      fetchBusinessUnits('');
    }
  }
);

watch(
  () => form.business_unit_id,
  (val, oldVal) => {
    if (suppressScopeWatchers.value) return;
    if (val && val !== oldVal) {
      isOrgOnly.value = false;
      isBusinessOnly.value = false;
      isBusinessUnitOnly.value = true;
      form.organization_id = null;
      form.business_id = null;
      fetchBusinessUnits('', {
        organization_id: scopeOrgId.value || undefined,
        business_id: scopeBusinessId.value || undefined
      });
    } else if (!val && !form.organization_id && !form.business_id) {
      isOrgOnly.value = false;
      isBusinessOnly.value = false;
      isBusinessUnitOnly.value = false;
      fetchOrganizations('');
      fetchBusinesses('');
      fetchBusinessUnits('');
    }
  }
);

// --- VALIDATE & UPDATE ---
const validate = async () => {
  let valid = true;

  if (!validateField('name', form.name)) valid = false;
  if (!validateField('email', form.email)) valid = false;
  if (isSuperadmin.value && !validateField('orgRole', selectedOrgForRoles.value)) valid = false;
  if (!validateField('role', form.role)) valid = false;

  if (!form.organization_id && !form.business_id && !form.business_unit_id) {
    fieldErrors.organization_id = 'Es obligatorio escoger un alcance.';
    fieldErrors.business_id = 'Es obligatorio escoger un alcance.';
    fieldErrors.business_unit_id = 'Es obligatorio escoger un alcance.';
    valid = false;
  } else {
    clearFieldError('organization_id');
    clearFieldError('business_id');
    clearFieldError('business_unit_id');
  }

  if (!valid) {
    isLoading.value = false;
    return;
  }

  isLoading.value = true;

  // Lógica de alcance (mantener esta parte)
  if (form.business_unit_id) {
    const unit = businessUnitOptions.value.find((u) => u.id === form.business_unit_id);
    if (unit) {
      form.business_id = unit.business_id;
      form.organization_id = unit.organization_id;
    }
  } else if (form.business_id) {
    const business = businessOptions.value.find((b) => b.id === form.business_id);
    if (business) form.organization_id = business.organization_id;
  }

  // Enviar datos directamente aquí (como en organizations)
  try {
    const formData = new FormData();

    // Agregar campos principales
    formData.append('name', form.name);
    formData.append('email', form.email);
    formData.append('role', form.role);

    // Agregar campos de alcance solo si tienen valor
    if (form.organization_id) formData.append('organization_id', form.organization_id);
    if (form.business_id) formData.append('business_id', form.business_id);
    if (form.business_unit_id) formData.append('business_unit_id', form.business_unit_id);

    // Agregar campos de contacto solo si tienen valor
    const hasContactData = Object.values(form.contact).some((val) => val && val.trim() !== '');
    if (hasContactData) {
      for (const key in form.contact) {
        formData.append(`contact[${key}]`, form.contact[key] || '');
      }
    }

    // Agregar la foto de perfil si existe
    if (form.profile_picture && typeof form.profile_picture === 'object') {
      const file = Array.isArray(form.profile_picture) ? form.profile_picture[0] : form.profile_picture;
      formData.append('profile_picture', file);
    }

    await axiosInstance.post(`/users/${route.params.id}?_method=PUT`, formData);

    // Redirige al show del usuario después de guardar
    router.push(`/usuarios/${route.params.id}`);
  } catch (err) {
    if (err?.response?.data?.errors) {
      const serverErrors = err.response.data.errors;
      if (serverErrors.name) fieldErrors.name = serverErrors.name[0];
      if (serverErrors.email) fieldErrors.email = serverErrors.email[0];
      if (serverErrors.role) fieldErrors.role = serverErrors.role[0];
      if (serverErrors.organization_id) fieldErrors.organization_id = serverErrors.organization_id[0];
      if (serverErrors.business_id) fieldErrors.business_id = serverErrors.business_id[0];
      if (serverErrors.business_unit_id) fieldErrors.business_unit_id = serverErrors.business_unit_id[0];
    }
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
          <h3 class="font-weight-medium ml-3 mb-0">Editar Usuario</h3>
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
            <template v-if="profilePreview">
              <img :src="profilePreview" alt="Profile Preview" style="max-width: 300px; max-height: 300px; border-radius: 12px" />
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
                <span style="color: #bbb">Sin foto</span>
              </div>
            </template>
          </v-col>

          <v-col cols="12" md="6">
            <v-label>Foto de Perfil</v-label>
            <v-file-input
              v-model="form.profile_picture"
              variant="outlined"
              color="primary"
              class="mt-2 mb-4"
              accept="image/*"
              density="compact"
              show-size
              :multiple="false"
            />

            <v-label>Nombre <span class="text-error">*</span></v-label>
            <v-text-field
              v-model="form.name"
              variant="outlined"
              color="primary"
              class="mt-2 mb-4"
              required
              :error="!!fieldErrors.name"
              :error-messages="fieldErrors.name"
            />

            <v-label>Correo <span class="text-error">*</span></v-label>
            <v-text-field
              v-model="form.email"
              variant="outlined"
              color="primary"
              class="mt-2 mb-4"
              required
              :error="!!fieldErrors.email"
              :error-messages="fieldErrors.email"
            />

            <!-- Select de organización para filtrar roles SOLO para superadmin -->
            <template v-if="isSuperadmin">
              <v-label>Organización para filtrar roles <span class="text-error">*</span></v-label>
              <v-autocomplete
                v-model="selectedOrgForRoles"
                :items="organizationOptions"
                :loading="loadingOrganizations"
                v-model:search-input="orgRoleSearch"
                item-title="display"
                item-value="id"
                variant="outlined"
                color="primary"
                class="mt-2 mb-4"
                density="compact"
                placeholder="Selecciona una organización"
                clearable
                :menu-props="{ maxHeight: '300px' }"
                :rules="[(v) => !!v || 'Selecciona una organización']"
                required
                :error="!!fieldErrors.orgRole"
                :error-messages="fieldErrors.orgRole"
                :disabled="!canEditRoleAndScope"
              />
            </template>

            <v-label>Rol <span class="text-error">*</span></v-label>
            <v-autocomplete
              v-model="form.role"
              :items="filteredRoleOptions"
              :loading="isSuperadmin ? loadingOrgRoles : loadingRoles"
              v-model:search-input="roleSearch"
              item-title="display"
              item-value="name"
              variant="outlined"
              color="primary"
              class="mt-2 mb-4"
              density="compact"
              placeholder="Selecciona un rol"
              clearable
              :menu-props="{ maxHeight: '300px' }"
              required
              :error="!!fieldErrors.role"
              :error-messages="fieldErrors.role"
              :disabled="!canEditRoleAndScope"
            />
          </v-col>
        </v-row>

        <!-- Pertenece a -->
        <v-row>
          <v-col cols="12">
            <h4 class="font-weight-bold mb-3">Pertenece a</h4>
            <v-divider class="mb-6" />
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12" md="12">
            <!-- Mostrar solo el select correcto según el alcance y deshabilitar los demás -->
            <template v-if="isOrgOnly">
              <v-label>Organización</v-label>
              <v-autocomplete
                v-model="form.organization_id"
                :items="organizationOptions"
                :loading="loadingOrganizations"
                v-model:search-input="organizationSearch"
                item-title="display"
                item-value="id"
                variant="outlined"
                color="primary"
                class="mt-2 mb-4"
                density="compact"
                placeholder="Selecciona una organización"
                clearable
                :menu-props="{ maxHeight: '300px' }"
                :error="!!fieldErrors.organization_id"
                :error-messages="fieldErrors.organization_id"
                :disabled="!canEditRoleAndScope"
              />
              <v-label>Empresa</v-label>
              <v-autocomplete
                v-model="form.business_id"
                :items="businessOptions"
                :loading="loadingBusinesses"
                v-model:search-input="businessSearch"
                item-title="display"
                item-value="id"
                variant="outlined"
                color="primary"
                class="mt-2 mb-6"
                density="compact"
                placeholder="Selecciona una empresa"
                clearable
                :menu-props="{ maxHeight: '300px' }"
                :disabled="true"
              />
              <v-label>Ubicación</v-label>
              <v-autocomplete
                v-model="form.business_unit_id"
                :items="businessUnitOptions"
                :loading="loadingBusinessUnits"
                v-model:search-input="businessUnitSearch"
                item-title="display"
                item-value="id"
                variant="outlined"
                color="primary"
                class="mt-2"
                density="compact"
                placeholder="Selecciona una ubicación"
                clearable
                :menu-props="{ maxHeight: '300px' }"
                :disabled="true"
              />
            </template>

            <template v-else-if="isBusinessOnly">
              <v-label>Organización</v-label>
              <v-autocomplete
                v-model="form.organization_id"
                :items="organizationOptions"
                :loading="loadingOrganizations"
                v-model:search-input="organizationSearch"
                item-title="display"
                item-value="id"
                variant="outlined"
                color="primary"
                class="mt-2 mb-4"
                density="compact"
                placeholder="Selecciona una organización"
                clearable
                :menu-props="{ maxHeight: '300px' }"
                :disabled="true"
              />
              <v-label>Empresa</v-label>
              <v-autocomplete
                v-model="form.business_id"
                :items="businessOptions"
                :loading="loadingBusinesses"
                v-model:search-input="businessSearch"
                item-title="display"
                item-value="id"
                variant="outlined"
                color="primary"
                class="mt-2 mb-6"
                density="compact"
                placeholder="Selecciona una empresa"
                clearable
                :menu-props="{ maxHeight: '300px' }"
                :error="!!fieldErrors.business_id"
                :error-messages="fieldErrors.business_id"
                :disabled="!canEditRoleAndScope"
              />
              <v-label>Ubicación</v-label>
              <v-autocomplete
                v-model="form.business_unit_id"
                :items="businessUnitOptions"
                :loading="loadingBusinessUnits"
                v-model:search-input="businessUnitSearch"
                item-title="display"
                item-value="id"
                variant="outlined"
                color="primary"
                class="mt-2"
                density="compact"
                placeholder="Selecciona una ubicación"
                clearable
                :menu-props="{ maxHeight: '300px' }"
                :disabled="true"
              />
            </template>

            <template v-else-if="isBusinessUnitOnly">
              <v-label>Organización</v-label>
              <v-autocomplete
                v-model="form.organization_id"
                :items="organizationOptions"
                :loading="loadingOrganizations"
                v-model:search-input="organizationSearch"
                item-title="display"
                item-value="id"
                variant="outlined"
                color="primary"
                class="mt-2 mb-4"
                density="compact"
                placeholder="Selecciona una organización"
                clearable
                :menu-props="{ maxHeight: '300px' }"
                :disabled="true"
              />
              <v-label>Empresa</v-label>
              <v-autocomplete
                v-model="form.business_id"
                :items="businessOptions"
                :loading="loadingBusinesses"
                v-model:search-input="businessSearch"
                item-title="display"
                item-value="id"
                variant="outlined"
                color="primary"
                class="mt-2 mb-6"
                density="compact"
                placeholder="Selecciona una empresa"
                clearable
                :menu-props="{ maxHeight: '300px' }"
                :disabled="true"
              />
              <v-label>Ubicación</v-label>
              <v-autocomplete
                v-model="form.business_unit_id"
                :items="businessUnitOptions"
                :loading="loadingBusinessUnits"
                v-model:search-input="businessUnitSearch"
                item-title="display"
                item-value="id"
                variant="outlined"
                color="primary"
                class="mt-2"
                density="compact"
                placeholder="Selecciona una ubicación"
                clearable
                :menu-props="{ maxHeight: '300px' }"
                :error="!!fieldErrors.business_unit_id"
                :error-messages="fieldErrors.business_unit_id"
                :disabled="!canEditRoleAndScope"
              />
            </template>

            <template v-else>
              <v-label>Organización</v-label>
              <v-autocomplete
                v-model="form.organization_id"
                :items="organizationOptions"
                :loading="loadingOrganizations"
                v-model:search-input="organizationSearch"
                item-title="display"
                item-value="id"
                variant="outlined"
                color="primary"
                class="mt-2 mb-4"
                density="compact"
                placeholder="Selecciona una organización"
                clearable
                :menu-props="{ maxHeight: '300px' }"
                :error="!!fieldErrors.organization_id"
                :error-messages="fieldErrors.organization_id"
                :disabled="!canEditRoleAndScope"
              />
              <v-label>Empresa</v-label>
              <v-autocomplete
                v-model="form.business_id"
                :items="businessOptions"
                :loading="loadingBusinesses"
                v-model:search-input="businessSearch"
                item-title="display"
                item-value="id"
                variant="outlined"
                color="primary"
                class="mt-2 mb-6"
                density="compact"
                placeholder="Selecciona una empresa"
                clearable
                :menu-props="{ maxHeight: '300px' }"
                :error="!!fieldErrors.business_id"
                :error-messages="fieldErrors.business_id"
                :disabled="!canEditRoleAndScope"
              />
              <v-label>Ubicación</v-label>
              <v-autocomplete
                v-model="form.business_unit_id"
                :items="businessUnitOptions"
                :loading="loadingBusinessUnits"
                v-model:search-input="businessUnitSearch"
                item-title="display"
                item-value="id"
                variant="outlined"
                color="primary"
                class="mt-2"
                density="compact"
                placeholder="Selecciona una ubicación"
                clearable
                :menu-props="{ maxHeight: '300px' }"
                :error="!!fieldErrors.business_unit_id"
                :error-messages="fieldErrors.business_unit_id"
                :disabled="!canEditRoleAndScope"
              />
            </template>
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12" class="d-flex justify-end">
            <v-btn color="primary" class="mt-6" :loading="isLoading" :disabled="isLoading" @click="validate">
              <template v-slot:loader>
                <v-progress-circular indeterminate color="white" size="20" />
              </template>
              {{ isLoading ? 'Guardando Cambios...' : 'Guardar Cambios' }}
            </v-btn>
          </v-col>
        </v-row>
      </v-form>
    </v-container>
  </div>
</template>

<style scoped src="@/styles/users.css"></style>
