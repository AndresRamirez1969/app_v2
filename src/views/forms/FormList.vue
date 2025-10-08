<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import FormTableMeta from './FormTableMeta.vue';
import StatusChip from '@/components/status/StatusChip.vue';
import { useToast } from 'vue-toastification';
import axiosInstance from '@/utils/axios';
import { mdiChevronUp, mdiChevronDown, mdiDotsHorizontal, mdiEye, mdiPencil, mdiPublish, mdiArchive } from '@mdi/js';

const props = defineProps({
  items: Array,
  isLoading: Boolean,
  totalItems: Number,
  isMobile: Boolean
});

const isMobile = computed(() => props.isMobile ?? window.innerWidth < 1024);
const handleResize = () => {
  if (props.isMobile === undefined) {
    isMobile.value = window.innerWidth < 1024;
  }
};
onMounted(() => {
  if (props.isMobile === undefined) {
    window.addEventListener('resize', handleResize);
  }
});
onUnmounted(() => {
  if (props.isMobile === undefined) {
    window.removeEventListener('resize', handleResize);
  }
});

const router = useRouter();
const toast = useToast();

const sortBy = ref('folio');
const sortDesc = ref(false);
const page = ref(1);
const itemsPerPage = ref(10);

const pageCount = computed(() => {
  const total = Number(props.totalItems || (props.items?.length ?? 0));
  const perPage = Number(itemsPerPage.value || 10);
  const len = Math.ceil(total / perPage);
  return Math.max(1, len || 1);
});

const toggleSort = (column) => {
  if (sortBy.value === column) {
    sortDesc.value = !sortDesc.value;
  } else {
    sortBy.value = column;
    sortDesc.value = false;
  }
};

const sortedItems = computed(() => {
  return [...(props.items || [])].sort((a, b) => {
    let aVal = a[sortBy.value]?.toString().toLowerCase() ?? '';
    let bVal = b[sortBy.value]?.toString().toLowerCase() ?? '';
    return aVal.localeCompare(bVal) * (sortDesc.value ? -1 : 1);
  });
});

const paginatedItems = computed(() => {
  const start = (page.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return sortedItems.value.slice(start, end);
});

const goToShow = (form) => router.push({ path: `/formularios/${form.id}` });
const goToEdit = (form) => router.push({ path: `/formularios/editar/${form.id}` });

function formatDate(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

// Devuelve objeto { label, route } para el alcance
function getAlcance(form) {
  if (form.assignment_scope === 'organization' && form.organization) {
    return {
      label: `${form.folio} - ${form.organization.legal_name || 'No disponible'}`,
      route: `/organizaciones/${form.organization.id}`
    };
  } else if (form.assignment_scope === 'business' && form.business) {
    return {
      label: `${form.folio} - ${form.business.name || 'No disponible'}`,
      route: `/negocios/${form.business.id}`
    };
  } else if (form.assignment_scope === 'business_unit' && form.business_unit) {
    return {
      label: `${form.folio} - ${form.business_unit.name || 'No disponible'}`,
      route: `/unidades-negocio/${form.business_unit.id}`
    };
  } else if (form.assignment_scope === 'business_unit_group' && form.business_unit_group) {
    return {
      label: `${form.folio} - Grupo ${form.business_unit_group.id || 'ID'}`,
      route: `/grupos-unidad-negocio/${form.business_unit_group.id}`
    };
  }
  return { label: form.folio || '—', route: null };
}

function getFrecuencia(form) {
  if (form.frequency === 'once_per_day') return 'Una vez al día';
  if (form.frequency === 'multiple_per_day') return 'Muchas veces al día';
  return form.frequency || '—';
}

const emit = defineEmits(['formUpdated']);

const changeFormStatus = async (form, targetStatus) => {
  if (form.status === 'draft' && targetStatus === 'active' && form.fields && form.fields.length === 0) {
    toast.error('No se puede publicar un formulario sin campos');
    return;
  }
  try {
    const res = await axiosInstance.put(`/forms/${form.id}/status`, { status: targetStatus });
    form.status = targetStatus;
    if (res.data && res.data.form) {
      form.supervisorRole = res.data.form.supervisorRole;
      form.auditorRoles = res.data.form.auditorRoles;
      form.auditadoRoles = res.data.form.auditadoRoles;
    }
    emit('formUpdated');
  } catch (error) {
    if (error?.response?.data?.message) {
      toast.error(error.response.data.message);
    } else {
      toast.error('Error al actualizar el estado del formulario');
    }
  }
};

function hasResponses(form) {
  return Array.isArray(form.responses) && form.responses.length > 0;
}
</script>

<template>
  <div>
    <div v-if="isLoading" class="text-center py-8">
      <v-progress-circular indeterminate color="primary" size="64" />
      <p class="mt-4">Cargando formularios...</p>
    </div>

    <template v-else>
      <div v-if="!paginatedItems.length" class="text-center py-8">
        <v-icon size="64" color="grey lighten-1">mdi-file-document-outline</v-icon>
        <p class="mt-4 text-h6 text-grey-darken-1">No existen formularios</p>
        <p class="text-body-2 text-grey">No se encontraron formularios con los filtros aplicados</p>
      </div>

      <template v-else-if="isMobile">
        <v-card
          v-for="form in paginatedItems"
          :key="form.id"
          class="mb-4 pa-3 elevation-1 rounded-lg row-clickable"
          @click="goToShow(form)"
          style="cursor: pointer"
        >
          <div class="d-flex align-center mb-2" style="justify-content: space-between">
            <router-link
              :to="`/formularios/${form.id}`"
              class="text-primary"
              @click.stop
              style="text-decoration: underline; font-size: 15px"
            >
              {{ form.folio }}
            </router-link>
            <StatusChip :status="form.status" />
          </div>
          <div class="font-weight-medium mb-1">{{ form.name }}</div>
          <div class="text-caption mb-1">
            <strong>Frecuencia:</strong>
            {{ getFrecuencia(form) }}
          </div>
          <div class="text-caption mb-1">
            <strong>Alcance:</strong>
            <template v-if="getAlcance(form).route">
              <router-link :to="getAlcance(form).route" class="text-primary" @click.stop style="text-decoration: underline">
                {{ getAlcance(form).label }}
              </router-link>
            </template>
            <template v-else>
              {{ getAlcance(form).label }}
            </template>
          </div>
        </v-card>
        <div class="d-flex flex-column align-center mt-4">
          <v-pagination v-model="page" :length="pageCount" :total-visible="1" color="primary" />
        </div>
      </template>

      <template v-else>
        <FormTableMeta
          :items="paginatedItems"
          :page="page"
          :itemsPerPage="itemsPerPage"
          :sortBy="sortBy"
          :sortDesc="sortDesc"
          @update:page="page = $event"
          @sort="toggleSort"
        >
          <template #sort-icon="{ column }">
            <v-icon v-if="sortBy === column" size="16" class="ml-1">
              {{ sortDesc ? mdiChevronDown : mdiChevronUp }}
            </v-icon>
          </template>
          <template #rows>
            <template v-if="paginatedItems.length">
              <tr v-for="form in paginatedItems" :key="form.id" @click="goToShow(form)" class="row-clickable" style="cursor: pointer">
                <td>
                  <router-link :to="`/formularios/${form.id}`" class="text-primary" @click.stop style="text-decoration: underline">
                    {{ form.folio }}
                  </router-link>
                </td>
                <td>{{ form.name }}</td>
                <td>
                  {{ getFrecuencia(form) }}
                </td>
                <td>
                  <template v-if="getAlcance(form).route">
                    <router-link :to="getAlcance(form).route" class="text-primary" @click.stop style="text-decoration: underline">
                      {{ getAlcance(form).label }}
                    </router-link>
                  </template>
                  <template v-else>
                    {{ getAlcance(form).label }}
                  </template>
                </td>
                <td>
                  <StatusChip :status="form.status" />
                </td>
                <td @click.stop>
                  <v-menu location="bottom end">
                    <template #activator="{ props }">
                      <v-btn v-bind="props" variant="text" class="pa-0" min-width="0" height="24">
                        <v-icon :icon="mdiDotsHorizontal" size="20" />
                      </v-btn>
                    </template>
                    <v-list class="custom-dropdown elevation-1 rounded-lg" style="min-width: 200px">
                      <template v-if="form.status === 'draft'">
                        <v-list-item @click="goToEdit(form)">
                          <template #prepend>
                            <v-icon :icon="mdiPencil" size="18" />
                          </template>
                          <v-list-item-title>Editar</v-list-item-title>
                        </v-list-item>
                        <v-divider />
                      </template>
                      <v-list-item v-if="form.status !== 'archived'" @click="changeFormStatus(form, 'archived')">
                        <template #prepend>
                          <v-icon :icon="mdiArchive" size="18" />
                        </template>
                        <v-list-item-title>Archivar</v-list-item-title>
                      </v-list-item>
                      <v-divider v-if="form.status !== 'archived' && (form.status !== 'active' || form.status !== 'draft')" />
                      <v-list-item v-if="form.status !== 'active'" @click="changeFormStatus(form, 'active')">
                        <template #prepend>
                          <v-icon :icon="mdiPublish" size="18" />
                        </template>
                        <v-list-item-title>Publicar</v-list-item-title>
                      </v-list-item>
                      <v-divider v-if="form.status !== 'active' && form.status !== 'draft'" />
                      <v-list-item v-if="form.status !== 'draft'" @click="changeFormStatus(form, 'draft')">
                        <template #prepend>
                          <v-icon :icon="mdiPencil" size="18" />
                        </template>
                        <v-list-item-title>Borrador</v-list-item-title>
                      </v-list-item>
                    </v-list>
                  </v-menu>
                </td>
              </tr>
            </template>
          </template>
        </FormTableMeta>
      </template>
    </template>
  </div>
</template>

<style scoped>
.row-clickable {
  transition: background 0.1s;
}
.row-clickable:hover {
  background: #f5f7fa;
}
.custom-dropdown {
  border-radius: 10px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  padding: 4px 0;
  background: white;
}
</style>
