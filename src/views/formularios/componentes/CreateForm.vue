<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import axiosInstance from '@/utils/axios';
import { FREQUENCY } from '@/constants/constants';
import { useAuthStore } from '@/stores/auth';
import { mdiArrowLeft } from '@mdi/js';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { groupUsersByRole } from '@/utils/helpers/groupUsers';

const auth = useAuthStore();
const user = auth.user;
const toast = useToast();
const router = useRouter();
const goBack = () => {
  router.push('/formularios');
};

const Regform = ref('');
const name = ref('');
const supervisor = ref('');
const auditors = ref([]);
const audited = ref([]);
const frequency = ref('');
const businessUnitId = ref('');
const businessId = ref('');
const scope = ref('');
const businesses = ref([]);
const businessUnits = ref([]);
const groups = ref([]);
const groupId = ref('');
const logo = ref(null);

const sameLogo = ref(false);

const filteredUsers = ref([]);
const allUsers = ref([]);

const allRoles = computed(() => {
  return groupUsersByRole(allUsers.value);
});

const filteredRoles = computed(() => {
  return groupUsersByRole(filteredUsers.value);
});

const fetchAllUsers = async () => {
  try {
    const res = await axiosInstance.get('/users');
    allUsers.value = res.data.data.map((user) => ({
      ...user,
      customLabel: `${user.roles?.[0]?.name || 'Sin rol'}`
    }));
  } catch (err) {
    console.error('Error fetching users:', err);
    allUsers.value = [];
  }
};

const fetchUsersByScope = async () => {
  try {
    // Validar que tengamos los parámetros necesarios antes de hacer la llamada
    if (scope.value === 'business_unit_group' && !groupId.value) {
      console.log('Group scope selected but no group ID available yet');
      return;
    }

    if (scope.value === 'business' && !businessId.value) {
      console.log('Business scope selected but no business ID available yet');
      return;
    }

    if (scope.value === 'business_unit' && !businessUnitId.value) {
      console.log('Business unit scope selected but no business unit ID available yet');
      return;
    }

    const params = { scope: scope.value };

    if (scope.value === 'business' && businessId.value) {
      params.business_id = businessId.value;
    } else if (scope.value === 'business_unit' && businessUnitId.value) {
      params.business_unit_id = businessUnitId.value;
    } else if (scope.value === 'organization') {
      params.organization_id = auth.user?.organization_id;
    } else if (scope.value === 'business_unit_group' && groupId.value) {
      params.business_unit_group_id = groupId.value;
    }

    console.log('Fetching users with params:', params); // Debug

    const res = await axiosInstance.get('/users-by-scope', { params });
    console.log('Users response:', res.data); // Debug

    filteredUsers.value = res.data.data.map((user) => ({
      ...user,
      customLabel: `${user.roles?.[0]?.name || 'Sin rol'}`
    }));

    console.log('Filtered users:', filteredUsers.value); // Debug

    // Si es grupo, asignar automáticamente todos los roles disponibles
    if (scope.value === 'business_unit_group' && groupId.value) {
      // Obtener todos los roles únicos de los usuarios filtrados
      const allRoles = new Set();
      filteredUsers.value.forEach((user) => {
        if (user.roles && user.roles.length > 0) {
          user.roles.forEach((role) => {
            allRoles.add(role.id);
          });
        }
      });

      console.log('All roles found:', Array.from(allRoles)); // Debug

      // Asignar automáticamente todos los roles como auditados
      audited.value = Array.from(allRoles);

      console.log('Audited roles assigned:', audited.value); // Debug
    }
  } catch (err) {
    console.error('Error fetching users:', err);
    filteredUsers.value = [];
  }
};

// Modificar el watcher para que funcione correctamente
watch([scope, businessId, businessUnitId, groupId], async () => {
  if (scope.value) {
    // Limpiar selecciones solo si no es grupo
    if (scope.value !== 'business_unit_group') {
      audited.value = [];
    }
    auditors.value = [];

    // Ejecutar fetchUsersByScope
    await fetchUsersByScope();
  }
});

// Eliminar el watcher anterior que estaba causando conflictos
// watch([scope, businessId, businessUnitId], () => {
//   if (scope.value) {
//     fetchUsersByScope();
//   }
//   auditors.value = [];
//   audited.value = [];
// });

// Watcher específico para cuando se selecciona un grupo
watch(groupId, async (newGroupId) => {
  if (scope.value === 'business_unit_group' && newGroupId) {
    console.log('Group ID changed, fetching users for group:', newGroupId);
    await fetchUsersByScope();
  }
});

onMounted(async () => {
  try {
    await fetchAllUsers();
    const resBusiness = await axiosInstance.get('/businesses');
    businesses.value = resBusiness.data.data.map((business) => ({
      ...business,
      customLabel: `${business.legal_name}`
    }));

    const resBusinessUnit = await axiosInstance.get('/business-units');
    businessUnits.value = resBusinessUnit.data.data.map((businessUnit) => ({
      ...businessUnit,
      customLabel: `${businessUnit.legal_name}`
    }));
    const resGroup = await axiosInstance.get('/business-unit-groups');
    groups.value = resGroup.data.data.map((group) => ({
      ...group,
      customLabel: `${group.name}`
    }));
  } catch (err) {
    console.log(err);
  }
});

const validate = async () => {
  try {
    const formData = new FormData();
    formData.append('name', name.value);

    // Obtener el ID del rol del supervisor
    const supervisorRole = allRoles.value.find((role) => role.id === supervisor.value);
    if (supervisorRole) {
      formData.append('supervisor_role_id', supervisorRole.id);
    }

    // Obtener los IDs de roles de los auditores
    auditors.value.forEach((roleId, index) => {
      formData.append(`auditor_role_ids[${index}]`, roleId);
    });

    // Obtener los IDs de roles de los auditados
    audited.value.forEach((roleId, index) => {
      formData.append(`auditado_role_ids[${index}]`, roleId);
    });

    formData.append('frequency', frequency.value);
    formData.append('assignment_scope', scope.value);
    if (logo.value && !sameLogo.value) {
      formData.append('logo', logo.value);
    }
    if (sameLogo.value) {
      formData.append('logo', user?.organization?.logo);
    }

    if (scope.value === 'organization') {
      formData.append('organization_id', user?.organization_id);
    } else if (scope.value === 'business') {
      formData.append('business_id', businessId.value);
      formData.append('organization_id', user?.organization_id);
    } else if (scope.value === 'business_unit') {
      formData.append('business_id', businessId.value);
      formData.append('business_unit_id', businessUnitId.value);
      formData.append('organization_id', user?.organization_id);
    } else if (scope.value === 'business_unit_group') {
      formData.append('business_unit_group_id', groupId.value);
      formData.append('organization_id', user?.organization_id);
      formData.append('business_id', businessId.value);
    }

    const res = await axiosInstance.post('/forms', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    console.log('Formulario creado', res);
    toast.success('Formulario creado correctamente');

    const newForm = res.data.form;
    if (newForm && newForm.id) {
      router.push({
        name: 'AddFieldsForm',
        params: { id: newForm.id },
        state: { form: newForm }
      });
    }
  } catch (err) {
    console.log('Failed to save form', err);
    toast.error('Error al crear el formulario');
  }
};
</script>

<template>
  <v-card>
    <v-toolbar class="mb-4" density="compact" title="Creacion de Formulario">
      <template #prepend v-if="!isSponsor">
        <v-btn icon @click="goBack">
          <v-icon :icon="mdiArrowLeft" />
        </v-btn>
      </template>
    </v-toolbar>
    <v-row>
      <v-col cols="12" md="12">
        <v-form ref="Regform" lazy-validation action="/dashboards/analytical" class="container mt-5">
          <v-row class="my-0">
            <v-col cols="12" sm="6" class="py-0">
              <div class="mb-6">
                <v-label>Nombre del Formulario</v-label>
                <v-text-field v-model="name" required variant="outlined" class="mt-2" color="primary"></v-text-field>
              </div>
            </v-col>
            <v-col cols="12" sm="6" class="py-0">
              <div class="mb-6">
                <v-label>Logo</v-label>
                <v-file-input
                  v-if="!sameLogo"
                  v-model="logo"
                  label="Logo"
                  :multiple="false"
                  variant="outlined"
                  color="primary"
                  class="mt-2"
                  accept="image/*"
                >
                </v-file-input>
                <!-- Ahorita no jala! Implementar en el futuro -->
                <v-switch v-model="sameLogo" label="Mismo que Organizacion" color="primary" class="mt-2" />
              </div>
            </v-col>
            <v-col cols="12" sm="6" class="py-0">
              <div class="mb-6">
                <v-label>Supervisor</v-label>
                <v-select
                  v-model="supervisor"
                  :items="allRoles"
                  item-title="customLabel"
                  item-value="id"
                  variant="outlined"
                  color="primary"
                  class="mt-2"
                  label="Selecciona al Supervisor"
                />
              </div>
            </v-col>
          </v-row>

          <v-row class="my-0">
            <v-col cols="12" sm="6" class="py-0 d-flex flex-column justify-center">
              <v-label class="mb2">Alcance</v-label>
              <v-radio-group v-model="scope" inline>
                <v-radio label="Organizacional" value="organization" />
                <v-radio label="Por Negocio" value="business" />
                <v-radio label="Por Unidad" value="business_unit" />
                <v-radio label="Asignar a Grupo" value="business_unit_group" />
              </v-radio-group>
            </v-col>
          </v-row>

          <!-- Select de Negocio (solo cuando scope es 'business' o 'business_unit') -->
          <v-row v-if="scope === 'business' || scope === 'business_unit'" class="my-0">
            <v-col cols="12" sm="6" class="py-0">
              <div class="mb-6">
                <v-label>Negocio</v-label>
                <v-select
                  v-model="businessId"
                  :items="businesses"
                  item-title="customLabel"
                  item-value="id"
                  variant="outlined"
                  color="primary"
                  class="mt-2"
                  label="Selecciona el Negocio"
                  required
                />
              </div>
            </v-col>
          </v-row>

          <!-- Select de Unidad de Negocio (solo cuando scope es 'business_unit') -->
          <v-row v-if="scope === 'business_unit'" class="my-0">
            <v-col cols="12" sm="6" class="py-0">
              <div class="mb-6">
                <v-label>Unidad de Negocio</v-label>
                <v-select
                  v-model="businessUnitId"
                  :items="businessUnits"
                  item-title="customLabel"
                  item-value="id"
                  variant="outlined"
                  color="primary"
                  class="mt-2"
                  label="Selecciona la Unidad de Negocio"
                  required
                />
              </div>
            </v-col>
          </v-row>

          <!-- Select de Grupo (solo cuando scope es 'business_unit_group') -->
          <v-row v-if="scope === 'business_unit_group'" class="my-0">
            <v-col cols="12" sm="6" class="py-0">
              <div class="mb-6">
                <v-label>Grupo</v-label>
                <v-select
                  v-model="groupId"
                  :items="groups"
                  item-title="customLabel"
                  item-value="id"
                  variant="outlined"
                  color="primary"
                  class="mt-2"
                  label="Selecciona el Grupo"
                  required
                />
                <v-alert type="info" variant="tonal" class="mt-2" density="compact">
                  <strong>Asignación automática:</strong> Al seleccionar un grupo, se asignarán automáticamente TODOS los roles de las
                  unidades de negocio que pertenecen a este grupo como auditados.
                </v-alert>
              </div>
            </v-col>
          </v-row>
          <div class="mb-6">
            <v-label>Auditores</v-label>
            <v-select
              v-model="auditors"
              :items="filteredRoles"
              multiple
              item-title="customLabel"
              item-value="id"
              variant="outlined"
              color="primary"
              class="mt-2"
              label="Selecciona a los Auditores"
              :hint="`${filteredRoles.length} roles disponibles`"
              persistent-hint
            />
          </div>
          <div class="mb-6">
            <v-label>Auditados</v-label>
            <v-select
              v-model="audited"
              multiple
              :items="filteredRoles"
              item-title="customLabel"
              item-value="id"
              variant="outlined"
              color="primary"
              class="mt-2"
              label="Selecciona a los Auditados"
              :hint="scope === 'business_unit_group' ? 'Selección automática para grupos' : `${filteredRoles.length} roles disponibles`"
              persistent-hint
              :disabled="scope === 'business_unit_group'"
              :readonly="scope === 'business_unit_group'"
            />
            <v-alert
              v-if="scope === 'business_unit_group' && audited.length > 0"
              type="success"
              variant="tonal"
              class="mt-2"
              density="compact"
            >
              Se han asignado automáticamente {{ audited.length }} roles de las unidades del grupo seleccionado.
            </v-alert>
          </div>
          <div class="mb-6">
            <v-label>Frecuencia</v-label>
            <v-select
              v-model="frequency"
              :items="FREQUENCY"
              item-title="label"
              item-value="value"
              variant="outlined"
              color="primary"
              class="mt-2"
              label="Selecciona la frecuencia del formulario"
            />
          </div>
          <div class="d-sm-inline-flex align-center mt-2 mb-7 mb-sm-0 font-weight-bold"></div>
          <v-btn color="primary" block class="mt-4" variant="flat" size="large" @click="validate()">Crear Formulario</v-btn>
        </v-form>
      </v-col>
    </v-row>
  </v-card>
</template>
