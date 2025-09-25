<template>
  <v-container fluid>
    <!-- Encabezado: flecha + folio - nombre -->
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
        <h3 class="font-weight-medium ml-3 mb-0">{{ form?.folio }} - {{ form?.name || 'Formulario' }}</h3>
      </v-col>
    </v-row>

    <!-- Primera fila: logo + info general -->
    <v-row class="mb-6">
      <v-col cols="12" md="4" class="d-flex justify-center align-center">
        <template v-if="formLogo">
          <v-img :src="formLogo" max-width="320" max-height="320" class="rounded-lg" alt="Logo" style="background: none" />
        </template>
        <template v-else>
          <div
            class="d-flex align-center justify-center"
            style="width: 200px; height: 200px; background-color: #f5f5f5; border-radius: 12px"
          >
            <span class="text-medium-emphasis">Sin logo</span>
          </div>
        </template>
      </v-col>
      <v-col cols="12" md="8">
        <!-- Título fuera del card -->
        <div class="font-weight-bold text-h6 mb-2" style="padding-left: 0.5rem">Información general</div>
        <v-card class="rounded-lg elevation-1 pa-0">
          <v-table class="rounded-lg elevation-0" style="border: none">
            <tbody>
              <tr>
                <td class="font-weight-bold text-subtitle-1">Folio</td>
                <td>
                  <span v-if="form?.folio">{{ form.folio }}</span>
                  <span v-else>No disponible</span>
                </td>
              </tr>
              <tr>
                <td class="font-weight-bold text-subtitle-1">
                  <template v-if="form?.assignment_scope === 'organization'">Nombre Legal (Organización)</template>
                  <template v-else-if="form?.assignment_scope === 'business'">Nombre (Empresa)</template>
                  <template v-else-if="form?.assignment_scope === 'business_unit'">Nombre (Ubicación)</template>
                  <template v-else-if="form?.assignment_scope === 'business_unit_group'">Grupo de Unidades</template>
                  <template v-else>Nombre del Formulario</template>
                </td>
                <td>
                  <template v-if="form?.assignment_scope === 'organization'">
                    {{ organization?.legal_name || 'No disponible' }}
                  </template>
                  <template v-else-if="form?.assignment_scope === 'business'">
                    {{ business?.name || 'No disponible' }}
                  </template>
                  <template v-else-if="form?.assignment_scope === 'business_unit'">
                    {{ businessUnit?.name || 'No disponible' }}
                  </template>
                  <template v-else-if="form?.assignment_scope === 'business_unit_group'">
                    {{ businessUnitGroup?.id || 'ID' }}
                  </template>
                  <template v-else>
                    {{ form?.name || 'Formulario' }}
                  </template>
                </td>
              </tr>
              <tr v-if="form?.assignment_scope === 'business_unit_group' && businessUnit?.name">
                <td class="font-weight-bold text-subtitle-1">Ubicación del usuario</td>
                <td>
                  {{ businessUnit?.name }}
                </td>
              </tr>
              <tr>
                <td class="font-weight-bold text-subtitle-1">Descripción</td>
                <td>{{ form?.description || 'No disponible' }}</td>
              </tr>
              <tr>
                <td class="font-weight-bold text-subtitle-1">Frecuencia</td>
                <td>
                  {{
                    form?.frequency === 'once_per_day'
                      ? 'Una vez al día'
                      : form?.frequency === 'multiple_per_day'
                        ? 'Muchas veces al día'
                        : form?.frequency || 'No disponible'
                  }}
                </td>
              </tr>
              <tr v-if="form?.has_weighting && form?.max_score">
                <td class="font-weight-bold text-subtitle-1">Puntaje Máximo</td>
                <td>{{ form?.max_score }} puntos</td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-col>
    </v-row>

    <!-- Mensaje de error de geolocalización o fuera de alcance -->
    <div v-if="geoCheckError" class="text-center pa-8">
      <v-icon color="red" size="48">mdi-map-marker-off</v-icon>
      <p class="text-h6 mt-4">{{ geoCheckError }}</p>
      <v-btn color="primary" class="mt-4" @click="showForm">Reintentar</v-btn>
    </div>

    <!-- Segunda fila: preguntas (cada pregunta en su propio card) -->
    <template v-else>
      <v-row>
        <v-col cols="12">
          <v-form ref="formRef" @submit.prevent="submitForm">
            <div v-if="isLoading" class="text-center pa-8">
              <v-progress-circular indeterminate color="primary" size="64" />
              <p class="mt-4">Cargando formulario...</p>
            </div>
            <div v-else-if="form && form.fields && form.fields.length">
              <div v-for="(field, index) in visibleFields" :key="field.id || index" class="mb-4">
                <v-card class="rounded-lg elevation-1 pa-0 card-business-unit">
                  <v-row no-gutters>
                    <v-col
                      cols="auto"
                      class="d-flex align-center justify-center"
                      style="min-width: 48px; max-width: 64px; background: #f5f5f5"
                    >
                      <div class="text-h6 font-weight-bold" style="width: 100%; text-align: center">
                        {{ index + 1 }}
                      </div>
                    </v-col>
                    <v-col>
                      <v-card-text>
                        <v-label class="mb-2 field-label">
                          {{ field.label }}
                          <span v-if="field.is_required" class="required-asterisk">*</span>
                          <span v-if="field.score" class="ml-2 text-caption text-grey" style="font-weight: normal"
                            >({{ field.score }} pts)</span
                          >
                        </v-label>
                        <div v-if="field.type === 'file'">
                          <v-file-input
                            v-model="fileData[field.id]"
                            :accept="'image/*,application/pdf,.doc,.docx'"
                            multiple
                            :counter="true"
                            :show-size="true"
                            :rules="[
                              (v) => !field.is_required || (fileData[field.id]?.length >= 1 && fileData[field.id]?.length <= 4) || ''
                            ]"
                            @change="handleFileChange(field.id, $event)"
                            variant="outlined"
                            :chips="false"
                            :clearable="false"
                          >
                            <template #selection>
                              <div class="file-chips-container">
                                <v-chip
                                  v-for="(file, idx) in fileData[field.id]"
                                  :key="file.name + idx"
                                  color="primary"
                                  class="mr-2 mb-2"
                                  size="small"
                                >
                                  <span>{{ file.name }}</span>
                                </v-chip>
                              </div>
                            </template>
                          </v-file-input>
                        </div>
                        <div v-else-if="field.type === 'checkbox'">
                          <div class="checkbox-group">
                            <v-checkbox
                              v-for="option in field.options"
                              :key="option"
                              :label="option"
                              :value="option"
                              v-model="formData[field.id]"
                              class="ml-4"
                            />
                          </div>
                          <div v-if="triedSubmit && field.is_required && !formData[field.id]?.length" class="text-caption text-red mt-1">
                            Este campo es requerido
                          </div>
                        </div>
                        <div v-else-if="field.type === 'signature'">
                          <div class="signature-container">
                            <SignaturePad
                              :ref="
                                (el) => {
                                  if (el) signatureRefs[field.id] = [el];
                                }
                              "
                              @signature-changed="(signatureBlob) => handleSignature(field.id, signatureBlob)"
                            />
                            <div class="d-flex flex-wrap justify-end mt-2" v-if="signatureData[field.id]?.length">
                              <div v-for="(file, idx) in signatureData[field.id]" :key="idx" class="mr-2 mb-2">
                                <v-chip color="green" class="mr-1" size="small">
                                  {{ file.name }}
                                </v-chip>
                              </div>
                            </div>
                          </div>
                          <div
                            v-if="triedSubmit && field.is_required && (!signatureData[field.id] || signatureData[field.id].length < 1)"
                            class="text-caption text-red mt-1"
                          >
                            Adjunta al menos una firma
                          </div>
                        </div>
                        <div v-else-if="field.type === 'radio'">
                          <v-radio-group
                            v-model="formData[field.id]"
                            :rules="field.is_required ? [(v) => !!v || 'Este campo es requerido'] : []"
                          >
                            <v-radio v-for="option in field.options" :key="option" :label="option" :value="option" class="ml-4" />
                          </v-radio-group>
                        </div>
                        <!-- Campo geolocalización manual -->
                        <div v-else-if="field.type === 'geolocation' && field.attributes?.mode === 'manual'">
                          <AddressAutocomplete
                            :initialValue="formData[field.id]"
                            mode="create"
                            :addressError="
                              triedSubmit && field.is_required && !isGeolocationManualValid(formData[field.id])
                                ? 'Este campo es requerido'
                                : ''
                            "
                            @update:parsedAddress="(val) => handleGeolocationManual(field.id, val)"
                          />
                          <div
                            v-if="triedSubmit && field.is_required && !isGeolocationManualValid(formData[field.id])"
                            class="text-caption text-red mt-1"
                          >
                            Este campo es requerido
                          </div>
                        </div>
                        <!-- Otros campos -->
                        <component
                          v-else-if="
                            field.type !== 'file' && field.type !== 'checkbox' && field.type !== 'radio' && field.type !== 'geolocation'
                          "
                          :is="FIELD_TYPES(field)"
                          v-bind="{
                            ...getFieldProps(field),
                            label: undefined // Quita el label dentro del field
                          }"
                          v-model="formData[field.id]"
                          :rules="field.is_required ? [(v) => !!v || 'Este campo es requerido'] : []"
                        />
                      </v-card-text>
                    </v-col>
                  </v-row>
                </v-card>
              </div>
            </div>
            <div v-else class="text-center pa-8">
              <p class="text-grey">No se pudo cargar el formulario o no tiene campos</p>
            </div>
          </v-form>
        </v-col>
      </v-row>

      <!-- Fila separada: botón enviar en la esquina derecha -->
      <v-row>
        <v-col cols="12" class="d-flex justify-end">
          <v-btn color="primary" class="mt-6" :loading="submitting" :disabled="isLoading" @click="submitForm">
            <template v-slot:loader>
              <v-progress-circular indeterminate color="white" size="20" />
            </template>
            <v-icon :icon="mdiCheck" class="mr-2" />
            {{ submitting ? 'Enviando...' : 'Enviar Formulario' }}
          </v-btn>
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>

<script setup>
import axiosInstance from '@/utils/axios';
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { mdiArrowLeft, mdiCheck } from '@mdi/js';
import { FIELD_TYPES, getFieldProps } from '@/constants/constants';
import { useToast } from 'vue-toastification';
import { convertoToString } from '@/utils/helpers/formHelper';
import SignaturePad from '@/styles/SignaturePad.vue';
import AddressAutocomplete from '@/utils/helpers/google/AddressAutocomplete.vue';

const toast = useToast();
const router = useRouter();
const route = useRoute();
const formId = ref(route.params.id);
const formData = ref({});
const fileData = ref({});
const signatureData = ref({});
const isLoading = ref(false);
const submitting = ref(false);
const form = ref(null);
const formRef = ref(null);
const signatureRefs = ref({});

// Datos para encabezado e info general
const organization = ref(null);
const business = ref(null);
const businessUnit = ref(null);
const businessUnitGroup = ref(null);

// --- INTEGRACIÓN: Control de submit para mostrar errores solo después de intentar enviar ---
const triedSubmit = ref(false);

// NUEVO: Para control de geolocalización
const userLocation = ref(null);
const geoCheckError = ref(null);

// Computed para filtrar los campos visibles (oculta geolocalización con scope)
const visibleFields = computed(
  () => form.value?.fields?.filter((field) => !(field.type === 'geolocation' && field.attributes?.mode === 'scope')) || []
);

// NUEVO: Usar la ubicación guardada en localStorage (no volver a pedir permiso)
const getUserLocation = () =>
  new Promise((resolve, reject) => {
    const lat = localStorage.getItem('geo_lat');
    const lng = localStorage.getItem('geo_lng');
    if (lat && lng) {
      resolve({ lat: parseFloat(lat), lng: parseFloat(lng) });
    } else {
      reject('No se encontró la ubicación del usuario. Por favor, inicia sesión de nuevo.');
    }
  });

const showForm = async () => {
  isLoading.value = true;
  geoCheckError.value = null;
  try {
    // 1. Primer fetch para saber si hay campo geolocalización scope
    let res = await axiosInstance.get(`/forms/${formId.value}`);
    form.value = res.data.forms ? res.data.forms[0] : res.data.data;

    // Extraer info adicional si existe
    organization.value = form.value?.organization || null;
    business.value = form.value?.business || null;
    businessUnit.value = form.value?.business_unit || null;
    businessUnitGroup.value = form.value?.business_unit_group || null;

    // 2. Si tiene campo geolocalización con mode=scope, usar ubicación guardada
    const geoField = form.value?.fields?.find((f) => f.type === 'geolocation' && f.attributes?.mode === 'scope');
    if (geoField) {
      try {
        userLocation.value = await getUserLocation();
      } catch (err) {
        geoCheckError.value = err || 'No se pudo obtener tu ubicación';
        isLoading.value = false;
        return;
      }
      // Hacer fetch con ubicación y for_response=1
      try {
        res = await axiosInstance.get(`/forms/${formId.value}`, {
          params: {
            for_response: 1,
            'location.lat': userLocation.value.lat,
            'location.lng': userLocation.value.lng
          }
        });
        form.value = res.data.forms ? res.data.forms[0] : res.data.data;
        // Extraer info adicional de nuevo (por si cambia)
        organization.value = form.value?.organization || null;
        business.value = form.value?.business || null;
        businessUnit.value = form.value?.business_unit || null;
        businessUnitGroup.value = form.value?.business_unit_group || null;
      } catch (err) {
        if (err.response && err.response.status === 403) {
          geoCheckError.value = err.response.data.message || 'No puedes abrir este formulario fuera del alcance permitido.';
        } else {
          geoCheckError.value = 'No se pudo cargar el formulario';
        }
        isLoading.value = false;
        return;
      }
    }
  } catch (err) {
    geoCheckError.value = 'No se pudo cargar el formulario';
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  showForm();
});

const goBack = () => {
  router.push('/mis-formularios');
};

const handleFileChange = (fieldId, event) => {
  const files = Array.from(event.target.files).slice(0, 4);
  fileData.value[fieldId] = files;
  formData.value[fieldId] = files.map((f) => f.name);
};

const removeFile = (fieldId, idx) => {
  if (Array.isArray(fileData.value[fieldId])) {
    fileData.value[fieldId].splice(idx, 1);
    formData.value[fieldId].splice(idx, 1);
  }
};

// SOLO UNA FIRMA POR CAMPO
const handleSignature = (fieldId, signatureBlob) => {
  if (signatureBlob instanceof Blob) {
    const field = form.value.fields.find((f) => f.id == fieldId);
    const fileName = `firma_${field?.label || fieldId}.png`;
    const signatureFile = new File([signatureBlob], fileName, {
      type: 'image/*',
      lastModified: Date.now()
    });
    // Reemplaza cualquier firma anterior
    signatureData.value[fieldId] = [signatureFile];
    formData.value[fieldId] = [fileName];
  }
};

const handleClearSignature = (fieldId, idx = null) => {
  if (idx !== null && Array.isArray(signatureData.value[fieldId])) {
    signatureData.value[fieldId].splice(idx, 1);
    formData.value[fieldId].splice(idx, 1);
  } else {
    signatureData.value[fieldId] = [];
    formData.value[fieldId] = [];
  }
};

const handleGeolocationManual = (fieldId, val) => {
  formData.value[fieldId] = val;
};

const isGeolocationManualValid = (val) => {
  // Considera válido si tiene lat y lng
  return !!val && !!val.latitude && !!val.longitude;
};

const submitForm = async () => {
  triedSubmit.value = true;
  if (!form.value) return;
  // Usar visibleFields para validación de requeridos
  const requiredFields = visibleFields.value.filter((field) => field.is_required);
  const missingFields = requiredFields.filter((field) => {
    if (field.type === 'checkbox') {
      return !formData.value[field.id] || formData.value[field.id].length === 0;
    } else if (field.type === 'file') {
      return !fileData.value[field.id] || fileData.value[field.id].length < 1;
    } else if (field.type === 'signature') {
      return !signatureData.value[field.id] || signatureData.value[field.id].length < 1;
    } else if (field.type === 'geolocation' && field.attributes?.mode === 'manual') {
      return !isGeolocationManualValid(formData.value[field.id]);
    }
    return !formData.value[field.id];
  });

  // Validar máximo 4 archivos/firma
  const tooManyFiles = visibleFields.value.some(
    (field) =>
      (field.type === 'file' && fileData.value[field.id] && fileData.value[field.id].length > 4) ||
      (field.type === 'signature' && signatureData.value[field.id] && signatureData.value[field.id].length > 4)
  );

  if (missingFields.length > 0) {
    toast.error('Por favor completa todos los campos requeridos');
    return;
  }
  if (tooManyFiles) {
    toast.error('Solo puedes subir hasta 4 archivos o firmas por campo');
    return;
  }

  submitting.value = true;
  try {
    const dataToSend = new FormData();
    const answers = Object.keys(formData.value).map((fieldId) => {
      // Buscar el field en todos los campos, no solo los visibles, para no perder respuestas ocultas
      const field = form.value.fields.find((f) => f.id == fieldId);
      let value;
      if (field.type === 'file' || field.type === 'signature') {
        value = (formData.value[fieldId] || []).join(',');
      } else if (field.type === 'geolocation' && field.attributes?.mode === 'manual') {
        value = JSON.stringify(formData.value[fieldId] || {});
      } else {
        value = convertoToString(formData.value[fieldId]);
      }
      const answer = {
        form_field_id: fieldId,
        value
      };
      if (field.type === 'file' || field.type === 'signature') answer.is_file = true;
      return answer;
    });
    dataToSend.append('answers', JSON.stringify(answers));
    Object.keys(fileData.value).forEach((fieldId) => {
      (fileData.value[fieldId] || []).forEach((file) => {
        if (file) dataToSend.append(`file_${fieldId}[]`, file);
      });
    });
    Object.keys(signatureData.value).forEach((fieldId) => {
      (signatureData.value[fieldId] || []).forEach((file) => {
        if (file) dataToSend.append(`file_${fieldId}[]`, file);
      });
    });

    await axiosInstance.post(`/forms/${formId.value}/responses`, dataToSend, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    toast.success('Formulario enviado correctamente');
    router.push('/mis-formularios');
  } catch (err) {
    console.error('Failed to submit form', err);
    toast.error('Error al enviar el formulario');
  } finally {
    submitting.value = false;
  }
};

// INTEGRACIÓN: Buscar logo en todos los posibles campos
const formLogo = computed(
  () => form.value?.logo_url || form.value?.logo || organization.value?.logo_url || organization.value?.logo || null
);
</script>

<style scoped>
.card-business-unit,
.v-card.rounded-lg.elevation-1.pa-0,
.v-table.rounded-lg {
  border-radius: 12px !important;
  background: #fff;
  border: 1px solid #f0f0f0;
  box-shadow: 0px 2px 8px 0px rgba(60, 60, 60, 0.08) !important;
}
.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.signature-container {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  background-color: #fafafa;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}
.required-asterisk {
  color: #e53935;
  font-weight: bold;
  margin-left: 4px;
}
.field-label {
  color: #23272f;
  font-weight: 500;
}
.file-chips-container {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start; /* Cambiado para alinear a la izquierda */
  width: 100%;
  min-height: 38px;
}
</style>
