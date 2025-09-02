<template>
  <div class="d-flex align-center mb-6" style="gap: 16px">
    <!-- Search bar -->
    <v-text-field
      v-model="search"
      :placeholder="`Buscar por nombre, alias, folio o dirección...`"
      prepend-inner-icon="mdi-magnify"
      clearable
      class="flex-grow-1 search-bar"
      density="compact"
      variant="outlined"
      color="primary"
      hide-details
      style="min-width: 220px"
      @keyup.enter="emitSearch"
      @click:clear="emitSearch"
    />

    <!-- Filtros button con indicador -->
    <div class="filter-btn-wrapper ml-2 flex-shrink-0" style="min-width: 44px; position: relative">
      <v-btn
        :icon="mdAndDown"
        variant="text"
        class="filter-btn filter-btn-center"
        style="border-radius: 8px; border: 1px solid #ccc; min-width: 44px; height: 44px; width: 100%"
        color="#222"
        @click="dialog = true"
      >
        <template v-if="mdAndDown">
          <v-icon>
            <svg viewBox="0 0 24 24" width="22" height="22">
              <path fill="currentColor" d="M3 6h18v2H3V6m3 6h12v2H6v-2m3 6h6v2H9v-2z" />
            </svg>
          </v-icon>
        </template>
        <template v-else>
          <span class="filter-btn-content">
            <v-icon class="mr-2">
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="currentColor" d="M3 6h18v2H3V6m3 6h12v2H6v-2m3 6h6v2H9v-2z" />
              </svg>
            </v-icon>
            <span>Filtros</span>
            <v-icon class="ml-2" end>mdi-filter-variant</v-icon>
          </span>
        </template>
      </v-btn>
      <span v-if="hasActiveFilters" class="filter-indicator" />
    </div>

    <!-- Modal de filtros -->
    <v-dialog v-model="dialog" max-width="420">
      <v-card class="modal-padding" style="position: relative">
        <!-- Botón de cerrar (tachita) -->
        <v-btn
          icon
          variant="text"
          class="position-absolute close-btn"
          style="top: 10px; right: 10px; color: #222; z-index: 10"
          @click="dialog = false"
        >
          <v-icon>
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path
                fill="currentColor"
                d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
              />
            </svg>
          </v-icon>
        </v-btn>
        <v-card-title class="font-weight-bold">Filtros avanzados</v-card-title>
        <v-card-text class="pb-0">
          <v-select
            v-model="status"
            :items="statusOptions"
            label="Estado"
            clearable
            hide-details
            variant="outlined"
            color="primary"
            class="mb-3 filter-padding"
            style="padding-top: 0px; padding-bottom: 0px"
          />

          <!-- Organization select filter SOLO para superadmin -->
          <div v-if="isSuperadmin" class="mb-3">
            <v-autocomplete
              v-model="selectedOrganization"
              :items="organizationOptions"
              :loading="loadingOrganizations"
              v-model:search-input="organizationSearch"
              item-title="display"
              item-value="id"
              label="Buscar Organización"
              clearable
              hide-details
              variant="outlined"
              color="primary"
              density="compact"
              :filter="customOrgFilter"
              @update:search-input="fetchOrganizations"
              :menu-props="{ maxHeight: '300px' }"
            />
          </div>

          <!-- Business select filter SOLO para superadmin, admin, sponsor o con businessUnit.viewAny -->
          <div v-if="canShowBusinessFilter" class="mb-3">
            <v-autocomplete
              v-model="selectedBusiness"
              :items="businessOptions"
              :loading="loadingBusinesses"
              v-model:search-input="businessSearch"
              item-title="display"
              item-value="id"
              label="Buscar Empresa"
              clearable
              hide-details
              variant="outlined"
              color="primary"
              density="compact"
              :filter="customBizFilter"
              @update:search-input="fetchBusinesses"
              :menu-props="{ maxHeight: '300px' }"
            />
          </div>

          <!-- Rango de fechas de creación -->
          <div class="mb-3">
            <v-menu
              v-model="menuCreatedStart"
              :close-on-content-click="false"
              transition="scale-transition"
              offset-y
              max-width="290"
              min-width="auto"
            >
              <template #activator="{ props }">
                <v-text-field
                  :model-value="formatDateOnly(createdAtStart)"
                  label="Fecha de Inicio"
                  readonly
                  v-bind="props"
                  clearable
                  hide-details
                  variant="outlined"
                  color="primary"
                  class="filter-padding date-field mb-2"
                  @click:clear="createdAtStart = null"
                />
              </template>
              <v-date-picker v-model="createdAtStart" locale="es" @update:modelValue="menuCreatedStart = false">
                <template #header></template>
              </v-date-picker>
            </v-menu>
            <v-menu
              v-model="menuCreatedEnd"
              :close-on-content-click="false"
              transition="scale-transition"
              offset-y
              max-width="290"
              min-width="auto"
            >
              <template #activator="{ props }">
                <v-text-field
                  :model-value="formatDateOnly(createdAtEnd)"
                  label="Fecha de Fin"
                  readonly
                  v-bind="props"
                  clearable
                  hide-details
                  variant="outlined"
                  color="primary"
                  class="filter-padding date-field"
                  @click:clear="createdAtEnd = null"
                />
              </template>
              <v-date-picker v-model="createdAtEnd" locale="es" @update:modelValue="menuCreatedEnd = false">
                <template #header></template>
              </v-date-picker>
            </v-menu>
          </div>
        </v-card-text>
        <v-card-actions class="d-flex flex-column align-end pt-2" style="gap: 8px">
          <v-btn
            style="background-color: #1677ff; color: white; font-weight: 500; font-size: 14px; width: 100%; text-transform: none"
            @click="applyFilters"
          >
            Aplicar
          </v-btn>
          <v-btn
            variant="text"
            style="width: 100%; color: #555; font-weight: 500; font-size: 13px; text-transform: none"
            @click="clearFilters"
          >
            Limpiar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { useDisplay } from 'vuetify';
import axios from '@/utils/axios';
import { useAuthStore } from '@/stores/auth';
import '@/styles/filters.css';

const emit = defineEmits(['search', 'filter']);

const search = ref('');
const dialog = ref(false);

const status = ref(null);
const statusOptions = [
  { title: 'Activo', value: 'active' },
  { title: 'Inactivo', value: 'inactive' }
];

// NUEVOS filtros de rango de fechas
const createdAtStart = ref(null);
const createdAtEnd = ref(null);
const menuCreatedStart = ref(false);
const menuCreatedEnd = ref(false);

const { mdAndDown } = useDisplay();

// --- Organization select filter SOLO para superadmin ---
const auth = useAuthStore();
const user = computed(() => auth.user || { roles: [], permissions: [] });
const roles = computed(() => user.value.roles || []);
const permissions = computed(() => user.value.permissions || []);
const isSuperadmin = computed(() => roles.value.includes('superadmin'));
const isAdmin = computed(() => roles.value.includes('admin'));
const isSponsor = computed(() => roles.value.includes('sponsor'));
const canViewAnyBusinessUnit = computed(() => permissions.value.includes('businessUnit.viewAny'));

const canShowBusinessFilter = computed(() => isSuperadmin.value || isAdmin.value || isSponsor.value || canViewAnyBusinessUnit.value);

const selectedOrganization = ref(null);
const organizationOptions = ref([]);
const organizationSearch = ref('');
const loadingOrganizations = ref(false);

const fetchOrganizations = async (searchText) => {
  if (!isSuperadmin.value) return;
  loadingOrganizations.value = true;
  try {
    const { data } = await axios.get('/organizations', {
      params: {
        q: searchText || '',
        limit: 10
      }
    });
    organizationOptions.value = (data.data || []).map((o) => ({
      ...o,
      display: `${o.folio}${o.legal_name ? ' - ' + o.legal_name : ''}`,
      id: o.id
    }));
  } catch (e) {
    organizationOptions.value = [];
  } finally {
    loadingOrganizations.value = false;
  }
};

function customOrgFilter(item, queryText, itemText) {
  if (!queryText) return true;
  const text = (item.folio + ' ' + (item.legal_name || '')).toLowerCase();
  return text.includes(queryText.toLowerCase());
}

// --- Business select filter ---
const selectedBusiness = ref(null);
const businessOptions = ref([]);
const businessSearch = ref('');
const loadingBusinesses = ref(false);

const fetchBusinesses = async (searchText) => {
  if (!canShowBusinessFilter.value) return;
  loadingBusinesses.value = true;
  try {
    const { data } = await axios.get('/businesses', {
      params: {
        q: searchText || '',
        limit: 10
      }
    });
    businessOptions.value = (data.data || []).map((b) => ({
      ...b,
      display: `${b.folio}${b.name ? ' - ' + b.name : ''}`,
      id: b.id
    }));
  } catch (e) {
    businessOptions.value = [];
  } finally {
    loadingBusinesses.value = false;
  }
};

function customBizFilter(item, queryText, itemText) {
  if (!queryText) return true;
  const text = (item.folio + ' ' + (item.name || '')).toLowerCase();
  return text.includes(queryText.toLowerCase());
}

// Fetch initial options when dialog opens
watch(dialog, (val) => {
  if (val && isSuperadmin.value && organizationOptions.value.length === 0) {
    fetchOrganizations('');
  }
  if (val && canShowBusinessFilter.value && businessOptions.value.length === 0) {
    fetchBusinesses('');
  }
});

watch(organizationSearch, (val) => {
  if (isSuperadmin.value) fetchOrganizations(val);
});

watch(businessSearch, (val) => {
  if (canShowBusinessFilter.value) fetchBusinesses(val);
});

// Emit search on input change (debounced for better UX)
watch(search, (val) => {
  emit('search', val);
});

// Detect if any filter is active
const hasActiveFilters = computed(
  () => !!status.value || !!createdAtStart.value || !!createdAtEnd.value || !!selectedOrganization.value || !!selectedBusiness.value
);

function emitSearch() {
  emit('search', search.value);
}

// Formatea la fecha a YYYY-MM-DD si es necesario
function formatDateOnly(val) {
  if (!val) return null;
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  const d = new Date(val);
  return d.toISOString().slice(0, 10);
}

function applyFilters() {
  emit('filter', {
    organizationId: selectedOrganization.value,
    businessId: selectedBusiness.value,
    status: status.value,
    createdAtStart: formatDateOnly(createdAtStart.value),
    createdAtEnd: formatDateOnly(createdAtEnd.value)
  });
  dialog.value = false;
}

function clearFilters() {
  status.value = null;
  createdAtStart.value = null;
  createdAtEnd.value = null;
  selectedOrganization.value = null;
  organizationSearch.value = '';
  selectedBusiness.value = null;
  businessSearch.value = '';
  emit('filter', {
    organizationId: null,
    businessId: null,
    status: null,
    createdAtStart: null,
    createdAtEnd: null
  });
}
</script>
