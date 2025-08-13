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
      <v-btn color="primary" variant="outlined" @click="showFieldBuilder = true" class="mb-4">
        <v-icon class="mr-2" :icon="mdiPlus"></v-icon>
        Agregar Campo
      </v-btn>

      <!-- Field Builder Dialog -->
      <v-dialog v-model="showFieldBuilder" fullscreen hide-overlay transition="dialog-bottom-transition">
        <v-card>
          <v-toolbar color="primary" dark>
            <v-btn icon @click="showFieldBuilder = false">
              <v-icon :icon="mdiClose"></v-icon>
            </v-btn>
            <v-toolbar-title>Constructor de Campos</v-toolbar-title>
            <v-spacer></v-spacer>
            <v-btn @click="showFieldBuilder = false" variant="text"> Cerrar </v-btn>
          </v-toolbar>

          <v-container fluid class="pa-0">
            <v-row no-gutters class="h-100">
              <!-- Panel izquierdo - Área de configuración -->
              <v-col cols="12" md="6" class="pa-4 border-right">
                <div class="d-flex justify-space-between align-center mb-4">
                  <h3 class="text-h5">Configuración de Campos</h3>
                  <v-btn color="primary" variant="flat" @click="saveCurrentFields" :disabled="currentFields.length === 0">
                    Guardar Campos
                  </v-btn>
                </div>

                <!-- Área de drop para campos -->
                <div
                  ref="dropZone"
                  class="drop-zone pa-4 border rounded-lg"
                  :class="{ 'drop-zone-active': isDragOver }"
                  @dragover.prevent="handleDragOver"
                  @dragleave.prevent="handleDragLeave"
                  @drop.prevent="handleDrop"
                >
                  <div v-if="currentFields.length === 0" class="text-center text-grey-darken-1">
                    <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-drag</v-icon>
                    <p>Arrastra tipos de campos aquí para comenzar</p>
                  </div>

                  <!-- Campos configurados -->
                  <draggable v-model="currentFields" item-key="id" handle=".drag-handle" @end="onCurrentFieldsDragEnd" class="v-list">
                    <template #item="{ element: field, index }">
                      <v-card class="mb-3 pa-3" variant="outlined">
                        <div class="d-flex align-center justify-space-between">
                          <div class="d-flex align-center">
                            <v-icon class="mr-2 drag-handle" :icon="mdiDrag" color="grey"></v-icon>
                            <div>
                              <div class="font-weight-medium">{{ field.label || 'Campo sin nombre' }}</div>
                              <div class="text-caption text-grey-darken-1">
                                {{ getFieldTypeLabel(field.type) }}
                              </div>
                            </div>
                          </div>
                          <div class="d-flex align-center">
                            <v-btn icon size="small" @click="editField(index)" color="primary">
                              <v-icon :icon="mdiPencil"></v-icon>
                            </v-btn>
                            <v-btn icon size="small" @click="removeCurrentField(index)" color="error">
                              <v-icon :icon="mdiDelete"></v-icon>
                            </v-btn>
                          </div>
                        </div>
                      </v-card>
                    </template>
                  </draggable>
                </div>
              </v-col>

              <!-- Panel derecho - Tipos de campos disponibles -->
              <v-col cols="12" md="6" class="pa-4 bg-grey-lighten-5">
                <h3 class="text-h5 mb-4">Tipos de Campos Disponibles</h3>

                <v-row>
                  <v-col v-for="fieldType in availableFieldTypes" :key="fieldType.value" cols="12" sm="6" md="4">
                    <v-card
                      class="field-type-card pa-3 text-center cursor-pointer"
                      variant="outlined"
                      draggable="true"
                      @dragstart="handleDragStart($event, fieldType)"
                      @click="addFieldType(fieldType)"
                    >
                      <v-icon :icon="fieldType.icon" size="32" :color="getFieldTypeColor(fieldType.value)" class="mb-2"></v-icon>
                      <div class="text-body-2 font-weight-medium">{{ fieldType.label }}</div>
                      <div class="text-caption text-grey-darken-1">{{ fieldType.description }}</div>
                    </v-card>
                  </v-col>
                </v-row>
              </v-col>
            </v-row>
          </v-container>
        </v-card>
      </v-dialog>

      <!-- Edit Field Dialog -->
      <v-dialog v-model="showEditDialog" max-width="600px">
        <v-card>
          <v-card-title>Editar Campo</v-card-title>
          <v-card-text>
            <v-form ref="editForm" @submit.prevent="saveEditedField">
              <v-text-field
                v-model="editingField.label"
                label="Etiqueta del Campo"
                variant="outlined"
                required
                class="mb-4"
                @keyup.enter="saveEditedField"
              />

              <v-checkbox v-model="editingField.is_required" label="Campo requerido" class="mb-4" />

              <div v-if="showOptionsField" class="mb-4">
                <v-label class="text-body-2 font-weight-medium mb-2">Opciones</v-label>
                <div v-for="(option, index) in editingField.options" :key="index" class="d-flex align-center mb-2">
                  <v-text-field
                    v-model="editingField.options[index]"
                    :placeholder="`Opción ${index + 1}`"
                    variant="outlined"
                    density="compact"
                    class="mr-2"
                    @keyup.enter="saveEditedField"
                  />
                  <v-btn icon size="small" color="error" @click="removeOption(index)">
                    <v-icon :icon="mdiDelete"></v-icon>
                  </v-btn>
                </div>
                <v-btn color="primary" variant="outlined" @click="addOption" class="mt-2">
                  <v-icon :icon="mdiPlus" class="mr-1"></v-icon>
                  Agregar Opción
                </v-btn>
              </div>
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn @click="showEditDialog = false">Cancelar</v-btn>
            <v-btn color="primary" @click="saveEditedField">Guardar</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import {
  mdiArrowLeft,
  mdiDrag,
  mdiDelete,
  mdiPlus,
  mdiClose,
  mdiPencil,
  mdiFormTextbox,
  mdiFormTextarea,
  mdiFormTextboxPassword,
  mdiNumeric,
  mdiCalendar,
  mdiClock,
  mdiFormSelect,
  mdiRadioboxMarked,
  mdiCheckboxMarkedOutline,
  mdiFileImage,
  mdiTuneVariant,
  mdiToggleSwitch,
  mdiSignature
} from '@mdi/js';
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
const showFieldBuilder = ref(false);
const showEditDialog = ref(false);
const saving = ref(false);
const isDragOver = ref(false);
const editingFieldIndex = ref(-1);

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

// Campos actuales en el builder
const currentFields = ref([]);

// Campo que se está editando
const editingField = ref({
  label: '',
  type: '',
  is_required: false,
  options: [],
  order: 0
});

// Tipos de campos disponibles con previews
const availableFieldTypes = ref([
  {
    label: 'Texto',
    value: 'text',
    icon: mdiFormTextbox,
    description: 'Campo de texto simple',
    preview: 'v-text-field'
  },
  {
    label: 'Área de texto',
    value: 'textarea',
    icon: mdiFormTextarea,
    description: 'Campo de texto multilínea',
    preview: 'v-textarea'
  },
  {
    label: 'Email',
    value: 'email',
    icon: mdiFormTextbox,
    description: 'Campo para dirección de email',
    preview: 'v-text-field'
  },
  {
    label: 'Contraseña',
    value: 'password',
    icon: mdiFormTextboxPassword,
    description: 'Campo para contraseñas',
    preview: 'v-text-field'
  },
  {
    label: 'Número',
    value: 'number',
    icon: mdiNumeric,
    description: 'Campo numérico',
    preview: 'v-text-field'
  },
  {
    label: 'Fecha',
    value: 'date',
    icon: mdiCalendar,
    description: 'Selector de fecha',
    preview: 'v-text-field'
  },
  {
    label: 'Hora',
    value: 'time',
    icon: mdiClock,
    description: 'Selector de hora',
    preview: 'v-text-field'
  },
  {
    label: 'Selector',
    value: 'select',
    icon: mdiFormSelect,
    description: 'Lista desplegable',
    preview: 'v-select'
  },
  {
    label: 'Radio',
    value: 'radio',
    icon: mdiRadioboxMarked,
    description: 'Botones de radio',
    preview: 'v-radio-group'
  },
  {
    label: 'Checkbox',
    value: 'checkbox',
    icon: mdiCheckboxMarkedOutline,
    description: 'Casillas de verificación',
    preview: 'v-checkbox'
  },
  {
    label: 'Archivo',
    value: 'file',
    icon: mdiFileImage,
    description: 'Subida de archivos',
    preview: 'v-file-input'
  },
  {
    label: 'Firma',
    value: 'signature',
    icon: mdiSignature,
    description: 'Firma digital',
    preview: 'ejs-signature'
  },
  {
    label: 'Rango',
    value: 'range',
    icon: mdiTuneVariant,
    description: 'Slider de rango',
    preview: 'v-slider'
  },
  {
    label: 'Switch',
    value: 'switch',
    icon: mdiToggleSwitch,
    description: 'Interruptor',
    preview: 'v-switch'
  },
  {
    label: 'URL',
    value: 'url',
    description: 'Campo para URL',
    preview: 'v-text-field'
  },
  {
    label: 'Oculto',
    value: 'hidden',

    description: 'Campo oculto',
    preview: 'v-text-field'
  }
]);

// Computed properties
const showOptionsField = computed(() => {
  return ['select', 'radio', 'checkbox'].includes(editingField.value.type);
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
  const fieldType = availableFieldTypes.value.find((ft) => ft.value === type);
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
    signature: 'pink',
    color: 'pink',
    range: 'deep-purple',
    switch: 'teal',
    tel: 'cyan',
    url: 'light-blue',
    hidden: 'grey'
  };
  return colors[type] || 'grey';
};

// Drag and Drop methods
const handleDragStart = (event, fieldType) => {
  event.dataTransfer.setData('application/json', JSON.stringify(fieldType));
  event.dataTransfer.effectAllowed = 'copy';
};

const handleDragOver = (event) => {
  event.preventDefault();
  isDragOver.value = true;
};

const handleDragLeave = (event) => {
  event.preventDefault();
  isDragOver.value = false;
};

const handleDrop = (event) => {
  event.preventDefault();
  isDragOver.value = false;

  try {
    const fieldType = JSON.parse(event.dataTransfer.getData('application/json'));
    addFieldType(fieldType);

    const newFieldIndex = currentFields.value.length - 1;
    if (newFieldIndex >= 0) {
      editField(newFieldIndex);
    }
  } catch (error) {
    console.error('Error parsing dropped data:', error);
  }
};

const addFieldType = (fieldType) => {
  const newField = {
    id: Date.now() + Math.random(),
    label: '',
    type: fieldType.value,
    is_required: false,
    options: fieldType.value === 'select' || fieldType.value === 'radio' || fieldType.value === 'checkbox' ? ['Opción 1'] : [],
    order: currentFields.value.length,
    attributes: {}
  };

  currentFields.value.push(newField);
};

const removeCurrentField = (index) => {
  currentFields.value.splice(index, 1);
  // Reordenar campos
  currentFields.value.forEach((field, idx) => {
    field.order = idx;
  });
};

const editField = (index) => {
  editingFieldIndex.value = index;
  editingField.value = { ...currentFields.value[index] };
  showEditDialog.value = true;
};

const saveEditedField = () => {
  if (!editingField.value.label) {
    toast.error('La etiqueta del campo es requerida');
    return;
  }

  if (editingFieldIndex.value >= 0) {
    currentFields.value[editingFieldIndex.value] = { ...editingField.value };
  }

  showEditDialog.value = false;
  editingFieldIndex.value = -1;
};

const addOption = () => {
  if (!editingField.value.options) {
    editingField.value.options = [];
  }
  editingField.value.options.push(`Opción ${editingField.value.options.length + 1}`);
};

const removeOption = (index) => {
  editingField.value.options.splice(index, 1);
};

const onCurrentFieldsDragEnd = () => {
  // Reordenar campos
  currentFields.value.forEach((field, index) => {
    field.order = index;
  });
};

const saveCurrentFields = () => {
  if (currentFields.value.length === 0) {
    toast.error('No hay campos para guardar');
    return;
  }

  // Validar que todos los campos tengan etiqueta
  const invalidFields = currentFields.value.filter((field) => !field.label);
  if (invalidFields.length > 0) {
    toast.error('Todos los campos deben tener una etiqueta');
    return;
  }

  // Agregar campos al formulario principal
  fields.value = [...fields.value, ...currentFields.value];
  currentFields.value = [];
  showFieldBuilder.value = false;
  toast.warning('No olvides guardar los campos');
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

.border-right {
  border-right: 1px solid #e0e0e0;
}

.drop-zone {
  min-height: 300px;
  transition: all 0.3s ease;
  background-color: #fafafa;
}

.drop-zone-active {
  background-color: #e3f2fd;
  border-color: #2196f3;
  transform: scale(1.02);
}

.field-type-card {
  transition: all 0.3s ease;
  cursor: grab;
}

.field-type-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.field-type-card:active {
  cursor: grabbing;
}

.cursor-pointer {
  cursor: pointer;
}

.h-100 {
  height: 100vh;
}
</style>
