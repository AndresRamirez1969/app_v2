<template>
  <v-progress-circular v-if="loadingOrg" indeterminate color="primary" />

  <v-card v-else-if="organization" class="pa-6 rounded-lg elevation-3">
    <v-card-title class="text-h5 font-weight-bold mb-6 text-primary"> Detalles de tu Organización </v-card-title>

    <v-row dense>
      <!-- Left Column: Logo & Legal Name -->
      <v-col cols="12" md="6">
        <v-img v-if="organization.logo" :src="organization.logo" max-height="120" max-width="250" class="mb-4 rounded" cover />
        <div class="mb-4">
          <strong class="text-grey-darken-1">Nombre Legal:</strong>
          <div class="text-subtitle-1 font-weight-medium">{{ organization.legal_name || '—' }}</div>
        </div>
        <div class="mb-4">
          <strong class="text-grey-darken-1">Alias:</strong>
          <div>{{ organization.alias || '—' }}</div>
        </div>
      </v-col>

      <!-- Right Column: Status, Folio, Description -->
      <v-col cols="12" md="6">
        <div class="mb-4">
          <strong class="text-grey-darken-1">Estado:</strong>
          <div>
            <v-chip :color="organization.status === 'active' ? 'green' : 'red'" size="small" class="mt-1" dark>
              {{ organization.status === 'active' ? 'Activo' : 'Inactivo' }}
            </v-chip>
          </div>
        </div>
        <div class="mb-4" v-if="organization.folio">
          <strong class="text-grey-darken-1">Folio:</strong>
          <div>{{ organization.folio }}</div>
        </div>
        <div class="mb-4">
          <strong class="text-grey-darken-1">Descripción:</strong>
          <div>{{ organization.description || '—' }}</div>
        </div>
      </v-col>

      <!-- Address -->
      <v-col cols="12" v-if="organization.address">
        <strong class="text-grey-darken-1">Dirección:</strong>
        <div class="mt-1">
          {{ organization.address.street }}, {{ organization.address.city }}, {{ organization.address.state }},
          {{ organization.address.postal_code }}
        </div>
      </v-col>

      <!-- Contacts -->
      <v-col class="mt-4" cols="12" v-if="organization.people">
        <strong class="text-grey-darken-1">Contacto:</strong>
        <v-list class="mt-1">
          <v-list-item v-for="(person, i) in organization.people" :key="i" class="px-0 py-1">
            <v-list-item-content>
              <v-list-item-title class="font-weight-medium"> 👤 {{ person.first_name }} {{ person.last_name }} </v-list-item-title>
              <v-list-item-title> 📧 {{ person.email }} 📞 {{ person.phone_number }} </v-list-item-title>
            </v-list-item-content>
          </v-list-item>
        </v-list>
      </v-col>
      <v-toolbar density="compact">
        <template v-slot:append>
          <v-btn icon @click="showDialog = false">
            <v-icon :icon="mdiPencil" />
          </v-btn>
          <v-btn icon @click="showDialog = false">
            <v-icon :icon="mdiDeleteAlert" />
          </v-btn>
          <v-btn icon @click="showDialog = false">
            <v-icon :icon="mdiDotsVertical" />
          </v-btn>
        </template>
      </v-toolbar>
    </v-row>
  </v-card>

  <div v-else class="text-center pa-4 text-grey"><v-progress-circular indeterminate color="primary" /></div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useOrganization } from '@/apiCalls/useOrganization';
import { mdiPencil, mdiDeleteAlert, mdiDotsVertical } from '@mdi/js';

const auth = useAuthStore();
const { organization, loadingOrg, fetchOrganization } = useOrganization();

fetchOrganization(auth.user?.organization_id);

onMounted(() => {
  if (auth.user?.organization_id) {
    fetchOrganization(auth.user.organization_id);
  }
});
</script>
