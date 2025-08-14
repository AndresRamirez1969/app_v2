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
  showOrganization: Boolean // NUEVO: solo superadmin ve la columna
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
          <th @click="emit('sort', 'name')" class="cursor-pointer name-header">
            Nombre
            <slot name="sort-icon" :column="'name'" />
          </th>
          <th v-if="props.showOrganization" @click="emit('sort', 'organization_id')" class="cursor-pointer org-header">
            Organización
            <slot name="sort-icon" :column="'organization_id'" />
          </th>
          <th @click="emit('sort', 'permissions')" class="cursor-pointer permissions-header">
            Permisos
            <slot name="sort-icon" :column="'permissions'" />
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
        v-model="props.page"
        :length="Math.ceil((props.items?.length || 1) / props.itemsPerPage)"
        total-visible="7"
        color="primary"
        @update:modelValue="emit('update:page', $event)"
      />
    </div>
  </div>
</template>

<style scoped src="@/styles/roles.css"></style>
