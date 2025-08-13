<script setup>
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';
import axiosInstance from '@/utils/axios';
import {
  ADMIN_ORG_ROLES,
  ADMIN_BUSINESS_ROLES,
  ADMIN_UNIT_ROLES,
  ADMIN_USER_ROLES,
  ADMIN_FORM_ROLES,
  ADMIN_RESPONSE_ROLES
} from '@/constants/constants';
import { mdiArrowLeft } from '@mdi/js';
const auth = useAuthStore();
const router = useRouter();

const Regform = ref('');
const name = ref('');
const orgPermissions = ref([]);
const businessPermissions = ref([]);
const userPermissions = ref([]);
const unitPermissions = ref([]);
const formPermissions = ref([]);
const responsePermissions = ref([]);
const organizationId = auth?.user?.organization_id;

const loading = ref(false);
const errorMessage = ref('');

const validate = async () => {
  try {
    loading.value = true;
    const allPermissions = [
      ...orgPermissions.value,
      ...businessPermissions.value,
      ...userPermissions.value,
      ...unitPermissions.value,
      ...formPermissions.value,
      ...responsePermissions.value
    ].filter((p) => p !== null && p !== undefined);

    const res = await axiosInstance.post('/roles', {
      name: name.value,
      permissions: allPermissions,
      organization_id: organizationId
    });

    console.log('Role added', res);
    router.push('/roles');
  } catch (err) {
    console.error('Failed to save Role', err);
    errorMessage.value = 'Error al crear el rol';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div>
    <v-container fluid>
      <v-row class="align-center justify-space-between mb-4">
        <v-col cols="auto" class="d-flex align-center">
          <v-btn color="primary" variant="outlined" @click="router.back()">
            <v-icon :icon="mdiArrowLeft" />
            Volver
          </v-btn>
          <h3 class="font-weight-medium mb-0">Crear Rol</h3>
        </v-col>
      </v-row>
      <v-card>
        <v-card-text>
          <v-form ref="Regform" lazy-validation class="container mt-5">
            <v-row class="my-0">
              <v-col cols="12" sm="6" class="py-0">
                <div class="mb-6">
                  <v-label>Nombre del Rol</v-label>
                  <v-text-field
                    v-model="name"
                    required
                    variant="outlined"
                    class="mt-2"
                    color="primary"
                    :error-messages="errorMessage"
                    @input="errorMessage = ''"
                  ></v-text-field>
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
                    label="Selecciona los permisos"
                    multiple
                    chips
                    closable-chips
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
                    label="Selecciona los permisos"
                    multiple
                    chips
                    closable-chips
                  />
                </div>
              </v-col>
            </v-row>

            <v-row class="my-0">
              <v-col cols="12" sm="6" class="py-0">
                <div class="mb-6">
                  <v-label>Permisos de Formularios</v-label>
                  <v-select
                    v-model="formPermissions"
                    :items="ADMIN_FORM_ROLES"
                    item-title="label"
                    item-value="value"
                    variant="outlined"
                    color="primary"
                    class="mt-2"
                    label="Selecciona los permisos"
                    multiple
                    chips
                    closable-chips
                  />
                </div>
              </v-col>
              <v-col cols="12" sm="6" class="py-0">
                <div class="mb-6">
                  <v-label>Permisos de Reportes</v-label>
                  <v-select
                    v-model="responsePermissions"
                    :items="ADMIN_RESPONSE_ROLES"
                    item-title="label"
                    item-value="value"
                    variant="outlined"
                    color="primary"
                    class="mt-2"
                    label="Selecciona los permisos"
                    multiple
                    chips
                    closable-chips
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
                    label="Selecciona los permisos"
                    multiple
                    chips
                    closable-chips
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
                    label="Selecciona los permisos"
                    multiple
                    chips
                    closable-chips
                  />
                </div>
              </v-col>
            </v-row>

            <v-divider class="my-6" />

            <v-row class="my-0">
              <v-col cols="12" class="d-flex justify-end gap-3">
                <v-btn variant="outlined" @click="router.back()" :disabled="loading"> Cancelar </v-btn>
                <v-btn color="primary" variant="flat" size="large" @click="validate()" :loading="loading"> Crear Rol </v-btn>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
      </v-card>
    </v-container>
  </div>
</template>
