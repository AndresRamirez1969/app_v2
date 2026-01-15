<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { VueSignaturePad } from 'vue-signature-pad';

const signaturePad = ref(null);
const padWrapper = ref(null);
let resizeObserver = null;

const emit = defineEmits(['signature-changed']);

/**
 * Ajusta el tamaño del canvas al tamaño del contenedor
 */
const resizePad = () => {
  if (!padWrapper.value || !signaturePad.value) return;

  const wrapper = padWrapper.value;
  const width = wrapper.offsetWidth;
  const height = wrapper.offsetHeight || 200;

  // Método propio de vue-signature-pad
  signaturePad.value.resizeCanvas(width, height);
};

onMounted(() => {
  resizePad();

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

/**
 * Recorta un dataURL dejando solo el área donde hay píxeles no blancos/no transparentes.
 * (Se hace en un canvas "offscreen", no tocamos el canvas original del componente)
 */
const trimDataUrl = (dataUrl) => {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      const w = img.width;
      const h = img.height;

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');

      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, w, h);
      const { data } = imageData;

      let top = h;
      let left = w;
      let right = 0;
      let bottom = 0;
      let hasInk = false;

      // Buscamos píxeles que no sean blanco puro
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const a = data[idx + 3];

          // ignorar transparentes o casi blancos
          if (a === 0) continue;
          if (r > 250 && g > 250 && b > 250) continue;

          hasInk = true;
          if (x < left) left = x;
          if (x > right) right = x;
          if (y < top) top = y;
          if (y > bottom) bottom = y;
        }
      }

      // Si no hay trazos, regresamos el original
      if (!hasInk || right <= left || bottom <= top) {
        resolve(dataUrl);
        return;
      }

      const trimWidth = right - left + 1;
      const trimHeight = bottom - top + 1;

      const trimmedCanvas = document.createElement('canvas');
      trimmedCanvas.width = trimWidth;
      trimmedCanvas.height = trimHeight;
      const tctx = trimmedCanvas.getContext('2d');

      tctx.drawImage(canvas, left, top, trimWidth, trimHeight, 0, 0, trimWidth, trimHeight);

      const trimmedDataUrl = trimmedCanvas.toDataURL('image/png');
      resolve(trimmedDataUrl);
    };

    img.onerror = () => {
      // Si algo falla, usamos el original para no romper el flujo
      resolve(dataUrl);
    };

    img.src = dataUrl;
  });
};

const undo = () => {
  signaturePad.value?.undoSignature();
};

const clear = () => {
  signaturePad.value?.clearSignature();
  emit('signature-changed', null);
};

/**
 * Guarda la firma, la recorta y emite un Blob listo para mandar al backend.
 */
const save = async () => {
  if (!signaturePad.value) return;

  const { isEmpty, data } = signaturePad.value.saveSignature();

  // Recortamos el dataURL para quitar todo el espacio en blanco alrededor
  const trimmedDataUrl = await trimDataUrl(data);

  const base64Data = trimmedDataUrl.split(',')[1];
  const byteChars = atob(base64Data);
  const byteNumbers = new Array(byteChars.length);

  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'image/png' });

  emit('signature-changed', blob);
};

defineExpose({
  save,
  undo,
  clear
});
</script>

<template>
  <div>
    <div class="signature-pad-wrapper" ref="padWrapper">
      <VueSignaturePad
        ref="signaturePad"
        width="100%"
        height="200px"
        :options="{ penColor: 'black', backgroundColor: 'rgba(0,0,0,0)' }"
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
  background-color: transparent;
}

.button-group > *:not(:last-child) {
  margin-right: 12px !important;
}
</style>
