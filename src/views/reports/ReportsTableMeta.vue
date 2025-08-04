<script setup>
const props = defineProps({
  items: {
    type: Array,
    default: () => []
  },
  page: Number,
  itemsPerPage: Number,
  sortBy: String,
  sortDesc: Boolean
});
const emit = defineEmits(['update:page', 'sort']);
</script>

<template>
  <div>
    <v-table density="comfortable" class="fixed-table elevation-1 rounded-lg">
      <thead>
        <tr>
          <th @click="emit('sort', 'folio')" class="cursor-pointer folio-header">
            Folio
            <slot name="sort-icon" :column="'folio'" />
          </th>
          <th @click="emit('sort', 'name')" class="cursor-pointer name-header">
            Nombre
            <slot name="sort-icon" :column="'name'" />
          </th>
          <th class="cursor-pointer name-header">
            Respuestas
            <slot name="sort-icon" :column="'answers'" />
          </th>
          <th @click="emit('sort', 'created_at')" class="cursor-pointer date-header">
            Fecha de Creación
            <slot name="sort-icon" :column="'created_at'" />
          </th>
          <th class="actions-header">Acciones</th>
        </tr>
      </thead>
      <tbody>
        <slot name="rows" />
      </tbody>
    </v-table>
    <div class="d-flex justify-center mt-4">
      <v-pagination
        v-model="props.page"
        :length="Math.ceil((props.items?.length || 1) / props.itemsPerPage)"
        total-visible="7"
        color="primary"
        @update:modelValue="emit('update:page', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}

.cursor-pointer:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.fixed-table {
  width: 100%;
}

.folio-header,
.name-header,
.answers-header,
.date-header,
.actions-header {
  padding: 12px 16px;
  font-weight: 600;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
}

.actions-header {
  width: 80px;
  text-align: center;
}
</style>
