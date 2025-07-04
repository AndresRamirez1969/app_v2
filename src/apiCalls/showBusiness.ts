import { ref } from 'vue';
import axiosInstance from '@/utils/axios';

export function showBusiness() {
  const business = ref(null);
  const loading = ref(false);
  const error = ref(null);

  const fetchBusiness = async (id: number) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await axiosInstance.get(`/businesses/${id}`);
      business.value = response.data;
    } catch (err) {
      error.value = err;
      console.error('Error fetching organization:', err);
    } finally {
      loading.value = false;
    }
  };

  return {
    business,
    loading,
    error,
    fetchBusiness
  };
}
