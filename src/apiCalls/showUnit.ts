import { ref } from 'vue';
import axiosInstance from '@/utils/axios';

export function showUnit() {
  const unit = ref(null);
  const loading = ref(false);
  const error = ref(null);

  const fetchUnit = async (id: number) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await axiosInstance.get(`/business-units/${id}`);
      unit.value = response.data;
    } catch (err) {
      console.error('Error fetching organization:', err);
    } finally {
      loading.value = false;
    }
  };

  return {
    unit,
    loading,
    error,
    fetchUnit
  };
}
