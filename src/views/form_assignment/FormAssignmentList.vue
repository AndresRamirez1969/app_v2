<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import FormAssignmentTableMeta from './FormAssignmentTableMeta.vue';
import { mdiChevronUp, mdiChevronDown } from '@mdi/js';

const props = defineProps({
  items: Array,
  isLoading: { type: Boolean, default: false },
  isMobile: { type: Boolean, default: false }
});

const router = useRouter();

const sortBy = ref('folio');
const sortDesc = ref(false);
const page = ref(1);
const itemsPerPage = ref(10);

const isTabletOrSmaller = ref(false);

const checkScreen = () => {
  isTabletOrSmaller.value = window.innerWidth <= 1024;
};

onMounted(() => {
  checkScreen();
  window.addEventListener('resize', checkScreen);
  // Debug: Verifica que los formularios de todas las frecuencias llegan correctamente
  console.log('Formularios recibidos:', props.items);
});
onBeforeUnmount(() => {
  window.removeEventListener('resize', checkScreen);
});

const toggleSort = (column) => {
  if (sortBy.value === column) sortDesc.value = !sortDesc.value;
  else {
    sortBy.value = column;
    sortDesc.value = false;
  }
};

const formatDate = (dateString) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const getResponseStatus = (form) => {
  // Puedes dejar este log para debug si lo necesitas
  // console.log(
  //   'Formulario:',
  //   form.folio,
  //   'frequency:',
  //   form.frequency,
  //   'can_respond:',
  //   form.can_respond,
  //   'has_responded:',
  //   form.has_responded
  // );

  if (form.frequency === 'multiple_per_day') {
    return { text: 'Formulario Persistente', color: 'info' };
  }
  if (form.frequency === 'once_per_day') {
    if (form.can_respond === false) return { text: 'Contestado', color: 'success' };
    if (form.can_respond === true) return { text: 'Sin Responder', color: 'warning' };
    return { text: 'Desconocido', color: 'grey' };
  }
  return { text: 'Desconocido', color: 'grey' };
};

const getScope = (form) => {
  if (form.organization) {
    return {
      text: `${form.organization.folio} - ${form.organization.legal_name}`,
      route: { name: 'Organization Show', params: { id: form.organization.id } }
    };
  }
  if (form.business) {
    return {
      text: `${form.business.folio} - ${form.business.legal_name}`,
      route: { name: 'Business Show', params: { id: form.business.id } }
    };
  }
  if (form.business_unit) {
    return {
      text: `${form.business_unit.folio} - ${form.business_unit.name}`,
      route: { name: 'Business Unit Show DW', params: { id: form.business_unit.id } }
    };
  }
  return { text: '—', route: null };
};

//Asegúrate de que el filtro no excluya formularios por frecuencia
const filteredItems = computed(() =>
  props.items.filter((f) => f && typeof f === 'object' && (f.frequency === 'once_per_day' || f.frequency === 'multiple_per_day'))
);

const sortedItems = computed(() =>
  [...filteredItems.value].sort((a, b) => {
    const aVal = a[sortBy.value]?.toString().toLowerCase() ?? '';
    const bVal = b[sortBy.value]?.toString().toLowerCase() ?? '';
    return aVal.localeCompare(bVal) * (sortDesc.value ? -1 : 1);
  })
);
const paginatedItems = computed(() => sortedItems.value.slice((page.value - 1) * itemsPerPage.value, page.value * itemsPerPage.value));

const fillForm = (form) => {
  if (form.can_respond === true) {
    router.push({ name: 'My Form Answer', params: { id: form.id } });
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
        <p class="mt-4 text-h6 text-grey-darken-1">No hay formularios que llenar</p>
        <p class="text-body-2 text-grey">No se encontraron formularios con los filtros aplicados</p>
      </div>
      <template v-else-if="isTabletOrSmaller">
        <v-card
          v-for="form in paginatedItems"
          :key="form.id"
          class="mb-4 pa-3 elevation-1 rounded-lg"
          :style="{ cursor: form.can_respond === true ? 'pointer' : 'default' }"
          @click="fillForm(form)"
        >
          <v-row no-gutters align="center" class="mb-1">
            <v-col cols="12">
              <div class="d-flex align-center mb-1 justify-space-between">
                <div class="text-caption" style="margin-right: 8px">
                  <span v-if="form.can_respond === true">
                    <router-link :to="{ name: 'My Form Answer', params: { id: form.id } }" @click.stop class="folio-link">
                      {{ form.folio }}
                    </router-link>
                  </span>
                  <span v-else>
                    {{ form.folio }}
                  </span>
                </div>
                <div>
                  <v-chip :color="getResponseStatus(form).color" text-color="white" size="small">
                    {{ getResponseStatus(form).text }}
                  </v-chip>
                </div>
              </div>
              <div class="font-weight-medium mb-1">{{ form.name }}</div>
              <div class="text-caption"><strong>Descripción:</strong> {{ form.description || '—' }}</div>
              <div class="text-caption">
                <strong>Alcance:</strong>
                <template v-if="getScope(form).route">
                  <router-link :to="getScope(form).route" @click.stop class="folio-link">
                    {{ getScope(form).text }}
                  </router-link>
                </template>
                <template v-else>
                  {{ getScope(form).text }}
                </template>
              </div>
              <div class="text-caption">
                <strong>Frecuencia:</strong>
                <span v-if="form.frequency === 'multiple_per_day'">Múltiple por día</span>
                <span v-else-if="form.frequency === 'once_per_day'">Una vez por día</span>
                <span v-else>{{ form.frequency }}</span>
              </div>
            </v-col>
          </v-row>
        </v-card>
      </template>
      <template v-else>
        <FormAssignmentTableMeta
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
            <tr
              v-for="form in paginatedItems"
              :key="form.id"
              @click="fillForm(form)"
              :class="{ 'row-clickable': form.can_respond === true }"
              :style="{ cursor: form.can_respond === true ? 'pointer' : 'default' }"
              tabindex="0"
              @keydown.enter="fillForm(form)"
            >
              <td class="folio-cell">
                <span v-if="form.can_respond === true">
                  <router-link :to="{ name: 'My Form Answer', params: { id: form.id } }" @click.stop class="folio-link">
                    {{ form.folio }}
                  </router-link>
                </span>
                <span v-else>
                  {{ form.folio }}
                </span>
              </td>
              <td class="name-cell">{{ form.name }}</td>
              <td class="description-cell">{{ form.description || '—' }}</td>
              <td class="scope-cell">
                <template v-if="getScope(form).route">
                  <router-link :to="getScope(form).route" @click.stop class="folio-link">
                    {{ getScope(form).text }}
                  </router-link>
                </template>
                <template v-else>
                  {{ getScope(form).text }}
                </template>
              </td>
              <td class="frequency-cell">
                <span v-if="form.frequency === 'multiple_per_day'">Múltiple por día</span>
                <span v-else-if="form.frequency === 'once_per_day'">Una vez por día</span>
                <span v-else>{{ form.frequency }}</span>
              </td>
              <td class="response-cell" style="text-align: left">
                <v-chip :color="getResponseStatus(form).color" text-color="white" size="small">
                  {{ getResponseStatus(form).text }}
                </v-chip>
              </td>
            </tr>
          </template>
        </FormAssignmentTableMeta>
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
.folio-cell,
.name-cell,
.description-cell,
.scope-cell,
.frequency-cell,
.response-cell,
.status-cell,
.date-cell,
.actions-cell {
  padding: 12px 16px;
  border-bottom: 1px solid #e0e0e0;
}
.response-cell {
  width: 150px;
  text-align: left;
}
.folio-link {
  color: #1976d2 !important;
  text-decoration: underline;
  cursor: pointer;
}
</style>
