<template>
  <div v-if="business">
    <v-card class="pa-6 rounded-lg elevation-3">
      <v-toolbar class="mb-4" density="compact" title="Detalles del Negocio">
        <template #prepend>
          <v-btn icon @click="goBack">
            <v-icon :icon="mdiArrowLeft" />
          </v-btn>
        </template>
      </v-toolbar>
      <v-row dense>
        <!-- Left Column: Logo & Legal Name -->
        <v-col cols="12" md="6">
          <v-img v-if="business.logo" :src="business.logo" max-height="120" max-width="250" class="mb-4 rounded" cover />
          <div class="mb-4">
            <strong class="text-grey-darken-1">Nombre Legal:</strong>
            <div v-if="!editMode" class="text-subtitle-1 font-weight-medium">{{ business.legal_name || '—' }}</div>
            <v-text-field v-else v-model="form.legal_name" variant="outlined" density="compact" />
          </div>
          <div class="mb-4">
            <strong class="text-grey-darken-1">Alias:</strong>
            <div v-if="!editMode">{{ business.alias || '—' }}</div>
            <v-text-field v-else v-model="form.alias" variant="outlined" density="compact" />
          </div>
        </v-col>

        <!-- Right Column: Status, Folio, Description -->
        <v-col cols="12" md="6">
          <div class="mb-4">
            <strong class="text-grey-darken-1">Estado:</strong>
            <div v-if="!editMode">
              <v-chip :color="business.status === 'active' ? 'green' : 'red'" size="small" class="mt-1" dark>
                {{ business.status === 'active' ? 'Activo' : 'Inactivo' }}
              </v-chip>
            </div>
            <v-select
              v-else
              v-model="form.status"
              :items="['active', 'inactive']"
              variant="outlined"
              density="compact"
              hide-details
              class="mt-1"
            />
          </div>
          <div class="mb-4" v-if="business.folio">
            <strong class="text-grey-darken-1">Folio:</strong>
            <div>{{ business.folio }}</div>
          </div>
          <div class="mb-4">
            <strong class="text-grey-darken-1">Descripción:</strong>
            <div v-if="!editMode">{{ business.description || '—' }}</div>
            <v-textarea v-else v-model="form.description" variant="outlined" density="compact" rows="2" />
          </div>
        </v-col>

        <!-- Address -->
        <v-col cols="12" v-if="business.address">
          <strong class="text-grey-darken-1">Dirección:</strong>
          <div v-if="!editMode" class="mt-1">
            {{ business.address.street }}, {{ business.address.city }}, {{ business.address.state }},
            {{ business.address.postal_code }}
          </div>
          <div v-else>
            <v-text-field v-model="form.address.street" label="Calle" density="compact" class="mb-2" />
            <v-text-field v-model="form.address.city" label="Ciudad" density="compact" class="mb-2" />
            <v-text-field v-model="form.address.state" label="Estado" density="compact" class="mb-2" />
            <v-text-field v-model="form.address.postal_code" label="Código Postal" density="compact" class="mb-2" />
          </div>
        </v-col>

        <!-- Contacts -->
        <v-col class="mt-4" cols="12" v-if="business.people">
          <strong class="text-grey-darken-1">Contacto:</strong>
          <v-list class="mt-1">
            <v-list-item v-for="(person, i) in business.people" :key="i" class="px-0 py-1">
              <v-list-item-content>
                <v-list-item-title class="font-weight-medium"> 👤 {{ person.first_name }} {{ person.last_name }} </v-list-item-title>
                <v-list-item-title> 📧 {{ person.email }} 📞 {{ person.phone_number }} </v-list-item-title>
              </v-list-item-content>
            </v-list-item>
          </v-list>
        </v-col>

        <!-- Businesses Units -->
        <v-col class="mt-4" cols="12">
          <strong class="text-grey-darken-1">Unidades de Negocio:</strong>
          <v-list class="mt-1" v-if="business.business_units">
            <v-list-item v-for="(units, i) in business.business_units" :key="i" class="px-0 py-1">
              <v-list-item-content>
                <v-list-item-title class="font-weight-medium"> - {{ units.legal_name }} </v-list-item-title>
                <v-list-item-title> {{ units.address }} </v-list-item-title>
              </v-list-item-content>
            </v-list-item>
          </v-list>
          <div v-else>
            <v-btn icon>
              <v-icon :icon="mdiPlus" />
            </v-btn>
          </div>
        </v-col>
      </v-row>
    </v-card>
  </div>
  <div v-else-if="loading">Cargando negocio...</div>
</template>

<script setup>
import { onMounted } from 'vue';
import { showBusiness } from '@/apiCalls/showBusiness';
import { mdiArrowLeft } from '@mdi/js';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const businessId = route.params.id;

const { business, loading, fetchBusiness } = showBusiness();

const goBack = () => {
  router.push('/negocios');
};

onMounted(() => {
  fetchBusiness(businessId);
});
</script>
