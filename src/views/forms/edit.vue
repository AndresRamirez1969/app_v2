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

const selectedBusinessOrganization = ref(null);

// NUEVO: Para grupo, selecciona organización y empresa antes de grupo
const selectedGroupOrganization = ref(null);
const selectedGroupBusiness = ref(null);
const groupBusinessOptions = ref([]);
const groupGroupOptions = ref([]);

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

const clearFormFieldsOnScopeChange = () => {
  supervisor.value = '';
  auditors.value = [];
  audited.value = [];
  businessId.value = '';
  businessUnitId.value = '';
  groupId.value = '';
  if (scope.value !== 'organization') {
    selectedOrganization.value = null;
  }
  selectedOrgForRoles.value = null;
  if (scope.value !== 'business' && scope.value !== 'business_unit') {
    selectedBusinessOrganization.value = null;
  }
  logo.value = null;
  profilePreview.value = null;
  originalLogo.value = null;
  selectedGroupOrganization.value = null;
  selectedGroupBusiness.value = null;
  groupBusinessOptions.value = [];
  groupGroupOptions.value = [];
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
      if (scope.value === 'business_unit' && reuseLogo.value) break;
      if ((reuseLogo.value && isSuperadmin.value) || (reuseLogo.value && scope.value !== 'business_unit_group')) break;
      if (!reuseLogo.value && (!value || (Array.isArray(value) && value.length === 0))) {
        fieldErrors.logo = 'El logo es obligatorio';
        return false;
      }
      break;
    case 'businessOrganization':
      if ((scope.value === 'business' || scope.value === 'business_unit') && isSuperadmin.value && !selectedBusinessOrganization.value) {
        fieldErrors.businessOrganization = 'Selecciona una organización para filtrar empresas';
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
    case 'groupOrganization':
      if (scope.value === 'business_unit_group' && isSuperadmin.value && !selectedGroupOrganization.value) {
        fieldErrors.groupOrganization = 'Selecciona una organización para filtrar empresas';
        return false;
      }
      break;
    case 'groupBusiness':
      if (scope.value === 'business_unit_group' && !selectedGroupBusiness.value) {
        fieldErrors.groupBusiness = 'Selecciona una empresa para filtrar grupos';
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
  if (
    (scope.value === 'business' || scope.value === 'business_unit') &&
    isSuperadmin.value &&
    !validateField('businessOrganization', selectedBusinessOrganization.value)
  )
    isValid = false;
  if (!validateField('businessId', businessId.value)) isValid = false;
  if (!validateField('businessUnitId', businessUnitId.value)) isValid = false;
  if (scope.value === 'business_unit_group') {
    if (isSuperadmin.value && !validateField('groupOrganization', selectedGroupOrganization.value)) isValid = false;
    if (!validateField('groupBusiness', selectedGroupBusiness.value)) isValid = false;
    if (!validateField('groupId', groupId.value)) isValid = false;
  } else {
    if (!validateField('groupId', groupId.value)) isValid = false;
  }
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
        if ((scope.value === 'business' || scope.value === 'business_unit') && isSuperadmin.value) {
          return selectedBusinessOrganization.value ? Number(orgId) === Number(selectedBusinessOrganization.value) : false;
        }
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

const fetchGroupBusinesses = async () => {
  try {
    const res = await axiosInstance.get('/businesses');
    groupBusinessOptions.value = res.data.data
      .filter((b) => {
        if (isSuperadmin.value) {
          return selectedGroupOrganization.value ? Number(b.organization?.id) === Number(selectedGroupOrganization.value) : false;
        }
        return Number(b.organization?.id) === Number(user.value?.organization_id);
      })
      .map((b) => ({
        ...b,
        customLabel: `${b.folio} - ${b.name}`,
        organization_id: b.organization?.id
      }));
  } catch {
    groupBusinessOptions.value = [];
  }
};

const fetchGroupGroups = async () => {
  try {
    const res = await axiosInstance.get('/business-unit-groups');
    groupGroupOptions.value = res.data.data
      .filter((g) => {
        if (!selectedGroupBusiness.value) return false;
        return Number(g.business_id) === Number(selectedGroupBusiness.value);
      })
      .map((g) => ({
        ...g,
        customLabel: `${g.name}`,
        business_id: g.business_id,
        organization_id: g.organization?.id ?? g.organization_id
      }));
  } catch {
    groupGroupOptions.value = [];
  }
};

const fetchBusinessUnits = async (searchText = '') => {
  try {
    const params = { q: searchText, limit: 10 };
    let businessIdFilter = businessId.value;
    let orgIdFilter = null;

    if (isSponsor.value) businessIdFilter = userBusinesses.value;
    if (isSuperadmin.value && selectedBusinessOrganization.value) {
      orgIdFilter = Number(selectedBusinessOrganization.value);
    } else if (!isSuperadmin.value) {
      orgIdFilter = Number(user.value?.organization_id);
    }

    if (scope.value === 'business_unit' && businessIdFilter) {
      const res = await axiosInstance.get('/business-units', { params });
      businessUnits.value = res.data.data
        .filter((u) => {
          const orgId = u.organization?.id ?? u.organization_id;
          const businessMatch = Number(u.business_id) === Number(businessIdFilter);
          const orgMatch = orgIdFilter ? Number(orgId) === Number(orgIdFilter) : true;
          return businessMatch && orgMatch;
        })
        .map((u) => ({
          ...u,
          customLabel: `${u.folio} - ${u.legal_name ?? u.name}`,
          organization_id: u.organization?.id ?? u.organization_id
        }));
    } else {
      businessUnits.value = [];
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

watch(scope, async () => {
  clearFormFieldsOnScopeChange();
  await fetchUsersByScope();
});

watch(selectedOrganization, async () => {
  if (scope.value === 'organization' && isSuperadmin.value) {
    reuseLogo.value = false;
    await refreshScopeSelection();
    await fetchUsersByScope();
  }
});

watch(selectedBusinessOrganization, async () => {
  if ((scope.value === 'business' || scope.value === 'business_unit') && isSuperadmin.value) {
    businessId.value = '';
    businessUnitId.value = '';
    await fetchBusinesses();
    if (scope.value === 'business_unit' && !selectedBusinessOrganization.value) {
      businesses.value = [];
      businessUnits.value = [];
    }
  }
});

watch(businessId, async () => {
  if (scope.value === 'business' || scope.value === 'business_unit') {
    reuseLogo.value = false;
    if (scope.value === 'business_unit') {
      businessUnitId.value = '';
      await fetchBusinessUnits();
      if (!businessId.value) {
        businessUnits.value = [];
      }
    }
    await fetchUsersByScope();
  }
});

watch(businessUnitId, async () => {
  if (scope.value === 'business_unit') {
    reuseLogo.value = false;
    await fetchUsersByScope();
  }
});

watch(groupId, async () => {
  if (scope.value === 'business_unit_group') {
    reuseLogo.value = false;
    await fetchUsersByScope();
  }
});

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

watch(selectedGroupOrganization, async (val) => {
  selectedGroupBusiness.value = null;
  groupBusinessOptions.value = [];
  groupGroupOptions.value = [];
  groupId.value = '';
  if (val) {
    await fetchGroupBusinesses();
  }
});
watch(selectedGroupBusiness, async (val) => {
  groupGroupOptions.value = [];
  groupId.value = '';
  if (val) {
    await fetchGroupGroups();
  }
});
watch(groupId, async () => {
  if (scope.value === 'business_unit_group') {
    await fetchUsersByScope();
  }
});

const originalLogo = ref(null);

watch(logo, (newLogo) => {
  if (newLogo && !reuseLogo.value) {
    if (Array.isArray(newLogo)) {
      const file = newLogo[0];
      if (file) profilePreview.value = URL.createObjectURL(file);
    } else if (newLogo instanceof File) {
      profilePreview.value = URL.createObjectURL(newLogo);
    }
  } else if (!newLogo && !reuseLogo.value) {
    profilePreview.value = originalLogo.value;
  }
});

// --- INTEGRACIÓN: Logo de grupo igual que empresa y logo de empresa para ubicación ---
watch([reuseLogo, selectedGroupBusiness], async ([reuse, business]) => {
  if (scope.value === 'business_unit_group' && reuse && business && !groupId.value) {
    await refreshScopeSelection();
  }
});
watch([reuseLogo, groupId], async ([reuse, group]) => {
  if (scope.value === 'business_unit_group' && reuse && group) {
    await refreshScopeSelection();
  }
});
watch([reuseLogo, businessUnitId], async ([reuse, unitId]) => {
  if (scope.value === 'business_unit' && reuse && unitId) {
    await refreshScopeSelection();
  }
});
watch(reuseLogo, async () => {
  await refreshScopeSelection();
});
const refreshScopeSelection = async () => {
  if (reuseLogo.value) {
    try {
      let logoToShow = null;
      if (scope.value === 'business_unit_group') {
        if (groupId.value) {
          // Si hay grupo seleccionado, busca logo del grupo, si no tiene, busca logo de la empresa
          const { data: groupData } = await axiosInstance.get(`/business-unit-groups/${groupId.value}`);
          if (groupData.data?.logo) {
            logoToShow = groupData.data.logo;
          } else if (groupData.data?.business_id) {
            const { data: businessData } = await axiosInstance.get(`/businesses/${groupData.data.business_id}`);
            logoToShow = businessData.data?.logo || null;
          }
        } else if (selectedGroupBusiness.value) {
          // Si solo hay empresa seleccionada, busca logo de la empresa
          const { data: businessData } = await axiosInstance.get(`/businesses/${selectedGroupBusiness.value}`);
          logoToShow = businessData.data?.logo || null;
        }
      } else if (scope.value === 'business' && businessId.value) {
        const { data } = await axiosInstance.get(`/businesses/${businessId.value}`);
        logoToShow = data.data?.logo || null;
      } else if (scope.value === 'organization' && selectedOrganization.value) {
        const { data } = await axiosInstance.get(`/organizations/${selectedOrganization.value}`);
        logoToShow = data.data?.logo || null;
      } else if (scope.value === 'business_unit' && businessUnitId.value) {
        // INTEGRACIÓN: mostrar logo de la empresa asociada a la unidad seleccionada
        const unit = businessUnits.value.find((u) => Number(u.id) === Number(businessUnitId.value));
        let businessIdToFetch = businessId.value;
        if (unit && unit.business_id) {
          businessIdToFetch = unit.business_id;
        }
        if (businessIdToFetch) {
          const { data } = await axiosInstance.get(`/businesses/${businessIdToFetch}`);
          logoToShow = data.data?.logo || null;
        }
      }
      profilePreview.value = logoToShow;
      logo.value = null;
    } catch (err) {
      profilePreview.value = null;
    }
  } else {
    profilePreview.value = originalLogo.value;
  }
};

const isLoading = ref(false);

const formHasAnswers = ref(false);
const formStatus = ref('');
const isLimitedEdit = computed(() => formHasAnswers.value && formStatus.value === 'draft');

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
    const form = data.form;
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
    await nextTick();
    reuseLogo.value = !!form.use_scope_logo;

    if (
      form.assignment_scope === 'business_unit' &&
      (!form.organization_id || form.organization_id === null) &&
      form.business_unit &&
      form.business_unit.organization_id
    ) {
      selectedOrganization.value = Number(form.business_unit.organization_id);
      selectedOrgForRoles.value = Number(form.business_unit.organization_id);
      selectedBusinessOrganization.value = Number(form.business_unit.organization_id);
    } else if (
      form.assignment_scope === 'business_unit_group' &&
      (!form.organization_id || form.organization_id === null) &&
      form.business_unit_group &&
      form.business_unit_group.organization_id
    ) {
      selectedOrganization.value = Number(form.business_unit_group.organization_id);
      selectedOrgForRoles.value = Number(form.business_unit_group.organization_id);
      selectedGroupOrganization.value = Number(form.business_unit_group.organization_id);
      await fetchGroupBusinesses();
      selectedGroupBusiness.value = Number(form.business_unit_group.business_id);
      await fetchGroupGroups();
      groupId.value = Number(form.business_unit_group.id);
    } else if (
      form.assignment_scope === 'business' &&
      (!form.organization_id || form.organization_id === null) &&
      form.business &&
      form.business.organization_id
    ) {
      selectedOrganization.value = Number(form.business.organization_id);
      selectedOrgForRoles.value = Number(form.business.organization_id);
      selectedBusinessOrganization.value = Number(form.business.organization_id);
    } else {
      selectedOrganization.value =
        form.organization_id !== undefined && form.organization_id !== null ? Number(form.organization_id) : null;
      selectedOrgForRoles.value = form.organization_id !== undefined && form.organization_id !== null ? Number(form.organization_id) : null;
      if (form.organization_id !== undefined && form.organization_id !== null) {
        selectedBusinessOrganization.value = Number(form.organization_id);
      }
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
      profilePreview.value = null;
      reuseLogo.value = false;
    }

    formHasAnswers.value = !!form.answers_count && form.answers_count > 0;
    formStatus.value = form.status || '';

    canEditForm.value = checkPolicy(form, user.value);
    if (!canEditForm.value) {
      router.replace('/403');
      return null;
    }

    await fetchUsersByScope();
    return form;
  } catch (err) {
    toast.error('No se pudo cargar el formulario');
    return null;
  }
};

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

    auditors.value.forEach((id, i) => {
      formData.append('auditor_role_ids[]', id);
    });
    audited.value.forEach((id, i) => {
      formData.append('auditado_role_ids[]', id);
    });

    formData.append('frequency', frequency.value);
    formData.append('assignment_scope', scope.value);
    formData.append('has_rating', hasRating.value ? '1' : '0');

    formData.append('use_scope_logo', reuseLogo.value ? '1' : '0');
    if (!reuseLogo.value) {
      if (logo.value) {
        formData.append('logo', logo.value);
      } else {
        formData.append('logo', '');
      }
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
      if (isSuperadmin.value && selectedGroupOrganization.value) {
        orgId = Number(selectedGroupOrganization.value);
      } else {
        const group = groups.value.find((g) => Number(g.id) === Number(groupId.value));
        orgId = group && typeof group.organization_id !== 'undefined' ? Number(group.organization_id) : null;
      }
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
      formData.append('business_id', Number(selectedGroupBusiness.value));
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
    router.push('/formularios');
  } catch (err) {
    toast.error('Error al actualizar el formulario');
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

  if (isSuperadmin.value && form && form.assignment_scope === 'organization') {
    selectedOrganization.value = Number(form.organization_id);
    selectedOrgForRoles.value = Number(form.organization_id);
  }

  if (isSuperadmin.value) {
    await updateSelectedOrgForRoles();
    await fetchOrgRoles(selectedOrgForRoles.value);
  }

  if (form) {
    supervisor.value = form.supervisorRole ? form.supervisorRole.id : '';
    auditors.value = Array.isArray(form.auditorRoles) ? form.auditorRoles.map((r) => r.id) : [];
    audited.value = Array.isArray(form.auditadoRoles) ? form.auditadoRoles.map((r) => r.id) : [];
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
              <v-file-input
                v-if="!((reuseLogo && scope === 'business_unit_group') || (reuseLogo && scope === 'business_unit'))"
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
              <div class="d-flex align-center mb-2 logo-checkbox">
                <v-checkbox
                  v-if="scope === 'business_unit_group'"
                  v-model="reuseLogo"
                  :label="'Reutilizar logo de la empresa del grupo seleccionado'"
                  color="primary"
                  hide-details
                  class="mr-2"
                  style="border-radius: 8px"
                  :ripple="false"
                  :true-value="true"
                  :false-value="false"
                  :disabled="isLimitedEdit"
                />
                <v-checkbox
                  v-else-if="scope === 'business_unit'"
                  v-model="reuseLogo"
                  :label="'Reutilizar logo de la empresa de la ubicación seleccionada'"
                  color="primary"
                  hide-details
                  class="mr-2"
                  style="border-radius: 8px"
                  :ripple="false"
                  :true-value="true"
                  :false-value="false"
                  :disabled="isLimitedEdit"
                />
                <v-checkbox
                  v-else
                  v-model="reuseLogo"
                  :label="'Reutilizar logo del alcance seleccionado'"
                  color="primary"
                  hide-details
                  class="mr-2"
                  style="border-radius: 8px"
                  :ripple="false"
                  :true-value="true"
                  :false-value="false"
                  :disabled="isLimitedEdit"
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
