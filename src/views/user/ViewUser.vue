<!-- src/views/UserProfile.vue -->
<template>
  <v-progress-circular v-if="loading" indeterminate color="primary" />

  <v-card v-else class="pa-6 rounded-lg elevation-3">
    <v-toolbar class="mb-4" density="compact" title="Perfil de Usuario"> </v-toolbar>

    <v-row dense>
      <v-img
        v-if="user.profile_picture"
        :src="user.profile_picture"
        max-height="200"
        max-width="250"
        class="mb-4 rounded"
        cover
        :alt="form.name"
      />
      <v-col cols="12" md="6">
        <v-file-input
          v-model="form.profile_picture"
          label="Cambiar Foto"
          accept="image/*"
          prepend-icon="mdi-camera"
          chips
          variant="outlined"
          density="compact"
          class="my-2"
          style="max-width: 300px"
        />
        <div class="mb-4">
          <v-text-field v-model="form.name" label="Nombre" density="compact" variant="outlined" />
        </div>
        <div class="mb-4">
          <v-text-field v-model="form.email" label="Correo Electrónico" variant="outlined" density="compact" />
        </div>
      </v-col>

      <div class="mb-4">
        <strong class="text-grey-darken-1">Rol:</strong>
        <v-chip color="primary" v-for="role in auth?.user.roles" :key="role.name" class="md-2">
          {{ role.name === 'admin' ? 'Administrador' : 'Colaborador' }}
        </v-chip>
      </div>

      <div class="mb-4">
        <strong class="text-grey-darken-1">Estado:</strong>
        <v-chip :color="user.status === 'active' ? 'green' : 'red'" class="md-2">
          {{ user.status === 'active' ? 'Activo' : 'Inactivo' }}
        </v-chip>
      </div>
      <template v-if="passwordVerify">
        <v-col cols="12">
          <v-text-field v-model="new_password" label="Nueva Contraseña" type="password" variant="outlined" density="compact" />
        </v-col>

        <v-col cols="12">
          <v-text-field
            v-model="confirm_new_password"
            label="Confirmar Nueva Contraseña"
            type="password"
            variant="outlined"
            density="compact"
          />
        </v-col>
      </template>
    </v-row>
    <v-row justify="end" class="mt-4">
      <v-btn color="primary" @click="saveChanges"> Guardar Cambios </v-btn>
      <template v-if="!passwordVerify">
        <v-btn color="secondary" class="ml-2" @click="showPasswordModal = true"> Cambiar Contraseña </v-btn>
      </template>
      <template v-else>
        <v-btn color="secondary" class="ml-2" @click="changePassword"> Guardar Contraseña </v-btn>
      </template>
    </v-row>
  </v-card>
  <v-dialog v-model="showPasswordModal" persistent max-width="500px">
    <v-card>
      <v-card-title class="text-h6">Verificar Contraseña</v-card-title>
      <v-card-text>
        <v-text-field v-model="currPassword" label="Contraseña Actual" :type="show1 ? 'text' : 'password'" variant="outlined" />
        <template v-slot:append-inner>
          <v-btn color="secondary" icon rounded variant="text">
            <EyeInvisibleOutlined :style="{ color: 'rgb(var(--v-theme-secondary))' }" v-if="show1 == false" @click="show1 = !show1" />
            <EyeOutlined :style="{ color: 'rgb(var(--v-theme-secondary))' }" v-if="show1 == true" @click="show1 = !show1" />
          </v-btn>
        </template>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn text @click="showPasswordModal = false">Cancelar</v-btn>
        <v-btn color="primary" @click="verifyPassword">Confirmar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import axiosInstance from '@/utils/axios';
import { useToast } from 'vue-toastification';

const auth = useAuthStore();
const user = ref({});
const loading = ref(true);
const show1 = ref(false);
const toast = useToast();
const showPasswordModal = ref(false);
const passwordVerify = ref(false);
const currPassword = ref('');
const new_password = ref('');
const confirm_new_password = ref('');

const form = ref({
  name: '',
  email: '',
  profile_picture: null
});

const saveChanges = async () => {
  const formData = new FormData();
  formData.append('name', form.value.name);
  formData.append('email', form.value.email);
  if (form.value.profile_picture instanceof File) {
    formData.append('profile_picture', form.value.profile_picture);
  }
  formData.append('_method', 'PUT');
  try {
    const response = await axiosInstance.post(`/users/${auth.user.id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    const userRes = await axiosInstance.get('/user');
    user.value = userRes.data;

    if (user.value.profile_picture) {
      user.value.profile_picture += `?t=${Date.now()}`;
    }
    auth.user = user.value;
    localStorage.setItem('authUser', JSON.stringify(user.value));
    toast.success('Perfil Actualizado');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    toast.error('Error al actualizar perfil');
  }
};

const verifyPassword = async () => {
  try {
    await axiosInstance.post(`/verify-password/${auth.user.id}`, {
      password: currPassword.value
    });

    passwordVerify.value = true;
    showPasswordModal.value = false;
    toast.success('Contraseña verificada');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    toast.error('Contraseña no válida');
    passwordVerify.value = false;
  }
};

const changePassword = async () => {
  await axiosInstance.post('/change-password', {
    current_password: currPassword.value,
    new_password: new_password.value,
    new_password_confirmation: confirm_new_password.value
  });
  toast.success('Contrasena actualizada con exito');
  passwordVerify.value = false;
};

const fetchUser = async () => {
  try {
    const res = await axiosInstance.get('/user');
    user.value = res.data;
    form.value.name = res.data.name;
    form.value.email = res.data.email;
    form.value.profile_picture = res.data.profile_picture;
  } finally {
    loading.value = false;
  }
};

onMounted(fetchUser);
</script>
