<template>
  <v-container fluid v-if="canShow">
    <v-row class="align-center mb-6" no-gutters>
      <v-col cols="auto" class="d-flex align-center">
        <!-- Flecha y header solo para superadmin -->
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
          <!-- Desktop/iPad header -->
          <h3 class="font-weight-medium ml-3 mb-0 d-none d-md-block" v-if="organization">
            {{ organization.folio ? `${organization.folio}` : '' }}
            {{ organization.legal_name ? `- ${organization.legal_name}` : '- Organización' }}
          </h3>
          <!-- Mobile header -->
          <h3 class="font-weight-medium ml-3 mb-0 d-block d-md-none" v-if="organization">
            {{ organization.folio ? `${organization.folio}` : '' }}
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
              <v-divider class="my-1" />
              <v-list-item @click="toggleStatus">
                <template #prepend>
                  <v-icon :icon="isActive ? mdiCancel : mdiCheckCircle" size="16" />
                </template>
                <v-list-item-title>
                  {{ isActive ? 'Desactivar' : 'Activar' }}
                </v-list-item-title>
              </v-list-item>
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
              <v-divider class="my-1" />
              <v-list-item @click="toggleStatus">
                <template #prepend>
                  <v-icon :icon="isActive ? mdiCancel : mdiCheckCircle" size="16" />
                </template>
                <v-list-item-title>
                  {{ isActive ? 'Desactivar' : 'Activar' }}
                </v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </template>
      </v-col>
    </v-row>

    <v-row>
      <!-- Logo -->
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

      <!-- Tabla de detalles -->
      <v-col cols="12" md="8">
        <v-card-title class="font-weight-bold text-h6" style="padding-left: 0.5rem">Información general</v-card-title>
        <v-table class="rounded-lg elevation-1">
          <tbody>
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

    <!-- Tabla de contacto full length -->
    <v-row>
      <v-col cols="12">
        <div class="font-weight-bold text-h6 mb-2" style="padding-left: 0.5rem">Contacto</div>
        <v-table class="rounded-lg elevation-1">
          <thead>
            <tr>
              <th class="font-weight-bold text-subtitle-1" style="width: 33%">Nombre</th>
              <th class="font-weight-bold text-subtitle-1" style="width: 33%">Email</th>
              <th class="font-weight-bold text-subtitle-1" style="width: 33%">Teléfono</th>
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
              <td>
                <span v-if="organization?.person?.email">{{ organization.person.email }}</span>
                <span v-else>No disponible</span>
              </td>
              <td>
                <span v-if="organization?.person?.phone_number">{{ organization.person.phone_number }}</span>
                <span v-else>No disponible</span>
              </td>
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

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import axiosInstance from '@/utils/axios';
import { mdiArrowLeft, mdiPencil, mdiCancel, mdiCheckCircle, mdiChevronDown, mdiDotsHorizontal } from '@mdi/js';
import StatusChip from '@/components/status/StatusChip.vue';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const route = useRoute();
const { mdAndDown } = useDisplay();
const organization = ref(null);
const auth = useAuthStore();

const user = computed(() => auth.user || { roles: [], permissions: [] });
const roles = computed(() => user.value.roles?.map((r) => r.name) || []);
const permissions = computed(() => user.value.permissions || []);

const isSuperadmin = computed(() => roles.value.includes('superadmin'));
const isAdmin = computed(() => roles.value.includes('admin'));
const canView = computed(() => permissions.value.includes('organization.view'));
const canEditPermission = computed(() => permissions.value.includes('organization.update'));

const canShow = computed(() => isSuperadmin.value || isAdmin.value || roles.value.includes('sponsor') || canView.value);

const canEdit = computed(() => isSuperadmin.value || isAdmin.value || canEditPermission.value);

const isActive = computed(() => organization.value?.status === 'activa' || organization.value?.status === 'active');

const goToEdit = () => {
  if (organization.value?.id) {
    router.push({ path: `/organizaciones-dw/${organization.value.id}/edit` });
  }
};

// Nueva función para ir siempre al index
const goToIndex = () => {
  router.push('/organizaciones-dw');
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
    address.neighborhood,
    address.city,
    address.postal_code,
    address.state,
    address.country
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : 'No disponible';
};

onMounted(async () => {
  try {
    const id = route.params.id;
    const res = await axiosInstance.get(`/organizations/${id}`);
    if (res.data.data && res.data.data.folio) {
      organization.value = res.data.data;
    } else if (res.data.folio) {
      organization.value = res.data;
    } else {
      organization.value = res.data;
    }
  } catch (err) {
    console.error('Error al obtener la organización:', err);
  }
});
</script>

<style scoped>
.elevation-1 {
  box-shadow: 0px 2px 8px 0px rgba(60, 60, 60, 0.08) !important;
}
</style>
