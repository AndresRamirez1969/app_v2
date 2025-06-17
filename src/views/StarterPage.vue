<script setup lang="ts">
import { ref, shallowRef } from 'vue';
import AddressAutocomplete from '@/utils/helpers/AddressAutocomplete.vue';

import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import UiParentCard from '@/components/shared/UiParentCard.vue';

const page = ref({ title: 'Organizaciones' });
const breadcrumbs = shallowRef([
  {
    title: 'Organizaciones',
    disabled: true,
    href: '#'
  }
]);
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs"></BaseBreadcrumb>
  <v-row>
    <v-col cols="12" md="12">
      <UiParentCard title="Agrega Una Organizacion">
        <v-form ref="Regform" lazy-validation action="/dashboards/analytical" class="container mt-5">
    <v-row class="my-0">
      <v-col cols="12" sm="6" class="py-0">
        <div class="mb-6">
          <v-label>Nombre Legal</v-label>
          <v-text-field
            v-model="legal_name"
            required
            variant="outlined"
            class="mt-2"
            color="primary"
          ></v-text-field>
        </div>
      </v-col>
    <v-col cols="12" sm="6" class="py-0">
    <div class="mb-6">
      <v-label>Alias</v-label>
      <v-text-field
        v-model="alias"
        class="mt-2"
        variant="outlined"
        color="primary"
      ></v-text-field>
    </div>
  </v-col>
</v-row>
    <div class="mb-6">
      <v-label>Descripcion</v-label>
      <v-text-field
        v-model="descripcion"
        variant="outlined"
        color="primary"
        class="mt-2"
      >
      </v-text-field>
    </div>
  <div class="mb-6">
    <AddressAutocomplete />
  </div>
    <div class="d-sm-inline-flex align-center mt-2 mb-7 mb-sm-0 font-weight-bold">
    </div>
    <v-btn color="primary" block class="mt-4" variant="flat" size="large" @click="validate()">Create Account</v-btn>
  </v-form>
      </UiParentCard>
    </v-col>
  </v-row>
</template>
