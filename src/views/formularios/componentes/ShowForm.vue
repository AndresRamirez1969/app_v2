<template>
  <v-card v-if="form" class="pa-6 rounded-lg elevation-3">
    <v-toolbar class="mb-4" density="compact" title="Detalles del Formulario">
      <template #prepend v-if="!isSponsor">
        <v-btn icon @click="goBack">
          <v-icon :icon="mdiArrowLeft" />
        </v-btn>
      </template>
      <template v-slot:append v-if="!isSponsor">
        <v-tooltip text="Editar" location="top">
          <template #activator="{ props }">
            <v-btn icon v-bind="props" @click="editMode ? saveChanges() : (editMode = true)">
              <v-icon :icon="editMode ? mdiCheck : mdiPencil" />
            </v-btn>
          </template>
        </v-tooltip>
        <v-btn icon v-if="editMode" @click="cancelEdit">
          <v-icon :icon="mdiCancel" />
        </v-btn>
        <v-tooltip text="Agregar nuevo campo" location="top">
          <template #activator="{ props }">
            <v-btn icon v-bind="props" @click="addField">
              <v-icon :icon="mdiPlus" />
            </v-btn>
          </template>
        </v-tooltip>
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
          <div>
            <v-chip :color="getScopeColor(form.assignment_scope)" size="small" class="mt-1" dark>
              {{ getScopeLabel(form.assignment_scope) }}
            </v-chip>
          </div>
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
            :items="filteredUsers"
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

    <v-divider class="my-6"></v-divider>

    <div class="mb-4">
      <h3 class="text-h6 mb-4">Campos del Formulario</h3>

      <div v-if="form.fields && form.fields.length > 0">
        <v-list>
          <v-list-item v-for="field in form.fields" :key="field.id" class="mb-2 border rounded">
            <template #prepend>
              <v-icon class="mr-2">mdi-form-textbox</v-icon>
            </template>

            <v-list-item-title class="font-weight-medium">
              {{ field.label }}
              <v-chip v-if="field.is_required" color="red" size="x-small" class="ml-1"> Requerido </v-chip>
            </v-list-item-title>

            <v-list-item-subtitle> Tipo: {{ field.type }} </v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </div>

      <div v-else class="text-center pa-4 text-grey">
        <v-icon size="large" class="mb-2">mdi-form-textbox</v-icon>
        <p>No hay campos agregados a este formulario</p>
        <v-btn color="primary" variant="outlined" @click="addField" class="mt-2">
          <v-icon class="mr-2">mdi-plus</v-icon>
          Agregar Campos
        </v-btn>
      </div>
    </div>
  </v-card>

  <!-- Mostrar loading mientras carga el formulario -->
  <div v-else-if="loading" class="text-center pa-4">
    <v-progress-circular indeterminate color="primary" />
    <p class="mt-4">Cargando formulario...</p>
  </div>

  <!-- Estado por defecto -->
  <div v-else class="text-center pa-4">
    <v-progress-circular indeterminate color="primary" />
  </div>
</template>

<script setup>
import { onMounted, ref, watch, computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { showForm } from '@/apiCalls/showForm';
import { FREQUENCY, SCOPES } from '@/constants/constants';
import { mdiPencil, mdiCancel, mdiCheck, mdiArrowLeft, mdiPlus } from '@mdi/js';
import { useRoute, useRouter } from 'vue-router';
import axiosInstance from '@/utils/axios';

const route = useRoute();
const router = useRouter();
const formId = ref('');
const auth = useAuthStore();
const users = ref([]);
const filteredUsers = ref([]);

// Agregar estado para manejar errores de permisos
const permissionError = ref(false);

const goBack = () => {
  router.push('/formularios');
};

const addField = () => {
  router.push({
    name: 'AddFieldsForm',
    params: { id: formId.value },
    state: { form: form.value }
  });
};

const isSponsor = computed(() => {
  return auth.user?.roles?.some((role) => role.name === 'sponsor');
});

const canView = computed(() => auth.user?.permissions?.includes('form.view'));

const { form, loading, error, fetchForm } = showForm();

// Función para manejar errores de permisos
const handlePermissionError = (error) => {
  if (error.response?.status === 403) {
    router.replace('/403');
  }
};

const getScopeColor = (scope) => {
  const colors = {
    organization: 'blue',
    business: 'green',
    business_unit: 'orange'
  };
  return colors[scope] || 'grey';
};

const getScopeLabel = (scope) => {
  if (!scope) return 'No definido';
  const scopeLabel = SCOPES.find((s) => s.value === scope);
  return scopeLabel ? scopeLabel.label : scope;
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
  try {
    if (!canView.value) {
      router.replace('/403');
      return;
    }

    formId.value = route.params.id;

    if (!formId.value) {
      console.warn('No form ID found to load');
      router.replace('/403');
      return;
    }

    await fetchForm(parseInt(formId.value));
    await loadUsers();
  } catch (err) {
    handlePermissionError(err);
  }
});

const editMode = ref(false);
const formData = ref({});

watch(form, async (newForm) => {
  if (newForm) {
    const supervisorUser = users.value.find((user) => user.roles?.some((role) => role.id === newForm.supervisor_role?.id));

    const auditorUsers = users.value.filter((user) =>
      user.roles?.some((role) => newForm.auditor_roles?.some((auditorRole) => auditorRole.id === role.id))
    );

    const auditadoUsers = users.value.filter((user) =>
      user.roles?.some((role) => newForm.auditado_roles?.some((auditadoRole) => auditadoRole.id === role.id))
    );

    formData.value = {
      name: newForm.name || '',
      frequency: newForm.frequency || '',
      supervisor_role_id: supervisorUser?.id || '',
      auditor_role_ids: auditorUsers.map((user) => user.id) || [],
      auditado_role_ids: auditadoUsers.map((user) => user.id) || [],
      assignment_scope: newForm.assignment_scope || '',
      status: newForm.status || 'draft'
    };

    await fetchUsersByScope();
  }
});

const loadUsers = async () => {
  try {
    const res = await axiosInstance.get('/users');
    users.value = res.data.data.map((user) => ({
      ...user,
      customLabel: `${user.roles?.[0]?.name || 'Sin rol'}`
    }));
  } catch (err) {
    console.error('Error loading users:', err);
  }
};

const fetchUsersByScope = async () => {
  try {
    const params = { scope: form.value.assignment_scope };
    if (form.value.assignment_scope === 'business' && form.value.business_id) {
      params.business_id = form.value.business_id;
    } else if (form.value.assignment_scope === 'business_unit' && form.value.business_unit_id) {
      params.business_unit_id = form.value.business_unit_id;
    } else if (form.value.assignment_scope === 'organization') {
      params.organization_id = auth.user?.organization_id;
    }
    const res = await axiosInstance.get('/users-by-scope', { params });
    filteredUsers.value = res.data.data.map((user) => ({
      ...user,
      customLabel: `${user.roles?.[0]?.name || 'Sin rol'}`
    }));
  } catch (err) {
    console.error('Error fetching users:', err);
    filteredUsers.value = [];
  }
};

const cancelEdit = () => {
  if (form.value) {
    formData.value = {
      name: form.value.name || '',
      frequency: form.value.frequency || '',
      supervisor_role_id: form.value.supervisor_role?.id || '',
      auditor_role_ids: form.value.auditor_roles?.map((role) => role.id) || [],
      auditado_role_ids: form.value.auditado_roles?.map((role) => role.id) || [],
      assignment_scope: form.value.assignment_scope || '',
      status: form.value.status || 'draft'
    };
  }
  editMode.value = false;
};

const saveChanges = async () => {
  try {
    const formDataToSend = new FormData();
    formDataToSend.append('name', formData.value.name);

    // Obtener el ID del rol del supervisor (como en CreateForm)
    const supervisorUser = users.value.find((user) => user.id === formData.value.supervisor_role_id);
    formDataToSend.append('supervisor_role_id', supervisorUser?.roles?.[0]?.id || '');

    // Obtener los IDs de roles de los auditores (como en CreateForm)
    if (formData.value.auditor_role_ids && formData.value.auditor_role_ids.length > 0) {
      formData.value.auditor_role_ids.forEach((auditorUserId, index) => {
        const auditorUser = filteredUsers.value.find((user) => user.id === auditorUserId);
        const roleId = auditorUser?.roles?.[0]?.id;
        if (roleId) {
          formDataToSend.append(`auditor_role_ids[${index}]`, roleId);
        }
      });
    }

    // Obtener los IDs de roles de los auditados (como en CreateForm)
    if (formData.value.auditado_role_ids && formData.value.auditado_role_ids.length > 0) {
      formData.value.auditado_role_ids.forEach((auditadoUserId, index) => {
        const auditadoUser = filteredUsers.value.find((user) => user.id === auditadoUserId);
        const roleId = auditadoUser?.roles?.[0]?.id;
        if (roleId) {
          formDataToSend.append(`auditado_role_ids[${index}]`, roleId);
        }
      });
    }

    formDataToSend.append('frequency', formData.value.frequency);
    formDataToSend.append('assignment_scope', formData.value.assignment_scope);
    formDataToSend.append('status', formData.value.status);

    // Agregar los IDs correspondientes según el scope
    if (formData.value.assignment_scope === 'organization') {
      formDataToSend.append('organization_id', auth.user?.organization_id);
    } else if (formData.value.assignment_scope === 'business') {
      formDataToSend.append('business_id', form.value.business_id);
      formDataToSend.append('organization_id', auth.user?.organization_id);
    } else if (formData.value.assignment_scope === 'business_unit') {
      formDataToSend.append('business_id', form.value.business_id);
      formDataToSend.append('business_unit_id', form.value.business_unit_id);
      formDataToSend.append('organization_id', auth.user?.organization_id);
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
