<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { mdiArrowLeft } from '@mdi/js';
import axios from '@/utils/axios';
import ReportResponseViewer from '@/components/reports/ReportResponseViewer.vue';
import CloseReportModal from '@/components/reports/CloseReportModal.vue';
import StatusChip from '@/components/status/StatusChip.vue';

const router = useRouter();
const route = useRoute();
const reportId = route.params.reportId;
const showCloseInfo = ref(false);
const closeComments = ref('');
const closeEvidences = ref([]);
const closingReport = ref(false);

const loading = ref(true);
const reportData = ref(null);
const formData = ref(null);
const fieldResponses = ref([]);
const groups = ref([]);
const ungroupedFields = ref([]);
const reportFolio = ref('—');
const answeredBy = ref('—');
const reportStatus = ref('—');
function formatDateTimeDMY(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}-${mm}-${yy} ${hh}:${min}`;
}

async function fetchResponseDetail() {
  loading.value = true;
  try {
    const { data } = await axios.get(`/reportes/formulario/reportes/${reportId}`);
    reportData.value = data?.report || null;
    formData.value = data?.form || null;
    reportStatus.value = data?.report?.status || '—';
    reportFolio.value = data?.report?.folio || data?.report?.reportable?.folio || '—';
    answeredBy.value =
      data?.report?.reportable?.user?.name || data?.report?.reportable?.user?.email || data?.report?.reportable?.user_name || '—';
    fieldResponses.value = Array.isArray(data?.field_responses)
      ? data.field_responses
      : Array.isArray(data?.report?.reportable?.field_responses)
        ? data.report.reportable.field_responses
        : [];
    groups.value = Array.isArray(data?.groups) ? data.groups : [];
    ungroupedFields.value = Array.isArray(data?.ungrouped_fields) ? data.ungrouped_fields : [];
  } finally {
    loading.value = false;
  }
}
function isFile(obj) {
  return typeof window !== 'undefined' && window.File && obj instanceof window.File;
}

const evidencePreviewUrls = computed(() => {
  if (!closeEvidences.value || !Array.isArray(closeEvidences.value)) return [];
  return closeEvidences.value.map((file) => {
    if (isFile(file) && window.URL?.createObjectURL) {
      return window.URL.createObjectURL(file);
    }
    return '';
  });
});

async function closeReport() {
  if (closingReport.value) return;
  closingReport.value = true;
  try {
    const formDataPayload = new FormData();
    formDataPayload.append('status', 'closed');
    if (closeComments.value) formDataPayload.append('comments', closeComments.value);
    if (closeEvidences.value?.length) {
      closeEvidences.value.forEach((file) => {
        formDataPayload.append('evidences[]', file);
      });
    }
    await axios.put(`/reportes/formulario/reportes/${reportId}`, formDataPayload, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    showCloseInfo.value = false;
    closeComments.value = '';
    closeEvidences.value = [];
    router.push({ name: 'My Assignments' });
  } catch {
    alert('No se pudo cerrar el reporte.');
  } finally {
    closingReport.value = false;
  }
}

onMounted(fetchResponseDetail);

const goBack = () => router.push({ name: 'My Assignments' });
</script>

<template>
  <v-container fluid>
    <v-row class="align-center mb-6" no-gutters>
      <v-col cols="auto" class="d-flex align-center">
        <v-btn
          icon
          variant="text"
          class="px-3 py-2"
          style="border-radius: 8px; border: 1px solid #ccc; min-width: 44px; height: 44px"
          @click="goBack"
        >
          <v-icon :icon="mdiArrowLeft" />
        </v-btn>
        <h3 class="font-weight-medium ml-3 mb-0">
          Reporte asignado <span v-if="!loading">- {{ reportFolio }}</span>
          <v-progress-circular v-else indeterminate size="20" color="primary" class="ml-2" />
        </h3>
      </v-col>
      <v-spacer />
      <v-col cols="auto" class="d-flex justify-end align-center" v-if="reportStatus === 'open'">
        <v-btn color="primary" variant="elevated" @click="showCloseInfo = true">Cerrar reporte</v-btn>
      </v-col>
    </v-row>

    <v-row v-if="!loading && reportData">
      <v-col cols="12">
        <v-card class="rounded-lg elevation-1 pa-3 mb-4">
          <v-card-title class="font-weight-bold text-h6 pb-2" style="padding-left: 0.5rem">Información de respuesta</v-card-title>
          <v-table class="rounded-lg elevation-1 card-shadow">
            <tbody>
              <tr>
                <td class="key">Contestado por</td>
                <td>{{ answeredBy }}</td>
              </tr>
              <tr>
                <td class="key">Contestado el</td>
                <td>{{ formatDateTimeDMY(reportData?.created_at || reportData?.reportable?.submitted_at) || '—' }}</td>
              </tr>
              <tr>
                <td class="key">Estado</td>
                <td><StatusChip :status="reportStatus" /></td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-col>
    </v-row>

    <v-row v-if="formData?.fields">
      <v-col cols="12">
        <ReportResponseViewer
          :report-data="reportData"
          :form-data="formData"
          :field-responses="fieldResponses"
          :groups="groups"
          :ungrouped-fields="ungroupedFields"
          :report-folio="reportFolio"
        />
      </v-col>
    </v-row>

    <CloseReportModal
      :showCloseInfo="showCloseInfo"
      :closeComments="closeComments"
      :closeEvidences="closeEvidences"
      :evidencePreviewUrls="evidencePreviewUrls"
      :closingReport="closingReport"
      @update:showCloseInfo="(val) => (showCloseInfo = val)"
      @update:closeComments="(val) => (closeComments = val)"
      @update:closeEvidences="(val) => (closeEvidences = val)"
      @closeReport="closeReport"
    />
  </v-container>
</template>

<style scoped src="@/styles/report_answer_show.css"></style>
