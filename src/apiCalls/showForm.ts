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
      return response.data; // Retornar los datos para que el componente pueda usarlos
    } catch (err) {
      console.error('Error fetching form:', err);
      // Aseguramos que el tipo de error sea 'any' para evitar problemas de tipo
      error.value = err as any; // Guardar el error para que el componente pueda accederlo
      throw err; // Re-lanzar para que el componente pueda manejarlo
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
