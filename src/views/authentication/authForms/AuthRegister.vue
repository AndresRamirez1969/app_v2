<script setup lang="ts">
import { ref } from 'vue';
import axiosInstance from '@/utils/axios';
// icons
import { EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons-vue';
const show1 = ref(false);
const password = ref('');
const email = ref('');
const Regform = ref();
const name = ref('');
const confPassword = ref('');
// Password validation rules
const passwordRules = ref([
  (v: string) => !!v || 'Password is required',
  (v: string) => v === v.trim() || 'Password cannot start or end with spaces',
  (v: string) => v.length <= 12 || 'Password must be less than 10 characters'
]);
const confPasswordRules = ref([
  (v: string) => !!v || 'Confirma la contrasena',
  (v: string) => v === password.value || 'Las contrasenas son diferentes'
]);
const nameRules = ref([(v: string) => !!v || 'Name is required']);
// Email validation rules
const emailRules = ref([
  (v: string) => !!v.trim() || 'E-mail is required',
  (v: string) => {
    const trimmedEmail = v.trim();
    return !/\s/.test(trimmedEmail) || 'E-mail must not contain spaces';
  },
  (v: string) => /.+@.+\..+/.test(v.trim()) || 'E-mail must be valid'
]);

const validate = async () => {
  try {
    const res = await axiosInstance.post('/register', {
      name: name.value,
      email: email.value,
      password: password.value,
      password_confirmation: confPassword.value
    });
    console.log("success!", res);
  } catch (err) {
    console.log("Epic fail!", err);
  }
}
</script>

<template>
  <div class="d-flex justify-space-between align-center">
    <h3 class="text-h3 text-center mb-0">Sign up</h3>
    <router-link to="/login1" class="text-primary text-decoration-none">Already have an account?</router-link>
  </div>
  <v-form ref="Regform" lazy-validation action="/dashboards/analytical" class="mt-7 loginForm">
    <v-row class="my-0">
      <v-col cols="12" sm="6" class="py-0">
        <div class="mb-6">
          <v-label>Nombre*</v-label>
          <v-text-field
            v-model="name"
            :rules="nameRules"
            hide-details="auto"
            required
            variant="outlined"
            class="mt-2"
            color="primary"
            placeholder="Juan"
          ></v-text-field>
        </div>
      </v-col>
    </v-row>
    <div class="mb-6">
      <v-label>Correo*</v-label>
      <v-text-field
        v-model="email"
        :rules="emailRules"
        placeholder="demo@company.com"
        class="mt-2"
        required
        hide-details="auto"
        variant="outlined"
        color="primary"
        @input="email"
      ></v-text-field>
    </div>
    <div class="mb-6">
      <v-label>Contrasena</v-label>
      <v-text-field
        v-model="password"
        :rules="passwordRules"
        placeholder="*****"
        required
        variant="outlined"
        color="primary"
        hide-details="auto"
        :type="show1 ? 'text' : 'password'"
        class="mt-2"
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
    <div class="mb-6">
      <v-label>Confirma Contrasena</v-label>
      <v-text-field
        v-model="confPassword"
        :rules="confPasswordRules"
        placeholder="*****"
        required
        variant="outlined"
        color="primary"
        hide-details="auto"
        :type="show1 ? 'text' : 'password'"
        class="mt-2"
      >
        <template v-slot:append-inner>
          <v-btn color="secondary" icon rounded variant="text">
            <EyeInvisibleOutlined :style="{ color: 'rgb(var(--v-theme-secondary))' }" v-if="show1 == false" @click="show1 = !show1" />
            <EyeOutlined :style="{ color: 'rgb(var(--v-theme-secondary))' }" v-if="show1 == true" @click="show1 = !show1" />
          </v-btn>
        </template>
      </v-text-field>
    </div>

    <div class="d-sm-inline-flex align-center mt-2 mb-7 mb-sm-0 font-weight-bold">
      <h6 class="text-caption">
        By Signing up, you agree to our
        <router-link to="/register" class="text-primary link-hover font-weight-medium">Terms of Service </router-link>
        and
        <router-link to="/register" class="text-primary link-hover font-weight-medium">Privacy Policy</router-link>
      </h6>
    </div>
    <v-btn color="primary" block class="mt-4" variant="flat" size="large" @click="validate()">Create Account</v-btn>
  </v-form>
</template>
