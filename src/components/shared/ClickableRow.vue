<template>
  <div class="row-clickable" :style="style" @click="onClick" @mouseenter="hover = true" @mouseleave="hover = false">
    <slot />
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  onClick: Function,
  style: [String, Object]
});
const hover = ref(false);
</script>

<style scoped>
.row-clickable {
  cursor: pointer;
  transition: background 0.2s;
}
.row-clickable:hover {
  background: #f5f5f5;
}
</style>
