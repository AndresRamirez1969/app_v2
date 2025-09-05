<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import axiosInstance from '@/utils/axios';
import { mdiArrowLeft, mdiPencil, mdiCancel, mdiCheckCircle, mdiChevronDown, mdiDotsHorizontal } from '@mdi/js';
import StatusChip from '@/components/status/StatusChip.vue';
import { useAuthStore } from '@/stores/auth';
import { findCountryByCode } from '@/utils/constants/countries';
import { timezones } from '@/utils/constants/timezones';

const router = useRouter();
const route = useRoute();
const { mdAndDown } = useDisplay();
const business = ref(null);
const organization = ref(null);
const auth = useAuthStore();

const user = computed(() => auth.user || { roles: [], permissions: [], business_id: null, organization_id: null });
const roles = computed(() => user.value.roles || []);
const permissions = computed(() => user.value.permissions || []);
const userBusinessId = computed(() => user.value.business_id);
const userOrganizationId = computed(() => user.value.organization_id);

const isSuperadmin = computed(() => roles.value.includes('superadmin'));
const isAdmin = computed(() => roles.value.includes('admin'));
const canView = computed(() => permissions.value.includes('business.view'));
const canViewAny = computed(() => permissions.value.includes('business.viewAny'));
const canEditPermission = computed(() => permissions.value.includes('business.update'));
const canShow = computed(() => isSuperadmin.value || isAdmin.value || roles.value.includes('sponsor') || canView.value);
const canEdit = computed(() => isSuperadmin.value || isAdmin.value || canEditPermission.value);
const canToggleStatus = computed(() => isSuperadmin.value || isAdmin.value);

const isActive = computed(() => business.value?.status === 'activa' || business.value?.status === 'active');

const goToEdit = () => {
  if (business.value?.id) {
    router.push({ path: `/empresas/editar/${business.value.id}` });
  }
};

const goToIndex = () => {
  router.push('/empresas');
};

const toggleStatus = async () => {
  if (!business.value) return;
  const newStatus = isActive.value ? 'inactive' : 'active';
  try {
    const res = await axiosInstance.put(`/businesses/${business.value.id}`, {
      status: newStatus
    });
    business.value.status = res.data.status || newStatus;
  } catch (err) {
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

const truncate = (text, max = 50) => (!text ? '' : text.length > max ? text.slice(0, max) + '...' : text);

function formatPhone(contact) {
  if (!contact || !contact.phone_number) return 'No disponible';
  const country = findCountryByCode(contact.phone_country);
  const flag = country?.flag || '';
  const dial = country?.dial_code || '';
  return `${flag ? flag + ' ' : ''}${dial ? dial + ' ' : ''}${contact.phone_number}`;
}

// Get timezone label from value
function getTimezoneLabel(value) {
  if (!value) return 'No disponible';
  const tz = timezones.find((t) => t.value === value);
  return tz ? tz.label : value;
}

onMounted(async () => {
  try {
    const id = route.params.id;

    if (isSuperadmin.value) {
    } else if (isAdmin.value) {
      const res = await axiosInstance.get(`/businesses/${id}`);
      business.value = res.data.business || res.data.data || res.data;
      if (!business.value?.organization?.id || String(business.value.organization.id) !== String(userOrganizationId.value)) {
        router.replace('/403');
        return;
      }
      if (business.value?.organization?.id) {
        organization.value = business.value.organization;
      }
      return;
    } else {
      if (canViewAny.value && canView.value) {
        const res = await axiosInstance.get(`/businesses/${id}`);
        business.value = res.data.business || res.data.data || res.data;
        if (!business.value?.organization?.id || String(business.value.organization.id) !== String(userOrganizationId.value)) {
          router.replace('/403');
          return;
        }
        if (business.value?.organization?.id) {
          organization.value = business.value.organization;
        }
        return;
      } else if (canView.value && !canViewAny.value) {
        if (!userBusinessId.value || String(userBusinessId.value) !== String(id)) {
          router.replace('/403');
          return;
        }
      } else {
        router.replace('/403');
        return;
      }
    }

    const res = await axiosInstance.get(`/businesses/${id}`);

    business.value = res.data.business || res.data.data || res.data;

    if (business.value?.organization?.id) {
      organization.value = business.value.organization;
    }
  } catch (err) {
    console.error('Error al obtener la empresa:', err);
  }
});
</script>

<template>
  <v-container fluid v-if="canShow">
    <v-row class="align-center mb-6" no-gutters>
      <v-col cols="auto" class="d-flex align-center">
        <!-- Flecha solo si tiene permiso business.viewAny -->
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
        </template>
        <!-- Título siempre visible -->
        <h3 class="font-weight-medium ml-3 mb-0" v-if="business">
          {{ business.folio ? `${business.folio}` : '' }}
          {{ business?.name ? `- ${business.name}` : '- Empresa' }}
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
        <template v-if="business?.logo">
          <v-img :src="business.logo" max-width="320" max-height="320" class="rounded-lg" alt="Logo" style="background: none" />
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
            <tr v-if="isSuperadmin || isAdmin">
              <td class="font-weight-bold text-subtitle-1">Estado</td>
              <td>
                <template v-if="business?.status">
                  <StatusChip :status="business.status" />
                </template>
                <template v-else> No disponible </template>
              </td>
            </tr>
            <tr>
              <td class="font-weight-bold text-subtitle-1">Folio</td>
              <td>{{ business?.folio || 'No disponible' }}</td>
            </tr>
            <tr v-if="organization">
              <td class="font-weight-bold text-subtitle-1">Organización</td>
              <td>
                <span v-if="organization?.legal_name">
                  <router-link
                    v-if="organization.id"
                    :to="`/organizaciones/${organization.id}`"
                    style="text-decoration: underline; color: #1976d2 !important"
                  >
                    {{ organization.folio ? organization.folio + ' - ' : '' }}{{ organization.legal_name }}
                  </router-link>
                  <span v-else> {{ organization.folio ? organization.folio + ' - ' : '' }}{{ organization.legal_name }} </span>
                </span>
                <span v-else>No disponible</span>
              </td>
            </tr>
            <tr>
              <td class="font-weight-bold text-subtitle-1">Nombre</td>
              <td>{{ business?.name || 'No disponible' }}</td>
            </tr>
            <tr>
              <td class="font-weight-bold text-subtitle-1">Alias</td>
              <td>{{ business?.alias || 'No disponible' }}</td>
            </tr>
            <tr>
              <td class="font-weight-bold text-subtitle-1">Descripción</td>
              <td>{{ business?.description || 'No disponible' }}</td>
            </tr>
            <tr>
              <td class="font-weight-bold text-subtitle-1">Zona horaria</td>
              <td>
                {{ getTimezoneLabel(business?.timezone) }}
              </td>
            </tr>
            <tr>
              <td class="font-weight-bold text-subtitle-1">Dirección</td>
              <td>
                <span v-if="business?.address">
                  {{ formatAddress(business.address) }}
                </span>
                <span v-else>No disponible</span>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-col>
    </v-row>

    <v-row>
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
                    <span v-if="business?.contact?.first_name">{{ business.contact.first_name }}</span>
                    <span v-else>No disponible</span>
                  </td>
                </tr>
                <tr>
                  <td class="font-weight-bold text-subtitle-1" style="width: 40%">Apellido</td>
                  <td>
                    <span v-if="business?.contact?.last_name">{{ business.contact.last_name }}</span>
                    <span v-else>No disponible</span>
                  </td>
                </tr>
                <tr>
                  <td class="font-weight-bold text-subtitle-1">Correo</td>
                  <td>
                    <span v-if="business?.contact?.email">{{ business.contact.email }}</span>
                    <span v-else>No disponible</span>
                  </td>
                </tr>
                <tr>
                  <td class="font-weight-bold text-subtitle-1">Teléfono</td>
                  <td>
                    <span v-if="business?.contact?.phone_number">
                      {{ formatPhone(business.contact) }}
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
                  <span v-if="business?.contact?.first_name">{{ business.contact.first_name }}</span>
                  <span v-else>No disponible</span>
                </td>
                <td></td>
                <td>
                  <span v-if="business?.contact?.last_name">{{ business.contact.last_name }}</span>
                  <span v-else>No disponible</span>
                </td>
                <td>
                  <span v-if="business?.contact?.email">{{ business.contact.email }}</span>
                  <span v-else>No disponible</span>
                </td>
                <td></td>
                <td>
                  <span v-if="business?.contact?.phone_number">
                    {{ formatPhone(business.contact) }}
                  </span>
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

<style scoped src="@/styles/business.css"></style>
