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
          <th @click="emit('sort', 'folio')" class="cursor-pointer folio-header th-nowrap">
            Folio
            <slot name="sort-icon" :column="'folio'" />
          </th>
          <th @click="emit('sort', 'name')" class="cursor-pointer name-header th-nowrap">
            Nombre
            <slot name="sort-icon" :column="'name'" />
          </th>
          <th @click="emit('sort', 'frecuencia')" class="cursor-pointer frecuencia-header th-nowrap">
            Frecuencia
            <slot name="sort-icon" :column="'frecuencia'" />
          </th>
          <th @click="emit('sort', 'alcance')" class="cursor-pointer alcance-header th-nowrap">
            Alcance
            <slot name="sort-icon" :column="'alcance'" />
          </th>
          <th class="status-header th-nowrap">Status</th>
          <th class="actions-header th-nowrap"></th>
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
.fixed-table {
  width: 100%;
  table-layout: fixed;
}

.th-nowrap {
  white-space: nowrap;
}

.folio-header {
  min-width: 90px;
  max-width: 120px;
}
.name-header {
  min-width: 140px;
  max-width: 220px;
}
.frecuencia-header {
  min-width: 110px;
  max-width: 140px;
}
.alcance-header {
  min-width: 140px;
  max-width: 220px;
}
.status-header {
  min-width: 90px;
  max-width: 110px;
  text-align: left;
}
.actions-header {
  min-width: 60px;
  max-width: 80px;
  text-align: center;
}

.folio-header,
.name-header,
.frecuencia-header,
.alcance-header,
.status-header,
.date-header,
.actions-header {
  padding: 12px 10px;
  font-weight: 600;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
}

.cursor-pointer {
  cursor: pointer;
}

.cursor-pointer:hover {
  background-color: rgba(0, 0, 0, 0.04);
}
</style>
