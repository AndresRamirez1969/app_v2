<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import ReportsTableMeta from './ReportsTableMeta.vue';
import { mdiChevronUp, mdiChevronDown, mdiDotsHorizontal, mdiEye } from '@mdi/js';
import { SCOPES } from '@/constants/constants';

const props = defineProps({
  items: Array,
  isMobile: Boolean,
  isLoading: Boolean
});

const router = useRouter();

const sortBy = ref('folio');
const sortDesc = ref(false);
const page = ref(1);
const itemsPerPage = ref(10);

const toggleSort = (column) => {
  if (sortBy.value === column) {
    sortDesc.value = !sortDesc.value;
  } else {
    sortBy.value = column;
    sortDesc.value = false;
  }
};

const formatDate = (dateString) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const sortedItems = computed(() => {
  return [...props.items].sort((a, b) => {
    const aVal = a[sortBy.value]?.toString().toLowerCase() ?? '';
    const bVal = b[sortBy.value]?.toString().toLowerCase() ?? '';
    return aVal.localeCompare(bVal) * (sortDesc.value ? -1 : 1);
  });
});

const paginatedItems = computed(() => {
  const start = (page.value - 1) * itemsPerPage.value;
  return sortedItems.value.slice(start, start + itemsPerPage.value);
});

const viewForm = (form) => {
  router.push({ name: 'Show Response', params: { id: form.id } });
};

const getScopeLabel = (scope) => {
  if (!scope) return 'No definido';
  const scopeLabel = SCOPES.find((s) => s.value === scope);
  return scopeLabel ? scopeLabel.label : scope;
};
</script>

<template>
  <div>
    <div v-if="isLoading" class="text-center py-8">
      <v-progress-circular indeterminate color="primary" size="64" />
      <p class="mt-4">Cargando reportes...</p>
    </div>
    <template v-else>
      <div v-if="!paginatedItems.length" class="text-center py-8">
        <v-icon size="64" color="grey lighten-1">mdi-domain-off</v-icon>
        <p class="mt-4 text-h6 text-grey-darken-1">No se han registrado respuestas</p>
        <p class="text-body-2 text-grey">No se encontraron reportes con los filtros aplicados</p>
      </div>

      <!-- Modo móvil (solo cards) -->
      <template v-else-if="isMobile">
        <v-card
          v-for="form in paginatedItems"
          :key="form.id"
          class="mb-4 pa-3 elevation-1 rounded-lg row-clickable"
          @click="viewForm(form)"
          style="cursor: pointer"
        >
          <v-row no-gutters align="center" class="mb-1">
            <v-col cols="12">
              <div class="d-flex align-center mb-1" style="justify-content: space-between">
                <div class="text-caption" style="margin-right: 8px">
                  <router-link :to="`/formulario/${form.id}`" @click.stop style="text-decoration: underline">
                    {{ form.folio }}
                  </router-link>
                </div>
              </div>
              <div class="font-weight-medium mb-1">{{ form.name }}</div>
              <div class="text-caption"><strong>Creado:</strong> {{ formatDate(form.created_at) }}</div>
            </v-col>
          </v-row>
        </v-card>
      </template>

      <!-- Modo escritorio (solo tabla) -->
      <template v-else>
        <ReportsTableMeta
          :items="sortedItems"
          :page="page"
          :itemsPerPage="itemsPerPage"
          :sortBy="sortBy"
          :sortDesc="sortDesc"
          @update:page="page = $event"
          @sort="toggleSort"
        >
          <template #sort-icon="{ column }">
            <v-icon v-if="sortBy === column" size="16" class="ml-1">
              {{ sortDesc ? mdiChevronDown : mdiChevronUp }}
            </v-icon>
          </template>
          <template #rows>
            <template v-if="paginatedItems.length">
              <tr v-for="form in paginatedItems" :key="form.id" @click="viewForm(form)" class="row-clickable" style="cursor: pointer">
                <td class="folio-cell">
                  <router-link :to="`/formulario/${form.id}`" @click.stop style="text-decoration: underline">
                    {{ form.folio }}
                  </router-link>
                </td>
                <td class="name-cell">{{ form.name }}</td>
                <td class="answers-cell">{{ form.responses?.length || 0 }}/{{ form.assignments?.length || 0 }}</td>
                <td class="date-cell">{{ formatDate(form.created_at) }}</td>
                <td class="scope-cell">{{ getScopeLabel(form.assignment_scope) }}</td>
              </tr>
            </template>
          </template>
        </ReportsTableMeta>
      </template>
    </template>
  </div>
</template>

<style scoped>
.row-clickable:hover {
  background: #f5f5f5;
  transition: background 0.2s;
}

.folio-cell,
.name-cell,
.status-cell,
.answers-cell,
.date-cell,
.scope-cell {
  padding: 12px 16px;
  border-bottom: 1px solid #e0e0e0;
}

.actions-cell {
  width: 80px;
  text-align: center;
}

.custom-dropdown {
  background: white;
}
</style>
