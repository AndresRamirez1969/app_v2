import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useImportProgressStore = defineStore('importProgress', () => {
  const status = ref<'idle' | 'processing' | 'finished' | 'failed'>('idle');
  const total = ref(0);
  const processed = ref(0);

  function setProgress(data: { status: string; total: number; processed: number }) {
    status.value = data.status as any;
    total.value = data.total;
    processed.value = data.processed;
  }

  function resetProgress() {
    status.value = 'idle';
    total.value = 0;
    processed.value = 0;
  }

  return { status, total, processed, setProgress, resetProgress };
});
