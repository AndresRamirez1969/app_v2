import { ref } from 'vue';
import axiosInstance from '@/utils/axios';

export function showForm() {
  const form = ref(null);
  const loading = ref(false);
  const error = ref(null);

  const fetchForm = async (id: number) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await axiosInstance.get(`/forms/${id}`);
      form.value = response.data;
    } catch (err) {
      error.value = null;
      console.error('Error fetching organization:', err);
    } finally {
      loading.value = false;
    }
  };

  return {
    form,
    loading,
    error,
    fetchForm
  };
}
