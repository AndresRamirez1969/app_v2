<script setup lang="ts">
import { ref } from 'vue';
// icons
import { EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons-vue';
import { Form } from 'vee-validate';
import axiosInstance from '@/utils/axios';
import {useRouter} from 'vue-router';

const valid = ref(false);
const show1 = ref(false);
const password = ref('');
const username = ref('');
const router = useRouter();
// Password validation rules
const passwordRules = ref([
  (v: string) => !!v || 'Ingresa tu contrasena',
]);
// Email validation rules
const emailRules = ref([
  (v: string) => !!v.trim() || 'Ingresa tu correo',
  (v: string) => {
    const trimmedEmail = v.trim();
    return !/\s/.test(trimmedEmail) || 'El correo no puede contener espacios';
  },
  (v: string) => /.+@.+\..+/.test(v.trim()) || 'E-mail must be valid'
]);

 
const validate = async () => {
  try {
    const res = await axiosInstance.post('/login', {
      email: username.value,
      password: password.value,
    });
    console.log("Success!", res);
    router.push('/sample-page');
  } catch (err) {
    console.log("Failure", err);
  }
}
</script>

<template>
  <div class="d-flex justify-space-between align-center">
    <h3 class="text-h3 text-center mb-0">Login</h3>
  </div>
  <Form @submit="validate" class="mt-7 loginForm" v-slot="{isSubmitting }">
    <div class="mb-6">
      <v-label>Correo/Usuario</v-label>
      <v-text-field
        aria-label="email address"
        v-model="username"
        :rules="emailRules"
        class="mt-2"
        required
        hide-details="auto"
        variant="outlined"
        color="primary"
        placeholder="example@domain.com"
        @input="username"
      ></v-text-field>
    </div>
    <div>
      <v-label>Contrasena</v-label>
      <v-text-field
        aria-label="password"
        v-model="password"
        :rules="passwordRules"
        required
        variant="outlined"
        color="primary"
        hide-details="auto"
        :type="show1 ? 'text' : 'password'"
        class="mt-2"
        placeholder="*******"
        @input="password"
      >
        <template v-slot:append-inner>
          <v-btn color="secondary" icon rounded variant="text">
            <EyeInvisibleOutlined :style="{ color: 'rgb(var(--v-theme-secondary))' }" v-if="show1 == false" @click="show1 = !show1" />
            <EyeOutlined :style="{ color: 'rgb(var(--v-theme-secondary))' }" v-if="show1 == true" @click="show1 = !show1" />
          </v-btn>
        </template>
      </v-text-field>
    </div>

    <div class="d-flex align-center mt-4 mb-7 mb-sm-0">
      <div class="ml-auto">
        <router-link to="/login1" class="text-darkText link-hover">Forgot Password?</router-link>
      </div>
    </div>
    <v-btn color="primary" :loading="isSubmitting" block class="mt-5" variant="flat" size="large" :disabled="valid" @click="validate()">
      Login</v-btn
    >
  </Form>
</template>
<style lang="scss">
.loginForm {
  .v-text-field .v-field--active input {
    font-weight: 500;
  }
}
</style>
