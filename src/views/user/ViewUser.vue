<!-- src/views/UserProfile.vue -->
<template>
  <v-progress-circular v-if="loading" indeterminate color="primary" />

  <v-card v-else class="pa-6 rounded-lg elevation-3">
    <v-toolbar class="mb-4" density="compact" title="Perfil de Usuario"> </v-toolbar>

    <v-row dense>
      <v-col cols="12" md="6">
        <v-file-input
          v-model="form.profile_picture"
          label="Foto de Perfil"
          accept="image/*"
          prepend-icon="mdi-camera"
          show-size
          variant="outlined"
        />
      </v-col>
      <v-col cols="12">
        <div class="mb-4">
          <v-text-field v-model="form.name" label="Nombre" density="compact" variant="outlined" />
        </div>
      </v-col>
      <v-col cols="12">
        <div class="mb-4">
          <v-text-field v-model="form.email" label="Correo Electrónico" variant="outlined" density="compact" />
        </div>
      </v-col>

      <div class="mb-4">
        <strong class="text-grey-darken-1">Rol:</strong>
        <v-chip color="primary" v-for="role in auth?.user.roles" :key="role.name" class="me-2">
          {{ role.name }}
        </v-chip>
      </div>

      <div class="mb-4">
        <strong class="text-grey-darken-1">Estado:</strong>
        <v-chip :color="user.status === 'active' ? 'green' : 'red'" class="mt-1">
          {{ user.status === 'active' ? 'Activo' : 'Inactivo' }}
        </v-chip>
      </div>
    </v-row>
    <v-row justify="end" class="mt-4">
      <v-btn color="primary" @click="saveChanges"> Guardar Cambios </v-btn>
    </v-row>
  </v-card>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import axiosInstance from '@/utils/axios';
import { useToast } from 'vue-toastification';

const auth = useAuthStore();
const user = ref({});
const loading = ref(true);
const toast = useToast();

const form = ref({
  name: '',
  email: '',
  profile_picture: null
});

const saveChanges = async () => {
  const formData = new FormData();
  formData.append('name', form.value.name);
  formData.append('email', form.value.email);
  formData.append('profile_picture', form.value.profile_picture);
  try {
    const response = await axiosInstance.put(`/users/${auth.user.id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    auth.user = response.data;
    localStorage.setItem('authUser', JSON.stringify(response.data));
    toast.success('Perfil Actualizado');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    toast.error('Error al actualizar perfil');
  }
};

const fetchUser = async () => {
  try {
    const res = await axiosInstance.get('/user');
    user.value = res.data;
    form.value = { name: res.data.name };
  } finally {
    loading.value = false;
  }
};

onMounted(fetchUser);
</script>
