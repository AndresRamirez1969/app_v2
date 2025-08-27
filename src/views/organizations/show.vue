<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import axiosInstance from '@/utils/axios';
import { mdiArrowLeft, mdiPencil, mdiCancel, mdiCheckCircle, mdiChevronDown, mdiDotsHorizontal, mdiEye } from '@mdi/js';
import StatusChip from '@/components/status/StatusChip.vue';
import { useAuthStore } from '@/stores/auth';
import { findCountryByCode } from '@/utils/constants/countries';

const router = useRouter();
const route = useRoute();
const { mdAndDown } = useDisplay();
const organization = ref(null);
const auth = useAuthStore();
const businesses = ref([]);
const businessUnits = ref([]);
const users = ref([]);

const user = computed(() => auth.user || { roles: [], permissions: [] });
const roles = computed(() => user.value.roles || []);
const permissions = computed(() => user.value.permissions || []);

const isSuperadmin = computed(() => roles.value.includes('superadmin'));
const isAdmin = computed(() => roles.value.includes('admin'));
const canView = computed(() => permissions.value.includes('organization.view'));
const canEditPermission = computed(() => permissions.value.includes('organization.update'));

const canShow = computed(() => isSuperadmin.value || isAdmin.value || roles.value.includes('sponsor') || canView.value);

const canEdit = computed(() => isSuperadmin.value || isAdmin.value || canEditPermission.value);

const canToggleStatus = computed(() => isSuperadmin.value || isAdmin.value);

const canBusinessEdit = computed(() => permissions.value.includes('business.update'));
const canBusinessView = computed(() => permissions.value.includes('business.view'));
const canBusinessActions = computed(() => canBusinessView.value || canBusinessEdit.value || canToggleStatus.value);

const canBusinessUnitEdit = computed(() => permissions.value.includes('businessUnit.update'));
const canBusinessUnitView = computed(() => permissions.value.includes('businessUnit.view'));
const canBusinessUnitActions = computed(() => canBusinessUnitView.value || canBusinessUnitEdit.value || canToggleStatus.value);

const canUserEdit = computed(() => permissions.value.includes('user.update'));
const canUserView = computed(() => permissions.value.includes('user.view'));
const canUserActions = computed(() => canUserView.value || canUserEdit.value || canToggleStatus.value);

const showBusinessTable = computed(() => (isSuperadmin.value || isAdmin.value) && !mdAndDown.value);

const isActive = computed(() => organization.value?.status === 'activa' || organization.value?.status === 'active');

const goToEdit = () => {
  if (organization.value?.id) {
    router.push({ path: `/organizaciones/editar/${organization.value.id}` });
  }
};

const goToIndex = () => {
  router.push('/organizaciones');
};

const goToBusinessEdit = (bus) => router.push({ path: `/empresas/editar/${bus.id}` });
const goToBusinessShow = (bus) => router.push({ path: `/empresas/${bus.id}` });

const goToBusinessUnitEdit = (unit) => router.push({ path: `/ubicaciones/editar/${unit.id}` });
const goToBusinessUnitShow = (unit) => router.push({ path: `/ubicaciones/${unit.id}` });

const goToUserEdit = (user) => router.push({ path: `/usuarios/editar/${user.id}` });
const goToUserShow = (user) => router.push({ path: `/usuarios/${user.id}` });

const toggleStatus = async () => {
  if (!organization.value) return;
  const newStatus = isActive.value ? 'inactive' : 'active';
  try {
    const res = await axiosInstance.put(`/organizations/${organization.value.id}`, {
      status: newStatus
    });
    organization.value.status = res.data.status || newStatus;
  } catch (err) {
    alert('No se pudo cambiar el estatus');
    console.error('Detalle del error:', err?.response?.data || err);
  }
};

const toggleBusinessStatus = async (bus) => {
  if (!canToggleStatus.value) return;
  const isActive = bus.status === 'activa' || bus.status === 'active';
  const newStatus = isActive ? 'inactive' : 'active';
  try {
    const res = await axiosInstance.put(`/businesses/${bus.id}`, {
      status: newStatus
    });
    bus.status = res.data.status || newStatus;
  } catch (err) {
    alert('No se pudo cambiar el estatus');
  }
};

const toggleBusinessUnitStatus = async (unit) => {
  if (!canToggleStatus.value) return;
  const isActive = unit.status === 'activa' || unit.status === 'active';
  const newStatus = isActive ? 'inactive' : 'active';
  try {
    const res = await axiosInstance.put(`/business-units/${unit.id}`, {
      status: newStatus
    });
    unit.status = res.data.status || newStatus;
  } catch (err) {
    alert('No se pudo cambiar el estatus');
  }
};

const toggleUserStatus = async (user) => {
  if (!canToggleStatus.value) return;
  const isActive = user.status === 'activo' || user.status === 'active';
  const newStatus = isActive ? 'inactive' : 'active';
  try {
    const res = await axiosInstance.put(`/users/${user.id}`, {
      status: newStatus
    });
    user.status = res.data.status || newStatus;
  } catch (err) {
    alert('No se pudo cambiar el estatus del usuario');
  }
};

const formatAddress = (address) => {
  if (!address) return 'No disponible';
  const parts = [
    address.street,
    address.outdoor_number,
    address.indoor_number,
    address.neighborhood,
    address.city,
    address.postal_code,
    address.state,
    address.country
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : 'No disponible';
};

const truncate = (text, max = 60) => (!text ? '' : text.length > max ? text.slice(0, max) + '...' : text);

// Helper para mostrar teléfono con bandera y prefijo
function formatPhone(person) {
  if (!person || !person.phone_number) return 'No disponible';
  const country = findCountryByCode(person.phone_country);
  const flag = country?.flag || '';
  const dial = country?.dial_code || '';
  return `${flag ? flag + ' ' : ''}${dial ? dial + ' ' : ''}${person.phone_number}`;
}

onMounted(async () => {
  try {
    const id = route.params.id;
    const res = await axiosInstance.get(`/organizations/${id}`);
    const org = res.data.organization || res.data.data || res.data;
    organization.value = org;
    businesses.value = org.businesses || [];
    businessUnits.value = org.business_units || [];
    users.value = org.users || [];
  } catch (err) {
    console.error('Error al obtener la organización:', err);
  }
});
</script>

<template>
  <v-container fluid v-if="canShow">
    <v-row class="align-center mb-6" no-gutters>
      <v-col cols="auto" class="d-flex align-center">
        <template v-if="isSuperadmin">
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
        <h3 class="font-weight-medium ml-3 mb-0 d-none d-md-block" v-if="organization">
          {{ organization.folio ? `${organization.folio}` : '' }}
          {{ organization.legal_name ? `- ${organization.legal_name}` : '- Organización' }}
        </h3>
        <h3 class="font-weight-medium ml-3 mb-0 d-block d-md-none" v-if="organization">
          {{ organization.folio ? `${organization.folio}` : '' }}
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
                <v-list-item @click="toggleStatus">
                  <template #prepend>
                    <v-icon :icon="isActive ? mdiCancel : mdiCheckCircle" size="16" />
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
                <v-list-item @click="toggleStatus">
                  <template #prepend>
                    <v-icon :icon="isActive ? mdiCancel : mdiCheckCircle" size="16" />
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
        <template v-if="organization?.logo">
          <v-img :src="organization.logo" max-width="320" max-height="320" class="rounded-lg" alt="Logo" style="background: none" />
        </template>
        <template v-else>
          <div
            class="d-flex align-center justify-center"
            style="width: 200px; height: 200px; background-color: #f5f5f5; border-radius: 12px"
          >
            <span class="text-medium-emphasis">Sin logo</span>
          </div>
        </template>
      </v-col>

      <v-col cols="12" md="8">
        <v-card-title class="font-weight-bold text-h6" style="padding-left: 0.5rem">Información general</v-card-title>
        <v-table class="rounded-lg elevation-1">
          <tbody>
            <template v-if="isSuperadmin">
              <tr>
                <td class="font-weight-bold text-subtitle-1">Estado</td>
                <td>
                  <template v-if="organization?.status">
                    <StatusChip :status="organization.status" />
                  </template>
                  <template v-else> No disponible </template>
                </td>
              </tr>
              <tr>
                <td class="font-weight-bold text-subtitle-1">Folio</td>
                <td>
                  <span v-if="organization?.folio">{{ organization.folio }}</span>
                  <span v-else>No disponible</span>
                </td>
              </tr>
            </template>
            <tr>
              <td class="font-weight-bold text-subtitle-1">Nombre legal</td>
              <td>{{ organization?.legal_name || 'No disponible' }}</td>
            </tr>
            <tr>
              <td class="font-weight-bold text-subtitle-1">Alias</td>
              <td>{{ organization?.alias || 'No disponible' }}</td>
            </tr>
            <tr>
              <td class="font-weight-bold text-subtitle-1">Descripción</td>
              <td>{{ organization?.description || 'No disponible' }}</td>
            </tr>
            <tr>
              <td class="font-weight-bold text-subtitle-1">Zona horaria</td>
              <td>
                <span v-if="organization?.timezone">{{ organization.timezone }}</span>
                <span v-else>No disponible</span>
              </td>
            </tr>
            <tr>
              <td class="font-weight-bold text-subtitle-1">Dirección</td>
              <td>
                <span v-if="organization?.address">
                  {{ formatAddress(organization.address) }}
                </span>
                <span v-else>No disponible</span>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-col>
    </v-row>

    <v-row v-if="mdAndDown">
      <v-col cols="12">
        <div style="height: 24px"></div>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <div class="font-weight-bold text-h6 mb-2" style="padding-left: 0.5rem">Contacto</div>
        <template v-if="mdAndDown">
          <v-card class="rounded-lg elevation-1 pa-0">
            <v-table class="rounded-lg elevation-0" style="border: none">
              <tbody>
                <tr>
                  <td class="font-weight-bold text-subtitle-1" style="width: 40%">Nombre</td>
                  <td>
                    <span v-if="organization?.person && (organization.person.first_name || organization.person.last_name)">
                      {{ [organization.person.first_name, organization.person.last_name].filter(Boolean).join(' ') }}
                    </span>
                    <span v-else>No disponible</span>
                  </td>
                </tr>
                <tr>
                  <td class="font-weight-bold text-subtitle-1">Correo</td>
                  <td>
                    <span v-if="organization?.person?.email">{{ organization.person.email }}</span>
                    <span v-else>No disponible</span>
                  </td>
                </tr>
                <tr>
                  <td class="font-weight-bold text-subtitle-1">Teléfono</td>
                  <td>
                    <span v-if="organization?.person?.phone_number">
                      <template v-if="organization.person.phone_country">
                        <span>
                          {{ findCountryByCode(organization.person.phone_country)?.flag || '' }}
                        </span>
                        <span style="margin-left: 6px">
                          {{ findCountryByCode(organization.person.phone_country)?.dial_code || '' }}
                        </span>
                        <span style="margin-left: 6px">
                          {{ organization.person.phone_number }}
                        </span>
                      </template>
                      <template v-else>
                        {{ organization.person.phone_number }}
                      </template>
                    </span>
                    <span v-else>No disponible</span>
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-card>
        </template>
        <template v-else>
          <v-table class="rounded-lg elevation-1">
            <thead>
              <tr>
                <th class="font-weight-bold text-subtitle-1" style="width: 10%">Nombre</th>
                <th class="font-weight-bold text-subtitle-1" style="width: 10%"></th>
                <th class="font-weight-bold text-subtitle-1" style="width: 20%">Correo</th>
                <th class="font-weight-bold text-subtitle-1" style="width: 25%">Teléfono</th>
                <th class="font-weight-bold text-subtitle-1" style="width: 15%"></th>
                <th class="font-weight-bold text-subtitle-1" style="width: 10%"></th>
                <th class="font-weight-bold text-subtitle-1" style="width: 10%"></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <span v-if="organization?.person && (organization.person.first_name || organization.person.last_name)">
                    {{ [organization.person.first_name, organization.person.last_name].filter(Boolean).join(' ') }}
                  </span>
                  <span v-else>No disponible</span>
                </td>
                <td></td>
                <td>
                  <span v-if="organization?.person?.email">{{ organization.person.email }}</span>
                  <span v-else>No disponible</span>
                </td>
                <td>
                  <span v-if="organization?.person?.phone_number">
                    <template v-if="organization.person.phone_country">
                      <span>
                        {{ findCountryByCode(organization.person.phone_country)?.flag || '' }}
                      </span>
                      <span style="margin-left: 6px">
                        {{ findCountryByCode(organization.person.phone_country)?.dial_code || '' }}
                      </span>
                      <span style="margin-left: 6px">
                        {{ organization.person.phone_number }}
                      </span>
                    </template>
                    <template v-else>
                      {{ organization.person.phone_number }}
                    </template>
                  </span>
                  <span v-else>No disponible</span>
                </td>
                <td></td>
                <td></td>
              </tr>
            </tbody>
          </v-table>
        </template>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <div style="height: 32px"></div>
      </v-col>
    </v-row>

    <!-- ...rest of the file unchanged... -->
    <v-row v-if="showBusinessTable">
      <v-col cols="12">
        <div class="font-weight-bold text-h6 mb-2" style="padding-left: 0.5rem">Empresas</div>
        <v-table class="rounded-lg elevation-1 fixed-table">
          <thead>
            <tr>
              <th class="font-weight-bold text-subtitle-1" style="width: 10%">Folio</th>
              <th class="font-weight-bold text-subtitle-1" style="width: 10%">Logo</th>
              <th class="font-weight-bold text-subtitle-1" style="width: 20%">Nombre</th>
              <th class="font-weight-bold text-subtitle-1" style="width: 25%">Dirección</th>
              <th class="font-weight-bold text-subtitle-1" style="width: 15%"></th>
              <th class="font-weight-bold text-subtitle-1" style="width: 10%">Estatus</th>
              <th class="font-weight-bold text-subtitle-1 actions-header" style="width: 10%"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="business in businesses"
              :key="business.id"
              :class="['row-clickable', { 'cursor-pointer': canBusinessView }]"
              @click="canBusinessView ? goToBusinessShow(business) : undefined"
              :style="{ cursor: canBusinessView ? 'pointer' : 'default' }"
            >
              <td class="folio-cell">
                <router-link
                  v-if="canBusinessView"
                  :to="`/empresas/${business.id}`"
                  style="text-decoration: underline; color: #1976d2 !important"
                  @click.stop
                >
                  {{ business.folio || 'No disponible' }}
                </router-link>
                <span v-else>{{ business.folio || 'No disponible' }}</span>
              </td>
              <td class="logo-cell">
                <div :class="['logo-avatar', business.logo ? 'logo-avatar-transparent' : '']">
                  <img v-if="business.logo" :src="business.logo" alt="Logo" />
                  <span v-else style="font-size: 12px; color: #888">Sin logo</span>
                </div>
              </td>
              <td class="legal-cell">{{ business.name || 'No disponible' }}</td>
              <td class="address-cell">{{ business.address ? truncate(formatAddress(business.address), 60) : 'No disponible' }}</td>
              <td></td>
              <td class="status-cell">
                <StatusChip :status="business.status" v-if="business.status" />
                <span v-else>No disponible</span>
              </td>
              <td class="actions-cell">
                <v-menu v-if="canBusinessActions" location="bottom end">
                  <template #activator="{ props }">
                    <v-btn v-bind="props" variant="text" class="pa-0" min-width="0" height="24">
                      <v-icon :icon="mdiDotsHorizontal" size="20" />
                    </v-btn>
                  </template>
                  <v-list class="custom-dropdown elevation-1 rounded-lg" style="min-width: 200px">
                    <v-list-item v-if="canBusinessView" @click="goToBusinessShow(business)">
                      <template #prepend>
                        <v-icon :icon="mdiEye" size="18" />
                      </template>
                      <v-list-item-title>Ver</v-list-item-title>
                    </v-list-item>
                    <v-divider class="my-1" v-if="canBusinessEdit && canBusinessView" />
                    <v-list-item v-if="canBusinessEdit" @click="goToBusinessEdit(business)">
                      <template #prepend>
                        <v-icon :icon="mdiPencil" size="18" />
                      </template>
                      <v-list-item-title>Editar</v-list-item-title>
                    </v-list-item>
                    <v-divider class="my-1" v-if="canToggleStatus" />
                    <v-list-item v-if="canToggleStatus" @click="toggleBusinessStatus(business)">
                      <template #prepend>
                        <v-icon
                          :icon="business.status === 'activa' || business.status === 'active' ? mdiCancel : mdiCheckCircle"
                          size="18"
                        />
                      </template>
                      <v-list-item-title>
                        {{ business.status === 'activa' || business.status === 'active' ? 'Desactivar' : 'Activar' }}
                      </v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </td>
            </tr>
            <tr v-if="businesses.length === 0">
              <td colspan="6" class="text-center text-medium-emphasis">No hay empresas relacionadas.</td>
            </tr>
          </tbody>
        </v-table>
      </v-col>
    </v-row>

    <v-row v-if="showBusinessTable">
      <v-col cols="12">
        <div style="height: 32px"></div>
      </v-col>
    </v-row>

    <v-row v-if="showBusinessTable">
      <v-col cols="12">
        <div class="font-weight-bold text-h6 mb-2" style="padding-left: 0.5rem">Ubicaciones</div>
        <v-table class="rounded-lg elevation-1 fixed-table">
          <thead>
            <tr>
              <th class="font-weight-bold text-subtitle-1" style="width: 10%">Folio</th>
              <th class="font-weight-bold text-subtitle-1" style="width: 10%">Logo</th>
              <th class="font-weight-bold text-subtitle-1" style="width: 20%">Nombre</th>
              <th class="font-weight-bold text-subtitle-1" style="width: 25%">Dirección</th>
              <th class="font-weight-bold text-subtitle-1" style="width: 15%"></th>
              <th class="font-weight-bold text-subtitle-1" style="width: 10%">Estatus</th>
              <th class="font-weight-bold text-subtitle-1 actions-header" style="width: 10%"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="unit in businessUnits"
              :key="unit.id"
              :class="['row-clickable', { 'cursor-pointer': canBusinessUnitView }]"
              @click="canBusinessUnitView ? goToBusinessUnitShow(unit) : null"
              style="cursor: pointer"
            >
              <td class="folio-cell">
                <router-link
                  v-if="canBusinessUnitView"
                  :to="`/ubicaciones/${unit.id}`"
                  style="text-decoration: underline; color: #1976d2 !important"
                  @click.stop
                >
                  {{ unit.folio || 'No disponible' }}
                </router-link>
                <span v-else>{{ unit.folio || 'No disponible' }}</span>
              </td>
              <td class="logo-cell">
                <div :class="['logo-avatar', unit.logo ? 'logo-avatar-transparent' : '']">
                  <img v-if="unit.logo" :src="unit.logo" alt="Logo" />
                  <span v-else style="font-size: 12px; color: #888">Sin logo</span>
                </div>
              </td>
              <td class="legal-cell">{{ unit.name || 'No disponible' }}</td>
              <td class="address-cell">{{ unit.address ? truncate(formatAddress(unit.address), 60) : 'No disponible' }}</td>
              <td></td>
              <td class="status-cell">
                <StatusChip :status="unit.status" v-if="unit.status" />
                <span v-else>No disponible</span>
              </td>
              <td class="actions-cell">
                <v-menu v-if="canBusinessUnitActions" location="bottom end">
                  <template #activator="{ props }">
                    <v-btn v-bind="props" variant="text" class="pa-0" min-width="0" height="24">
                      <v-icon :icon="mdiDotsHorizontal" size="20" />
                    </v-btn>
                  </template>
                  <v-list class="custom-dropdown elevation-1 rounded-lg" style="min-width: 200px">
                    <v-list-item v-if="canBusinessUnitView" @click="goToBusinessUnitShow(unit)">
                      <template #prepend>
                        <v-icon :icon="mdiEye" size="18" />
                      </template>
                      <v-list-item-title>Ver</v-list-item-title>
                    </v-list-item>
                    <v-divider class="my-1" v-if="canBusinessUnitEdit && canBusinessUnitView" />
                    <v-list-item v-if="canBusinessUnitEdit" @click="goToBusinessUnitEdit(unit)">
                      <template #prepend>
                        <v-icon :icon="mdiPencil" size="18" />
                      </template>
                      <v-list-item-title>Editar</v-list-item-title>
                    </v-list-item>
                    <v-divider class="my-1" v-if="canToggleStatus" />
                    <v-list-item v-if="canToggleStatus" @click="toggleBusinessUnitStatus(unit)">
                      <template #prepend>
                        <v-icon :icon="unit.status === 'activa' || unit.status === 'active' ? mdiCancel : mdiCheckCircle" size="18" />
                      </template>
                      <v-list-item-title>
                        {{ unit.status === 'activa' || unit.status === 'active' ? 'Desactivar' : 'Activar' }}
                      </v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </td>
            </tr>
            <tr v-if="businessUnits.length === 0">
              <td colspan="6" class="text-center text-medium-emphasis">No hay ubicaciones relacionadas.</td>
            </tr>
          </tbody>
        </v-table>
      </v-col>
    </v-row>

    <v-row v-if="showBusinessTable">
      <v-col cols="12">
        <div style="height: 32px"></div>
      </v-col>
    </v-row>

    <v-row v-if="showBusinessTable">
      <v-col cols="12">
        <div class="font-weight-bold text-h6 mb-2" style="padding-left: 0.5rem">Usuarios</div>
        <v-table class="rounded-lg elevation-1 fixed-table">
          <thead>
            <tr>
              <th class="font-weight-bold text-subtitle-1" style="width: 10%">ID</th>
              <th class="font-weight-bold text-subtitle-1" style="width: 10%">Foto</th>
              <th class="font-weight-bold text-subtitle-1" style="width: 20%">Nombre</th>
              <th class="font-weight-bold text-subtitle-1" style="width: 25%">Correo</th>
              <th class="font-weight-bold text-subtitle-1" style="width: 15%">Rol</th>
              <th class="font-weight-bold text-subtitle-1" style="width: 10%">Estatus</th>
              <th class="font-weight-bold text-subtitle-1 actions-header" style="width: 10%"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="user in users"
              :key="user.id"
              :class="['row-clickable', { 'cursor-pointer': canUserView }]"
              @click="canUserView ? goToUserShow(user) : undefined"
              :style="{ cursor: canUserView ? 'pointer' : 'default' }"
            >
              <td>
                <router-link
                  v-if="canUserView"
                  :to="`/usuarios/${user.id}`"
                  style="text-decoration: underline; color: #1976d2 !important"
                  @click.stop
                >
                  {{ user.id }}
                </router-link>
                <span v-else>{{ user.id }}</span>
              </td>
              <td style="text-align: center; vertical-align: middle">
                <div style="display: flex; align-items: center; justify-content: left">
                  <img
                    v-if="user.profile_picture"
                    :src="user.profile_picture"
                    alt="Foto de perfil"
                    style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; background: #f5f5f5"
                  />
                  <span v-else style="font-size: 12px; color: #888">Sin foto</span>
                </div>
              </td>
              <td>
                <span>
                  {{ user.name || [user.first_name, user.last_name].filter(Boolean).join(' ') || 'No disponible' }}
                </span>
              </td>
              <td>{{ user.email || 'No disponible' }}</td>
              <td>
                {{
                  Array.isArray(user.roles) && user.roles.length
                    ? typeof user.roles[0] === 'object'
                      ? user.roles[0].name === 'superadmin'
                        ? 'Super Administrador'
                        : user.roles[0].name === 'admin'
                          ? 'Administrador'
                          : user.roles[0].name === 'sponsor'
                            ? 'Sponsor'
                            : user.roles[0].name || 'No disponible'
                      : user.roles[0] === 'superadmin'
                        ? 'Super Administrador'
                        : user.roles[0] === 'admin'
                          ? 'Administrador'
                          : user.roles[0] === 'sponsor'
                            ? 'Sponsor'
                            : user.roles[0] || 'No disponible'
                    : 'No disponible'
                }}
              </td>
              <td>
                <StatusChip :status="user.status" v-if="user.status" />
                <span v-else>No disponible</span>
              </td>
              <td class="actions-cell">
                <v-menu v-if="canUserActions" location="bottom end">
                  <template #activator="{ props }">
                    <v-btn v-bind="props" variant="text" class="pa-0" min-width="0" height="24">
                      <v-icon :icon="mdiDotsHorizontal" size="20" />
                    </v-btn>
                  </template>
                  <v-list class="custom-dropdown elevation-1 rounded-lg" style="min-width: 200px">
                    <v-list-item v-if="canUserView" @click="goToUserShow(user)">
                      <template #prepend>
                        <v-icon :icon="mdiEye" size="18" />
                      </template>
                      <v-list-item-title>Ver</v-list-item-title>
                    </v-list-item>
                    <v-divider class="my-1" v-if="canUserEdit && canUserView" />
                    <v-list-item v-if="canUserEdit" @click="goToUserEdit(user)">
                      <template #prepend>
                        <v-icon :icon="mdiPencil" size="18" />
                      </template>
                      <v-list-item-title>Editar</v-list-item-title>
                    </v-list-item>
                    <v-divider class="my-1" v-if="canToggleStatus" />
                    <v-list-item v-if="canToggleStatus" @click="toggleUserStatus(user)">
                      <template #prepend>
                        <v-icon :icon="user.status === 'activo' || user.status === 'active' ? mdiCancel : mdiCheckCircle" size="18" />
                      </template>
                      <v-list-item-title>
                        {{ user.status === 'activo' || user.status === 'active' ? 'Desactivar' : 'Activar' }}
                      </v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </td>
            </tr>
            <tr v-if="users.length === 0">
              <td colspan="7" class="text-center text-medium-emphasis">No hay usuarios relacionados.</td>
            </tr>
          </tbody>
        </v-table>
      </v-col>
    </v-row>
  </v-container>
  <div v-else>
    <v-alert type="error" class="mt-10" variant="outlined" density="comfortable"> No tienes acceso a esta organización. </v-alert>
  </div>
</template>

<style scoped src="@/styles/organization.css"></style>
