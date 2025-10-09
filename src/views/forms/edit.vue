<script setup>
import { ref, onMounted, watch, computed, reactive, nextTick } from 'vue';
import axiosInstance from '@/utils/axios';
import { FREQUENCY } from '@/constants/constants';
import { useAuthStore } from '@/stores/auth';
import { mdiArrowLeft, mdiInformationSlabCircleOutline } from '@mdi/js';
import { useRouter, useRoute } from 'vue-router';
import { useToast } from 'vue-toastification';
import { groupUsersByRole } from '@/utils/helpers/groupUsers';

const auth = useAuthStore();
const user = computed(() => auth.user);
const toast = useToast();
const router = useRouter();
const route = useRoute();

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

const selectedOrgForRoles = ref(null);
const orgRoleOptions = ref([]);
const loadingOrgRoles = ref(false);

const orgRolesForAdmin = ref([]);
const loadingOrgRolesForAdmin = ref(false);

const selectedBusinessOrganization = ref(null);
const selectedGroupOrganization = ref(null);
const selectedGroupBusiness = ref(null);

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
  orgRole: '',
  businessOrganization: '',
  groupOrganization: '',
  groupBusiness: ''
});

const isSuperadmin = computed(() => user.value?.roles?.includes('superadmin'));
const isSponsor = computed(() => user.value?.roles?.includes('sponsor'));
const isAdmin = computed(() => user.value?.roles?.includes('admin'));
const userBusinesses = computed(() => user.value?.business_id);
const userOrganization = computed(() => user.value?.organization_id);

const allRoles = computed(() => groupUsersByRole(allUsers.value));

const filteredOrgRoles = computed(() => {
  const fixedRoles = [
    { id: 1, customLabel: 'Super Administrador' },
    { id: 2, customLabel: 'Administrador' },
    { id: 3, customLabel: 'Sponsor' }
  ];
  if (isSuperadmin.value && selectedOrgForRoles.value) {
    const orgRoles = orgRoleOptions.value
      .filter((r) => Number(r.organization_id) === Number(selectedOrgForRoles.value))
      .map((r) => ({ id: r.id, customLabel: r.name }));
    return [...fixedRoles, ...orgRoles];
  }
  return allRoles.value;
});

const getAssignmentRoles = computed(() => {
  if (isSuperadmin.value) return filteredOrgRoles.value;
  if (isAdmin.value || isSponsor.value) {
    const fixed = [];
    if (isAdmin.value) fixed.push({ id: 2, customLabel: 'Administrador' });
    fixed.push({ id: 3, customLabel: 'Sponsor' });
    const orgRoles = orgRolesForAdmin.value
      .filter((role) => ![1, 2, 3].includes(role.id))
      .map((role) => ({ id: role.id, customLabel: role.name }));
    return [...fixed, ...orgRoles];
  }
  return [];
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

const groupBusinessOptions = computed(() => {
  if (!selectedGroupOrganization.value) return [];
  return businesses.value.filter((b) => Number(b.organization_id) === Number(selectedGroupOrganization.value));
});
const groupGroupOptions = computed(() => {
  if (!selectedGroupBusiness.value) return [];
  return groups.value.filter((g) => Number(g.business_id) === Number(selectedGroupBusiness.value));
});

const getScopeLogo = () => {
  if (scope.value === 'organization') {
    const orgId = isSuperadmin.value && selectedOrganization.value ? Number(selectedOrganization.value) : Number(userOrganization.value);
    const org = organizationOptions.value.find((o) => Number(o.value) === orgId);
    return org?.logo || null;
  }
  if (scope.value === 'business' && businessId.value) {
    const biz = businesses.value.find((b) => Number(b.id) === Number(businessId.value));
    return biz?.logo || null;
  }
  if (scope.value === 'business_unit' && businessUnitId.value) {
    const unit = businessUnits.value.find((u) => Number(u.id) === Number(businessUnitId.value));
    return unit?.logo || null;
  }
  if (scope.value === 'business_unit_group' && groupId.value) {
    const group = groups.value.find((g) => Number(g.id) === Number(groupId.value));
    if (group?.logo) return group.logo;
    const biz = businesses.value.find((b) => Number(b.id) === Number(group?.business_id));
    return biz?.logo || null;
  }
  return null;
};

const goBack = () => router.push(`/formularios/${route.params.id}`);

const clearFieldError = (fieldName) => {
  if (fieldErrors[fieldName]) fieldErrors[fieldName] = '';
};

// --- LOGO PLACEHOLDER LOGIC ---
const LOGO_PLACEHOLDER = '__original_logo__';

// --- INTEGRACIÓN: Control de disponibilidad de logo de alcance ---
const scopeLogoAvailable = ref(true);
const scopeLogoError = ref('');

// Función para verificar si el alcance tiene logo disponible
const checkScopeLogo = () => {
  let logoUrl = getScopeLogo();
  if (!logoUrl) {
    scopeLogoAvailable.value = false;
    scopeLogoError.value =
      'El alcance seleccionado no cuenta con logo. Ingresa uno manualmente o edita el registro del alcance para agregar un logo.';
  } else {
    scopeLogoAvailable.value = true;
    scopeLogoError.value = '';
  }
};

watch(
  [
    scope,
    selectedOrganization,
    selectedBusinessOrganization,
    businessId,
    businessUnitId,
    selectedGroupOrganization,
    selectedGroupBusiness,
    groupId
  ],
  () => {
    if (reuseLogo.value) checkScopeLogo();
    else {
      scopeLogoAvailable.value = true;
      scopeLogoError.value = '';
    }
  }
);

watch(reuseLogo, (val) => {
  if (!val) {
    fieldErrors.logo = '';
  }
  if (val) checkScopeLogo();
});

// --- VALIDATION ---
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
      if (reuseLogo.value) {
        if (!scopeLogoAvailable.value) {
          fieldErrors.logo = scopeLogoError.value;
          return false;
        }
        break;
      }
      if (
        !reuseLogo.value &&
        (!value ||
          (Array.isArray(value) && value.length === 0) ||
          (typeof value === 'object' && value !== null && value.type === LOGO_PLACEHOLDER && !originalLogo.value))
      ) {
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
    case 'businessOrganization':
      if (isSuperadmin.value && scope.value === 'business' && !selectedBusinessOrganization.value) {
        fieldErrors.businessOrganization = 'Selecciona una organización';
        return false;
      }
      break;
    case 'groupOrganization':
      if (isSuperadmin.value && scope.value === 'business_unit_group' && !selectedGroupOrganization.value) {
        fieldErrors.groupOrganization = 'Selecciona una organización';
        return false;
      }
      break;
    case 'groupBusiness':
      if (
        (isSuperadmin.value || (isAdmin.value && !user.value.business_id && !user.value.business_unit_id)) &&
        scope.value === 'business_unit_group' &&
        !selectedGroupBusiness.value
      ) {
        fieldErrors.groupBusiness = 'Selecciona una empresa';
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
  if (!validateField('businessOrganization', selectedBusinessOrganization.value)) isValid = false;
  if (!validateField('groupOrganization', selectedGroupOrganization.value)) isValid = false;
  if (!validateField('groupBusiness', selectedGroupBusiness.value)) isValid = false;
  return isValid;
};

const fetchAllUsers = async () => {
  try {
    const res = await axiosInstance.get('/users');
    allUsers.value = res.data.data.map((u) => ({ ...u, customLabel: `${u.roles?.[0]?.name || 'Sin rol'}` }));
  } catch {
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
      params.organization_id =
        isSuperadmin.value && selectedOrganization.value ? Number(selectedOrganization.value) : Number(user.value?.organization_id);
    } else if (scope.value === 'business' && businessId.value) {
      params.business_id = Number(businessId.value);
      const selectedBusiness = businesses.value.find((b) => Number(b.id) === Number(businessId.value));
      if (selectedBusiness && typeof selectedBusiness.organization_id !== 'undefined') {
        params.organization_id = Number(selectedBusiness.organization_id);
      }
    } else if (scope.value === 'business_unit' && businessUnitId.value) {
      params.business_unit_id = Number(businessUnitId.value);
      const selectedUnit = businessUnits.value.find((u) => Number(u.id) === Number(businessUnitId.value));
      if (selectedUnit && typeof selectedUnit.organization_id !== 'undefined') {
        params.organization_id = Number(selectedUnit.organization_id);
      }
    } else if (scope.value === 'business_unit_group' && groupId.value) {
      params.business_unit_group_id = Number(groupId.value);
      const selectedGroup = groups.value.find((g) => Number(g.id) === Number(groupId.value));
      if (selectedGroup && typeof selectedGroup.organization_id !== 'undefined') {
        params.organization_id = Number(selectedGroup.organization_id);
      }
    }

    const res = await axiosInstance.get('/users-by-scope', { params });
    filteredUsers.value = res.data.data.map((u) => ({ ...u, customLabel: `${u.roles?.[0]?.name || 'Sin rol'}` }));
  } catch {
    filteredUsers.value = [];
  }
};

const fetchBusinesses = async () => {
  try {
    const res = await axiosInstance.get('/businesses');
    businesses.value = res.data.data.map((b) => ({
      ...b,
      customLabel: `${b.folio} - ${b.name}`,
      organization_id: b.organization?.id ?? b.organization_id,
      id: b.id
    }));
  } catch {
    businesses.value = [];
  }
};

const fetchBusinessUnits = async (searchText = '') => {
  try {
    const params = { q: searchText, limit: 10 };
    let businessIdFilter = businessId.value;
    if (isSponsor.value) businessIdFilter = userBusinesses.value;
    if (scope.value === 'business_unit' && businessIdFilter) {
      const res = await axiosInstance.get('/business-units', { params });
      businessUnits.value = res.data.data
        .filter((u) => Number(u.business_id) === Number(businessIdFilter))
        .map((u) => ({
          ...u,
          customLabel: `${u.folio} - ${u.legal_name ?? u.name}`,
          organization_id: u.organization?.id ?? u.organization_id,
          business_id: u.business_id,
          id: u.id
        }));
    } else {
      businessUnits.value = [];
    }
  } catch (e) {
    businessUnits.value = [];
  }
};

const fetchGroups = async () => {
  try {
    const res = await axiosInstance.get('/business-unit-groups');
    groups.value = res.data.data.map((g) => ({
      ...g,
      customLabel: `${g.name}`,
      business_id: g.business_id,
      organization_id: g.organization?.id ?? g.organization_id,
      id: g.id
    }));
  } catch {
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
  } catch {
    organizationOptions.value = [];
  } finally {
    loadingOrganizations.value = false;
  }
};

const ensureAdminOrgOption = async () => {
  if (isAdmin.value && userOrganization.value && organizationOptions.value.length === 0) {
    const res = await axiosInstance.get(`/organizations/${userOrganization.value}`);
    const org = res.data.data;
    organizationOptions.value = [
      {
        ...org,
        title: `${org.folio} - ${org.legal_name}`,
        value: org.id,
        logo: org.logo || null
      }
    ];
  }
};

const fetchOrgRoles = async (orgId) => {
  loadingOrgRoles.value = true;
  try {
    const { data } = await axiosInstance.get('/roles', { params: { organization_id: Number(orgId) } });
    orgRoleOptions.value = (data.data || []).filter((r) => r.name !== 'superadmin');
  } catch {
    orgRoleOptions.value = [];
  } finally {
    loadingOrgRoles.value = false;
  }
};

const fetchOrgRolesForAdmin = async () => {
  loadingOrgRolesForAdmin.value = true;
  try {
    const { data } = await axiosInstance.get('/roles');
    orgRolesForAdmin.value = (data.data || []).filter((r) => r.organization_id === user.value.organization_id);
  } catch {
    orgRolesForAdmin.value = [];
  } finally {
    loadingOrgRolesForAdmin.value = false;
  }
};

const originalLogo = ref(null);
const initialScope = ref(null);
const initialBusinessId = ref(null);
const initialReuseLogo = ref(false);
const isLimitedEdit = ref(false);
const formLoaded = ref(false);

let skipLogoWatcher = false;
const justLoaded = ref(false);

const clearScopeFields = () => {
  skipLogoWatcher = true;
  businessId.value = '';
  businessUnitId.value = '';
  groupId.value = '';
  selectedOrganization.value = '';
  selectedOrgForRoles.value = '';
  selectedBusinessOrganization.value = '';
  selectedGroupOrganization.value = '';
  selectedGroupBusiness.value = '';
  supervisor.value = '';
  auditors.value = [];
  audited.value = [];
  logo.value = null;
  profilePreview.value = null;
  reuseLogo.value = false;
  fieldErrors.businessId = '';
  fieldErrors.businessUnitId = '';
  fieldErrors.groupId = '';
  fieldErrors.logo = '';
  fieldErrors.scope = '';
  fieldErrors.businessOrganization = '';
  fieldErrors.groupOrganization = '';
  fieldErrors.groupBusiness = '';
  setTimeout(() => {
    skipLogoWatcher = false;
  }, 100);
};

// --- INTEGRACIÓN: Resetear justLoaded en cambios de alcance/organización ---
watch(scope, async (newScope, oldScope) => {
  if (formLoaded.value) {
    clearScopeFields();
    justLoaded.value = true;
  }
  await fetchOrganizations();
  await ensureAdminOrgOption();
  await fetchBusinesses();
  await fetchGroups();
  await fetchBusinessUnits();
  await fetchUsersByScope();
});

watch(selectedOrganization, async (orgId) => {
  if (isSuperadmin.value && orgId) {
    justLoaded.value = true;
    await fetchBusinesses();
    await fetchGroups();
    await fetchBusinessUnits();
    await fetchUsersByScope();
  }
});

watch(selectedBusinessOrganization, async (orgId) => {
  if (isSuperadmin.value && orgId) {
    justLoaded.value = true;
    await fetchBusinesses();
    await fetchBusinessUnits();
  }
});

watch(selectedGroupOrganization, async (orgId) => {
  if (isSuperadmin.value && orgId) {
    justLoaded.value = true;
    await fetchBusinesses();
    await fetchGroups();
  }
});

watch(selectedOrgForRoles, async (orgId) => {
  if (isSuperadmin.value && orgId) {
    await fetchOrgRoles(orgId);
    supervisor.value = '';
    auditors.value = [];
    audited.value = [];
  }
});

watch(
  [
    logo,
    reuseLogo,
    scope,
    businessId,
    businessUnitId,
    groupId,
    selectedOrganization,
    selectedBusinessOrganization,
    selectedGroupOrganization,
    selectedGroupBusiness
  ],
  () => {
    if (skipLogoWatcher) return;

    // Permite al usuario cambiar el logo inmediatamente después de cargar el registro o tras cambio de alcance/org
    if (justLoaded.value) {
      justLoaded.value = false;
      return;
    }

    if (reuseLogo.value) {
      profilePreview.value = getScopeLogo();
      logo.value = null;
      return;
    }

    if (logo.value) {
      if (Array.isArray(logo.value)) {
        const file = logo.value[0];
        if (file) profilePreview.value = URL.createObjectURL(file);
      } else if (logo.value instanceof File) {
        profilePreview.value = URL.createObjectURL(logo.value);
      } else if (logo.value.type === LOGO_PLACEHOLDER) {
        profilePreview.value = logo.value.url;
      }
      return;
    }

    if (
      formLoaded.value &&
      initialScope.value === scope.value &&
      (scope.value !== 'business' ||
        (businessId.value && initialBusinessId.value && String(businessId.value) === String(initialBusinessId.value)))
    ) {
      if (!logo.value && !reuseLogo.value) {
        if (originalLogo.value) {
          profilePreview.value = originalLogo.value;
          if (initialReuseLogo.value) {
            reuseLogo.value = true;
            logo.value = null;
          } else {
            reuseLogo.value = false;
            logo.value = { type: LOGO_PLACEHOLDER, url: originalLogo.value };
          }
        } else {
          profilePreview.value = null;
          logo.value = null;
          reuseLogo.value = false;
        }
      }
    } else {
      profilePreview.value = null;
      if (!logo.value) {
        logo.value = null;
      }
      reuseLogo.value = false;
    }
  },
  { immediate: true }
);

watch(logo, (newLogo) => {
  if (skipLogoWatcher) return;
  if (newLogo) {
    reuseLogo.value = false;
  }
});

watch(businessId, async (newBusinessId, oldBusinessId) => {
  if (scope.value === 'business_unit' && newBusinessId) {
    await fetchBusinessUnits();
    if (oldBusinessId && oldBusinessId !== newBusinessId) {
      businessUnitId.value = '';
    }
  }
});

watch(businessUnitId, async (newVal, oldVal) => {
  if (scope.value === 'business_unit' && newVal) {
    await fetchUsersByScope();
    const selectedUnit = businessUnits.value.find((u) => Number(u.id) === Number(newVal));
    if (selectedUnit && isSuperadmin.value) {
      selectedBusinessOrganization.value = selectedUnit.organization_id;
      selectedOrgForRoles.value = selectedUnit.organization_id;
      await fetchOrgRoles(selectedUnit.organization_id);
    }
  }
});

watch(groupId, async (newGroupId) => {
  if (scope.value === 'business_unit_group' && newGroupId) {
    await fetchUsersByScope();
  }
});

const isLoading = ref(false);

const fetchFormData = async () => {
  const formId = route.params.id;
  if (!formId) return null;
  try {
    await fetchOrganizations();
    await ensureAdminOrgOption();
    await fetchBusinesses();
    await fetchGroups();

    const { data } = await axiosInstance.get(`/forms/${formId}`);
    const form = data.form;

    name.value = form.name || '';
    description.value = form.description || '';
    frequency.value = form.frequency || '';
    scope.value = form.assignment_scope || '';
    initialScope.value = form.assignment_scope || '';
    hasRating.value = !!form.has_rating;
    businessId.value = form.business_id || '';
    initialBusinessId.value = form.business_id || '';
    businessUnitId.value = form.business_unit_id || '';
    groupId.value = form.business_unit_group_id || '';
    originalLogo.value = form.logo || null;
    profilePreview.value = form.logo || null;
    reuseLogo.value = !!form.use_scope_logo;
    initialReuseLogo.value = !!form.use_scope_logo;
    // INTEGRACIÓN: Solo limitar edición si hay respuestas
    isLimitedEdit.value = !!form.has_answers;

    if (form.logo && !form.use_scope_logo) {
      logo.value = { type: LOGO_PLACEHOLDER, url: form.logo };
    } else {
      logo.value = null;
    }

    if (scope.value === 'business_unit') {
      let unit = businessUnits.value.find((u) => Number(u.id) === Number(businessUnitId.value));
      if (!unit && businessUnitId.value) {
        try {
          const { data: unitData } = await axiosInstance.get(`/business-units/${businessUnitId.value}`);
          const unitInfo = unitData.data || unitData;
          unit = {
            ...unitInfo,
            customLabel: `${unitInfo.folio} - ${unitInfo.legal_name ?? unitInfo.name}`,
            organization_id: unitInfo.organization?.id ?? unitInfo.organization_id,
            business_id: unitInfo.business_id,
            id: unitInfo.id
          };
          businessUnits.value.push(unit);
        } catch (e) {}
      }
      let business = businesses.value.find((b) => Number(b.id) === Number(unit?.business_id || businessId.value));
      if (!business && (unit?.business_id || businessId.value)) {
        try {
          const { data: businessData } = await axiosInstance.get(`/businesses/${unit?.business_id || businessId.value}`);
          business = {
            ...businessData,
            customLabel: `${businessData.folio} - ${businessData.name}`,
            organization_id: businessData.organization?.id ?? businessData.organization_id,
            id: businessData.id
          };
          businesses.value.push(business);
        } catch (e) {}
      }
      if (unit) {
        businessUnitId.value = unit.id;
        businessId.value = unit.business_id;
        selectedBusinessOrganization.value = unit.organization_id;
      } else if (business) {
        businessId.value = business.id;
        selectedBusinessOrganization.value = business.organization_id;
      }
      let org = organizationOptions.value.find((o) => Number(o.value) === Number(selectedBusinessOrganization.value));
      if (!org && selectedBusinessOrganization.value) {
        try {
          const { data: orgData } = await axiosInstance.get(`/organizations/${selectedBusinessOrganization.value}`);
          org = {
            ...orgData,
            title: `${orgData.folio} - ${orgData.legal_name}`,
            value: orgData.id,
            logo: orgData.logo || null
          };
          organizationOptions.value.push(org);
        } catch (e) {}
      }
      await fetchBusinessUnits();
      await fetchUsersByScope();
      if (isSuperadmin.value && selectedBusinessOrganization.value) {
        await fetchOrgRoles(selectedBusinessOrganization.value);
      }
    } else {
      if (scope.value === 'business') {
        const business = businesses.value.find((b) => Number(b.id) === Number(businessId.value));
        if (business) {
          selectedBusinessOrganization.value = business.organization_id;
        }
      }
      if (scope.value === 'business_unit_group') {
        const group = groups.value.find((g) => Number(g.id) === Number(groupId.value));
        if (group) {
          selectedGroupOrganization.value = group.organization_id;
          selectedGroupBusiness.value = group.business_id;
        }
      }
      if (isSuperadmin.value && (form.organization_id || selectedBusinessOrganization.value)) {
        selectedOrganization.value = form.organization_id || selectedBusinessOrganization.value;
        selectedOrgForRoles.value = form.organization_id || selectedBusinessOrganization.value;
        await fetchOrgRoles(selectedOrgForRoles.value);
      }
      await fetchUsersByScope();
    }

    await nextTick();

    supervisor.value = form.supervisorRole?.id || form.supervisor_role_id || '';
    auditors.value = Array.isArray(form.auditorRoles)
      ? form.auditorRoles.map((r) => r.id)
      : Array.isArray(form.auditor_role_ids)
        ? form.auditor_role_ids
        : [];
    audited.value = Array.isArray(form.auditadoRoles)
      ? form.auditadoRoles.map((r) => r.id)
      : Array.isArray(form.auditado_role_ids)
        ? form.auditado_role_ids
        : [];

    formLoaded.value = true;
    justLoaded.value = true;

    return form;
  } catch (err) {
    toast.error('No se pudo cargar el formulario');
    return null;
  }
};

onMounted(async () => {
  await fetchAllUsers();
  await fetchOrganizations();
  await ensureAdminOrgOption();
  await fetchBusinesses();
  await fetchGroups();
  if (isAdmin.value || isSponsor.value) await fetchOrgRolesForAdmin();
  await fetchFormData();
});

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

    const supervisorRole =
      filteredOrgRoles.value.find((r) => Number(r.id) === Number(supervisor.value)) ||
      orgRolesForAdmin.value.find((r) => Number(r.id) === Number(supervisor.value)) ||
      allRoles.value.find((r) => Number(r.id) === Number(supervisor.value));
    if (supervisorRole) formData.append('supervisor_role_id', supervisorRole.id);

    auditors.value.forEach((id) => {
      formData.append('auditor_role_ids[]', id);
    });
    audited.value.forEach((id) => {
      formData.append('auditado_role_ids[]', id);
    });

    formData.append('frequency', frequency.value);
    formData.append('assignment_scope', scope.value);
    formData.append('has_rating', hasRating.value ? '1' : '0');
    formData.append('use_scope_logo', reuseLogo.value ? '1' : '0');
    if (!reuseLogo.value && logo.value && !(logo.value.type === LOGO_PLACEHOLDER)) {
      formData.append('logo', logo.value);
    }

    let orgId = null;
    if (scope.value === 'organization') {
      orgId = isSuperadmin.value && selectedOrganization.value ? Number(selectedOrganization.value) : Number(user.value?.organization_id);
    } else if (scope.value === 'business' && businessId.value) {
      const b = businesses.value.find((bb) => Number(bb.id) === Number(businessId.value));
      orgId = b && typeof b.organization_id !== 'undefined' ? Number(b.organization_id) : null;
    } else if (scope.value === 'business_unit' && businessUnitId.value) {
      const unit = businessUnits.value.find((u) => Number(u.id) === Number(businessUnitId.value));
      orgId = unit && typeof unit.organization_id !== 'undefined' ? Number(unit.organization_id) : null;
    } else if (scope.value === 'business_unit_group' && groupId.value) {
      const group = groups.value.find((g) => Number(g.id) === Number(groupId.value));
      orgId = group && typeof group.organization_id !== 'undefined' ? Number(group.organization_id) : null;
    }
    if (orgId) formData.append('organization_id', orgId);

    if (scope.value === 'business') {
      formData.append('business_id', Number(businessId.value));
      formData.append('business_unit_id', '');
      formData.append('business_unit_group_id', '');
    }
    if (scope.value === 'business_unit') {
      formData.append('business_unit_id', Number(businessUnitId.value));
      formData.append('business_id', '');
      formData.append('business_unit_group_id', '');
    }
    if (scope.value === 'business_unit_group') {
      formData.append('business_unit_group_id', Number(groupId.value));
      formData.append('business_id', '');
      formData.append('business_unit_id', '');
    }
    if (scope.value === 'organization') {
      formData.append('business_id', '');
      formData.append('business_unit_id', '');
      formData.append('business_unit_group_id', '');
    }

    const formId = route.params.id;
    formData.append('_method', 'PUT');
    await axiosInstance.post(`/forms/${formId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });

    toast.success('Formulario actualizado correctamente');
    router.push(`/formularios/${route.params.id}`);
  } catch (err) {
    toast.error('Error al actualizar el formulario');
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
          <h3 class="font-weight-medium ml-3 mb-0">Editar Formulario</h3>
        </v-col>
      </v-row>

      <v-form ref="Regform" lazy-validation class="mb-10">
        <v-row>
          <v-col cols="12">
            <h4 class="font-weight-bold mb-3">Información General</h4>
            <v-divider class="mb-6" />
          </v-col>

          <!-- Izquierda: preview -->
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

          <!-- Derecha: campos -->
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
              :disabled="isLimitedEdit"
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
              :disabled="isLimitedEdit"
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
                :disabled="isLimitedEdit"
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

            <!-- ORGANIZACION (solo superadmin) -->
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
                :disabled="isLimitedEdit"
              />
            </div>

            <!-- EMPRESA -->
            <div v-if="scope === 'business' && !isSponsor" class="mt-4 alcance-select">
              <div v-if="isSuperadmin" class="mb-2 pb-superadmin-select">
                <v-label>Organización<span class="text-error">*</span></v-label>
                <v-select
                  v-model="selectedBusinessOrganization"
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
                  :error-messages="fieldErrors.businessOrganization"
                  :disabled="isLimitedEdit"
                />
              </div>
              <v-label>Empresa <span class="text-error">*</span></v-label>
              <v-select
                v-model="businessId"
                :items="
                  isSuperadmin && selectedBusinessOrganization
                    ? businesses.filter((b) => Number(b.organization_id) === Number(selectedBusinessOrganization))
                    : businesses
                "
                item-title="customLabel"
                item-value="id"
                variant="outlined"
                color="primary"
                class="mt-2 alcance-select"
                clearable
                required
                :error-messages="fieldErrors.businessId"
                :disabled="isLimitedEdit"
                :no-data-text="
                  isSuperadmin && !selectedBusinessOrganization ? 'Selecciona una organización primero' : 'Sin empresas disponibles'
                "
              />
            </div>

            <!-- UBICACION -->
            <div v-if="scope === 'business_unit'" class="mt-4 alcance-select">
              <div v-if="isSuperadmin" class="mb-2 pb-superadmin-select">
                <v-label>Organización <span class="text-error">*</span></v-label>
                <v-select
                  v-model="selectedBusinessOrganization"
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
                  :error-messages="fieldErrors.businessOrganization"
                  :disabled="isLimitedEdit"
                  :searchable="true"
                  @update:model-value="
                    () => {
                      businessId = '';
                      businessUnitId = '';
                      fetchBusinesses();
                      businesses.value = [];
                      businessUnits.value = [];
                    }
                  "
                />
              </div>
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
                :items="isSuperadmin && !selectedBusinessOrganization ? [] : businesses"
                item-title="customLabel"
                item-value="id"
                variant="outlined"
                color="primary"
                class="mt-2 alcance-select"
                clearable
                required
                :error-messages="fieldErrors.businessId"
                :disabled="isLimitedEdit"
                :no-data-text="
                  isSuperadmin && !selectedBusinessOrganization ? 'Selecciona una organización primero' : 'Sin empresas disponibles'
                "
                @update:model-value="
                  () => {
                    businessUnitId = '';
                    fetchBusinessUnits();
                  }
                "
              />
              <v-label class="mt-4">Ubicación <span class="text-error">*</span></v-label>
              <v-select
                v-model="businessUnitId"
                :items="businessId ? businessUnits : []"
                item-title="customLabel"
                item-value="id"
                variant="outlined"
                color="primary"
                class="mt-2 alcance-select"
                clearable
                required
                :error-messages="fieldErrors.businessUnitId"
                :disabled="isLimitedEdit"
                :no-data-text="
                  !businessId
                    ? 'Selecciona una empresa primero'
                    : businessUnits.length === 0
                      ? 'No hay ubicaciones disponibles'
                      : 'Sin ubicaciones disponibles'
                "
              />
            </div>

            <!-- GRUPO -->
            <div v-if="scope === 'business_unit_group'" class="mt-4 alcance-select">
              <!-- ORGANIZACION (solo superadmin) -->
              <div v-if="isSuperadmin" class="mb-2 pb-superadmin-select">
                <v-label>Organización <span class="text-error">*</span></v-label>
                <v-select
                  v-model="selectedGroupOrganization"
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
                  :error-messages="fieldErrors.groupOrganization"
                  :disabled="isLimitedEdit"
                />
              </div>
              <!-- EMPRESA (admin o usuario solo organización) -->
              <div v-if="isSuperadmin || (isAdmin && !user.value.business_id && !user.value.business_unit_id)" class="mb-2">
                <v-label>Empresa <span class="text-error">*</span></v-label>
                <v-select
                  v-model="selectedGroupBusiness"
                  :items="isSuperadmin && !selectedGroupOrganization ? [] : groupBusinessOptions"
                  item-title="customLabel"
                  item-value="id"
                  variant="outlined"
                  color="primary"
                  class="mt-2 alcance-select"
                  clearable
                  required
                  :error-messages="fieldErrors.groupBusiness"
                  :disabled="isLimitedEdit"
                  :no-data-text="
                    isSuperadmin && !selectedGroupOrganization ? 'Selecciona una organización primero' : 'Sin empresas disponibles'
                  "
                />
              </div>
              <!-- GRUPO -->
              <v-label>Grupo <span class="text-error">*</span></v-label>
              <v-select
                v-model="groupId"
                :items="selectedGroupBusiness ? groupGroupOptions : []"
                item-title="customLabel"
                item-value="id"
                variant="outlined"
                color="primary"
                class="mt-2 alcance-select"
                clearable
                required
                :error-messages="fieldErrors.groupId"
                :disabled="isLimitedEdit"
                :no-data-text="selectedGroupBusiness ? 'Sin grupos disponibles' : 'Selecciona una empresa primero'"
              />
            </div>

            <!-- Logo -->
            <div v-if="scope" class="mt-4">
              <!-- Solo muestra el input de archivo si reuseLogo está desactivado -->
              <v-file-input
                v-if="!reuseLogo"
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
                :disabled="isLimitedEdit"
                @update:model-value="clearFieldError('logo')"
              />
              <!-- Checkbox reutilizar logo del alcance -->
              <div class="d-flex align-center mb-2 logo-checkbox">
                <v-checkbox
                  v-if="!logo"
                  v-model="reuseLogo"
                  :label="
                    scope === 'business_unit_group'
                      ? 'Reutilizar logo de la empresa del grupo seleccionado'
                      : scope === 'business_unit'
                        ? 'Reutilizar logo de la empresa de la ubicación seleccionada'
                        : 'Reutilizar logo del alcance seleccionado'
                  "
                  color="primary"
                  hide-details
                  class="mr-2"
                  style="border-radius: 8px"
                  :ripple="false"
                  :true-value="true"
                  :false-value="false"
                  :disabled="(reuseLogo && !scopeLogoAvailable) || isLimitedEdit"
                />
              </div>
              <!-- Mensaje de error en rojo debajo del checkbox, alineado a la derecha -->
              <div
                v-if="!scopeLogoAvailable"
                class="text-error"
                style="margin-top: -8px; margin-bottom: 8px; font-size: 0.95rem; margin-left: 36px"
              >
                {{ scopeLogoError }}
              </div>
            </div>

            <!-- FRECUENCIA y booleano para ponderación separados -->
            <div class="mb-2 mt-4">
              <v-label>Frecuencia <span class="text-error">*</span></v-label>
              <v-select
                v-model="frequency"
                :items="FREQUENCY"
                item-title="label"
                item-value="value"
                variant="outlined"
                color="primary"
                class="mt-2 alcance-select"
                required
                :error-messages="fieldErrors.frequency"
                :disabled="isLimitedEdit"
                @update:model-value="clearFieldError('frequency')"
              />
              <v-checkbox
                v-model="hasRating"
                :model-value="!!hasRating"
                label="¿El formulario tendrá ponderación de preguntas?"
                color="primary"
                hide-details
                density="comfortable"
                class="mt-2"
                style="min-width: 260px"
                :disabled="isLimitedEdit"
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
                  :disabled="isLimitedEdit"
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
              :disabled="false"
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
              :disabled="false"
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
                scope === 'business_unit_group'
                  ? 'Selecciona manualmente los roles auditados para el grupo'
                  : `${getAssignmentRoles.length} roles disponibles`
              "
              persistent-hint
              :error-messages="fieldErrors.audited"
              :disabled="false"
              @update:model-value="clearFieldError('audited')"
              chips
              closable-chips
            />
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12" class="d-flex justify-end">
            <v-btn color="primary" class="mt-6" :loading="isLoading" :disabled="isLoading" @click="validate">
              <template v-slot:loader><v-progress-circular indeterminate color="white" size="20" /></template>
              {{ isLoading ? 'Actualizando Formulario...' : 'Actualizar Formulario' }}
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
.gap-4 {
  gap: 1.5rem;
}
</style>
