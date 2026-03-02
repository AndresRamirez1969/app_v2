<script setup>
import { BrowserMultiFormatReader } from '@zxing/browser';
import { ref, onMounted, onBeforeUnmount } from 'vue';

const props = defineProps({
  fieldId: { type: [String, Number], default: null }
});

const emit = defineEmits(['scanned', 'close']);

const video = ref(null);
const results = ref([]);

const scannedSet = ref(new Set());
const scannedMessage = ref('');
let msgTimer = null;

let codeReader = null;
let scannerControls = null;

function showAlreadyScanned() {
  scannedMessage.value = 'Código ya escaneado';
  if (msgTimer) clearTimeout(msgTimer);
  msgTimer = setTimeout(() => {
    scannedMessage.value = '';
  }, 2000);
}

onMounted(async () => {
  codeReader = new BrowserMultiFormatReader();

  try {
    const devices = await BrowserMultiFormatReader.listVideoInputDevices();
    const backCamera = devices.find((d) => d.label.toLowerCase().includes('back'));

    scannerControls = await codeReader.decodeFromVideoDevice(backCamera?.deviceId || devices[0]?.deviceId, video.value, (res) => {
      if (!res) return;

      const code = res.getText();
      const formatEnum = res.getBarcodeFormat();
      const format = String(formatEnum);

      if (scannedSet.value.has(code)) {
        showAlreadyScanned();
        return;
      }

      scannedSet.value.add(code);
      results.value.push({ code, format });
      emit('scanned', { code, format });
      console.log('Scanned', code);
    });
  } catch (error) {
    console.error(error);
  }
});

function stopScanner() {
  try {
    scannerControls?.stop();
  } catch (e) {
    console.warn(e);
  } finally {
    scannerControls = null;
    emit('close');
  }
}

onBeforeUnmount(() => {
  if (scannerControls) scannerControls.stop();
  if (msgTimer) clearTimeout(msgTimer);
});
</script>

<template>
  <div class="scanner-container">
    <div class="scanner-video-wrapper">
      <video ref="video" class="scanner-video"></video>
      <div class="scan-frame"></div>
    </div>

    <div v-if="scannedMessage" class="text-caption text-warning mt-2">
      {{ scannedMessage }}
    </div>

    <p v-if="results.length > 0">Scanned: {{ results.map((r) => `${r.code} (${r.format})`).join(', ') }}</p>
    <v-btn variant="outlined" color="primary" class="mt-2" @click="stopScanner()"> Detener </v-btn>
  </div>
</template>

<style scoped>
.scanner-container {
  position: relative;
}

.scanner-video-wrapper {
  position: relative;
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
  overflow: hidden;
}

.scanner-video {
  width: 100%;
  display: block;
}

.scan-frame {
  position: absolute;
  left: 10%;
  width: 80%;
  height: 3px;
  background: red;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}
</style>
