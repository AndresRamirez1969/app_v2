<template>
  <v-text-field
    v-model="search"
    label="Buscar permiso o modelo"
    variant="outlined"
    color="primary"
    clearable
    class="mb-4"
    @input="onInput"
  />
</template>

<script setup>
import { ref, watch, defineProps, defineEmits } from 'vue';

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  }
});
const emit = defineEmits(['update:modelValue']);

const search = ref(props.modelValue);

watch(
  () => props.modelValue,
  (val) => {
    search.value = val;
  }
);

function onInput(e) {
  emit('update:modelValue', search.value);
}
</script>
