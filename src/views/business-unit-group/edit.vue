<script setup>
import { ref, watch, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { mdiArrowLeft } from '@mdi/js';
import axios from '@/utils/axios';
import BusinessUnitFilter from '../business-unit-dw/BusinessUnitFilter.vue';
import BusinessUnitSelectTable from './BusinessUnitSelectTable.vue';

const router = useRouter();
const route = useRoute();

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
    const params = {
      ...filters.value,
      organization_id: organizationId.value,
      business_id: businessId.value,
      page: page.value,
      per_page: itemsPerPage.value,
      sort_by: sortBy.value,
      sort_desc: sortDesc.value ? 1 : 0
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

const fetchGroup = async () => {
  try {
    const { data } = await axios.get(`/business-unit-groups/${groupId}`);
    name.value = data.name;
    organizationId.value = data.organization_id;
    businessId.value = data.business_id;
    selectedBusinessUnits.value = data.business_units.map((bu) => bu.id);
  } catch (e) {
    console.error('Error fetching group:', e);
  }
};

const sortedItems = computed(() => {
  return [...businessUnits.value].sort((a, b) => {
    const aVal = sortBy.value === 'address' ? fullAddress(a.address).toLowerCase() : (a[sortBy.value]?.toString().toLowerCase() ?? '');
    const bVal = sortBy.value === 'address' ? fullAddress(b.address).toLowerCase() : (b[sortBy.value]?.toString().toLowerCase() ?? '');
    return aVal.localeCompare(bVal) * (sortDesc.value ? -1 : 1);
  });
});

watch([organizationId, businessId, filters, page, itemsPerPage, sortBy, sortDesc], () => {
  fetchBusinessUnits();
});

onMounted(async () => {
  await fetchGroup();
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

function toggleBusinessUnit(id) {
  if (selectedBusinessUnits.value.includes(id)) {
    selectedBusinessUnits.value = selectedBusinessUnits.value.filter((buId) => buId !== id);
  } else {
    selectedBusinessUnits.value.push(id);
  }
}

const saving = ref(false);
async function saveGroup() {
  if (!name.value || !organizationId.value || !businessId.value || !selectedBusinessUnits.value.length) return;
  saving.value = true;
  try {
    await axios.put(`/business-unit-groups/${groupId}`, {
      name: name.value,
      organization_id: organizationId.value,
      business_id: businessId.value,
      business_units: selectedBusinessUnits.value
    });
    router.push(`/grupos-dw/${groupId}`); // Redirige al show del grupo editado
  } catch (e) {
    console.error('Error updating group:', e);
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
        <h3 class="font-weight-medium ml-3 mb-0">Editar Grupo de Ubicaciones</h3>
      </v-col>
    </v-row>

    <!-- Nombre del grupo -->
    <v-row>
      <v-col>
        <v-text-field v-model="name" label="Nombre del grupo" variant="outlined" color="primary" required class="mb-4" />
      </v-col>
    </v-row>

    <!-- Filtros de organización y empresa -->
    <v-row>
      <v-col>
        <BusinessUnitFilter @filter="handleFilter" @org-biz-change="handleOrgBizChange" :showOrganization="true" :showBusiness="true" />
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
          :disabled="!name || !organizationId || !businessId || !selectedBusinessUnits.length"
          @click="saveGroup"
        >
          Guardar Cambios
        </v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>
