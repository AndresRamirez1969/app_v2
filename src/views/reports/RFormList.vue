<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import ReportTableMeta from './RFormTableMeta.vue';
import { mdiChevronUp, mdiChevronDown, mdiDotsHorizontal, mdiEye, mdiDomainOff } from '@mdi/js';
import { SCOPES } from '@/constants/constants';

const props = defineProps({
  items: Array,
  isMobile: Boolean,
  isLoading: Boolean,
  page: Number,
  itemsPerPage: Number,
  totalItems: Number,
  meta: Object // <-- Integración de meta
});

const emit = defineEmits(['update:page', 'sort']);

const router = useRouter();

const sortBy = ref('folio');
const sortDesc = ref(false);

const toggleSort = (column) => {
  if (sortBy.value === column) {
    sortDesc.value = !sortDesc.value;
  } else {
    sortBy.value = column;
    sortDesc.value = false;
  }
  emit('sort', { sortBy: sortBy.value, sortDesc: sortDesc.value });
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

const getScopeInfo = (form) => {
  const scope = form.assignment_scope;
  if (scope === 'organization' && form.organization) {
    return {
      label: `${form.organization.folio} - ${form.organization.legal_name || form.organization.name}`,
      link: `/organizaciones/${form.organization.id}`
    };
  }
  if (scope === 'business' && form.business) {
    return {
      label: `${form.business.folio} - ${form.business.name}`,
      link: `/empresas/${form.business.id}`
    };
  }
  if (scope === 'business_unit' && form.business_unit) {
    return {
      label: `${form.business_unit.folio} - ${form.business_unit.name}`,
      link: `/ubicaciones/${form.business_unit.id}`
    };
  }
  if (scope === 'business_unit_group' && form.business_unit_group) {
    return {
      label: `${form.business_unit_group.id} - ${form.business_unit_group.name}`,
      link: `/grupos/${form.business_unit_group.id}`
    };
  }
  switch (scope) {
    case 'organization':
      return { label: 'Organización', link: null };
    case 'business':
      return { label: 'Empresa', link: null };
    case 'business_unit':
      return { label: 'Ubicación', link: null };
    case 'business_unit_group':
      return { label: 'Grupo', link: null };
    default:
      return { label: scope || 'No definido', link: null };
  }
};

const getFrequencyLabel = (frequency) => {
  if (!frequency) return '—';
  if (frequency === 'once_per_day') return 'Una vez por día';
  if (frequency === 'multiple_per_day') return 'Múltiples veces por día';
  return frequency;
};

const sortedItems = computed(() => {
  return [...(props.items || [])].sort((a, b) => {
    const aVal = a[sortBy.value]?.toString().toLowerCase() ?? '';
    const bVal = b[sortBy.value]?.toString().toLowerCase() ?? '';
    return aVal.localeCompare(bVal) * (sortDesc.value ? -1 : 1);
  });
});

// Integración de paginación con meta
const pageCount = computed(() => {
  const m = props.meta || {};
  let lastPage = parseInt(m.last_page, 10);
  if (Number.isFinite(lastPage) && lastPage > 0) return lastPage;
  const perPage = Number(props.itemsPerPage) || 10;
  const total = Number(props.totalItems) || 0;
  const calculated = Math.ceil(total / perPage);
  return Math.max(1, calculated);
});

// Navega a la lista de respuestas del formulario seleccionado
const goToAnswerList = (form) => {
  router.push({ name: 'Report Answers', params: { formId: form.id } });
};
</script>

<template>
  <div>
    <div v-if="isLoading" class="text-center py-8">
      <v-progress-circular indeterminate color="primary" size="64" />
      <p class="mt-4">Cargando reportes...</p>
    </div>
    <template v-else>
      <div v-if="!sortedItems.length" class="text-center py-8">
        <p class="mt-4 text-h6 text-grey-darken-1">No se han registrado respuestas</p>
        <p class="text-body-2 text-grey">No se encontraron reportes con los filtros aplicados</p>
      </div>

      <!-- Modo móvil (solo cards, SIN 3 puntitos) -->
      <template v-else-if="isMobile">
        <v-card
          v-for="form in sortedItems"
          :key="form.id"
          class="mb-4 pa-3 elevation-1 rounded-lg row-clickable"
          @click="goToAnswerList(form)"
          style="cursor: pointer"
        >
          <v-row no-gutters align="center" class="mb-1">
            <v-col cols="12">
              <div class="d-flex align-center mb-1" style="justify-content: space-between">
                <div class="text-caption" style="margin-right: 8px">
                  <div class="text-caption">
                    {{ form.folio }}
                  </div>
                </div>
              </div>
              <div class="font-weight-medium mb-1">{{ form.name }}</div>
              <div class="text-caption"><strong>Frecuencia:</strong> {{ getFrequencyLabel(form.frequency) }}</div>
              <div class="text-caption">
                <strong>Alcance:</strong>
                <template v-if="getScopeInfo(form).link">
                  <router-link :to="getScopeInfo(form).link" @click.stop class="blue-link">
                    {{ getScopeInfo(form).label }}
                  </router-link>
                </template>
                <template v-else>
                  {{ getScopeInfo(form).label }}
                </template>
              </div>
              <div class="text-caption">
                <strong>Respuestas:</strong>
                {{ form.responses_count ?? (form.responses?.length || 0) }}
              </div>
              <div class="text-caption"><strong>Creado:</strong> {{ formatDate(form.created_at) }}</div>
            </v-col>
          </v-row>
        </v-card>
        <!-- PAGINACIÓN MOBILE -->
        <div class="d-flex flex-column align-center mt-4">
          <v-pagination
            :model-value="page"
            :length="pageCount"
            :total-visible="1"
            color="primary"
            @update:modelValue="emit('update:page', $event)"
            class="mobile-pagination"
          />
        </div>
      </template>

      <!-- Modo escritorio (solo tabla) -->
      <template v-else>
        <ReportTableMeta
          :items="sortedItems"
          :page="page"
          :itemsPerPage="itemsPerPage"
          :sortBy="sortBy"
          :sortDesc="sortDesc"
          :totalItems="totalItems"
          :pageCount="pageCount"
          @update:page="emit('update:page', $event)"
          @sort="toggleSort"
        >
          <template #sort-icon="{ column }">
            <v-icon v-if="sortBy === column" size="16" class="ml-1">
              {{ sortDesc ? mdiChevronDown : mdiChevronUp }}
            </v-icon>
          </template>
          <template #rows>
            <template v-if="sortedItems.length">
              <tr v-for="form in sortedItems" :key="form.id" @click="goToAnswerList(form)" class="row-clickable" style="cursor: pointer">
                <td class="folio-cell">
                  <div class="text-caption">
                    {{ form.folio }}
                  </div>
                </td>
                <td class="name-cell">{{ form.name }}</td>
                <td class="frequency-cell">{{ getFrequencyLabel(form.frequency) }}</td>
                <td class="scope-cell">
                  <template v-if="getScopeInfo(form).link">
                    <router-link :to="getScopeInfo(form).link" @click.stop class="blue-link">
                      {{ getScopeInfo(form).label }}
                    </router-link>
                  </template>
                  <template v-else>
                    {{ getScopeInfo(form).label }}
                  </template>
                </td>
                <td class="answers-cell">
                  {{ form.responses_count ?? (form.responses?.length || 0) }}
                </td>
                <td class="actions-cell" @click.stop>
                  <v-menu location="bottom end">
                    <template #activator="{ props }">
                      <v-btn v-bind="props" variant="text" class="actions-btn pa-0" min-width="0" height="24">
                        <v-icon :icon="mdiDotsHorizontal" size="20" color="black" />
                      </v-btn>
                    </template>
                    <v-list class="custom-dropdown elevation-1 rounded-lg" style="min-width: 200px">
                      <v-list-item @click="goToAnswerList(form)">
                        <template #prepend>
                          <v-icon :icon="mdiEye" size="18" />
                        </template>
                        <v-list-item-title>Ver</v-list-item-title>
                      </v-list-item>
                    </v-list>
                  </v-menu>
                </td>
              </tr>
            </template>
          </template>
        </ReportTableMeta>
      </template>
    </template>
  </div>
</template>

<style scoped src="@/styles/rform.css"></style>
