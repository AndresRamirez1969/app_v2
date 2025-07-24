<template>
  <v-card class="pa-4 rounded-xl mb-4" :style="{ backgroundColor: '#E6F3FD', color: '#07395B' }" flat>
    <v-row align="center" no-gutters class="flex-column flex-md-row align-md-center">
      <v-col cols="12" md="auto" class="d-flex justify-center justify-md-start mb-4 mb-md-0">
        <v-avatar size="64" class="mr-4">
          <v-img :src="user.profile_picture || defaultAvatar" alt="Foto de Perfil" class="cursor-pointer" @click="$emit('view-photo')" />
        </v-avatar>
      </v-col>

      <v-col class="text-center text-md-left">
        <div class="text-subtitle-1 font-weight-bold">{{ user.name }}</div>
        <div class="text-body-2 text-grey-darken-1 font-weight-medium">
          <strong>Rol:</strong>
          {{
            user.roles?.[0] === 'superadmin'
              ? 'Super Administrador'
              : user.roles?.[0] === 'admin'
                ? 'Administrador'
                : user.roles?.[0] === 'sponsor'
                  ? 'Sponsor'
                  : user.roles?.[0] || ''
          }}
        </div>
      </v-col>

      <v-col cols="12" md="auto" class="d-flex justify-center justify-md-end mt-3 mt-md-0">
        <v-btn color="primary" class="text-capitalize" @click="$emit('change-photo')"> Cambiar Foto </v-btn>
      </v-col>
    </v-row>
  </v-card>
</template>

<script setup>
defineProps({ user: Object });
const defaultAvatar = '/images/default-avatar.png';
</script>
