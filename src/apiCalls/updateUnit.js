import axiosInstance from '@/utils/axios';

export async function updateUnit(updatedUnit) {
  try {
    const response = await axiosInstance.put(`/business-units/${updatedUnit.id}`, updatedUnit);
    return response.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}
