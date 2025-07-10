import axiosInstance from '@/utils/axios';

export async function updateBusiness(updatedBus) {
  try {
    const response = await axiosInstance.put(`/businesses/${updatedBus.id}`, updatedBus);
    return response.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}
