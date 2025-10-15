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
                <td class="font-weight-bold text-subtitle-1">Nombre del Formulario</td>
                <td>{{ form?.name || 'No disponible' }}</td>
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
                <td>{{ businessUnit?.name }}</td>
              </tr>
              <tr>
                <td class="font-weight-bold text-subtitle-1">Descripción</td>
                <td>{{ form?.description ? form.description : '-' }}</td>
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
      <v-icon :icon="mdiMapMarkerOff" color="red" size="48"></v-icon>
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
              <div v-for="(field, index) in visibleFields" :key="field.id" class="mb-4">
                <v-card class="rounded-lg elevation-1 pa-0 card-business-unit">
                  <v-row no-gutters>
                    <v-col
                      cols="auto"
                      class="d-flex align-center justify-center question-number-desktop"
                      style="min-width: 48px; max-width: 64px; background: #f5f5f5"
                    >
                      <div class="text-h6 font-weight-bold" style="width: 100%; text-align: center">
                        {{ index + 1 }}
                      </div>
                    </v-col>
                    <v-col>
                      <div class="question-number-mobile mb-2">
                        <div class="text-h6 font-weight-bold question-number-mobile-inner">
                          {{ index + 1 }}
                        </div>
                      </div>
                      <v-card-text>
                        <v-label class="mb-2 field-label">
                          {{ field.label }}
                          <span v-if="field.is_required" class="required-asterisk">*</span>
                          <span v-if="field.score" class="ml-2 text-caption text-grey" style="font-weight: normal">
                            ({{ field.score }} pts)
                          </span>
                        </v-label>

                        <div
                          v-if="field.description"
                          class="field-description mb-2"
                          style="white-space: pre-line; display: flex; align-items: flex-start; gap: 0.4em"
                        >
                          <v-icon size="16" color="grey" class="mr-1">mdi-information-outline</v-icon>
                          {{ field.description }}
                        </div>

                        <!-- Si el campo requiere evidencia -->
                        <template v-if="field.has_evidence">
                          <div class="mb-4">
                            <component
                              :key="'field-' + field.id"
                              v-if="
                                field.type !== 'image' &&
                                field.type !== 'document' &&
                                field.type !== 'signature' &&
                                field.type !== 'geolocation'
                              "
                              :is="FIELD_TYPES(field)"
                              v-bind="{ ...getFieldProps(field), label: undefined }"
                              v-model="formData[field.id]"
                              :rules="field.is_required ? [(v) => !!v || 'Este campo es requerido'] : []"
                            />
                          </div>
                          <div>
                            <v-file-input
                              :key="fileVersion[`evidence-${field.id}`] || 0"
                              :model-value="evidenceData[field.id] || []"
                              accept="image/jpeg,image/png,image/jpg"
                              capture="environment"
                              multiple
                              :counter="true"
                              :show-size="true"
                              :rules="[(v) => !field.is_required || evidenceData[field.id]?.length >= 1 || '']"
                              variant="outlined"
                              :chips="true"
                              :clearable="true"
                              label="Adjuntar evidencia"
                              :messages="['Solo se permiten imágenes: JPG, JPEG, PNG. Máx total: 5MB.']"
                              @change="onEvidenceSelected(field.id, $event)"
                              @click:clear="
                                () => {
                                  evidenceData[field.id] = [];
                                  bumpVersion(`evidence-${field.id}`);
                                }
                              "
                            />
                            <!-- Previsualización de imágenes de evidencia -->
                            <div v-if="filteredEvidence(field.id).length" class="d-flex flex-wrap mt-3 image-preview-row">
                              <div
                                v-for="(file, idx) in filteredEvidence(field.id)"
                                :key="'evidence-' + (file?.name || file?.url || file) + idx"
                                style="position: relative; width: 120px; height: 120px; cursor: pointer"
                                @click="openImageModal(getImagePreview(file))"
                              >
                                <img
                                  :src="getImagePreview(file)"
                                  :alt="file.name || 'evidencia'"
                                  style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px; border: 1px solid #eee"
                                />
                                <!-- Eliminada la tachita de eliminar -->
                              </div>
                            </div>
                            <!-- Imágenes del campo imagen (cuando el campo es tipo imagen y tiene evidencia) -->
                            <div
                              v-if="field.type === 'image' && fileData[field.id]?.length"
                              class="d-flex flex-wrap mt-3 image-preview-row"
                            >
                              <div
                                v-for="(file, idx) in fileData[field.id]"
                                :key="'file-' + (file?.name || idx)"
                                style="position: relative; width: 120px; height: 120px; cursor: pointer"
                                @click="openImageModal(getImagePreview(file))"
                              >
                                <img
                                  :src="getImagePreview(file)"
                                  :alt="file?.name"
                                  style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px; border: 1px solid #eee"
                                />
                                <v-btn
                                  icon
                                  size="x-small"
                                  color="red"
                                  style="position: absolute; top: 2px; right: 2px; z-index: 2; background: #fff"
                                  @click.stop="removeFile(field.id, idx)"
                                >
                                  <v-icon size="16">mdi-close</v-icon>
                                </v-btn>
                              </div>
                            </div>
                          </div>
                        </template>

                        <!-- Si no tiene evidencia, render normal -->
                        <template v-else>
                          <!-- Campo Imagen -->
                          <div v-if="field.type === 'image'" class="d-flex flex-column align-stretch">
                            <v-file-input
                              :key="fileVersion[field.id] || 0"
                              :model-value="fileData[field.id] || []"
                              accept="image/*"
                              capture="environment"
                              multiple
                              :counter="true"
                              :show-size="true"
                              :rules="[
                                (v) =>
                                  !field.is_required ||
                                  (fileData[field.id]?.length >= 1 && fileData[field.id]?.length <= (field.attributes?.max_files || 4)) ||
                                  ''
                              ]"
                              @change="onFilesSelected(field.id, $event)"
                              variant="outlined"
                              :chips="true"
                              :clearable="true"
                              class="w-100"
                              @click:clear="clearFiles(field.id)"
                            />
                            <!-- Previsualización de imágenes debajo del input, alineadas a la derecha del field -->
                            <div v-if="fileData[field.id]?.length" class="d-flex flex-wrap mt-3 image-preview-row">
                              <div
                                v-for="(file, idx) in fileData[field.id]"
                                :key="file?.name + idx"
                                style="position: relative; width: 120px; height: 120px; cursor: pointer"
                                @click="openImageModal(getImagePreview(file))"
                              >
                                <img
                                  :src="getImagePreview(file)"
                                  :alt="file?.name"
                                  style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px; border: 1px solid #eee"
                                />
                              </div>
                            </div>
                          </div>

                          <!-- Campo Documento -->
                          <div v-else-if="field.type === 'document'" class="d-flex align-center">
                            <v-file-input
                              :key="fileVersion[field.id] || 0"
                              :model-value="fileData[field.id] || []"
                              accept="application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                              multiple
                              :counter="true"
                              :show-size="true"
                              :rules="[
                                (v) =>
                                  !field.is_required ||
                                  (fileData[field.id]?.length >= 1 && fileData[field.id]?.length <= (field.attributes?.max_files || 2)) ||
                                  ''
                              ]"
                              @change="onFilesSelected(field.id, $event)"
                              variant="outlined"
                              :chips="true"
                              :clearable="true"
                              class="flex-grow-1"
                              @click:clear="clearFiles(field.id)"
                            />
                          </div>

                          <!-- Campo Checkbox -->
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

                          <!-- Campo Firma -->
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
                                <div class="mr-2 mb-2" v-for="(file, idx) in signatureData[field.id]" :key="idx">
                                  <v-chip
                                    color="green"
                                    class="mr-1"
                                    size="small"
                                    closable
                                    :ripple="false"
                                    @mousedown.stop.prevent
                                    @click:close.stop="handleClearSignature(field.id, idx)"
                                  >
                                    <span>{{ file.name }}</span>
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

                          <!-- Campo Semáforo (chips, texto centrado) -->
                          <div v-else-if="isSemaforo(field)">
                            <div class="semaforo-chips-row">
                              <v-chip
                                v-for="option in field.options"
                                :key="option"
                                pill
                                variant="flat"
                                class="semaforo-chip"
                                :style="chipStyleFilled(option, formData[field.id] === option)"
                                @click="formData[field.id] = option"
                                :ripple="false"
                              >
                                <span class="semaforo-chip-grid">
                                  <span class="semaforo-check-left"></span>
                                  <span class="semaforo-text">{{ option }}</span>
                                  <span class="semaforo-check-right">
                                    <v-icon v-if="formData[field.id] === option" size="16">mdi-check</v-icon>
                                  </span>
                                </span>
                              </v-chip>
                            </div>
                            <div v-if="triedSubmit && field.is_required && !formData[field.id]" class="text-caption text-red mt-1">
                              Este campo es requerido
                            </div>
                          </div>

                          <!-- Campo Radio (cuando NO es semáforo) -->
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
                              field.type !== 'image' &&
                              field.type !== 'document' &&
                              field.type !== 'checkbox' &&
                              field.type !== 'radio' &&
                              field.type !== 'signature' &&
                              field.type !== 'geolocation'
                            "
                            :is="FIELD_TYPES(field)"
                            v-bind="{ ...getFieldProps(field), label: undefined }"
                            v-model="formData[field.id]"
                            :rules="field.is_required ? [(v) => !!v || 'Este campo es requerido'] : []"
                          />
                        </template>
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

      <!-- Modal para ver imagen grande -->
      <v-dialog v-model="imageModal.open" max-width="600px">
        <v-card>
          <v-img :src="imageModal.src" max-width="100%" max-height="80vh" style="object-fit: contain" />
          <v-card-actions class="justify-end">
            <v-btn color="primary" text @click="imageModal.open = false">Cerrar</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Fila separada: botón enviar en la esquina derecha -->
      <v-row>
        <v-col cols="12" class="d-flex justify-end">
          <v-btn color="primary" class="mt-6" :loading="submitting" :disabled="isLoading" @click="submitForm">
            <template #loader>
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
import { ref, onMounted, computed, reactive, watch, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { mdiArrowLeft, mdiCheck, mdiMapMarkerOff } from '@mdi/js';
import { FIELD_TYPES, getFieldProps } from '@/constants/constants';
import { useToast } from 'vue-toastification';
import { convertoToString } from '@/utils/helpers/formHelper';
import SignaturePad from '@/styles/SignaturePad.vue';
import AddressAutocomplete from '@/utils/helpers/google/AddressAutocomplete.vue';

const toast = useToast();
const router = useRouter();
const route = useRoute();
const formId = ref(route.params.id);

const formData = reactive({});
const fileData = reactive({});
const signatureData = reactive({});
const evidenceData = reactive({});

const isLoading = ref(false);
const submitting = ref(false);
const form = ref(null);
const formRef = ref(null);
const signatureRefs = ref({});

const organization = ref(null);
const business = ref(null);
const businessUnit = ref(null);
const businessUnitGroup = ref(null);

const triedSubmit = ref(false);

const userLocation = ref(null);
const geoCheckError = ref(null);

const fileVersion = ref({});
const bumpVersion = (key) => {
  fileVersion.value[key] = (fileVersion.value[key] || 0) + 1;
};

const SEMAFORO_COLORS = { Alto: '#e53935', Medio: '#ffd600', Bajo: '#43a047' };
const SEMAFORO_PASTEL = { Alto: '#ffebee', Medio: '#fffde7', Bajo: '#e8f5e9' };
const OPTION_KEYS = {
  alto: 'Alto',
  alta: 'Alto',
  high: 'Alto',
  rojo: 'Alto',
  medio: 'Medio',
  media: 'Medio',
  amarillo: 'Medio',
  medium: 'Medio',
  bajo: 'Bajo',
  baja: 'Bajo',
  low: 'Bajo',
  verde: 'Bajo'
};
const mapOptionKey = (opt) => {
  const k = String(opt || '')
    .trim()
    .toLowerCase();
  return OPTION_KEYS[k] || (['alto', 'medio', 'bajo'].includes(k) ? k[0].toUpperCase() + k.slice(1) : opt);
};
const isSemaforo = (field) => {
  const type = String(field?.type || '').toLowerCase();
  if (type === 'semaforo') return true;
  if (field?.attributes?.kind === 'semaforo' || field?.attributes?.display === 'semaforo') return true;
  const opts = (field?.options || []).map((o) => String(o).trim().toLowerCase());
  const hasAlto = opts.some((o) => ['alto', 'alta', 'rojo', 'high'].includes(o));
  const hasMedio = opts.some((o) => ['medio', 'media', 'amarillo', 'medium'].includes(o));
  const hasBajo = opts.some((o) => ['bajo', 'baja', 'verde', 'low'].includes(o));
  return type === 'radio' && hasAlto && hasMedio && hasBajo;
};
const chipStyleFilled = (option, isSelected) => {
  const key = mapOptionKey(option);
  const base = SEMAFORO_COLORS[key] || '#9e9e9e';
  const pastel = SEMAFORO_PASTEL[key] || '#f5f5f5';
  const text = key === 'Medio' ? '#111' : '#fff';
  return {
    background: isSelected ? base : pastel,
    color: isSelected ? text : '#222',
    border: 'none',
    padding: '4px 10px',
    fontWeight: isSelected ? '700' : '600',
    boxShadow: isSelected ? '0 0 0 2px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.12)' : 'none',
    transform: isSelected ? 'translateY(-1px)' : 'none',
    transition: 'all .15s ease-in-out',
    cursor: 'pointer',
    userSelect: 'none'
  };
};

const visibleFields = computed(
  () => form.value?.fields?.filter((f) => !(f.type === 'geolocation' && f.attributes?.mode === 'scope')) || []
);

// --- INTEGRACIÓN PARA FILTRAR EVIDENCIA (IMÁGENES) ---
const filteredEvidence = (fieldId) => {
  return (evidenceData[fieldId] || []).filter(
    (file) =>
      file &&
      ((file.type && file.type.startsWith('image/')) ||
        (typeof file === 'object' && file.url && /\.(jpg|jpeg|png)$/i.test(file.url)) ||
        (typeof file === 'string' && /\.(jpg|jpeg|png)$/i.test(file)))
  );
};
// -----------------------------------------------------

const getUserLocation = () =>
  new Promise((resolve, reject) => {
    const lat = localStorage.getItem('geo_lat');
    const lng = localStorage.getItem('geo_lng');
    if (lat !== null && lng !== null && lat !== '' && lng !== '' && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))) {
      resolve({ lat: parseFloat(lat), lng: parseFloat(lng) });
    } else {
      reject('No se encontró la ubicación del usuario. Por favor, inicia sesión de nuevo.');
    }
  });

const showForm = async () => {
  isLoading.value = true;
  geoCheckError.value = null;
  try {
    let res = await axiosInstance.get(`/forms/${formId.value}`);
    form.value = res.data.form || res.data.forms?.[0] || res.data.data;

    organization.value = form.value?.organization || null;
    business.value = form.value?.business || null;
    businessUnit.value = form.value?.business_unit || null;
    businessUnitGroup.value = form.value?.business_unit_group || null;

    (form.value?.fields || []).forEach((field) => {
      if (formData[field.id] === undefined) {
        if (field.type === 'checkbox') formData[field.id] = [];
        else formData[field.id] = '';
      }
      if (evidenceData[field.id] === undefined) {
        evidenceData[field.id] = [];
      }
    });

    const geoField = form.value?.fields?.find((f) => f.type === 'geolocation' && f.attributes?.mode === 'scope');
    if (geoField) {
      try {
        userLocation.value = await getUserLocation();
        if (
          typeof userLocation.value.lat !== 'number' ||
          typeof userLocation.value.lng !== 'number' ||
          isNaN(userLocation.value.lat) ||
          isNaN(userLocation.value.lng)
        ) {
          geoCheckError.value = 'Ubicación inválida. Por favor, vuelve a iniciar sesión.';
          isLoading.value = false;
          return;
        }
      } catch (err) {
        geoCheckError.value = err || 'No se pudo obtener tu ubicación';
        isLoading.value = false;
        return;
      }
      try {
        res = await axiosInstance.get(`/forms/${formId.value}`, {
          params: { for_response: 1, 'location.lat': userLocation.value.lat, 'location.lng': userLocation.value.lng }
        });
        form.value = res.data.form || res.data.forms?.[0] || res.data.data;
        organization.value = form.value?.organization || null;
        business.value = form.value?.business || null;
        businessUnit.value = form.value?.business_unit || null;
        businessUnitGroup.value = form.value?.business_unit_group || null;
      } catch (err) {
        if (err.response && err.response.status === 403) {
          geoCheckError.value = err.response.data.message || 'No puedes abrir este formulario fuera del alcance permitido.';
        } else if (err.response && err.response.status === 422) {
          geoCheckError.value = err.response.data.message || 'Se requiere la ubicación (lat/lng) para abrir el formulario.';
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

// --- INICIO: Watcher de geolocalización para campos scope + integración backend ---
let geoWatchId = null;

onMounted(() => {
  showForm();

  // Si el formulario tiene campo de geolocalización con scope, activa el watcher
  // (Esto se activa después de cargar el formulario)
  watch(
    form,
    (newForm) => {
      const geoField = newForm?.fields?.find((f) => f.type === 'geolocation' && f.attributes?.mode === 'scope');
      if (geoField && navigator.geolocation) {
        // Si ya hay un watcher, no lo vuelvas a activar
        if (geoWatchId !== null) return;
        geoWatchId = navigator.geolocation.watchPosition(
          async (pos) => {
            userLocation.value = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude
            };
            // --- INTEGRACIÓN: Enviar ubicación al backend ---
            try {
              await axiosInstance.post('/user/location', {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
                recorded_at: new Date().toISOString()
              });
            } catch (e) {
              // Opcional: puedes mostrar un toast o solo loguear
              // toast.warning('No se pudo registrar la ubicación en el backend');
              console.error('No se pudo guardar la ubicación del usuario:', e);
            }
            // --- FIN INTEGRACIÓN ---
          },
          (err) => {
            geoCheckError.value = 'No se pudo obtener tu ubicación en tiempo real.';
          },
          { enableHighAccuracy: true }
        );
      }
    },
    { immediate: true }
  );
});

onUnmounted(() => {
  if (geoWatchId !== null) {
    navigator.geolocation.clearWatch(geoWatchId);
    geoWatchId = null;
  }
});
// --- FIN: Watcher de geolocalización para campos scope + integración backend ---

watch(
  () => ({ ...formData }),
  (val, oldVal) => {
    console.log('formData changed', JSON.stringify(val));
  },
  { deep: true }
);

const goBack = () => {
  router.push('/mis-formularios');
};

const normalizeEventFiles = (evt) => {
  if (Array.isArray(evt)) return evt;
  if (evt instanceof FileList) return Array.from(evt);
  if (evt && evt.target && evt.target.files) return Array.from(evt.target.files);
  return [];
};

const getImagePreview = (file) => {
  if (!file) return '';
  if (file.previewUrl) return file.previewUrl;
  if (file instanceof File) {
    const url = URL.createObjectURL(file);
    file.previewUrl = url;
    return url;
  }
  if (typeof file === 'object' && file.url) return file.url;
  if (typeof file === 'string') return file;
  return '';
};

const onFilesSelected = (fieldId, evt) => {
  let selected = normalizeEventFiles(evt);
  const field = form.value.fields.find((f) => f.id == fieldId);
  const maxFiles = field?.attributes?.max_files || (field.type === 'document' ? 2 : 4);

  const current = Array.isArray(fileData[fieldId]) ? fileData[fieldId] : [];
  let combined = [...current, ...selected];

  combined = combined.filter((f, idx, arr) => f && arr.findIndex((x) => x && x.name === f.name && x.size === f.size) === idx);

  combined = combined.slice(0, maxFiles);

  fileData[fieldId] = [...combined];
  formData[fieldId] = combined.map((f) => f?.name);

  bumpVersion(fieldId);
};

const removeFile = (fieldId, idx) => {
  const current = Array.isArray(fileData[fieldId]) ? [...fileData[fieldId]] : [];
  if (!current.length) return;
  current.splice(idx, 1);
  fileData[fieldId] = current;
  formData[fieldId] = current.map((f) => f?.name);

  bumpVersion(fieldId);
};

const clearFiles = (fieldId) => {
  fileData[fieldId] = [];
  formData[fieldId] = [];
  bumpVersion(fieldId);
};

const onEvidenceSelected = (fieldId, evt) => {
  let selected = normalizeEventFiles(evt);
  const maxFiles = 4;

  // Solo imágenes permitidas
  selected = selected
    .filter((file) => {
      if (!file?.name) return false;
      const ext = file.name.split('.').pop().toLowerCase();
      return ['jpg', 'jpeg', 'png'].includes(ext);
    })
    .map((file) => {
      if (!file?.type && file?.name) {
        const ext = file.name.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg'].includes(ext)) file.type = 'image/jpeg';
        else if (ext === 'png') file.type = 'image/png';
      }
      return file;
    });

  const current = Array.isArray(evidenceData[fieldId]) ? evidenceData[fieldId] : [];
  let combined = [...current, ...selected];

  combined = combined.filter((f, idx, arr) => f && arr.findIndex((x) => x && x.name === f.name && x.size === f.size) === idx);

  combined = combined.slice(0, maxFiles);
  evidenceData[fieldId] = [...combined];

  bumpVersion(`evidence-${fieldId}`);
};

const removeEvidence = (fieldId, idx) => {
  const current = Array.isArray(evidenceData[fieldId]) ? [...evidenceData[fieldId]] : [];
  if (!current.length) return;
  current.splice(idx, 1);
  evidenceData[fieldId] = current;

  bumpVersion(`evidence-${fieldId}`);
};

const imageModal = reactive({
  open: false,
  src: ''
});
const openImageModal = (src) => {
  imageModal.src = src;
  imageModal.open = true;
};

const handleSignature = (fieldId, signatureBlob) => {
  if (signatureBlob instanceof Blob) {
    const field = form.value.fields.find((f) => f.id == fieldId);
    const maxFiles = field?.attributes?.max_files || 1;
    const fileName = `firma_${field?.label || fieldId}.jpg`;
    const signatureFile = new File([signatureBlob], fileName, { type: 'image/jpeg', lastModified: Date.now() });
    signatureData[fieldId] = [signatureFile].slice(0, maxFiles);
    formData[fieldId] = [fileName].slice(0, maxFiles);
  }
};

const handleClearSignature = (fieldId, idx = null) => {
  if (idx !== null && Array.isArray(signatureData[fieldId])) {
    const arr = [...signatureData[fieldId]];
    arr.splice(idx, 1);
    signatureData[fieldId] = arr;
    formData[fieldId] = arr.map((f) => f?.name);
  } else {
    signatureData[fieldId] = [];
    formData[fieldId] = [];
  }
};

const handleGeolocationManual = (fieldId, val) => {
  formData[fieldId] = val;
};
const isGeolocationManualValid = (val) => !!val && !!val.latitude && !!val.longitude;

const submitForm = async () => {
  triedSubmit.value = true;
  if (!form.value) return;

  const requiredFields = visibleFields.value.filter((f) => f.is_required);
  const missingFields = requiredFields.filter((field) => {
    if (field.has_evidence && (!evidenceData[field.id] || evidenceData[field.id].length < 1)) return true;
    if (field.type === 'checkbox') return !formData[field.id] || formData[field.id].length === 0;
    if (field.type === 'image' || field.type === 'document') return !fileData[field.id] || fileData[field.id].length < 1;
    if (field.type === 'signature') return !signatureData[field.id] || signatureData[field.id].length < 1;
    if (field.type === 'geolocation' && field.attributes?.mode === 'manual') return !isGeolocationManualValid(formData[field.id]);
    return !formData[field.id];
  });

  const tooManyFiles = visibleFields.value.some(
    (field) =>
      ((field.type === 'image' || field.type === 'document') &&
        fileData[field.id] &&
        fileData[field.id].length > (field.attributes?.max_files || (field.type === 'document' ? 2 : 4))) ||
      (field.type === 'signature' && signatureData[field.id] && signatureData[field.id].length > (field.attributes?.max_files || 1))
  );

  const geoField = form.value?.fields?.find((f) => f.type === 'geolocation' && f.attributes?.mode === 'scope');
  if (geoField) {
    if (
      !userLocation.value ||
      typeof userLocation.value.lat !== 'number' ||
      typeof userLocation.value.lng !== 'number' ||
      isNaN(userLocation.value.lat) ||
      isNaN(userLocation.value.lng)
    ) {
      toast.error('No se pudo obtener tu ubicación. Por favor, recarga la página o inicia sesión de nuevo.');
      return;
    }
  }

  if (missingFields.length > 0) {
    toast.error('Por favor completa todos los campos requeridos');
    return;
  }
  if (tooManyFiles) {
    toast.error('Solo puedes subir hasta el máximo de archivos permitido por campo');
    return;
  }

  submitting.value = true;
  try {
    const dataToSend = new FormData();

    const answers = form.value.fields.map((field) => {
      let value;
      if (field.type === 'image' || field.type === 'document' || field.type === 'signature') {
        value = (formData[field.id] || []).join(',');
      } else if (field.type === 'geolocation' && field.attributes?.mode === 'manual') {
        value = JSON.stringify(formData[field.id] || {});
      } else if (field.type === 'geolocation' && field.attributes?.mode === 'scope') {
        value = userLocation.value ? JSON.stringify({ lat: userLocation.value.lat, lng: userLocation.value.lng }) : '';
      } else {
        value = convertoToString(formData[field.id]);
      }
      const ans = { form_field_id: field.id, value };
      if (field.type === 'image' || field.type === 'document' || field.type === 'signature') ans.is_file = true;
      return ans;
    });

    dataToSend.append('answers', JSON.stringify(answers));

    Object.keys(fileData).forEach((fieldId) => (fileData[fieldId] || []).forEach((f) => f && dataToSend.append(`file_${fieldId}[]`, f)));
    Object.keys(signatureData).forEach((fieldId) =>
      (signatureData[fieldId] || []).forEach((f) => f && dataToSend.append(`file_${fieldId}[]`, f))
    );
    Object.keys(evidenceData).forEach((fieldId) =>
      (evidenceData[fieldId] || []).forEach((f) => f && dataToSend.append(`evidence_${fieldId}[]`, f))
    );

    if (geoField && userLocation.value) {
      dataToSend.append('location.lat', userLocation.value.lat);
      dataToSend.append('location.lng', userLocation.value.lng);
    }

    await axiosInstance.post(`/forms/${formId.value}/responses`, dataToSend, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    toast.success('Formulario enviado correctamente');
    router.push('/mis-formularios');
  } catch (err) {
    console.error('Error al enviar el formulario:', err);
    if (err.response?.data?.message) toast.error(err.response.data.message);
    else toast.error('Error al enviar el formulario');
  } finally {
    submitting.value = false;
  }
};

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
  justify-content: flex-start;
  width: 100%;
  min-height: 38px;
}
.field-description {
  font-size: 13px;
  background: #f9f9f9;
  color: #23272f;
  border-radius: 12px;
  padding: 6px 10px;
  margin-top: 4px;
  font-style: italic;
}
.question-number-mobile {
  display: none;
}
.question-number-mobile-inner {
  width: 100%;
  min-width: 0;
  height: 48px;
  background: #f5f5f5;
  border-radius: 8px 8px 0 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
}

/* --- Semáforo chips --- */
.semaforo-chips-row {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0;
  align-items: stretch;
  background: none;
  border: none;
  border-radius: 0;
  min-width: 0;
  max-width: none;
  box-shadow: none;
}

/* Tamaño fijo + sin padding interno del chip */
.semaforo-chip {
  border-radius: 999px !important;
  width: 100%;
  min-width: 0;
  height: 36px;
  padding: 0 !important;
  display: flex !important;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 4px;
  font-size: 0.98rem;
  user-select: none;
  cursor: pointer;
  box-sizing: border-box;
  margin: 0;
}

/* Centrado del contenedor interno de Vuetify */
.semaforo-chip .v-chip__content {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  padding: 0 !important;
  width: 100%;
  height: 100%;
}

/* Grilla 16px | texto | 16px */
.semaforo-chip-grid {
  display: grid;
  grid-template-columns: 16px 1fr 16px;
  align-items: center;
  width: 100%;
  height: 100%;
}
.semaforo-check-left,
.semaforo-check-right {
  display: flex;
  align-items: center;
  justify-content: center;
}
.semaforo-text {
  justify-self: center;
  text-align: center;
  font-weight: inherit;
}

.semaforo-chip:active {
  box-shadow: 0 2px 8px rgba(33, 150, 243, 0.12);
}

/* Ocultar el circulito del radio cuando sea semáforo */
.semaforo-radio .v-selection-control__input {
  display: none !important;
}
.semaforo-radio .v-label {
  margin: 0 !important;
  padding: 0 !important;
}

.image-preview-row {
  gap: 16px;
  padding-top: 0;
  padding-left: 16px;
}

/* Responsive */
@media (max-width: 900px) {
  .question-number-desktop {
    display: none !important;
  }
  .question-number-mobile {
    display: block;
  }
  .card-business-unit .v-card-text {
    padding-top: 16px !important;
  }
  .question-number-mobile-inner {
    border-radius: 12px 12px 0 0 !important;
    font-size: 1.25rem;
    font-weight: bold;
  }
}
</style>
