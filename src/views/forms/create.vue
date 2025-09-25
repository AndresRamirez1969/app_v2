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

if (!user.value?.permissions?.includes('form.create')) {
  router.replace('/403');
}

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
const reuseLogo = ref(false);

const selectedOrganization = ref(null);
const organizationOptions = ref([]);
const loadingOrganizations = ref(false);

const allUsers = ref([]);
const filteredUsers = ref([]);

// INTEGRACIÓN: Organización para filtrar roles en Asignaciones (solo superadmin)
const selectedOrgForRoles = ref(null);
const orgRoleOptions = ref([]);
const loadingOrgRoles = ref(false);

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
  groupId: '',
  orgRole: ''
});

const isSuperadmin = computed(() => user.value?.roles?.includes('superadmin'));
const isSponsor = computed(() => user.value?.roles?.includes('sponsor'));
const isAdmin = computed(() => user.value?.roles?.includes('admin'));
const userBusinesses = computed(() => user.value?.business_id);
const userOrganization = computed(() => user.value?.organization_id);

const allRoles = computed(() => groupUsersByRole(allUsers.value));
const filteredRoles = computed(() => groupUsersByRole(filteredUsers.value));

// INTEGRACIÓN: Roles filtrados por organización seleccionada en Asignaciones
const filteredOrgRoles = computed(() => {
  // Roles fijos (debes usar los IDs numéricos reales de tu base de datos)
  const fixedRoles = [
    { id: 1, customLabel: 'Super Administrador' },
    { id: 2, customLabel: 'Administrador' },
    { id: 3, customLabel: 'Sponsor' }
  ];
  if (isSuperadmin.value && selectedOrgForRoles.value) {
    // Filtra roles por organización seleccionada
    const orgRoles = orgRoleOptions.value
      .filter((r) => r.organization_id === selectedOrgForRoles.value)
      .map((r) => ({
        id: r.id,
        customLabel: r.name
      }));
    return [...fixedRoles, ...orgRoles];
  }
  // Si no es superadmin, regresa todos los roles
  return allRoles.value;
});

// INTEGRACIÓN: Roles para asignaciones según tipo de usuario
const getAssignmentRoles = computed(() => {
  if (isSuperadmin.value) {
    // Lógica superadmin: ya está en filteredOrgRoles
    return filteredOrgRoles.value;
  }

  // Admin y Sponsor: filtrar roles por organización del usuario
  const orgId = user.value?.organization_id;
  let orgRoles = allRoles.value.filter(
    (role) => role.organization_id === orgId && role.id !== 1 // nunca mostrar superadmin
  );

  if (isAdmin.value) {
    // Admin: roles de su organización + admin + sponsor
    orgRoles = [
      { id: 2, customLabel: 'Administrador' },
      { id: 3, customLabel: 'Sponsor' },
      ...orgRoles.filter((role) => role.id !== 2 && role.id !== 3)
    ];
  } else if (isSponsor.value) {
    // Sponsor: roles de su organización + sponsor
    orgRoles = [{ id: 3, customLabel: 'Sponsor' }, ...orgRoles.filter((role) => role.id !== 3)];
  }

  return orgRoles;
});

const scopeOptions = computed(() => {
  if (isSuperadmin.value) {
    return [
      { label: 'Organización', value: 'organization' },
      { label: 'Empresa', value: 'business' },
      { label: 'Ubicación', value: 'business_unit' },
      { label: 'Grupo', value: 'business_unit_group' }
    ];
  }
  if (isSponsor.value) {
    return [
      { label: 'Empresa', value: 'business' },
      { label: 'Ubicación', value: 'business_unit' },
      { label: 'Grupo', value: 'business_unit_group' }
    ];
  }
  return [
    { label: 'Organización', value: 'organization' },
    { label: 'Empresa', value: 'business' },
    { label: 'Ubicación', value: 'business_unit' },
    { label: 'Grupo', value: 'business_unit_group' }
  ];
});

// INTEGRACIÓN: Función para obtener el logo según el alcance y selección actual
const getScopeLogo = () => {
  // ORGANIZACIÓN
  if (scope.value === 'organization') {
    if (isSuperadmin.value && selectedOrganization.value) {
      const org = organizationOptions.value.find((o) => o.value === selectedOrganization.value);
      return org?.logo || null;
    }
    // Admin/sponsor: su organización
    const org = organizationOptions.value.find((o) => o.value === userOrganization.value);
    return org?.logo || null;
  }
  // EMPRESA
  if (scope.value === 'business' && businessId.value) {
    const business = businesses.value.find((b) => b.id === businessId.value);
    return business?.logo || null;
  }
  // UBICACIÓN
  if (scope.value === 'business_unit' && businessUnitId.value) {
    const unit = businessUnits.value.find((u) => u.id === businessUnitId.value);
    return unit?.logo || null;
  }
  // GRUPO
  if (scope.value === 'business_unit_group' && groupId.value) {
    const group = groups.value.find((g) => g.id === groupId.value);
    // Si el grupo tiene logo propio, úsalo; si no, usa el de la empresa del grupo
    if (group?.logo) return group.logo;
    const business = businesses.value.find((b) => b.id === group?.business_id);
    return business?.logo || null;
  }
  return null;
};

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
      if (scope.value === 'business_unit_group' && reuseLogo.value) {
        break;
      }
      if (!reuseLogo.value && (!value || (Array.isArray(value) && value.length === 0))) {
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
    case 'orgRole':
      if (isSuperadmin.value && !value) {
        fieldErrors.orgRole = 'Selecciona una organización para filtrar roles';
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
  if (isSuperadmin.value && !validateField('orgRole', selectedOrgForRoles.value)) isValid = false;
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
      params.organization_id = isSuperadmin.value && selectedOrganization.value ? selectedOrganization.value : user.value?.organization_id;
    } else if (scope.value === 'business' && businessId.value) {
      params.business_id = businessId.value;
      const selectedBusiness = businesses.value.find((b) => b.id === businessId.value);
      if (selectedBusiness?.organization_id) params.organization_id = selectedBusiness.organization_id;
    } else if (scope.value === 'business_unit' && businessUnitId.value) {
      params.business_unit_id = businessUnitId.value;
      const selectedBusinessUnit = businessUnits.value.find((u) => u.id === businessUnitId.value);
      if (selectedBusinessUnit?.organization_id) params.organization_id = selectedBusinessUnit.organization_id;
    } else if (scope.value === 'business_unit_group' && groupId.value) {
      params.business_unit_group_id = groupId.value;
      const selectedGroup = groups.value.find((g) => g.id === groupId.value);
      if (selectedGroup?.organization_id) params.organization_id = selectedGroup.organization_id;
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
    let businessIdFilter = businessId.value;
    if (isSponsor.value) businessIdFilter = userBusinesses.value;
    if (scope.value === 'business_unit' && businessIdFilter) {
      const res = await axiosInstance.get('/business-units', { params });
      if (isSponsor.value) {
        const unidadesSponsor = res.data.data.filter((unit) => unit.business_id === userBusinesses.value);
        if (unidadesSponsor.length === 0) {
          businessUnits.value = res.data.data.map((businessUnit) => ({
            ...businessUnit,
            customLabel: `${businessUnit.folio} - ${businessUnit.name}`
          }));
          return;
        }
        businessUnits.value = unidadesSponsor.map((businessUnit) => ({
          ...businessUnit,
          customLabel: `${businessUnit.folio} - ${businessUnit.name}`
        }));
        return;
      }
      businessUnits.value = res.data.data
        .filter((unit) => {
          if (isSuperadmin.value) return true;
          return unit.organization_id === user.value?.organization_id;
        })
        .map((businessUnit) => ({
          ...businessUnit,
          customLabel: `${businessUnit.folio} - ${businessUnit.name}`
        }));
    }
  } catch (err) {
    businessUnits.value = [];
  }
};

const fetchBusinesses = async () => {
  try {
    const resBusiness = await axiosInstance.get('/businesses');
    businesses.value = resBusiness.data.data
      .filter((business) => {
        if (isSuperadmin.value) return true;
        return business.organization_id === user.value?.organization_id;
      })
      .map((business) => ({
        ...business,
        customLabel: `${business.folio} - ${business.name}`
      }));
  } catch (err) {
    businesses.value = [];
  }
};

const fetchGroups = async () => {
  try {
    const resGroup = await axiosInstance.get('/business-unit-groups');
    groups.value = resGroup.data.data
      .filter((group) => {
        if (isSuperadmin.value) return true;
        if (isSponsor.value) return group.business_id === userBusinesses.value;
        return group.organization_id === user.value?.organization_id;
      })
      .map((group) => ({
        ...group,
        customLabel: `${group.name}`,
        business_id: group.business_id
      }));
  } catch (err) {
    groups.value = [];
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
      value: o.id,
      logo: o.logo || null
    }));
  } catch (e) {
    organizationOptions.value = [];
  } finally {
    loadingOrganizations.value = false;
  }
};

// INTEGRACIÓN: Fetch roles por organización seleccionada para Asignaciones
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

watch(selectedOrgForRoles, async (orgId) => {
  if (isSuperadmin.value && orgId) {
    await fetchOrgRoles(orgId);
    supervisor.value = '';
    auditors.value = [];
    audited.value = [];
  }
});

onMounted(async () => {
  await fetchAllUsers();
  await fetchBusinesses();
  await fetchGroups();
  if (isSuperadmin.value) {
    await fetchOrganizations();
  }
});

// INTEGRACIÓN: Limpia solo los campos dependientes del alcance anterior
watch(scope, async (newScope, oldScope) => {
  if (oldScope === 'organization') {
    selectedOrganization.value = null;
  }
  if (oldScope === 'business') {
    businessId.value = '';
  }
  if (oldScope === 'business_unit') {
    businessId.value = '';
    businessUnitId.value = '';
  }
  if (oldScope === 'business_unit_group') {
    groupId.value = '';
  }
  logo.value = null;
  profilePreview.value = null;
  reuseLogo.value = false;

  if (newScope === 'organization' && isSuperadmin.value && organizationOptions.value.length === 0) {
    fetchOrganizations();
  }
  if (newScope === 'business_unit' && isSponsor.value) {
    businessId.value = userBusinesses.value;
    await fetchBusinessUnits();
  }
});

watch([scope, businessId, businessUnitId, groupId, selectedOrganization, reuseLogo], async () => {
  if (scope.value) {
    if (scope.value !== 'business_unit_group') audited.value = [];
    auditors.value = [];
    if (scope.value === 'business' && userBusinesses.value && isSponsor.value) {
      businessId.value = userBusinesses.value;
    }
    if (scope.value === 'business_unit' && userBusinesses.value && isSponsor.value) {
      businessId.value = userBusinesses.value;
      await fetchBusinessUnits();
    }
    await fetchUsersByScope();
  }
  if (reuseLogo.value && scope.value === 'business_unit_group' && groupId.value) {
    const logoUrl = getScopeLogo();
    if (!logoUrl) {
      console.log('[LOGO DEBUG] No se pudo obtener el logo para el grupo seleccionado.');
    }
    profilePreview.value = logoUrl || null;
    logo.value = null;
    return;
  }
  if (isSuperadmin.value && reuseLogo.value) {
    const logoUrl = getScopeLogo();
    if (!logoUrl) {
      console.log('[LOGO DEBUG] No se pudo obtener el logo para el alcance seleccionado.');
    }
    profilePreview.value = logoUrl || null;
    logo.value = null;
    return;
  }
  if (!reuseLogo.value) {
    profilePreview.value = null;
  }
});

watch(
  () => reuseLogo.value,
  (val) => {
    if (val && scope.value === 'business_unit_group' && groupId.value) {
      const logoUrl = getScopeLogo();
      if (!logoUrl) {
        console.log('[LOGO DEBUG] No se pudo obtener el logo para el grupo seleccionado (watcher específico).');
      }
      profilePreview.value = logoUrl || null;
      logo.value = null;
    } else if (!val && !logo.value) {
      profilePreview.value = null;
    }
  }
);

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
      reuseLogo.value = false;
    } else if (typeof file === 'string' && file) {
      profilePreview.value = file;
      logo.value = null;
    } else {
      profilePreview.value = null;
    }
  }
);

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

    // INTEGRACIÓN: Si es superadmin y seleccionó organización para roles, enviar ese dato si lo necesitas en el backend

    const supervisorRole =
      filteredOrgRoles.value.find((role) => role.id === supervisor.value) || allRoles.value.find((role) => role.id === supervisor.value);
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

    if (reuseLogo.value && scope.value === 'business_unit_group') {
      // No enviar logo, backend debe tomar el de la empresa del grupo
    } else if (reuseLogo.value && isSuperadmin.value) {
      // No enviar logo, backend debe tomar el del alcance
    } else if (logo.value && !reuseLogo.value) {
      formData.append('logo', logo.value);
    }

    let orgId = null;
    if (scope.value === 'organization') {
      orgId = isSuperadmin.value && selectedOrganization.value ? selectedOrganization.value : user.value?.organization_id;
    } else if (scope.value === 'business' && businessId.value) {
      const selectedBusiness = businesses.value.find((b) => b.id === businessId.value);
      orgId = selectedBusiness?.organization_id;
    } else if (scope.value === 'business_unit' && businessId.value) {
      const selectedBusiness = businesses.value.find((b) => b.id === businessId.value);
      orgId = selectedBusiness?.organization_id;
    } else if (scope.value === 'business_unit_group' && businessId.value) {
      const selectedBusiness = businesses.value.find((b) => b.id === businessId.value);
      orgId = selectedBusiness?.organization_id;
    }
    if (orgId) formData.append('organization_id', orgId);

    if (scope.value === 'business') {
      formData.append('business_id', businessId.value);
      formData.append('business_unit_id', '');
      formData.append('business_unit_group_id', '');
    }
    if (scope.value === 'business_unit') {
      formData.append('business_unit_id', businessUnitId.value);
      formData.append('business_id', '');
      formData.append('business_unit_group_id', '');
    }
    if (scope.value === 'business_unit_group') {
      formData.append('business_unit_group_id', groupId.value);
      formData.append('business_id', '');
      formData.append('business_unit_id', '');
    }
    if (scope.value === 'organization') {
      formData.append('business_id', '');
      formData.append('business_unit_id', '');
      formData.append('business_unit_group_id', '');
    }

    const res = await axiosInstance.post('/forms', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    toast.success('Formulario creado correctamente');
    const newForm = res.data.form;
    if (newForm && newForm.id) {
      router.push({
        name: 'Forms Show',
        params: { id: newForm.id }
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

          <!-- Columna izquierda: preview logo -->
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

          <!-- Columna derecha: nombre, descripción, alcance, selects dinámicos, logo, frecuencia -->
          <v-col cols="12" md="6">
            <v-label>Nombre<span class="text-error">*</span></v-label>
            <v-text-field
              v-model="name"
              variant="outlined"
              color="primary"
              class="mt-2 mb-4 alcance-select"
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
              class="mt-2 mb-4 alcance-select"
              :error="!!fieldErrors.description"
              :error-messages="fieldErrors.description"
              @update:model-value="clearFieldError('description')"
            />

            <v-label>Alcance <span class="text-error">*</span></v-label>
            <div class="alcance-btn-group mt-2 mb-4">
              <v-btn
                v-for="option in scopeOptions"
                :key="option.value"
                :color="scope === option.value ? 'primary' : 'grey-lighten-2'"
                :variant="scope === option.value ? 'flat' : 'outlined'"
                style="border-radius: 8px; min-width: 120px; font-weight: 500"
                @click="scope = option.value"
                class="alcance-btn"
              >
                <span>{{ option.label }}</span>
              </v-btn>
            </div>
            <v-text-field
              v-if="fieldErrors.scope"
              :model-value="''"
              variant="outlined"
              color="error"
              class="mt-2 alcance-select"
              :error-messages="fieldErrors.scope"
              readonly
              hide-details
            />

            <!-- ORGANIZACION: solo para superadmin, con select -->
            <div v-if="scope === 'organization' && isSuperadmin" class="mt-4 alcance-select alcance-superadmin-select">
              <v-label>Organización <span class="text-error">*</span></v-label>
              <v-select
                v-model="selectedOrganization"
                :items="organizationOptions"
                :loading="loadingOrganizations"
                item-title="title"
                item-value="value"
                clearable
                hide-details
                variant="outlined"
                color="primary"
                class="mt-2 alcance-select"
                required
              />
            </div>

            <!-- EMPRESA: admin ve solo empresas de su organización, sponsor no ve el select -->
            <div v-if="scope === 'business'" class="mt-4 alcance-select">
              <v-label>Empresa <span class="text-error">*</span></v-label>
              <v-select
                v-if="isSuperadmin"
                v-model="businessId"
                :items="businesses"
                item-title="customLabel"
                item-value="id"
                variant="outlined"
                color="primary"
                class="mt-2 alcance-select"
                clearable
                required
                :error-messages="fieldErrors.businessId"
                @update:model-value="clearFieldError('businessId')"
              />
              <v-select
                v-else-if="!isSponsor"
                v-model="businessId"
                :items="businesses"
                item-title="customLabel"
                item-value="id"
                variant="outlined"
                color="primary"
                class="mt-2 alcance-select"
                clearable
                required
                :error-messages="fieldErrors.businessId"
                @update:model-value="clearFieldError('businessId')"
              />
            </div>

            <!-- UBICACION: solo ubicaciones de la empresa seleccionada o del sponsor -->
            <div v-if="scope === 'business_unit'" class="mt-4 alcance-select">
              <v-label v-if="!isSponsor">Empresa <span class="text-error">*</span></v-label>
              <v-text-field
                v-if="isSponsor"
                :model-value="userBusinesses"
                variant="outlined"
                color="primary"
                class="mt-2 alcance-select"
                readonly
                hide-details
                style="display: none"
              />
              <v-select
                v-if="!isSponsor"
                v-model="businessId"
                :items="businesses"
                item-title="customLabel"
                item-value="id"
                variant="outlined"
                color="primary"
                class="mt-2 alcance-select"
                clearable
                required
                :error-messages="fieldErrors.businessId"
                @update:model-value="clearFieldError('businessId')"
              />
              <v-label class="mt-4">Ubicación <span class="text-error">*</span></v-label>
              <v-select
                v-model="businessUnitId"
                :items="businessUnits"
                item-title="customLabel"
                item-value="id"
                variant="outlined"
                color="primary"
                class="mt-2 alcance-select"
                clearable
                required
                :error-messages="fieldErrors.businessUnitId"
                @update:model-value="clearFieldError('businessUnitId')"
              />
            </div>

            <!-- GRUPO: solo grupos de la organización (admin) o empresa (sponsor) -->
            <div v-if="scope === 'business_unit_group'" class="mt-4 alcance-select">
              <v-label>Grupo <span class="text-error">*</span></v-label>
              <v-select
                v-model="groupId"
                :items="groups"
                item-title="customLabel"
                item-value="id"
                variant="outlined"
                color="primary"
                class="mt-2 alcance-select"
                clearable
                required
                :error-messages="fieldErrors.groupId"
                @update:model-value="clearFieldError('groupId')"
              />
            </div>

            <!-- Logo y booleano de reutilizar logo -->
            <div v-if="scope" class="mt-4">
              <v-file-input
                v-if="!(reuseLogo && scope === 'business_unit_group') && !(reuseLogo && isSuperadmin)"
                v-model="logo"
                variant="outlined"
                color="primary"
                class="mt-2 logo-field alcance-select"
                accept="image/*"
                density="compact"
                show-size
                :multiple="false"
                :messages="['Solo se permiten imágenes JPEG, PNG o JPG. Tamaño máximo: 2MB.']"
                :error-messages="fieldErrors.logo"
                @update:model-value="clearFieldError('logo')"
              />
              <div class="d-flex align-center mb-2 logo-checkbox">
                <v-checkbox
                  v-model="reuseLogo"
                  :label="
                    scope === 'business_unit_group'
                      ? 'Reutilizar logo de la empresa del grupo seleccionado'
                      : 'Reutilizar logo del alcance seleccionado'
                  "
                  color="primary"
                  hide-details
                  class="mr-2"
                  style="border-radius: 8px"
                  :ripple="false"
                  :true-value="true"
                  :false-value="false"
                  :disabled="!!logo && !reuseLogo"
                />
              </div>
            </div>

            <!-- FRECUENCIA: abajo del logo y checkbox -->
            <v-label class="mt-4">Frecuencia <span class="text-error">*</span></v-label>
            <v-select
              v-model="frequency"
              :items="FREQUENCY"
              item-title="label"
              item-value="value"
              variant="outlined"
              color="primary"
              class="mt-2 mb-4 alcance-select"
              required
              :error-messages="fieldErrors.frequency"
              @update:model-value="clearFieldError('frequency')"
            />

            <!-- Booleano para ponderación -->
            <div class="mt-2 mb-4">
              <v-checkbox
                v-model="hasRating"
                label="¿El formulario tendrá ponderación de preguntas?"
                color="primary"
                hide-details
                density="comfortable"
              />
            </div>
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12">
            <h4 class="font-weight-bold mb-3">Asignaciones</h4>
            <v-divider class="mb-6" />
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12">
            <!-- Select de organización para filtrar roles (solo superadmin) -->
            <template v-if="isSuperadmin">
              <div class="d-flex align-center justify-between mb-2">
                <v-label>Organización para filtrar roles <span class="text-error">*</span></v-label>
                <v-icon :icon="mdiInformationSlabCircleOutline" color="primary" size="22" class="ml-2" style="cursor: pointer" />
              </div>
              <div class="pb-superadmin-select">
                <v-select
                  v-model="selectedOrgForRoles"
                  :items="organizationOptions"
                  :loading="loadingOrganizations"
                  item-title="title"
                  item-value="value"
                  clearable
                  hide-details
                  variant="outlined"
                  color="primary"
                  class="mt-2 mb-4 asignaciones-full-length"
                  required
                  :error="!!fieldErrors.orgRole"
                  :error-messages="fieldErrors.orgRole"
                />
              </div>
            </template>

            <v-label>Supervisor <span class="text-error">*</span></v-label>
            <v-select
              v-model="supervisor"
              :items="getAssignmentRoles"
              item-title="customLabel"
              item-value="id"
              variant="outlined"
              color="primary"
              class="mt-2 mb-4 asignaciones-full-length"
              :error-messages="fieldErrors.supervisor"
              @update:model-value="clearFieldError('supervisor')"
            />

            <v-label>Auditores <span class="text-error">*</span></v-label>
            <v-select
              v-model="auditors"
              :items="getAssignmentRoles"
              multiple
              item-title="customLabel"
              item-value="id"
              variant="outlined"
              color="primary"
              class="mt-2 mb-4 asignaciones-full-length"
              :error-messages="fieldErrors.auditors"
              @update:model-value="clearFieldError('auditors')"
              chips
              closable-chips
            />

            <v-label>Auditados <span class="text-error">*</span></v-label>
            <v-select
              v-model="audited"
              multiple
              :items="getAssignmentRoles"
              item-title="customLabel"
              item-value="id"
              variant="outlined"
              color="primary"
              class="mt-2 mb-4 asignaciones-full-length"
              :hint="
                scope === 'business_unit_group' ? 'Selección automática para grupos' : `${getAssignmentRoles.length} roles disponibles`
              "
              persistent-hint
              :disabled="scope === 'business_unit_group'"
              :readonly="scope === 'business_unit_group'"
              :error-messages="fieldErrors.audited"
              @update:model-value="clearFieldError('audited')"
              chips
              closable-chips
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

<style scoped>
.alcance-btn-group {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.alcance-btn {
  margin: 0;
}
.logo-field {
  margin-bottom: 16px;
}
.logo-checkbox {
  padding-top: 8px;
}
.alcance-select {
  margin-bottom: 0;
  border-radius: 8px;
}
.alcance-superadmin-select {
  padding-bottom: 0;
}
.alcance-logo-separator {
  display: none;
}

.asignaciones-full-length {
  width: 100%;
  min-width: 100%;
  max-width: 100%;
  display: block;
}

.pb-superadmin-select {
  padding-bottom: 18px;
}
</style>
