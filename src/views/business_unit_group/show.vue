<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import axiosInstance from '@/utils/axios';
import { mdiArrowLeft, mdiPencil, mdiCancel, mdiCheckCircle, mdiChevronDown, mdiDotsHorizontal } from '@mdi/js';
import StatusChip from '@/components/status/StatusChip.vue';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const route = useRoute();
const { mdAndDown } = useDisplay();
const group = ref(null);
const businessUnits = ref([]);
const auth = useAuthStore();

const user = computed(() => auth.user || { roles: [], permissions: [] });
const roles = computed(() => user.value.roles || []);
const permissions = computed(() => user.value.permissions || []);

const isSuperadmin = computed(() => roles.value.includes('superadmin'));
const isAdmin = computed(() => roles.value.includes('admin'));
const isSponsor = computed(() => roles.value.includes('sponsor'));
const canView = computed(() => permissions.value.includes('businessUnitGroup.view'));
const canViewAny = computed(() => permissions.value.includes('businessUnitGroup.viewAny'));
const canEdit = computed(() => permissions.value.includes('businessUnitGroup.update'));
const canToggleStatus = computed(() => isSuperadmin.value || isAdmin.value || isSponsor.value);

const isActive = computed(() => group.value?.status === 'activa' || group.value?.status === 'active');

const goToEdit = () => {
  if (group.value?.id) {
    router.push({ path: `/grupos-de-ubicaciones/editar/${group.value.id}` });
  }
};

const goToIndex = () => {
  router.push('/grupos-de-ubicaciones');
};

const goToBusinessUnitShow = (unit) => router.push({ path: `/ubicaciones-de-ubicaciones/${unit.id}` });

const formatAddress = (address) => {
  if (!address) return 'No disponible';
  if (typeof address === 'string') return address;
  if (address.address && typeof address.address === 'object') address = address.address;

  const street = address.street || address.calle || '';
  const outdoor = address.outdoor_number || address.numero_exterior || address.num_ext || '';
  const neighborhood = address.neighborhood || address.colonia || '';
  const city = address.city || address.ciudad || '';
  const postal = address.postal_code || address.cp || address.codigo_postal || '';
  const state = address.state || address.estado || '';
  const country = address.country || address.pais || '';

  let parts = [];
  if (street) parts.push(street);
  if (outdoor) parts.push(outdoor);
  if (neighborhood) parts.push(neighborhood);
  if (city) parts.push(city);
  if (postal) parts.push(postal);
  if (state) parts.push(state);
  if (country) parts.push(country);

  return parts.length ? parts.join(', ') : 'No disponible';
};

const truncate = (text, max = 80) => (!text ? '' : text.length > max ? text.slice(0, max) + '...' : text);

// Para debug: muestra el objeto completo de cada unidad y busca el campo de dirección
watch(businessUnits, (units) => {
  units.forEach((unit, i) => {
    console.log(`unit[${i}]`, unit);
  });
});

// Para mostrar address en la tabla y loguear en cada render
const logAndFormatAddress = (unit, idx) => {
  console.log('Render unit', idx, unit);
  return formatAddress(unit.address);
};

const toggleStatus = async () => {
  if (!group.value) return;
  const newStatus = isActive.value ? 'inactive' : 'active';
  try {
    const res = await axiosInstance.put(`/business-unit-groups/${group.value.id}`, {
      status: newStatus
    });
    group.value.status = res.data.status || newStatus;
  } catch (err) {
    alert('No se pudo cambiar el estatus');
    console.error('Detalle del error:', err?.response?.data || err);
  }
};

onMounted(async () => {
  if (!canView.value) return;
  try {
    const id = route.params.id;
    // INTEGRACIÓN: Pedimos los business units con address incluido
    const res = await axiosInstance.get(`/business-unit-groups/${id}?with=businessUnits.address`);
    // Si tu backend no soporta el parámetro ?with=..., simplemente asegúrate que el backend incluya address en cada business unit
    group.value = res.data || res.data.group || res.data.data;
    // Busca el array correcto
    businessUnits.value = group.value.business_units || group.value.businessUnits || [];
  } catch (err) {
    console.error('Error al obtener el grupo o las ubicaciones:', err);
  }
});
</script>

<template>
  <v-container fluid v-if="canView">
    <!-- Header -->
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
        </template>
        <h3 class="font-weight-medium ml-3 mb-0 d-none d-md-block" v-if="group">
          {{ group.id ? `${group.id}` : '' }}
          {{ group.name ? `- ${group.name}` : '- Grupo' }}
        </h3>
        <h3 class="font-weight-medium ml-3 mb-0 d-block d-md-none" v-if="group">
          {{ group.id ? `${group.id}` : '' }}
        </h3>
      </v-col>
      <v-col class="d-flex justify-end align-center">
        <template v-if="canEdit || canToggleStatus">
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
              <v-list-item v-if="canEdit" @click="goToEdit">
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
              <v-list-item v-if="canEdit" @click="goToEdit">
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

    <!-- Título fuera del card -->
    <v-row>
      <v-col cols="12" class="mb-2">
        <div class="font-weight-bold text-h6">Información General</div>
      </v-col>
    </v-row>

    <!-- Card de información general full length, con sombra igual que las business units -->
    <v-row>
      <v-col cols="12">
        <v-card class="rounded-lg pa-4 mb-6 elevation-1 info-card-effect">
          <v-table class="rounded-lg elevation-0" style="border: none">
            <tbody>
              <tr>
                <td class="font-weight-bold text-subtitle-1" style="width: 40%">Estatus</td>
                <td>
                  <StatusChip :status="group?.status" v-if="group?.status" />
                  <span v-else>No disponible</span>
                </td>
              </tr>
              <tr>
                <td class="font-weight-bold text-subtitle-1">ID</td>
                <td>{{ group?.id ?? 'No disponible' }}</td>
              </tr>
              <tr>
                <td class="font-weight-bold text-subtitle-1">Nombre</td>
                <td>{{ group?.name ?? 'No disponible' }}</td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-col>
    </v-row>

    <!-- Título tabla -->
    <v-row>
      <v-col cols="12" class="mb-2">
        <div class="font-weight-bold text-h6">Ubicaciones vinculadas</div>
      </v-col>
    </v-row>

    <!-- Tabla de Business Units vinculadas full length -->
    <v-row>
      <v-col cols="12">
        <!-- Desktop Table -->
        <v-table class="rounded-lg elevation-1 fixed-table d-none d-md-table" style="width: 100%">
          <thead>
            <tr>
              <th class="folio-header font-weight-bold text-subtitle-1">Folio</th>
              <th class="logo-header font-weight-bold text-subtitle-1">Logo</th>
              <th class="legal-header font-weight-bold text-subtitle-1">Nombre</th>
              <th class="address-header font-weight-bold text-subtitle-1">Dirección</th>
              <th style="width: 15%"></th>
              <th class="status-header font-weight-bold text-subtitle-1">Estatus</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(unit, idx) in businessUnits"
              :key="unit.id || idx"
              class="row-clickable"
              @click="goToBusinessUnitShow(unit)"
              style="cursor: pointer"
            >
              <td class="folio-cell">
                <router-link :to="`/ubicaciones/${unit.id}`" style="text-decoration: underline; color: #1976d2 !important" @click.stop>
                  {{ unit.folio || 'No disponible' }}
                </router-link>
              </td>
              <td class="logo-cell">
                <v-avatar v-if="unit.logo" size="48" class="logo-avatar">
                  <img :src="unit.logo" alt="Logo" class="logo-img-cover" />
                </v-avatar>
                <v-avatar v-else size="48" color="grey lighten-2" class="d-flex align-center justify-center">
                  <span style="font-size: 12px; color: #888">Sin logo</span>
                </v-avatar>
              </td>
              <td class="legal-cell">{{ unit.legal_name || 'No disponible' }}</td>
              <td class="address-cell">
                {{ unit.address ? truncate(formatAddress(unit.address), 80) : 'No disponible' }}
              </td>
              <td></td>
              <td class="status-cell">
                <StatusChip :status="unit.status" v-if="unit.status" />
                <span v-else>No disponible</span>
              </td>
            </tr>
            <tr v-if="businessUnits.length === 0">
              <td colspan="6" class="text-center text-medium-emphasis">No hay ubicaciones vinculadas.</td>
            </tr>
          </tbody>
        </v-table>
        <!-- Mobile Cards -->
        <div class="d-md-none">
          <v-card
            v-for="(unit, idx) in businessUnits"
            :key="unit.id || idx"
            class="mb-4 pa-3 elevation-1 rounded-lg row-clickable"
            @click="goToBusinessUnitShow(unit)"
            style="cursor: pointer"
          >
            <v-row no-gutters align="center" class="mb-1">
              <v-col cols="3" class="d-flex justify-start align-center">
                <div class="logo-container-mobile">
                  <v-avatar v-if="unit.logo" class="logo-avatar-mobile" color="grey lighten-2">
                    <img :src="unit.logo" alt="Logo" class="logo-img-cover" />
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
                    <router-link :to="`/ubicaciones/${unit.id}`" @click.stop style="text-decoration: underline">
                      {{ unit.folio }}
                    </router-link>
                  </div>
                  <StatusChip :status="unit.status" />
                </div>
                <div class="font-weight-medium mb-1">{{ unit.legal_name }}</div>
                <div class="text-caption">
                  <strong>Dirección:</strong>
                  {{ unit.address ? truncate(formatAddress(unit.address), 80) : 'No disponible' }}
                </div>
              </v-col>
            </v-row>
          </v-card>
          <v-card v-if="businessUnits.length === 0" class="mb-4 pa-4 elevation-1 rounded-lg text-center">
            <div class="font-weight-bold mb-2" style="font-size: 1.5rem">No hay ubicaciones vinculadas</div>
          </v-card>
        </div>
      </v-col>
    </v-row>
  </v-container>
  <div v-else>
    <v-alert type="error" class="mt-10" variant="outlined" density="comfortable"> No tienes acceso a este grupo de ubicaciones. </v-alert>
  </div>
</template>

<style scoped src="@/styles/business_unit_group.css"></style>
