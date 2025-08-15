<script setup>
import { ref, watch, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { mdiArrowLeft } from '@mdi/js';
import axios from '@/utils/axios';
import BusinessUnitFilter from '../business_unit/BusinessUnitFilter.vue';
import BusinessUnitSelectTable from './BusinessUnitSelectTable.vue';

import { useAuthStore } from '@/stores/auth';
const auth = useAuthStore();

const router = useRouter();

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

const canCreate = computed(() => {
  const user = auth.user;
  return user?.permissions?.includes('businessUnitGroup.create');
});

function getBusinessUnitParams() {
  if (!auth.user) return {};

  const role = auth.user.role;
  if (role === 'superadmin') {
    return {};
  }
  if (role === 'admin') {
    return { organization_id: auth.user.organization_id };
  }
  return { business_id: auth.user.business_id };
}

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
  loading.value = true;
  try {
    const roleParams = getBusinessUnitParams();
    if (!canCreate.value) {
      businessUnits.value = [];
      total.value = 0;
      loading.value = false;
      return;
    }
    const params = {
      ...filters.value,
      ...roleParams,
      organization_id: organizationId.value || roleParams.organization_id,
      business_id: businessId.value || roleParams.business_id,
      page: page.value,
      per_page: itemsPerPage.value,
      sort_by: sortBy.value,
      sort_desc: sortDesc.value ? 1 : 0,
      search: search.value
    };
    const { data } = await axios.get('/business-units', { params });
    businessUnits.value = data.data;
    total.value = data.total;
  } catch (e) {
    businessUnits.value = [];
    total.value = 0;
    console.error('Error fetching business units:', e);
  } finally {
    loading.value = false;
  }
};

const sortedItems = computed(() => {
  return [...businessUnits.value].sort((a, b) => {
    const aVal = sortBy.value === 'address' ? fullAddress(a.address).toLowerCase() : (a[sortBy.value]?.toString().toLowerCase() ?? '');
    const bVal = sortBy.value === 'address' ? fullAddress(b.address).toLowerCase() : (b[sortBy.value]?.toString().toLowerCase() ?? '');
    return aVal.localeCompare(bVal) * (sortDesc.value ? -1 : 1);
  });
});

watch([organizationId, businessId, filters, page, itemsPerPage, sortBy, sortDesc, canCreate], () => {
  if (canCreate.value) fetchBusinessUnits();
});

watch(search, () => {
  page.value = 1;
  if (canCreate.value) fetchBusinessUnits();
});

onMounted(() => {
  if (canCreate.value) fetchBusinessUnits();
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
  if (canCreate.value) fetchBusinessUnits();
}

function handleOrgBizChange({ organizationId: orgId, businessId: bizId }) {
  organizationId.value = orgId;
  businessId.value = bizId;
  selectedBusinessUnits.value = [];
  page.value = 1;
  if (canCreate.value) fetchBusinessUnits();
}

function handleSearch(val) {
  search.value = val;
}

function toggleBusinessUnit(id) {
  const unit = businessUnits.value.find((u) => u.id === id);
  if (!unit) return;

  if (selectedBusinessUnits.value.length === 0) {
    organizationId.value = unit.organization_id;
    businessId.value = unit.business_id;
    selectedBusinessUnits.value = [id];
    return;
  }

  if (unit.organization_id !== organizationId.value || unit.business_id !== businessId.value) {
    alert('Solo puedes seleccionar unidades de negocio del mismo organización y empresa.');
    return;
  }

  if (selectedBusinessUnits.value.includes(id)) {
    selectedBusinessUnits.value = selectedBusinessUnits.value.filter((buId) => buId !== id);
    if (selectedBusinessUnits.value.length === 0) {
      organizationId.value = null;
      businessId.value = null;
    }
  } else {
    selectedBusinessUnits.value.push(id);
  }
}

const saving = ref(false);
async function saveGroup() {
  if (!name.value || !organizationId.value || !businessId.value || !selectedBusinessUnits.value.length) return;
  saving.value = true;
  try {
    const groupRes = await axios.post('/business-unit-groups', {
      name: name.value,
      organization_id: organizationId.value,
      business_id: businessId.value,
      business_units: selectedBusinessUnits.value
    });
    const groupId = groupRes.data?.id || groupRes.data?.data?.id || groupRes.data?.group?.id;

    if (groupId) {
      await Promise.all(
        selectedBusinessUnits.value.map((unitId) => axios.put(`/business-units/${unitId}`, { business_unit_group_id: groupId }))
      );
    }
    router.push('/grupos-de-ubicaciones');
  } catch (e) {
    console.error('Error saving group:', e);
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
  <v-container>
    <!-- Header -->
    <v-row class="align-center mb-6" no-gutters>
      <v-col cols="auto" class="d-flex align-center">
        <v-btn icon variant="text" class="px-3 py-2" style="border-radius: 8px; border: 1px solid #ccc" @click="router.back()">
          <v-icon :icon="mdiArrowLeft"></v-icon>
        </v-btn>
        <h3 class="font-weight-medium ml-3 mb-0">Agregar Grupo de Ubicaciones</h3>
      </v-col>
    </v-row>

    <template v-if="canCreate">
      <!-- Información General -->
      <v-row>
        <v-col cols="12">
          <h4 class="font-weight-bold mb-3">Información General</h4>
          <v-divider class="mb-6" />
        </v-col>
      </v-row>

      <!-- Nombre del grupo -->
      <v-row>
        <v-col>
          <v-text-field v-model="name" label="Nombre del grupo" variant="outlined" color="primary" required class="mb-4" />
        </v-col>
      </v-row>

      <!-- Divider entre nombre y filtro -->
      <v-row>
        <v-col cols="12">
          <v-divider class="mb-5" />
        </v-col>
      </v-row>

      <!-- Filtros de organización y empresa y búsqueda -->
      <v-row>
        <v-col>
          <BusinessUnitFilter
            @filter="handleFilter"
            @org-biz-change="handleOrgBizChange"
            @search="handleSearch"
            :showOrganization="true"
            :showBusiness="true"
            :organization-id="organizationId"
            :business-id="businessId"
          />
        </v-col>
      </v-row>

      <!-- Tabla de business units con selección y paginación -->
      <v-row>
        <v-col>
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
          />
        </v-col>
      </v-row>

      <!-- Botón guardar -->
      <v-row>
        <v-col class="d-flex justify-end">
          <v-btn
            color="primary"
            :loading="saving"
            :disabled="!canCreate || !name || !organizationId || !businessId || !selectedBusinessUnits.length"
            @click="saveGroup"
          >
            Guardar Grupo
          </v-btn>
        </v-col>
      </v-row>
    </template>
    <template v-else>
      <v-row>
        <v-col>
          <v-alert type="error" variant="outlined" class="mt-4"> No tienes permiso para crear grupos de unidades de negocio. </v-alert>
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>

<style scoped src="@/styles/roles.css"></style>
