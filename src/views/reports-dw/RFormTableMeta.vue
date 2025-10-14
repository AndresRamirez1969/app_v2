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
            Frecuencia
            <slot name="sort-icon" :column="'frequency'" />
          </th>
          <th @click="emit('sort', 'scope')" class="cursor-pointer scope-header">
            Alcance
            <slot name="sort-icon" :column="'scope'" />
          </th>
          <th @click="emit('sort', 'answers')" class="cursor-pointer answers-header">
            Respuestas
            <slot name="sort-icon" :column="'answers'" />
          </th>
          <th class="actions-header" style="width: 60px"></th>
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
.scope-header,
.actions-header {
  padding: 12px 16px;
  font-weight: 600;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
}

.actions-header {
  text-align: center;
  width: 60px;
  padding: 12px 8px;
}
</style>
