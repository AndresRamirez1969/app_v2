<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import axiosInstance from '@/utils/axios';
import { mdiArrowLeft, mdiPencil, mdiCancel, mdiCheckCircle, mdiChevronDown, mdiDotsHorizontal } from '@mdi/js';
import StatusChip from '@/components/status/StatusChip.vue';
import { useAuthStore } from '@/stores/auth';

import countries from '@/utils/constants/countries';

const router = useRouter();
const route = useRoute();
const { mdAndDown } = useDisplay();

const businessUnit = ref(null);
const business = ref(null);
const organization = ref(null);

const auth = useAuthStore();
const user = computed(() => auth.user || { roles: [], permissions: [] });
const roles = computed(() => user.value.roles || []);
const permissions = computed(() => user.value.permissions || []);

const isSuperadmin = computed(() => roles.value.includes('superadmin'));
const isAdmin = computed(() => roles.value.includes('admin'));
const isSponsor = computed(() => roles.value.includes('sponsor'));

const canView = computed(() => permissions.value.includes('businessUnit.view'));
const canViewAny = computed(() => permissions.value.includes('businessUnit.viewAny'));
const canEditPermission = computed(() => permissions.value.includes('businessUnit.update'));
const canShow = ref(false);
const canEdit = computed(() => isSuperadmin.value || isAdmin.value || canEditPermission.value);
const canToggleStatus = computed(() => isSuperadmin.value || isAdmin.value || isSponsor.value);

const isActive = computed(() => businessUnit.value?.status === 'activa' || businessUnit.value?.status === 'active');

const goToEdit = () => {
  if (businessUnit.value?.id) {
    router.push({ path: `/ubicaciones/editar/${businessUnit.value.id}` });
  }
};

const goToIndex = () => {
  router.push('/ubicaciones');
};

const toggleStatus = async () => {
  if (!businessUnit.value || !canToggleStatus.value) return;

  const newStatus = isActive.value ? 'inactive' : 'active';

  const prev = businessUnit.value.status;
  businessUnit.value.status = newStatus;

  try {
    const res = await axiosInstance.put(`/business-units/${businessUnit.value.id}`, { status: newStatus });
    const confirmed = res?.data?.business_unit?.status ?? newStatus;
    businessUnit.value.status = confirmed;
  } catch (err) {
    businessUnit.value.status = prev;
    alert('No se pudo cambiar el estatus');
    console.error('Detalle del error:', err?.response?.data || err);
  }
};

const formatAddress = (address) => {
  if (!address) return 'No disponible';
  const parts = [
    address.street,
    address.outdoor_number,
    address.neighborhood,
    address.city,
    address.postal_code,
    address.state,
    address.country
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : 'No disponible';
};

function getCountryFlagAndPrefix(code) {
  if (!code) return '';
  const country = countries.find((c) => c.code === code || c.iso2 === code);
  if (!country) return code;
  return `${country.flag ? country.flag + ' ' : ''}${country.dial_code}`;
}

function getOrganizationDisplay(org) {
  if (!org) return 'No disponible';
  return `${org.folio ? org.folio : ''}${org.legal_name ? ' - ' + org.legal_name : ''}`;
}

onMounted(async () => {
  try {
    const id = route.params.id;
    const res = await axiosInstance.get(`/business-units/${id}`);
    businessUnit.value = res.data.data || res.data.business_unit || res.data;

    if (businessUnit.value?.organization) {
      organization.value = businessUnit.value.organization;
    } else if (isSuperadmin.value && businessUnit.value?.organization_id) {
      try {
        const orgRes = await axiosInstance.get(`/organizations/${businessUnit.value.organization_id}`);
        organization.value = orgRes.data.data || orgRes.data.organization || orgRes.data;
      } catch (err) {
        organization.value = null;
      }
    }

    if (businessUnit.value?.business) {
      business.value = businessUnit.value.business;
    } else if (isSuperadmin.value && businessUnit.value?.business_id) {
      try {
        const busRes = await axiosInstance.get(`/businesses/${businessUnit.value.business_id}`);
        business.value = busRes.data.data || busRes.data.business || busRes.data;
      } catch (err) {
        business.value = null;
      }
    }

    // --- ACCESS CONTROL LOGIC ---
    const userOrgId = String(user.value.organization_id ?? '');
    const userBusinessId = String(user.value.business_id ?? '');
    const unitOrgId = String(businessUnit.value.organization_id ?? '');
    const unitBusinessId = String(businessUnit.value.business_id ?? '');

    if (isSuperadmin.value) {
      canShow.value = true;
      return;
    }

    if (isAdmin.value) {
      if (unitOrgId === userOrgId) {
        canShow.value = true;
        return;
      } else {
        router.replace('/403');
        return;
      }
    }

    if (isSponsor.value) {
      // El sponsor debe tener el permiso y coincidir ambos IDs
      if (canView.value && unitOrgId === userOrgId && unitBusinessId === userBusinessId) {
        canShow.value = true;
        return;
      } else {
        router.replace('/403');
        return;
      }
    }

    if (canViewAny.value && canView.value) {
      if (unitOrgId === userOrgId && unitBusinessId === userBusinessId) {
        canShow.value = true;
        return;
      } else {
        router.replace('/403');
        return;
      }
    }

    if (canView.value) {
      if (String(user.value.business_unit_id) === String(businessUnit.value.id)) {
        canShow.value = true;
        return;
      } else {
        router.replace('/403');
        return;
      }
    }

    router.replace('/403');
  } catch (err) {
    console.error('Error al obtener la ubicación, empresa, organización:', err);
  }
});
</script>

<template>
  <v-container fluid v-if="canShow">
    <v-row class="align-center mb-6" no-gutters>
      <v-col cols="auto" class="d-flex align-center">
        <template v-if="canViewAny">
          <v-btn
            icon
            variant="text"
            class="px-3 py-2"
            style="border-radius: 8px; border: 1px solid #ccc; min-width: 44px; height: 44px"
            @click="goToIndex"
          >
            <v-icon :icon="mdiArrowLeft" />
          </v-btn>
          <h3 class="font-weight-medium ml-3 mb-0 d-none d-md-block" v-if="businessUnit">
            {{ businessUnit.folio ? `${businessUnit.folio}` : '' }}
            {{ businessUnit.name ? `- ${businessUnit.name}` : '- Ubicación' }}
          </h3>
          <h3 class="font-weight-medium ml-3 mb-0 d-block d-md-none" v-if="businessUnit">
            {{ businessUnit.folio ? `${businessUnit.folio}` : '' }}
          </h3>
        </template>
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
        <template v-if="businessUnit?.logo">
          <v-img :src="businessUnit.logo" max-width="320" max-height="320" class="rounded-lg" alt="Logo" style="background: none" />
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
            <tr>
              <td class="font-weight-bold text-subtitle-1">Estado</td>
              <td>
                <template v-if="businessUnit?.status">
                  <StatusChip :status="businessUnit.status" />
                </template>
                <template v-else> No disponible </template>
              </td>
            </tr>
            <tr>
              <td class="font-weight-bold text-subtitle-1">Folio</td>
              <td>{{ businessUnit?.folio || 'No disponible' }}</td>
            </tr>

            <!-- INTEGRACIÓN: Organización arriba de Empresa -->
            <tr v-if="organization">
              <td class="font-weight-bold text-subtitle-1">Organización</td>
              <td>
                <span v-if="organization?.id">
                  <router-link :to="`/organizaciones/${organization.id}`" style="text-decoration: underline; color: #1976d2 !important">
                    {{ getOrganizationDisplay(organization) }}
                  </router-link>
                </span>
                <span v-else>{{ getOrganizationDisplay(organization) }}</span>
              </td>
            </tr>

            <tr v-if="business">
              <td class="font-weight-bold text-subtitle-1">Empresa</td>
              <td>
                <span v-if="business?.name">
                  <router-link
                    v-if="business?.name"
                    :to="`/empresas/${business.id}`"
                    style="text-decoration: underline; color: #1976d2 !important"
                  >
                    {{ business.folio ? business.folio + ' - ' : '' }}{{ business.name }}
                  </router-link>
                  <span v-else>{{ business.folio ? business.folio + ' - ' : '' }}{{ business.name }}</span>
                </span>
                <span v-else>No disponible</span>
              </td>
            </tr>
            <tr>
              <td class="font-weight-bold text-subtitle-1">Nombre</td>
              <td>{{ businessUnit?.name || 'No disponible' }}</td>
            </tr>
            <tr>
              <td class="font-weight-bold text-subtitle-1">Alias</td>
              <td>{{ businessUnit?.alias || 'No disponible' }}</td>
            </tr>
            <tr>
              <td class="font-weight-bold text-subtitle-1">Descripción</td>
              <td>{{ businessUnit?.description || 'No disponible' }}</td>
            </tr>
            <tr>
              <td class="font-weight-bold text-subtitle-1">Zona horaria</td>
              <td>{{ businessUnit?.timezone || 'No disponible' }}</td>
            </tr>
            <tr>
              <td class="font-weight-bold text-subtitle-1">Dirección</td>
              <td>
                <span v-if="businessUnit?.address">
                  {{ formatAddress(businessUnit.address) }}
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
                    <span v-if="businessUnit?.contact?.first_name">
                      {{ businessUnit.contact.first_name }}
                    </span>
                    <span v-else>No disponible</span>
                  </td>
                </tr>
                <tr>
                  <td class="font-weight-bold text-subtitle-1">Apellido</td>
                  <td>
                    <span v-if="businessUnit?.contact?.last_name">
                      {{ businessUnit.contact.last_name }}
                    </span>
                    <span v-else>No disponible</span>
                  </td>
                </tr>
                <tr>
                  <td class="font-weight-bold text-subtitle-1">Correo</td>
                  <td>
                    <span v-if="businessUnit?.contact?.email">{{ businessUnit.contact.email }}</span>
                    <span v-else>No disponible</span>
                  </td>
                </tr>
                <tr>
                  <td class="font-weight-bold text-subtitle-1">Teléfono</td>
                  <td>
                    <span v-if="businessUnit?.contact?.phone_country && businessUnit?.contact?.phone_number">
                      <span>
                        {{ getCountryFlagAndPrefix(businessUnit.contact.phone_country) }}
                      </span>
                      <span style="margin-left: 8px">{{ businessUnit.contact.phone_number }}</span>
                    </span>
                    <span v-else-if="businessUnit?.contact?.phone_number">{{ businessUnit.contact.phone_number }}</span>
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
                <th class="font-weight-bold text-subtitle-1" style="width: 15%">Nombre</th>
                <th class="font-weight-bold text-subtitle-1" style="width: 7%"></th>
                <th class="font-weight-bold text-subtitle-1" style="width: 18%">Apellido</th>
                <th class="font-weight-bold text-subtitle-1" style="width: 25%">Correo</th>
                <th class="font-weight-bold text-subtitle-1" style="width: 10%"></th>
                <th class="font-weight-bold text-subtitle-1" style="width: 20%">Teléfono</th>
                <th class="font-weight-bold text-subtitle-1" style="width: 10%"></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <span v-if="businessUnit?.contact?.first_name">
                    {{ businessUnit.contact.first_name }}
                  </span>
                  <span v-else>No disponible</span>
                </td>
                <td></td>
                <td>
                  <span v-if="businessUnit?.contact?.last_name">
                    {{ businessUnit.contact.last_name }}
                  </span>
                  <span v-else>No disponible</span>
                </td>
                <td>
                  <span v-if="businessUnit?.contact?.email">{{ businessUnit.contact.email }}</span>
                  <span v-else>No disponible</span>
                </td>
                <td></td>
                <td>
                  <span v-if="businessUnit?.contact?.phone_country && businessUnit?.contact?.phone_number">
                    <span>
                      {{ getCountryFlagAndPrefix(businessUnit.contact.phone_country) }}
                    </span>
                    <span style="margin-left: 8px">{{ businessUnit.contact.phone_number }}</span>
                  </span>
                  <span v-else-if="businessUnit?.contact?.phone_number">{{ businessUnit.contact.phone_number }}</span>
                  <span v-else>No disponible</span>
                </td>
                <td></td>
              </tr>
            </tbody>
          </v-table>
        </template>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped src="@/styles/business_unit.css"></style>
