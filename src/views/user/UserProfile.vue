<template>
  <v-container class="py-6" fluid>
    <v-row justify="start">
      <v-col cols="12">
        <h2 class="h3 font-weight-bold mb-4">Editar Perfil</h2>

        <UserProfileHeader :user="user" :roles="auth.user.roles" @change-photo="triggerFileInput" @view-photo="showImageModal = true" />

        <UserProfileForm :user="user" @update="updateUser" ref="formRef" @open-change-password="openPasswordModal" />

        <input type="file" ref="fileInput" accept="image/*" class="d-none" @change="handleImageChange" />

        <!-- <ImageViewer v-model="showImageModal" :image-url="user?.profile_picture" /> -->
        <ChangePasswordModal v-model="passwordModal" />
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import axiosInstance from '@/utils/axios';
import { useToast } from 'vue-toastification';

import UserProfileHeader from '@/components/profile/UserProfileHeader.vue';
import UserProfileForm from '@/components/profile/UserProfileForm.vue';
import ChangePasswordModal from '@/components/profile/ChangePasswordModal.vue';
//import ImageViewer from '@/components/profile/ImageViewer.vue';

const auth = useAuthStore();
const toast = useToast();

const user = ref({});
const fileInput = ref(null);
const formRef = ref(null);
const passwordModal = ref(false);
const showImageModal = ref(false);

const fetchUser = async () => {
  try {
    const response = await axiosInstance.get('/user');
    user.value = response.data;
  } catch (error) {
    toast.error('Error al obtener los datos del usuario.');
  }
};

const triggerFileInput = () => {
  fileInput.value.click();
};

const handleImageChange = async (event) => {
  const file = event.target.files[0];
  if (!file || !file.type.startsWith('image/')) {
    toast.error('El archivo debe ser una imagen válida.');
    return;
  }

  // Asegúrate de enviar los campos requeridos por el backend
  const formData = new FormData();
  formData.append('profile_picture', file);
  formData.append('name', user.value.name || '');
  formData.append('email', user.value.email || '');
  // El backend espera el rol como 'role'
  formData.append('role', user.value.roles?.[0] || 'user');
  formData.append('_method', 'PUT');

  try {
    await axiosInstance.post(`/users/${auth.user.id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    await auth.fetchUser();
    toast.success('Foto de perfil actualizada.');
    await fetchUser();
  } catch {
    toast.error('Error al actualizar la foto de perfil.');
  }
};

const updateUser = async (data) => {
  // También envía el rol actual
  const payload = {
    name: data.name,
    email: data.email,
    role: user.value.roles?.[0] || 'user',
    _method: 'PUT'
  };

  try {
    await axiosInstance.post(`/users/${auth.user.id}`, payload);
    await auth.fetchUser();
    toast.success('Perfil actualizado correctamente.');
    await fetchUser();
  } catch {
    toast.error('Error al actualizar el perfil.');
  }
};

const openPasswordModal = () => {
  passwordModal.value = true;
};

onMounted(fetchUser);
</script>
