<script setup>
import { ref, onMounted, watch, computed, reactive } from 'vue';
import axiosInstance from '@/utils/axios';
import { FREQUENCY, urlToFile } from '@/constants/constants';
import { useAuthStore } from '@/stores/auth';
import { mdiArrowLeft, mdiInformationSlabCircleOutline } from '@mdi/js';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { groupUsersByRole } from '@/utils/helpers/groupUsers';

const auth = useAuthStore();
const user = computed(() => auth.user);
const toast = useToast();
const router = useRouter();

const Regform = ref('');
const profilePreview = ref(null);

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

const selectedOrganization = ref(null);
const organizationOptions = ref([]);
const loadingOrganizations = ref(false);

const allUsers = ref([]);
const filteredUsers = ref([]);

const fieldErrors = reactive({
  name: '',
  description: '',
  supervisor: '',
  auditors: '',
  audited: '',
  frequency: '',
  scope: '',
  logo: '',
  businessId: '',
  businessUnitId: '',
  groupId: ''
});

const isSuperadmin = computed(() => user.value?.roles?.includes('superadmin'));
const userBusinesses = computed(() => user.value?.business_id);
const canViewAnyBusiness = computed(() => user.value?.permissions?.includes('business.viewAny'));

const allRoles = computed(() => groupUsersByRole(allUsers.value));
const filteredRoles = computed(() => groupUsersByRole(filteredUsers.value));

const goBack = () => {
  router.push('/formularios');
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
    case 'businessId':
      if ((scope.value === 'business' || scope.value === 'business_unit' || scope.value === 'business_unit_group') && !value) {
        fieldErrors.businessId = 'El negocio es obligatorio';
        return false;
      }
      break;
    case 'businessUnitId':
      if (scope.value === 'business_unit' && !value) {
        fieldErrors.businessUnitId = 'La unidad de negocio es obligatoria';
        return false;
      }
      break;
    case 'groupId':
      if (scope.value === 'business_unit_group' && !value) {
        fieldErrors.groupId = 'El grupo es obligatorio';
        return false;
      }
      break;
  }
  return true;
};

const validateAllFields = () => {
  let isValid = true;
  if (!validateField('name', name.value)) isValid = false;
  if (!validateField('supervisor', supervisor.value)) isValid = false;
  if (!validateField('auditors', auditors.value)) isValid = false;
  if (!validateField('audited', audited.value)) isValid = false;
  if (!validateField('frequency', frequency.value)) isValid = false;
  if (!validateField('scope', scope.value)) isValid = false;
  if (!validateField('logo', logo.value)) isValid = false;
  if (!validateField('businessId', businessId.value)) isValid = false;
  if (!validateField('businessUnitId', businessUnitId.value)) isValid = false;
  if (!validateField('groupId', groupId.value)) isValid = false;
  return isValid;
};

const fetchAllUsers = async () => {
  try {
    const res = await axiosInstance.get('/users');
    allUsers.value = res.data.data.map((user) => ({
      ...user,
      customLabel: `${user.roles?.[0]?.name || 'Sin rol'}`
    }));
  } catch (err) {
    allUsers.value = [];
  }
};

const fetchUsersByScope = async () => {
  try {
    if (scope.value === 'business_unit_group' && !groupId.value) return;
    if (scope.value === 'business' && !businessId.value) return;
    if (scope.value === 'business_unit' && !businessUnitId.value) return;
    if (scope.value === 'organization' && isSuperadmin.value && !selectedOrganization.value) return;

    const params = { scope: scope.value };
    if (scope.value === 'organization') {
      params.organization_id = isSuperadmin.value && selectedOrganization.value ? selectedOrganization.value : auth.user?.organization_id;
    } else if (scope.value === 'business' && businessId.value) {
      params.business_id = businessId.value;
      const selectedBusiness = businesses.value.find((b) => b.id === businessId.value);
      if (selectedBusiness?.organization?.id) params.organization_id = selectedBusiness.organization.id;
    } else if (scope.value === 'business_unit' && businessUnitId.value) {
      params.business_unit_id = businessUnitId.value;
      const selectedBusinessUnit = businessUnits.value.find((u) => u.id === businessUnitId.value);
      if (selectedBusinessUnit?.organization?.id) params.organization_id = selectedBusinessUnit.organization.id;
    } else if (scope.value === 'business_unit_group' && groupId.value) {
      params.business_unit_group_id = groupId.value;
      const selectedGroup = groups.value.find((g) => g.id === groupId.value);
      if (selectedGroup?.organization?.id) params.organization_id = selectedGroup.organization.id;
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
    filteredUsers.value = [];
  }
};

const fetchBusinessUnits = async (searchText = '') => {
  try {
    const params = { q: searchText, limit: 10 };
    if (scope.value === 'business_unit') {
      const res = await axiosInstance.get('/business-units', { params });
      businessUnits.value = res.data.data.map((businessUnit) => ({
        ...businessUnit,
        customLabel: `${businessUnit.folio} - ${businessUnit.name}`
      }));
    }
  } catch (err) {
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

onMounted(async () => {
  await fetchAllUsers();
  const resBusiness = await axiosInstance.get('/businesses');
  businesses.value = resBusiness.data.data.map((business) => ({
    ...business,
    customLabel: `${business.folio} - ${business.name}`
  }));
  const resGroup = await axiosInstance.get('/business-unit-groups');
  groups.value = resGroup.data.data.map((group) => ({
    ...group,
    customLabel: `${group.name}`
  }));
});

watch([scope, businessId, businessUnitId, groupId, selectedOrganization], async () => {
  if (scope.value) {
    if (scope.value !== 'business_unit_group') audited.value = [];
    auditors.value = [];
    if ((scope.value === 'business' || scope.value === 'business_unit') && userBusinesses.value && !canViewAnyBusiness.value) {
      businessId.value = userBusinesses.value;
      if (scope.value === 'business_unit') await fetchBusinessUnits();
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

watch(
  () => logo.value,
  (file) => {
    if (file && typeof file === 'object') {
      const imgFile = Array.isArray(file) ? file[0] : file;
      profilePreview.value = URL.createObjectURL(imgFile);
    } else if (typeof file === 'string' && file) {
      profilePreview.value = file;
      logo.value = null;
    } else {
      profilePreview.value = null;
    }
  }
);

watch(scope, (newScope) => {
  if (newScope === 'organization' && isSuperadmin.value && organizationOptions.value.length === 0) {
    fetchOrganizations();
  }
});

const isLoading = ref(false);
const validate = async () => {
  if (!validateAllFields()) {
    isLoading.value = false;
    return;
  }
  try {
    isLoading.value = true;
    const formData = new FormData();
    formData.append('name', name.value);
    formData.append('description', description.value);

    const supervisorRole = allRoles.value.find((role) => role.id === supervisor.value);
    if (supervisorRole) formData.append('supervisor_role_id', supervisorRole.id);

    auditors.value.forEach((roleId, index) => {
      formData.append(`auditor_role_ids[${index}]`, roleId);
    });

    audited.value.forEach((roleId, index) => {
      formData.append(`auditado_role_ids[${index}]`, roleId);
    });

    formData.append('frequency', frequency.value);
    formData.append('assignment_scope', scope.value);
    formData.append('has_rating', hasRating.value ? '1' : '0');

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

    let orgId = null;
    if (scope.value === 'organization') {
      orgId = isSuperadmin.value && selectedOrganization.value ? selectedOrganization.value : user.value?.organization_id;
    } else if (scope.value === 'business' && businessId.value) {
      const selectedBusiness = businesses.value.find((b) => b.id === businessId.value);
      orgId = selectedBusiness?.organization?.id;
    } else if (scope.value === 'business_unit' && businessId.value) {
      const selectedBusiness = businesses.value.find((b) => b.id === businessId.value);
      orgId = selectedBusiness?.organization?.id;
    } else if (scope.value === 'business_unit_group' && businessId.value) {
      const selectedBusiness = businesses.value.find((b) => b.id === businessId.value);
      orgId = selectedBusiness?.organization?.id;
    }
    if (orgId) formData.append('organization_id', orgId);

    if (scope.value === 'business') formData.append('business_id', businessId.value);
    if (scope.value === 'business_unit') {
      formData.append('business_id', businessId.value);
      formData.append('business_unit_id', businessUnitId.value);
    }
    if (scope.value === 'business_unit_group') {
      formData.append('business_unit_group_id', groupId.value);
      formData.append('business_id', businessId.value);
    }

    const res = await axiosInstance.post('/forms', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
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
  <div>
    <v-container fluid>
      <v-row class="align-center mb-6" no-gutters>
        <v-col cols="auto" class="d-flex align-center">
          <v-btn icon variant="text" class="px-3 py-2" style="border-radius: 8px; border: 1px solid #ccc" @click="goBack">
            <v-icon :icon="mdiArrowLeft" />
          </v-btn>
          <h3 class="font-weight-medium ml-3 mb-0">Agregar Formulario</h3>
        </v-col>
      </v-row>

      <v-form ref="Regform" lazy-validation class="mb-10">
        <v-row>
          <v-col cols="12">
            <h4 class="font-weight-bold mb-3">Información General</h4>
            <v-divider class="mb-6" />
          </v-col>

          <v-col cols="12" md="6" class="d-flex flex-column align-center justify-center" style="min-height: 300px">
            <template v-if="profilePreview">
              <img :src="profilePreview" alt="Logo Preview" style="max-width: 300px; max-height: 300px; border-radius: 12px" />
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
              v-if="!sameLogo"
              v-model="logo"
              variant="outlined"
              color="primary"
              class="mt-2"
              accept="image/*"
              density="compact"
              show-size
              :multiple="false"
              :messages="['Solo se permiten imágenes JPEG, PNG o JPG. Tamaño máximo: 2MB.']"
              :error-messages="fieldErrors.logo"
              @update:model-value="clearFieldError('logo')"
            />
            <v-switch
              v-if="scope && scope !== 'organization'"
              v-model="sameLogo"
              label="Mismo logo que Negocio"
              color="primary"
              class="mt-2"
            />

            <div style="padding-top: 25px"></div>

            <v-label>Nombre del Formulario <span class="text-error">*</span></v-label>
            <v-text-field
              v-model="name"
              variant="outlined"
              color="primary"
              class="mt-2 mb-4"
              required
              :error="!!fieldErrors.name"
              :error-messages="fieldErrors.name"
              @update:model-value="clearFieldError('name')"
            />

            <v-label>Descripción</v-label>
            <v-text-field
              v-model="description"
              variant="outlined"
              color="primary"
              class="mt-2 mb-4"
              :error="!!fieldErrors.description"
              :error-messages="fieldErrors.description"
              @update:model-value="clearFieldError('description')"
            />
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12">
            <h4 class="font-weight-bold mb-3">Asignaciones y Alcance</h4>
            <v-divider class="mb-6" />
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12" md="6">
            <v-label>Supervisor <span class="text-error">*</span></v-label>
            <v-select
              v-model="supervisor"
              :items="allRoles"
              item-title="customLabel"
              item-value="id"
              variant="outlined"
              color="primary"
              class="mt-2 mb-4"
              label="Selecciona al Supervisor"
              :error-messages="fieldErrors.supervisor"
              @update:model-value="clearFieldError('supervisor')"
            />

            <v-label>Auditores <span class="text-error">*</span></v-label>
            <v-select
              v-model="auditors"
              :items="allRoles"
              multiple
              item-title="customLabel"
              item-value="id"
              variant="outlined"
              color="primary"
              class="mt-2 mb-4"
              label="Selecciona a los Auditores"
              :error-messages="fieldErrors.auditors"
              @update:model-value="clearFieldError('auditors')"
            />

            <v-label>Auditados <span class="text-error">*</span></v-label>
            <v-select
              v-model="audited"
              multiple
              :items="filteredRoles"
              item-title="customLabel"
              item-value="id"
              variant="outlined"
              color="primary"
              class="mt-2 mb-4"
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
          </v-col>

          <v-col cols="12" md="6">
            <v-label>Frecuencia <span class="text-error">*</span></v-label>
            <v-select
              v-model="frequency"
              :items="FREQUENCY"
              item-title="label"
              item-value="value"
              variant="outlined"
              color="primary"
              class="mt-2 mb-4"
              label="Selecciona la frecuencia del formulario"
              required
              :error-messages="fieldErrors.frequency"
              @update:model-value="clearFieldError('frequency')"
            />

            <v-label>Alcance <span class="text-error">*</span></v-label>
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

            <!-- Select de Organización SOLO para superadmin cuando scope es 'organization' -->
            <div v-if="isSuperadmin && scope === 'organization'" class="mt-4">
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

            <!-- Logo switch ya está arriba -->

            <!-- Select de Negocio (solo cuando scope es 'business' o 'business_unit') -->
            <div v-if="scope === 'business' || scope === 'business_unit'" class="mt-4">
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
                clearable
                required
                :disabled="userBusinesses && !canViewAnyBusiness"
                :error-messages="fieldErrors.businessId"
                @update:model-value="clearFieldError('businessId')"
              />
              <v-alert v-if="userBusinesses && !canViewAnyBusiness" type="info" variant="tonal" class="mt-2" density="compact">
                <strong>Asignación automática de negocio</strong>
              </v-alert>
            </div>

            <!-- Select de Unidad de Negocio (solo cuando scope es 'business_unit') -->
            <div v-if="scope === 'business_unit'" class="mt-4">
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
                clearable
                required
                :error-messages="fieldErrors.businessUnitId"
                @update:model-value="clearFieldError('businessUnitId')"
              />
            </div>

            <!-- Select de Grupo (solo cuando scope es 'business_unit_group') -->
            <div v-if="scope === 'business_unit_group'" class="mt-4">
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
                clearable
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

        <v-row>
          <v-col cols="12" class="d-flex justify-end">
            <v-btn color="primary" class="mt-6" :loading="isLoading" :disabled="isLoading" @click="validate">
              <template v-slot:loader>
                <v-progress-circular indeterminate color="white" size="20" />
              </template>
              {{ isLoading ? 'Creando Formulario...' : 'Crear Formulario' }}
            </v-btn>
          </v-col>
        </v-row>
      </v-form>
    </v-container>
  </div>
</template>
