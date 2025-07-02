<script setup>
defineProps({
  business: Object
});
</script>

<template>
  <div>
    <ul>
      <li v-for="unit in business.business_units" :key="unit.id">
        {{ unit.legal_name }}
      </li>
    </ul>
  </div>
</template>
