<template>
  <div>
    <v-dialog :model-value="props.modal" @update:model-value="emit('update:modal', $event)" temporary max-width="1000" max-height="2000">
      <v-card flat>
        <v-card-title class="d-flex align-center justify-space-between">
          Detalles de Organización
          <v-btn icon @click="emit('update:modal', false)">
            <v-icon :icon="mdiCancel" />
          </v-btn>
        </v-card-title>
        <v-divider />

        <v-card-text>
          <v-list dense>
            <v-list-item>
              <v-list-item-title class="font-weight-bold">Nombre Legal</v-list-item-title>
              <v-list-item-subtitle>{{ org.legal_name }}</v-list-item-subtitle>
              <v-list-item-subtitle v-if="org.logo"><v-img :src="org.logo" max-height="100" max-width="200" cover /></v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <v-list-item-title class="font-weight-bold">Alias</v-list-item-title>
              <v-list-item-subtitle>{{ org.alias }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <v-list-item-title class="font-weight-bold">Descripción</v-list-item-title>
              <v-list-item-subtitle>{{ org.description }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <v-list-item-title class="font-weight-bold">Estado</v-list-item-title>
              <v-list-item-subtitle>{{ org.status }}</v-list-item-subtitle>
            </v-list-item>

            <!-- Address -->
            <v-list-group value="true" no-action>
              <template #activator="{ props }">
                <v-list-item v-bind="props">
                  <v-list-item-title class="font-weight-bold">Dirección</v-list-item-title>
                </v-list-item>
              </template>
              <v-list-item>
                <div class="text-body-2">
                  {{ org.address?.street }}, {{ org.address?.outdoor_number }}<br />
                  {{ org.address?.neighborhood }}, {{ org.address?.city }}<br />
                  {{ org.address?.state }}, {{ org.address?.country }} - {{ org.address?.postal_code }}
                </div>
              </v-list-item>
            </v-list-group>

            <!-- Contacts -->
            <v-list-group v-if="org.people?.length" value="true" no-action>
              <template #activator="{ props }">
                <v-list-item v-bind="props">
                  <v-list-item-title class="font-weight-bold">Contactos</v-list-item-title>
                </v-list-item>
              </template>
              <v-list-item v-for="(person, i) in org.people" :key="i">
                <div class="text-body-2">
                  {{ person.first_name }} {{ person.last_name }}<br />
                  📧 {{ person.email }}<br />
                  📞 {{ person.phone_number }}
                </div>
              </v-list-item>
            </v-list-group>

            <!-- Businesses -->
            <v-list-group value="true" no-action>
              <template #activator="{ props }">
                <v-list-item v-bind="props">
                  <v-list-item-title class="font-weight-bold">Negocios</v-list-item-title>
                </v-list-item>
              </template>
              <v-list-item v-for="(biz, i) in org.businesses" :key="i">
                <div class="text-body-2">
                  {{ biz.legal_name }}<br />
                  Alias: {{ biz.alias }}<br />
                  {{ biz.description }}
                </div>
              </v-list-item>
              <v-list-item>
                <v-btn>Agregar Negocio</v-btn>
              </v-list-item>
            </v-list-group>
          </v-list>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import axiosInstance from '@/utils/axios';
import { mdiCancel } from '@mdi/js';
import CreateBusiness from '@/views/businesses/components/CreateBusiness.vue';

const org = ref({});

const props = defineProps({
  modal: Boolean,
  organizationId: Number
});

const emit = defineEmits(['update:modal']);

watch(
  () => [props.modal, props.organizationId],
  async ([modalOpen, orgId]) => {
    if (modalOpen && orgId) {
      const res = await axiosInstance.get(`/organizations/${orgId}`);
      org.value = res.data;
    }
  },
  { immediate: true }
);
</script>
