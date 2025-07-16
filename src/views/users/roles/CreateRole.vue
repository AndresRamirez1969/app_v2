<script setup>
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import axiosInstance from '@/utils/axios';
import { ADMIN_ORG_ROLES, ADMIN_BUSINESS_ROLES, ADMIN_UNIT_ROLES, ADMIN_USER_ROLES } from '@/constants/constants';

const auth = useAuthStore();

const Regform = ref('');
const name = ref('');
const orgPermissions = ref([]);
const businessPermissions = ref([]);
const userPermissions = ref([]);
const unitPermissions = ref([]);
const organizationId = auth?.user?.organization_id;

const emit = defineEmits(['roleCreated']);

const props = defineProps({
  dialog: Boolean
});

const validate = async () => {
  try {
    const allPermissions = [
      ...orgPermissions.value,
      ...businessPermissions.value,
      ...userPermissions.value,
      ...unitPermissions.value
    ].filter((p) => p !== null && p !== undefined);

    const res = await axiosInstance.post('/roles', {
      name: name.value,
      permissions: allPermissions,
      organization_id: organizationId
    });

    console.log('Role added', res);
    emit('roleCreated');
  } catch (err) {
    console.error('Failed to save Role', err);
  }
};
</script>

<template>
  <v-dialog v-model="props.dialog" @update:model-value="(val) => emit('update:dialog', val)" max-width="800">
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        Crear Rol
        <v-btn icon @click="emit('update:dialog', false)">
          <v-icon :icon="mdiCancel" />
        </v-btn>
      </v-card-title>
      <v-card-text>
        <v-col cols="12" md="12">
          <v-form ref="Regform" lazy-validation action="/dashboards/analytical" class="container mt-5">
            <v-row class="my-0">
              <v-col cols="12" sm="6" class="py-0">
                <div class="mb-6">
                  <v-label>Nombre del Rol</v-label>
                  <v-text-field v-model="name" required variant="outlined" class="mt-2" color="primary"></v-text-field>
                </div>
              </v-col>
            </v-row>
            <v-row class="my-0">
              <v-col cols="12" sm="6" class="py-0">
                <div class="mb-6">
                  <v-label>Permisos de Organización</v-label>
                  <v-select
                    v-model="orgPermissions"
                    :items="ADMIN_ORG_ROLES"
                    item-title="label"
                    item-value="value"
                    variant="outlined"
                    color="primary"
                    class="mt-2"
                    label="Selecciona el Rol"
                    multiple
                  />
                </div>
              </v-col>
              <v-col cols="12" sm="6" class="py-0">
                <div class="mb-6">
                  <v-label>Permisos de Negocios</v-label>
                  <v-select
                    v-model="businessPermissions"
                    :items="ADMIN_BUSINESS_ROLES"
                    item-title="label"
                    item-value="value"
                    variant="outlined"
                    color="primary"
                    class="mt-2"
                    label="Selecciona el Rol"
                    multiple
                  />
                </div>
              </v-col>
            </v-row>
            <v-row class="my-0">
              <v-col cols="12" sm="6" class="py-0">
                <div class="mb-6">
                  <v-label>Permisos de Unidades</v-label>
                  <v-select
                    v-model="unitPermissions"
                    :items="ADMIN_UNIT_ROLES"
                    item-title="label"
                    item-value="value"
                    variant="outlined"
                    color="primary"
                    class="mt-2"
                    label="Selecciona el Rol"
                    multiple
                  />
                </div>
              </v-col>
              <v-col cols="12" sm="6" class="py-0">
                <div class="mb-6">
                  <v-label>Permisos de Usuarios</v-label>
                  <v-select
                    v-model="userPermissions"
                    :items="ADMIN_USER_ROLES"
                    item-title="label"
                    item-value="value"
                    variant="outlined"
                    color="primary"
                    class="mt-2"
                    label="Selecciona el Rol"
                    multiple
                  />
                </div>
              </v-col>
            </v-row>
            <div class="d-sm-inline-flex align-center mt-2 mb-7 mb-sm-0 font-weight-bold"></div>
            <v-btn color="primary" block class="mt-4" variant="flat" size="large" @click="validate()">Crear Rol</v-btn>
          </v-form>
          <v-divider class="my-6" />
        </v-col>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>
