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
  showOrganization: Boolean // Solo superadmin ve la columna
});
const emit = defineEmits(['update:page', 'sort']);
</script>

<template>
  <div>
    <!-- Título "Organización" solo para superadmin -->
    <div v-if="props.showOrganization" class="mb-3">
      <h4 class="font-weight-bold">Organización</h4>
      <v-divider class="mb-4" />
    </div>
    <v-table density="comfortable" class="fixed-table elevation-1 rounded-lg">
      <thead>
        <slot name="header">
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
        </slot>
      </thead>
      <tbody>
        <slot name="rows" :showOrganization="props.showOrganization" />
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
