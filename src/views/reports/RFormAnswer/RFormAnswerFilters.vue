<script setup>
import { ref, computed, watch } from "vue";
import { useDisplay } from "vuetify";
import axios from "@/utils/axios";
import { mdiMagnify } from "@mdi/js";

const emit = defineEmits(["search", "filter"]);

const props = defineProps({
  hasRating: {
    type: Boolean,
    default: false,
  },
  activeFilters: {
    type: Object,
    default: () => ({}),
  },
});

const search = ref("");
const dialog = ref(false);

// Filtros avanzados
const status = ref(null);
const statusOptions = [
  { title: "Abierto", value: "open" },
  { title: "Cerrado", value: "closed" },
];

const userId = ref(null);
const userOptions = ref([]);
const userSearch = ref("");
const loadingUsers = ref(false);

const scoreMin = ref(null);
const scoreMax = ref(null);

const startDate = ref(null);
const endDate = ref(null);
const menuStart = ref(false);
const menuEnd = ref(false);

const { mdAndDown } = useDisplay();

const fetchUsers = async (searchText) => {
  loadingUsers.value = true;
  try {
    const { data } = await axios.get("/users", {
      params: {
        q: searchText || "",
        limit: 10,
      },
    });
    userOptions.value = (data.data || []).map((u) => ({
      ...u,
      display: `${u.name} (${u.email})`,
    }));
  } catch (e) {
    userOptions.value = [];
  } finally {
    loadingUsers.value = false;
  }
};

function customUserFilter(item, queryText, itemText) {
  if (!queryText) return true;
  const text = (item.name + " " + item.email).toLowerCase();
  return text.includes(queryText.toLowerCase());
}

watch(dialog, (val) => {
  if (val && userOptions.value.length === 0) {
    fetchUsers("");
  }
});

watch(userSearch, (val) => {
  fetchUsers(val);
});

watch(search, (val) => {
  emit("search", val);
});

// Sincroniza los filtros locales con los del padre
watch(
  () => props.activeFilters,
  (val) => {
    status.value = val.report_status ?? null;
    userId.value = val.user_id ?? null;
    scoreMin.value = props.hasRating ? val.score_min ?? null : null;
    scoreMax.value = props.hasRating ? val.score_max ?? null : null;
    startDate.value = val.start_date ?? null;
    endDate.value = val.end_date ?? null;
  },
  { immediate: true }
);

// Calcula si hay filtros activos usando los filtros locales
const hasActiveFilters = computed(() => {
  return (
    !!status.value ||
    !!userId.value ||
    (props.hasRating && (!!scoreMin.value || !!scoreMax.value)) ||
    !!startDate.value ||
    !!endDate.value
  );
});

function emitSearch() {
  emit("search", search.value);
}

function formatDateOnly(val) {
  if (!val) return null;
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  const d = new Date(val);
  return d.toISOString().slice(0, 10);
}

function applyFilters() {
  emit("filter", {
    report_status: status.value,
    user_id: userId.value,
    score_min: props.hasRating ? scoreMin.value : null,
    score_max: props.hasRating ? scoreMax.value : null,
    start_date: formatDateOnly(startDate.value),
    end_date: formatDateOnly(endDate.value),
  });
  dialog.value = false;
}

function clearFilters() {
  status.value = null;
  userId.value = null;
  scoreMin.value = null;
  scoreMax.value = null;
  startDate.value = null;
  endDate.value = null;
  userSearch.value = "";
  emit("filter", {
    report_status: null,
    user_id: null,
    score_min: null,
    score_max: null,
    start_date: null,
    end_date: null,
  });
}
</script>

<template>
  <div class="d-flex align-center mb-6" style="gap: 16px">
    <v-text-field
      v-model="search"
      :placeholder="`Buscar por folio o usuario...`"
      clearable
      class="flex-grow-1 search-bar"
      density="compact"
      variant="outlined"
      color="primary"
      hide-details
      style="min-width: 220px"
      @keyup.enter="emitSearch"
      @click:clear="emitSearch"
    >
      <template #prepend-inner>
        <v-icon :icon="mdiMagnify" />
      </template>
    </v-text-field>

    <div
      class="filter-btn-wrapper ml-2 flex-shrink-0"
      style="min-width: 44px; position: relative"
    >
      <v-btn
        :icon="mdAndDown"
        variant="text"
        class="filter-btn filter-btn-center"
        style="
          border-radius: 8px;
          border: 1px solid #ccc;
          min-width: 44px;
          height: 44px;
          width: 100%;
        "
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
          </span>
        </template>
      </v-btn>
      <span v-if="hasActiveFilters" class="filter-indicator" />
    </div>

    <v-dialog v-model="dialog" max-width="420">
      <v-card class="modal-padding" style="position: relative">
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
          <div class="mb-3">
            <v-select
              v-model="status"
              :items="statusOptions"
              label="Status de Reporte"
              clearable
              hide-details
              variant="outlined"
              color="primary"
              class="mb-3 filter-padding"
            />
          </div>

          <div class="mb-3">
            <v-autocomplete
              v-model="userId"
              :items="userOptions"
              :loading="loadingUsers"
              v-model:search-input="userSearch"
              item-title="display"
              item-value="id"
              label="Buscar Usuario"
              clearable
              hide-details
              variant="outlined"
              color="primary"
              density="compact"
              :filter="customUserFilter"
              @update:search-input="fetchUsers"
              :menu-props="{ maxHeight: '300px' }"
            />
          </div>

          <div v-if="hasRating" class="mb-3 d-flex" style="gap: 8px">
            <v-text-field
              v-model="scoreMin"
              label="Ponderación mínima"
              type="number"
              clearable
              hide-details
              variant="outlined"
              color="primary"
              class="filter-padding"
              style="width: 50%"
            />
            <v-text-field
              v-model="scoreMax"
              label="Ponderación máxima"
              type="number"
              clearable
              hide-details
              variant="outlined"
              color="primary"
              class="filter-padding"
              style="width: 50%"
            />
          </div>

          <div class="mb-3">
            <v-menu
              v-model="menuStart"
              :close-on-content-click="false"
              transition="scale-transition"
              offset-y
              max-width="290"
              min-width="auto"
            >
              <template #activator="{ props }">
                <v-text-field
                  :model-value="formatDateOnly(startDate)"
                  label="Fecha de Inicio"
                  readonly
                  v-bind="props"
                  clearable
                  hide-details
                  variant="outlined"
                  color="primary"
                  class="filter-padding date-field mb-2"
                  @click:clear="startDate = null"
                />
              </template>
              <v-date-picker
                v-model="startDate"
                locale="es"
                @update:modelValue="menuStart = false"
              >
                <template #header></template>
              </v-date-picker>
            </v-menu>
            <v-menu
              v-model="menuEnd"
              :close-on-content-click="false"
              transition="scale-transition"
              offset-y
              max-width="290"
              min-width="auto"
            >
              <template #activator="{ props }">
                <v-text-field
                  :model-value="formatDateOnly(endDate)"
                  label="Fecha de Fin"
                  readonly
                  v-bind="props"
                  clearable
                  hide-details
                  variant="outlined"
                  color="primary"
                  class="filter-padding date-field"
                  @click:clear="endDate = null"
                />
              </template>
              <v-date-picker
                v-model="endDate"
                locale="es"
                @update:modelValue="menuEnd = false"
              >
                <template #header></template>
              </v-date-picker>
            </v-menu>
          </div>
        </v-card-text>
        <v-card-actions class="d-flex flex-column align-end pt-2" style="gap: 8px">
          <v-btn
            style="
              background-color: #1677ff;
              color: white;
              font-weight: 500;
              font-size: 14px;
              width: 100%;
              text-transform: none;
            "
            @click="applyFilters"
          >
            Aplicar
          </v-btn>
          <v-btn
            variant="text"
            style="
              width: 100%;
              color: #555;
              font-weight: 500;
              font-size: 13px;
              text-transform: none;
            "
            @click="clearFilters"
          >
            Limpiar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.filter-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: #00e676;
  box-shadow: 0 0 0 0 rgba(0, 230, 118, 0.7);
  animation: pulse-green 1.2s infinite;
  z-index: 2;
  border: 2px solid #fff;
}
@keyframes pulse-green {
  0% {
    box-shadow: 0 0 0 0 rgba(0, 230, 118, 0.7);
  }
  70% {
    box-shadow: 0 0 0 8px rgba(0, 230, 118, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(0, 230, 118, 0);
  }
}
</style>
