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
const isLoading = ref(false);
const submitting = ref(false);
const form = ref(null);

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

const submitForm = async () => {
  submitting.value = true;
  try {
    // Transformar formData a formato de respuestas
    const answers = Object.keys(formData.value).map((fieldId) => ({
      form_field_id: fieldId,
      value: convertoToString(formData.value[fieldId])
    }));
    const payload = { answers };

    const res = await axiosInstance.post(`/forms/${formId.value}/responses`, payload);
    console.log(res.data);
    toast.success('Formulario enviado correctamente');
    router.push('/mis-formularios');
  } catch (err) {
    console.error('Failed to submit form', err);
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
            <v-time-picker></v-time-picker>
          </div>

          <!-- Campos del formulario -->
          <v-form @submit.prevent="submitForm">
            <div v-for="(field, index) in form.fields" :key="field.id || index" class="mb-6">
              <!-- Campo principal -->
              <component
                v-if="field.type !== 'radio'"
                :is="FIELD_TYPES(field)"
                v-bind="getFieldProps(field)"
                v-model="formData[field.id]"
                :rules="field.is_required ? [(v) => !!v || 'Este campo es requerido'] : []"
              />

              <!-- Campo de radio personalizado -->
              <div v-else>
                <v-label class="mb-2">{{ field.label }}</v-label>
                <v-radio-group v-model="formData[field.id]" :rules="field.is_required ? [(v) => !!v || 'Este campo es requerido'] : []">
                  <v-radio v-for="option in field.options" :key="option" :label="option" :value="option" class="ml-4" />
                </v-radio-group>
              </div>

              <!-- Opciones para checkbox -->
              <template v-if="field.type === 'checkbox' && field.options">
                <v-checkbox v-for="option in field.options" :key="option" :label="option" :value="option" class="ml-4" />
              </template>
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
