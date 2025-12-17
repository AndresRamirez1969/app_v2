<script setup>
import AnswerTableMeta from './RFormAnswerTableMeta.vue';
import StatusChip from '@/components/status/StatusChip.vue';
import { mdiChevronUp, mdiChevronDown, mdiDotsHorizontal, mdiEye, mdiLock, mdiDomainOff } from '@mdi/js';
// Cambié mdiFileChartCheckOutline por mdiLock

const props = defineProps({
  items: Array,
  sortedItems: Array,
  page: Number,
  itemsPerPage: Number,
  sortBy: String,
  sortDesc: Boolean,
  hasRating: Boolean,
  loading: Boolean
});

const emit = defineEmits(['update:page', 'sort', 'view', 'closeReport']);

const formatDate = (dateString) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const handleSort = (column) => emit('sort', column);
const handlePageChange = (newPage) => emit('update:page', newPage);

// Emitir evento para que el padre navegue a la ruta correcta
const viewAnswer = (answer) => {
  emit('view', {
    formId: answer.form_id,
    reportId: answer.id // Este es el id del reporte, correcto
  });
};

const closeReport = (id) => emit('closeReport', id);
</script>

<template>
  <div>
    <div v-if="loading" class="text-center py-8">
      <v-progress-circular indeterminate color="primary" size="64" />
      <p class="mt-4">Cargando reportes...</p>
    </div>

    <template v-else>
      <div v-if="!items.length" class="text-center py-8">
        <v-icon :icon="mdiDomainOff" size="64" color="grey lighten-1" />
        <p class="mt-4 text-h6 text-grey-darken-1">No se han registrado reportes</p>
        <p class="text-body-2 text-grey">No se encontraron reportes con los filtros aplicados</p>
      </div>

      <!-- MOBILE: tarjetas tipo OrganizationList SIN LOGO -->
      <div class="mobile-table" v-if="items.length">
        <v-card
          v-for="answer in items"
          :key="answer.id"
          class="mb-4 pa-3 elevation-1 rounded-lg row-clickable answer-mobile-card"
          @click="viewAnswer(answer)"
          style="cursor: pointer"
        >
          <div class="d-flex align-center mb-1" style="justify-content: space-between">
            <span class="folio-link folio-small" @click.stop="viewAnswer(answer)" style="cursor: pointer">
              {{ answer.folio }}
            </span>
            <StatusChip v-if="answer.status" :status="answer.status" />
          </div>
          <div class="font-weight-medium mb-1">{{ answer.name }}</div>
          <div class="text-caption mb-1">
            <strong>Fecha de respuesta:</strong>
            {{ formatDate(answer.answer_date) }}
          </div>
          <div v-if="hasRating" class="text-caption mb-1">
            <strong>Puntaje:</strong>
            {{ answer.score !== null && answer.score !== undefined ? Number(answer.score).toFixed(2) : '—' }}
          </div>
        </v-card>
        <div class="d-flex flex-column align-center mt-4">
          <v-pagination
            :model-value="page"
            :length="Math.ceil(sortedItems.length / itemsPerPage)"
            :total-visible="1"
            color="primary"
            @update:modelValue="handlePageChange"
            class="mobile-pagination"
          />
        </div>
      </div>

      <!-- DESKTOP: tabla -->
      <div class="desktop-table" v-if="items.length">
        <AnswerTableMeta
          :items="sortedItems"
          :page="page"
          :itemsPerPage="itemsPerPage"
          :sortBy="sortBy"
          :sortDesc="sortDesc"
          :hasRating="hasRating"
          @update:page="handlePageChange"
          @sort="handleSort"
        >
          <template #sort-icon="{ column }">
            <v-icon v-if="sortBy === column" size="16" class="ml-1">
              {{ sortDesc ? mdiChevronDown : mdiChevronUp }}
            </v-icon>
          </template>
          <template #rows>
            <tr v-for="answer in items" :key="answer.id" @click="viewAnswer(answer)" class="row-clickable" style="cursor: pointer">
              <td class="folio-cell">
                <a href="#" class="folio-link" style="text-decoration: underline; color: #1976d2" @click.stop.prevent="viewAnswer(answer)">
                  {{ answer.folio }}
                </a>
              </td>
              <td class="name-cell">{{ answer.name }}</td>
              <td class="answer-date-cell">{{ formatDate(answer.answer_date) }}</td>
              <td>
                <StatusChip v-if="answer.status" :status="answer.status" />
                <span v-else>—</span>
              </td>
              <td v-if="hasRating">
                {{ answer.score !== null && answer.score !== undefined ? Number(answer.score).toFixed(2) : '—' }}
              </td>
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
                    <!-- Solo muestra el divider y el botón "Cerrar" si el reporte NO está cerrado -->
                    <template v-if="answer.status !== 'closed'">
                      <v-divider />
                      <v-list-item @click="closeReport(answer.id)">
                        <template #prepend>
                          <v-icon :icon="mdiLock" size="18" />
                        </template>
                        <v-list-item-title>Cerrar Reporte</v-list-item-title>
                      </v-list-item>
                    </template>
                  </v-list>
                </v-menu>
              </td>
            </tr>
          </template>
        </AnswerTableMeta>
      </div>
    </template>
  </div>
</template>

<style scoped>
.card-shadow {
  box-shadow: 0px 2px 8px 0px rgba(60, 60, 60, 0.08) !important;
  border-radius: 16px !important;
  background: #fff !important;
  border: 1px solid #eaeaea !important;
}
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
.desktop-table {
  display: block;
}
.mobile-table {
  display: none;
}
@media (max-width: 960px) {
  .desktop-table {
    display: none !important;
  }
  .mobile-table {
    display: block !important;
  }
  .answer-mobile-card {
    box-shadow: 0px 2px 8px 0px rgba(60, 60, 60, 0.08) !important;
    border-radius: 16px !important;
    background: #fff !important;
    border: 1px solid #eaeaea !important;
  }
}
.folio-link {
  text-decoration: underline;
  color: #1976d2 !important;
  font-weight: 500;
}
.folio-small {
  font-size: 0.85em;
}
</style>
