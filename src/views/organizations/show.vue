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
const organization = ref(null);
const auth = useAuthStore();

const contact = ref({
  first_name: '',
  last_name: '',
  email: '',
  phone_country: '',
  phone_number: ''
});

const user = computed(() => auth.user || { roles: [], permissions: [], organization_id: null });
const roles = computed(() => user.value.roles || []);
const permissions = computed(() => user.value.permissions || []);
const userOrganizationId = computed(() => user.value.organization_id);

const isSuperadmin = computed(() => roles.value.includes('superadmin'));
const isAdmin = computed(() => roles.value.includes('admin'));
const canView = computed(() => permissions.value.includes('organization.view'));
const canEditPermission = computed(() => permissions.value.includes('organization.update'));

const canShow = computed(() => isSuperadmin.value || isAdmin.value || roles.value.includes('sponsor') || canView.value);

const canEdit = computed(() => isSuperadmin.value || isAdmin.value || canEditPermission.value);

const canToggleStatus = computed(() => isSuperadmin.value);

const isActive = computed(() => organization.value?.status === 'active');

const goToEdit = () => {
  if (organization.value?.id) {
    router.push({ path: `/organizaciones/editar/${organization.value.id}` });
  }
};

const goToIndex = () => {
  router.push('/organizaciones');
};

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

const truncate = (text, max = 50) => (!text ? '' : text.length > max ? text.slice(0, max) + '...' : text);

function formatPhone(person) {
  if (!person || !person.phone_number) return 'No disponible';
  const country = findCountryByCode(person.phone_country);
  const flag = country?.flag || '';
  const dial = country?.dial_code || '';
  return `${flag ? flag + ' ' : ''}${dial ? dial + ' ' : ''}${person.phone_number}`;
}

// Integración de zona horaria
function getTimezoneLabel(value) {
  if (!value) return 'No disponible';
  const tz = timezones.find((t) => t.value === value);
  return tz ? tz.label : value;
}

onMounted(async () => {
  try {
    const id = route.params.id;

    if (!isSuperadmin.value) {
      if (!canView.value || (userOrganizationId.value && String(userOrganizationId.value) !== String(id))) {
        router.replace('/403');
        return;
      }
    }

    const res = await axiosInstance.get(`/organizations/${id}`);
    const org = res.data.organization || res.data.data || res.data;
    organization.value = org;

    if (org.contact) {
      contact.value = {
        first_name: org.contact.first_name || '',
        last_name: org.contact.last_name || '',
        email: org.contact.email || '',
        phone_country: org.contact.phone_country || '',
        phone_number: org.contact.phone_number || ''
      };
    } else {
      contact.value = {
        first_name: '',
        last_name: '',
        email: '',
        phone_country: '',
        phone_number: ''
      };
    }
  } catch (err) {
    console.error('Error al obtener la organización:', err);
  }
});
</script>

<template>
  <v-container fluid v-if="canShow">
    <!-- Encabezado y opciones -->
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

    <!-- Información general -->
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
            </template>
            <tr>
              <td class="font-weight-bold text-subtitle-1">Folio</td>
              <td>
                <span v-if="organization?.folio">{{ organization.folio }}</span>
                <span v-else>No disponible</span>
              </td>
            </tr>
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
                <span v-if="organization?.timezone">{{ getTimezoneLabel(organization.timezone) }}</span>
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

    <div style="height: 30px"></div>

    <!-- Contacto -->
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
                    <span v-if="contact.first_name">{{ contact.first_name }}</span>
                    <span v-else>No disponible</span>
                  </td>
                </tr>
                <tr>
                  <td class="font-weight-bold text-subtitle-1" style="width: 40%">Apellido</td>
                  <td>
                    <span v-if="contact.last_name">{{ contact.last_name }}</span>
                    <span v-else>No disponible</span>
                  </td>
                </tr>
                <tr>
                  <td class="font-weight-bold text-subtitle-1">Correo</td>
                  <td>
                    <span v-if="contact.email">{{ contact.email }}</span>
                    <span v-else>No disponible</span>
                  </td>
                </tr>
                <tr>
                  <td class="font-weight-bold text-subtitle-1">Teléfono</td>
                  <td>
                    <span v-if="contact.phone_number">
                      <template v-if="contact.phone_country">
                        <span>{{ findCountryByCode(contact.phone_country)?.flag || '' }}</span>
                        <span style="margin-left: 6px">{{ findCountryByCode(contact.phone_country)?.dial_code || '' }}</span>
                        <span style="margin-left: 6px">{{ contact.phone_number }}</span>
                      </template>
                      <template v-else>
                        {{ contact.phone_number }}
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
                  <span v-if="contact.first_name">{{ contact.first_name }}</span>
                  <span v-else>No disponible</span>
                </td>
                <td></td>
                <td>
                  <span v-if="contact.last_name">{{ contact.last_name }}</span>
                  <span v-else>No disponible</span>
                </td>
                <td>
                  <span v-if="contact.email">{{ contact.email }}</span>
                  <span v-else>No disponible</span>
                </td>
                <td></td>
                <td>
                  <span v-if="contact.phone_number">
                    <template v-if="contact.phone_country">
                      <span>{{ findCountryByCode(contact.phone_country)?.flag || '' }}</span>
                      <span style="margin-left: 6px">{{ findCountryByCode(contact.phone_country)?.dial_code || '' }}</span>
                      <span style="margin-left: 6px">{{ contact.phone_number }}</span>
                    </template>
                    <template v-else>
                      {{ contact.phone_number }}
                    </template>
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

<style scoped src="@/styles/organization.css"></style>
