<script setup>
import { ref, onMounted, watch, computed, reactive } from 'vue';
import axiosInstance from '@/utils/axios';
import { FREQUENCY, urlToFile } from '@/constants/constants';
import { useAuthStore } from '@/stores/auth';
import { mdiArrowLeft } from '@mdi/js';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { groupUsersByRole } from '@/utils/helpers/groupUsers';

const auth = useAuthStore();
const user = computed(() => auth.user);
const toast = useToast();
const router = useRouter();
const goBack = () => {
  router.push('/formularios');
};

const isSuperadmin = computed(() => user.value?.roles?.includes('superadmin'));

const canViewAnyBusiness = computed(() => {
  return user?.permissions?.includes('business.viewAny');
});

const canViewAnyUnit = computed(() => {
  return user?.permissions?.includes('business_unit.viewAny');
});

const userBusinesses = computed(() => {
  return user?.business_id;
});

const fieldErrors = reactive({
  name: '',
  description: '',
  supervisor: '',
  auditors: '',
  audited: '',
  frequency: '',
  scope: ''
});

const Regform = ref('');
const name = ref('');
const description = ref('');
const supervisor = ref('');
const auditors = ref([]);
const audited = ref([]);
const frequency = ref('');
const businessUnitId = ref('');
const businessId = ref('');
const scope = ref('');
const hasRating = ref(false);
const businesses = ref([]);
const businessUnits = ref([]);
const groups = ref([]);
const groupId = ref('');
const logo = ref(null);

const sameLogo = ref(false);

const filteredUsers = ref([]);
const allUsers = ref([]);

// Select de organización para superadmin
const selectedOrganization = ref(null);
const organizationOptions = ref([]);
const loadingOrganizations = ref(false);

const allRoles = computed(() => {
  return groupUsersByRole(allUsers.value);
});

const filteredRoles = computed(() => {
  return groupUsersByRole(filteredUsers.value);
});

const fetchAllUsers = async () => {
  try {
    const res = await axiosInstance.get('/users');
    allUsers.value = res.data.data.map((user) => ({
      ...user,
      customLabel: `${user.roles?.[0]?.name || 'Sin rol'}`
    }));
    console.log(res.data.data);
  } catch (err) {
    console.error('Error fetching users:', err);
    allUsers.value = [];
  }
};

const fetchUsersByScope = async () => {
  try {
    if (scope.value === 'business_unit_group' && !groupId.value) {
      return;
    }

    if (scope.value === 'business' && !businessId.value) {
      return;
    }

    if (scope.value === 'business_unit' && !businessUnitId.value) {
      return;
    }

    if (scope.value === 'organization' && isSuperadmin.value && !selectedOrganization.value) {
      return;
    }

    const params = { scope: scope.value };

    if (isSuperadmin.value) {
      if (scope.value === 'organization' && selectedOrganization.value) {
        params.organization_id = selectedOrganization.value;
      } else {
        params.organization_id = organizationId.value;
      }
    }

    if (scope.value === 'business' && businessId.value) {
      params.business_id = businessId.value;
    } else if (scope.value === 'business_unit' && businessUnitId.value) {
      params.business_unit_id = businessUnitId.value;
    } else if (scope.value === 'organization') {
      if (!isSuperadmin.value) {
        params.organization_id = auth.user?.organization_id;
      }
    } else if (scope.value === 'business_unit_group' && groupId.value) {
      params.business_unit_group_id = groupId.value;
    }

    const res = await axiosInstance.get('/users-by-scope', { params });

    filteredUsers.value = res.data.data.map((user) => ({
      ...user,
      customLabel: `${user.roles?.[0]?.name || 'Sin rol'}`
    }));

    if (scope.value === 'business_unit_group' && groupId.value) {
      const allRoles = new Set();
      filteredUsers.value.forEach((user) => {
        if (user.roles && user.roles.length > 0) {
          user.roles.forEach((role) => {
            allRoles.add(role.id);
          });
        }
      });

      audited.value = Array.from(allRoles);
    }
  } catch (err) {
    console.error('Error fetching users:', err);
    filteredUsers.value = [];
  }
};

watch([scope, businessId, businessUnitId, groupId, selectedOrganization], async () => {
  if (scope.value) {
    if (scope.value !== 'business_unit_group') {
      audited.value = [];
    }
    auditors.value = [];

    if ((scope.value === 'business' || scope.value === 'business_unit') && userBusinesses.value && !canViewAnyBusiness.value) {
      businessId.value = userBusinesses.value;
      if (scope.value === 'business_unit') {
        await fetchBusinessUnits();
      }
    }

    await fetchUsersByScope();
  }
});

watch(selectedOrganization, async (newOrgId) => {
  if (scope.value === 'organization' && isSuperadmin.value && newOrgId) {
    await fetchUsersByScope();
  }
});

watch(businessId, async (newBusinessId) => {
  if (newBusinessId && scope.value === 'business_unit') {
    businessUnitId.value = '';
    await fetchBusinessUnits();
  }
});

watch(groupId, async (newGroupId) => {
  if (scope.value === 'business_unit_group' && newGroupId) {
    await fetchUsersByScope();
  }
});

const fetchBusinessUnits = async (searchText = '') => {
  try {
    const params = { q: searchText, limit: 10 };

    if (scope.value === 'business_unit') {
      const res = await axiosInstance.get('/business-units', { params });
      businessUnits.value = res.data.data.map((businessUnit) => ({
        ...businessUnit,
        customLabel: `${businessUnit.legal_name}`
      }));
    }
  } catch (err) {
    console.log(err);
    businessUnits.value = [];
  }
};

const fetchOrganizations = async () => {
  if (!isSuperadmin.value) return;
  loadingOrganizations.value = true;
  try {
    const { data } = await axiosInstance.get('/organizations');
    organizationOptions.value = (data.data || []).map((o) => ({
      ...o,
      title: `${o.folio} - ${o.legal_name}`,
      value: o.id
    }));
  } catch (e) {
    organizationOptions.value = [];
  } finally {
    loadingOrganizations.value = false;
  }
};

watch(scope, (newScope) => {
  if (newScope === 'organization' && isSuperadmin.value && organizationOptions.value.length === 0) {
    fetchOrganizations();
  }
});

onMounted(async () => {
  try {
    await fetchAllUsers();
    const resBusiness = await axiosInstance.get('/businesses');
    console.log(resBusiness.data.data);
    businesses.value = resBusiness.data.data.map((business) => ({
      ...business,
      customLabel: `${business.folio} - ${business.name}`
    }));

    // No ejecutar fetchBusinessUnits aquí, se ejecutará cuando se seleccione el scope
    // await fetchBusinessUnits();

    const resGroup = await axiosInstance.get('/business-unit-groups');
    groups.value = resGroup.data.data.map((group) => ({
      ...group,
      customLabel: `${group.name}`
    }));
  } catch (err) {
    console.log(err);
  }
});
const clearFieldError = (fieldName) => {
  if (fieldErrors[fieldName]) {
    fieldErrors[fieldName] = '';
  }
};

const validateField = (fieldName, value) => {
  clearFieldError(fieldName);

  switch (fieldName) {
    case 'name':
      if (!value) {
        fieldErrors.name = 'El nombre del formulario es obligatorio';
        return false;
      }
      break;

    case 'supervisor':
      if (!value) {
        fieldErrors.supervisor = 'El supervisor es obligatorio';
        return false;
      }
      break;

    case 'auditors':
      if (!value || value.length === 0) {
        fieldErrors.auditors = 'Debe seleccionar al menos un auditor';
        return false;
      }
      break;

    case 'audited':
      if (!value || value.length === 0) {
        fieldErrors.audited = 'Debe seleccionar al menos un auditado';
        return false;
      }
      break;

    case 'frequency':
      if (!value) {
        fieldErrors.frequency = 'La frecuencia es obligatoria';
        return false;
      }
      break;

    case 'scope':
      if (!value) {
        fieldErrors.scope = 'El alcance es obligatorio';
        return false;
      }
      break;

    case 'logo':
      if (!sameLogo.value && (!value || (Array.isArray(value) && value.length === 0))) {
        fieldErrors.logo = 'El logo es obligatorio';
        return false;
      }
      break;
  }

  return true;
};

const validateAllFields = () => {
  let isValid = true;

  if (!validateField('name', name.value)) {
    isValid = false;
  }

  if (!validateField('supervisor', supervisor.value)) {
    isValid = false;
  }

  if (!validateField('auditors', auditors.value)) {
    isValid = false;
  }

  if (!validateField('audited', audited.value)) {
    isValid = false;
  }

  if (!validateField('frequency', frequency.value)) {
    isValid = false;
  }

  if (!validateField('scope', scope.value)) {
    isValid = false;
  }

  if (scope.value === 'business' || scope.value === 'business_unit' || scope.value === 'business_unit_group') {
    if (!businessId.value) {
      isValid = false;
    }
  }

  if (scope.value === 'business_unit') {
    if (!businessUnitId.value) {
      isValid = false;
    }
  }

  if (scope.value === 'business_unit_group') {
    if (!groupId.value) {
      isValid = false;
    }
  }

  if (!validateField('logo', logo.value)) {
    isValid = false;
  }

  return isValid;
};

const isLoading = ref(false);
const validate = async () => {
  try {
    isLoading.value = true;
    const formData = new FormData();
    formData.append('name', name.value);
    formData.append('description', description.value);
    // Obtener el ID del rol del supervisor
    const supervisorRole = allRoles.value.find((role) => role.id === supervisor.value);
    if (supervisorRole) {
      formData.append('supervisor_role_id', supervisorRole.id);
    }

    // Obtener los IDs de roles de los auditores
    auditors.value.forEach((roleId, index) => {
      formData.append(`auditor_role_ids[${index}]`, roleId);
    });

    // Obtener los IDs de roles de los auditados
    audited.value.forEach((roleId, index) => {
      formData.append(`auditado_role_ids[${index}]`, roleId);
    });

    formData.append('frequency', frequency.value);
    formData.append('assignment_scope', scope.value);
    formData.append('has_rating', hasRating.value ? '1' : '0');
    console.log(hasRating.value);
    if (logo.value && !sameLogo.value) {
      formData.append('logo', logo.value);
    }
    if (sameLogo.value && scope.value !== 'organization') {
      let selectBusiness = null;
      if (scope.value === 'business' && businessId.value) {
        selectBusiness = businesses.value.find((b) => b.id === businessId.value);
      } else if (scope.value === 'business_unit' && businessId.value) {
        selectBusiness = businesses.value.find((b) => b.id === businessId.value);
      } else if (scope.value === 'business_unit_group' && businessId.value) {
        selectBusiness = businesses.value.find((b) => b.id === businessId.value);
      }

      if (selectBusiness?.logo) {
        const logoFile = await urlToFile(selectBusiness.logo, selectBusiness.legal_name);
        formData.append('logo', logoFile);
      }
    }

    if (scope.value === 'organization') {
      // Si es superadmin, usar la organización seleccionada, sino la del usuario
      const orgId = isSuperadmin.value && selectedOrganization.value ? selectedOrganization.value : user.value?.organization_id;
      formData.append('organization_id', orgId);
    } else if (scope.value === 'business') {
      formData.append('business_id', businessId.value);
      formData.append('organization_id', user.value?.organization_id);
    } else if (scope.value === 'business_unit') {
      formData.append('business_id', businessId.value);
      formData.append('business_unit_id', businessUnitId.value);
      formData.append('organization_id', user.value?.organization_id);
    } else if (scope.value === 'business_unit_group') {
      formData.append('business_unit_group_id', groupId.value);
      formData.append('organization_id', user.value?.organization_id);
      formData.append('business_id', businessId.value);
    }

    const res = await axiosInstance.post('/forms', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    toast.success('Formulario creado correctamente');

    const newForm = res.data.form;
    if (newForm && newForm.id) {
      router.push({
        name: 'AddFieldsForm',
        params: { id: newForm.id },
        state: { form: newForm }
      });
    }
  } catch (err) {
    toast.error('Error al crear el formulario');
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <v-container fluid>
    <v-toolbar class="mb-4" density="compact" title="Creacion de Formulario">
      <template #prepend v-if="!isSponsor">
        <v-btn icon @click="goBack">
          <v-icon :icon="mdiArrowLeft" />
        </v-btn>
      </template>
    </v-toolbar>
    <v-row>
      <v-col cols="12" md="12">
        <v-form ref="Regform" lazy-validation action="/dashboards/analytical" class="container mt-5">
          <!-- Nombre del Formulario -->
          <v-row class="my-0">
            <v-col cols="12" sm="6" class="py-0">
              <div class="mb-6">
                <v-label>Nombre del Formulario <span class="text-error">*</span></v-label>
                <v-text-field
                  v-model="name"
                  required
                  variant="outlined"
                  class="mt-2"
                  color="primary"
                  :error-messages="fieldErrors.name"
                  @update:model-value="clearFieldError('name')"
                />
              </div>
            </v-col>
            <v-switch v-model="hasRating" label="Preguntas con ponderación?" color="primary" class="mt-2" />
          </v-row>

          <!-- Descripción -->
          <v-row class="my-0">
            <v-col cols="12" sm="6" class="py-0">
              <div class="mb-6">
                <v-label>Descripción</v-label>
                <v-text-field
                  v-model="description"
                  variant="outlined"
                  class="mt-2"
                  color="primary"
                  :error-messages="fieldErrors.description"
                  @update:model-value="clearFieldError('description')"
                />
              </div>
            </v-col>
          </v-row>

          <!-- Supervisor -->
          <v-row class="my-0">
            <v-col cols="12" sm="6" class="py-0">
              <div class="mb-6">
                <v-label>Supervisor <span class="text-error">*</span></v-label>
                <v-select
                  v-model="supervisor"
                  :items="allRoles"
                  item-title="customLabel"
                  item-value="id"
                  variant="outlined"
                  color="primary"
                  class="mt-2"
                  label="Selecciona al Supervisor"
                  :error-messages="fieldErrors.supervisor"
                  @update:model-value="clearFieldError('supervisor')"
                />
              </div>
            </v-col>
          </v-row>

          <!-- Alcance -->
          <v-row class="my-0">
            <v-col cols="12" sm="6" class="py-0 d-flex flex-column justify-center">
              <v-label class="mb2">Alcance <span class="text-error">*</span></v-label>
              <v-radio-group v-model="scope" inline>
                <v-radio label="Organizacional" value="organization" />
                <v-radio label="Por Negocio" value="business" />
                <v-radio label="Por Unidad" value="business_unit" />
                <v-radio label="Asignar a Grupo" value="business_unit_group" />
              </v-radio-group>
              <v-text-field
                v-if="fieldErrors.scope"
                :model-value="''"
                variant="outlined"
                color="error"
                class="mt-2"
                :error-messages="fieldErrors.scope"
                readonly
                hide-details
              />
            </v-col>
          </v-row>

          <!-- Select de Organización SOLO para superadmin cuando scope es 'organization' -->
          <v-row v-if="isSuperadmin && scope === 'organization'" class="my-0">
            <v-col cols="12" sm="6" class="py-0">
              <div class="mb-6">
                <v-label>Organización <span class="text-error">*</span></v-label>
                <v-select
                  v-model="selectedOrganization"
                  :items="organizationOptions"
                  :loading="loadingOrganizations"
                  item-title="title"
                  item-value="value"
                  label="Selecciona la organización"
                  clearable
                  hide-details
                  variant="outlined"
                  color="primary"
                  class="mt-2"
                  required
                />
                <v-alert type="info" variant="tonal" class="mt-2" density="compact">
                  <strong>Superadmin:</strong> Selecciona la organización para la cual crearás el formulario.
                </v-alert>
              </div>
            </v-col>
          </v-row>

          <!-- Logo -->
          <v-row class="my-0">
            <v-col cols="12" sm="6" class="py-0">
              <div class="mb-6">
                <v-label>Logo <span class="text-error">*</span></v-label>
                <v-file-input
                  v-if="!sameLogo"
                  v-model="logo"
                  label="Logo"
                  :multiple="false"
                  variant="outlined"
                  color="primary"
                  class="mt-2"
                  accept="image/*"
                  :error-messages="fieldErrors.logo"
                  @update:model-value="clearFieldError('logo')"
                />
                <!-- Switch solo cuando NO es alcance organizacional -->
                <v-switch
                  v-if="scope && scope !== 'organization'"
                  v-model="sameLogo"
                  label="Mismo logo que Negocio"
                  color="primary"
                  class="mt-2"
                />
              </div>
            </v-col>
          </v-row>

          <!-- Select de Negocio (solo cuando scope es 'business' o 'business_unit') -->
          <v-row v-if="scope === 'business' || scope === 'business_unit'" class="my-0">
            <v-col cols="12" sm="6" class="py-0">
              <div class="mb-6">
                <v-label>Negocio <span class="text-error">*</span></v-label>
                <v-select
                  v-model="businessId"
                  :items="businesses"
                  item-title="customLabel"
                  item-value="id"
                  variant="outlined"
                  color="primary"
                  class="mt-2"
                  label="Selecciona el Negocio"
                  required
                  :disabled="userBusinesses && !canViewAnyBusiness"
                  :error-messages="fieldErrors.businessId"
                  @update:model-value="clearFieldError('businessId')"
                />
                <v-alert v-if="userBusinesses && !canViewAnyBusiness" type="info" variant="tonal" class="mt-2" density="compact">
                  <strong>Asignación automática de negocio</strong>
                </v-alert>
              </div>
            </v-col>
          </v-row>

          <!-- Select de Unidad de Negocio (solo cuando scope es 'business_unit') -->
          <v-row v-if="scope === 'business_unit'" class="my-0">
            <v-col cols="12" sm="6" class="py-0">
              <div class="mb-6">
                <v-label>Unidad de Negocio <span class="text-error">*</span></v-label>
                <v-select
                  v-model="businessUnitId"
                  :items="businessUnits"
                  item-title="customLabel"
                  item-value="id"
                  variant="outlined"
                  color="primary"
                  class="mt-2"
                  label="Selecciona la Unidad de Negocio"
                  required
                  :error-messages="fieldErrors.businessUnitId"
                  @update:model-value="clearFieldError('businessUnitId')"
                />
              </div>
            </v-col>
          </v-row>

          <!-- Select de Grupo (solo cuando scope es 'business_unit_group') -->
          <v-row v-if="scope === 'business_unit_group'" class="my-0">
            <v-col cols="12" sm="6" class="py-0">
              <div class="mb-6">
                <v-label>Grupo <span class="text-error">*</span></v-label>
                <v-select
                  v-model="groupId"
                  :items="groups"
                  item-title="customLabel"
                  item-value="id"
                  variant="outlined"
                  color="primary"
                  class="mt-2"
                  label="Selecciona el Grupo"
                  required
                  :error-messages="fieldErrors.groupId"
                  @update:model-value="clearFieldError('groupId')"
                />
                <v-alert type="info" variant="tonal" class="mt-2" density="compact">
                  <strong>Asignación automática:</strong> Al seleccionar un grupo, se asignarán automáticamente TODOS los roles de las
                  unidades de negocio que pertenecen a este grupo como auditados.
                </v-alert>
              </div>
            </v-col>
          </v-row>

          <!-- Auditores -->
          <div class="mb-6">
            <v-label>Auditores <span class="text-error">*</span></v-label>
            <v-select
              v-model="auditors"
              :items="allRoles"
              multiple
              item-title="customLabel"
              item-value="id"
              variant="outlined"
              color="primary"
              class="mt-2"
              label="Selecciona a los Auditores"
              :hint="`${allRoles.length} roles disponibles`"
              persistent-hint
              :error-messages="fieldErrors.auditors"
              @update:model-value="clearFieldError('auditors')"
            />
          </div>

          <!-- Auditados -->
          <div class="mb-6">
            <v-label>Auditados <span class="text-error">*</span></v-label>
            <v-select
              v-model="audited"
              multiple
              :items="filteredRoles"
              item-title="customLabel"
              item-value="id"
              variant="outlined"
              color="primary"
              class="mt-2"
              label="Selecciona a los Auditados"
              :hint="scope === 'business_unit_group' ? 'Selección automática para grupos' : `${filteredRoles.length} roles disponibles`"
              persistent-hint
              :disabled="scope === 'business_unit_group'"
              :readonly="scope === 'business_unit_group'"
              :error-messages="fieldErrors.audited"
              @update:model-value="clearFieldError('audited')"
            />
            <v-alert
              v-if="scope === 'business_unit_group' && audited.length > 0"
              type="success"
              variant="tonal"
              class="mt-2"
              density="compact"
            >
              Se han asignado automáticamente {{ audited.length }} roles de las unidades del grupo seleccionado.
            </v-alert>
          </div>

          <!-- Frecuencia -->
          <div class="mb-6">
            <v-label>Frecuencia <span class="text-error">*</span></v-label>
            <v-select
              v-model="frequency"
              :items="FREQUENCY"
              item-title="label"
              item-value="value"
              variant="outlined"
              color="primary"
              class="mt-2"
              label="Selecciona la frecuencia del formulario"
              required
              :error-messages="fieldErrors.frequency"
              @update:model-value="clearFieldError('frequency')"
            />
          </div>

          <div class="d-sm-inline-flex align-center mt-2 mb-7 mb-sm-0 font-weight-bold"></div>

          <v-btn
            color="primary"
            block
            class="mt-4"
            variant="flat"
            size="large"
            :loading="isLoading"
            :disabled="isLoading"
            @click="validate()"
          >
            <template v-slot:loader>
              <v-progress-circular indeterminate color="white" size="20" />
            </template>
            {{ isLoading ? 'Creando Formulario...' : 'Crear Formulario' }}
          </v-btn>
        </v-form>
      </v-col>
    </v-row>
  </v-container>
</template>
