<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import {
  mdiDrag,
  mdiDelete,
  mdiPlus,
  mdiClose,
  mdiPencil,
  mdiChevronDown,
  mdiChevronUp,
  mdiChevronLeft,
  mdiScaleBalance,
  mdiFolderPlus
} from '@mdi/js';
import draggable from 'vuedraggable';
import { AVAILABLE_FIELDS, FIELD_COLOR } from '@/constants/fieldTypes';
import axiosInstance from '@/utils/axios';

const props = defineProps({
  modelValue: Boolean,
  form: Object
});
const emit = defineEmits(['update:modelValue', 'fields-saved']);

const availableFieldTypes = ref(AVAILABLE_FIELDS);
const items = ref([]); // unified list: groups and loose fields. Each item has { local_id, id|null }
const isDragOver = ref(false);
const showEditDialog = ref(false);
const editingFieldIndex = ref(-1);
const editingField = ref({});
const editingGroupIndex = ref(-1);
const editingGroup = ref({});
const showSidebar = ref(true);

const dragPreviewEl = ref(null);
const lastDraggedPayload = ref(null);
const dragStarted = ref(false);
const isSidebarDragging = ref(false);

const saving = ref(false);
const existingLabels = ref([]);
const existingGroupNames = ref([]);

const isMobile = ref(false);
const sidebarDropdownOpen = ref(false);

const errorMsg = ref('');
const showGroupModal = ref(false);
const groupModalName = ref('');
const groupModalDescription = ref('');
const groupModalError = ref('');
const expandedGroups = ref([]); // contains local_id of expanded groups

// =====================
//  Identidad UI/BD
// =====================
const makeLocalId = (prefix, realId = null) =>
  realId ? `${prefix}-${realId}` : `${prefix}-new-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const keyOf = (obj) => obj?.id ?? obj?.local_id; // clave lógica estable: id real si existe, si no local_id

// =====================
//  Tipos y helpers
// =====================
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

const SEMAFORO_FIXED_OPTIONS = ['Alto', 'Medio', 'Bajo'];

const isSemaforoField = (f) => {
  if (!f) return false;
  const t = String(f.type || '').toLowerCase();
  const attrs = f.attributes || {};
  const opts = Array.isArray(f.options) ? f.options.map((o) => String(o).trim().toLowerCase()) : [];
  if (attrs.semaforo === true) return true;
  const haveAlto = ['alto', 'alta', 'rojo', 'high'].some((s) => opts.includes(s));
  const haveMedio = ['medio', 'media', 'amarillo', 'medium'].some((s) => opts.includes(s));
  const haveBajo = ['bajo', 'baja', 'verde', 'low'].some((s) => opts.includes(s));
  return t === 'semaforo' || (t === 'radio' && haveAlto && haveMedio && haveBajo);
};
const toSemaforoUI = (f) => ({
  ...f,
  type: 'semaforo',
  options: [...SEMAFORO_FIXED_OPTIONS],
  attributes: {
    ...(f.attributes || {}),
    semaforo: true,
    semaforo_colors: { Alto: 'red', Medio: 'yellow', Bajo: 'green' }
  }
});
const toSemaforoPayload = (payload) => ({
  ...payload,
  type: 'radio',
  options: [...SEMAFORO_FIXED_OPTIONS],
  attributes: {
    ...(payload.attributes || {}),
    semaforo: true,
    semaforo_colors: { Alto: 'red', Medio: 'yellow', Bajo: 'green' }
  }
});

const showOptionsField = computed(() => {
  const f = editingField.value;
  const t = String(f?.type || '').toLowerCase();
  return ['select', 'radio', 'checkbox'].includes(t) && !isSemaforoField(f);
});
const showGeolocationMode = computed(() => editingField.value.type === 'geolocation');

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 900;
  if (!isMobile.value) sidebarDropdownOpen.value = false;
};
if (typeof window !== 'undefined') {
  checkMobile();
  window.addEventListener('resize', checkMobile);
}

function normalizeLabel(label) {
  return (label || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

// =====================
//  Abrir / Cerrar modal
// =====================
watch(
  () => props.modelValue,
  async (val) => {
    if (val) {
      try {
        const response = await axiosInstance.get(`/forms/${props.form.id}`);
        const data = response.data.form || response.data.data || response.data;

        existingLabels.value = Array.isArray(data.fields) ? data.fields.map((f) => normalizeLabel(f.label)) : [];
        existingGroupNames.value = Array.isArray(data.field_groups) ? data.field_groups.map((g) => normalizeLabel(g.name)) : [];

        // --- Rehidratación determinista con local_id estable ---
        const groupMap = {};
        (data.field_groups || []).forEach((g) => {
          groupMap[g.id] = {
            ...g,
            type: 'group',
            id: g.id, // id real
            local_id: makeLocalId('g', g.id), // clave UI
            fields: []
          };
        });

        (data.fields || []).forEach((f) => {
          const base = isSemaforoField(f) ? toSemaforoUI(f) : f;
          const wrap = {
            ...base,
            id: base.id,
            local_id: makeLocalId('f', base.id)
          };
          if (wrap.form_field_group_id && groupMap[wrap.form_field_group_id]) {
            groupMap[wrap.form_field_group_id].fields.push(wrap);
          }
        });

        const allItems = [
          ...(data.field_groups || []).map((g) => ({
            ...groupMap[g.id],
            order: g.order
          })),
          ...(data.fields || [])
            .filter((f) => !f.form_field_group_id || !groupMap[f.form_field_group_id])
            .map((f) => ({
              ...(isSemaforoField(f) ? toSemaforoUI(f) : f),
              id: f.id,
              local_id: makeLocalId('f', f.id),
              type: f.type,
              order: f.order
            }))
        ].sort((a, b) => a.order - b.order);

        items.value = allItems;
        expandedGroups.value = items.value.filter((i) => i.type === 'group').map((g) => g.local_id);
      } catch {
        items.value = [];
        existingLabels.value = [];
        existingGroupNames.value = [];
      }
      showEditDialog.value = false;
      editingFieldIndex.value = -1;
      editingGroupIndex.value = -1;
    } else {
      items.value = [];
      showEditDialog.value = false;
      editingFieldIndex.value = -1;
      editingGroupIndex.value = -1;
      existingLabels.value = [];
      existingGroupNames.value = [];
    }
  }
);

function close() {
  items.value = [];
  emit('update:modelValue', false);
  errorMsg.value = '';
}

// =====================
//  Drag desde sidebar
// =====================
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

  if (fieldType.value === 'group') {
    openGroupModal();
    return;
  }
  addFieldType(fieldType);
  const newFieldIndex = items.value.length - 1;
  if (newFieldIndex >= 0) editField(newFieldIndex);
};

const onSidebarFieldClick = (fieldType) => {
  if (dragStarted.value) return;
  if (fieldType.value === 'group') {
    openGroupModal();
    return;
  }
  addFieldType(fieldType);
  const newFieldIndex = items.value.length - 1;
  if (newFieldIndex >= 0) editField(newFieldIndex);
  if (isMobile.value) sidebarDropdownOpen.value = false;
};

// =====================
//  Crear / Editar grupos
// =====================
function openGroupModal() {
  groupModalName.value = '';
  groupModalDescription.value = '';
  groupModalError.value = '';
  showGroupModal.value = true;
  editingGroupIndex.value = -1;

  const localId = makeLocalId('g');
  editingGroup.value = { id: null, local_id: localId, type: 'group', name: '', description: '', fields: [], order: items.value.length };
}

function editGroup(index) {
  editingGroupIndex.value = index;
  editingGroup.value = { ...items.value[index] }; // conserva local_id / id
  groupModalName.value = editingGroup.value.name || '';
  groupModalDescription.value = editingGroup.value.description || '';
  groupModalError.value = '';
  showGroupModal.value = true;
}

async function saveGroupModal() {
  const nameToSave = groupModalName.value.trim();
  const descriptionToSave = groupModalDescription.value.trim();
  const normalizedName = normalizeLabel(nameToSave);

  if (!nameToSave) {
    groupModalError.value = 'El nombre del grupo es obligatorio';
    return;
  }
  if (descriptionToSave.length > 500) {
    groupModalError.value = 'La descripción no puede superar los 500 caracteres';
    return;
  }

  // Duplicados FE: compara por clave lógica
  const existsInFrontend = items.value.some((it, idx) => {
    if (it.type !== 'group') return false;
    if (editingGroupIndex.value !== -1 && idx === editingGroupIndex.value) return false;
    return normalizeLabel(it.name) === normalizedName;
  });
  if (existsInFrontend) {
    groupModalError.value = 'Ya existe un campo o grupo con ese nombre en este formulario.';
    return;
  }

  try {
    saving.value = true;

    if (editingGroupIndex.value === -1) {
      // crear (optimista): agrega el draft y luego muta con id real
      const draft = {
        id: null,
        local_id: editingGroup.value.local_id,
        type: 'group',
        name: nameToSave,
        description: descriptionToSave,
        order: items.value.length,
        fields: []
      };
      items.value.push(draft);
      expandedGroups.value.push(draft.local_id);

      const { data } = await axiosInstance.post(`/forms/${props.form.id}/groups`, {
        name: nameToSave,
        order: draft.order,
        description: descriptionToSave
      });

      // MUTAR el mismo objeto (no reemplazar)
      draft.id = data.group.id;
      draft.name = data.group.name;
      draft.description = data.group.description;
    } else {
      const group = items.value[editingGroupIndex.value];
      await axiosInstance.put(`/forms/${props.form.id}/groups/${group.id}`, {
        name: nameToSave,
        order: group.order,
        description: descriptionToSave
      });
      group.name = nameToSave; // mutación directa
      group.description = descriptionToSave;
    }

    showGroupModal.value = false;
  } catch (e) {
    groupModalError.value = e?.response?.data?.message || 'Error al guardar grupo';
  } finally {
    saving.value = false;
  }
}

// =====================
//  Crear preguntas
// =====================
function addFieldType(fieldType) {
  if (fieldType.value === 'group') return;
  const newField = {
    id: null, // aún no persistido
    local_id: makeLocalId('f'),
    label: '',
    description: '',
    type: fieldType.value,
    is_required: fieldType.value === 'geolocation' ? true : false,
    options: ['select', 'radio', 'checkbox'].includes(fieldType.value) ? [''] : [],
    order: items.value.length,
    attributes: {},
    hasWeight: false,
    weight: props.form?.has_rating ? 0 : undefined,
    has_evidence: false
  };
  if (fieldType.value === 'geolocation') {
    newField.attributes = { mode: 'scope' };
  }
  if (['signature', 'image', 'document'].includes(fieldType.value)) {
    newField.attributes.max_files = 4;
  }
  if (fieldType.value === 'semaforo') {
    newField.options = [...SEMAFORO_FIXED_OPTIONS];
    newField.attributes.semaforo = true;
    newField.attributes.semaforo_colors = { Alto: 'red', Medio: 'yellow', Bajo: 'green' };
  }
  items.value.push(newField);
}

function addFieldToGroup(fieldType, group) {
  if (fieldType.value === 'group') return;
  const newField = {
    id: null,
    local_id: makeLocalId('f'),
    label: '',
    description: '',
    type: fieldType.value,
    is_required: fieldType.value === 'geolocation' ? true : false,
    options: ['select', 'radio', 'checkbox'].includes(fieldType.value) ? [''] : [],
    order: group.fields.length,
    attributes: {},
    hasWeight: false,
    weight: props.form?.has_rating ? 0 : undefined,
    has_evidence: false,
    form_field_group_id: group.id ?? null
  };
  if (fieldType.value === 'geolocation') {
    newField.attributes = { mode: 'scope' };
  }
  if (['signature', 'image', 'document'].includes(fieldType.value)) {
    newField.attributes.max_files = 4;
  }
  if (fieldType.value === 'semaforo') {
    newField.options = [...SEMAFORO_FIXED_OPTIONS];
    newField.attributes.semaforo = true;
    newField.attributes.semaforo_colors = { Alto: 'red', Medio: 'yellow', Bajo: 'green' };
  }
  group.fields.push(newField);
}

// =====================
//  Eliminar items
// =====================
async function removeItem(index) {
  const item = items.value[index];
  if (!item) return;
  if (item.id) {
    try {
      saving.value = true;
      await axiosInstance.delete(`/forms/${props.form.id}/fields/${item.id}`);
      items.value.splice(index, 1);
    } catch (e) {
      errorMsg.value = e?.response?.data?.message || 'No se pudo eliminar el campo.';
    } finally {
      saving.value = false;
    }
  } else {
    items.value.splice(index, 1);
  }
  items.value.forEach((it, idx) => (it.order = idx));
}

function removeFieldFromGroup(group, idx) {
  group.fields.splice(idx, 1);
  group.fields.forEach((f, i) => (f.order = i));
}

async function removeGroup(index) {
  const group = items.value[index];
  if (!group) return;

  if (!group.id) {
    items.value.splice(index, 1);
    expandedGroups.value = expandedGroups.value.filter((lid) => lid !== group.local_id);
    return;
  }

  try {
    saving.value = true;
    await axiosInstance.delete(`/forms/${props.form.id}/groups/${group.id}`);
    items.value.splice(index, 1);
    expandedGroups.value = expandedGroups.value.filter((lid) => lid !== group.local_id);
  } catch (e) {
    errorMsg.value = e?.response?.data?.message || 'No se pudo eliminar el grupo.';
  } finally {
    saving.value = false;
  }
}

// =====================
//  Expand/Collapse grupo
// =====================
function toggleGroupExpand(localId) {
  if (expandedGroups.value.includes(localId)) {
    expandedGroups.value = expandedGroups.value.filter((id) => id !== localId);
  } else {
    expandedGroups.value.push(localId);
  }
}

// =====================
//  Editar campos
// =====================
const fieldErrors = ref({
  label: '',
  weight: '',
  options: []
});
function clearFieldErrors() {
  fieldErrors.value = { label: '', weight: '', options: [] };
}
const validateEditingField = () => {
  clearFieldErrors();
  let valid = true;

  if (!editingField.value.label || !String(editingField.value.label).trim()) {
    fieldErrors.value.label = 'La etiqueta es obligatoria';
    valid = false;
  }

  // duplicado por clave lógica
  const labelNorm = normalizeLabel(editingField.value.label);
  const allLabels = [];
  const pushLabel = (label, obj) => {
    if (!label) return;
    allLabels.push({ label: normalizeLabel(label), key: keyOf(obj) });
  };
  for (const item of items.value) {
    if (item.type === 'group') {
      pushLabel(item.name, item);
      for (const f of item.fields) pushLabel(f.label, f);
    } else {
      pushLabel(item.label, item);
    }
  }
  const sameLabel = allLabels.filter((l) => l.label === labelNorm && l.key !== keyOf(editingField.value));
  if (sameLabel.length > 0) {
    fieldErrors.value.label = 'Ya existe un campo o grupo con ese nombre en este formulario.';
    valid = false;
  }

  if (props.form?.has_rating) {
    const w = editingField.value.weight;
    if (w === '' || w === null || isNaN(w)) {
      fieldErrors.value.weight = 'La ponderación es obligatoria';
      valid = false;
    } else if (parseInt(w) < 0) {
      fieldErrors.value.weight = 'Debe ser mayor o igual a 0';
      valid = false;
    }
  }

  if (showOptionsField.value) {
    const validOptions = Array.isArray(editingField.value.options)
      ? editingField.value.options.filter((opt) => typeof opt === 'string' && !!opt.trim())
      : [];
    fieldErrors.value.options = [];
    if (validOptions.length < 1) {
      editingField.value.options.forEach((opt, idx) => {
        fieldErrors.value.options[idx] = !opt || !opt.trim() ? 'La opción es obligatoria' : '';
      });
      if (validOptions.length === 0) {
        editingField.value.options[0] = 'Debes agregar al menos una opción válida';
      }
      valid = false;
    } else {
      fieldErrors.value.options = [];
    }
  }
  return valid;
};

function editField(index, group = null) {
  if (!group && items.value[index]?.type === 'group') {
    editGroup(index);
    return;
  }

  editingFieldIndex.value = index;

  if (group) {
    editingField.value = { ...group.fields[index] };
    editingField.value.form_field_group_id = group.id ?? null;
    editingField.value._group = group;
  } else {
    editingField.value = { ...items.value[index] };
    editingField.value._group = null;
  }

  if (typeof editingField.value.type === 'string') {
    editingField.value.type = editingField.value.type.toLowerCase();
  }
  if (editingField.value.type === 'geolocation') {
    if (!editingField.value.attributes) editingField.value.attributes = {};
    if (!['scope', 'manual'].includes(editingField.value.attributes.mode)) {
      editingField.value.attributes.mode = 'scope';
    }
    editingField.value.is_required = true;
  }
  if (['signature', 'image', 'document'].includes(editingField.value.type)) {
    editingField.value.attributes.max_files = 4;
  }
  if (!typesWithEvidence.includes(editingField.value.type)) {
    editingField.value.has_evidence = false;
  }
  if (isSemaforoField(editingField.value)) {
    editingField.value = toSemaforoUI(editingField.value);
  }
  clearFieldErrors();
  showEditDialog.value = true;
}

function saveEditedField() {
  if (!validateEditingField()) return;

  if (editingField.value.type === 'geolocation') {
    editingField.value.is_required = true;
    const mode = editingField.value.attributes?.mode;
    if (!['scope', 'manual'].includes(mode)) return;
  }
  if (['signature', 'image', 'document'].includes(editingField.value.type)) {
    editingField.value.attributes.max_files = 4;
  }
  if (!typesWithEvidence.includes(editingField.value.type)) {
    editingField.value.has_evidence = false;
  }
  if (isSemaforoField(editingField.value)) {
    editingField.value = toSemaforoPayload(editingField.value);
  }

  if (editingField.value._group) {
    editingField.value._group.fields[editingFieldIndex.value] = { ...editingField.value };
  } else if (editingFieldIndex.value >= 0) {
    items.value[editingFieldIndex.value] = { ...editingField.value };
  }
  showEditDialog.value = false;
  editingFieldIndex.value = -1;
}

// =====================
//  Reordenamientos
// =====================
function onItemsDragEnd() {
  items.value.forEach((item, idx) => (item.order = idx));
}
function onGroupFieldsDragEnd(group) {
  group.fields.forEach((f, idx) => (f.order = idx));
}

// =====================
//  Soltar sobre grupo (sidebar o mover desde lista)
// =====================
async function onDropToGroup(event, group) {
  event.preventDefault();
  isDragOver.value = false;
  dragStarted.value = false;
  isSidebarDragging.value = false;

  let raw = '';
  try {
    raw = event.dataTransfer.getData('application/json') || event.dataTransfer.getData('text/plain') || '';
  } catch {}

  let payload = null;
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {}
  }
  if (!payload) payload = lastDraggedPayload.value;
  lastDraggedPayload.value = null;
  if (!payload) return;

  // Caso 1: viene de la barra (tiene .value)
  if (payload.value) {
    if (payload.value === 'group') return;
    addFieldToGroup(payload, group);
    const newFieldIndex = group.fields.length - 1;
    if (newFieldIndex >= 0) editField(newFieldIndex, group);
    return;
  }

  // Caso 2: mover un campo existente (trae local_id / id del draggable)
  let movedField = null;

  // buscar en items sueltos por local_id
  let idx = items.value.findIndex((f) => f.local_id === payload.local_id || f.id === payload.id);
  if (idx !== -1) {
    movedField = items.value.splice(idx, 1)[0];
  } else {
    // buscar dentro de grupos
    for (const g of items.value) {
      if (g.type === 'group') {
        const fIdx = g.fields.findIndex((f) => f.local_id === payload.local_id || f.id === payload.id);
        if (fIdx !== -1) {
          movedField = g.fields.splice(fIdx, 1)[0];
          break;
        }
      }
    }
  }

  if (movedField) {
    movedField.form_field_group_id = group.id ?? null;
    movedField.order = group.fields.length;
    // si estaba como suelto, ahora pertenece al grupo; asigna local_id se conserva
    group.fields.push(movedField);
    group.fields.forEach((f, i) => (f.order = i));

    // persistir si ya existe en BD
    if (movedField.id) {
      try {
        await axiosInstance.put(`/forms/${props.form.id}/fields/${movedField.id}`, {
          label: movedField.label,
          description: movedField.description || '',
          type: movedField.type,
          is_required: !!movedField.is_required,
          order: movedField.order,
          attributes: movedField.attributes && typeof movedField.attributes === 'object' ? { ...movedField.attributes } : {},
          weight: props.form?.has_rating ? (Number.isFinite(Number(movedField.weight)) ? parseInt(movedField.weight) : 0) : undefined,
          has_evidence: typesWithEvidence.includes(movedField.type) ? !!movedField.has_evidence : false,
          form_field_group_id: group.id ?? null
        });
      } catch (e) {
        errorMsg.value = e?.response?.data?.message || 'No se pudo actualizar el campo al moverlo de grupo.';
      }
    }
  }
}

// =====================
//  Utilidades varias
// =====================
const triedSaveWithWrongWeight = ref(false);
const totalWeightUsed = computed(() =>
  props.form?.has_rating
    ? items.value
        .flatMap((item) => (item.type === 'group' ? item.fields : [item]))
        .reduce((total, f) => total + (parseInt(f.weight) || 0), 0)
    : 0
);
const maxWeightAvailable = computed(() => {
  if (!props.form?.has_rating) return 0;
  return undefined;
});
const validateWeight = (w) => {
  const n = parseInt(w) || 0;
  if (n < 0) return 0;
  return n;
};
const getFieldTypeLabel = (type) => {
  const fieldType = availableFieldTypes.value.find((ft) => ft.value === type);
  return fieldType ? fieldType.label : type;
};

// =====================
//  Duplicados (vista)
// =====================
function isDuplicateLabel(field, idx, group = null) {
  if (!field.label) return false;
  const labelNorm = normalizeLabel(field.label);
  const allLabels = [];
  const pushLabel = (label, obj) => {
    if (!label) return;
    allLabels.push({ label: normalizeLabel(label), key: keyOf(obj) });
  };
  for (const item of items.value) {
    if (item.type === 'group') {
      pushLabel(item.name, item);
      for (const f of item.fields) pushLabel(f.label, f);
    } else {
      pushLabel(item.label, item);
    }
  }
  const sameLabel = allLabels.filter((l) => l.label === labelNorm && l.key !== keyOf(field));
  return sameLabel.length > 0;
}

// =====================
//  Guardar todo
// =====================
const saveCurrentFields = async () => {
  triedSaveWithWrongWeight.value = false;
  errorMsg.value = '';

  if (!items.value.length) {
    errorMsg.value = 'Debes agregar al menos una pregunta o grupo.';
    return;
  }
  for (const item of items.value) {
    if (item.type === 'group' && (!item.name || !item.name.trim())) {
      errorMsg.value = 'Todos los grupos deben tener nombre.';
      return;
    }
    if (item.type === 'group' && item.description && item.description.length > 500) {
      errorMsg.value = 'La descripción de los grupos no puede superar los 500 caracteres.';
      return;
    }
  }

  // Validación robusta duplicados global (clave lógica)
  const allLabels = [];
  const pushLabel = (label, obj) => {
    if (!label) return;
    allLabels.push({ label: normalizeLabel(label), key: keyOf(obj) });
  };
  for (const item of items.value) {
    if (item.type === 'group') {
      pushLabel(item.name, item);
      for (const f of item.fields) pushLabel(f.label, f);
    } else {
      pushLabel(item.label, item);
    }
  }
  const labelMap = {};
  for (const l of allLabels) {
    if (!l.label) continue;
    if (!labelMap[l.label]) labelMap[l.label] = new Set();
    labelMap[l.label].add(l.key);
  }
  for (const label in labelMap) {
    if (labelMap[label].size > 1) {
      errorMsg.value = 'Ya existe un campo o grupo con ese nombre en este formulario.';
      return;
    }
  }

  // Validaciones por campo
  for (const item of items.value) {
    if (item.type === 'group') {
      for (const f of item.fields) {
        if (!f.label || !String(f.label).trim()) {
          errorMsg.value = 'Todas las preguntas deben tener una etiqueta.';
          return;
        }
        if (['select', 'radio', 'checkbox'].includes(f.type) && !isSemaforoField(f)) {
          const validOptions = Array.isArray(f.options) ? f.options.filter((opt) => typeof opt === 'string' && !!opt.trim()) : [];
          if (validOptions.length < 1) {
            errorMsg.value = 'Las preguntas tipo selección deben tener al menos una opción válida.';
            return;
          }
        }
        if (['signature', 'image', 'document'].includes(f.type)) {
          let maxFiles = parseInt(f.attributes?.max_files) || 1;
          if (maxFiles < 1 || maxFiles > 4) {
            errorMsg.value = 'El número de archivos permitidos debe estar entre 1 y 4.';
            return;
          }
        }
        if (f.type === 'geolocation') {
          if (!['scope', 'manual'].includes(f.attributes?.mode)) {
            errorMsg.value = 'El modo de geolocalización es inválido.';
            return;
          }
        }
        if (props.form?.has_rating) {
          let w = parseInt(f.weight);
          if (isNaN(w) || w < 0) {
            errorMsg.value = 'La ponderación de todas las preguntas debe ser mayor o igual a 0.';
            return;
          }
        }
      }
    } else {
      const f = item;
      if (!f.label || !String(f.label).trim()) {
        errorMsg.value = 'Todas las preguntas deben tener una etiqueta.';
        return;
      }
      if (['select', 'radio', 'checkbox'].includes(f.type) && !isSemaforoField(f)) {
        const validOptions = Array.isArray(f.options) ? f.options.filter((opt) => typeof opt === 'string' && !!opt.trim()) : [];
        if (validOptions.length < 1) {
          errorMsg.value = 'Las preguntas tipo selección deben tener al menos una opción válida.';
          return;
        }
      }
      if (['signature', 'image', 'document'].includes(f.type)) {
        let maxFiles = parseInt(f.attributes?.max_files) || 1;
        if (maxFiles < 1 || maxFiles > 4) {
          errorMsg.value = 'El número de archivos permitidos debe estar entre 1 y 4.';
          return;
        }
      }
      if (f.type === 'geolocation') {
        if (!['scope', 'manual'].includes(f.attributes?.mode)) {
          errorMsg.value = 'El modo de geolocalización es inválido.';
          return;
        }
      }
      if (props.form?.has_rating) {
        let w = parseInt(f.weight);
        if (isNaN(w) || w < 0) {
          errorMsg.value = 'La ponderación de todas las preguntas debe ser mayor o igual a 0.';
          return;
        }
      }
    }
  }

  // Antes de enviar, alinea ids de grupo en hijos
  items.value.forEach((item) => {
    if (item.type === 'group' && Array.isArray(item.fields)) {
      item.fields.forEach((f) => {
        f.form_field_group_id = item.id ?? null;
      });
    }
  });

  // Construir payload (sin local_id)
  const payload = items.value.map((item, i) => {
    if (item.type === 'group') {
      return {
        type: 'group',
        id: item.id ?? null,
        name: item.name,
        description: item.description || '',
        order: i,
        fields: (item.fields || []).map((f, j) => {
          let fieldPayload = {
            id: f.id ?? undefined,
            label: f.label,
            description: f.description || '',
            type: f.type,
            is_required: !!f.is_required,
            order: j,
            attributes: f.attributes && typeof f.attributes === 'object' ? { ...f.attributes } : {},
            weight: props.form?.has_rating ? (Number.isFinite(Number(f.weight)) ? parseInt(f.weight) : 0) : undefined,
            has_evidence: typesWithEvidence.includes(f.type) ? !!f.has_evidence : false,
            form_field_group_id: item.id ?? null
          };
          if (f.type === 'geolocation') {
            fieldPayload.is_required = true;
            fieldPayload.attributes = {
              ...fieldPayload.attributes,
              mode: f.attributes && ['scope', 'manual'].includes(f.attributes.mode) ? f.attributes.mode : 'scope'
            };
          }
          if (['signature', 'image', 'document'].includes(f.type)) {
            fieldPayload.attributes.max_files = 4;
          } else if (fieldPayload.attributes && 'max_files' in fieldPayload.attributes) {
            delete fieldPayload.attributes.max_files;
          }
          if (isSemaforoField(f)) {
            fieldPayload = toSemaforoPayload(fieldPayload);
          } else if (['select', 'radio', 'checkbox'].includes(f.type)) {
            fieldPayload.options = (f.options || []).filter((opt) => typeof opt === 'string' && !!opt.trim());
          }
          return fieldPayload;
        })
      };
    } else {
      const f = item;
      let fieldPayload = {
        id: f.id ?? undefined,
        label: f.label,
        description: f.description || '',
        type: f.type,
        is_required: !!f.is_required,
        order: i,
        attributes: f.attributes && typeof f.attributes === 'object' ? { ...f.attributes } : {},
        weight: props.form?.has_rating ? (Number.isFinite(Number(f.weight)) ? parseInt(f.weight) : 0) : undefined,
        has_evidence: typesWithEvidence.includes(f.type) ? !!f.has_evidence : false
      };
      if (f.type === 'geolocation') {
        fieldPayload.is_required = true;
        fieldPayload.attributes = {
          ...fieldPayload.attributes,
          mode: f.attributes && ['scope', 'manual'].includes(f.attributes.mode) ? f.attributes.mode : 'scope'
        };
      }
      if (['signature', 'image', 'document'].includes(f.type)) {
        fieldPayload.attributes.max_files = 4;
      } else if (fieldPayload.attributes && 'max_files' in fieldPayload.attributes) {
        delete fieldPayload.attributes.max_files;
      }
      if (isSemaforoField(f)) {
        fieldPayload = toSemaforoPayload(fieldPayload);
      } else if (['select', 'radio', 'checkbox'].includes(f.type)) {
        fieldPayload.options = (f.options || []).filter((opt) => typeof opt === 'string' && !!opt.trim());
      }
      return fieldPayload;
    }
  });

  saving.value = true;
  try {
    await axiosInstance.post(`/forms/${props.form.id}/fields`, payload);

    // Rehidratar desde API (determinista con local_id)
    const response = await axiosInstance.get(`/forms/${props.form.id}`);
    const data = response.data.form || response.data.data || response.data;

    const groupMap = {};
    (data.field_groups || []).forEach((g) => {
      groupMap[g.id] = {
        ...g,
        type: 'group',
        id: g.id,
        local_id: makeLocalId('g', g.id),
        fields: []
      };
    });
    (data.fields || []).forEach((f) => {
      const base = isSemaforoField(f) ? toSemaforoUI(f) : f;
      const wrap = {
        ...base,
        id: base.id,
        local_id: makeLocalId('f', base.id)
      };
      if (wrap.form_field_group_id && groupMap[wrap.form_field_group_id]) {
        groupMap[wrap.form_field_group_id].fields.push(wrap);
      }
    });
    const allItems = [
      ...(data.field_groups || []).map((g) => ({
        ...groupMap[g.id],
        order: g.order
      })),
      ...(data.fields || [])
        .filter((f) => !f.form_field_group_id || !groupMap[f.form_field_group_id])
        .map((f) => ({
          ...(isSemaforoField(f) ? toSemaforoUI(f) : f),
          id: f.id,
          local_id: makeLocalId('f', f.id),
          order: f.order
        }))
    ].sort((a, b) => a.order - b.order);

    items.value = allItems;
    expandedGroups.value = items.value.filter((i) => i.type === 'group').map((g) => g.local_id);
    emit('fields-saved', items.value);
    close();
  } catch (err) {
    errorMsg.value = err?.response?.data?.message || 'Ocurrió un error inesperado al guardar. Intenta de nuevo.';
  } finally {
    saving.value = false;
  }
};

// =====================
//  Opciones de selects
// =====================
const addOption = () => {
  if (!editingField.value.options) editingField.value.options = [];
  editingField.value.options.push('');
  fieldErrors.value.options.push('');
};
const removeOption = (index) => {
  editingField.value.options.splice(index, 1);
  fieldErrors.value.options.splice(index, 1);
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
          <template v-if="props.form?.has_rating">
            <span class="ponderacion-header mr-4" :class="{ error: triedSaveWithWrongWeight }">
              <v-icon
                :icon="mdiScaleBalance"
                size="20"
                :color="triedSaveWithWrongWeight ? '#e53935' : 'black'"
                class="mr-2"
                style="margin-right: 8px"
              />
              <span :style="{ color: triedSaveWithWrongWeight ? '#e53935' : '#111', fontWeight: 600 }">
                Ponderación: <b style="margin: 0 4px">{{ totalWeightUsed }}</b>
              </span>
            </span>
          </template>
          <span class="close-icon" @click="close">
            <v-icon :icon="mdiClose" color="grey-darken-2" size="28"></v-icon>
          </span>
        </div>
      </div>

      <!-- MENSAJE DE ERROR GLOBAL -->
      <div v-if="errorMsg" class="global-error-msg">
        <div class="custom-error-msg">{{ errorMsg }}</div>
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
            <div v-if="items.length === 0" class="empty-fields-container center-middle">
              <div class="empty-fields-explanation-group">
                <div class="empty-fields-title empty-fields-title-mobile">No hay preguntas en este formulario.</div>
                <div class="empty-fields-desc empty-fields-desc-mobile">
                  Arrastra un tipo de campo desde la barra lateral o haz clic en uno para comenzar.
                </div>
              </div>
            </div>

            <!-- UNIFIED LIST: GRUPOS Y CAMPOS SUELTOS -->
            <draggable
              v-model="items"
              item-key="local_id"
              handle=".drag-handle"
              @end="onItemsDragEnd"
              class="v-list"
              :group="{ name: 'items', pull: true, put: true }"
            >
              <template #item="{ element: item, index: itemIdx }">
                <template v-if="item.type === 'group'">
                  <v-card class="mb-3 pa-3" variant="outlined">
                    <div class="d-flex align-center justify-space-between">
                      <div class="d-flex align-center">
                        <v-icon class="mr-2 drag-handle" :icon="mdiDrag" color="grey" size="24"></v-icon>
                        <div>
                          <div class="font-weight-medium">
                            <v-icon :icon="mdiFolderPlus" size="18" class="mr-1" color="indigo"></v-icon>
                            <span>{{ item.name }}</span>
                          </div>
                          <div class="text-caption text-grey-darken-1">Grupo de Preguntas</div>
                          <div v-if="item.description" class="text-caption text-grey-darken-2 mt-1" style="font-style: italic">
                            {{ item.description }}
                          </div>
                        </div>
                      </div>
                      <div class="d-flex align-center">
                        <v-btn icon variant="plain" @click="toggleGroupExpand(item.local_id)">
                          <v-icon :icon="expandedGroups.includes(item.local_id) ? mdiChevronUp : mdiChevronDown"></v-icon>
                        </v-btn>
                        <button class="icon-btn mr-2" @click="editGroup(itemIdx)" aria-label="Editar grupo" type="button">
                          <v-icon :icon="mdiPencil" color="black" size="20"></v-icon>
                        </button>
                        <button class="icon-btn" @click="removeGroup(itemIdx)" aria-label="Eliminar grupo" type="button">
                          <v-icon :icon="mdiDelete" color="black" size="20"></v-icon>
                        </button>
                      </div>
                    </div>
                    <transition name="fade">
                      <div v-if="expandedGroups.includes(item.local_id)">
                        <!-- Dropzone para agregar campos al grupo -->
                        <div
                          class="drop-zone pa-2 rounded-lg mt-2"
                          style="background: #f5f5f5; border: 1px dashed #bdbdbd"
                          @dragenter="handleDragEnter"
                          @dragover="handleDragOver"
                          @dragleave="handleDragLeave"
                          @drop="(e) => onDropToGroup(e, item)"
                        >
                          <draggable
                            v-model="item.fields"
                            item-key="local_id"
                            handle=".drag-handle"
                            @end="() => onGroupFieldsDragEnd(item)"
                            class="v-list"
                            :group="{ name: 'fields', pull: true, put: true }"
                          >
                            <template #item="{ element: field, index }">
                              <v-card
                                class="mb-2 pa-2"
                                variant="outlined"
                                :class="{ 'duplicate-field': isDuplicateLabel(field, index, item) }"
                              >
                                <div class="d-flex align-center justify-space-between">
                                  <div class="d-flex align-center">
                                    <v-icon class="mr-2 drag-handle" :icon="mdiDrag" color="grey" size="20"></v-icon>
                                    <div>
                                      <div class="font-weight-medium">
                                        {{ field.label || 'Campo sin nombre' }}
                                      </div>
                                      <div class="text-caption text-grey-darken-1">
                                        {{ getFieldTypeLabel(field.type) }}
                                      </div>
                                      <div v-if="props.form?.has_rating" class="text-caption text-blue-darken-2 mt-1">
                                        Ponderación: {{ parseInt(field.weight) || 0 }}
                                      </div>
                                      <div v-if="isDuplicateLabel(field, index, item)" class="text-caption duplicate-label-warning mt-1">
                                        Nombre duplicado
                                      </div>
                                    </div>
                                  </div>
                                  <div class="d-flex align-center">
                                    <button class="icon-btn mr-2" @click="editField(index, item)" aria-label="Editar campo" type="button">
                                      <v-icon :icon="mdiPencil" color="black" size="20"></v-icon>
                                    </button>
                                    <button
                                      class="icon-btn"
                                      @click="removeFieldFromGroup(item, index)"
                                      aria-label="Eliminar campo"
                                      type="button"
                                    >
                                      <v-icon :icon="mdiDelete" color="black" size="20"></v-icon>
                                    </button>
                                  </div>
                                </div>
                              </v-card>
                            </template>
                          </draggable>
                          <div v-if="item.fields.length === 0" class="text-caption text-grey-darken-1 pa-2">
                            Arrastra preguntas aquí o haz clic en la barra lateral para agregarlas a este grupo.
                          </div>
                        </div>
                      </div>
                    </transition>
                  </v-card>
                </template>
                <template v-else>
                  <v-card class="mb-3 pa-3" variant="outlined" :class="{ 'duplicate-field': isDuplicateLabel(item, itemIdx) }">
                    <div class="d-flex align-center justify-space-between">
                      <div class="d-flex align-center">
                        <v-icon class="mr-2 drag-handle" :icon="mdiDrag" color="grey" size="24"></v-icon>
                        <div>
                          <div class="font-weight-medium">
                            {{ item.label || 'Campo sin nombre' }}
                          </div>
                          <div class="text-caption text-grey-darken-1">
                            {{ getFieldTypeLabel(item.type) }}
                          </div>
                          <div v-if="props.form?.has_rating" class="text-caption text-blue-darken-2 mt-1">
                            Ponderación: {{ parseInt(item.weight) || 0 }}
                          </div>
                          <div v-if="isDuplicateLabel(item, itemIdx)" class="text-caption duplicate-label-warning mt-1">
                            Nombre duplicado
                          </div>
                        </div>
                      </div>
                      <div class="d-flex align-center">
                        <button class="icon-btn mr-2" @click="editField(itemIdx)" aria-label="Editar campo" type="button">
                          <v-icon :icon="mdiPencil" color="black" size="20"></v-icon>
                        </button>
                        <button class="icon-btn" @click="removeItem(itemIdx)" aria-label="Eliminar campo" type="button">
                          <v-icon :icon="mdiDelete" color="black" size="20"></v-icon>
                        </button>
                      </div>
                    </div>
                  </v-card>
                </template>
              </template>
            </draggable>
          </div>

          <!-- Footer SIEMPRE visible y flotante -->
          <div
            class="fields-footer d-flex justify-end"
            :class="{
              'fields-footer-mobile': isMobile,
              'fields-footer-right-offset': !isMobile && showSidebar
            }"
          >
            <v-btn
              color="primary"
              variant="flat"
              @click="saveCurrentFields"
              :loading="saving"
              :disabled="items.length === 0 || saving"
              class="guardar-campos-btn"
            >
              Guardar Campos
            </v-btn>
          </div>
        </div>

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
              <v-label class="mb-1">Etiqueta del Campo <span style="color: #e53935">*</span></v-label>
              <v-text-field
                v-model="editingField.label"
                variant="outlined"
                required
                class="mb-4"
                :error="!!fieldErrors.label"
                :rules="[(v) => (!!v && String(v).trim().length > 0) || 'La etiqueta es obligatoria']"
                :error-messages="fieldErrors.label"
                @keyup.enter="saveEditedField"
                hide-details="auto"
              />
              <v-label class="mb-1">Descripción (opcional)</v-label>
              <v-text-field
                v-model="editingField.description"
                variant="outlined"
                class="mb-4"
                maxlength="500"
                counter
                hide-details="auto"
              />
              <div v-if="props.form?.has_rating" class="mb-4">
                <v-label class="mb-1"> Ponderación de la pregunta <span style="color: #e53935">*</span> </v-label>
                <v-text-field
                  v-model.number="editingField.weight"
                  variant="outlined"
                  type="number"
                  min="0"
                  :max="maxWeightAvailable"
                  :error="!!fieldErrors.weight || triedSaveWithWrongWeight"
                  :error-messages="fieldErrors.weight"
                  @blur="editingField.weight = validateWeight(editingField.weight)"
                  @input="editingField.weight = validateWeight(editingField.weight)"
                  class="mb-1"
                  required
                  hide-details="auto"
                />
                <div style="height: 18px"></div>
              </div>
              <div :class="['d-flex', 'align-center', 'mb-4', 'checkboxes-row', isMobile ? 'flex-column align-stretch' : '']">
                <v-checkbox
                  v-model="editingField.is_required"
                  label="Campo requerido"
                  color="primary"
                  :disabled="editingField.type === 'geolocation'"
                  class="mr-6"
                  density="comfortable"
                  hide-details
                />
                <template v-if="typesWithEvidence.includes(editingField.type)">
                  <v-checkbox
                    v-model="editingField.has_evidence"
                    label="Requiere evidencia (adjuntar archivo)"
                    color="primary"
                    density="comfortable"
                    hide-details
                    :class="isMobile ? 'mt-0' : ''"
                  />
                </template>
              </div>
              <div v-if="showGeolocationMode" class="mb-4">
                <v-label class="mb-1">Modo de Geolocalización</v-label>
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
              <div style="height: 18px"></div>
              <div v-if="String(editingField.type).toLowerCase() === 'semaforo' || isSemaforoField(editingField)" class="mb-4">
                <v-label class="mb-1">Opciones del semáforo</v-label>
                <div class="semaforo-chips-row">
                  <v-chip style="background: #e53935; color: white; padding-left: 18px; padding-right: 18px">Alto</v-chip>
                  <v-chip style="background: #ffd600; color: black; padding-left: 18px; padding-right: 18px">Medio</v-chip>
                  <v-chip style="background: #43a047; color: white; padding-left: 18px; padding-right: 18px">Bajo</v-chip>
                </div>
              </div>
              <div v-if="showOptionsField" class="mb-4">
                <v-label class="mb-1"> Opciones <span style="color: #e53935">*</span> </v-label>
                <div v-for="(option, index) in editingField.options" :key="index" class="option-row mb-1">
                  <v-text-field
                    v-model="editingField.options[index]"
                    variant="outlined"
                    density="compact"
                    class="option-input"
                    :error="!!fieldErrors.options[index]"
                    :error-messages="fieldErrors.options[index]"
                    @keyup.enter="saveEditedField"
                    hide-details="auto"
                    :placeholder="`Opción ${index + 1}`"
                    :label="''"
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
                <v-btn color="primary" variant="outlined" class="mt-1" @click="addOption">
                  <v-icon :icon="mdiPlus" class="mr-1"></v-icon>
                  Agregar Opción
                </v-btn>
              </div>
            </v-form>
          </v-card-text>
          <v-card-actions class="px-4 pb-4 pt-0 d-flex justify-end">
            <v-btn color="primary" variant="flat" class="px-6 py-2" @click="saveEditedField">Guardar</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- MODAL DE GRUPO DE PREGUNTAS -->
      <v-dialog v-model="showGroupModal" max-width="400px" persistent>
        <v-card>
          <div class="d-flex align-center justify-space-between px-4 py-2">
            <span class="text-h5">{{ editingGroupIndex === -1 ? 'Nuevo Grupo de Preguntas' : 'Editar Grupo' }}</span>
            <v-btn icon variant="plain" @click="showGroupModal = false">
              <v-icon :icon="mdiClose" color="grey-darken-2" size="24"></v-icon>
            </v-btn>
          </div>
          <v-card-text>
            <v-form @submit.prevent="saveGroupModal">
              <v-label class="mb-1">Nombre del grupo <span style="color: #e53935">*</span></v-label>
              <v-text-field
                v-model="groupModalName"
                variant="outlined"
                required
                class="mb-4"
                :error="!!groupModalError"
                :rules="[(v) => (!!v && String(v).trim().length > 0) || 'El nombre del grupo es obligatorio']"
                :error-messages="groupModalError"
                hide-details="auto"
                autofocus
              />
              <v-label class="mb-1">Descripción del grupo (opcional)</v-label>
              <v-text-field
                v-model="groupModalDescription"
                variant="outlined"
                class="mb-4"
                maxlength="500"
                counter
                hide-details="auto"
                :error="groupModalDescription.length > 500"
                :error-messages="groupModalDescription.length > 500 ? 'Máximo 500 caracteres' : ''"
              />
            </v-form>
          </v-card-text>
          <v-card-actions class="px-4 pb-4 pt-0 d-flex justify-end">
            <v-btn text @click="showGroupModal = false">Cancelar</v-btn>
            <v-btn color="primary" variant="flat" class="px-6 py-2" @click="saveGroupModal" :loading="saving">Guardar</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.custom-error-msg {
  color: #e53935;
  background: #ffebee;
  border-left: 4px solid #e53935;
  padding: 12px 18px;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  margin-bottom: 0;
  display: block;
}
.v-label {
  font-size: 0.92rem;
  font-weight: 500;
  color: #222;
  margin-bottom: 2px;
  display: block;
}
.mb-4 {
  margin-bottom: 1.1rem !important;
}
.d-flex.align-center.mb-4.checkboxes-row {
  margin-bottom: 0.7rem !important;
  margin-top: -0.3rem !important;
}
.v-input.mb-2,
.mb-2 {
  margin-bottom: 8px !important;
}
.v-input.mb-1,
.mb-1 {
  margin-bottom: 4px !important;
}
.field-label {
  display: none;
}
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

.ponderacion-header {
  display: inline-flex;
  align-items: center;
  background: #e3f2fd;
  border-radius: 999px;
  padding: 4px 16px 4px 12px;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  box-shadow: 0 1px 4px rgba(33, 150, 243, 0.08);
  border: 1.5px solid #bbdefb;
  transition:
    color 0.2s,
    border-color 0.2s,
    background 0.2s;
}
.ponderacion-header.error {
  background: #ffebee;
  border-color: #ffcdd2;
}

.global-error-msg {
  padding: 0 24px 0 24px;
  margin-top: 8px;
  margin-bottom: 0;
  z-index: 1001;
  position: relative;
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

/* ------- Aumenta espacio al final para no tapar la última card ------- */
.fields-area-with-footer {
  padding-bottom: 140px; /* antes 80px */
}

/* ------- BOTÓN FLOTANTE (desktop) ------- */
.fields-footer {
  position: fixed; /* ahora relativo al viewport */
  bottom: 24px;
  right: 24px;
  width: auto;
  padding: 0;
  background: transparent;
  z-index: 1000;
}

/* Cuando el sidebar esté abierto, lo corremos para no quedar debajo (320 + 24) */
.fields-footer-right-offset {
  right: 344px;
}

/* ------- Variante móvil: barra completa al fondo ------- */
.fields-footer-mobile {
  position: fixed !important;
  bottom: 0;
  right: 0;
  left: 0;
  width: 100vw !important;
  background: linear-gradient(to top, #fff 90%, rgba(255, 255, 255, 0));
  padding: 12px 16px 12px 0 !important;
  z-index: 1000;
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
  box-shadow: 0 4px 20px rgba(33, 150, 243, 0.15);
}
.drop-zone-mobile {
  min-height: 180px !important;
  padding: 12px !important;
}

.empty-fields-container.center-middle {
  position: absolute;
  inset: 0;
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

/* ---------- Opciones (inputs) ---------- */
.option-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 10px;
}
.option-input {
  flex: 1 1 auto;
  min-width: 0;
}
:deep(.option-input .v-input__append) {
  margin-inline-start: 4px;
}
.option-delete-icon {
  margin-left: 4px;
}

/* Chips de vista previa en el editor */
.semaforo-chips-row {
  display: flex;
  gap: 12px;
  padding: 4px 0;
}

/* Duplicado */
.duplicate-field {
  border: 2px solid #e53935 !important;
  background: #ffebee !important;
  transition:
    border 0.2s,
    background 0.2s;
}
.duplicate-label-warning {
  color: #e53935 !important;
  font-weight: 600;
  letter-spacing: 0.01em;
}

/* ---------- Mobile ---------- */
@media (max-width: 900px) {
  .modal-header {
    padding: 12px 8px !important;
    min-height: 48px;
    background: #f8f9fa;
  }
  .modal-title-container.center-mobile {
    justify-content: flex-start !important;
    width: 100%;
    padding-left: 8px;
  }
  .close-icon {
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
  }
  .sidebar-dropdown-btn {
    width: 100%;
    background: #fff !important;
    border-radius: 8px;
    border: 1px solid #e0e0e0;
    min-height: 48px;
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
  }
  /* en mobile la barra inferior ya usa fields-footer-mobile */
  .fields-footer {
    right: 0 !important;
    bottom: 0 !important;
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
}
@media (min-width: 901px) {
  .sidebar-dropdown-mobile {
    display: none !important;
  }
}
@media (max-width: 900px) {
  .checkboxes-row.flex-column {
    flex-direction: column !important;
    align-items: stretch !important;
    gap: 0 !important;
  }
  .checkboxes-row.flex-column .v-checkbox {
    margin-right: 0 !important;
    margin-bottom: 0.2rem !important;
    width: 100%;
  }
}
</style>
