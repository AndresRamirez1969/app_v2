<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import UserFormTable from './UserFormTable.vue';
import { CHIPCOLOR } from '@/constants/constants';
import { mdiChevronUp, mdiChevronDown, mdiDotsHorizontal, mdiEye, mdiPublish, mdiArchive } from '@mdi/js';

const props = defineProps({
  items: Array,
  isMobile: Boolean
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

const fillForm = (form) => {
  router.push({ name: 'FillForm', params: { id: form.id } });
};
</script>

<template>
  <div>
    <!-- Modo móvil (solo cards) -->
    <template v-if="isMobile">
      <template v-if="paginatedItems.length">
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
      <template v-else>
        <v-card class="mb-4 pa-4 elevation-1 rounded-lg text-center">
          <div class="font-weight-bold mb-2" style="font-size: 1.5rem">Cargando formularios...</div>
        </v-card>
      </template>
    </template>

    <!-- Modo escritorio (solo tabla) -->
    <template v-if="!isMobile">
      <UserFormTable
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
            <tr v-for="form in paginatedItems" :key="form.id" @click="fillForm(form)" class="row-clickable" style="cursor: pointer">
              <td class="folio-cell">
                <router-link :to="`/formulario/${form.id}`" @click.stop style="text-decoration: underline">
                  {{ form.folio }}
                </router-link>
              </td>
              <td class="name-cell">{{ form.name }}</td>
              <td class="date-cell">{{ formatDate(form.created_at) }}</td>
              <td class="actions-cell" @click.stop>
                <v-menu location="bottom end">
                  <template #activator="{ props }">
                    <v-btn v-bind="props" variant="text" class="pa-0" min-width="0" height="24">
                      <v-icon :icon="mdiDotsHorizontal" size="20" />
                    </v-btn>
                  </template>
                  <v-list class="custom-dropdown elevation-1 rounded-lg" style="min-width: 200px">
                    <v-list-item @click="fillForm(form)">
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
          <template v-else>
            <tr>
              <td :colspan="5" class="text-center py-8">
                <div class="font-weight-bold mb-2" style="font-size: 1.5rem">Cargando formularios...</div>
              </td>
            </tr>
          </template>
        </template>
      </UserFormTable>
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
