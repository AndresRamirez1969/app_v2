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
  showOrganization: Boolean,
  showBusiness: Boolean
});
const emit = defineEmits(['update:page', 'sort']);
</script>

<template>
  <div>
    <v-table density="comfortable" class="fixed-table elevation-1 rounded-lg">
      <thead>
        <tr>
          <th @click="emit('sort', 'id')" class="cursor-pointer folio-header">
            Identificador
            <slot name="sort-icon" :column="'id'" />
          </th>
          <th @click="emit('sort', 'name')" class="cursor-pointer legal-header">
            Nombre
            <slot name="sort-icon" :column="'name'" />
          </th>
          <th v-if="showOrganization" @click="emit('sort', 'organization')" class="cursor-pointer organization-header">
            Organización
            <slot name="sort-icon" :column="'organization'" />
          </th>
          <th v-if="showBusiness" @click="emit('sort', 'business')" class="cursor-pointer company-header">
            Empresa
            <slot name="sort-icon" :column="'business'" />
          </th>
          <th @click="emit('sort', 'business_units_count')" class="cursor-pointer address-header">
            Ubicaciones
            <slot name="sort-icon" :column="'business_units_count'" />
          </th>
          <th class="status-header">Estado</th>
          <th class="actions-header"></th>
        </tr>
      </thead>
      <tbody>
        <slot name="rows" :showOrganization="showOrganization" :showBusiness="showBusiness" />
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
