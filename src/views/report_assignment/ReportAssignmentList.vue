<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { mdiChevronUp, mdiChevronDown } from '@mdi/js';
import StatusChip from '@/components/status/StatusChip.vue';

const props = defineProps({
  items: { type: Array, default: () => [] },
  isLoading: { type: Boolean, default: false },
  isMobile: { type: Boolean, default: false }
});

const router = useRouter();

const sortBy = ref('folio');
const sortDesc = ref(false);
const page = ref(1);
const itemsPerPage = ref(10);

const isTabletOrSmaller = ref(false);

const checkScreen = () => {
  isTabletOrSmaller.value = window.innerWidth <= 1024;
};

onMounted(() => {
  checkScreen();
  window.addEventListener('resize', checkScreen);
});
onBeforeUnmount(() => {
  window.removeEventListener('resize', checkScreen);
});

const toggleSort = (column) => {
  if (sortBy.value === column) sortDesc.value = !sortDesc.value;
  else {
    sortBy.value = column;
    sortDesc.value = false;
  }
};

const formatDate = (dateString) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const sortedItems = computed(() =>
  [...(props.items || [])].sort((a, b) => {
    const aVal = a[sortBy.value]?.toString().toLowerCase() ?? '';
    const bVal = b[sortBy.value]?.toString().toLowerCase() ?? '';
    return aVal.localeCompare(bVal) * (sortDesc.value ? -1 : 1);
  })
);

const paginatedItems = computed(() => sortedItems.value.slice((page.value - 1) * itemsPerPage.value, page.value * itemsPerPage.value));

const viewReport = (report) => {
  const reportId = report.id;
  if (reportId) {
    router.push({
      name: 'My Assignment Show',
      params: { reportId: String(reportId) }
    });
  }
};

const getFormName = (report) => {
  return report.reportable?.name || report.form_name || report.form_folio || '—';
};

const getFormFolio = (report) => {
  return report.reportable?.folio || report.reportable?.form?.folio || '—';
};
</script>

<template>
  <div>
    <div v-if="isLoading" class="text-center py-8">
      <v-progress-circular indeterminate color="primary" size="64" />
      <p class="mt-4">Cargando reportes asignados...</p>
    </div>
    <template v-else>
      <div v-if="!paginatedItems.length" class="text-center py-8">
        <p class="mt-4 text-h6 text-grey-darken-1">No hay reportes asignados</p>
        <p class="text-body-2 text-grey">No tienes reportes asignados en este momento</p>
      </div>

      <!-- Móvil: cards -->
      <template v-else-if="isTabletOrSmaller">
        <v-card
          v-for="report in paginatedItems"
          :key="report.id"
          class="mb-4 pa-3 elevation-1 rounded-lg row-clickable"
          style="cursor: pointer"
          @click="viewReport(report)"
        >
          <div class="d-flex align-center mb-1 justify-space-between">
            <span class="folio-link" style="cursor: pointer" @click.stop="viewReport(report)">
              {{ report.folio }}
            </span>
            <StatusChip v-if="report.status" :status="report.status" />
          </div>
          <div class="font-weight-medium mb-1">{{ getFormName(report) }}</div>
          <div class="text-caption mb-1"><strong>Formulario:</strong> {{ getFormFolio(report) }}</div>
          <div class="text-caption mb-1">
            <strong>Fecha de respuesta:</strong> {{ formatDate(report.answer_date || report.submitted_at) }}
          </div>
        </v-card>
      </template>

      <!-- Escritorio: tabla -->
      <template v-else>
        <v-table density="comfortable" class="fixed-table elevation-1 rounded-lg">
          <thead>
            <tr>
              <th @click="toggleSort('folio')" class="cursor-pointer" style="padding: 12px 16px; text-align: left">
                Folio
                <v-icon v-if="sortBy === 'folio'" size="16" class="ml-1">
                  {{ sortDesc ? mdiChevronDown : mdiChevronUp }}
                </v-icon>
              </th>
              <th @click="toggleSort('form_name')" class="cursor-pointer" style="padding: 12px 16px; text-align: left">
                Formulario
                <v-icon v-if="sortBy === 'form_name'" size="16" class="ml-1">
                  {{ sortDesc ? mdiChevronDown : mdiChevronUp }}
                </v-icon>
              </th>
              <th style="padding: 12px 16px; text-align: left">Fecha</th>
              <th style="padding: 12px 16px; text-align: left">Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="report in paginatedItems" :key="report.id" class="row-clickable" style="cursor: pointer" @click="viewReport(report)">
              <td class="folio-cell">
                <span class="folio-link" @click.stop="viewReport(report)">{{ report.folio }}</span>
              </td>
              <td class="name-cell">{{ getFormName(report) }}</td>
              <td class="date-cell">{{ formatDate(report.answer_date || report.submitted_at) }}</td>
              <td class="status-cell">
                <StatusChip v-if="report.status" :status="report.status" />
                <span v-else>—</span>
              </td>
            </tr>
          </tbody>
        </v-table>
        <div class="d-flex justify-center mt-4">
          <v-pagination
            v-model="page"
            :length="Math.ceil(sortedItems.length / itemsPerPage)"
            :total-visible="7"
            @update:model-value="page = $event"
          />
        </div>
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
.date-cell,
.status-cell {
  padding: 12px 16px;
  border-bottom: 1px solid #e0e0e0;
}
tbody tr:last-child td {
  border-bottom: none !important;
}
.folio-link {
  color: #1976d2 !important;
  text-decoration: underline;
  cursor: pointer;
}
.v-theme--dark .row-clickable:hover {
  background: rgba(255, 255, 255, 0.08) !important;
}
.v-theme--dark .folio-cell,
.v-theme--dark .name-cell,
.v-theme--dark .date-cell,
.v-theme--dark .status-cell {
  border-bottom-color: rgba(255, 255, 255, 0.12);
}
</style>
