<template>
  <v-card>
    <v-toolbar class="mb-4" density="compact" title="Agregar Campos al Formulario">
      <template #prepend>
        <v-btn icon @click="goBack">
          <v-icon :icon="mdiArrowLeft" />
        </v-btn>
      </template>
      <template v-slot:append>
        <v-btn color="primary" variant="flat" @click="saveFields" :loading="saving" :disabled="fields.length === 0"> Guardar Campos </v-btn>
      </template>
    </v-toolbar>

    <v-card-text>
      <div class="mb-6">
        <h3 class="text-h5 mb-2">{{ form?.name || 'Formulario' }}</h3>
        <p class="text-body-2 text-grey-darken-1">ID: {{ formId }} | Alcance: {{ getScopeLabel(form?.assignment_scope) }}</p>
      </div>

      <!-- Form Fields List -->
      <div v-if="fields.length > 0" class="mb-6">
        <h4 class="text-h6 mb-4">Campos del Formulario</h4>
        <draggable v-model="fields" item-key="order" handle=".drag-handle" @end="onDragEnd" class="v-list">
          <template #item="{ element: field, index }">
            <v-list-item class="mb-2 border rounded">
              <template #prepend>
                <v-icon class="mr-2 drag-handle" :icon="mdiDrag"></v-icon>
              </template>

              <v-list-item-title class="font-weight-medium">
                {{ field.label }}
                <v-chip :color="getFieldTypeColor(field.type)" size="x-small" class="ml-2">
                  {{ getFieldTypeLabel(field.type) }}
                </v-chip>
                <v-chip v-if="field.is_required" color="red" size="x-small" class="ml-1"> Requerido </v-chip>
              </v-list-item-title>

              <v-list-item-subtitle> Orden: {{ field.order }} </v-list-item-subtitle>

              <template #append>
                <v-btn icon size="small" color="error" @click="removeField(index)">
                  <v-icon :icon="mdiDelete"></v-icon>
                </v-btn>
              </template>
            </v-list-item>
          </template>
        </draggable>
      </div>

      <!-- Add Field Button -->
      <v-btn color="primary" variant="outlined" @click="showAddFieldDialog = true" class="mb-4">
        <v-icon class="mr-2" :icon="mdiPlus"></v-icon>
        Agregar Campo
      </v-btn>

      <!-- Add Field Dialog -->
      <v-dialog v-model="showAddFieldDialog" max-width="600px">
        <v-card>
          <v-card-title>Agregar Nuevo Campo</v-card-title>
          <v-card-text>
            <FormKit v-model="newField" type="form" @submit="addField" :actions="false">
              <FormKit
                name="label"
                type="text"
                id="label"
                label="Etiqueta del Campo"
                placeholder="Ej: Nombre completo"
                validation="required|length:1,255"
                validation-label="Etiqueta"
              />

              <FormKit
                name="type"
                type="select"
                label="Tipo de Campo"
                :options="fieldTypes"
                validation="required"
                validation-label="Tipo"
              />

              <FormKit name="is_required" type="checkbox" label="Campo requerido" />

              <FormKit v-if="showOptionsField" name="options" type="repeater" label="Opciones" :value="[]">
                <FormKit name="option" type="text" placeholder="Opción" validation="required|length:1,255" />
              </FormKit>
              <FormKit type="submit" label="Agregar Campo" :disabled="!isNewFieldValid" />
            </FormKit>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn @click="showAddFieldDialog = false">Cancelar</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { mdiArrowLeft, mdiDrag, mdiDelete, mdiPlus } from '@mdi/js';
import { useRoute, useRouter } from 'vue-router';
import { SCOPES } from '@/constants/constants';
import axiosInstance from '@/utils/axios';
import { useToast } from 'vue-toastification';
import draggable from 'vuedraggable';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const formId = ref('');
const fields = ref([]);
const showAddFieldDialog = ref(false);
const saving = ref(false);

// Fetch objeto de form desde el backend
const form = ref(null);

const fetchForm = async () => {
  if (!formId.value) return;

  try {
    const response = await axiosInstance.get(`/forms/${formId.value}`);
    form.value = response.data;
  } catch (error) {
    console.error('Error fetching form:', error);
    toast.error('Error al obtener el formulario');
  }
};

// New field form data
const newField = ref({
  label: '',
  type: 'text',
  is_required: false,
  options: [],
  order: 0,
  attributes: []
});

// Field types configuration
const fieldTypes = [
  { label: 'Texto', value: 'text' },
  { label: 'Área de texto', value: 'textarea' },
  { label: 'Email', value: 'email' },
  { label: 'Contraseña', value: 'password' },
  { label: 'Número', value: 'number' },
  { label: 'Fecha', value: 'date' },
  { label: 'Hora', value: 'time' },
  { label: 'Selector', value: 'select' },
  { label: 'Radio', value: 'radio' },
  { label: 'Checkbox', value: 'checkbox' },
  { label: 'Archivo', value: 'file' },
  { label: 'Color', value: 'color' },
  { label: 'Rango', value: 'range' },
  { label: 'Switch', value: 'switch' },
  { label: 'Teléfono', value: 'tel' },
  { label: 'URL', value: 'url' },
  { label: 'Oculto', value: 'hidden' }
];

// Computed properties
const showOptionsField = computed(() => {
  return ['select', 'radio', 'checkbox'].includes(newField.value.type);
});

const isNewFieldValid = computed(() => {
  return newField.value.label && newField.value.type && newField.value.order >= 0;
});

// Methods
const goBack = () => {
  router.push('/formularios');
};

const getScopeLabel = (scope) => {
  if (!scope) return 'No definido';
  const scopeLabel = SCOPES.find((s) => s.value === scope);
  return scopeLabel ? scopeLabel.label : scope;
};

const getFieldTypeLabel = (type) => {
  const fieldType = fieldTypes.find((ft) => ft.value === type);
  return fieldType ? fieldType.label : type;
};

const getFieldTypeColor = (type) => {
  const colors = {
    text: 'blue',
    textarea: 'blue',
    email: 'green',
    password: 'red',
    number: 'orange',
    date: 'purple',
    time: 'purple',
    select: 'indigo',
    radio: 'indigo',
    checkbox: 'indigo',
    file: 'brown',
    color: 'pink',
    range: 'deep-purple',
    switch: 'teal',
    tel: 'cyan',
    url: 'light-blue',
    hidden: 'grey'
  };
  return colors[type] || 'grey';
};

const addField = () => {
  console.log('addField ejecutado');
  // Validate required options for select/radio/checkbox
  if (showOptionsField.value && (!newField.value.options || newField.value.options.length === 0)) {
    toast.error('Los campos de tipo selector, radio y checkbox requieren al menos una opción');
    return;
  }

  // Convert attributes array to object
  const attributes = {};
  if (newField.value.attributes && newField.value.attributes.length > 0) {
    newField.value.attributes.forEach((attr) => {
      if (attr.key && attr.value) {
        attributes[attr.key] = attr.value;
      }
    });
  }

  // Create field object matching backend payload
  const field = {
    label: newField.value.label,
    type: newField.value.type,
    is_required: newField.value.is_required,
    options: showOptionsField.value ? newField.value.options.map((opt) => opt.option) : null,
    order: newField.value.order,
    attributes: Object.keys(attributes).length > 0 ? attributes : null
  };

  fields.value.push(field);

  // Reset form
  newField.value = {
    label: '',
    type: 'text',
    is_required: false,
    options: [],
    order: fields.value.length,
    attributes: []
  };

  showAddFieldDialog.value = false;
};

const removeField = (index) => {
  fields.value.splice(index, 1);
  // Reorder remaining fields
  fields.value.forEach((field, idx) => {
    field.order = idx;
  });
  toast.success('Campo eliminado');
};

const saveFields = async () => {
  if (fields.value.length === 0) {
    toast.error('No hay campos para guardar');
    return;
  }

  saving.value = true;
  try {
    const response = await axiosInstance.post(`/forms/${formId.value}/fields`, {
      fields: fields.value
    });

    toast.success('Campos guardados correctamente');
    console.log('Fields saved:', response.data);

    router.push(`/formulario/${formId.value}`);
  } catch (error) {
    console.error('Error saving fields:', error);
    toast.error('Error al guardar los campos: ' + (error.response?.data?.message || error.message));
  } finally {
    saving.value = false;
  }
};

const onDragEnd = () => {
  // Actualizar el orden de los campos
  fields.value.forEach((field, index) => {
    field.order = index;
  });
};

onMounted(async () => {
  formId.value = route.params.id;
  await fetchForm();
});
</script>

<style scoped>
.border {
  border: 1px solid #e0e0e0;
}
</style>
