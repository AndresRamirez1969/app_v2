<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axiosInstance from '@/utils/axios';
import { mdiArrowLeft, mdiDownload } from '@mdi/js';

const route = useRoute();
const router = useRouter();

const formId = route.params.formId;
const responseId = route.params.responseId;
const userId = route.params.userId;

const form = ref({});
const userResponse = ref({});
const user = ref({});
const isLoading = ref(false);

const goBack = () => {
  router.back();
};

const getUserResponse = async () => {
  isLoading.value = true;
  try {
    const response = await axiosInstance.get(`/forms/${formId}/responses/${userId}`);
    form.value = response.data.form;
    userResponse.value = response.data.response[0];
    user.value = response.data.user;
    console.log('Datos completos:', response.data);
  } catch (err) {
    console.error('Error fetching user response:', err);
  } finally {
    isLoading.value = false;
  }
};

const exportResponse = async (responseId) => {
  try {
    const response = await axiosInstance.get(`/form-responses/${responseId}/pdf`);

    const pdfUrl = response.data.download_url;
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';

    const fileName = response.data.file_name || `respuestas_${form.value.name}_${new Date().toISOString().split('T')[0]}.pdf`;
    link.setAttribute('download', fileName);
    link.click();

    toast.success('Reporte exportado correctamente');
  } catch (err) {
    console.error('Error exporting responses:', err);
    toast.error('Error al exportar el reporte');
  }
};

const formatDate = (dateString) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getFieldValueForDisplay = (fieldId, fieldType) => {
  const response = userResponse.value.field_responses?.find((r) => r.form_field_id === fieldId);
  if (!response) {
    console.log(`No se encontró respuesta para el campo ${fieldId}`);
    return null;
  }

  console.log(`Campo ${fieldId} (${fieldType}):`, response);

  if (fieldType === 'file' || fieldType === 'signature') {
    let value = response.value;
    console.log(`Valor del campo ${fieldType}:`, value);

    // Si el valor es un string JSON (array), parsearlo
    if (typeof value === 'string' && value.startsWith('[')) {
      try {
        value = JSON.parse(value);
      } catch (e) {
        console.error('Error parsing JSON:', e);
        return null;
      }
    }

    // Si es un array, devolver el primer elemento o el array completo
    if (Array.isArray(value)) {
      return value.length > 0 ? value : null;
    }

    // Si el valor es una URL completa, úsala directamente
    if (value && (value.startsWith('http://') || value.startsWith('https://'))) {
      return value;
    }

    // Si es solo un nombre de archivo, construye la URL completa de S3
    if (value && !value.startsWith('http')) {
      const s3BaseUrl = 'https://tasker-v2-bucket.s3.us-east-2.amazonaws.com/';
      return s3BaseUrl + value;
    }

    return null;
  }

  return response.value || '—';
};

// Nueva función para obtener todos los archivos de un campo
const getFieldFiles = (fieldId, fieldType) => {
  const response = userResponse.value.field_responses?.find((r) => r.form_field_id === fieldId);
  if (!response) return [];

  if (fieldType === 'file' || fieldType === 'signature') {
    let value = response.value;

    // Si el valor es un string JSON (array), parsearlo
    if (typeof value === 'string' && value.startsWith('[')) {
      try {
        value = JSON.parse(value);
      } catch (e) {
        console.error('Error parsing JSON:', e);
        return [];
      }
    }

    // Si es un array, devolverlo
    if (Array.isArray(value)) {
      return value;
    }

    // Si es un string, convertirlo a array
    if (value && (value.startsWith('http://') || value.startsWith('https://'))) {
      return [value];
    }

    // Si es solo un nombre de archivo, construir la URL completa
    if (value && !value.startsWith('http')) {
      const s3BaseUrl = 'https://tasker-v2-bucket.s3.us-east-2.amazonaws.com/';
      return [s3BaseUrl + value];
    }

    return [];
  }

  return [];
};

onMounted(() => {
  getUserResponse();
});
</script>

<template>
  <v-container fluid>
    <!-- Header simple -->
    <v-row class="mb-4">
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex align-center justify-space-between">
            <div class="d-flex align-center">
              <v-btn icon variant="text" @click="goBack" class="mr-3">
                <v-icon :icon="mdiArrowLeft"></v-icon>
              </v-btn>
              <div>
                <h2 class="text-h5 mb-1">{{ form.name }}</h2>
                <p class="text-body-2 text-grey-darken-1 mb-0">
                  Respuesta de: <strong>{{ user.name || 'Usuario' }}</strong>
                </p>
              </div>
            </div>
            <v-btn color="primary" variant="outlined" @click="exportResponse(responseId)" :loading="isLoading" :prepend-icon="mdiDownload"
              >Exportar PDF</v-btn
            >
          </v-card-title>
        </v-card>
      </v-col>
    </v-row>

    <!-- Respuestas a los campos -->
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title>Respuestas del Usuario</v-card-title>
          <v-card-text>
            <div v-if="isLoading" class="text-center py-8">
              <v-progress-circular indeterminate color="primary" size="64" />
              <p class="mt-4">Cargando respuestas...</p>
            </div>

            <div v-else-if="!userResponse.field_responses || userResponse.field_responses.length === 0" class="text-center py-8">
              <p class="text-grey">No hay respuestas para mostrar</p>
            </div>

            <div v-else>
              <v-row>
                <v-col v-for="field in form.fields" :key="field.id" cols="12" md="6">
                  <v-card variant="outlined" class="mb-3">
                    <v-card-title class="text-subtitle-1 pa-3">
                      {{ field.label }}
                      <v-chip v-if="field.is_required" color="error" size="x-small" class="ml-2"> Requerido </v-chip>
                    </v-card-title>
                    <v-card-text class="pt-0">
                      <!-- Para campos de archivo o firma -->
                      <div v-if="field.type === 'signature' || field.type === 'file'">
                        <div v-if="getFieldFiles(field.id, field.type).length > 0">
                          <!-- Si hay múltiples archivos, mostrar todos -->
                          <div v-if="getFieldFiles(field.id, field.type).length > 1" class="d-flex flex-wrap gap-2">
                            <v-img
                              v-for="(fileUrl, index) in getFieldFiles(field.id, field.type)"
                              :key="index"
                              :src="fileUrl"
                              :alt="`Archivo ${index + 1}`"
                              class="mb-2"
                              max-height="200"
                              max-width="200"
                              contain
                            />
                          </div>
                          <!-- Si hay un solo archivo, mostrar normalmente -->
                          <v-img
                            v-else
                            :src="getFieldValueForDisplay(field.id, field.type)"
                            alt="Firma o archivo"
                            class="mb-2"
                            max-height="200"
                            contain
                          />
                        </div>
                        <div v-else class="text-center py-4">
                          <v-icon size="48" color="grey">mdi-file-image</v-icon>
                          <p class="text-grey mt-2">No hay archivo disponible</p>
                        </div>
                      </div>
                      <!-- Para todos los demás tipos de campos (texto, número, fecha, etc.) -->
                      <p v-else class="text-body-1">{{ getFieldValueForDisplay(field.id, field.type) }}</p>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
