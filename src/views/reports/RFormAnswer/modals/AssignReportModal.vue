<script setup>
import { ref, watch } from 'vue';
import axiosInstance from '@/utils/axios';
import { mdiClose } from '@mdi/js';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  reportId: { type: [Number, String], required: true },
  organizationId: { type: Number, required: true },
  assignedUser: { type: Object, default: null }
});

const emit = defineEmits(['update:modelValue', 'assigned']);

const selectedUserId = ref(null);
const userOptions = ref([]);
const userSearch = ref('');
const loadingUsers = ref(false);
const assigning = ref(false);
const errorMessage = ref('');

const fetchUsers = async (searchText) => {
  loadingUsers.value = true;
  errorMessage.value = '';
  try {
    const params = { q: searchText || '', limit: 20 };
    if (props.organizationId) {
      params.organization_id = props.organizationId;
    }
    const { data } = await axiosInstance.get('/users', { params });
    userOptions.value = (data.data || []).map(toUserOption);
  } catch (error) {
    console.error('Error al obtener los usuarios:', error);
    userOptions.value = [];
    errorMessage.value = 'No se pudieron cargar los usuarios.';
  } finally {
    loadingUsers.value = false;
  }
};
function toUserOption(u) {
  const roles = Array.isArray(u?.roles) ? u.roles : [];
  const roleName = roles[0]?.name || '';
  return {
    ...u,
    display: `${u?.name || u?.email || 'Sin nombre'} - ${u?.email || ''} (${roleName})`.trim().replace(/ - \(\)$/, '') || 'Sin nombre'
  };
}

const close = () => {
  emit('update:modelValue', false);
  selectedUserId.value = null;
  userSearch.value = '';
  errorMessage.value = '';
};

const assign = async () => {
  assigning.value = true;
  try {
    await axiosInstance.put(`/reportes/formulario/reportes/${props.reportId}/assign`, {
      user_id: selectedUserId.value,
      report_id: props.reportId
    });
    alert('El reporte ha sido asignado correctamente.');
    emit('assigned');
    close();
  } catch (error) {
    console.error('Error al asignar el reporte:', error);
    alert('No se pudo asignar el reporte.');
    errorMessage.value = 'No se pudo asignar el reporte.';
  } finally {
    assigning.value = false;
  }
};

watch(
  () => props.modelValue,
  async (val) => {
    if (val) {
      selectedUserId.value = props.assignedUser?.id || null;
      await fetchUsers('');
      const assigned = props.assignedUser;
      if (assigned?.id) {
        const option = toUserOption(assigned);
        const exists = userOptions.value.some((u) => u.id === assigned.id);
        if (!exists) {
          userOptions.value = [option, ...userOptions.value];
        }
      }
    }
  }
);

watch(userSearch, (val) => {
  fetchUsers(val);
});
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="420" persistent @update:model-value="emit('update:modelValue', $event)">
    <v-card class="modal-padding" style="position: relative">
      <v-btn icon variant="text" class="position-absolute close-btn" style="top: 10px; right: 10px; z-index: 10" @click="close">
        <v-icon :icon="mdiClose" />
      </v-btn>

      <v-card-title class="font-weight-bold">Asignar reporte</v-card-title>
      <v-card-text class="pb-0">
        <p class="text-body-2 text-medium-emphasis mb-3">Selecciona el usuario al que deseas asignar este reporte.</p>
        <v-autocomplete
          v-model="selectedUserId"
          :items="userOptions"
          :loading="loadingUsers"
          v-model:search-input="userSearch"
          item-title="display"
          item-value="id"
          label="Buscar usuario"
          placeholder="Escribe nombre o correo..."
          clearable
          hide-details
          variant="outlined"
          color="primary"
          density="compact"
          :filter="customUserFilter"
          :menu-props="{ maxHeight: '280px' }"
        />
        <p v-if="errorMessage" class="text-error text-caption mt-2">{{ errorMessage }}</p>
      </v-card-text>
      <v-card-actions class="d-flex flex-column align-end pt-2" style="gap: 8px">
        <v-btn
          color="primary"
          :loading="assigning"
          :disabled="!selectedUserId"
          style="width: 100%; text-transform: none; font-weight: 500"
          @click="assign"
        >
          Asignar
        </v-btn>
        <v-btn variant="text" style="width: 100%; text-transform: none" @click="close"> Cancelar </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
