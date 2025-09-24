<script setup>
const props = defineProps({
  items: { type: Array, default: () => [] },
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
          <th class="description-header">Descripción</th>
          <th class="scope-header">Alcance</th>
          <th @click="emit('sort', 'frequency')" class="cursor-pointer frequency-header">
            Frecuencia
            <slot name="sort-icon" :column="'frequency'" />
          </th>
          <th class="response-header">Estado</th>
        </tr>
      </thead>
      <tbody>
        <slot name="rows" />
      </tbody>
    </v-table>
  </div>
</template>
