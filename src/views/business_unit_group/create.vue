<script setup>
import { ref, watch, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { mdiArrowLeft, mdiInformationSlabCircleOutline } from '@mdi/js';
import axios from '@/utils/axios';
import BusinessUnitFilter from '../business_unit/BusinessUnitFilter.vue';
import BusinessUnitSelectTable from './BusinessUnitSelectTable.vue';
import InfoBusinessUnitGroupModal from '@/components/modals/InfoBusinessUnitGroupModal.vue';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const auth = useAuthStore();

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
const errorMsg = ref('');
const showInfoModal = ref(false);

const roles = computed(() => auth.user?.roles || []);
const isSuperadmin = computed(() => roles.value.includes('superadmin'));
const isAdmin = computed(() => roles.value.includes('admin'));
const isSponsor = computed(() => roles.value.includes('sponsor'));
const isOther = computed(() => !isSuperadmin.value && !isAdmin.value && !isSponsor.value);

const organizationOptions = ref([]);
const organizationSearch = ref('');
const loadingOrganizations = ref(false);

const businessOptions = ref([]);
const businessSearch = ref('');
const loadingBusinesses = ref(false);

const userOrganizations = computed(() => auth.user?.organizations || []);
const userBusinesses = computed(() => auth.user?.businesses || []);
const userOrganizationId = computed(() => auth.user?.organization_id || null);
const userBusinessId = computed(() => auth.user?.business_id || null);

const showOrganizationSelect = computed(() => isSuperadmin.value);
const showBusinessSelect = computed(() => {
  if (isSuperadmin.value && organizationId.value) return true;
  if (isAdmin.value && organizationId.value) return true;
  if (isOther.value && userOrganizations.value.length === 1) return true;
  return false;
});

const canShowResults = computed(() => {
  if (isSuperadmin.value) {
    return organizationId.value && businessId.value;
  }
  if (isAdmin.value) {
    return businessId.value;
  }
  if (userOrganizations.value.length === 1 && !userBusinessId.value) {
    return businessId.value;
  }
  if (userOrganizationId.value && userBusinessId.value) {
    return true;
  }
  if (userOrganizationId.value && !showBusinessSelect.value) {
    return true;
  }
  return false;
});

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
      id: b.id
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
  if (
    (isSuperadmin.value && organizationId.value) ||
    (isAdmin.value && organizationId.value) ||
    (isOther.value && userOrganizations.value.length === 1 && organizationId.value)
  ) {
    fetchBusinesses(val, organizationId.value);
  }
});
watch(organizationId, (val) => {
  if ((isSuperadmin.value || isAdmin.value || (isOther.value && userOrganizations.value.length === 1)) && val) {
    businessId.value = null;
    fetchBusinesses('', val);
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

const fetchBusinessUnits = async () => {
  if (!canShowResults.value) {
    businessUnits.value = [];
    total.value = 0;
    return;
  }
  loading.value = true;
  try {
    const params = {
      ...filters.value,
      organization_id: organizationId.value || userOrganizationId.value,
      business_id: businessId.value || userBusinessId.value,
      page: page.value,
      per_page: itemsPerPage.value,
      sort_by: sortBy.value,
      sort_desc: sortDesc.value ? 1 : 0,
      search: search.value
    };
    const { data } = await axios.get('/business-units', { params });
    businessUnits.value = data.data;
    total.value = data.meta?.total ?? data.total ?? 0;
  } catch (e) {
    businessUnits.value = [];
    total.value = 0;
    console.error('Error fetching business units:', e);
  } finally {
    loading.value = false;
  }
};

const sortedItems = computed(() => {
  if (!selectedBusinessUnits.value.length) return businessUnits.value;
  const selected = [];
  const unselected = [];
  for (const unit of businessUnits.value) {
    if (selectedBusinessUnits.value.includes(unit.id)) {
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

onMounted(() => {
  if (!user.value?.permissions?.includes('businessUnitGroup.create') && !isSponsor.value && !isAdmin.value && !isSuperadmin.value) {
    router.replace('/403');
    return;
  }

  if (isSuperadmin.value) {
    fetchOrganizations('');
  }
  if (isAdmin.value && auth.user?.organization_id) {
    organizationId.value = auth.user.organization_id;
    fetchBusinesses('', organizationId.value);
  }
  if (isOther.value) {
    if (userOrganizations.value.length === 1) {
      organizationId.value = userOrganizations.value[0].id;
      fetchBusinesses('', organizationId.value);
    }
    if (userOrganizationId.value && userBusinessId.value) {
      organizationId.value = userOrganizationId.value;
      businessId.value = userBusinessId.value;
    }
  }
  fetchBusinessUnits();
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
  if (selectedBusinessUnits.value.includes(id)) {
    selectedBusinessUnits.value = selectedBusinessUnits.value.filter((buId) => buId !== id);
  } else {
    selectedBusinessUnits.value.push(id);
  }
}

const saving = ref(false);
async function saveGroup() {
  showWarning.value = false;
  errorMsg.value = '';
  if (
    !name.value ||
    !(organizationId.value || userOrganizationId.value) ||
    !(businessId.value || userBusinessId.value) ||
    !selectedBusinessUnits.value.length
  ) {
    showWarning.value = true;
    return;
  }
  saving.value = true;
  try {
    await axios.post('/business-unit-groups', {
      name: name.value,
      organization_id: organizationId.value || userOrganizationId.value,
      business_id: businessId.value || userBusinessId.value,
      business_units: selectedBusinessUnits.value,
      status: status.value
    });
    router.push('/grupos-de-ubicaciones');
  } catch (e) {
    if (e.response?.data?.error) {
      errorMsg.value = e.response.data.error;
    } else if (e.response?.data?.message) {
      errorMsg.value = e.response.data.message;
    } else {
      errorMsg.value = 'Error al crear el grupo';
    }
    console.error('Error creating group:', e);
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
  <v-container fluid>
    <v-row class="align-center mb-6" no-gutters>
      <v-col cols="auto" class="d-flex align-center">
        <v-btn icon variant="text" class="px-3 py-2" style="border-radius: 8px; border: 1px solid #ccc" @click="router.back()">
          <v-icon :icon="mdiArrowLeft"></v-icon>
        </v-btn>
        <h3 class="font-weight-medium ml-3 mb-0">Crear Grupo de Ubicaciones</h3>
        <v-icon :icon="mdiInformationSlabCircleOutline" color="primary" size="20" class="ml-2" @click="showInfoModal = true" />
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <v-label class="mb-1">Nombre <span class="text-error">*</span></v-label>
        <v-text-field v-model="name" variant="outlined" color="primary" required density="compact" class="mb-2" />

        <!-- SUPERADMIN: organización y empresa -->
        <template v-if="showOrganizationSelect">
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
          <div style="height: 18px"></div>
        </template>

        <!-- ADMIN y otros con una sola org: empresa -->
        <template v-if="showBusinessSelect">
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
        <template v-if="!canShowResults">
          <div class="text-center py-8">
            <p class="mt-4 text-h6 text-grey-darken-1">Selecciona organización y empresa para ver ubicaciones.</p>
            <p class="text-body-2 text-grey">Debes seleccionar los campos requeridos para mostrar las ubicaciones disponibles.</p>
          </div>
        </template>
        <template v-else-if="loading">
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
            :selected-business-units="selectedBusinessUnits"
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
            </div>
          </div>
        </template>
      </v-col>
    </v-row>

    <v-row>
      <v-col class="d-flex justify-end">
        <v-btn color="primary" :loading="saving" @click="saveGroup"> Guardar Grupo </v-btn>
      </v-col>
    </v-row>

    <InfoBusinessUnitGroupModal v-model="showInfoModal" />
  </v-container>
</template>

<style scoped src="@/styles/roles.css"></style>
