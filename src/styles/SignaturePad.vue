<template>
  <div>
    <div class="d-flex gap-2 mb-3">
      <v-btn @click="save" color="primary" variant="outlined" size="small" class="mr-2"> Guardar </v-btn>
      <v-btn @click="undo" color="secondary" variant="outlined" size="small"> Deshacer </v-btn>
      <v-btn @click="clear" color="error" variant="outlined" size="small"> Borrar </v-btn>
    </div>
    <VueSignaturePad width="500px" height="500px" ref="signaturePad" :options="{ penColor: 'black', backgroundColor: 'white' }" />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { VueSignaturePad } from 'vue-signature-pad';

const signaturePad = ref(null);

const undo = () => {
  signaturePad.value.undoSignature();
};

const clear = () => {
  signaturePad.value.clearSignature();
  emit('signature-changed', null);
};

const save = () => {
  if (signaturePad.value) {
    const { isEmpty, data } = signaturePad.value.saveSignature();
    if (!isEmpty) {
      const base64Data = data.split(',')[1];
      const byteChars = atob(base64Data);
      const byteNumbers = new Array(byteChars.length);

      for (let i = 0; i < byteChars.length; i++) {
        byteNumbers[i] = byteChars.charCodeAt(i);
      }

      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });
      emit('signature-changed', blob);
    } else {
      console.log('Firma vacía');
    }
  }
};

defineExpose({
  save,
  undo,
  clear
});
const emit = defineEmits(['signature-changed']);
</script>

<style scoped>
.gap-2 {
  gap: 0.5rem;
}
</style>
