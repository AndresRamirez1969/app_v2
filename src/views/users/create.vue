<script setup>
import { reactive, ref, watch, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { mdiArrowLeft } from '@mdi/js';
import axiosInstance from '@/utils/axios';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();

const Regform = ref(null);
const profilePreview = ref(null);
const errorMsg = ref('');
const canCreate = ref(false);

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
  role: '',
  organization_id: ''
});

const fieldRefs = {
  name: ref(null),
  email: ref(null),
  role: ref(null),
  organization_id: ref(null)
};

const clearFieldError = (fieldName) => {
  if (fieldErrors[fieldName]) {
    fieldErrors[fieldName] = '';
  }
};

const validateField = (fieldName, value) => {
  clearFieldError(fieldName);
  switch (fieldName) {
    case 'name':
      if (!value || value.trim() === '') {
        fieldErrors.name = 'El nombre es obligatorio';
        return false;
      }
      break;
    case 'email':
      if (!value || value.trim() === '') {
        fieldErrors.email = 'El correo es obligatorio';
        return false;
      }
      break;
    case 'role':
      if (!value || value.trim() === '') {
        fieldErrors.role = 'El rol es obligatorio';
        return false;
      }
      break;
    case 'organization_id':
      if (!value || value.trim() === '') {
        fieldErrors.organization_id = 'El usuario debe pertenecer a una entidad';
        return false;
      }
      break;
  }
  return true;
};

onMounted(() => {
  const user = auth.user;
  canCreate.value = user?.permissions?.includes('user.create');
});

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
const isSponsor = computed(() => auth.user?.roles?.includes('sponsor'));
const userOrgId = computed(() => auth.user?.organization_id);

watch(
  () => form.profile_picture,
  (file) => {
    let imageFile = null;
    if (Array.isArray(file)) {
      imageFile = file.length > 0 ? file[0] : null;
    } else if (file instanceof File || file instanceof Blob) {
      imageFile = file;
    }
    profilePreview.value = imageFile ? URL.createObjectURL(imageFile) : null;
  }
);

// --- ORGANIZATION AUTOCOMPLETE ---
const fetchOrganizations = async (searchText = '') => {
  loadingOrganizations.value = true;
  try {
    const { data } = await axiosInstance.get('/organizations', {
      params: { q: searchText, limit: 10 }
    });
    organizationOptions.value = (data.data || []).map((o) => ({
      ...o,
      display: `${o.folio}${o.legal_name ? ' - ' + o.legal_name : ''}`
    }));
  } catch (e) {
    organizationOptions.value = [];
  } finally {
    loadingOrganizations.value = false;
  }
};

watch(organizationSearch, (val) => {
  fetchOrganizations(val);
});
onMounted(() => fetchOrganizations(''));

// --- BUSINESS AUTOCOMPLETE ---
const fetchBusinesses = async (searchText = '') => {
  loadingBusinesses.value = true;
  try {
    const params = { q: searchText, limit: 10 };
    if (form.organization_id) params.organization_id = form.organization_id;
    const { data } = await axiosInstance.get('/businesses', { params });
    businessOptions.value = (data.data || []).map((b) => ({
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

watch([businessSearch, () => form.organization_id], ([val]) => {
  fetchBusinesses(val);
});
onMounted(() => fetchBusinesses(''));

// --- BUSINESS UNIT AUTOCOMPLETE ---
const fetchBusinessUnits = async (searchText = '') => {
  loadingBusinessUnits.value = true;
  try {
    const params = { q: searchText, limit: 10 };
    if (form.organization_id) params.organization_id = form.organization_id;
    if (form.business_id) params.business_id = form.business_id;
    const { data } = await axiosInstance.get('/business-units', { params });
    businessUnitOptions.value = (data.data || []).map((u) => ({
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

watch([businessUnitSearch, () => form.organization_id, () => form.business_id], ([val]) => {
  fetchBusinessUnits(val);
});
onMounted(() => fetchBusinessUnits(''));

// --- ROLES AUTOCOMPLETE (para superadmin: todos, para otros: filtrados) ---
const fetchAllRoles = async () => {
  loadingRoles.value = true;
  try {
    const { data } = await axiosInstance.get('/roles', { params: { q: roleSearch.value } });
    allRoleOptions.value = (data.data || []).filter((r) => r.name !== 'superadmin');
  } catch (e) {
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
  } catch (e) {
    orgRoleOptions.value = [];
  } finally {
    loadingOrgRoles.value = false;
  }
};

// --- ROLES PARA EL SELECT PRINCIPAL ---
const filteredRoleOptions = computed(() => {
  // Superadmin: filtra por organización seleccionada
  if (isSuperadmin.value) {
    if (!selectedOrgForRoles.value) return [];
    return orgRoleOptions.value.map((r) => ({
      ...r,
      display: r.name === 'admin' ? 'Administrador' : r.name === 'sponsor' ? 'Sponsor' : r.name
    }));
  }
  // Sponsor: solo roles de su organización, excluyendo admin
  if (isSponsor.value) {
    return allRoleOptions.value
      .filter((r) => (r.organization_id === userOrgId.value || r.name === 'sponsor') && r.name !== 'admin')
      .map((r) => ({
        ...r,
        display: r.name === 'sponsor' ? 'Sponsor' : r.name
      }));
  }
  // Otros: roles de su organización + admin + sponsor
  return allRoleOptions.value
    .filter((r) => r.organization_id === userOrgId.value || r.name === 'admin' || r.name === 'sponsor')
    .map((r) => ({
      ...r,
      display: r.name === 'admin' ? 'Administrador' : r.name === 'sponsor' ? 'Sponsor' : r.name
    }));
});

// --- WATCHERS PARA ROLES ---
watch(roleSearch, () => {
  if (isSuperadmin.value) {
    if (selectedOrgForRoles.value) fetchOrgRoles(selectedOrgForRoles.value);
  } else {
    fetchAllRoles();
  }
});
onMounted(() => {
  if (isSuperadmin.value) {
    fetchOrganizations('');
  }
  fetchAllRoles();
});

// Cuando el superadmin selecciona una organización, filtra los roles
watch(selectedOrgForRoles, (orgId) => {
  if (isSuperadmin.value && orgId) {
    fetchOrgRoles(orgId);
    form.role = null;
  }
});

// --- SOLO UNO DE LOS 3 SELECTS ---
watch(
  () => form.organization_id,
  (val) => {
    if (val) {
      form.business_id = null;
      form.business_unit_id = null;
    }
  }
);
watch(
  () => form.business_id,
  (val) => {
    if (val) {
      form.organization_id = null;
      form.business_unit_id = null;
    }
  }
);
watch(
  () => form.business_unit_id,
  (val) => {
    if (val) {
      form.organization_id = null;
      form.business_id = null;
    }
  }
);

const isLoading = ref(false);
// --- VALIDATION & SUBMIT ---
const validate = async () => {
  errorMsg.value = '';
  isLoading.value = true;
  if (!form.name || !form.email || !form.role || (!form.organization_id && !form.business_id && !form.business_unit_id)) {
    errorMsg.value = 'Por favor completa el nombre, correo, rol y selecciona organización, empresa o ubicación.';
    return;
  }

  // Si eligió business, setea organization_id
  if (form.business_id && !form.organization_id) {
    const business = businessOptions.value.find((b) => b.id === form.business_id);
    if (business) form.organization_id = business.organization_id;
  }

  // Si eligió business_unit, setea business_id y organization_id
  if (form.business_unit_id && (!form.business_id || !form.organization_id)) {
    const unit = businessUnitOptions.value.find((u) => u.id === form.business_unit_id);
    if (unit) {
      form.business_id = unit.business_id;
      form.organization_id = unit.organization_id;
    }
  }

  try {
    const formData = new FormData();
    formData.append('name', form.name);
    formData.append('email', form.email);
    formData.append('role', form.role);

    if (form.organization_id) formData.append('organization_id', form.organization_id);
    if (form.business_id) formData.append('business_id', form.business_id);
    if (form.business_unit_id) formData.append('business_unit_id', form.business_unit_id);

    if (form.profile_picture) {
      const file = Array.isArray(form.profile_picture) ? form.profile_picture[0] : form.profile_picture;
      formData.append('profile_picture', file);
    }

    // Contacto
    for (const key in form.contact) {
      if (form.contact[key]) {
        formData.append(`contact[${key}]`, form.contact[key]);
      }
    }

    const res = await axiosInstance.post('/users', formData);

    const user = res.data.user || res.data.data || res.data;
    if (user?.id) {
      router.replace(`/usuarios/${user.id}`);
    }
  } catch (err) {
    if (err?.response?.data?.errors) {
      const serverErrors = err.response.data.errors;
      let firstServerErrorField = null;

      if (serverErrors.name) {
        fieldErrors.name = serverErrors.name[0];
        if (!firstServerErrorField) firstServerErrorField = 'name';
      }
      if (serverErrors.email) {
        fieldErrors.email = serverErrors.email[0];
        if (!firstServerErrorField) firstServerErrorField = 'email';
      }
      if (serverErrors.role) {
        fieldErrors.role = serverErrors.role[0];
        if (!firstServerErrorField) firstServerErrorField = 'role';
      }
      if (serverErrors.organization_id) {
        fieldErrors.organization_id = serverErrors.organization_id[0];
        if (!firstServerErrorField) firstServerErrorField = 'organization_id';
      }
    } else if (err?.response?.data?.message) {
      errorMsg.value = err.response.data.message;
    } else {
      errorMsg.value = 'Error al crear usuario';
    }
    console.error('❌ Error al crear usuario:', err);
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
          <v-btn icon variant="text" class="px-3 py-2" style="border-radius: 8px; border: 1px solid #ccc" @click="router.back()">
            <v-icon :icon="mdiArrowLeft" />
          </v-btn>
          <h3 class="font-weight-medium ml-3 mb-0">Agregar Usuario</h3>
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
            <v-text-field v-model="form.name" variant="outlined" color="primary" class="mt-2 mb-4" required />

            <v-label>Correo <span class="text-error">*</span></v-label>
            <v-text-field v-model="form.email" variant="outlined" color="primary" class="mt-2 mb-4" required />

            <!-- Select de organización para superadmin -->
            <template v-if="isSuperadmin">
              <v-label>Organización para filtrar roles</v-label>
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
                hide-details
                :menu-props="{ maxHeight: '300px' }"
                required
              />
            </template>

            <div style="height: 22px"></div>

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
              hide-details
              :menu-props="{ maxHeight: '300px' }"
              required
            />
          </v-col>
        </v-row>

        <!-- Divider antes de los selects de organización, empresa y ubicación -->
        <v-row>
          <v-col cols="12">
            <h4 class="font-weight-bold mb-3">Pertenece a</h4>
            <v-divider class="mb-6" />
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12" md="12">
            <v-label>Organización <span class="text-error">*</span></v-label>
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
              hide-details
              :menu-props="{ maxHeight: '300px' }"
              :disabled="!!form.business_id || !!form.business_unit_id"
              required="!form.business_id && !form.business_unit_id"
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
              hide-details
              :menu-props="{ maxHeight: '300px' }"
              :disabled="!!form.organization_id || !!form.business_unit_id"
              required="!form.organization_id && !form.business_unit_id"
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
              hide-details
              :menu-props="{ maxHeight: '300px' }"
              :disabled="!!form.organization_id || !!form.business_id"
              required="!form.organization_id && !form.business_id"
            />
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12" class="d-flex justify-end">
            <v-btn color="primary" class="mt-6" :loading="isLoading" :disabled="isLoading" @click="validate">
              <template v-slot:loader>
                <v-progress-circular indeterminate color="white" size="20" />
              </template>
              {{ isLoading ? 'Creando Usuario...' : 'Crear Usuario' }}
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
