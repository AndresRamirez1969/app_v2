<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import FormTableMeta from './FormTableMeta.vue';
import { CHIPCOLOR } from '@/constants/constants';
import { useToast } from 'vue-toastification';
import { mdiChevronUp, mdiChevronDown, mdiDotsHorizontal, mdiEye, mdiPencil, mdiPublish, mdiArchive } from '@mdi/js';

const props = defineProps({
  items: Array,
  isLoading: Boolean,
  totalItems: Number
});

const isMobile = ref(window.innerWidth < 1024);
const handleResize = () => {
  isMobile.value = window.innerWidth < 1024;
};
onMounted(() => window.addEventListener('resize', handleResize));
onUnmounted(() => window.removeEventListener('resize', handleResize));

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

const goToShow = (form) => router.push({ path: `/formularios-dw/${form.id}` });
const goToEdit = (form) => router.push({ path: `/formularios-dw/editar/${form.id}` });

function getSupervisor(form) {
  return form.supervisorRole?.name || 'Sin supervisor';
}
function getAuditor(form) {
  return form.auditorRoles?.map((r) => r.name).join(', ') || 'Sin auditor';
}
function getAuditados(form) {
  return form.auditadoRoles?.map((r) => r.name).join(', ') || 'Sin auditados';
}
function formatDate(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}
function getStatusLabel(status) {
  const labels = {
    draft: 'Borrador',
    active: 'Activo',
    archived: 'Archivado'
  };
  return labels[status] || status;
}

// Acciones de status
const emit = defineEmits(['formUpdated']);

const publishForm = async (form) => {
  if (form.fields && form.fields.length === 0) {
    toast.error('No se puede publicar un formulario sin campos');
    return;
  }
  try {
    await $fetch(`/forms/${form.id}/status`, {
      method: 'PUT',
      body: { status: 'active' }
    });
    form.status = 'active';
    toast.success('Se ha publicado el formulario');
    emit('formUpdated');
  } catch (error) {
    toast.error('Error al publicar formulario');
  }
};

const archiveForm = async (form) => {
  try {
    await $fetch(`/forms/${form.id}/status`, {
      method: 'PUT',
      body: { status: 'archived' }
    });
    form.status = 'archived';
    toast.success('Se ha archivado el formulario');
    emit('formUpdated');
  } catch (error) {
    toast.error('Error al archivar formulario');
  }
};
</script>

<template>
  <div>
    <!-- Loading global -->
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

      <!-- MODO MÓVIL (iPad y abajo) -->
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
              :to="`/formularios-dw/${form.id}`"
              class="text-primary"
              @click.stop
              style="text-decoration: underline; font-size: 15px"
            >
              {{ form.folio }}
            </router-link>
            <v-chip :color="CHIPCOLOR(form.status)" text-color="white" size="small">
              {{ getStatusLabel(form.status) }}
            </v-chip>
          </div>
          <div class="font-weight-medium mb-1">{{ form.name }}</div>
          <div class="text-caption mb-1"><strong>Supervisor:</strong> {{ getSupervisor(form) }}</div>
          <div class="text-caption mb-1"><strong>Auditor:</strong> {{ getAuditor(form) }}</div>
          <div class="text-caption mb-1"><strong>Auditados:</strong> {{ getAuditados(form) }}</div>
          <div class="text-caption mb-1">
            <strong>Fecha de Creación:</strong>
            {{ formatDate(form.created_at) }}
          </div>
        </v-card>
        <div class="d-flex flex-column align-center mt-4">
          <v-pagination v-model="page" :length="pageCount" :total-visible="1" color="primary" />
        </div>
      </template>

      <!-- MODO DESKTOP -->
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
                  <router-link :to="`/formularios-dw/${form.id}`" class="text-primary" @click.stop style="text-decoration: underline">
                    {{ form.folio }}
                  </router-link>
                </td>
                <td>{{ form.name }}</td>
                <td>{{ getSupervisor(form) }}</td>
                <td>{{ getAuditor(form) }}</td>
                <td>{{ getAuditados(form) }}</td>
                <td>
                  <v-chip :color="CHIPCOLOR(form.status)" text-color="white" size="small">
                    {{ getStatusLabel(form.status) }}
                  </v-chip>
                </td>
                <td>
                  {{ formatDate(form.created_at) }}
                </td>
                <td @click.stop>
                  <v-menu location="bottom end">
                    <template #activator="{ props }">
                      <v-btn v-bind="props" variant="text" class="pa-0" min-width="0" height="24">
                        <v-icon :icon="mdiDotsHorizontal" size="20" />
                      </v-btn>
                    </template>
                    <v-list class="custom-dropdown elevation-1 rounded-lg" style="min-width: 200px">
                      <v-list-item @click="goToShow(form)">
                        <template #prepend>
                          <v-icon :icon="mdiEye" size="18" />
                        </template>
                        <v-list-item-title>Ver</v-list-item-title>
                      </v-list-item>
                      <!-- Divider only if there are more actions -->
                      <v-divider v-if="form.status !== 'archived'" class="my-1" />

                      <!-- Si está en borrador -->
                      <template v-if="form.status === 'draft'">
                        <v-list-item @click="publishForm(form)">
                          <template #prepend>
                            <v-icon :icon="mdiPublish" size="18" color="green" />
                          </template>
                          <v-list-item-title>Publicar</v-list-item-title>
                        </v-list-item>
                        <v-divider class="my-1" />
                        <v-list-item @click="archiveForm(form)">
                          <template #prepend>
                            <v-icon :icon="mdiArchive" size="18" color="red" />
                          </template>
                          <v-list-item-title>Archivar</v-list-item-title>
                        </v-list-item>
                      </template>

                      <!-- Si está en activo/publicado -->
                      <template v-else-if="form.status === 'active'">
                        <v-list-item @click="archiveForm(form)">
                          <template #prepend>
                            <v-icon :icon="mdiArchive" size="18" color="red" />
                          </template>
                          <v-list-item-title>Archivar</v-list-item-title>
                        </v-list-item>
                        <v-divider class="my-1" />
                        <v-list-item @click="publishForm(form)">
                          <template #prepend>
                            <v-icon :icon="mdiPublish" size="18" color="green" />
                          </template>
                          <v-list-item-title>Borrador</v-list-item-title>
                        </v-list-item>
                      </template>
                      <!-- Si está archivado, solo mostrar "Ver" sin divider ni otras acciones -->
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
