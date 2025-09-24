<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { VueSignaturePad } from 'vue-signature-pad';

const signaturePad = ref(null);
const padWrapper = ref(null);
let resizeObserver = null;

const resizePad = () => {
  if (!padWrapper.value || !signaturePad.value) return;
  const wrapper = padWrapper.value;
  const width = wrapper.offsetWidth;
  const height = wrapper.offsetHeight || 200;
  // Ajusta el canvas interno del signature pad
  signaturePad.value.resizeCanvas(width, height);
};

onMounted(() => {
  // Redimensiona al montar
  resizePad();
  // Observa cambios de tamaño
  resizeObserver = new ResizeObserver(resizePad);
  if (padWrapper.value) {
    resizeObserver.observe(padWrapper.value);
  }
});

onBeforeUnmount(() => {
  if (resizeObserver && padWrapper.value) {
    resizeObserver.unobserve(padWrapper.value);
  }
});

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

<template>
  <div>
    <div class="signature-pad-wrapper" ref="padWrapper">
      <VueSignaturePad
        width="100%"
        height="200px"
        ref="signaturePad"
        :options="{ penColor: 'black', backgroundColor: 'white' }"
        class="signature-pad-responsive"
      />
    </div>
    <div class="d-flex mt-3 button-group">
      <v-btn @click="save" color="primary" variant="outlined" size="small"> Guardar </v-btn>
      <v-btn @click="undo" color="secondary" variant="outlined" size="small"> Deshacer </v-btn>
      <v-btn @click="clear" color="error" variant="outlined" size="small"> Borrar </v-btn>
    </div>
  </div>
</template>

<style scoped>
.signature-pad-wrapper {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  background-color: #fafafa;
}
.button-group > *:not(:last-child) {
  margin-right: 12px !important;
}
</style>
