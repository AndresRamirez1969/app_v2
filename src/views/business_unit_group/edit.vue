<script setup>
import { ref, watch, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { mdiArrowLeft, mdiDomainOff, mdiInformationSlabCircleOutline } from '@mdi/js';
import axios from '@/utils/axios';
import BusinessUnitFilter from '../business_unit/BusinessUnitFilter.vue';
import BusinessUnitSelectTable from './BusinessUnitSelectTable.vue';
import InfoBusinessUnitGroupModal from '@/components/modals/InfoBusinessUnitGroupModal.vue';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const groupId = route.params.id;

const name = ref('');
const organizationId = ref(null);
const businessId = ref(null);
const filters = ref({});
const businessUnits = ref([]);
const selectedBusinessUnits = ref([]);
const loading = ref(false);
const page = ref(1);
const itemsPerPage = ref(10);
const total = ref(0);
const sortBy = ref('folio');
const sortDesc = ref(false);
const search = ref('');
const status = ref('active');

const showWarning = ref(false);
const showInfoModal = ref(false);

const organizationOptions = ref([]);
const organizationSearch = ref('');
const loadingOrganizations = ref(false);

const businessOptions = ref([]);
const businessSearch = ref('');
const loadingBusinesses = ref(false);

const groupFields = ref({});
const selectedBusinessUnitsFull = ref([]);

const errorMsg = ref('');

// --- INTEGRACIÓN DE ROLES Y PERMISOS ---
const user = computed(() => auth.user || { roles: [], permissions: [] });
const userRoles = computed(() => (Array.isArray(user.value.roles) ? user.value.roles : user.value.roles?.map?.((r) => r.name) || []));
const userPerms = computed(() =>
  Array.isArray(user.value.permissions) ? user.value.permissions : user.value.permissions?.map?.((p) => p.name) || []
);

const isSuperadmin = computed(() => userRoles.value.includes('superadmin'));
const isAdmin = computed(() => userRoles.value.includes('admin'));
const isSponsor = computed(() => userRoles.value.includes('sponsor'));
const isSponsorOrOther = computed(() => !isSuperadmin.value && !isAdmin.value);

let canEditUnitGroup = ref(false);

function checkCanEditUnitGroup(group) {
  const orgId = group.organization_id ?? group.organization?.id;
  const busId = group.business_id ?? group.business?.id;

  const userOrgId = user.value.organization_id;
  const userBusId = user.value.business_id;

  canEditUnitGroup.value = false;

  if (userRoles.value.includes('superadmin')) {
    canEditUnitGroup.value = true;
  } else if (userRoles.value.includes('admin')) {
    if (orgId && busId && orgId === userOrgId) {
      canEditUnitGroup.value = true;
    }
  } else if (userRoles.value.includes('sponsor')) {
    if (orgId && busId && orgId === userOrgId && busId === userBusId) {
      canEditUnitGroup.value = true;
    }
  } else if (
    userPerms.value.includes('businessUnitGroup.viewAny') &&
    userPerms.value.includes('businessUnitGroup.view') &&
    userPerms.value.includes('businessUnitGroup.update')
  ) {
    if (orgId && busId && orgId === userOrgId && busId === userBusId) {
      canEditUnitGroup.value = true;
    }
  } else if (
    userPerms.value.includes('businessUnitGroup.view') &&
    userPerms.value.includes('businessUnitGroup.update') &&
    !userPerms.value.includes('businessUnitGroup.viewAny')
  ) {
    if (busId && busId === userBusId) {
      canEditUnitGroup.value = true;
    }
  }
}

function normalizeUnits(units) {
  return (units || []).map((bu) => ({
    ...bu,
    id: Number(bu.id)
  }));
}

const fetchOrganizations = async (searchText = '') => {
  loadingOrganizations.value = true;
  try {
    const { data } = await axios.get('/organizations', {
      params: { q: searchText, limit: 10 }
    });
    organizationOptions.value = (data.data || []).map((o) => ({
      ...o,
      display: `${o.folio}${o.legal_name ? ' - ' + o.legal_name : ''}`,
      id: o.id
    }));
  } catch {
    organizationOptions.value = [];
  } finally {
    loadingOrganizations.value = false;
  }
};

const fetchBusinesses = async (searchText = '', orgId = null) => {
  loadingBusinesses.value = true;
  try {
    const params = { q: searchText, limit: 10 };
    if (orgId) params.organization_id = orgId;
    const { data } = await axios.get('/businesses', { params });
    businessOptions.value = (data.data || []).map((b) => ({
      ...b,
      display: `${b.folio}${b.name ? ' - ' + b.name : ''}`,
      id: typeof b.id === 'string' ? Number(b.id) : b.id
    }));
  } catch {
    businessOptions.value = [];
  } finally {
    loadingBusinesses.value = false;
  }
};

watch(organizationSearch, (val) => {
  if (isSuperadmin.value) fetchOrganizations(val);
});
watch(businessSearch, (val) => {
  if ((isSuperadmin.value && organizationId.value) || (isAdmin.value && organizationId.value)) fetchBusinesses(val, organizationId.value);
});
watch(organizationId, async (val, oldVal) => {
  if (isSuperadmin.value && val) {
    const prevBusinessId = businessId.value;
    businessId.value = null;
    await fetchBusinesses('', val);
    if (prevBusinessId !== null && prevBusinessId !== undefined && !businessOptions.value.some((b) => b.id === prevBusinessId)) {
      try {
        const { data: bizData } = await axios.get(`/businesses/${prevBusinessId}`);
        businessOptions.value.push({
          ...bizData.data,
          display: `${bizData.data.folio}${bizData.data.name ? ' - ' + bizData.data.name : ''}`,
          id: typeof bizData.data.id === 'string' ? Number(bizData.data.id) : bizData.data.id
        });
      } catch (e) {}
    }
    businessId.value = prevBusinessId;
  }
  if (isAdmin.value && val) {
    const prevBusinessId = businessId.value;
    businessId.value = null;
    await fetchBusinesses('', val);
    if (prevBusinessId !== null && prevBusinessId !== undefined && !businessOptions.value.some((b) => b.id === prevBusinessId)) {
      try {
        const { data: bizData } = await axios.get(`/businesses/${prevBusinessId}`);
        businessOptions.value.push({
          ...bizData.data,
          display: `${bizData.data.folio}${bizData.data.name ? ' - ' + bizData.data.name : ''}`,
          id: typeof bizData.data.id === 'string' ? Number(bizData.data.id) : bizData.data.id
        });
      } catch (e) {}
    }
    businessId.value = prevBusinessId;
  }
});

const fullAddress = (address) => {
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

// SIEMPRE muestra las vinculadas al grupo, combinadas con las filtradas y seleccionadas correctamente
const fetchBusinessUnits = async () => {
  if (!canShowBusinessUnits.value) {
    businessUnits.value = [];
    total.value = 0;
    return;
  }
  loading.value = true;
  try {
    const params = {
      ...filters.value,
      organization_id: organizationId.value,
      business_id: businessId.value,
      page: page.value,
      per_page: itemsPerPage.value,
      sort_by: sortBy.value,
      sort_desc: sortDesc.value ? 1 : 0,
      search: search.value
    };
    const { data } = await axios.get('/business-units', { params });

    const filtered = normalizeUnits(data.data || []);
    const linked = normalizeUnits(selectedBusinessUnitsFull.value || []);
    const linkedIds = new Set(linked.map((bu) => bu.id));

    const filteredLinked = search.value
      ? linked.filter((bu) => {
          const text = `${bu.folio ?? ''} ${bu.name ?? ''} ${bu.alias ?? ''}`.toLowerCase();
          return text.includes(search.value.toLowerCase());
        })
      : linked;

    const combined = [...filteredLinked, ...filtered.filter((bu) => !linkedIds.has(bu.id))];
    businessUnits.value = combined;
    total.value = combined.length;
  } catch (e) {
    const linked = normalizeUnits(selectedBusinessUnitsFull.value || []);
    const filteredLinked = search.value
      ? linked.filter((bu) => {
          const text = `${bu.folio ?? ''} ${bu.name ?? ''} ${bu.alias ?? ''}`.toLowerCase();
          return text.includes(search.value.toLowerCase());
        })
      : linked;
    businessUnits.value = filteredLinked;
    total.value = businessUnits.value.length;
  } finally {
    loading.value = false;
  }
};

const fetchGroup = async () => {
  try {
    const { data } = await axios.get(`/business-unit-groups/${groupId}`);

    const group = data.group ?? data.data ?? data;

    groupFields.value = group;

    // --- INTEGRACIÓN DE VERIFICACIÓN DE PERMISOS ---
    checkCanEditUnitGroup(group);
    if (!canEditUnitGroup.value) {
      router.push('/403');
      return;
    }

    name.value = group.name ?? '';
    organizationId.value = group.organization_id ?? group.organization?.id ?? null;
    businessId.value =
      group.business_id !== undefined && group.business_id !== null
        ? Number(group.business_id)
        : group.business && group.business.id !== undefined && group.business.id !== null
          ? Number(group.business.id)
          : null;

    status.value = group.status ?? 'active';

    let units = [];
    if (Array.isArray(data.business_units?.data) && data.business_units?.data.length > 0) {
      units = data.business_units.data;
    } else if (Array.isArray(data.business_units) && data.business_units.length > 0) {
      units = data.business_units;
    } else if (Array.isArray(group.businessUnits) && group.businessUnits.length > 0) {
      units = group.businessUnits;
    } else if (Array.isArray(group.business_units) && group.business_units.length > 0) {
      units = group.business_units;
    }
    selectedBusinessUnitsFull.value = units;
    selectedBusinessUnits.value = normalizeUnits(units).map((bu) => Number(bu.id));

    if (isSuperadmin.value) {
      await fetchOrganizations('');
      if (organizationId.value) {
        await fetchBusinesses('', organizationId.value);

        if (businessId.value !== null && businessId.value !== undefined && !businessOptions.value.some((b) => b.id === businessId.value)) {
          try {
            const { data: bizData } = await axios.get(`/businesses/${businessId.value}`);
            if (!businessOptions.value.some((b) => b.id === bizData.data.id)) {
              businessOptions.value.push({
                ...bizData.data,
                display: `${bizData.data.folio}${bizData.data.name ? ' - ' + bizData.data.name : ''}`,
                id: typeof bizData.data.id === 'string' ? Number(bizData.data.id) : bizData.data.id
              });
            }
          } catch (e) {}
        }
      }
    }
    if (isAdmin.value && auth.user?.organization_id) {
      organizationId.value = auth.user.organization_id;
      fetchBusinesses('', organizationId.value);
    }
    if (isSponsorOrOther.value) {
      if (auth.user?.organization_id) organizationId.value = auth.user.organization_id;
      if (auth.user?.business_id) businessId.value = auth.user.business_id;
      if (auth.user?.organization_id && !auth.user?.business_id) {
        await fetchBusinesses('', auth.user.organization_id);
      }
    }
  } catch (e) {
    errorMsg.value = 'Error al obtener el grupo';
  }
};

const canShowBusinessUnits = computed(() => {
  if (isSuperadmin.value) {
    return !!organizationId.value && !!businessId.value;
  }
  if (isAdmin.value) {
    return !!businessId.value;
  }
  if (auth.user?.organization_id && auth.user?.business_id) {
    return true;
  }
  if (auth.user?.organization_id && !auth.user?.business_id) {
    return !!businessId.value;
  }
  return false;
});

const sortedItems = computed(() => {
  if (!selectedBusinessUnits.value.length) return businessUnits.value;
  const selected = [];
  const unselected = [];
  for (const unit of businessUnits.value) {
    if (selectedBusinessUnits.value.map(Number).includes(Number(unit.id))) {
      selected.push(unit);
    } else {
      unselected.push(unit);
    }
  }
  return [...selected, ...unselected];
});

watch([organizationId, businessId, filters, page, itemsPerPage, sortBy, sortDesc], () => {
  fetchBusinessUnits();
});

watch(search, () => {
  page.value = 1;
  fetchBusinessUnits();
});

onMounted(async () => {
  await fetchGroup();
  if (canEditUnitGroup.value) {
    fetchBusinessUnits();
  }
});

function handleFilter(newFilters) {
  if (newFilters.organizationId !== undefined && newFilters.organizationId !== organizationId.value) {
    organizationId.value = newFilters.organizationId;
  }
  if (newFilters.businessId !== undefined && newFilters.businessId !== businessId.value) {
    businessId.value = newFilters.businessId;
  }
  filters.value = {
    status: newFilters.status,
    created_at_start: newFilters.createdAtStart,
    created_at_end: newFilters.createdAtEnd
  };
  page.value = 1;
  fetchBusinessUnits();
}

function handleOrgBizChange({ organizationId: orgId, businessId: bizId }) {
  organizationId.value = orgId;
  businessId.value = bizId;
  selectedBusinessUnits.value = [];
  page.value = 1;
  fetchBusinessUnits();
}

function handleSearch(val) {
  search.value = val;
}

function toggleBusinessUnit(id) {
  const numId = Number(id);
  if (selectedBusinessUnits.value.map(Number).includes(numId)) {
    selectedBusinessUnits.value = selectedBusinessUnits.value.filter((buId) => Number(buId) !== numId);
  } else {
    selectedBusinessUnits.value.push(numId);
  }
}

function hasInvalidBusinessUnits() {
  return selectedBusinessUnits.value.some((buId) => {
    const bu = businessUnits.value.find((b) => Number(b.id) === Number(buId));
    if (!bu) return false;
    const orgMatch = String(bu.organization_id) === String(organizationId.value);
    const bizMatch = String(bu.business_id) === String(businessId.value);
    return !(orgMatch && bizMatch);
  });
}

const saving = ref(false);
async function saveGroup() {
  showWarning.value = false;
  errorMsg.value = '';
  if (hasInvalidBusinessUnits()) {
    showInfoModal.value = true;
    return;
  }
  if (!name.value || !organizationId.value || !businessId.value || !selectedBusinessUnits.value.length) {
    showWarning.value = true;
    return;
  }
  saving.value = true;
  try {
    await axios.put(`/business-unit-groups/${groupId}`, {
      name: name.value,
      organization_id: organizationId.value,
      business_id: businessId.value,
      business_units: selectedBusinessUnits.value,
      status: status.value
    });
    router.push(`/grupos-de-ubicaciones/${groupId}`);
  } catch (e) {
    if (e.response?.data?.error) {
      errorMsg.value = e.response.data.error;
    } else if (e.response?.data?.message) {
      errorMsg.value = e.response.data.message;
    } else {
      errorMsg.value = 'Error al actualizar el grupo';
    }
  } finally {
    saving.value = false;
  }
}

function toggleSort(column) {
  if (sortBy.value === column) {
    sortDesc.value = !sortDesc.value;
  } else {
    sortBy.value = column;
    sortDesc.value = false;
  }
}
</script>

<template>
  <v-container fluid v-if="canEditUnitGroup">
    <v-row class="align-center mb-6" no-gutters>
      <v-col cols="auto" class="d-flex align-center">
        <v-btn icon variant="text" class="px-3 py-2" style="border-radius: 8px; border: 1px solid #ccc" @click="router.back()">
          <v-icon :icon="mdiArrowLeft"></v-icon>
        </v-btn>
        <h3 class="font-weight-medium ml-3 mb-0">Editar Grupo de Ubicaciones</h3>
        <v-icon :icon="mdiInformationSlabCircleOutline" color="primary" size="20" class="ml-2" @click="showInfoModal = true" />
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <h4 class="font-weight-bold mb-3">Información General</h4>
        <v-divider class="mb-6" />
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <v-label class="mb-1">Nombre <span class="text-error">*</span></v-label>
        <v-text-field v-model="name" variant="outlined" color="primary" required density="compact" class="mb-2" />

        <template v-if="isSuperadmin">
          <v-label class="mb-1">Organización <span class="text-error">*</span></v-label>
          <v-autocomplete
            v-model="organizationId"
            :items="organizationOptions"
            :loading="loadingOrganizations"
            v-model:search-input="organizationSearch"
            item-title="display"
            item-value="id"
            variant="outlined"
            color="primary"
            density="compact"
            placeholder="Buscar organización"
            clearable
            hide-details
            class="mb-2"
            :menu-props="{ maxHeight: '300px' }"
          />
          <div style="height: 10px"></div>
          <template v-if="organizationId">
            <v-label class="mb-1">Empresa <span class="text-error">*</span></v-label>
            <v-autocomplete
              v-model="businessId"
              :items="businessOptions"
              :loading="loadingBusinesses"
              v-model:search-input="businessSearch"
              item-title="display"
              item-value="id"
              variant="outlined"
              color="primary"
              density="compact"
              placeholder="Buscar empresa"
              clearable
              hide-details
              class="mb-2"
              :menu-props="{ maxHeight: '300px' }"
            />
            <div style="height: 10px"></div>
          </template>
        </template>

        <template v-else-if="isAdmin && organizationId">
          <v-label class="mb-1">Empresa <span class="text-error">*</span></v-label>
          <v-autocomplete
            v-model="businessId"
            :items="businessOptions"
            :loading="loadingBusinesses"
            v-model:search-input="businessSearch"
            item-title="display"
            item-value="id"
            variant="outlined"
            color="primary"
            density="compact"
            placeholder="Buscar empresa"
            clearable
            hide-details
            class="mb-2"
            :menu-props="{ maxHeight: '300px' }"
          />
          <div style="height: 10px"></div>
        </template>

        <template v-else-if="isSponsorOrOther && auth.user?.organization_id && !auth.user?.business_id">
          <v-label class="mb-1">Empresa <span class="text-error">*</span></v-label>
          <v-autocomplete
            v-model="businessId"
            :items="businessOptions"
            :loading="loadingBusinesses"
            v-model:search-input="businessSearch"
            item-title="display"
            item-value="id"
            variant="outlined"
            color="primary"
            density="compact"
            placeholder="Buscar empresa"
            clearable
            hide-details
            class="mb-2"
            :menu-props="{ maxHeight: '300px' }"
          />
          <div style="height: 10px"></div>
        </template>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <h4 class="font-weight-bold mb-3">Vincular Ubicaciones</h4>
        <v-divider class="mb-6" />
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <BusinessUnitFilter @filter="handleFilter" @org-biz-change="handleOrgBizChange" @search="handleSearch" :hide-filter-button="true" />
      </v-col>
    </v-row>

    <v-row>
      <v-col>
        <template v-if="!canShowBusinessUnits">
          <div class="text-center py-8">
            <p class="mt-4 text-h6 text-grey-darken-1">Selecciona organización y empresa para ver ubicaciones.</p>
            <p class="text-body-2 text-grey">Debes seleccionar los filtros requeridos para mostrar las ubicaciones disponibles.</p>
          </div>
        </template>
        <template v-else>
          <template v-if="loading">
            <div class="text-center py-8">
              <v-progress-circular indeterminate color="primary" size="64" />
              <p class="mt-4">Cargando ubicaciones...</p>
            </div>
          </template>
          <template v-else-if="total === 0">
            <div class="text-center py-8">
              <p class="mt-4 text-h6 text-grey-darken-1">No existen ubicaciones</p>
              <p class="text-body-2 text-grey">No se encontraron ubicaciones con los filtros aplicados</p>
            </div>
          </template>
          <template v-else>
            <BusinessUnitSelectTable
              :items="sortedItems.map((unit) => ({ ...unit, addressFormatted: truncate(fullAddress(unit.address), 50) }))"
              :total="total"
              :page="page"
              :items-per-page="itemsPerPage"
              :sort-by="sortBy"
              :sort-desc="sortDesc"
              :selected-business-units="selectedBusinessUnits.map(Number)"
              @update:page="page = $event"
              @sort="toggleSort"
              @toggle="toggleBusinessUnit"
              :error="showWarning && !selectedBusinessUnits.length"
              :is-mobile="$vuetify.display.smAndDown"
            />
            <div class="v-messages v-messages__wrapper" style="min-height: 24px; padding-top: 10px">
              <div
                class="v-messages__message"
                :style="
                  showWarning && !selectedBusinessUnits.length
                    ? 'color: #ff2800; font-size: 0.8125rem; font-weight: 400;'
                    : 'color: #424242; font-size: 0.8125rem; font-weight: 400;'
                "
              >
                Debes seleccionar al menos una ubicación.
                <strong
                  >Si deseas cambiar las ubicaciones de otra empresa, primero desvincula las ubicaciones de la empresa actual, para poder
                  seleccionar las de la nueva</strong
                >.
              </div>
            </div>
          </template>
        </template>
      </v-col>
    </v-row>

    <v-row>
      <v-col class="d-flex justify-end">
        <v-btn color="primary" :loading="saving" @click="saveGroup"> Guardar Cambios </v-btn>
      </v-col>
    </v-row>

    <InfoBusinessUnitGroupModal v-model="showInfoModal" />
  </v-container>
</template>

<style scoped src="@/styles/roles.css"></style>
