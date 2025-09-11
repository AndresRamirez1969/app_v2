<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import axiosInstance from '@/utils/axios';
import { mdiArrowLeft, mdiPencil, mdiCancel, mdiCheckCircle, mdiChevronDown, mdiDotsHorizontal, mdiEye } from '@mdi/js';
import StatusChip from '@/components/status/StatusChip.vue';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const route = useRoute();
const { mdAndDown } = useDisplay();
const userData = ref(null);
const auth = useAuthStore();

const organizations = ref([]);
const businesses = ref([]);
const businessUnits = ref([]);

const user = computed(() => auth.user || { roles: [], permissions: [] });
const roles = computed(() => user.value.roles || []);
const permissions = computed(() => user.value.permissions || []);

const isSuperadmin = computed(() => roles.value.includes('superadmin'));
const isAdmin = computed(() => roles.value.includes('admin'));
const isSponsor = computed(() => roles.value.includes('sponsor'));

const canView = computed(() => permissions.value.includes('user.view'));
const canEditPermission = computed(() => permissions.value.includes('user.update'));
const canViewAny = computed(() => permissions.value.includes('user.viewAny'));

const canShow = ref(false);
const canEdit = computed(() => canEditPermission.value);
const canShowArrow = computed(() => canViewAny.value);

const canToggleStatus = computed(() => (isSuperadmin.value || isAdmin.value) && userData.value && userData.value.id !== user.value.id);

const isActive = computed(() => userData.value?.status === 'activo' || userData.value?.status === 'active');

const goToEdit = () => {
  if (userData.value?.id) {
    router.push({ path: `/usuarios/editar/${userData.value.id}` });
  }
};

const goToIndex = () => {
  router.push('/usuarios');
};

const goToOrganizationShow = (org) => router.push({ path: `/organizaciones/${org.id}` });
const goToBusinessShow = (bus) => router.push({ path: `/negocios/${bus.id}` });
const goToBusinessUnitShow = (unit) => router.push({ path: `/ubicaciones/${unit.id}` });

const goToOrganizationEdit = (org) => router.push({ path: `/organizaciones/editar/${org.id}` });
const goToBusinessEdit = (bus) => router.push({ path: `/negocios/editar/${bus.id}` });
const goToBusinessUnitEdit = (unit) => router.push({ path: `/ubicaciones/editar/${unit.id}` });

// Permisos específicos para cada entidad
const canOrganizationEdit = computed(() => permissions.value.includes('organization.update'));
const canOrganizationView = computed(() => permissions.value.includes('organization.view'));
const canBusinessEdit = computed(() => permissions.value.includes('business.update'));
const canBusinessView = computed(() => permissions.value.includes('business.view'));
const canBusinessUnitEdit = computed(() => permissions.value.includes('businessUnit.update'));
const canBusinessUnitView = computed(() => permissions.value.includes('businessUnit.view'));

// Funciones para activar/desactivar con loading y actualización reactiva
const loadingStatus = ref({});
const loadingUserStatus = ref(false);

const toggleOrganizationStatus = async (org) => {
  if (!isSuperadmin.value) return;
  loadingStatus.value[`org-${org.id}`] = true;
  const isActive = org.status === 'activa' || org.status === 'active';
  const newStatus = isActive ? 'inactive' : 'active';
  try {
    const res = await axiosInstance.put(`/organizations/${org.id}`, {
      status: newStatus
    });
    const updated = { ...org, status: res.data.status || newStatus };
    organizations.value = organizations.value.map((o) => (o.id === org.id ? updated : o));
  } catch (err) {
    alert('No se pudo cambiar el estatus');
  } finally {
    loadingStatus.value[`org-${org.id}`] = false;
  }
};

// Solo superadmin y admin pueden activar/desactivar empresa, sponsor nunca puede
const canToggleBusinessStatus = (bus) => {
  if (!bus) return false;
  if (isSuperadmin.value) return true;
  if (isAdmin.value) return true;
  return false;
};

const toggleBusinessStatus = async (bus) => {
  if (!canToggleBusinessStatus(bus)) return;
  loadingStatus.value[`bus-${bus.id}`] = true;
  const isActive = bus.status === 'activa' || bus.status === 'active';
  const newStatus = isActive ? 'inactive' : 'active';
  try {
    const res = await axiosInstance.put(`/businesses/${bus.id}`, {
      status: newStatus
    });
    const updated = { ...bus, status: res.data.status || newStatus };
    businesses.value = businesses.value.map((b) => (b.id === bus.id ? updated : b));
  } catch (err) {
    alert('No se pudo cambiar el estatus');
  } finally {
    loadingStatus.value[`bus-${bus.id}`] = false;
  }
};

const toggleBusinessUnitStatus = async (unit) => {
  if (!(isSuperadmin.value || isAdmin.value || isSponsor.value || canBusinessUnitEdit.value)) return;
  loadingStatus.value[`unit-${unit.id}`] = true;
  const isActive = unit.status === 'activa' || unit.status === 'active';
  const newStatus = isActive ? 'inactive' : 'active';
  try {
    const res = await axiosInstance.put(`/business-units/${unit.id}`, {
      status: newStatus
    });
    const updated = { ...unit, status: res.data.status || newStatus };
    businessUnits.value = businessUnits.value.map((u) => (u.id === unit.id ? updated : u));
  } catch (err) {
    alert('No se pudo cambiar el estatus');
  } finally {
    loadingStatus.value[`unit-${unit.id}`] = false;
  }
};

// Activar/desactivar usuario desde el header
const toggleUserStatus = async () => {
  if (!canToggleStatus.value || !userData.value) return;
  loadingUserStatus.value = true;
  const newStatus = isActive.value ? 'inactive' : 'active';
  try {
    const res = await axiosInstance.put(`/users/${userData.value.id}`, {
      status: newStatus
    });
    userData.value = { ...userData.value, status: res.data.status || newStatus };
  } catch (err) {
    alert('No se pudo cambiar el estatus del usuario');
  } finally {
    loadingUserStatus.value = false;
  }
};

// Truncar nombre si es mobile y mayor a 13 caracteres
const displayName = computed(() => {
  if (!userData.value) return '';
  const name = userData.value.name || userData.value.email || 'Usuario';
  if (mdAndDown.value && name.length > 13) {
    return name.slice(0, 13) + '...';
  }
  return name;
});

// Formatea dirección igual que en business unit y trunca a 50 caracteres
const formatAddress = (address) => {
  if (!address) return 'No disponible';
  if (typeof address === 'string') return truncate(address, 50);
  const parts = [
    address.street,
    address.outdoor_number,
    address.neighborhood,
    address.city,
    address.postal_code,
    address.state,
    address.country
  ].filter(Boolean);
  return parts.length ? truncate(parts.join(', '), 50) : 'No disponible';
};

// Trunca texto si es mayor a max caracteres
const truncate = (text, max = 50) => (!text ? '' : text.length > max ? text.slice(0, max) + '...' : text);

// --- INTEGRACIÓN DE POLÍTICA DE ACCESO ---
onMounted(async () => {
  try {
    const id = route.params.id;
    const res = await axiosInstance.get(`/users/${id}`);
    userData.value = res.data.user || res.data.data || res.data;

    // Superadmin: acceso total
    if (roles.value.includes('superadmin')) {
      canShow.value = true;
    }
    // Admin: solo usuarios de su organización
    else if (roles.value.includes('admin')) {
      if (user.value.organization_id === userData.value.organization_id) {
        canShow.value = true;
      } else {
        canShow.value = false;
        router.replace('/403');
        return;
      }
    }
    // Sponsor: solo usuarios de su empresa y sus ubicaciones
    else if (roles.value.includes('sponsor')) {
      const sponsorEmpresaId = user.value.business_id;
      if (userData.value.business_id === sponsorEmpresaId) {
        canShow.value = true;
      } else if (userData.value.business_unit && userData.value.business_unit.empresa_id === sponsorEmpresaId) {
        canShow.value = true;
      } else {
        canShow.value = false;
        router.replace('/403');
        return;
      }
    }
    // Otros roles: sin acceso
    else {
      canShow.value = false;
      router.replace('/403');
      return;
    }

    // Cargar organización, empresa y unidad de negocio relacionadas si existen y tienes permiso
    if (userData.value.organization_id) {
      const orgRes = await axiosInstance.get(`/organizations/${userData.value.organization_id}`);
      organizations.value = [orgRes.data.organization || orgRes.data.data || orgRes.data];
    }
    if (userData.value.business_id && (permissions.value.includes('business.view') || permissions.value.includes('business.viewAny'))) {
      const busRes = await axiosInstance.get(`/businesses/${userData.value.business_id}`);
      businesses.value = [busRes.data.business || busRes.data.data || busRes.data];
    }
    if (
      userData.value.business_unit_id &&
      (permissions.value.includes('businessUnit.view') || permissions.value.includes('businessUnit.viewAny'))
    ) {
      const unitRes = await axiosInstance.get(`/business-units/${userData.value.business_unit_id}`);
      businessUnits.value = [unitRes.data.businessUnit || unitRes.data.data || unitRes.data];
    }
  } catch (err) {
    canShow.value = false;
    // Redirección si el backend responde 403
    if (err.response && err.response.status === 403) {
      router.replace('/403');
    }
    console.error('Error al obtener el usuario o sus relaciones:', err);
  }
});
</script>

<template>
  <v-container fluid v-if="canShow">
    <v-row class="align-center mb-6" no-gutters>
      <v-col cols="auto" class="d-flex align-center">
        <template v-if="canShowArrow">
          <v-btn
            icon
            variant="text"
            class="px-3 py-2"
            style="border-radius: 8px; border: 1px solid #ccc; min-width: 44px; height: 44px"
            @click="goToIndex"
          >
            <v-icon :icon="mdiArrowLeft" />
          </v-btn>
        </template>
        <h3 class="font-weight-medium ml-3 mb-0 d-none d-md-block" v-if="userData">
          {{
            userData.id ? `${userData.id} - ${userData.name || userData.email || 'Usuario'}` : userData.name || userData.email || 'Usuario'
          }}
        </h3>
        <h3 class="font-weight-medium ml-3 mb-0 d-block d-md-none" v-if="userData">
          {{ userData.id ? `${userData.id} - ${displayName}` : displayName }}
        </h3>
      </v-col>
      <v-col class="d-flex justify-end align-center">
        <template v-if="canEdit">
          <v-menu location="bottom end" v-if="!mdAndDown">
            <template #activator="{ props }">
              <v-btn
                v-bind="props"
                variant="text"
                class="px-3 py-2"
                style="border-radius: 8px; border: 1px solid #ccc; min-width: 44px; height: 44px"
              >
                Opciones
                <v-icon :icon="mdiChevronDown" end size="18" />
              </v-btn>
            </template>
            <v-list class="custom-dropdown elevation-1 rounded-lg" style="min-width: 200px">
              <v-list-item @click="goToEdit">
                <template #prepend>
                  <v-icon :icon="mdiPencil" size="16" />
                </template>
                <v-list-item-title>Editar</v-list-item-title>
              </v-list-item>
              <template v-if="canToggleStatus">
                <v-divider class="my-1" />
                <v-list-item :loading="loadingUserStatus" @click.stop="toggleUserStatus">
                  <template #prepend>
                    <v-icon :icon="isActive ? mdiCancel : mdiCheckCircle" size="18" />
                  </template>
                  <v-list-item-title>
                    {{ isActive ? 'Desactivar' : 'Activar' }}
                  </v-list-item-title>
                </v-list-item>
              </template>
            </v-list>
          </v-menu>
          <v-menu location="bottom end" v-else>
            <template #activator="{ props }">
              <v-btn
                v-bind="props"
                icon
                variant="text"
                class="pa-0"
                min-width="0"
                height="44"
                style="border-radius: 8px; border: 1px solid #ccc; min-width: 44px"
              >
                <v-icon :icon="mdiDotsHorizontal" size="24" />
              </v-btn>
            </template>
            <v-list class="custom-dropdown elevation-1 rounded-lg" style="min-width: 180px">
              <v-list-item @click="goToEdit">
                <template #prepend>
                  <v-icon :icon="mdiPencil" size="16" />
                </template>
                <v-list-item-title>Editar</v-list-item-title>
              </v-list-item>
              <template v-if="canToggleStatus">
                <v-divider class="my-1" />
                <v-list-item :loading="loadingUserStatus" @click.stop="toggleUserStatus">
                  <template #prepend>
                    <v-icon :icon="isActive ? mdiCancel : mdiCheckCircle" size="18" />
                  </template>
                  <v-list-item-title>
                    {{ isActive ? 'Desactivar' : 'Activar' }}
                  </v-list-item-title>
                </v-list-item>
              </template>
            </v-list>
          </v-menu>
        </template>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="4" class="d-flex justify-center align-center">
        <template v-if="userData?.profile_picture || userData?.profile_picture_url">
          <v-img
            :src="userData.profile_picture || userData.profile_picture_url"
            max-width="220"
            max-height="220"
            class="rounded-lg"
            alt="Foto"
            style="background: none"
          />
        </template>
        <template v-else>
          <div
            class="d-flex align-center justify-center"
            style="width: 200px; height: 200px; background-color: #f5f5f5; border-radius: 12px"
          >
            <span class="text-medium-emphasis">Sin foto</span>
          </div>
        </template>
      </v-col>

      <v-col cols="12" md="8">
        <v-card-title class="font-weight-bold text-h6" style="padding-left: 0.5rem">Información general</v-card-title>
        <v-table class="rounded-lg elevation-1">
          <tbody>
            <tr>
              <td class="font-weight-bold text-subtitle-1">Estado</td>
              <td>
                <template v-if="userData?.status">
                  <StatusChip :status="userData.status" />
                </template>
                <template v-else> No disponible </template>
              </td>
            </tr>
            <tr>
              <td class="font-weight-bold text-subtitle-1">ID</td>
              <td>
                <span v-if="userData?.id">{{ userData.id }}</span>
                <span v-else>No disponible</span>
              </td>
            </tr>
            <tr>
              <td class="font-weight-bold text-subtitle-1">Nombre</td>
              <td>{{ userData?.name || 'No disponible' }}</td>
            </tr>
            <tr>
              <td class="font-weight-bold text-subtitle-1">Correo</td>
              <td>{{ userData?.email || 'No disponible' }}</td>
            </tr>
            <tr>
              <td class="font-weight-bold text-subtitle-1">Rol</td>
              <td>
                <span v-if="userData?.roles && userData.roles.length">
                  <span v-for="(role, idx) in userData.roles" :key="role.id">
                    {{
                      role.name === 'superadmin'
                        ? 'Super Administrador'
                        : role.name === 'admin'
                          ? 'Administrador'
                          : role.name === 'sponsor'
                            ? 'Sponsor'
                            : role.name
                    }}<span v-if="idx < userData.roles.length - 1">, </span>
                  </span>
                </span>
                <span v-else>No disponible</span>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-col>
    </v-row>

    <!-- "Pertenece a" como cards en mobile, tabla en desktop -->
    <v-row v-if="!(userData?.roles && userData.roles.some((r) => r.name === 'superadmin'))">
      <v-col cols="12">
        <div class="font-weight-bold text-h6 mb-2 pertenece-title" style="padding-left: 0.5rem">Pertenece a</div>
        <template v-if="mdAndDown">
          <v-row dense>
            <template
              v-for="item in [
                ...(organizations.length ? [{ ...organizations[0], tipo: 'Organización' }] : []),
                ...(businesses.length ? [{ ...businesses[0], tipo: 'Empresa' }] : []),
                ...(businessUnits.length ? [{ ...businessUnits[0], tipo: 'Ubicación' }] : [])
              ]"
              :key="item.tipo + '-' + item.id"
            >
              <v-col cols="12" class="mb-4">
                <div class="text-subtitle-1 mb-1 pertenece-type-label">
                  {{ item.tipo }}
                </div>
                <v-card
                  class="pa-3 elevation-1 rounded-lg row-clickable"
                  style="overflow: visible; cursor: pointer"
                  @click="
                    item.tipo === 'Organización' && canOrganizationView
                      ? goToOrganizationShow(item)
                      : item.tipo === 'Empresa' && canBusinessView
                        ? goToBusinessShow(item)
                        : item.tipo === 'Ubicación' && canBusinessUnitView
                          ? goToBusinessUnitShow(item)
                          : null
                  "
                >
                  <v-row no-gutters align="center" class="mb-1">
                    <v-col cols="3" class="d-flex justify-start align-center">
                      <div class="logo-container-mobile">
                        <v-avatar v-if="item.logo" class="logo-avatar-mobile" color="grey lighten-2">
                          <img :src="item.logo" alt="Logo" class="logo-img-cover" />
                        </v-avatar>
                        <v-avatar v-else class="logo-avatar-mobile" color="grey lighten-2">
                          <span style="font-size: 12px; color: #888">Sin logo</span>
                        </v-avatar>
                      </div>
                    </v-col>
                    <v-col cols="1" />
                    <v-col cols="8">
                      <div class="d-flex align-center mb-1" style="justify-content: space-between">
                        <div class="text-caption" style="margin-right: 8px">
                          <router-link
                            v-if="item.folio"
                            :to="
                              item.tipo === 'Organización'
                                ? `/organizaciones/${item.id}`
                                : item.tipo === 'Empresa'
                                  ? `/empresas/${item.id}`
                                  : `/ubicaciones/${item.id}`
                            "
                            style="color: #1976d2; text-decoration: underline"
                            @click.stop
                          >
                            {{ item.folio }}
                          </router-link>
                        </div>
                        <StatusChip v-if="item.status" :status="item.status" />
                      </div>
                      <div class="font-weight-medium mb-1">
                        {{ item.tipo === 'Organización' ? item.legal_name || 'No disponible' : item.name || 'No disponible' }}
                      </div>
                      <div class="text-caption">
                        <strong>Dirección:</strong>
                        {{ formatAddress(item.address || item.direccion) }}
                      </div>
                    </v-col>
                  </v-row>
                </v-card>
              </v-col>
            </template>
            <v-col cols="12" v-if="!organizations.length && !businesses.length && !businessUnits.length">
              <v-card class="mb-4 pa-4 elevation-1 rounded-lg text-center text-medium-emphasis"> No hay relación asignada. </v-card>
            </v-col>
          </v-row>
        </template>
        <template v-else>
          <v-table class="rounded-lg elevation-1">
            <thead>
              <tr>
                <th class="font-weight-bold text-subtitle-1">Tipo</th>
                <th class="font-weight-bold text-subtitle-1">Folio</th>
                <th class="font-weight-bold text-subtitle-1">Logo</th>
                <th class="font-weight-bold text-subtitle-1">Nombre</th>
                <th class="font-weight-bold text-subtitle-1">Dirección</th>
                <th class="font-weight-bold text-subtitle-1">Estado</th>
                <th style="width: 60px"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in [
                  ...(organizations.length ? [{ ...organizations[0], tipo: 'Organización' }] : []),
                  ...(businesses.length ? [{ ...businesses[0], tipo: 'Empresa' }] : []),
                  ...(businessUnits.length ? [{ ...businessUnits[0], tipo: 'Ubicación' }] : [])
                ]"
                :key="item.tipo + '-' + item.id"
                class="clickable-row"
                :style="{
                  cursor:
                    (item.tipo === 'Organización' && canOrganizationView) ||
                    (item.tipo === 'Empresa' && canBusinessView) ||
                    (item.tipo === 'Ubicación' && canBusinessUnitView)
                      ? 'pointer'
                      : 'default'
                }"
                @click="
                  item.tipo === 'Organización' && canOrganizationView
                    ? goToOrganizationShow(item)
                    : item.tipo === 'Empresa' && canBusinessView
                      ? goToBusinessShow(item)
                      : item.tipo === 'Ubicación' && canBusinessUnitView
                        ? goToBusinessUnitShow(item)
                        : null
                "
              >
                <td>{{ item.tipo }}</td>
                <td>
                  <router-link
                    v-if="item.folio"
                    :to="
                      item.tipo === 'Organización'
                        ? `/organizaciones/${item.id}`
                        : item.tipo === 'Empresa'
                          ? `/empresas/${item.id}`
                          : `/ubicaciones/${item.id}`
                    "
                    style="color: #1976d2; text-decoration: underline"
                    @click.stop
                  >
                    {{ item.folio }}
                  </router-link>
                  <span v-else>No disponible</span>
                </td>
                <td>
                  <v-avatar v-if="item.logo" size="32" class="logo-avatar">
                    <img :src="item.logo" alt="Logo" class="logo-img-cover" />
                  </v-avatar>
                  <v-avatar v-else size="32" color="grey lighten-2" class="logo-avatar">
                    <span style="font-size: 12px; color: #888">Sin logo</span>
                  </v-avatar>
                </td>
                <td>
                  {{ item.tipo === 'Organización' ? item.legal_name || 'No disponible' : item.name || 'No disponible' }}
                </td>
                <td>
                  <span v-if="item.address || item.direccion">
                    {{ formatAddress(item.address || item.direccion) }}
                  </span>
                  <span v-else>No disponible</span>
                </td>
                <td>
                  <StatusChip :status="item.status" v-if="item.status" />
                  <span v-else>No disponible</span>
                </td>
                <td>
                  <v-menu location="bottom end">
                    <template #activator="{ props }">
                      <v-btn v-bind="props" icon variant="text" size="small" @click.stop>
                        <v-icon :icon="mdiDotsHorizontal" />
                      </v-btn>
                    </template>
                    <v-list class="custom-dropdown elevation-1 rounded-lg" style="min-width: 200px">
                      <!-- ORGANIZACIÓN -->
                      <v-list-item v-if="item.tipo === 'Organización' && canOrganizationView" @click.stop="goToOrganizationShow(item)">
                        <template #prepend>
                          <v-icon :icon="mdiEye" size="18" />
                        </template>
                        <v-list-item-title>Ver</v-list-item-title>
                      </v-list-item>
                      <v-divider v-if="item.tipo === 'Organización' && canOrganizationView && canOrganizationEdit" class="my-1" />
                      <v-list-item v-if="item.tipo === 'Organización' && canOrganizationEdit" @click.stop="goToOrganizationEdit(item)">
                        <template #prepend>
                          <v-icon :icon="mdiPencil" size="18" />
                        </template>
                        <v-list-item-title>Editar</v-list-item-title>
                      </v-list-item>
                      <v-divider class="my-1" v-if="item.tipo === 'Organización' && isSuperadmin" />
                      <v-list-item
                        v-if="item.tipo === 'Organización' && isSuperadmin"
                        :loading="loadingStatus[`org-${item.id}`]"
                        @click.stop="toggleOrganizationStatus(item)"
                      >
                        <template #prepend>
                          <v-icon :icon="item.status === 'activa' || item.status === 'active' ? mdiCancel : mdiCheckCircle" size="18" />
                        </template>
                        <v-list-item-title>
                          {{ item.status === 'activa' || item.status === 'active' ? 'Desactivar' : 'Activar' }}
                        </v-list-item-title>
                      </v-list-item>
                      <!-- EMPRESA -->
                      <v-list-item v-if="item.tipo === 'Empresa' && canBusinessView" @click.stop="goToBusinessShow(item)">
                        <template #prepend>
                          <v-icon :icon="mdiEye" size="18" />
                        </template>
                        <v-list-item-title>Ver</v-list-item-title>
                      </v-list-item>
                      <v-divider v-if="item.tipo === 'Empresa' && canBusinessView && canBusinessEdit" class="my-1" />
                      <v-list-item v-if="item.tipo === 'Empresa' && canBusinessEdit" @click.stop="goToBusinessEdit(item)">
                        <template #prepend>
                          <v-icon :icon="mdiPencil" size="18" />
                        </template>
                        <v-list-item-title>Editar</v-list-item-title>
                      </v-list-item>
                      <v-divider class="my-1" v-if="item.tipo === 'Empresa' && canToggleBusinessStatus(item)" />
                      <v-list-item
                        v-if="item.tipo === 'Empresa' && canToggleBusinessStatus(item)"
                        :loading="loadingStatus[`bus-${item.id}`]"
                        @click.stop="toggleBusinessStatus(item)"
                      >
                        <template #prepend>
                          <v-icon :icon="item.status === 'activa' || item.status === 'active' ? mdiCancel : mdiCheckCircle" size="18" />
                        </template>
                        <v-list-item-title>
                          {{ item.status === 'activa' || item.status === 'active' ? 'Desactivar' : 'Activar' }}
                        </v-list-item-title>
                      </v-list-item>
                      <!-- UBICACIÓN -->
                      <v-list-item v-if="item.tipo === 'Ubicación' && canBusinessUnitView" @click.stop="goToBusinessUnitShow(item)">
                        <template #prepend>
                          <v-icon :icon="mdiEye" size="18" />
                        </template>
                        <v-list-item-title>Ver</v-list-item-title>
                      </v-list-item>
                      <v-divider v-if="item.tipo === 'Ubicación' && canBusinessUnitView && canBusinessUnitEdit" class="my-1" />
                      <v-list-item v-if="item.tipo === 'Ubicación' && canBusinessUnitEdit" @click.stop="goToBusinessUnitEdit(item)">
                        <template #prepend>
                          <v-icon :icon="mdiPencil" size="18" />
                        </template>
                        <v-list-item-title>Editar</v-list-item-title>
                      </v-list-item>
                      <v-divider
                        class="my-1"
                        v-if="item.tipo === 'Ubicación' && (isSuperadmin || isAdmin || isSponsor || canBusinessUnitEdit)"
                      />
                      <v-list-item
                        v-if="item.tipo === 'Ubicación' && (isSuperadmin || isAdmin || isSponsor || canBusinessUnitEdit)"
                        :loading="loadingStatus[`unit-${item.id}`]"
                        @click.stop="toggleBusinessUnitStatus(item)"
                      >
                        <template #prepend>
                          <v-icon :icon="item.status === 'activa' || item.status === 'active' ? mdiCancel : mdiCheckCircle" size="18" />
                        </template>
                        <v-list-item-title>
                          {{ item.status === 'activa' || item.status === 'active' ? 'Desactivar' : 'Activar' }}
                        </v-list-item-title>
                      </v-list-item>
                    </v-list>
                  </v-menu>
                </td>
              </tr>
              <tr v-if="!organizations.length && !businesses.length && !businessUnits.length">
                <td colspan="7" class="text-center text-medium-emphasis">No hay relación asignada.</td>
              </tr>
            </tbody>
          </v-table>
        </template>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped src="@/styles/users.css"></style>
