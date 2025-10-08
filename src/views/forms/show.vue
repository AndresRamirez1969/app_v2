<template>
  <v-container fluid v-if="showForm && canShow">
    <v-row class="align-center mb-6" no-gutters>
      <v-col cols="auto" class="d-flex align-center">
        <template v-if="canShowArrow">
          <v-btn
            icon
            variant="text"
            class="px-3 py-2"
            style="border-radius: 8px; border: 1px solid #ccc; min-width: 44px; height: 44px"
            @click="goToIndex"
          >
            <v-icon :icon="mdiArrowLeft" />
          </v-btn>
        </template>
        <h3 class="font-weight-medium ml-3 mb-0 d-none d-md-block" v-if="formData">
          {{ formData.id ? `${formData.folio || formData.id} - ${formData.name || 'Formulario'}` : formData.name || 'Formulario' }}
        </h3>
        <h3 class="font-weight-medium ml-3 mb-0 d-block d-md-none" v-if="formData">
          {{ formData.folio || formData.id }}
        </h3>
      </v-col>
      <v-col class="d-flex justify-end align-center">
        <template v-if="canEdit">
          <v-menu location="bottom end" v-if="!mdAndDown">
            <template #activator="{ props }">
              <v-btn
                v-bind="props"
                variant="text"
                class="px-3 py-2"
                style="border-radius: 8px; border: 1px solid #ccc; min-width: 44px; height: 44px"
              >
                Opciones
                <v-icon :icon="mdiChevronDown" end size="18" />
              </v-btn>
            </template>
            <v-list class="custom-dropdown elevation-1 rounded-lg" style="min-width: 200px">
              <!-- Editar SOLO si está en draft -->
              <template v-if="formData?.status === 'draft'">
                <v-list-item @click="goToEdit">
                  <template #prepend>
                    <v-icon :icon="mdiPencil" size="18" />
                  </template>
                  <v-list-item-title>Editar</v-list-item-title>
                </v-list-item>
                <v-divider />
              </template>
              <v-list-item v-if="formData?.status !== 'archived'" @click="changeFormStatus('archived')">
                <template #prepend>
                  <v-icon :icon="mdiArchive" size="18" />
                </template>
                <v-list-item-title>Archivar</v-list-item-title>
              </v-list-item>
              <v-divider v-if="formData?.status !== 'archived' && (formData?.status !== 'active' || formData?.status !== 'draft')" />
              <v-list-item v-if="formData?.status !== 'active'" @click="changeFormStatus('active')">
                <template #prepend>
                  <v-icon :icon="mdiPublish" size="18" />
                </template>
                <v-list-item-title>Publicar</v-list-item-title>
              </v-list-item>
              <v-divider v-if="formData?.status !== 'active' && formData?.status !== 'draft'" />
              <v-list-item v-if="formData?.status !== 'draft'" @click="changeFormStatus('draft')">
                <template #prepend>
                  <v-icon :icon="mdiPencil" size="18" />
                </template>
                <v-list-item-title>Borrador</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
          <v-menu location="bottom end" v-else>
            <template #activator="{ props }">
              <v-btn
                v-bind="props"
                icon
                variant="text"
                class="pa-0"
                min-width="0"
                height="44"
                style="border-radius: 8px; border: 1px solid #ccc; min-width: 44px"
              >
                <v-icon :icon="mdiDotsHorizontal" size="24" />
              </v-btn>
            </template>
            <v-list class="custom-dropdown elevation-1 rounded-lg" style="min-width: 180px">
              <!-- Editar SOLO si está en draft -->
              <template v-if="formData?.status === 'draft'">
                <v-list-item @click="goToEdit">
                  <template #prepend>
                    <v-icon :icon="mdiPencil" size="18" />
                  </template>
                  <v-list-item-title>Editar</v-list-item-title>
                </v-list-item>
                <v-divider />
              </template>
              <v-list-item v-if="formData?.status !== 'archived'" @click="changeFormStatus('archived')">
                <template #prepend>
                  <v-icon :icon="mdiArchive" size="18" />
                </template>
                <v-list-item-title>Archivar</v-list-item-title>
              </v-list-item>
              <v-divider v-if="formData?.status !== 'archived' && (formData?.status !== 'active' || formData?.status !== 'draft')" />
              <v-list-item v-if="formData?.status !== 'active'" @click="changeFormStatus('active')">
                <template #prepend>
                  <v-icon :icon="mdiPublish" size="18" />
                </template>
                <v-list-item-title>Publicar</v-list-item-title>
              </v-list-item>
              <v-divider v-if="formData?.status !== 'active' && formData?.status !== 'draft'" />
              <v-list-item v-if="formData?.status !== 'draft'" @click="changeFormStatus('draft')">
                <template #prepend>
                  <v-icon :icon="mdiPencil" size="18" />
                </template>
                <v-list-item-title>Borrador</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </template>
      </v-col>
    </v-row>

    <!-- Información general -->
    <v-row>
      <v-col cols="12" md="4" class="d-flex justify-center align-center">
        <template v-if="formData?.logo">
          <v-img :src="formData.logo" max-width="320" max-height="320" class="rounded-lg logo-avatar" alt="Logo" style="background: none" />
        </template>
        <template v-else>
          <div
            class="d-flex align-center justify-center logo-avatar"
            style="width: 320px; height: 320px; background-color: #f5f5f5; border-radius: 12px"
          >
            <span class="text-medium-emphasis">Sin logo</span>
          </div>
        </template>
      </v-col>

      <v-col cols="12" md="8">
        <v-card-title class="font-weight-bold text-h6 pb-2" style="padding-left: 0.5rem">Información general</v-card-title>
        <v-table class="rounded-lg elevation-1 card-shadow">
          <tbody>
            <tr>
              <td class="font-weight-bold text-subtitle-1" style="width: 1%; white-space: nowrap">Estado</td>
              <td>
                <template v-if="formData?.status">
                  <StatusChip :status="formData.status" />
                </template>
                <template v-else> No disponible </template>
              </td>
            </tr>
            <tr>
              <td class="font-weight-bold text-subtitle-1" style="width: 1%; white-space: nowrap">Folio</td>
              <td>
                <span v-if="formData?.folio">{{ formData.folio }}</span>
                <span v-else>No disponible</span>
              </td>
            </tr>
            <tr>
              <td class="font-weight-bold text-subtitle-1" style="width: 1%; white-space: nowrap">Nombre</td>
              <td>{{ formData?.name || 'No disponible' }}</td>
            </tr>
            <tr>
              <td class="font-weight-bold text-subtitle-1" style="width: 1%; white-space: nowrap">Descripción</td>
              <td>{{ formData?.description || 'No disponible' }}</td>
            </tr>
            <tr>
              <td class="font-weight-bold text-subtitle-1" style="width: 1%; white-space: nowrap">Alcance</td>
              <td>
                <template v-if="formData?.assignment_scope === 'organization' && formData?.organization">
                  <a :href="`/organizaciones/${formData.organization.id}`" style="color: #1976d2; text-decoration: underline">
                    {{ formData.organization.folio }} - {{ formData.organization.legal_name || formData.organization.name }}
                  </a>
                </template>
                <template v-else-if="formData?.assignment_scope === 'business' && formData?.business">
                  <a :href="`/negocios/${formData.business.id}`" style="color: #1976d2; text-decoration: underline">
                    {{ formData.business.folio }} - {{ formData.business.name }}
                  </a>
                </template>
                <template v-else-if="formData?.assignment_scope === 'business_unit' && formData?.business_unit">
                  <a :href="`/ubicaciones/${formData.business_unit.id}`" style="color: #1976d2; text-decoration: underline">
                    {{ formData.business_unit.folio }} - {{ formData.business_unit.name }}
                  </a>
                </template>
                <template v-else-if="formData?.assignment_scope === 'business_unit_group' && formData?.business_unit_group">
                  <a :href="`/grupos/${formData.business_unit_group.id}`" style="color: #1976d2; text-decoration: underline">
                    {{ formData.business_unit_group.id }} - {{ formData.business_unit_group.name }}
                  </a>
                </template>
                <template v-else>
                  {{ formatScope(formData?.assignment_scope) }}
                </template>
              </td>
            </tr>
            <tr>
              <td class="font-weight-bold text-subtitle-1" style="width: 1%; white-space: nowrap">Frecuencia</td>
              <td>{{ formatFrequency(formData?.frequency) }}</td>
            </tr>
            <tr>
              <td class="font-weight-bold text-subtitle-1" style="width: 1%; white-space: nowrap">¿Tiene rating?</td>
              <td>{{ formData?.has_rating ? 'Sí' : 'No' }}</td>
            </tr>
            <tr>
              <td class="font-weight-bold text-subtitle-1" style="width: 1%; white-space: nowrap">Creado por</td>
              <td>
                <span v-if="formData?.created_by">{{ formData.created_by.name || formData.created_by.email }}</span>
                <span v-else>No disponible</span>
              </td>
            </tr>
            <tr>
              <td class="font-weight-bold text-subtitle-1" style="width: 1%; white-space: nowrap">Fecha de creación</td>
              <td>{{ formatDate(formData?.created_at) }}</td>
            </tr>
            <tr>
              <td class="font-weight-bold text-subtitle-1" style="width: 1%; white-space: nowrap">Última actualización</td>
              <td>{{ formatDate(formData?.updated_at) }}</td>
            </tr>
            <tr>
              <td class="font-weight-bold text-subtitle-1" style="width: 1%; white-space: nowrap">Respuestas</td>
              <td>{{ formData?.responses_count ?? 0 }}</td>
            </tr>
          </tbody>
        </v-table>
      </v-col>
    </v-row>

    <div style="height: 30px"></div>

    <!-- Asignaciones -->
    <v-row>
      <v-col cols="12">
        <div class="font-weight-bold text-h6 mb-2 pertenece-title d-flex align-center" style="padding-left: 0.5rem">
          <span>Asignaciones</span>
          <v-spacer />
        </div>
        <template v-if="!mdAndDown">
          <v-table class="rounded-lg elevation-1 card-shadow">
            <thead>
              <tr>
                <th class="font-weight-bold text-subtitle-1">Tipo</th>
                <th class="font-weight-bold text-subtitle-1">Roles</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Supervisor</td>
                <td>
                  <template v-if="formData?.supervisorRole">
                    <v-chip color="grey lighten-2" class="ma-1" size="small">
                      {{ mapRoleName(formData.supervisorRole.name) }}
                    </v-chip>
                  </template>
                  <template v-else>
                    <v-chip color="grey lighten-2" class="ma-1" size="small"> No disponible </v-chip>
                  </template>
                </td>
              </tr>
              <tr>
                <td>Auditor</td>
                <td>
                  <template v-if="formData?.auditorRoles && formData.auditorRoles.length">
                    <v-chip v-for="role in formData.auditorRoles" :key="role.id" color="grey lighten-2" class="ma-1" size="small">
                      {{ mapRoleName(role.name) }}
                    </v-chip>
                  </template>
                  <template v-else>
                    <v-chip color="grey lighten-2" class="ma-1" size="small"> No disponible </v-chip>
                  </template>
                </td>
              </tr>
              <tr>
                <td>Auditados</td>
                <td>
                  <template v-if="formData?.auditadoRoles && formData.auditadoRoles.length">
                    <v-chip v-for="role in formData.auditadoRoles" :key="role.id" color="grey lighten-2" class="ma-1" size="small">
                      {{ mapRoleName(role.name) }}
                    </v-chip>
                  </template>
                  <template v-else>
                    <v-chip color="grey lighten-2" class="ma-1" size="small"> No disponible </v-chip>
                  </template>
                </td>
              </tr>
            </tbody>
          </v-table>
        </template>
        <template v-else>
          <v-row dense>
            <v-col cols="12" class="mb-2">
              <v-card class="rounded-lg card-shadow pa-3" elevation="1">
                <div class="font-weight-bold text-subtitle-1 mb-2">Supervisor</div>
                <div>
                  <template v-if="formData?.supervisorRole">
                    <v-chip color="grey lighten-2" class="ma-1" size="small">
                      {{ mapRoleName(formData.supervisorRole.name) }}
                    </v-chip>
                  </template>
                  <template v-else>
                    <v-chip color="grey lighten-2" class="ma-1" size="small"> No disponible </v-chip>
                  </template>
                </div>
              </v-card>
            </v-col>
            <v-col cols="12" class="mb-2">
              <v-card class="rounded-lg card-shadow pa-3" elevation="1">
                <div class="font-weight-bold text-subtitle-1 mb-2">Auditor</div>
                <div>
                  <template v-if="formData?.auditorRoles && formData.auditorRoles.length">
                    <v-chip v-for="role in formData.auditorRoles" :key="role.id" color="grey lighten-2" class="ma-1" size="small">
                      {{ mapRoleName(role.name) }}
                    </v-chip>
                  </template>
                  <template v-else>
                    <v-chip color="grey lighten-2" class="ma-1" size="small"> No disponible </v-chip>
                  </template>
                </div>
              </v-card>
            </v-col>
            <v-col cols="12">
              <v-card class="rounded-lg card-shadow pa-3" elevation="1">
                <div class="font-weight-bold text-subtitle-1 mb-2">Auditados</div>
                <div>
                  <template v-if="formData?.auditadoRoles && formData.auditadoRoles.length">
                    <v-chip v-for="role in formData.auditadoRoles" :key="role.id" color="grey lighten-2" class="ma-1" size="small">
                      {{ mapRoleName(role.name) }}
                    </v-chip>
                  </template>
                  <template v-else>
                    <v-chip color="grey lighten-2" class="ma-1" size="small"> No disponible </v-chip>
                  </template>
                </div>
              </v-card>
            </v-col>
          </v-row>
        </template>
      </v-col>
    </v-row>

    <!-- Campos del Formulario -->
    <div class="mb-4 mt-8">
      <div class="position-relative">
        <v-row class="align-center mb-2 pertenece-title" style="padding-left: 0.5rem">
          <v-col class="py-0 d-flex align-center" cols="auto">
            <span class="font-weight-bold text-h6">Campos</span>
          </v-col>
          <v-spacer />
          <!-- Botón agregar campos solo si está en draft y sin respuestas -->
          <template v-if="formData?.status === 'draft' && (!formData?.responses_count || formData.responses_count === 0)">
            <v-col class="py-0 d-none d-md-flex justify-end align-center" cols="auto">
              <v-btn
                variant="text"
                color="grey"
                style="border-radius: 8px; border: 1px solid #ccc; min-width: 44px; height: 36px"
                class="px-3 py-2"
                @click="goToAddFields"
              >
                <v-icon :icon="mdiPlus" start size="18" />
                agregar campos
              </v-btn>
            </v-col>
            <v-col class="py-0 d-flex d-md-none justify-end align-center" cols="auto">
              <v-btn
                variant="text"
                color="grey"
                style="border-radius: 8px; border: 1px solid #ccc; min-width: 44px; height: 36px"
                class="px-3 py-2"
                @click="goToAddFields"
              >
                <v-icon :icon="mdiPlus" start size="18" />
                Agregar
              </v-btn>
            </v-col>
          </template>
        </v-row>
        <div v-if="formData?.fields && formData.fields.length > 0">
          <!-- Tabla en desktop, cards en móvil -->
          <template v-if="!mdAndDown">
            <div>
              <v-table class="rounded-lg elevation-1 card-shadow" style="margin-top: 16px">
                <thead>
                  <tr>
                    <th class="font-weight-bold text-subtitle-1">Tipo</th>
                    <th class="font-weight-bold text-subtitle-1">Nombre</th>
                    <th class="font-weight-bold text-subtitle-1">Descripción</th>
                    <th class="font-weight-bold text-subtitle-1">¿Requerido?</th>
                    <th v-if="formData?.has_rating" class="font-weight-bold text-subtitle-1">Puntuaje</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="field in formData.fields" :key="field.id">
                    <td>
                      <div class="d-flex align-center">
                        <v-icon :icon="getFieldIcon(field.type)" color="grey" class="mr-2" />
                        <span>{{ getFieldLabel(field.type) }}</span>
                      </div>
                    </td>
                    <td>{{ field.label }}</td>
                    <td>
                      <template v-if="field.description">
                        <div v-for="(line, idx) in splitDescription(field.description)" :key="idx">{{ line }}</div>
                      </template>
                      <template v-else>-</template>
                    </td>
                    <td>
                      <v-chip v-if="field.is_required" color="red" size="x-small">Requerido</v-chip>
                      <span v-else>No</span>
                    </td>
                    <td v-if="formData?.has_rating">
                      <span v-if="isValidWeight(field.weight)">{{ formatWeight(field.weight) }}</span>
                      <span v-else>No asignado</span>
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </div>
          </template>
          <template v-else>
            <v-row dense style="margin-top: 16px">
              <v-col v-for="field in formData.fields" :key="field.id" cols="12" class="position-relative">
                <v-card class="rounded-lg card-shadow pa-3 mb-2" elevation="1">
                  <div class="d-flex align-center mb-2">
                    <v-icon :icon="getFieldIcon(field.type)" color="black" class="mr-2" style="cursor: default" />
                    <span class="font-weight-medium">{{ field.label }}</span>
                    <v-chip v-if="field.is_required" color="red" size="x-small" class="ml-2">Requerido</v-chip>
                  </div>
                  <div class="text-body-2 text-medium-emphasis">Tipo: {{ getFieldLabel(field.type) }}</div>
                  <div class="text-body-2 text-medium-emphasis">
                    Descripción:
                    <template v-if="field.description">
                      <div v-for="(line, idx) in splitDescription(field.description)" :key="idx">{{ line }}</div>
                    </template>
                    <template v-else>-</template>
                  </div>
                  <div v-if="formData?.has_rating" class="text-body-2 text-medium-emphasis">
                    Puntuaje:
                    <span v-if="isValidWeight(field.weight)">{{ formatWeight(field.weight) }}</span>
                    <span v-else>No asignado</span>
                  </div>
                </v-card>
              </v-col>
            </v-row>
          </template>
        </div>
        <div v-else>
          <template v-if="!mdAndDown">
            <v-table class="rounded-lg elevation-1 card-shadow" style="margin-top: 16px">
              <thead>
                <tr>
                  <th class="font-weight-bold text-subtitle-1">Tipo</th>
                  <th class="font-weight-bold text-subtitle-1">Nombre</th>
                  <th class="font-weight-bold text-subtitle-1">Descripción</th>
                  <th class="font-weight-bold text-subtitle-1">¿Requerido?</th>
                  <th v-if="formData?.has_rating" class="font-weight-bold text-subtitle-1">Puntuaje</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colspan="5" class="text-center text-grey">No hay campos agregados a este formulario</td>
                </tr>
              </tbody>
            </v-table>
          </template>
          <template v-else>
            <v-row dense style="margin-top: 16px">
              <v-col cols="12">
                <v-card class="rounded-lg card-shadow pa-3 mb-2 text-center text-grey" elevation="1">
                  No hay campos agregados a este formulario
                </v-card>
              </v-col>
            </v-row>
          </template>
        </div>
      </div>
    </div>
    <AddFieldsFormModal v-model="showAddFieldsModal" :form="formData" @fields-saved="handleFieldsAdded" />
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import axiosInstance from '@/utils/axios';
import {
  mdiArrowLeft,
  mdiPencil,
  mdiChevronDown,
  mdiDotsHorizontal,
  mdiPlus,
  mdiFormTextbox,
  mdiEye,
  mdiPublish,
  mdiArchive
} from '@mdi/js';
import StatusChip from '@/components/status/StatusChip.vue';
import { useAuthStore } from '@/stores/auth';
import AddFieldsFormModal from './AddFieldsFormModal.vue';
import { AVAILABLE_FIELDS, FIELD_COLOR } from '@/constants/fieldTypes';

const router = useRouter();
const route = useRoute();
const { mdAndDown } = useDisplay();
const formData = ref(null);
const auth = useAuthStore();

const showAddFieldsModal = ref(false);
const showForm = ref(true);

const user = computed(() => auth.user || { roles: [], permissions: [], organization_id: null });
const roles = computed(() => user.value.roles || []);
const permissions = computed(() => user.value.permissions || []);
const userOrganizationId = computed(() => user.value.organization_id);

const isSuperadmin = computed(() => roles.value.includes('superadmin'));
const isAdmin = computed(() => roles.value.includes('admin'));
const isSponsor = computed(() => roles.value.includes('sponsor'));

const canView = computed(() => permissions.value.includes('form.view'));
const canEditPermission = computed(() => permissions.value.includes('form.update'));
const canViewAny = computed(() => permissions.value.includes('form.viewAny'));

const canShow = computed(() => {
  if (isSuperadmin.value) return true;
  if (isAdmin.value && user.value.organization_id === formData.value?.organization_id) return true;
  if (isSponsor.value) {
    const sponsorEmpresaId = user.value.business_id;
    return (
      formData.value?.business_id === sponsorEmpresaId ||
      (formData.value?.business_unit && formData.value.business_unit.business_id === sponsorEmpresaId) ||
      (formData.value?.business_unit_group && formData.value.business_unit_group.business_id === sponsorEmpresaId)
    );
  }
  return canView.value;
});

const canEdit = computed(() => isSuperadmin.value || isAdmin.value || canEditPermission.value);

const canShowArrow = computed(() => canViewAny.value || isSuperadmin.value || isAdmin.value || isSponsor.value);

const isActive = computed(() => formData.value?.status === 'active' || formData.value?.status === 'activo');

const goToEdit = () => {
  if (formData.value?.id) {
    router.push({ path: `/formularios/editar/${formData.value.id}` });
  }
};

const goToShow = () => {
  if (formData.value?.id) {
    router.push({ path: `/formularios/${formData.value.id}` });
  }
};

const goToIndex = () => {
  router.push('/formularios');
};

// INTEGRACIÓN: Refresca el formulario antes de abrir el modal de campos
const goToAddFields = async () => {
  try {
    const res = await axiosInstance.get(`/forms/${formData.value.id}`);
    formData.value = res.data.data || res.data.form || res.data;
  } catch (err) {
    // Maneja el error si lo deseas
  }
  showAddFieldsModal.value = true;
};

const displayName = computed(() => {
  if (!formData.value) return '';
  const name = formData.value.name || formData.value.folio || 'Formulario';
  if (mdAndDown.value && name.length > 13) {
    return name.slice(0, 13) + '...';
  }
  return name;
});

const formatDate = (date) => {
  if (!date) return 'No disponible';
  return new Date(date).toLocaleString();
};

const truncate = (text, max = 50) => (!text ? '' : text.length > max ? text.slice(0, max) + '...' : text);

const formatScope = (scope) => {
  switch (scope) {
    case 'organization':
      return 'Organización';
    case 'business':
      return 'Empresa';
    case 'business_unit':
      return 'Ubicación';
    case 'business_unit_group':
      return 'Grupo';
    default:
      return scope;
  }
};

const formatFrequency = (freq) => {
  switch (freq) {
    case 'once_per_day':
      return 'Una vez por día';
    case 'multiple_per_day':
      return 'Múltiples veces por día';
    default:
      return freq;
  }
};

function mapRoleName(name) {
  if (!name) return '';
  if (name === 'superadmin') return 'Super Administrador';
  if (name === 'admin') return 'Administrador';
  if (name === 'sponsor') return 'Sponsor';
  return name;
}

const handleFieldsAdded = async () => {
  try {
    const res = await axiosInstance.get(`/forms/${formData.value.id}`);
    formData.value = res.data.data || res.data.form || res.data;
  } catch (err) {}
};

const getFieldLabel = (type) => {
  const found = AVAILABLE_FIELDS.find((f) => f.value === type);
  return found ? found.label : type;
};

const getFieldIcon = (type) => {
  const found = AVAILABLE_FIELDS.find((f) => f.value === type);
  return found ? found.icon : mdiFormTextbox;
};

const getFieldColor = (type) => {
  return FIELD_COLOR(type);
};

// Validar si el weight es válido (no null, no undefined, no string vacío)
const isValidWeight = (weight) => {
  if (weight === null || weight === undefined) return false;
  if (typeof weight === 'string' && weight.trim() === '') return false;
  // Si es string numérico, también es válido
  if (!isNaN(Number(weight))) return true;
  return typeof weight === 'number';
};

// Formatear el weight para mostrarlo como número (sin decimales si es entero, con 2 si es decimal)
const formatWeight = (weight) => {
  if (typeof weight === 'string') {
    const num = Number(weight);
    if (Number.isInteger(num)) return num;
    return num.toFixed(2);
  }
  if (typeof weight === 'number') {
    if (Number.isInteger(weight)) return weight;
    return weight.toFixed(2);
  }
  return weight;
};

// Divide la descripción en líneas de máximo 40 caracteres
function splitDescription(desc, max = 40) {
  if (!desc) return ['-'];
  const lines = [];
  let i = 0;
  while (i < desc.length) {
    lines.push(desc.slice(i, i + max));
    i += max;
  }
  return lines;
}

const changeFormStatus = async (targetStatus) => {
  if (!formData.value) return;
  if (formData.value.status === 'draft' && targetStatus === 'active' && formData.value.fields && formData.value.fields.length === 0) {
    alert('No se puede publicar un formulario sin campos');
    return;
  }
  try {
    const res = await axiosInstance.put(`/forms/${formData.value.id}/status`, { status: targetStatus });
    formData.value.status = targetStatus;
    if (res.data && res.data.form) {
      formData.value.supervisorRole = res.data.form.supervisorRole;
      formData.value.auditorRoles = res.data.form.auditorRoles;
      formData.value.auditadoRoles = res.data.form.auditadoRoles;
    }
  } catch (error) {
    if (error?.response?.data?.message) {
      alert(error.response.data.message);
    } else {
      alert('Error al actualizar el estado del formulario');
    }
  }
};

onMounted(async () => {
  try {
    const id = route.params.id;
    const res = await axiosInstance.get(`/forms/${id}`);
    formData.value = res.data.data || res.data.form || res.data;

    if (isSuperadmin.value) return;

    if (isAdmin.value) {
      const orgId = String(userOrganizationId.value);
      const formOrgId = String(formData.value.organization_id);
      const businessOrgId = String(formData.value.business?.organization_id);
      const unitOrgId = String(formData.value.business_unit?.organization_id);
      const groupOrgId = String(formData.value.business_unit_group?.organization_id);

      if (orgId !== formOrgId && orgId !== businessOrgId && orgId !== unitOrgId && orgId !== groupOrgId) {
        router.replace('/403');
        return;
      }
    }

    if (isSponsor.value) {
      const sponsorBizId = String(user.value.business_id);
      const scope = formData.value.assignment_scope;

      const canSponsorView =
        (scope === 'business' && String(formData.value.business_id) === sponsorBizId) ||
        (scope === 'business_unit' && String(formData.value.business_unit?.business_id) === sponsorBizId) ||
        (scope === 'business_unit_group' && String(formData.value.business_unit_group?.business_id) === sponsorBizId);

      if (!canSponsorView) {
        router.replace('/403');
        return;
      }
    }

    if (canView.value && !isSuperadmin.value && !isAdmin.value && !isSponsor.value) {
      const orgId = String(user.value.organization_id);
      const bizId = String(user.value.business_id);
      const unitId = String(user.value.business_unit_id);

      if (orgId && !bizId && !unitId) {
        if (String(formData.value.organization_id) !== orgId) {
          router.replace('/403');
          return;
        }
      } else if (orgId && bizId && !unitId) {
        if (String(formData.value.business_id) !== bizId && String(formData.value.organization_id) !== orgId) {
          router.replace('/403');
          return;
        }
      } else if (orgId && bizId && unitId) {
        if (formData.value.assignment_scope !== 'business_unit' || String(formData.value.business_unit_id) !== unitId) {
          router.replace('/403');
          return;
        }
      }
    }

    if (!isSuperadmin.value && !isAdmin.value && !isSponsor.value && !canView.value) {
      router.replace('/403');
      return;
    }
  } catch (err) {
    showForm.value = false;
    if (err.response && err.response.status === 403) {
      router.replace('/403');
    }
    console.error('Error al obtener el formulario:', err);
  }
});
</script>

<style scoped>
.logo-avatar {
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  overflow: hidden;
  width: 320px;
  height: 320px;
  min-width: 320px;
  min-height: 320px;
  max-width: 320px;
  max-height: 320px;
}
.logo-avatar img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 12px;
  display: block;
}
.info-value-tight {
  text-align: left !important;
  padding-left: 120px !important;
}
.info-value {
  text-align: left !important;
  padding-left: 120px !important;
}
.custom-dropdown {
  padding: 0;
  border-radius: 8px;
  overflow: hidden;
}
.card-shadow {
  box-shadow: 0px 2px 8px 0px rgba(60, 60, 60, 0.08) !important;
  border-radius: 16px !important;
  background: #fff !important;
  border: 1px solid #eaeaea !important;
}
.v-card.rounded-lg,
.v-table.rounded-lg {
  border-radius: 16px !important;
  background: #fff !important;
  border: 1px solid #eaeaea !important;
  box-shadow: 0px 2px 8px 0px rgba(60, 60, 60, 0.08) !important;
}
</style>
