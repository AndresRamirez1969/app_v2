<script setup>
import { ref, onMounted, watch, computed, reactive, nextTick } from "vue";
import axiosInstance from "@/utils/axios";
import { FREQUENCY } from "@/constants/constants";
import { useAuthStore } from "@/stores/auth";
import { mdiArrowLeft, mdiInformationSlabCircleOutline } from "@mdi/js";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { groupUsersByRole } from "@/utils/helpers/groupUsers";

const auth = useAuthStore();
const user = computed(() => auth.user);
const toast = useToast();
const router = useRouter();

if (!user.value?.permissions?.includes("form.create")) {
  router.replace("/403");
}

const Regform = ref("");
const profilePreview = ref(null);

const name = ref("");
const description = ref("");
const supervisor = ref("");
const auditors = ref([]);
const audited = ref([]);
const frequency = ref("");
const businessUnitId = ref("");
const businessId = ref("");
const scope = ref("");
const hasRating = ref(false);
const businesses = ref([]);
const businessUnits = ref([]);
const groups = ref([]);
const groupId = ref("");
const logo = ref(null);
const reuseLogo = ref(false);

const selectedOrganization = ref(null); // Para alcance organización
const selectedBusinessOrganization = ref(null); // Para empresa y ubicación
const selectedGroupOrganization = ref(null); // Para grupo
const selectedGroupBusiness = ref(null); // Para grupo

const organizationOptions = ref([]);
const loadingOrganizations = ref(false);

const allUsers = ref([]);
const filteredUsers = ref([]);

const selectedOrgForRoles = ref(null);
const orgRoleOptions = ref([]);
const loadingOrgRoles = ref(false);

const orgRolesForAdmin = ref([]);
const loadingOrgRolesForAdmin = ref(false);

const fieldErrors = reactive({
  name: "",
  description: "",
  supervisor: "",
  auditors: "",
  audited: "",
  frequency: "",
  scope: "",
  logo: "",
  businessId: "",
  businessUnitId: "",
  groupId: "",
  orgRole: "",
  businessOrganization: "",
  groupOrganization: "",
  groupBusiness: "",
});

const isSuperadmin = computed(() => user.value?.roles?.includes("superadmin"));
const isSponsor = computed(() => user.value?.roles?.includes("sponsor"));
const isAdmin = computed(() => user.value?.roles?.includes("admin"));
const userBusinesses = computed(() => user.value?.business_id);
const userOrganization = computed(() => user.value?.organization_id);

const allRoles = computed(() => groupUsersByRole(allUsers.value));

const filteredOrgRoles = computed(() => {
  const fixedRoles = [
    { id: 1, customLabel: "Super Administrador" },
    { id: 2, customLabel: "Administrador" },
    { id: 3, customLabel: "Sponsor" },
  ];
  if (isSuperadmin.value && selectedOrgForRoles.value) {
    const orgRoles = orgRoleOptions.value
      .filter((r) => r.organization_id === selectedOrgForRoles.value)
      .map((r) => ({ id: r.id, customLabel: r.name }));
    return [...fixedRoles, ...orgRoles];
  }
  return allRoles.value;
});

const getAssignmentRoles = computed(() => {
  if (isSuperadmin.value) return filteredOrgRoles.value;
  if (isAdmin.value || isSponsor.value) {
    const fixed = [];
    if (isAdmin.value) fixed.push({ id: 2, customLabel: "Administrador" });
    fixed.push({ id: 3, customLabel: "Sponsor" });
    const orgRoles = orgRolesForAdmin.value
      .filter((role) => ![1, 2, 3].includes(role.id)) // quitar superadmin, admin, sponsor por id
      .map((role) => ({ id: role.id, customLabel: role.name }));

    return [...fixed, ...orgRoles];
  }
  return [];
});

const scopeOptions = computed(() => {
  if (isSuperadmin.value) {
    return [
      { label: "Organización", value: "organization" },
      { label: "Empresa", value: "business" },
      { label: "Ubicación", value: "business_unit" },
      { label: "Grupo", value: "business_unit_group" },
    ];
  }
  if (isSponsor.value) {
    return [
      { label: "Empresa", value: "business" },
      { label: "Ubicación", value: "business_unit" },
      { label: "Grupo", value: "business_unit_group" },
    ];
  }
  return [
    { label: "Organización", value: "organization" },
    { label: "Empresa", value: "business" },
    { label: "Ubicación", value: "business_unit" },
    { label: "Grupo", value: "business_unit_group" },
  ];
});

// Computed para filtrar empresas y grupos según organización seleccionada
const businessOptions = computed(() => {
  if (
    isSuperadmin.value &&
    (scope.value === "business" || scope.value === "business_unit")
  ) {
    const orgId = selectedBusinessOrganization.value;
    if (!orgId) return [];
    return businesses.value.filter((b) => Number(b.organization_id) === Number(orgId));
  }
  if (isSuperadmin.value && scope.value === "organization") {
    return [];
  }
  return businesses.value;
});
const groupBusinessOptions = computed(() => {
  if (isSuperadmin.value && scope.value === "business_unit_group") {
    const orgId = selectedGroupOrganization.value;
    if (!orgId) return [];
    return businesses.value.filter((b) => Number(b.organization_id) === Number(orgId));
  }
  return businesses.value;
});
const groupGroupOptions = computed(() => {
  // Filtrar por empresa seleccionada (selectedGroupBusiness)
  if ((isSuperadmin.value || isAdmin.value) && scope.value === "business_unit_group") {
    const bizId = selectedGroupBusiness.value;
    if (!bizId) return [];
    return groups.value.filter((g) => Number(g.business_id) === Number(bizId));
  }
  return groups.value;
});

const getScopeLogo = () => {
  if (scope.value === "organization") {
    const orgId =
      isSuperadmin.value && selectedOrganization.value
        ? Number(selectedOrganization.value)
        : Number(userOrganization.value);
    const org = organizationOptions.value.find((o) => Number(o.value) === orgId);
    return org?.logo || null;
  }
  if (scope.value === "business" && businessId.value) {
    const biz = businesses.value.find((b) => Number(b.id) === Number(businessId.value));
    return biz?.logo || null;
  }
  if (scope.value === "business_unit" && businessUnitId.value) {
    const unit = businessUnits.value.find(
      (u) => Number(u.id) === Number(businessUnitId.value)
    );
    return unit?.logo || null;
  }
  if (scope.value === "business_unit_group" && groupId.value) {
    const group = groups.value.find((g) => Number(g.id) === Number(groupId.value));
    if (group?.logo) return group.logo;
    const biz = businesses.value.find((b) => Number(b.id) === Number(group?.business_id));
    return biz?.logo || null;
  }
  return null;
};

// --- INTEGRACIÓN: Control de disponibilidad de logo de alcance ---
const scopeLogoAvailable = ref(true);
const scopeLogoError = ref("");

// Función para verificar si el alcance tiene logo disponible
const checkScopeLogo = () => {
  let logoUrl = getScopeLogo();
  if (!logoUrl) {
    scopeLogoAvailable.value = false;
    scopeLogoError.value =
      "El alcance seleccionado no cuenta con logo. Ingresa uno manualmente o edita el registro del alcance para agregar un logo.";
    reuseLogo.value = false;
  } else {
    scopeLogoAvailable.value = true;
    scopeLogoError.value = "";
  }
};

// Watch para validar cada vez que cambian los selects relevantes o el scope
watch(
  [
    scope,
    selectedOrganization,
    selectedBusinessOrganization,
    businessId,
    businessUnitId,
    selectedGroupOrganization,
    selectedGroupBusiness,
    groupId,
  ],
  () => {
    if (reuseLogo.value) checkScopeLogo();
    else {
      scopeLogoAvailable.value = true;
      scopeLogoError.value = "";
    }
  }
);

// Watch para deshabilitar reuseLogo si no hay logo disponible
watch(reuseLogo, (val) => {
  if (val) checkScopeLogo();
});

// --- FIN INTEGRACIÓN LOGO ---

const goBack = () => router.push("/formularios");

const clearFieldError = (fieldName) => {
  if (fieldErrors[fieldName]) fieldErrors[fieldName] = "";
};

const validateField = (fieldName, value) => {
  clearFieldError(fieldName);
  switch (fieldName) {
    case "name":
      if (!value) {
        fieldErrors.name = "El nombre del formulario es obligatorio";
        return false;
      }
      break;
    case "supervisor":
      if (!value) {
        fieldErrors.supervisor = "El supervisor es obligatorio";
        return false;
      }
      break;
    case "auditors":
      if (!value || value.length === 0) {
        fieldErrors.auditors = "Debe seleccionar al menos un auditor";
        return false;
      }
      break;
    case "audited":
      if (!value || value.length === 0) {
        fieldErrors.audited = "Debe seleccionar al menos un auditado";
        return false;
      }
      break;
    case "frequency":
      if (!value) {
        fieldErrors.frequency = "La frecuencia es obligatoria";
        return false;
      }
      break;
    case "scope":
      if (!value) {
        fieldErrors.scope = "El alcance es obligatorio";
        return false;
      }
      break;
    case "logo":
      if (reuseLogo.value) {
        // Si reuseLogo está activo, pero no hay logo disponible, no permitir
        if (!scopeLogoAvailable.value) {
          fieldErrors.logo = scopeLogoError.value;
          return false;
        }
        break;
      }
      if (!reuseLogo.value && (!value || (Array.isArray(value) && value.length === 0))) {
        fieldErrors.logo = "El logo es obligatorio";
        return false;
      }
      break;
    case "businessId":
      if (
        (scope.value === "business" ||
          scope.value === "business_unit" ||
          scope.value === "business_unit_group") &&
        !value
      ) {
        fieldErrors.businessId = "El negocio es obligatorio";
        return false;
      }
      break;
    case "businessUnitId":
      if (scope.value === "business_unit" && !value) {
        fieldErrors.businessUnitId = "La unidad de negocio es obligatoria";
        return false;
      }
      break;
    case "groupId":
      if (scope.value === "business_unit_group" && !value) {
        fieldErrors.groupId = "El grupo es obligatorio";
        return false;
      }
      break;
    case "orgRole":
      if (isSuperadmin.value && !value) {
        fieldErrors.orgRole = "Selecciona una organización para filtrar roles";
        return false;
      }
      break;
    case "businessOrganization":
      if (
        isSuperadmin.value &&
        (scope.value === "business" || scope.value === "business_unit") &&
        !selectedBusinessOrganization.value
      ) {
        fieldErrors.businessOrganization = "Selecciona una organización";
        return false;
      }
      break;
    case "groupOrganization":
      if (
        isSuperadmin.value &&
        scope.value === "business_unit_group" &&
        !selectedGroupOrganization.value
      ) {
        fieldErrors.groupOrganization = "Selecciona una organización";
        return false;
      }
      break;
    case "groupBusiness":
      if (
        isSuperadmin.value &&
        scope.value === "business_unit_group" &&
        !selectedGroupBusiness.value
      ) {
        fieldErrors.groupBusiness = "Selecciona una empresa";
        return false;
      }
      break;
  }
  return true;
};

const validateAllFields = () => {
  let isValid = true;
  if (!validateField("name", name.value)) isValid = false;
  if (!validateField("supervisor", supervisor.value)) isValid = false;
  if (!validateField("auditors", auditors.value)) isValid = false;
  if (!validateField("audited", audited.value)) isValid = false;
  if (!validateField("frequency", frequency.value)) isValid = false;
  if (!validateField("scope", scope.value)) isValid = false;
  if (!validateField("logo", logo.value)) isValid = false;
  if (!validateField("businessId", businessId.value)) isValid = false;
  if (!validateField("businessUnitId", businessUnitId.value)) isValid = false;
  if (!validateField("groupId", groupId.value)) isValid = false;
  if (!validateField("businessOrganization", selectedBusinessOrganization.value))
    isValid = false;
  if (!validateField("groupOrganization", selectedGroupOrganization.value))
    isValid = false;
  if (!validateField("groupBusiness", selectedGroupBusiness.value)) isValid = false;
  if (isSuperadmin.value && !validateField("orgRole", selectedOrgForRoles.value))
    isValid = false;
  return isValid;
};

const fetchAllUsers = async () => {
  try {
    const res = await axiosInstance.get("/users");
    allUsers.value = res.data.data.map((user) => ({
      ...user,
      customLabel: `${user.roles?.[0]?.name || "Sin rol"}`,
    }));
  } catch (err) {
    allUsers.value = [];
  }
};

const fetchUsersByScope = async () => {
  try {
    if (scope.value === "business_unit_group" && !groupId.value) return;
    if (scope.value === "business" && !businessId.value) return;
    if (scope.value === "business_unit" && !businessUnitId.value) return;
    if (
      scope.value === "organization" &&
      isSuperadmin.value &&
      !selectedOrganization.value
    )
      return;

    const params = { scope: scope.value };
    if (scope.value === "organization") {
      params.organization_id =
        isSuperadmin.value && selectedOrganization.value
          ? Number(selectedOrganization.value)
          : Number(user.value?.organization_id);
    } else if (scope.value === "business" && businessId.value) {
      params.business_id = Number(businessId.value);
      const selectedBusiness = businesses.value.find(
        (b) => Number(b.id) === Number(businessId.value)
      );
      if (selectedBusiness && typeof selectedBusiness.organization_id !== "undefined") {
        params.organization_id = Number(selectedBusiness.organization_id);
      }
    } else if (scope.value === "business_unit" && businessUnitId.value) {
      params.business_unit_id = Number(businessUnitId.value);
      const selectedUnit = businessUnits.value.find(
        (u) => Number(u.id) === Number(businessUnitId.value)
      );
      if (selectedUnit && typeof selectedUnit.organization_id !== "undefined") {
        params.organization_id = Number(selectedUnit.organization_id);
      }
    } else if (scope.value === "business_unit_group" && groupId.value) {
      params.business_unit_group_id = Number(groupId.value);
      const selectedGroup = groups.value.find(
        (g) => Number(g.id) === Number(groupId.value)
      );
      if (selectedGroup && typeof selectedGroup.organization_id !== "undefined") {
        params.organization_id = Number(selectedGroup.organization_id);
      }
    }

    const res = await axiosInstance.get("/users-by-scope", { params });
    filteredUsers.value = res.data.data.map((user) => ({
      ...user,
      customLabel: `${user.roles?.[0]?.name || "Sin rol"}`,
    }));

    if (scope.value === "business_unit_group" && groupId.value) {
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
  } catch {
    filteredUsers.value = [];
  }
};

const fetchBusinessUnits = async (searchText = "") => {
  try {
    const params = { q: searchText, limit: 10 };
    let businessIdFilter = businessId.value;
    if (isSponsor.value) businessIdFilter = userBusinesses.value;
    if (scope.value === "business_unit" && businessIdFilter) {
      const res = await axiosInstance.get("/business-units", { params });
      businessUnits.value = res.data.data
        .filter((unit) => {
          // Filtrar por empresa seleccionada
          if (Number(unit.business_id) !== Number(businessIdFilter)) return false;
          if (isSuperadmin.value) return true;
          return unit.organization_id === user.value?.organization_id;
        })
        .map((businessUnit) => ({
          ...businessUnit,
          customLabel: `${businessUnit.folio} - ${businessUnit.name}`,
        }));
    } else {
      businessUnits.value = [];
    }
  } catch (err) {
    businessUnits.value = [];
  }
};

const fetchBusinesses = async () => {
  try {
    const resBusiness = await axiosInstance.get("/businesses");
    businesses.value = resBusiness.data.data
      .filter((business) => {
        if (isSuperadmin.value) return true;
        return business.organization_id === user.value?.organization_id;
      })
      .map((business) => ({
        ...business,
        customLabel: `${business.folio} - ${business.name}`,
      }));
  } catch (err) {
    businesses.value = [];
  }
};

const fetchGroups = async () => {
  try {
    const resGroup = await axiosInstance.get("/business-unit-groups");
    groups.value = resGroup.data.data
      .filter((group) => {
        if (isSuperadmin.value) return true;
        if (isSponsor.value) return group.business_id === userBusinesses.value;
        return group.organization_id === user.value?.organization_id;
      })
      .map((group) => ({
        ...group,
        customLabel: `${group.name}`,
        business_id: group.business_id,
      }));
  } catch (err) {
    groups.value = [];
  }
};

const fetchOrganizations = async () => {
  if (!isSuperadmin.value) return;
  loadingOrganizations.value = true;
  try {
    const { data } = await axiosInstance.get("/organizations");
    organizationOptions.value = (data.data || []).map((o) => ({
      ...o,
      title: `${o.folio} - ${o.legal_name}`,
      value: o.id,
      logo: o.logo || null,
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
    const { data } = await axiosInstance.get("/roles", {
      params: { organizationId: Number(orgId) },
    });
    orgRoleOptions.value = (data.data || []).filter((r) => r.name !== "superadmin");
  } catch {
    orgRoleOptions.value = [];
  } finally {
    loadingOrgRoles.value = false;
  }
};

const fetchOrgRolesForAdmin = async () => {
  loadingOrgRolesForAdmin.value = true;
  try {
    const { data } = await axiosInstance.get("/roles");
    orgRolesForAdmin.value = (data.data || []).filter(
      (r) => r.organization_id === user.value.organization_id
    );
  } catch {
    orgRolesForAdmin.value = [];
  } finally {
    loadingOrgRolesForAdmin.value = false;
  }
};

// Watchers para dependencias de organización y empresa
watch(selectedBusinessOrganization, (orgId) => {
  businessId.value = "";
  businessUnits.value = [];
});
watch(selectedGroupOrganization, (orgId) => {
  selectedGroupBusiness.value = "";
});
watch(selectedGroupBusiness, (bizId) => {
  groupId.value = "";
});

watch(selectedOrgForRoles, async (orgId) => {
  if (isSuperadmin.value && orgId) {
    await fetchOrgRoles(orgId);
    supervisor.value = "";
    auditors.value = [];
    audited.value = [];
  }
});

watch(scope, async (newScope, oldScope) => {
  await fetchBusinesses();
  await fetchGroups();
  await fetchBusinessUnits();
  await fetchUsersByScope();
  if (oldScope === "organization") selectedOrganization.value = null;
  if (oldScope === "business") {
    selectedBusinessOrganization.value = null;
    businessId.value = "";
  }
  if (oldScope === "business_unit") {
    selectedBusinessOrganization.value = null;
    businessId.value = "";
    businessUnitId.value = "";
  }
  if (oldScope === "business_unit_group") {
    selectedGroupOrganization.value = null;
    selectedGroupBusiness.value = null;
    groupId.value = "";
  }
  logo.value = null;
  profilePreview.value = null;
  reuseLogo.value = false;
});

watch([scope, isSponsor], ([newScope, sponsor]) => {
  if ((newScope === "business" || newScope === "business_unit") && sponsor) {
    businessId.value = userBusinesses.value;
  }
});

watch(selectedOrganization, async (orgId) => {
  if (isSuperadmin.value && orgId) {
    await fetchBusinesses();
    await fetchGroups();
    await fetchBusinessUnits();
    await fetchUsersByScope();
  }
});

watch(businessId, async (newBusinessId) => {
  if (scope.value === "business_unit" && newBusinessId) {
    await fetchBusinessUnits();
    businessUnitId.value = "";
  }
});

watch(groupId, async (newGroupId) => {
  if (scope.value === "business_unit_group" && newGroupId) {
    await fetchUsersByScope();
  }
});

watch(logo, (newLogo) => {
  if (newLogo && !reuseLogo.value) {
    if (Array.isArray(newLogo)) {
      const file = newLogo[0];
      if (file) profilePreview.value = URL.createObjectURL(file);
    } else if (newLogo instanceof File) {
      profilePreview.value = URL.createObjectURL(newLogo);
    }
  } else if (!newLogo && !reuseLogo.value) {
    profilePreview.value = null;
  }
});

watch(
  [scope, businessId, businessUnitId, groupId, selectedOrganization, reuseLogo],
  async () => {
    if (reuseLogo.value) {
      let logoUrl = null;
      if (scope.value === "organization") {
        // Superadmin: usa la seleccionada, Admin: usa la suya
        if (isSuperadmin.value && selectedOrganization.value) {
          const org = organizationOptions.value.find(
            (o) => Number(o.value) === Number(selectedOrganization.value)
          );
          logoUrl = org?.logo || null;
        } else if (isAdmin.value && userOrganization.value) {
          const org = organizationOptions.value.find(
            (o) => Number(o.value) === Number(userOrganization.value)
          );
          logoUrl = org?.logo || null;
        }
      } else {
        logoUrl = getScopeLogo();
      }
      profilePreview.value = logoUrl || null;
      logo.value = null;
      return;
    }
    if (!reuseLogo.value && logo.value) {
      if (typeof logo.value === "object") {
        const imgFile = Array.isArray(logo.value) ? logo.value[0] : logo.value;
        profilePreview.value = URL.createObjectURL(imgFile);
      } else if (typeof logo.value === "string") {
        profilePreview.value = logo.value;
      }
    } else if (!reuseLogo.value) {
      profilePreview.value = null;
    }
  }
);

// --- INTEGRACIÓN: Forzar carga de ubicaciones para sponsor cuando selecciona "Ubicación" ---
watch(
  [scope, businessId],
  async ([newScope, newBusinessId], [oldScope, oldBusinessId]) => {
    if (
      newScope === "business_unit" &&
      isSponsor.value &&
      newBusinessId &&
      (oldScope !== "business_unit" || !oldBusinessId)
    ) {
      await fetchBusinessUnits();
    }
  }
);
// --- FIN INTEGRACIÓN ---

// --- INTEGRACIÓN EXTRA: Forzar carga inicial si ya está seteado el businessId (caso sponsor) ---
watch(scope, async (newScope) => {
  if (newScope === "business_unit" && isSponsor.value && businessId.value) {
    await fetchBusinessUnits();
  }
});
// --- FIN INTEGRACIÓN EXTRA ---

const isLoading = ref(false);

onMounted(async () => {
  await fetchAllUsers();
  await fetchOrganizations();
  await fetchBusinesses();
  await fetchGroups();
  if (isAdmin.value || isSponsor.value) await fetchOrgRolesForAdmin();

  if (isAdmin.value && userOrganization.value && organizationOptions.value.length === 0) {
    const res = await axiosInstance.get(`/organizations/${userOrganization.value}`);
    const org = res.data.data;
    organizationOptions.value = [
      {
        ...org,
        title: `${org.folio} - ${org.legal_name}`,
        value: org.id,
        logo: org.logo || null,
      },
    ];
  }
});

const validate = async () => {
  if (!validateAllFields()) {
    isLoading.value = false;
    return;
  }
  try {
    isLoading.value = true;
    const formData = new FormData();
    formData.append("name", name.value);
    formData.append("description", description.value);

    const supervisorRole =
      filteredOrgRoles.value.find((r) => Number(r.id) === Number(supervisor.value)) ||
      orgRolesForAdmin.value.find((r) => Number(r.id) === Number(supervisor.value)) ||
      allRoles.value.find((r) => Number(r.id) === Number(supervisor.value));
    if (supervisorRole) formData.append("supervisor_role_id", supervisorRole.id);

    auditors.value.forEach((id) => {
      formData.append("auditor_role_ids[]", id);
    });
    audited.value.forEach((id) => {
      formData.append("auditado_role_ids[]", id);
    });

    formData.append("frequency", frequency.value);
    formData.append("assignment_scope", scope.value);
    formData.append("has_rating", hasRating.value ? "1" : "0");
    formData.append("use_scope_logo", reuseLogo.value ? "1" : "0");
    if (!reuseLogo.value && logo.value) {
      formData.append("logo", logo.value);
    }

    let orgId = null;
    if (scope.value === "organization") {
      orgId =
        isSuperadmin.value && selectedOrganization.value
          ? Number(selectedOrganization.value)
          : Number(user.value?.organization_id);
    } else if (scope.value === "business" && businessId.value) {
      const b = businesses.value.find((bb) => Number(bb.id) === Number(businessId.value));
      orgId =
        b && typeof b.organization_id !== "undefined" ? Number(b.organization_id) : null;
    } else if (scope.value === "business_unit" && businessUnitId.value) {
      const unit = businessUnits.value.find(
        (u) => Number(u.id) === Number(businessUnitId.value)
      );
      orgId =
        unit && typeof unit.organization_id !== "undefined"
          ? Number(unit.organization_id)
          : null;
    } else if (scope.value === "business_unit_group" && groupId.value) {
      const group = groups.value.find((g) => Number(g.id) === Number(groupId.value));
      orgId =
        group && typeof group.organization_id !== "undefined"
          ? Number(group.organization_id)
          : null;
    }
    if (orgId) formData.append("organization_id", orgId);

    if (scope.value === "business") {
      formData.append("business_id", Number(businessId.value));
      formData.append("business_unit_id", "");
      formData.append("business_unit_group_id", "");
    }
    if (scope.value === "business_unit") {
      formData.append("business_unit_id", Number(businessUnitId.value));
      formData.append("business_id", "");
      formData.append("business_unit_group_id", "");
    }
    if (scope.value === "business_unit_group") {
      formData.append("business_unit_group_id", Number(groupId.value));
      formData.append("business_id", "");
      formData.append("business_unit_id", "");
    }
    if (scope.value === "organization") {
      formData.append("business_id", "");
      formData.append("business_unit_id", "");
      formData.append("business_unit_group_id", "");
    }

    const res = await axiosInstance.post("/forms", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    toast.success("Formulario creado correctamente");
    const newForm = res.data.form;
    if (newForm && newForm.id) {
      router.push({ name: "Forms Show", params: { id: newForm.id } });
    }
  } catch (err) {
    toast.error("Error al crear el formulario");
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
          <v-btn
            icon
            variant="text"
            class="px-3 py-2"
            style="border-radius: 8px; border: 1px solid #ccc"
            @click="goBack"
          >
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

          <!-- Izquierda: preview -->
          <v-col
            cols="12"
            md="6"
            class="d-flex flex-column align-center justify-center"
            style="min-height: 300px"
          >
            <template v-if="profilePreview">
              <img
                :src="profilePreview"
                alt="Logo Preview"
                style="max-width: 300px; max-height: 300px; border-radius: 12px"
              />
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

            <!-- ORGANIZACION (solo superadmin) -->
            <div
              v-if="scope === 'organization' && isSuperadmin"
              class="mt-4 alcance-select alcance-superadmin-select"
            >
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

            <!-- EMPRESA -->
            <div v-if="scope === 'business'" class="mt-4 alcance-select">
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
                />
              </div>
              <v-label>Empresa <span class="text-error">*</span></v-label>
              <!-- Sponsor: input oculto, valor automático -->
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
                v-else
                v-model="businessId"
                :items="businessOptions"
                item-title="customLabel"
                item-value="id"
                variant="outlined"
                color="primary"
                class="mt-2 alcance-select"
                clearable
                required
                :error-messages="fieldErrors.businessId"
                :no-data-text="
                  isSuperadmin && !selectedBusinessOrganization
                    ? 'Selecciona una organización primero'
                    : 'Sin empresas disponibles'
                "
                @update:model-value="clearFieldError('businessId')"
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
              <!-- Sponsor: input oculto, valor automático -->
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
              <v-label v-if="!isSponsor"
                >Empresa <span class="text-error">*</span></v-label
              >
              <v-select
                v-if="!isSponsor"
                v-model="businessId"
                :items="businessOptions"
                item-title="customLabel"
                item-value="id"
                variant="outlined"
                color="primary"
                class="mt-2 alcance-select"
                clearable
                required
                :error-messages="fieldErrors.businessId"
                :no-data-text="
                  isSuperadmin && !selectedBusinessOrganization
                    ? 'Selecciona una organización primero'
                    : 'Sin empresas disponibles'
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
                :no-data-text="
                  !businessId
                    ? 'Selecciona una empresa primero'
                    : businessUnits.length === 0
                    ? 'No hay ubicaciones disponibles'
                    : 'Sin ubicaciones disponibles'
                "
                @update:model-value="clearFieldError('businessUnitId')"
              />
            </div>

            <!-- GRUPO -->
            <div v-if="scope === 'business_unit_group'" class="mt-4 alcance-select">
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
                />
              </div>
              <!-- Mostrar select de empresa para superadmin y admin -->
              <div v-if="isSuperadmin || isAdmin" class="mb-2">
                <v-label>Empresa <span class="text-error">*</span></v-label>
                <v-select
                  v-model="selectedGroupBusiness"
                  :items="groupBusinessOptions"
                  item-title="customLabel"
                  item-value="id"
                  variant="outlined"
                  color="primary"
                  class="mt-2 alcance-select"
                  clearable
                  required
                  :error-messages="fieldErrors.groupBusiness"
                  :no-data-text="
                    isSuperadmin && !selectedGroupOrganization
                      ? 'Selecciona una organización primero'
                      : 'Sin empresas disponibles'
                  "
                />
              </div>
              <v-label>Grupo <span class="text-error">*</span></v-label>
              <v-select
                v-model="groupId"
                :items="groupGroupOptions"
                item-title="customLabel"
                item-value="id"
                variant="outlined"
                color="primary"
                class="mt-2 alcance-select"
                clearable
                required
                :error-messages="fieldErrors.groupId"
                :no-data-text="
                  selectedGroupBusiness
                    ? 'Sin grupos disponibles'
                    : 'Selecciona una empresa primero'
                "
                @update:model-value="clearFieldError('groupId')"
              />
            </div>

            <!-- Logo -->
            <div v-if="scope" class="mt-4">
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
                :messages="[
                  'Solo se permiten imágenes JPEG, PNG o JPG. Tamaño máximo: 2MB.',
                ]"
                :error-messages="fieldErrors.logo"
                @update:model-value="clearFieldError('logo')"
              />
              <div class="d-flex align-center mb-2 logo-checkbox">
                <v-checkbox
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
                  :disabled="!scopeLogoAvailable"
                />
              </div>
              <!-- Mensaje de error en rojo debajo del checkbox, alineado a la derecha -->
              <div
                v-if="!scopeLogoAvailable"
                class="text-error"
                style="
                  margin-top: -8px;
                  margin-bottom: 8px;
                  font-size: 0.95rem;
                  margin-left: 36px;
                "
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
                <v-label
                  >Organización para filtrar roles
                  <span class="text-error">*</span></v-label
                >
                <v-icon
                  :icon="mdiInformationSlabCircleOutline"
                  color="primary"
                  size="22"
                  class="ml-2"
                  style="cursor: pointer"
                />
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
                scope === 'business_unit_group'
                  ? 'Selecciona manualmente los roles auditados para el grupo'
                  : `${getAssignmentRoles.length} roles disponibles`
              "
              persistent-hint
              :error-messages="fieldErrors.audited"
              :disabled="scope === 'business_unit_group'"
              :readonly="scope === 'business_unit_group'"
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
              Se han asignado automáticamente {{ audited.length }} roles de las unidades
              del grupo seleccionado.
            </v-alert>
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12" class="d-flex justify-end">
            <v-btn
              color="primary"
              class="mt-6"
              :loading="isLoading"
              :disabled="isLoading"
              @click="validate"
            >
              <template v-slot:loader
                ><v-progress-circular indeterminate color="white" size="20"
              /></template>
              {{ isLoading ? "Creando Formulario..." : "Crear Formulario" }}
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
