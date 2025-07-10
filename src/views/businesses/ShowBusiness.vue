<template>
  <v-progress-circular v-if="loadingBusiness" indeterminate color="primary" />

  <v-card v-else-if="business" class="pa-6 rounded-lg elevation-3">
    <v-toolbar class="mb-4" density="compact" title="Detalles del Negocio">
      <template v-slot:append v-if="!isSponsor">
        <v-btn icon @click="editMode ? saveChanges() : (editMode = true)">
          <v-icon :icon="editMode ? mdiCheck : mdiPencil" />
        </v-btn>
        <v-btn icon v-if="editMode" @click="cancelEdit">
          <v-icon :icon="mdiCancel" />
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
    </v-row>
  </v-card>

  <div v-else class="text-center pa-4 text-grey"><v-progress-circular indeterminate color="primary" /></div>
</template>

<script setup>
import { onMounted, ref, watch, computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { showBusiness } from '@/apiCalls/showBusiness';
import { updateBusiness } from '@/apiCalls/updateBusiness';
import { mdiPencil, mdiCancel, mdiCheck } from '@mdi/js';
import { useRoute } from 'vue-router';

const route = useRoute();
const businessId = route.params.id;
const auth = useAuthStore();

const isSponsor = computed(() => {
  return auth.user?.roles?.some((role) => role.name === 'sponsor');
});

const { business, loadingBusiness, fetchBusiness } = showBusiness();

const editMode = ref(false);
const form = ref({});

fetchBusiness(businessId);

onMounted(() => {
  fetchBusiness(businessId);
});

watch(business, (bus) => {
  if (bus) form.value = JSON.parse(JSON.stringify(bus));
});

const cancelEdit = () => {
  form.value = JSON.parse(JSON.stringify(business.value));
  editMode.value = false;
};

const saveChanges = async () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { people, ...busData } = form.value;
  const updated = await updateBusiness(busData);
  business.value = updated;
  form.value = JSON.parse(JSON.stringify(updated));
  editMode.value = false;
};
</script>
