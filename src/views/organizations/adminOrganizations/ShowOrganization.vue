<template>
  <v-progress-circular v-if="loadingOrg" indeterminate color="primary" />

  <v-card v-else-if="organization" class="pa-6 rounded-lg elevation-3">
    <v-toolbar class="mb-4" density="compact" title="Detalles de la Organizacion">
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
        <v-img v-if="organization.logo" :src="organization.logo" max-height="120" max-width="250" class="mb-4 rounded" cover />
        <div class="mb-4">
          <strong class="text-grey-darken-1">Nombre Legal:</strong>
          <div v-if="!editMode" class="text-subtitle-1 font-weight-medium">{{ organization.legal_name || '—' }}</div>
          <v-text-field v-else v-model="form.legal_name" variant="outlined" density="compact" />
        </div>
        <div class="mb-4">
          <strong class="text-grey-darken-1">Alias:</strong>
          <div v-if="!editMode">{{ organization.alias || '—' }}</div>
          <v-text-field v-else v-model="form.alias" variant="outlined" density="compact" />
        </div>
      </v-col>

      <!-- Right Column: Status, Folio, Description -->
      <v-col cols="12" md="6">
        <div class="mb-4">
          <strong class="text-grey-darken-1">Estado:</strong>
          <div v-if="!editMode">
            <v-chip :color="organization.status === 'active' ? 'green' : 'red'" size="small" class="mt-1" dark>
              {{ organization.status === 'active' ? 'Activo' : 'Inactivo' }}
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
        <div class="mb-4" v-if="organization.folio">
          <strong class="text-grey-darken-1">Folio:</strong>
          <div>{{ organization.folio }}</div>
        </div>
        <div class="mb-4">
          <strong class="text-grey-darken-1">Descripción:</strong>
          <div v-if="!editMode">{{ organization.description || '—' }}</div>
          <v-textarea v-else v-model="form.description" variant="outlined" density="compact" rows="2" />
        </div>
      </v-col>

      <!-- Address -->
      <v-col cols="12" v-if="organization.address">
        <strong class="text-grey-darken-1">Dirección:</strong>
        <div v-if="!editMode" class="mt-1">
          {{ organization.address.street }}, {{ organization.address.city }}, {{ organization.address.state }},
          {{ organization.address.postal_code }}
        </div>
        <div v-else>
          <AddressAutocomplete @update:parsedAddress="handleParsedAddress" :initial-value="form.address" />
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

      <!-- Businesses -->
      <v-col class="mt-4" cols="12">
        <strong class="text-grey-darken-1">Negocios:</strong>
        <v-list class="mt-1" v-if="organization.businesses">
          <v-list-item v-for="(business, i) in organization.businesses" :key="i" class="px-0 py-1">
            <v-list-item-content>
              <v-list-item-title class="font-weight-medium"> - {{ business.legal_name }} </v-list-item-title>
              <v-list-item-title> {{ business.address }} </v-list-item-title>
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

  <div v-else class="text-center pa-4 text-grey"><v-progress-circular indeterminate color="primary" /></div>
</template>

<script setup>
import { onMounted, ref, watch, computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useOrganization } from '@/apiCalls/useOrganization';
import { mdiPencil, mdiCancel, mdiCheck, mdiPlus } from '@mdi/js';
import { updateOrganization } from '@/apiCalls/updateOrganization';
import AddressAutocomplete from '@/utils/helpers/google/AddressAutocomplete.vue';

const auth = useAuthStore();
const parsedAddress = ref({});

const handleParsedAddress = (val) => {
  parsedAddress.value = val;
};

const isSponsor = computed(() => {
  return auth.user?.roles?.some((role) => role.name === 'sponsor');
});

const { organization, loadingOrg, fetchOrganization } = useOrganization();

const editMode = ref(false);
const form = ref({});

fetchOrganization(auth.user?.organization_id);

onMounted(() => {
  if (auth.user?.organization_id) {
    fetchOrganization(auth.user.organization_id);
  }
});

watch(organization, (org) => {
  if (org) form.value = JSON.parse(JSON.stringify(org));
});

const cancelEdit = () => {
  form.value = JSON.parse(JSON.stringify(organization.value));
  editMode.value = false;
};

const saveChanges = async () => {
  if (Object.keys(parsedAddress.value).length) {
    form.value.address = parsedAddress.value;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { people, ...orgData } = form.value;
  const updated = await updateOrganization(orgData);
  organization.value = updated;
  form.value = JSON.parse(JSON.stringify(updated));
  await fetchOrganization();
  editMode.value = false;
};
</script>
