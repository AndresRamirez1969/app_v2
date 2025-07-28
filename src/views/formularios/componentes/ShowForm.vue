<template>
  <v-progress-circular v-if="loading" indeterminate color="primary" />

  <v-card v-else-if="form" class="pa-6 rounded-lg elevation-3">
    <v-toolbar class="mb-4" density="compact" title="Detalles del Formulario">
      <template #prepend v-if="!isSponsor">
        <v-btn icon @click="goBack">
          <v-icon :icon="mdiArrowLeft" />
        </v-btn>
      </template>
      <template v-slot:append v-if="!isSponsor">
        <v-btn icon @click="editMode ? saveChanges() : (editMode = true)">
          <v-icon :icon="editMode ? mdiCheck : mdiPencil" />
        </v-btn>
        <v-btn icon v-if="editMode" @click="cancelEdit">
          <v-icon :icon="mdiCancel" />
        </v-btn>
      </template>
    </v-toolbar>

    <v-row dense>
      <!-- Left Column: Basic Form Information -->
      <v-col cols="12" md="6">
        <div class="mb-4">
          <strong class="text-grey-darken-1">Nombre del Formulario:</strong>
          <div v-if="!editMode" class="text-subtitle-1 font-weight-medium">{{ form.name || '—' }}</div>
          <v-text-field v-else v-model="formData.name" variant="outlined" density="compact" />
        </div>

        <div class="mb-4">
          <strong class="text-grey-darken-1">Alcance:</strong>
          <div v-if="!editMode">
            <v-chip :color="getScopeColor(form.assignment_scope)" size="small" class="mt-1" dark>
              {{ getScopeLabel(form.assignment_scope) }}
            </v-chip>
          </div>
          <v-select
            v-else
            v-model="formData.assignment_scope"
            :items="scopeOptions"
            item-title="label"
            item-value="value"
            variant="outlined"
            density="compact"
            hide-details
            class="mt-1"
          />
        </div>

        <div class="mb-4">
          <strong class="text-grey-darken-1">Frecuencia:</strong>
          <div v-if="!editMode">{{ getFrequencyLabel(form.frequency) || '—' }}</div>
          <v-select
            v-else
            v-model="formData.frequency"
            :items="FREQUENCY"
            item-title="label"
            item-value="value"
            variant="outlined"
            density="compact"
            hide-details
            class="mt-1"
          />
        </div>
      </v-col>

      <!-- Right Column: Status, Created Date, Assignment Details -->
      <v-col cols="12" md="6">
        <div class="mb-4">
          <strong class="text-grey-darken-1">Estado:</strong>
          <div>
            <v-chip :color="form.status === 'draft' ? 'green' : 'red'" size="small" class="mt-1" dark>
              {{ form.status === 'draft' ? 'Borrador' : 'Activo' }}
            </v-chip>
          </div>
        </div>

        <div class="mb-4" v-if="form.created_at">
          <strong class="text-grey-darken-1">Fecha de Creación:</strong>
          <div>{{ formatDate(form.created_at) }}</div>
        </div>

        <div class="mb-4" v-if="form.updated_at">
          <strong class="text-grey-darken-1">Última Actualización:</strong>
          <div>{{ formatDate(form.updated_at) }}</div>
        </div>
      </v-col>

      <!-- Assignment Scope Details -->
      <v-col cols="12" v-if="form.assignment_scope === 'organization' && form.organization">
        <strong class="text-grey-darken-1">Organización:</strong>
        <div class="mt-1">{{ form.organization.name }}</div>
      </v-col>

      <v-col cols="12" v-if="form.assignment_scope === 'business' && form.business">
        <strong class="text-grey-darken-1">Negocio:</strong>
        <div class="mt-1">{{ form.business.name }}</div>
      </v-col>

      <v-col cols="12" v-if="form.assignment_scope === 'business_unit' && form.business_unit">
        <strong class="text-grey-darken-1">Unidad de Negocio:</strong>
        <div class="mt-1">{{ form.business_unit.name }}</div>
      </v-col>

      <!-- Roles Assignment -->
      <v-col cols="12" md="6">
        <div class="mb-4">
          <strong class="text-grey-darken-1">Supervisor:</strong>
          <div v-if="!editMode" class="mt-1">
            <div v-if="form.supervisor_role" class="d-flex align-center">
              <span>{{ form.supervisor_role.name }} </span>
            </div>
            <div v-else class="text-grey">No asignado</div>
          </div>
          <v-select
            v-else
            v-model="formData.supervisor_role_id"
            :items="users"
            item-title="customLabel"
            item-value="id"
            variant="outlined"
            density="compact"
            hide-details
            class="mt-1"
            label="Selecciona al Supervisor"
          />
        </div>
      </v-col>

      <v-col cols="12" md="6">
        <div class="mb-4">
          <strong class="text-grey-darken-1">Auditores:</strong>
          <div v-if="!editMode" class="mt-1">
            <div v-if="form.auditor_roles && form.auditor_roles.length > 0">
              <div v-for="auditor in form.auditor_roles" :key="auditor.id" class="d-flex align-center mb-1">
                <span>{{ auditor.name }}</span>
              </div>
            </div>
            <div v-else class="text-grey">No asignados</div>
          </div>
          <v-select
            v-else
            v-model="formData.auditor_role_ids"
            :items="users"
            multiple
            item-title="customLabel"
            item-value="id"
            variant="outlined"
            density="compact"
            hide-details
            class="mt-1"
            label="Selecciona a los Auditores"
          />
        </div>
      </v-col>

      <v-col cols="12">
        <div class="mb-4">
          <strong class="text-grey-darken-1">Auditados:</strong>
          <div v-if="!editMode" class="mt-1">
            <div v-if="form.auditado_roles && form.auditado_roles.length > 0">
              <div v-for="auditado in form.auditado_roles" :key="auditado.id" class="d-flex align-center mb-1">
                <span>{{ auditado.name }}</span>
              </div>
            </div>
            <div v-else class="text-grey">No asignados</div>
          </div>
          <v-select
            v-else
            v-model="formData.auditado_role_ids"
            :items="users"
            multiple
            item-title="customLabel"
            item-value="id"
            variant="outlined"
            density="compact"
            hide-details
            class="mt-1"
            label="Selecciona a los Auditados"
          />
        </div>
      </v-col>
    </v-row>
  </v-card>

  <div v-else class="text-center pa-4 text-grey">
    <v-progress-circular indeterminate color="primary" />
  </div>
</template>

<script setup>
import { onMounted, ref, watch, computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { showForm } from '@/apiCalls/showForm';
import { FREQUENCY, SCOPES } from '@/constants/constants';
import { mdiPencil, mdiCancel, mdiCheck, mdiArrowLeft } from '@mdi/js';
import { useRoute, useRouter } from 'vue-router';
import axiosInstance from '@/utils/axios';

const route = useRoute();
const router = useRouter();
const formId = ref('');
const auth = useAuthStore();
const users = ref([]);

const goBack = () => {
  router.push('/formularios');
};

const isSponsor = computed(() => {
  return auth.user?.roles?.some((role) => role.name === 'sponsor');
});

const scopeOptions = computed(() => [
  { label: 'Organizacional', value: 'organization' },
  { label: 'Por Negocio', value: 'business' },
  { label: 'Por Unidad', value: 'business_unit' }
]);

const getScopeColor = (scope) => {
  const colors = {
    organization: 'blue',
    business: 'green',
    business_unit: 'orange'
  };
  return colors[scope] || 'grey';
};

const getScopeLabel = (scope) => {
  return SCOPES[scope] || scope;
};

const getFrequencyLabel = (frequency) => {
  const freq = FREQUENCY.find((f) => f.value === frequency);
  return freq ? freq.label : frequency;
};

const formatDate = (dateString) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

onMounted(async () => {
  formId.value = route.params.id;

  if (formId.value) {
    fetchForm(formId.value);
    await loadUsers();
  } else {
    console.warn('No form ID found to load');
  }
});

const { form, loading, fetchForm } = showForm();

const editMode = ref(false);
const formData = ref({});

watch(form, (formData) => {
  if (formData) {
    formData.value = JSON.parse(JSON.stringify(formData));
  }
});

const loadUsers = async () => {
  try {
    const res = await axiosInstance.get('/users');
    users.value = res.data.data.map((user) => ({
      ...user,
      customLabel: `${user.name} - ${user.roles?.[0]?.name || 'Sin rol'}`
    }));
  } catch (err) {
    console.error('Error loading users:', err);
  }
};

const cancelEdit = () => {
  formData.value = JSON.parse(JSON.stringify(form.value));
  editMode.value = false;
};

const saveChanges = async () => {
  try {
    const formDataToSend = new FormData();
    formDataToSend.append('name', formData.value.name);
    formDataToSend.append('supervisor_role_id', formData.value.supervisor_role_id);

    if (formData.value.auditor_role_ids) {
      formData.value.auditor_role_ids.forEach((auditorId, index) => {
        formDataToSend.append(`auditor_role_ids[${index}]`, auditorId);
      });
    }

    if (formData.value.auditado_role_ids) {
      formData.value.auditado_role_ids.forEach((auditadoId, index) => {
        formDataToSend.append(`auditado_role_ids[${index}]`, auditadoId);
      });
    }

    formDataToSend.append('frequency', formData.value.frequency);
    formDataToSend.append('assignment_scope', formData.value.assignment_scope);
    formDataToSend.append('status', formData.value.status);

    if (formData.value.assignment_scope === 'organization') {
      formDataToSend.append('organization_id', auth.user?.organization_id);
    } else if (formData.value.assignment_scope === 'business') {
      formDataToSend.append('business_id', form.value.business_id);
    } else if (formData.value.assignment_scope === 'business_unit') {
      formDataToSend.append('business_unit_id', form.value.business_unit_id);
    }

    const response = await axiosInstance.put(`/forms/${formId.value}`, formDataToSend, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    form.value = response.data;
    formData.value = JSON.parse(JSON.stringify(response.data));
    editMode.value = false;
  } catch (err) {
    console.error('Error updating form:', err);
  }
};
</script>
