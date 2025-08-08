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
            Identificador
            <slot name="sort-icon" :column="'folio'" />
          </th>
          <th @click="emit('sort', 'legal_name')" class="cursor-pointer legal-header">
            Nombre
            <slot name="sort-icon" :column="'legal_name'" />
          </th>
          <th @click="emit('sort', 'address')" class="cursor-pointer address-header">
            Ubicaciones
            <slot name="sort-icon" :column="'address'" />
          </th>
          <th class="status-header">Estado</th>
          <th class="actions-header"></th>
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
