<script setup>
import { ref, computed, watch } from 'vue';
import { mdiDrag, mdiDelete, mdiPlus, mdiClose, mdiPencil, mdiChevronDown, mdiChevronUp, mdiChevronLeft } from '@mdi/js';
import draggable from 'vuedraggable';
import { AVAILABLE_FIELDS, FIELD_COLOR } from '@/constants/fieldTypes';
import axiosInstance from '@/utils/axios';

const props = defineProps({
  modelValue: Boolean,
  form: Object
});
const emit = defineEmits(['update:modelValue', 'fields-saved']);

const availableFieldTypes = ref(AVAILABLE_FIELDS);
const currentFields = ref([]);
const isDragOver = ref(false);
const showEditDialog = ref(false);
const editingFieldIndex = ref(-1);
const editingField = ref({
  label: '',
  description: '',
  type: '',
  is_required: false,
  options: [],
  order: 0,
  hasWeight: false,
  weight: 0,
  attributes: {},
  has_evidence: false
});
const showSidebar = ref(true);

const dragPreviewEl = ref(null);
const lastDraggedPayload = ref(null);
const dragStarted = ref(false);
const isSidebarDragging = ref(false);

const saving = ref(false);
const errorMsg = ref('');
const existingLabels = ref([]);

const isMobile = ref(false);
const sidebarDropdownOpen = ref(false);

const showOptionsField = computed(() => {
  return ['select', 'radio', 'checkbox'].includes(editingField.value.type) && editingField.value.type !== 'semaforo';
});
const showGeolocationMode = computed(() => editingField.value.type === 'geolocation');
const showMaxFilesField = computed(() => false);

const typesWithEvidence = [
  'text',
  'textarea',
  'email',
  'password',
  'number',
  'date',
  'time',
  'select',
  'radio',
  'checkbox',
  'color',
  'range',
  'switch',
  'tel',
  'url',
  'hidden'
];

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 900;
  if (!isMobile.value) sidebarDropdownOpen.value = false;
};
if (typeof window !== 'undefined') {
  checkMobile();
  window.addEventListener('resize', checkMobile);
}

watch(editingField, (val) => {
  if (val.type === 'geolocation') {
    editingField.value.is_required = true;
    if (!editingField.value.attributes) editingField.value.attributes = {};
    if (!['scope', 'manual'].includes(editingField.value.attributes.mode)) {
      editingField.value.attributes.mode = 'scope';
    }
  }
  if (['signature', 'image', 'document'].includes(val.type)) {
    if (!editingField.value.attributes) editingField.value.attributes = {};
    if (editingField.value.attributes.max_files === undefined || editingField.value.attributes.max_files === null) {
      editingField.value.attributes.max_files = 1;
    }
    if (editingField.value.attributes.max_files < 1) editingField.value.attributes.max_files = 1;
    if (editingField.value.attributes.max_files > 4) editingField.value.attributes.max_files = 4;
  }
  if (!typesWithEvidence.includes(val.type)) {
    editingField.value.has_evidence = false;
  }
});

watch(
  () => props.modelValue,
  async (val) => {
    if (val) {
      currentFields.value = Array.isArray(props.form?.fields)
        ? props.form.fields.map((f) => ({
            ...f,
            description: f.description || '',
            attributes:
              f.type === 'geolocation'
                ? { ...(f.attributes || {}), mode: (f.attributes && f.attributes.mode) || 'scope' }
                : f.attributes || {},
            has_evidence: Boolean(f.has_evidence)
          }))
        : [];
      showEditDialog.value = false;
      editingFieldIndex.value = -1;
      try {
        const response = await axiosInstance.get(`/forms/${props.form.id}`);
        // Ajuste para soportar distintas estructuras de respuesta
        const data = response.data.form || response.data.data || response.data;
        existingLabels.value = Array.isArray(data.fields) ? data.fields.map((f) => f.label.trim().toLowerCase()) : [];
      } catch {
        existingLabels.value = [];
      }
    } else {
      currentFields.value = [];
      showEditDialog.value = false;
      editingFieldIndex.value = -1;
      existingLabels.value = [];
    }
  }
);

const addFieldType = (fieldType) => {
  const newField = {
    id: Date.now() + Math.random(),
    label: '',
    description: '',
    type: fieldType.value,
    is_required: fieldType.value === 'geolocation' ? true : false,
    options: ['select', 'radio', 'checkbox'].includes(fieldType.value) ? ['Opción 1'] : [],
    order: currentFields.value.length,
    attributes: {},
    hasWeight: false,
    weight: 0,
    has_evidence: false
  };
  if (fieldType.value === 'geolocation') {
    newField.attributes = { mode: 'scope' };
  }
  if (['signature', 'image', 'document'].includes(fieldType.value)) {
    newField.attributes.max_files = 1;
  }
  if (fieldType.value === 'semaforo') {
    newField.options = ['Alto', 'Medio', 'Bajo'];
    newField.attributes.semaforo = true;
    newField.attributes.semaforo_colors = {
      Alto: 'red',
      Medio: 'yellow',
      Bajo: 'green'
    };
  }
  currentFields.value.push(newField);
};

const onSidebarDragStart = (event, fieldType) => {
  dragStarted.value = true;
  isSidebarDragging.value = true;
  const json = JSON.stringify(fieldType);
  event.dataTransfer?.setData('application/json', json);
  event.dataTransfer?.setData('text/plain', json);
  event.dataTransfer.effectAllowed = 'copy';
  lastDraggedPayload.value = fieldType;

  const el = document.createElement('div');
  el.className = 'drag-preview';
  el.innerHTML = `
    <div class="drag-preview-inner">
      <span class="drag-preview-dot"></span>
      <span class="drag-preview-text">${fieldType.label}</span>
    </div>
  `;
  document.body.appendChild(el);
  dragPreviewEl.value = el;

  const rect = el.getBoundingClientRect();
  event.dataTransfer.setDragImage(el, rect.width / 2, rect.height / 2);

  document.body.classList.add('dragging-disable-select');

  const cleanup = () => {
    if (dragPreviewEl.value?.parentNode) {
      dragPreviewEl.value.parentNode.removeChild(dragPreviewEl.value);
      dragPreviewEl.value = null;
    }
    document.body.classList.remove('dragging-disable-select');
    isSidebarDragging.value = false;
    document.removeEventListener('dragend', cleanup, true);
  };
  document.addEventListener('dragend', cleanup, true);
};

const sidebarFieldDragEnd = () => {
  queueMicrotask(() => (dragStarted.value = false));
};

const handleDragEnter = (event) => {
  if (!isSidebarDragging.value) return;
  event.preventDefault();
  isDragOver.value = true;
};

const handleDragOver = (event) => {
  if (!isSidebarDragging.value) return;
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  isDragOver.value = true;
};

const handleDragLeave = (event) => {
  if (!isSidebarDragging.value) return;
  event.preventDefault();
  isDragOver.value = false;
};

const handleDrop = (event) => {
  if (!isSidebarDragging.value) return;
  event.preventDefault();
  isDragOver.value = false;
  dragStarted.value = false;
  isSidebarDragging.value = false;

  let raw = '';
  try {
    raw = event.dataTransfer.getData('application/json') || event.dataTransfer.getData('text/plain') || '';
  } catch {}

  let fieldType = null;
  if (raw) {
    try {
      fieldType = JSON.parse(raw);
    } catch {}
  }
  if (!fieldType) fieldType = lastDraggedPayload.value;
  lastDraggedPayload.value = null;

  if (!fieldType) return;

  addFieldType(fieldType);
  const newFieldIndex = currentFields.value.length - 1;
  if (newFieldIndex >= 0) editField(newFieldIndex);
};

const onSidebarFieldClick = (fieldType) => {
  if (dragStarted.value) return;
  addFieldType(fieldType);
  const newFieldIndex = currentFields.value.length - 1;
  if (newFieldIndex >= 0) editField(newFieldIndex);
  if (isMobile.value) sidebarDropdownOpen.value = false;
};

const removeCurrentField = async (index) => {
  const field = currentFields.value[index];
  if (typeof field.id === 'number' && Number.isInteger(field.id) && field.id > 0) {
    try {
      saving.value = true;
      errorMsg.value = '';
      await axiosInstance.delete(`/forms/${props.form.id}/fields/${field.id}`);
    } catch (err) {
      errorMsg.value = err?.response?.data?.message || 'Error al eliminar campo';
      saving.value = false;
      return;
    }
  }
  currentFields.value.splice(index, 1);
  currentFields.value.forEach((field, idx) => (field.order = idx));
  saving.value = false;
};

const editField = (index) => {
  editingFieldIndex.value = index;
  editingField.value = {
    ...currentFields.value[index],
    description: currentFields.value[index].description || '',
    has_evidence: Boolean(currentFields.value[index].has_evidence)
  };
  if (editingField.value.type === 'geolocation') {
    if (!editingField.value.attributes) editingField.value.attributes = {};
    if (!['scope', 'manual'].includes(editingField.value.attributes.mode)) {
      editingField.value.attributes.mode = 'scope';
    }
    editingField.value.is_required = true;
  }
  if (
    ['signature', 'image', 'document'].includes(editingField.value.type) &&
    (editingField.value.attributes.max_files === undefined || editingField.value.attributes.max_files === null)
  ) {
    editingField.value.attributes.max_files = 1;
  }
  if (['signature', 'image', 'document'].includes(editingField.value.type)) {
    if (editingField.value.attributes.max_files < 1) editingField.value.attributes.max_files = 1;
    if (editingField.value.attributes.max_files > 4) editingField.value.attributes.max_files = 4;
  }
  if (!typesWithEvidence.includes(editingField.value.type)) {
    editingField.value.has_evidence = false;
  }
  if (editingField.value.type === 'semaforo') {
    editingField.value.options = ['Alto', 'Medio', 'Bajo'];
    editingField.value.attributes = {
      ...editingField.value.attributes,
      semaforo: true,
      semaforo_colors: {
        Alto: 'red',
        Medio: 'yellow',
        Bajo: 'green'
      }
    };
  }
  showEditDialog.value = true;
};

const saveEditedField = () => {
  if (!editingField.value.label) return;
  if (editingField.value.type === 'geolocation') {
    editingField.value.is_required = true;
    const mode = editingField.value.attributes?.mode;
    if (!['scope', 'manual'].includes(mode)) return;
  }
  if (['signature', 'image', 'document'].includes(editingField.value.type)) {
    let maxFiles = parseInt(editingField.value.attributes.max_files) || 1;
    if (maxFiles < 1) maxFiles = 1;
    if (maxFiles > 4) maxFiles = 4;
    editingField.value.attributes.max_files = maxFiles;
  }
  if (!typesWithEvidence.includes(editingField.value.type)) {
    editingField.value.has_evidence = false;
  }
  if (editingField.value.type === 'semaforo') {
    editingField.value.options = ['Alto', 'Medio', 'Bajo'];
    editingField.value.attributes = {
      ...editingField.value.attributes,
      semaforo: true,
      semaforo_colors: {
        Alto: 'red',
        Medio: 'yellow',
        Bajo: 'green'
      }
    };
  }
  if (editingFieldIndex.value >= 0) {
    currentFields.value[editingFieldIndex.value] = { ...editingField.value };
  }
  showEditDialog.value = false;
  editingFieldIndex.value = -1;
};

const addOption = () => {
  if (!editingField.value.options) editingField.value.options = [];
  editingField.value.options.push(`Opción ${editingField.value.options.length + 1}`);
};

const removeOption = (index) => {
  editingField.value.options.splice(index, 1);
};

const onCurrentFieldsDragEnd = () => {
  currentFields.value.forEach((field, index) => (field.order = index));
};

const close = () => {
  currentFields.value = [];
  emit('update:modelValue', false);
};

const totalWeightUsed = computed(() => currentFields.value.reduce((total, field) => total + (field.weight || 0), 0));
const maxWeightAvailable = computed(() => {
  let current = 0;
  if (editingFieldIndex.value >= 0 && editingFieldIndex.value < currentFields.value.length) {
    current = currentFields.value[editingFieldIndex.value]?.weight || 0;
  }
  return 100 - totalWeightUsed.value + current;
});
const validateWeight = (w) => {
  const n = parseInt(w) || 0;
  if (n < 0) return 0;
  if (n > maxWeightAvailable.value) return maxWeightAvailable.value;
  return n;
};

const getFieldTypeLabel = (type) => {
  const fieldType = availableFieldTypes.value.find((ft) => ft.value === type);
  return fieldType ? fieldType.label : type;
};

const triedSaveWithWrongWeight = ref(false);

const saveCurrentFields = async () => {
  triedSaveWithWrongWeight.value = false;

  if (!currentFields.value.length) {
    errorMsg.value = 'No hay campos para guardar';
    return;
  }
  const invalid = currentFields.value.some((f) => !f.label);
  if (invalid) {
    errorMsg.value = 'Todos los campos deben tener una etiqueta.';
    return;
  }

  const labelIdPairs = currentFields.value.map((f) => ({
    label: f.label.trim().toLowerCase(),
    id: f.id
  }));
  const hasDuplicate = labelIdPairs.some(
    (pair, idx) => labelIdPairs.findIndex((p, i) => p.label === pair.label && p.id !== pair.id) !== -1
  );
  if (hasDuplicate) {
    errorMsg.value = 'No se pueden duplicar los nombres de los campos en el mismo formulario.';
    return;
  }

  for (const f of currentFields.value) {
    if (['select', 'radio', 'checkbox'].includes(f.type) && f.type !== 'semaforo') {
      if (!Array.isArray(f.options) || !f.options.length || f.options.some((opt) => typeof opt !== 'string' || !opt.trim())) {
        errorMsg.value = 'Todos los campos de opciones deben tener al menos una opción válida y no vacía.';
        return;
      }
    }
    if (['signature', 'image', 'document'].includes(f.type)) {
      let maxFiles = parseInt(f.attributes?.max_files) || 1;
      if (maxFiles < 1 || maxFiles > 4) {
        errorMsg.value = 'La cantidad máxima de archivos debe ser entre 1 y 4.';
        return;
      }
    }
    if (f.type === 'geolocation') {
      if (!['scope', 'manual'].includes(f.attributes?.mode)) {
        errorMsg.value = 'El campo de geolocalización requiere un modo válido (scope o manual).';
        return;
      }
    }
  }

  if (props.form?.has_rating && totalWeightUsed.value !== 100) {
    triedSaveWithWrongWeight.value = true;
    errorMsg.value = 'La suma de la ponderación debe ser exactamente 100 puntos.';
    return;
  }

  try {
    const response = await axiosInstance.get(`/forms/${props.form.id}`);
    // Ajuste para soportar distintas estructuras de respuesta
    const formData = response.data.form || response.data.data || response.data;
    const status = formData.status;
    const responsesCount = formData.responses_count ?? 0;
    if (status !== 'draft') {
      errorMsg.value = 'Solo se pueden agregar o editar campos cuando el formulario está en estado "borrador".';
      return;
    }
    if (responsesCount > 0) {
      errorMsg.value = 'No se pueden agregar o editar campos porque el formulario ya tiene respuestas.';
      return;
    }
  } catch (e) {
    errorMsg.value = 'No se pudo validar el estado del formulario.';
    return;
  }

  saving.value = true;
  errorMsg.value = '';

  const savedFields = [];
  try {
    const backendFieldIds = Array.isArray(props.form?.fields) ? props.form.fields.map((f) => f.id) : [];

    for (const f of currentFields.value) {
      const payload = {
        label: f.label,
        description: f.description || '',
        type: f.type,
        is_required: !!f.is_required,
        order: f.order,
        attributes: f.attributes && typeof f.attributes === 'object' ? { ...f.attributes } : {},
        weight: typeof f.weight === 'number' ? f.weight : 0
      };

      if (f.type === 'semaforo') {
        payload.options = ['Alto', 'Medio', 'Bajo'];
        payload.attributes.semaforo = true;
        payload.attributes.semaforo_colors = {
          Alto: 'red',
          Medio: 'yellow',
          Bajo: 'green'
        };
      } else if (['select', 'radio', 'checkbox'].includes(f.type)) {
        payload.options = (f.options || []).filter((opt) => typeof opt === 'string' && !!opt.trim());
      } else {
        delete payload.options;
      }

      if (['signature', 'image', 'document'].includes(f.type)) {
        let maxFiles = parseInt(payload.attributes?.max_files) || 1;
        if (maxFiles < 1) maxFiles = 1;
        if (maxFiles > 4) maxFiles = 4;
        payload.attributes.max_files = maxFiles;
      } else if (payload.attributes && 'max_files' in payload.attributes) {
        delete payload.attributes.max_files;
      }

      if (typesWithEvidence.includes(f.type)) {
        payload.has_evidence = !!f.has_evidence;
      } else {
        payload.has_evidence = false;
      }

      if (f.type === 'geolocation') {
        payload.is_required = true;
        payload.attributes = {
          ...payload.attributes,
          mode: f.attributes && ['scope', 'manual'].includes(f.attributes.mode) ? f.attributes.mode : 'scope'
        };
      }

      const isExistingField = backendFieldIds.includes(f.id);

      if (isExistingField) {
        const { data } = await axiosInstance.put(`/forms/${props.form.id}/fields/${f.id}`, payload);
        savedFields.push(data.field);
      } else {
        const { data } = await axiosInstance.post(`/forms/${props.form.id}/fields`, payload);
        savedFields.push(data.field);
      }
    }

    try {
      const response = await axiosInstance.get(`/forms/${props.form.id}`);
      // Ajuste para soportar distintas estructuras de respuesta
      const data = response.data.form || response.data.data || response.data;
      currentFields.value = Array.isArray(data.fields)
        ? data.fields.map((f) => ({
            ...f,
            description: f.description || '',
            attributes:
              f.type === 'geolocation'
                ? { ...(f.attributes || {}), mode: (f.attributes && f.attributes.mode) || 'scope' }
                : f.attributes || {},
            has_evidence: Boolean(f.has_evidence)
          }))
        : [];
    } catch {
      savedFields.forEach((saved) => {
        const idx = currentFields.value.findIndex((f) => f.id === saved.id);
        if (idx !== -1) currentFields.value[idx] = { ...saved };
      });
    }

    emit('fields-saved', savedFields);
    close();
  } catch (err) {
    errorMsg.value = err?.response?.data?.message || 'Error al guardar campos';
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:modelValue="emit('update:modelValue', $event)"
    fullscreen
    hide-overlay
    transition="dialog-bottom-transition"
  >
    <v-card class="modal-card">
      <!-- HEADER -->
      <div class="modal-header d-flex align-center justify-space-between px-4 py-3" :class="{ 'modal-header-mobile': isMobile }">
        <div class="modal-title-container" :class="{ 'center-mobile': isMobile }">
          <span class="modal-title">Constructor de Campos</span>
        </div>
        <div class="d-flex align-center">
          <template v-if="form?.has_rating">
            <span
              class="ponderacion-header mr-4"
              :style="{
                color: totalWeightUsed === 100 ? '#111' : '#d32f2f',
                fontWeight: 500
              }"
            >
              Ponderación: {{ totalWeightUsed }} / 100
            </span>
          </template>
          <span class="close-icon" @click="close">
            <v-icon :icon="mdiClose" color="grey-darken-2" size="28"></v-icon>
          </span>
        </div>
      </div>

      <!-- SIDEBAR DROPDOWN (MOBILE) -->
      <div v-if="isMobile" class="sidebar-dropdown-mobile">
        <v-btn color="grey-lighten-3" variant="flat" class="sidebar-dropdown-btn" @click="sidebarDropdownOpen = !sidebarDropdownOpen" block>
          <v-icon :icon="mdiPlus" class="mr-2" color="#757575"></v-icon>
          <span class="sidebar-dropdown-label">Agregar campo</span>
          <v-icon :icon="sidebarDropdownOpen ? mdiChevronDown : mdiChevronUp" class="ml-auto dropdown-arrow" color="grey-darken-2"></v-icon>
        </v-btn>
        <transition name="fade">
          <div v-if="sidebarDropdownOpen" class="sidebar-dropdown-list">
            <v-list class="field-list">
              <v-list-item
                v-for="fieldType in availableFieldTypes"
                :key="fieldType.value"
                class="field-type-row"
                @click="onSidebarFieldClick(fieldType)"
              >
                <template #prepend>
                  <v-icon :icon="fieldType.icon" size="24" :color="FIELD_COLOR(fieldType.value)" class="mr-2"></v-icon>
                </template>
                <v-list-item-title class="font-weight-medium">{{ fieldType.label }}</v-list-item-title>
                <v-list-item-subtitle class="text-caption text-grey-darken-1">
                  {{ fieldType.description }}
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </div>
        </transition>
      </div>

      <div class="modal-content-row d-flex h-100">
        <div :class="['main-fields-area', showSidebar && !isMobile ? 'with-sidebar' : 'full', 'fields-area-with-footer', 'bg-white']">
          <div
            ref="dropZone"
            class="drop-zone pa-4 rounded-lg"
            :class="{ 'drop-zone-active': isDragOver, 'drop-zone-mobile': isMobile }"
            @dragenter="handleDragEnter"
            @dragover="handleDragOver"
            @dragleave="handleDragLeave"
            @drop="handleDrop"
          >
            <div v-if="currentFields.length === 0" class="empty-fields-container center-middle">
              <div class="empty-fields-explanation-group">
                <div class="empty-fields-title empty-fields-title-mobile">No hay preguntas en este formulario.</div>
                <div class="empty-fields-desc empty-fields-desc-mobile">
                  Arrastra un tipo de campo desde la barra lateral o haz clic en uno para comenzar.
                </div>
              </div>
            </div>

            <draggable v-model="currentFields" item-key="id" handle=".drag-handle" @end="onCurrentFieldsDragEnd" class="v-list">
              <template #item="{ element: field, index }">
                <v-card class="mb-3 pa-3" variant="outlined">
                  <div class="d-flex align-center justify-space-between">
                    <div class="d-flex align-center">
                      <v-icon class="mr-2 drag-handle" :icon="mdiDrag" color="grey" size="24"></v-icon>
                      <div>
                        <div class="font-weight-medium">
                          {{ field.label || 'Campo sin nombre' }}
                        </div>
                        <div class="text-caption text-grey-darken-1">
                          {{ getFieldTypeLabel(field.type) }}
                        </div>
                        <div v-if="field.description" class="text-caption text-grey-darken-2 mt-1">
                          {{ field.description }}
                        </div>
                      </div>
                    </div>
                    <div class="d-flex align-center">
                      <button class="icon-btn mr-2" @click="editField(index)" aria-label="Editar campo" type="button">
                        <v-icon :icon="mdiPencil" color="black" size="20"></v-icon>
                      </button>
                      <button class="icon-btn" @click="removeCurrentField(index)" aria-label="Eliminar campo" type="button">
                        <v-icon :icon="mdiDelete" color="black" size="20"></v-icon>
                      </button>
                    </div>
                  </div>
                </v-card>
              </template>
            </draggable>
          </div>

          <!-- BOTÓN GUARDAR CAMPOS -->
          <div class="fields-footer d-flex justify-end" :class="{ 'fields-footer-mobile': isMobile }">
            <v-btn
              color="primary"
              variant="flat"
              @click="saveCurrentFields"
              :loading="saving"
              :disabled="currentFields.length === 0 || saving"
              class="guardar-campos-btn"
            >
              Guardar Campos
            </v-btn>
          </div>
        </div>

        <!-- Sidebar normal (desktop) -->
        <transition name="slide">
          <aside v-if="showSidebar && !isMobile" class="sidebar-fields">
            <v-list class="field-list">
              <v-list-item
                v-for="fieldType in availableFieldTypes"
                :key="fieldType.value"
                class="field-type-row"
                draggable="true"
                @dragstart.stop="onSidebarDragStart($event, fieldType)"
                @dragend="sidebarFieldDragEnd"
                @click="onSidebarFieldClick(fieldType)"
              >
                <template #prepend>
                  <v-icon :icon="fieldType.icon" size="24" :color="FIELD_COLOR(fieldType.value)" class="mr-2"></v-icon>
                </template>
                <v-list-item-title class="font-weight-medium">{{ fieldType.label }}</v-list-item-title>
                <v-list-item-subtitle class="text-caption text-grey-darken-1">
                  {{ fieldType.description }}
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </aside>
        </transition>

        <div v-if="!showSidebar && !isMobile" class="show-sidebar-btn-right">
          <v-btn icon @click="showSidebar = true" variant="plain">
            <v-icon icon="mdi-chevron-left" color="grey-darken-2"></v-icon>
          </v-btn>
        </div>
      </div>

      <!-- MODAL DE EDICIÓN DE CAMPO -->
      <v-dialog v-model="showEditDialog" max-width="600px" @click:outside="showEditDialog = false">
        <v-card class="pa-0" style="border-radius: 0">
          <div class="d-flex align-center justify-space-between px-4 py-2">
            <span class="text-h5">Editar Campo</span>
            <v-btn icon variant="plain" @click="showEditDialog = false">
              <v-icon :icon="mdiClose" color="grey-darken-2" size="24"></v-icon>
            </v-btn>
          </div>
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
              <v-text-field
                v-model="editingField.description"
                label="Descripción (opcional)"
                variant="outlined"
                class="mb-4"
                maxlength="500"
                counter
              />
              <v-checkbox
                v-model="editingField.is_required"
                label="Campo requerido"
                class="mb-4"
                color="primary"
                :disabled="editingField.type === 'geolocation'"
              />

              <div v-if="typesWithEvidence.includes(editingField.type)">
                <v-checkbox
                  v-model="editingField.has_evidence"
                  label="Requiere evidencia (adjuntar archivo)"
                  color="primary"
                  class="mb-4"
                />
              </div>

              <div v-if="showGeolocationMode" class="mb-4">
                <v-label class="text-body-2 font-weight-medium mb-2">Modo de Geolocalización</v-label>
                <v-checkbox
                  :model-value="editingField.attributes.mode === 'manual'"
                  @update:model-value="(val) => (editingField.attributes.mode = val ? 'manual' : 'scope')"
                  color="primary"
                  class="mt-2"
                  label="Ingresar dirección manualmente (usuario elige ubicación)"
                  hide-details
                />
                <v-checkbox
                  :model-value="editingField.attributes.mode === 'scope'"
                  @update:model-value="(val) => (editingField.attributes.mode = val ? 'scope' : 'manual')"
                  color="primary"
                  class="mt-2"
                  label="Por alcance del formulario (automático)"
                  hide-details
                />
              </div>

              <!-- Semáforo chips -->
              <div v-if="editingField.type === 'semaforo'" class="mb-4">
                <v-label class="text-body-2 font-weight-medium mb-2">Opciones del semáforo</v-label>
                <div class="semaforo-chips-row">
                  <v-chip style="background: #e53935; color: white; padding-left: 18px; padding-right: 18px">Alto</v-chip>
                  <v-chip style="background: #ffd600; color: black; padding-left: 18px; padding-right: 18px">Medio</v-chip>
                  <v-chip style="background: #43a047; color: white; padding-left: 18px; padding-right: 18px">Bajo</v-chip>
                </div>
              </div>

              <div v-if="showOptionsField" class="mb-4">
                <v-label class="text-body-2 font-weight-medium mb-2">Opciones</v-label>
                <div v-for="(option, index) in editingField.options" :key="index" class="option-row mb-2">
                  <v-text-field
                    v-model="editingField.options[index]"
                    :placeholder="`Opción ${index + 1}`"
                    variant="outlined"
                    density="compact"
                    class="option-input"
                    @keyup.enter="saveEditedField"
                  >
                    <template #append-inner>
                      <v-btn
                        icon
                        variant="text"
                        density="comfortable"
                        class="option-delete-icon"
                        @click.stop="removeOption(index)"
                        :aria-label="`Eliminar opción ${index + 1}`"
                      >
                        <v-icon :icon="mdiDelete"></v-icon>
                      </v-btn>
                    </template>
                  </v-text-field>
                </div>
                <v-btn color="primary" variant="outlined" class="mt-2" @click="addOption">
                  <v-icon :icon="mdiPlus" class="mr-1"></v-icon>
                  Agregar Opción
                </v-btn>
              </div>

              <div v-if="form?.has_rating" class="mb-4">
                <div class="d-flex align-center justify-space-between mb-3">
                  <v-label class="text-body-1 font-weight-medium">Ponderación de Puntos</v-label>
                </div>
                <v-alert type="info" variant="tonal" class="mb-4" density="compact">
                  Asigna puntos a esta pregunta. El total de todas las preguntas no puede exceder 100 puntos.
                </v-alert>
                <v-row>
                  <v-col cols="12" sm="6">
                    <v-text-field
                      v-model="editingField.weight"
                      label="Puntos de la pregunta"
                      type="number"
                      variant="outlined"
                      density="compact"
                      :min="1"
                      :max="maxWeightAvailable"
                      :hint="`Máximo disponible: ${maxWeightAvailable} puntos`"
                      persistent-hint
                      @update:model-value="(value) => (editingField.weight = validateWeight(parseInt(value) || 0))"
                    />
                  </v-col>
                  <v-col cols="12" sm="6">
                    <v-alert type="info" variant="tonal" density="compact">
                      <strong>Peso total usado:</strong> {{ totalWeightUsed }} / 100 puntos
                    </v-alert>
                  </v-col>
                </v-row>
              </div>

              <v-alert v-if="errorMsg" type="error" class="mt-2">{{ errorMsg }}</v-alert>
            </v-form>
          </v-card-text>
          <v-card-actions class="px-4 pb-4 pt-0 d-flex justify-end">
            <v-btn color="primary" variant="flat" class="px-6 py-2" @click="saveEditedField">Guardar</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.modal-card {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
.modal-header {
  background-color: #f8f9fa;
  min-height: 64px;
  border-bottom: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.modal-header-mobile {
  padding: 12px 8px !important;
  min-height: 48px;
  background: #f8f9fa;
}
.modal-title-container {
  display: flex;
  align-items: center;
  flex: 1 1 auto;
  justify-content: flex-start;
}
.modal-title-container.center-mobile {
  justify-content: flex-start !important;
  width: 100%;
}
.modal-title {
  font-size: 1.25rem;
  font-weight: 400;
  color: #111;
  letter-spacing: 0.01em;
}
.close-icon {
  cursor: pointer;
  display: flex;
  align-items: center;
}

.modal-content-row {
  flex: 1 1 auto;
  min-height: 0;
  position: relative;
  display: flex;
  flex-direction: row;
}
.main-fields-area {
  flex: 1 1 0;
  min-width: 0;
  padding-right: 0;
  transition: width 0.3s;
  overflow-y: auto;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  background: #fff !important;
}
.bg-white {
  background: #fff !important;
}
.main-fields-area.with-sidebar {
  max-width: calc(100% - 320px);
}
.main-fields-area.full {
  max-width: 100%;
}

.fields-area-with-footer {
  padding-bottom: 80px;
}
.fields-footer {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 100%;
  padding: 24px 24px 24px 0;
  background: linear-gradient(to top, #fff 90%, rgba(255, 255, 255, 0));
  z-index: 10;
}
.fields-footer-mobile {
  position: fixed !important;
  bottom: 0;
  right: 0;
  left: 0;
  width: 100vw !important;
  background: linear-gradient(to top, #fff 90%, rgba(255, 255, 255, 0));
  padding: 12px 16px 12px 0 !important;
  z-index: 100;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.04);
  justify-content: flex-end !important;
}
.guardar-campos-btn {
  min-width: 180px;
}

.sidebar-fields {
  width: 320px;
  min-width: 260px;
  max-width: 320px;
  background: #f5f5f5;
  border-left: 1px solid #e0e0e0;
  height: 100%;
  overflow-y: auto;
  transition: all 0.3s;
  position: relative;
  display: flex;
  flex-direction: column;
}

.field-list {
  padding: 0 8px;
  flex: 1 1 auto;
  overflow-y: auto;
}

.field-type-row {
  cursor: grab;
  border-radius: 6px;
  margin-bottom: 2px;
  transition: background 0.2s;
  padding: 8px 0;
  user-select: none;
  -webkit-user-drag: element;
}
.field-type-row:hover {
  background: #e3f2fd;
}
.field-type-row:active {
  cursor: grabbing;
}

.show-sidebar-btn-right {
  position: absolute;
  top: 24px;
  right: 0;
  z-index: 20;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: 48px;
  width: 48px;
}

.drop-zone {
  min-height: 600px;
  transition: none;
  background-color: #fff !important;
  position: relative;
  padding: 32px !important;
}
.drop-zone-active {
  background-color: #f0f8ff !important;
  border: 2px dashed #2196f3 !important;
  border-radius: 12px;
  transform: none;
  box-shadow: 0 4px 20px rgba(33, 150, 243, 0.15);
}
.drop-zone-mobile {
  min-height: 180px !important;
  padding: 12px !important;
}

.empty-fields-container.center-middle {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 500px;
  width: 100%;
  z-index: 2;
}
.empty-fields-explanation-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 100%;
  text-align: center;
}
.empty-fields-title {
  font-weight: bold;
  font-size: 1rem;
  margin-bottom: 0.5em;
  width: 100%;
  text-align: center;
  max-width: 100%;
  word-break: break-word;
}
.empty-fields-title-mobile {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.5em;
  text-align: center;
}
.empty-fields-desc.single-line {
  font-size: 0.92rem;
  color: #222;
  white-space: nowrap;
  width: 100%;
  text-align: center;
  max-width: 100%;
  overflow-x: auto;
}
.empty-fields-desc.empty-fields-desc-mobile {
  font-size: 0.95rem;
  color: #444;
  margin-top: 0.2em;
  text-align: center;
}

.cursor-pointer {
  cursor: pointer;
}
.h-100 {
  height: 100vh;
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s;
}
.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

:global(.dragging-disable-select),
:global(.dragging-disable-select *) {
  user-select: none !important;
}
:global(.drag-preview) {
  position: fixed;
  top: -9999px;
  left: -9999px;
  z-index: 99999;
  pointer-events: none;
}
:global(.drag-preview-inner) {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 999px;
  background: #e3f2fd;
  border: 1px solid #bbdefb;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  font-size: 13px;
  font-weight: 600;
  color: #1a237e;
}
:global(.drag-preview-dot) {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #1e88e5;
  display: inline-block;
}
:global(.drag-preview-text) {
  line-height: 1;
}

.drag-handle {
  cursor: grab !important;
}
.drag-handle:active {
  cursor: grabbing !important;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid #e0e0e0;
  background: transparent;
  border-radius: 8px;
  width: 32px;
  height: 32px;
  padding: 0;
  transition:
    background 0.15s,
    border-color 0.15s;
  cursor: pointer;
}
.icon-btn:hover {
  background: #f5f5f5;
  border-color: #bdbdbd;
}
.icon-btn:active {
  background: #eeeeee;
  border-color: #bdbdbd;
}

/* ---------- Opciones (ancho completo y botón integrado) ---------- */
.option-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.option-input {
  flex: 1 1 auto;
  min-width: 0; /* clave para que el input pueda ocupar todo el ancho en flex */
}

/* Pequeños ajustes de espaciado del slot de Vuetify */
:deep(.option-input .v-input__append) {
  margin-inline-start: 4px;
}
.option-delete-icon {
  margin-left: 4px;
} /* opcional, para separar del borde del input */

.semaforo-chips-row {
  display: flex;
  flex-direction: row;
  gap: 12px;
  padding: 4px 0;
}

/* ----------- Mobile ----------- */
@media (max-width: 900px) {
  .modal-header {
    padding: 12px 8px !important;
    min-height: 48px;
    background: #f8f9fa;
    flex-direction: row !important;
    align-items: center !important;
    justify-content: space-between !important;
  }
  .modal-title-container.center-mobile {
    justify-content: flex-start !important;
    width: 100%;
    padding-left: 8px;
  }
  .close-icon {
    align-self: unset;
    margin-top: 0;
    margin-left: 8px;
  }
  .modal-content-row {
    flex-direction: column;
  }
  .main-fields-area.with-sidebar,
  .main-fields-area.full {
    max-width: 100% !important;
  }
  .sidebar-fields {
    display: none !important;
  }
  .sidebar-dropdown-mobile {
    display: block !important;
    width: 100vw;
    padding: 0 8px 8px 8px;
    background: transparent !important;
    border-top: none;
    box-shadow: none;
    min-height: 0;
    margin-bottom: 0;
  }
  .sidebar-dropdown-btn {
    width: 100%;
    margin: 0;
    text-align: left;
    justify-content: flex-start;
    background: #fff !important;
    border-radius: 8px;
    color: #222 !important;
    font-weight: 500;
    font-size: 1rem;
    box-shadow: none !important;
    border: 1px solid #e0e0e0;
    min-height: 48px;
    display: flex;
    align-items: center;
    margin-top: 16px;
    position: relative;
  }
  .sidebar-dropdown-label {
    flex: 1 1 auto;
    color: #222;
    font-weight: 500;
    font-size: 1rem;
  }
  .sidebar-dropdown-list {
    background: #fff !important;
    border-radius: 12px;
    margin-top: 8px;
    margin-bottom: 16px;
    box-shadow:
      0 8px 32px rgba(33, 150, 243, 0.12),
      0 1.5px 6px rgba(0, 0, 0, 0.07);
    border: 1.5px solid #c5cae9;
    max-height: 320px;
    overflow-y: auto;
    padding: 8px 0;
    z-index: 200;
    position: relative;
    animation: dropdown-fade-in 0.18s;
  }
  .main-fields-area {
    margin-top: 16px;
  }
  .show-sidebar-btn-right {
    top: unset;
    bottom: 0;
    right: 0;
    left: 0;
    width: 100vw;
    justify-content: center;
    background: transparent;
  }
  .fields-footer {
    position: fixed !important;
    bottom: 0;
    right: 0;
    left: 0;
    width: 100vw !important;
    background: linear-gradient(to top, #fff 90%, rgba(255, 255, 255, 0));
    padding: 12px 16px 12px 0 !important;
    z-index: 100;
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.04);
    justify-content: flex-end !important;
  }
  .guardar-campos-btn {
    min-width: 180px;
  }
  .drop-zone {
    min-height: 180px;
    padding: 12px !important;
  }
  .empty-fields-container.center-middle {
    min-height: 180px;
    padding: 0 12px;
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .empty-fields-explanation-group {
    width: 100%;
    align-items: center;
    justify-content: center;
    text-align: center;
  }
}
@media (max-width: 600px) {
  .modal-header {
    padding: 12px 4px !important;
    min-height: 44px;
  }
  .modal-title {
    font-size: 1.05rem;
  }
  .close-icon {
    margin-left: 8px;
  }
  .main-fields-area,
  .main-fields-area.with-sidebar,
  .main-fields-area.full {
    padding: 0 !important;
    max-width: 100vw !important;
  }
  .sidebar-dropdown-mobile {
    padding: 0 2px 8px 2px;
  }
  .sidebar-fields {
    min-height: 120px;
    padding-bottom: 8px;
  }
  .field-list {
    padding: 0 2px;
  }
  .fields-footer {
    padding: 12px 4px 12px 0 !important;
  }
}
@media (min-width: 901px) {
  .sidebar-dropdown-mobile {
    display: none !important;
  }
}
.ponderacion-header {
  display: inline-block;
  min-width: 120px;
  text-align: right;
}
</style>
