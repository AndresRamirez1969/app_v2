<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import axiosInstance from '@/utils/axios';
import FormTableMeta from './FormTableMeta.vue';
import { CHIPCOLOR } from '@/constants/constants';
import { useToast } from 'vue-toastification';
import { mdiChevronUp, mdiChevronDown, mdiDotsHorizontal, mdiPencil, mdiEye, mdiPublish, mdiArchive } from '@mdi/js';

const props = defineProps({
  items: Array,
  isMobile: Boolean,
  isLoading: Boolean
});

const router = useRouter();
const toast = useToast();

const sortBy = ref('folio');
const sortDesc = ref(false);
const page = ref(1);
const itemsPerPage = ref(10);

const emit = defineEmits(['formUpdated']);

const toggleSort = (column) => {
  if (sortBy.value === column) {
    sortDesc.value = !sortDesc.value;
  } else {
    sortBy.value = column;
    sortDesc.value = false;
  }
};

const formatDate = (dateString) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const getStatusLabel = (status) => {
  const labels = {
    draft: 'Borrador',
    active: 'Activo',
    archived: 'Archivado'
  };
  return labels[status] || status;
};

const sortedItems = computed(() => {
  return [...props.items].sort((a, b) => {
    const aVal = a[sortBy.value]?.toString().toLowerCase() ?? '';
    const bVal = b[sortBy.value]?.toString().toLowerCase() ?? '';
    return aVal.localeCompare(bVal) * (sortDesc.value ? -1 : 1);
  });
});

const paginatedItems = computed(() => {
  const start = (page.value - 1) * itemsPerPage.value;
  return sortedItems.value.slice(start, start + itemsPerPage.value);
});

const viewForm = (form) => {
  router.push({ name: 'FormDetail', params: { id: form.id } });
};

const publishForm = async (form) => {
  try {
    await axiosInstance.put(`/forms/${form.id}/status`, {
      status: 'active'
    });

    // Actualizar localmente el estado del formulario
    form.status = 'active';

    toast.success('Se ha publicado el formulario');
    emit('formUpdated');
  } catch (error) {
    console.error('Error al publicar formulario:', error);
    toast.error('Error al publicar formulario: ' + (error.response?.data?.message || error.message));
  }
};

const archiveForm = async (form) => {
  try {
    await axiosInstance.put(`/forms/${form.id}/status`, {
      status: 'archived'
    });

    // Actualizar localmente el estado del formulario
    form.status = 'archived';

    toast.success('Se ha archivado el formulario');
    emit('formUpdated');
  } catch (error) {
    console.error('Error al archivar formulario:', error);
    toast.error('Error al archivar formulario: ' + (error.response?.data?.message || error.message));
  }
};
</script>

<template>
  <div>
    <div v-if="isLoading" class="text-center py-8">
      <v-progress-circular indeterminate color="primary" size="64" />
      <p class="mt-4">Cargando formularios...</p>
    </div>
    <template v-else>
      <div v-if="!paginatedItems.length" class="text-center py-8">
        <v-icon size="64" color="grey lighten-1">mdi-domain-off</v-icon>
        <p class="mt-4 text-h6 text-grey-darken-1">No existen formularios</p>
        <p class="text-body-2 text-grey">No se encontraron formularios con los filtros aplicados</p>
      </div>

      <!-- Modo móvil (solo cards) -->
      <template v-else-if="isMobile">
        <v-card
          v-for="form in paginatedItems"
          :key="form.id"
          class="mb-4 pa-3 elevation-1 rounded-lg row-clickable"
          @click="viewForm(form)"
          style="cursor: pointer"
        >
          <v-row no-gutters align="center" class="mb-1">
            <v-col cols="12">
              <div class="d-flex align-center mb-1" style="justify-content: space-between">
                <div class="text-caption" style="margin-right: 8px">
                  <router-link :to="`/formulario/${form.id}`" @click.stop style="text-decoration: underline">
                    {{ form.folio }}
                  </router-link>
                </div>
                <v-chip :color="CHIPCOLOR(form.status)" text-color="white" size="small">
                  {{ getStatusLabel(form.status) }}
                </v-chip>
              </div>
              <div class="font-weight-medium mb-1">{{ form.name }}</div>
              <div class="text-caption"><strong>Creado:</strong> {{ formatDate(form.created_at) }}</div>
            </v-col>
          </v-row>
        </v-card>
      </template>

      <!-- Modo escritorio (solo tabla) -->
      <template v-if="!isMobile">
        <FormTableMeta
          :items="sortedItems"
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
              <tr v-for="form in paginatedItems" :key="form.id" @click="viewForm(form)" class="row-clickable" style="cursor: pointer">
                <td class="folio-cell">
                  <router-link :to="`/formulario/${form.id}`" @click.stop style="text-decoration: underline">
                    {{ form.folio }}
                  </router-link>
                </td>
                <td class="name-cell">{{ form.name }}</td>
                <td class="status-cell">
                  <v-chip :color="CHIPCOLOR(form.status)" text-color="white" size="small">
                    {{ getStatusLabel(form.status) }}
                  </v-chip>
                </td>
                <td class="date-cell">{{ formatDate(form.created_at) }}</td>
                <td class="actions-cell" @click.stop>
                  <v-menu location="bottom end">
                    <template #activator="{ props }">
                      <v-btn v-bind="props" variant="text" class="pa-0" min-width="0" height="24">
                        <v-icon :icon="mdiDotsHorizontal" size="20" />
                      </v-btn>
                    </template>
                    <v-list class="custom-dropdown elevation-1 rounded-lg" style="min-width: 200px">
                      <v-list-item @click="viewForm(form)">
                        <template #prepend>
                          <v-icon :icon="mdiEye" size="18" />
                        </template>
                        <v-list-item-title>Ver</v-list-item-title>
                      </v-list-item>
                      <v-divider class="my-1" />
                      <v-list-item v-if="form.status === 'draft'" @click="publishForm(form)">
                        <template #prepend>
                          <v-icon :icon="mdiPublish" size="18" color="green" />
                        </template>
                        <v-list-item-title>Publicar</v-list-item-title>
                      </v-list-item>
                      <v-divider v-if="form.status === 'draft'" class="my-1" />
                      <v-list-item v-if="form.status !== 'archived'" @click="archiveForm(form)">
                        <template #prepend>
                          <v-icon :icon="mdiArchive" size="18" color="red" />
                        </template>
                        <v-list-item-title>Archivar</v-list-item-title>
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
.row-clickable:hover {
  background: #f5f5f5;
  transition: background 0.2s;
}

.folio-cell,
.name-cell,
.status-cell,
.date-cell,
.actions-cell {
  padding: 12px 16px;
  border-bottom: 1px solid #e0e0e0;
}

.actions-cell {
  width: 80px;
  text-align: center;
}

.custom-dropdown {
  background: white;
}
</style>
