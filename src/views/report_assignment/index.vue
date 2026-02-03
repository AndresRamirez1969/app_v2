<script setup>
import { ref, onMounted } from 'vue';
import { useDisplay } from 'vuetify';
import ReportAssignmentList from './ReportAssignmentList.vue';
import axiosInstance from '@/utils/axios';

const { mdAndDown } = useDisplay();

const reports = ref([]);
const isLoading = ref(false);

const fetchAssignedReports = async () => {
  isLoading.value = true;
  try {
    const { data } = await axiosInstance.get('/reportes/formulario/reportes/asignados');
    const raw = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
    reports.value = raw.map((item) => {
      const r = item.reportable || {};
      const report = r.reports?.[0] || {};
      return {
        id: report.id ?? item.id,
        folio: r.folio ?? report.folio ?? '—',
        form_id: r.form_id ?? report.form_id ?? r.form?.id,
        form: r.form ?? { name: r.form?.name, folio: r.form?.folio },
        status: r.status ?? report.status,
        submitted_at: r.submitted_at,
        answer_date: r.submitted_at,
        user: r.user,
        reportable: r
      };
    });
  } catch (err) {
    console.error('Error al obtener reportes asignados:', err);
    reports.value = [];
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  fetchAssignedReports();
});
</script>

<template>
  <v-container fluid>
    <v-row class="align-center justify-space-between mb-4">
      <v-col cols="auto" class="d-flex align-center">
        <h3 class="font-weight-medium mb-0">Mis Reportes Asignados</h3>
      </v-col>
    </v-row>
    <v-row>
      <v-col>
        <ReportAssignmentList :items="reports" :is-mobile="mdAndDown" :is-loading="isLoading" />
      </v-col>
    </v-row>
  </v-container>
</template>
