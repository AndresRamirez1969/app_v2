<template>
  <v-dialog v-model="isOpen" max-width="600" persistent>
    <v-card class="pa-4">
      <v-row justify="end">
        <v-icon class="cursor-pointer" @click="close">mdi-close</v-icon>
      </v-row>
      <v-img :src="imageUrl" aspect-ratio="1" contain class="mx-auto rounded" max-height="500" />
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  modelValue: Boolean,
  imageUrl: String
});
const emit = defineEmits(['update:modelValue']);

const isOpen = ref(props.modelValue);

watch(
  () => props.modelValue,
  (val) => {
    isOpen.value = val;
  }
);

function close() {
  emit('update:modelValue', false);
}
</script>
