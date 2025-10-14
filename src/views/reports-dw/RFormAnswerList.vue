<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import AnswerTableMeta from './RFormAnswerTableMeta.vue';
import { mdiChevronUp, mdiChevronDown, mdiDotsHorizontal, mdiEye, mdiDomainOff } from '@mdi/js';
import axios from '@/utils/axios';

const route = useRoute();
const router = useRouter();

const props = defineProps({
  formId: {
    type: [String, Number],
    required: false
  },
  isMobile: Boolean,
  isLoading: Boolean
});

const items = ref([]);
const loading = ref(false);

const sortBy = ref('folio');
const sortDesc = ref(false);
const page = ref(1);
const itemsPerPage = ref(10);

const resolvedFormId = computed(() => {
  const val = props.formId ?? route.params.formId ?? route.params.form;
  return val && val !== '0' && val !== 0 && val !== '' ? val : null;
});

const fetchAnswers = async () => {
  loading.value = true;
  try {
    if (!resolvedFormId.value) {
      console.warn('No se encontró formId válido para obtener reportes', {
        formId: resolvedFormId.value,
        params: route.params
      });
      items.value = [];
      loading.value = false;
      return;
    }
    const { data } = await axios.get(`/forms/${resolvedFormId.value}/responses/reports`);

    if (!data || !Array.isArray(data.responses)) {
      console.warn('No se encontraron respuestas en la respuesta del backend');
      items.value = [];
      loading.value = false;
      return;
    }

    items.value = data.responses.flatMap((resp) => {
      if (!resp.reports || !resp.reports.length) {
        return [
          {
            id: resp.response.id,
            folio: resp.response.folio ?? resp.response.id,
            name: resp.response.user?.name || '—',
            answer_date: resp.response.submitted_at || '—',
            score: resp.response.score,
            reports: [],
            raw: resp
          }
        ];
      }

      return resp.reports.map((report) => ({
        id: report.id,
        folio: resp.response.folio ?? resp.response.id,
        name: report.reviewer?.name || '—',
        answer_date: report.created_at || resp.response.submitted_at || '—',
        score: resp.response.score,
        status: report.status,
        report,
        raw: { ...resp, report }
      }));
    });
  } catch (e) {
    console.error('Error al obtener reportes:', e);
    items.value = [];
  } finally {
    loading.value = false;
  }
};

onMounted(fetchAnswers);

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
  return [...(items.value || [])].sort((a, b) => {
    const aVal = a[sortBy.value]?.toString().toLowerCase() ?? '';
    const bVal = b[sortBy.value]?.toString().toLowerCase() ?? '';
    return aVal.localeCompare(bVal) * (sortDesc.value ? -1 : 1);
  });
});

const paginatedItems = computed(() => {
  const start = (page.value - 1) * itemsPerPage.value;
  return sortedItems.value.slice(start, start + itemsPerPage.value);
});

const viewAnswer = (answer) => {
  // Aquí puedes navegar a la vista de detalle del reporte si tienes esa ruta
  // router.push({ name: 'ShowReport', params: { formId: resolvedFormId.value, responseId: answer.folio, reportId: answer.id } });
};

watch(
  () => [resolvedFormId.value],
  () => {
    fetchAnswers();
    page.value = 1;
  }
);
</script>

<template>
  <div>
    <div v-if="loading || isLoading" class="text-center py-8">
      <v-progress-circular indeterminate color="primary" size="64" />
      <p class="mt-4">Cargando reportes...</p>
    </div>
    <template v-else>
      <div v-if="!paginatedItems.length" class="text-center py-8">
        <v-icon :icon="mdiDomainOff" size="64" color="grey lighten-1" />
        <p class="mt-4 text-h6 text-grey-darken-1">No se han registrado reportes</p>
        <p class="text-body-2 text-grey">No se encontraron reportes con los filtros aplicados</p>
      </div>

      <!-- Modo móvil -->
      <template v-else-if="isMobile">
        <v-card
          v-for="answer in paginatedItems"
          :key="answer.id"
          class="mb-4 pa-3 elevation-1 rounded-lg row-clickable"
          @click="viewAnswer(answer)"
          style="cursor: pointer"
        >
          <v-row no-gutters align="center" class="mb-1">
            <v-col cols="12">
              <div class="d-flex align-center mb-1" style="justify-content: space-between">
                <div class="text-caption" style="margin-right: 8px">
                  <span>{{ answer.folio }}</span>
                </div>
                <v-menu location="bottom end">
                  <template #activator="{ props }">
                    <v-btn v-bind="props" variant="text" class="actions-btn pa-0" min-width="0" height="24">
                      <v-icon :icon="mdiDotsHorizontal" size="20" color="black" />
                    </v-btn>
                  </template>
                  <v-list class="custom-dropdown elevation-1 rounded-lg" style="min-width: 200px">
                    <v-list-item @click="viewAnswer(answer)">
                      <template #prepend>
                        <v-icon :icon="mdiEye" size="18" />
                      </template>
                      <v-list-item-title>Ver</v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </div>
              <div class="font-weight-medium mb-1">{{ answer.name }}</div>
              <div class="text-caption"><strong>Fecha de Reporte:</strong> {{ formatDate(answer.answer_date) }}</div>
              <div class="text-caption"><strong>Estatus:</strong> {{ answer.status || '—' }}</div>
              <div class="text-caption"><strong>Puntaje:</strong> {{ answer.score ?? '—' }}</div>
              <div class="text-caption" style="font-size: 11px; color: #888">
                <pre>{{ answer.raw }}</pre>
              </div>
            </v-col>
          </v-row>
        </v-card>
      </template>

      <!-- Modo escritorio -->
      <template v-else>
        <AnswerTableMeta
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
              <tr
                v-for="answer in paginatedItems"
                :key="answer.id"
                @click="viewAnswer(answer)"
                class="row-clickable"
                style="cursor: pointer"
              >
                <td class="folio-cell">{{ answer.folio }}</td>
                <td class="name-cell">{{ answer.name }}</td>
                <td class="answer-date-cell">{{ formatDate(answer.answer_date) }}</td>
                <td>{{ answer.status || '—' }}</td>
                <td>{{ answer.score ?? '—' }}</td>
                <td class="actions-cell" @click.stop>
                  <v-menu location="bottom end">
                    <template #activator="{ props }">
                      <v-btn v-bind="props" variant="text" class="actions-btn pa-0" min-width="0" height="24">
                        <v-icon :icon="mdiDotsHorizontal" size="20" color="black" />
                      </v-btn>
                    </template>
                    <v-list class="custom-dropdown elevation-1 rounded-lg" style="min-width: 200px">
                      <v-list-item @click="viewAnswer(answer)">
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
        </AnswerTableMeta>
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
.answer-date-cell {
  padding: 12px 16px;
  border-bottom: 1px solid #e0e0e0;
}

.actions-cell {
  width: 60px;
  text-align: center;
  padding: 0 8px;
}

.custom-dropdown {
  border-radius: 10px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  padding: 4px 0;
  background: white;
}

.actions-btn {
  min-width: 32px !important;
  min-height: 32px !important;
}
</style>
