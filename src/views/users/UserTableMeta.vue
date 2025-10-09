<script setup>
const props = defineProps({
  items: {
    type: Array,
    default: () => []
  },
  page: {
    type: Number,
    default: 1
  },
  itemsPerPage: {
    type: Number,
    default: 10
  },
  sortBy: String,
  sortDesc: Boolean,
  totalItems: {
    type: Number,
    default: 0
  }
});
const emit = defineEmits(['update:page', 'sort']);
</script>

<template>
  <div>
    <v-table density="comfortable" class="fixed-table elevation-1 rounded-lg">
      <thead>
        <tr>
          <th @click="emit('sort', 'id')" class="cursor-pointer id-header">
            Identificador
            <slot name="sort-icon" :column="'id'" />
          </th>
          <th @click="emit('sort', 'profile_picture')" class="cursor-pointer profile-picture-header">
            Foto
            <slot name="sort-icon" :column="'profile_picture'" />
          </th>
          <th @click="emit('sort', 'name')" class="cursor-pointer name-header">
            Nombre
            <slot name="sort-icon" :column="'name'" />
          </th>
          <th @click="emit('sort', 'email')" class="cursor-pointer email-header">
            Correo
            <slot name="sort-icon" :column="'email'" />
          </th>
          <th @click="emit('sort', 'role')" class="cursor-pointer role-header">
            Rol
            <slot name="sort-icon" :column="'role'" />
          </th>
          <th class="belongs-header">Pertenece A</th>
          <th @click="emit('sort', 'status')" class="cursor-pointer status-header">
            Estatus
            <slot name="sort-icon" :column="'status'" />
          </th>
          <th class="actions-header"></th>
        </tr>
      </thead>
      <tbody>
        <slot name="rows" />
      </tbody>
    </v-table>
    <div class="d-flex justify-center mt-4">
      <v-pagination
        :model-value="props.page"
        :length="Math.max(1, Math.ceil((props.totalItems || 1) / props.itemsPerPage))"
        total-visible="7"
        color="primary"
        @update:modelValue="(val) => emit('update:page', val)"
      />
    </div>
  </div>
</template>
