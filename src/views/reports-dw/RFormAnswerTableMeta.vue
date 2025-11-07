<script setup>
const props = defineProps({
  items: {
    type: Array,
    default: () => []
  },
  page: Number,
  itemsPerPage: Number,
  sortBy: String,
  sortDesc: Boolean,
  hasRating: {
    type: Boolean,
    default: false
  }
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
            Usuario
            <slot name="sort-icon" :column="'name'" />
          </th>
          <th @click="emit('sort', 'answer_date')" class="cursor-pointer answer-date-header">
            Fecha de Respuesta
            <slot name="sort-icon" :column="'answer_date'" />
          </th>
          <th @click="emit('sort', 'status')" class="cursor-pointer status-header">
            Estado
            <slot name="sort-icon" :column="'status'" />
          </th>

          <!-- Header de Ponderación SOLO si hay rating -->
          <th v-if="props.hasRating" @click="emit('sort', 'ponderacion')" class="cursor-pointer ponderacion-header">
            Ponderación
            <slot name="sort-icon" :column="'ponderacion'" />
          </th>

          <!-- Header de Puntaje SOLO si hay rating -->
          <th v-if="props.hasRating" @click="emit('sort', 'score')" class="cursor-pointer score-header">
            Puntaje
            <slot name="sort-icon" :column="'score'" />
          </th>

          <th class="actions-header" style="width: 60px"></th>
        </tr>
      </thead>

      <tbody>
        <!-- Pasamos hasRating por si el padre lo quiere consumir, pero el padre puede ignorarlo -->
        <slot name="rows" :hasRating="props.hasRating" />
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
.answer-date-header,
.status-header,
.ponderacion-header,
.score-header,
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
