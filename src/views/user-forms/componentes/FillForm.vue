<script setup>
import axiosInstance from '@/utils/axios';
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { mdiArrowLeft, mdiCheck } from '@mdi/js';
import { useRouter } from 'vue-router';
import { FIELD_TYPES, getFieldProps } from '@/constants/constants';
import { useToast } from 'vue-toastification';
import { convertoToString } from '@/utils/helpers/formHelper';

const toast = useToast();
const router = useRouter();
const route = useRoute();
const formId = ref(route.params.id);
const formData = ref({});
const fileData = ref({});
const isLoading = ref(false);
const submitting = ref(false);
const form = ref(null);
const formRef = ref(null);

const showForm = async () => {
  isLoading.value = true;
  try {
    const res = await axiosInstance.get(`/forms/${formId.value}`);
    form.value = res.data;

    // Inicializar formData solo si hay campos
    if (form.value && form.value.fields) {
      form.value.fields.forEach((field) => {
        if (field.type === 'checkbox') {
          formData.value[field.id] = [];
        } else if (field.type === 'file') {
          formData.value[field.id] = null;
          fileData.value[field.id] = null;
        } else {
          formData.value[field.id] = '';
        }
      });
    }
  } catch (err) {
    console.error('Failed to fetch form', err);
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
  const file = event.target.files[0];
  if (file) {
    fileData.value[fieldId] = file;
    formData.value[fieldId] = file.name;
  }
};

const submitForm = async () => {
  // Validar campos requeridos
  const requiredFields = form.value.fields.filter((field) => field.is_required);
  const missingFields = requiredFields.filter((field) => {
    if (field.type === 'checkbox') {
      return !formData.value[field.id] || formData.value[field.id].length === 0;
    }
    return !formData.value[field.id];
  });

  if (missingFields.length > 0) {
    toast.error('Por favor completa todos los campos requeridos');
    return;
  }

  submitting.value = true;
  try {
    const dataToSend = new FormData();
    // Transformar formData a formato de respuestas
    const answers = Object.keys(formData.value).map((fieldId) => {
      const field = form.value.fields.find((f) => f.id == fieldId);
      const answer = {
        form_field_id: fieldId,
        value: field.type === 'file' ? '' : convertoToString(formData.value[fieldId])
      };

      // Si es un archivo, marcar como is_file
      if (field.type === 'file') {
        answer.is_file = true;
      }

      return answer;
    });

    dataToSend.append('answers', JSON.stringify(answers));
    Object.keys(fileData.value).forEach((fieldId) => {
      if (fileData.value[fieldId]) {
        dataToSend.append(`file_${fieldId}`, fileData.value[fieldId]);
      }
    });

    const res = await axiosInstance.post(`/forms/${formId.value}/responses`, dataToSend, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    console.log(res.data);
    toast.success('Formulario enviado correctamente');
    router.push('/mis-formularios');
  } catch (err) {
    console.error('Failed to submit form', err);
    toast.error('Error al enviar el formulario');
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <v-container fluid>
    <v-card>
      <v-toolbar class="mb-4" density="compact" :title="form?.name || 'Formulario'">
        <template #prepend>
          <v-btn icon @click="goBack">
            <v-icon :icon="mdiArrowLeft" />
          </v-btn>
        </template>
        <template v-slot:append>
          <v-btn color="primary" variant="flat" @click="submitForm" :loading="submitting" :disabled="isLoading">
            <v-icon :icon="mdiCheck" class="mr-2" />
            Enviar Formulario
          </v-btn>
        </template>
      </v-toolbar>

      <v-card-text>
        <div v-if="isLoading" class="text-center pa-8">
          <v-progress-circular indeterminate color="primary" size="64" />
          <p class="mt-4">Cargando formulario...</p>
        </div>

        <div v-else-if="form && form.fields">
          <!-- Información del formulario -->
          <div class="mb-6">
            <h2 class="text-h4 mb-2">{{ form.name }}</h2>
            <p v-if="form.description" class="text-body-1 text-grey-darken-1 mb-4">
              {{ form.description }}
            </p>
            <v-divider class="mb-4" />
          </div>

          <!-- Campos del formulario -->
          <v-form ref="formRef" @submit.prevent="submitForm">
            <div v-for="(field, index) in form.fields" :key="field.id || index" class="mb-6">
              <!-- Campo de archivo -->
              <div v-if="field.type === 'file'">
                <v-label class="mb-2">{{ field.label }}</v-label>
                <v-file-input
                  v-model="fileData[field.id]"
                  :accept="'image/*'"
                  label="Seleccionar imagen"
                  :rules="field.is_required ? [(v) => !!v || 'Este campo es requerido'] : []"
                  @change="handleFileChange(field.id, $event)"
                  variant="outlined"
                />
                <div v-if="fileData[field.id]" class="text-caption text-grey">Archivo seleccionado: {{ fileData[field.id].name }}</div>
              </div>

              <!-- Campo de checkbox personalizado -->
              <div v-else-if="field.type === 'checkbox'">
                <v-label class="mb-2">{{ field.label }}</v-label>
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
                <div v-if="field.is_required && !formData[field.id]?.length" class="text-caption text-red mt-1">
                  Este campo es requerido
                </div>
              </div>

              <!-- Campo de radio personalizado -->
              <div v-else-if="field.type === 'radio'">
                <v-label class="mb-2">{{ field.label }}</v-label>
                <v-radio-group v-model="formData[field.id]" :rules="field.is_required ? [(v) => !!v || 'Este campo es requerido'] : []">
                  <v-radio v-for="option in field.options" :key="option" :label="option" :value="option" class="ml-4" />
                </v-radio-group>
              </div>

              <!-- Otros campos (excluyendo file, checkbox y radio) -->
              <component
                v-else-if="field.type !== 'file' && field.type !== 'checkbox' && field.type !== 'radio'"
                :is="FIELD_TYPES(field)"
                v-bind="getFieldProps(field)"
                v-model="formData[field.id]"
                :rules="field.is_required ? [(v) => !!v || 'Este campo es requerido'] : []"
              />
            </div>
          </v-form>
        </div>

        <div v-else class="text-center pa-8">
          <p class="text-grey">No se pudo cargar el formulario o no tiene campos</p>
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<style scoped>
.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
