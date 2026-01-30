<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import UserFormTable from './UserFormTable.vue';
import { mdiChevronUp, mdiChevronDown } from '@mdi/js';

const props = defineProps({
  items: Array,
  isLoading: {
    type: Boolean,
    default: false
  },
  isMobile: {
    type: Boolean,
    default: false
  }
});

const router = useRouter();

const sortBy = ref('folio');
const sortDesc = ref(false);
const page = ref(1);
const itemsPerPage = ref(10);

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

// Función para obtener el estado de respuesta basado en la respuesta del endpoint
const getResponseStatus = (form) => {
  // Si el formulario no puede ser respondido (ya respondido para once_per_day)
  if (!form.can_respond && form.frequency === 'once_per_day') {
    return { text: 'Completado', color: 'success' };
  }

  // Si no ha respondido
  if (!form.has_responded && form.frequency === 'once_per_day') {
    return { text: 'Sin Responder', color: 'warning' };
  }

  // Si ya respondió pero puede seguir respondiendo (multiple_per_day)
  if (form.frequency === 'multiple_per_day') {
    return { text: 'Formulario Persistente', color: 'info' };
  }
};

// Filtrar formularios según la lógica del backend
const filteredItems = computed(() => {
  return props.items.filter((form, index) => {
    // Validar que form existe
    if (!form) {
      console.warn(`Formulario ${index} es undefined`);
      return false;
    }

    // Validar que form es un objeto
    if (typeof form !== 'object') {
      console.warn(`Formulario ${index} no es un objeto:`, typeof form);
      return false;
    }

    // Solo mostrar formularios que pueden ser respondidos
    return form.can_respond !== false;
  });
});

const sortedItems = computed(() => {
  return [...filteredItems.value].sort((a, b) => {
    const aVal = a[sortBy.value]?.toString().toLowerCase() ?? '';
    const bVal = b[sortBy.value]?.toString().toLowerCase() ?? '';
    return aVal.localeCompare(bVal) * (sortDesc.value ? -1 : 1);
  });
});

const paginatedItems = computed(() => {
  const start = (page.value - 1) * itemsPerPage.value;
  return sortedItems.value.slice(start, start + itemsPerPage.value);
});

const fillForm = (form) => {
  router.push({ name: 'FillForm', params: { id: form.id } });
};
</script>

<template>
  <div>
    <!-- Modo móvil (solo cards) -->
    <div v-if="isLoading" class="text-center py-8">
      <v-progress-circular indeterminate color="primary" size="64" />
      <p class="mt-4">Cargando formularios...</p>
    </div>

    <template v-else>
      <div v-if="!paginatedItems.length" class="text-center py-8">
        <p class="mt-4 text-h6 text-grey-darken-1">No hay formularios que llenar</p>
        <p class="text-body-2 text-grey">No se encontraron formularios con los filtros aplicados</p>
      </div>

      <template v-else-if="isMobile">
        <v-card
          v-for="form in paginatedItems"
          :key="form.id"
          class="mb-4 pa-3 elevation-1 rounded-lg row-clickable"
          @click="fillForm(form)"
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
              </div>
              <div class="font-weight-medium mb-1">{{ form.name }}</div>
              <div class="text-caption"><strong>Creado:</strong> {{ formatDate(form.created_at) }}</div>
              <!-- Estado de respuesta -->
              <div class="mt-2">
                <v-chip :color="getResponseStatus(form).color" text-color="white" size="small">
                  {{ getResponseStatus(form).text }}
                </v-chip>
              </div>
            </v-col>
          </v-row>
        </v-card>
      </template>

      <!-- Modo escritorio (solo tabla) -->
      <template v-else>
        <UserFormTable
          :items="sortedItems"
          :page="page"
          :itemsPerPage="itemsPerPage"
          :sortBy="sortBy"
          :sortDesc="sortDesc"
          @update:page="page = $event"
          @sort="toggleSort"
          density="comfortable"
          class="fixed-table"
        >
          <template #sort-icon="{ column }">
            <v-icon v-if="sortBy === column" size="16" class="ml-1">
              {{ sortDesc ? mdiChevronDown : mdiChevronUp }}
            </v-icon>
          </template>
          <template #rows>
            <template v-if="paginatedItems.length">
              <tr v-for="form in paginatedItems" :key="form.id" @click="fillForm(form)" class="row-clickable" style="cursor: pointer">
                <td class="folio-cell">
                  {{ form.folio }}
                </td>
                <td class="name-cell">{{ form.name }}</td>
                <td class="date-cell">{{ formatDate(form.created_at) }}</td>
                <td class="response-cell">
                  <v-chip :color="getResponseStatus(form).color" text-color="white" size="small">
                    {{ getResponseStatus(form).text }}
                  </v-chip>
                </td>
              </tr>
            </template>
            <template v-else>
              <tr>
                <td :colspan="5" class="text-center py-8">
                  <div class="font-weight-bold mb-2" style="font-size: 1.5rem">No existen formularios aun...</div>
                </td>
              </tr>
            </template>
          </template>
        </UserFormTable>
        <div class="d-flex justify-center mt-4">
          <v-pagination
            v-model="page"
            :length="Math.ceil(sortedItems.length / itemsPerPage)"
            :total-visible="7"
            @update:model-value="page = $event"
          />
        </div>
      </template>
    </template>
  </div>
</template>

<style scoped>
.row-clickable:hover {
  background: #f5f5f5;
  transition: background 0.2s;
}
.v-theme--dark .row-clickable:hover {
  background: rgba(255, 255, 255, 0.08) !important;
}

.folio-cell,
.name-cell,
.status-cell,
.date-cell,
.response-cell,
.actions-cell {
  padding: 12px 16px;
  border-bottom: 1px solid #e0e0e0;
}

.actions-cell {
  width: 80px;
  text-align: center;
}

.response-cell {
  width: 150px;
  text-align: center;
}

.custom-dropdown {
  background: white;
}
</style>
