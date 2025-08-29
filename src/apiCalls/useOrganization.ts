import { ref } from 'vue';
import axiosInstance from '@/utils/axios';

export function useOrganization() {
  const organization = ref(null);
  const loading = ref(false);
  const error = ref(null);

  const fetchOrganization = async (id: number) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await axiosInstance.get(`/organizations/${id}`);
      organization.value = response.data;
    } catch (err) {
      error.value = null;
      console.error('Error fetching organization:', err);
    } finally {
      loading.value = false;
    }
  };

  return {
    organization,
    loading,
    error,
    fetchOrganization
  };
}
