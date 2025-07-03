import axiosInstance from '@/utils/axios';

export async function updateOrganization(updatedOrg) {
  try {
    const response = await axiosInstance.put(`/organizations/${updatedOrg.id}`, updatedOrg);
    return response.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}
