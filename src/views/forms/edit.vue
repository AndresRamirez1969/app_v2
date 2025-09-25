<script setup>
import { ref, onMounted, watch, computed, reactive } from 'vue';
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
  const orgId = selectedOrgForRoles.value || user.value?.organization_id;
  let orgRoles = allRoles.value.filter((role) => role.organization_id === orgId && role.id !== 1);
  if (isAdmin.value) {
    orgRoles = [
      { id: 2, customLabel: 'Administrador' },
      { id: 3, customLabel: 'Sponsor' },
      ...orgRoles.filter((role) => role.id !== 2 && role.id !== 3)
    ];
  } else if (isSponsor.value) {
    orgRoles = [
      { id: 2, customLabel: 'Administrador' },
      { id: 3, customLabel: 'Sponsor' },
      ...orgRoles.filter((role) => role.id !== 2 && role.id !== 3)
    ];
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

const goBack = () => router.push('/formularios');

const clearFieldError = (fieldName) => {
  if (fieldErrors[fieldName]) fieldErrors[fieldName] = '';
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
      if (scope.value === 'business_unit_group' && reuseLogo.value) break;
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
    businesses.value = res.data.data
      .filter((b) => {
        const orgId = b.organization?.id;
        return isSuperadmin.value ? true : Number(orgId) === Number(user.value?.organization_id);
      })
      .map((b) => ({
        ...b,
        customLabel: `${b.folio} - ${b.name}`,
        organization_id: b.organization?.id
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
        .filter((u) => {
          const orgId = u.organization?.id ?? u.organization_id;
          return isSuperadmin.value ? true : Number(orgId) === Number(user.value?.organization_id);
        })
        .map((u) => ({
          ...u,
          customLabel: `${u.folio} - ${u.legal_name ?? u.name}`,
          organization_id: u.organization?.id ?? u.organization_id
        }));
    }
  } catch {
    businessUnits.value = [];
  }
};

const fetchGroups = async () => {
  try {
    const res = await axiosInstance.get('/business-unit-groups');
    groups.value = res.data.data
      .filter((g) => {
        const orgId = g.organization?.id ?? g.organization_id;
        if (isSuperadmin.value) return true;
        if (isSponsor.value) return Number(g.business_id) === Number(userBusinesses.value);
        return Number(orgId) === Number(user.value?.organization_id);
      })
      .map((g) => ({
        ...g,
        customLabel: `${g.name}`,
        business_id: g.business_id,
        organization_id: g.organization?.id ?? g.organization_id
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

const updateSelectedOrgForRoles = async () => {
  let orgId = null;
  if (scope.value === 'organization' && selectedOrganization.value) {
    orgId = selectedOrganization.value;
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
  if (orgId) {
    selectedOrgForRoles.value = orgId;
    await fetchOrgRoles(orgId);
  }
};

watch([scope, selectedOrganization, businessId, businessUnitId, groupId], async () => {
  if (isSuperadmin.value) {
    await updateSelectedOrgForRoles();
    supervisor.value = '';
    auditors.value = [];
    if (scope.value !== 'business_unit_group') {
      audited.value = [];
    }
    await fetchUsersByScope();
  }
});

watch(selectedOrgForRoles, async (orgId) => {
  if (isSuperadmin.value && orgId) {
    await fetchOrgRoles(orgId);
    supervisor.value = '';
    auditors.value = [];
    if (scope.value !== 'business_unit_group') {
      audited.value = [];
    }
    await fetchUsersByScope();
  }
});

watch(scope, async () => {
  supervisor.value = '';
  auditors.value = [];
  if (scope.value !== 'business_unit_group') {
    audited.value = [];
  }
  await fetchUsersByScope();
});

const originalLogo = ref(null);

const refreshScopeSelection = async () => {
  try {
    let organizationIdToFetch = null;
    let organizationLogo = null;

    if (scope.value === 'organization' && selectedOrganization.value) {
      const { data } = await axiosInstance.get(`/organizations/${selectedOrganization.value}`);
      profilePreview.value = data.data?.logo || null;
      organizationIdToFetch = selectedOrganization.value;
      organizationLogo = data.data?.logo || null;
    } else if (scope.value === 'business' && businessId.value) {
      const { data } = await axiosInstance.get(`/businesses/${businessId.value}`);
      profilePreview.value = data.data?.logo || null;
      if (data.data?.organization_id) {
        organizationIdToFetch = data.data.organization_id;
        const orgRes = await axiosInstance.get(`/organizations/${organizationIdToFetch}`);
        organizationLogo = orgRes.data.data?.logo || null;
      }
    } else if (scope.value === 'business_unit' && businessUnitId.value) {
      const { data } = await axiosInstance.get(`/business-units/${businessUnitId.value}`);
      profilePreview.value = data.data?.logo || null;
      if (data.data?.organization_id) {
        organizationIdToFetch = data.data.organization_id;
        const orgRes = await axiosInstance.get(`/organizations/${organizationIdToFetch}`);
        organizationLogo = orgRes.data.data?.logo || null;
      }
    } else if (scope.value === 'business_unit_group' && groupId.value) {
      const { data } = await axiosInstance.get(`/business-unit-groups/${groupId.value}`);
      const g = data.data;
      if (g?.logo) {
        profilePreview.value = g.logo;
      } else if (g?.business_id) {
        const { data: biz } = await axiosInstance.get(`/businesses/${g.business_id}`);
        profilePreview.value = biz.data?.logo || null;
        if (biz.data?.organization_id) {
          organizationIdToFetch = biz.data.organization_id;
          const orgRes = await axiosInstance.get(`/organizations/${organizationIdToFetch}`);
          organizationLogo = orgRes.data.data?.logo || null;
        }
      } else {
        profilePreview.value = null;
      }
    }

    if (reuseLogo.value) {
      if (organizationLogo) {
        profilePreview.value = organizationLogo;
      } else {
        const url = getScopeLogo();
        if (url) profilePreview.value = url;
      }
      logo.value = null;
    }
  } catch (err) {
    profilePreview.value = originalLogo.value || null;
  }
};

const isLoading = ref(false);

// INTEGRACIÓN: Estado y respuestas del formulario
const formHasAnswers = ref(false);
const formStatus = ref('');
const isLimitedEdit = computed(() => formHasAnswers.value && formStatus.value === 'draft');

// --- POLICY CHECK INTEGRATION ---
const canEditForm = ref(false);

const checkPolicy = (form, user) => {
  if (!form || !user) return false;
  if (user.roles?.includes('superadmin')) return true;

  if (user.roles?.includes('admin')) {
    if (user.permissions?.includes('form.update')) {
      if (user.organization_id === form.organization_id) return true;
      if (form.business_id && form.business && form.business.organization_id === user.organization_id) return true;
      if (form.business_unit_id && form.businessUnit && form.businessUnit.organization_id === user.organization_id) return true;
      if (form.business_unit_group_id && form.businessUnitGroup && form.businessUnitGroup.organization_id === user.organization_id)
        return true;
    }
    return false;
  }

  if (user.roles?.includes('sponsor')) {
    if (user.permissions?.includes('form.update')) {
      if (form.business_id && user.business_id === form.business_id) return true;
      if (form.assignment_scope === 'business_unit' && form.business_unit_id) {
        const unit = form.businessUnit;
        if (unit && unit.business_id === user.business_id) return true;
      }
      if (form.assignment_scope === 'business_unit_group' && form.business_unit_group_id) {
        const group = form.businessUnitGroup;
        if (group && group.business_id === user.business_id) return true;
      }
    }
    return false;
  }

  if (user.permissions?.includes('form.update')) {
    if (user.organization_id && !user.business_id && !user.business_unit_id) {
      return user.organization_id === form.organization_id;
    }
    if (user.organization_id && user.business_id && !user.business_unit_id) {
      if (form.business_id && user.business_id === form.business_id) return true;
      if (form.assignment_scope === 'business_unit' && form.business_unit_id && user.business_id === form.business_id) return true;
      if (form.assignment_scope === 'business_unit_group' && form.business_unit_group_id && user.business_id === form.business_id)
        return true;
      return false;
    }
    if (user.organization_id && user.business_id && user.business_unit_id) {
      return form.assignment_scope === 'business_unit' && form.business_unit_id === user.business_unit_id;
    }
  }

  return false;
};

const fetchFormData = async () => {
  const formId = route.params.id;
  if (!formId) return null;
  try {
    const { data } = await axiosInstance.get(`/forms/${formId}`);
    const form = data.data;
    name.value = form.name || '';
    description.value = form.description || '';
    frequency.value = form.frequency || '';
    scope.value = form.assignment_scope || '';
    hasRating.value = !!form.has_rating;
    businessId.value = form.business_id || '';
    businessUnitId.value = form.business_unit_id || '';
    groupId.value = form.business_unit_group_id || '';
    originalLogo.value = form.logo || null;
    profilePreview.value = form.logo || null;
    logo.value = null;
    reuseLogo.value = false;

    if (
      form.assignment_scope === 'business_unit' &&
      (!form.organization_id || form.organization_id === null) &&
      form.business_unit &&
      form.business_unit.organization_id
    ) {
      selectedOrganization.value = Number(form.business_unit.organization_id);
      selectedOrgForRoles.value = Number(form.business_unit.organization_id);
    } else if (
      form.assignment_scope === 'business_unit_group' &&
      (!form.organization_id || form.organization_id === null) &&
      form.business_unit_group &&
      form.business_unit_group.organization_id
    ) {
      selectedOrganization.value = Number(form.business_unit_group.organization_id);
      selectedOrgForRoles.value = Number(form.business_unit_group.organization_id);
    } else if (
      form.assignment_scope === 'business' &&
      (!form.organization_id || form.organization_id === null) &&
      form.business &&
      form.business.organization_id
    ) {
      selectedOrganization.value = Number(form.business.organization_id);
      selectedOrgForRoles.value = Number(form.business.organization_id);
    } else {
      selectedOrganization.value =
        form.organization_id !== undefined && form.organization_id !== null ? Number(form.organization_id) : null;
      selectedOrgForRoles.value = form.organization_id !== undefined && form.organization_id !== null ? Number(form.organization_id) : null;
    }

    if (
      form.assignment_scope === 'business_unit' &&
      (!form.business_id || form.business_id === null) &&
      form.business_unit &&
      form.business_unit.business_id
    ) {
      businessId.value = Number(form.business_unit.business_id);
    }

    if (form.assignment_scope === 'business_unit' && form.business_unit) {
      const exists = businessUnits.value.some((u) => u.id === form.business_unit.id);
      if (!exists) {
        businessUnits.value = [
          {
            ...form.business_unit,
            customLabel: `${form.business_unit.folio} - ${form.business_unit.legal_name ?? form.business_unit.name}`,
            organization_id: form.business_unit.organization_id
          }
        ];
      }
    }

    if (!form.logo) {
      const url = getScopeLogo();
      if (url) {
        profilePreview.value = url;
        reuseLogo.value = true;
      }
    }

    formHasAnswers.value = !!form.answers_count && form.answers_count > 0;
    formStatus.value = form.status || '';

    // --- POLICY CHECK ---
    canEditForm.value = checkPolicy(form, user.value);
    if (!canEditForm.value) {
      router.replace('/403');
      return null;
    }

    await refreshScopeSelection();
    await fetchUsersByScope();
    return form;
  } catch (err) {
    toast.error('No se pudo cargar el formulario');
    return null;
  }
};
// --- END POLICY CHECK ---

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
      allRoles.value.find((r) => Number(r.id) === Number(supervisor.value));
    if (supervisorRole) formData.append('supervisor_role_id', supervisorRole.id);

    // --- LOGS PARA DEPURAR ---
    console.log('auditors.value antes de enviar:', auditors.value);
    console.log('audited.value antes de enviar:', audited.value);

    auditors.value.forEach((id, i) => {
      console.log(`Agregando auditor_role_ids[${i}]:`, id);
      formData.append('auditor_role_ids[]', id);
    });
    audited.value.forEach((id, i) => {
      console.log(`Agregando auditado_role_ids[${i}]:`, id);
      formData.append('auditado_role_ids[]', id);
    });

    formData.append('frequency', frequency.value);
    formData.append('assignment_scope', scope.value);
    formData.append('has_rating', hasRating.value ? '1' : '0');

    if (reuseLogo.value && scope.value === 'business_unit_group') {
      // backend toma logo de la empresa del grupo
    } else if (reuseLogo.value && isSuperadmin.value) {
      // backend toma logo del alcance
    } else if (logo.value && !reuseLogo.value) {
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

    // --- LOG FINAL DE FORM DATA ---
    for (let pair of formData.entries()) {
      console.log('FormData:', pair[0], pair[1]);
    }

    // INTEGRACIÓN CORRECTA PARA LARAVEL
    formData.append('_method', 'PUT');
    await axiosInstance.post(`/forms/${formId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });

    toast.success('Formulario actualizado correctamente');
    router.push('/formularios');
  } catch (err) {
    toast.error('Error al actualizar el formulario');
    console.log('Error al actualizar:', err);
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  await fetchAllUsers();
  await fetchBusinesses();
  await fetchGroups();
  if (isSuperadmin.value) await fetchOrganizations();

  const form = await fetchFormData();

  if (isSuperadmin.value) {
    await updateSelectedOrgForRoles();
    await fetchOrgRoles(selectedOrgForRoles.value);
  }

  if (form) {
    supervisor.value = form.supervisorRole ? form.supervisorRole.id : '';
    auditors.value = Array.isArray(form.auditorRoles) ? form.auditorRoles.map((r) => r.id) : [];
    audited.value = Array.isArray(form.auditadoRoles) ? form.auditadoRoles.map((r) => r.id) : [];
    // --- LOGS PARA DEPURAR ---
    console.log('Valores iniciales supervisor:', supervisor.value);
    console.log('Valores iniciales auditors:', auditors.value);
    console.log('Valores iniciales audited:', audited.value);
  }
});
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
              @update:model-value="
                (val) => {
                  clearFieldError('name');
                }
              "
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
              @update:model-value="
                (val) => {
                  clearFieldError('description');
                }
              "
            />

            <v-label>Alcance <span class="text-error">*</span></v-label>
            <div class="alcance-btn-group mt-2 mb-4">
              <v-btn
                v-for="option in scopeOptions"
                :key="option.value"
                :color="scope === option.value ? 'primary' : 'grey-lighten-2'"
                :variant="scope === option.value ? 'flat' : 'outlined'"
                style="border-radius: 8px; min-width: 120px; font-weight: 500"
                @click="
                  () => {
                    scope.value = option.value;
                  }
                "
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
                @update:model-value="
                  async (val) => {
                    selectedOrganization.value = Number(val);
                    reuseLogo.value = false;
                    await refreshScopeSelection();
                    await fetchUsersByScope();
                  }
                "
              />
            </div>

            <!-- EMPRESA -->
            <div v-if="scope === 'business' && !isSponsor" class="mt-4 alcance-select">
              <v-label>Empresa <span class="text-error">*</span></v-label>
              <v-select
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
                :disabled="isLimitedEdit"
                @update:model-value="
                  async (val) => {
                    businessId.value = Number(val);
                    reuseLogo.value = false;
                    await refreshScopeSelection();
                    await fetchUsersByScope();
                  }
                "
              />
            </div>

            <!-- UBICACION -->
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
                :disabled="isLimitedEdit"
                @update:model-value="
                  async (val) => {
                    businessId.value = Number(val);
                    reuseLogo.value = false;
                    await fetchBusinessUnits();
                    await refreshScopeSelection();
                    await fetchUsersByScope();
                  }
                "
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
                :disabled="isLimitedEdit"
                @update:model-value="
                  async (val) => {
                    businessUnitId.value = Number(val);
                    reuseLogo.value = false;
                    await refreshScopeSelection();
                    await fetchUsersByScope();
                  }
                "
              />
            </div>

            <!-- GRUPO -->
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
                :disabled="isLimitedEdit"
                @update:model-value="
                  async (val) => {
                    groupId.value = Number(val);
                    reuseLogo.value = false;
                    await refreshScopeSelection();
                    await fetchUsersByScope();
                  }
                "
              />
            </div>

            <!-- Logo -->
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
                :disabled="isLimitedEdit"
                @update:model-value="
                  (val) => {
                    clearFieldError('logo');
                  }
                "
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
                  :disabled="isLimitedEdit"
                  @update:model-value="
                    async (val) => {
                      await refreshScopeSelection();
                    }
                  "
                />
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
                @update:model-value="
                  (val) => {
                    clearFieldError('frequency');
                  }
                "
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
                  @update:model-value="
                    async (val) => {
                      selectedOrgForRoles.value = Number(val);
                      await fetchOrgRoles(selectedOrgForRoles.value);
                      supervisor.value = '';
                      auditors.value = [];
                      audited.value = [];
                      await fetchUsersByScope();
                    }
                  "
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
              @update:model-value="
                (val) => {
                  clearFieldError('supervisor');
                }
              "
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
              @update:model-value="
                (val) => {
                  clearFieldError('auditors');
                }
              "
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
              @update:model-value="
                (val) => {
                  clearFieldError('audited');
                }
              "
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
