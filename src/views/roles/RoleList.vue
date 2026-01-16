<template>
  <div>
    <div v-if="isLoading" class="text-center py-8">
      <v-progress-circular indeterminate color="primary" size="64" />
      <p class="mt-4">Cargando roles...</p>
    </div>

    <template v-else>
      <div v-if="!items.length" class="text-center py-8">
        <p class="mt-4 text-h6 text-grey-darken-1">No existen roles</p>
        <p class="text-body-2 text-grey">
          No se encontraron roles con los filtros aplicados
        </p>
      </div>
      <div v-if="canCreate" class="mb-4 d-flex justify-end">
        <slot name="add-btn" />
      </div>

      <!-- Modo móvil (cards) -->
      <template v-if="isMobile">
        <v-row>
          <v-col cols="12" v-if="isSuperadmin">
            <h4 class="font-weight-bold mb-3">Organización</h4>
            <v-divider class="mb-4" />
          </v-col>
        </v-row>
        <v-card
          v-for="role in items"
          :key="role.id"
          class="mb-4 pa-3 elevation-1 rounded-lg row-clickable"
          @click="canView ? () => goToShow(role) : undefined"
          :style="{ cursor: canView ? 'pointer' : 'default' }"
        >
          <v-row no-gutters align="center" class="mb-1">
            <v-col cols="12">
              <div
                class="d-flex align-center mb-1"
                style="justify-content: space-between"
              >
                <div class="text-caption" style="margin-right: 8px">
                  <router-link
                    :to="`/roles/${role.id}`"
                    @click.stop
                    style="text-decoration: underline; color: #1976d2 !important"
                  >
                    {{ role.id }}
                  </router-link>
                </div>
              </div>
              <div class="font-weight-medium mb-1">
                {{ translateRoleName(role.name) }}
              </div>
              <!-- Solo superadmin ve la organización -->
              <div v-if="isSuperadmin" class="text-caption">
                <strong>Organización:</strong> {{ getOrganizationLabel(role) }}
              </div>
              <div class="text-caption">
                <strong>Permisos pertenecen a:</strong>
                <template v-if="getPermissionModels(role).length">
                  <v-chip
                    v-for="model in getPermissionModels(role)"
                    :key="model"
                    class="ma-1"
                    size="small"
                    color="primary"
                    text-color="white"
                  >
                    {{ model }}
                  </v-chip>
                </template>
                <span v-else>Sin permisos</span>
              </div>
            </v-col>
          </v-row>
        </v-card>
        <!-- PAGINACIÓN CENTRADA Y AZUL EN MOBILE -->
        <div class="d-flex justify-center mt-4">
          <v-pagination
            v-model="page"
            :length="totalPages"
            :total-visible="5"
            color="primary"
            @update:modelValue="emitPageChange"
          />
        </div>
      </template>

      <!-- Modo escritorio (tabla) -->
      <template v-else>
        <RoleTableMeta
          :items="items"
          :page="page"
          :itemsPerPage="itemsPerPage"
          :sortBy="sortBy"
          :sortDesc="sortDesc"
          :showOrganization="isSuperadmin"
          @update:page="emitPageChange"
          @sort="toggleSort"
        >
          <template #sort-icon="{ column }">
            <v-icon v-if="sortBy === column" size="16" class="ml-1">
              {{ sortDesc ? mdiChevronDown : mdiChevronUp }}
            </v-icon>
          </template>
          <template #header>
            <tr>
              <th class="id-cell">ID</th>
              <th class="name-cell">Nombre</th>
              <th v-if="isSuperadmin" class="org-cell">Organización</th>
              <th class="permissions-cell">Permisos pertenecen a</th>
              <th class="actions-cell"></th>
            </tr>
          </template>
          <template #rows>
            <template v-if="items.length">
              <tr
                v-for="role in items"
                :key="role.id"
                @click="canView ? goToShow(role) : null"
                class="row-clickable"
                :style="{ cursor: canView ? 'pointer' : 'default' }"
              >
                <td class="id-cell">
                  <router-link
                    :to="`/roles/${role.id}`"
                    @click.stop
                    style="text-decoration: underline; color: #1976d2 !important"
                  >
                    {{ role.id }}
                  </router-link>
                </td>
                <td class="name-cell">{{ translateRoleName(role.name) }}</td>
                <td v-if="isSuperadmin" class="org-cell">
                  <template
                    v-if="
                      role.organization &&
                      (role.organization.folio ||
                        role.organization.legal_name ||
                        role.organization.name)
                    "
                  >
                    <router-link
                      :to="`/organizaciones/${role.organization.id}`"
                      @click.stop
                      style="text-decoration: underline; color: #1976d2 !important"
                    >
                      {{ role.organization.folio ?? role.organization.id }} -
                      {{ role.organization.legal_name ?? role.organization.name }}
                    </router-link>
                  </template>
                  <template v-else>
                    {{ getOrganizationLabel(role) }}
                  </template>
                </td>
                <td v-else class="org-cell" style="display: none"></td>
                <td class="permissions-cell">
                  <template v-if="getPermissionModels(role).length">
                    <v-chip
                      v-for="model in getPermissionModels(role)"
                      :key="model"
                      class="ma-1"
                      size="small"
                      color="primary"
                      text-color="white"
                    >
                      {{ model }}
                    </v-chip>
                  </template>
                  <span v-else>Sin permisos</span>
                </td>
                <td class="actions-cell" @click.stop>
                  <v-menu
                    v-if="
                      canShowDropdown &&
                      (!isProtectedRole(role) || (isProtectedRole(role) && canView))
                    "
                    location="bottom end"
                  >
                    <template #activator="{ props }">
                      <v-btn
                        v-bind="props"
                        variant="text"
                        class="pa-0"
                        min-width="0"
                        height="24"
                      >
                        <v-icon :icon="mdiDotsHorizontal" size="20" />
                      </v-btn>
                    </template>
                    <v-list
                      class="custom-dropdown elevation-1 rounded-lg"
                      style="min-width: 200px"
                    >
                      <v-list-item v-if="canView" @click="goToShow(role)">
                        <template #prepend>
                          <v-icon :icon="mdiEye" size="18" />
                        </template>
                        <v-list-item-title>Ver</v-list-item-title>
                      </v-list-item>
                      <v-divider
                        v-if="canEdit && canView && !isProtectedRole(role)"
                        class="my-1"
                      />
                      <v-list-item
                        v-if="canEdit && !isProtectedRole(role)"
                        @click="goToEdit(role)"
                      >
                        <template #prepend>
                          <v-icon :icon="mdiPencil" size="18" />
                        </template>
                        <v-list-item-title>Editar</v-list-item-title>
                      </v-list-item>
                    </v-list>
                  </v-menu>
                </td>
              </tr>
            </template>
            <template v-else>
              <tr>
                <td :colspan="isSuperadmin ? 5 : 4" class="text-center py-8">
                  <div class="font-weight-bold mb-2" style="font-size: 1.5rem">
                    No se encontraron roles
                  </div>
                </td>
              </tr>
            </template>
          </template>
        </RoleTableMeta>
        <!-- PAGINACIÓN CENTRADA Y AZUL EN ESCRITORIO -->
        <div class="d-flex justify-center mt-4">
          <v-pagination
            v-model="page"
            :length="totalPages"
            :total-visible="7"
            color="primary"
            @update:modelValue="emitPageChange"
          />
        </div>
      </template>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { useRouter } from "vue-router";
import RoleTableMeta from "./RoleTableMeta.vue";
import {
  mdiChevronUp,
  mdiChevronDown,
  mdiDotsHorizontal,
  mdiPencil,
  mdiEye,
} from "@mdi/js";
import { useAuthStore } from "@/stores/auth";
import { permissionTranslations } from "@/utils/permissionTranslations";

const roleNameTranslations = {
  superadmin: "Super Administrador",
  admin: "Administrador",
  sponsor: "Sponsor",
};

const protectedRoles = ["superadmin", "admin", "sponsor"];

const props = defineProps({
  items: Array,
  isMobile: Boolean,
  isLoading: Boolean,
  totalItems: Number,
  page: Number,
  itemsPerPage: Number,
});

const emit = defineEmits(["update:page"]);

const router = useRouter();
const auth = useAuthStore();

const user = computed(
  () => auth.user || { roles: [], permissions: [], organization_id: null }
);
const roles = computed(() => user.value.roles || []);
const permissions = computed(() => user.value.permissions || []);
const isSuperadmin = computed(() => roles.value.includes("superadmin"));
const canEdit = computed(() => permissions.value.includes("role.update"));
const canView = computed(() => permissions.value.includes("role.view"));
const canCreate = computed(() => permissions.value.includes("role.create"));
const canShowDropdown = computed(() => canView.value || canEdit.value);

function isProtectedRole(role) {
  return protectedRoles.includes(role.name?.toLowerCase());
}

function getOrganizationLabel(role) {
  if (role.name === "superadmin") return "Único";
  if (["admin", "sponsor"].includes(role.name)) return "Global";
  return role.organization_id ?? "N/A";
}

function translateRoleName(name) {
  return roleNameTranslations[name] || name;
}

function getPermissionModels(role) {
  if (!role.permissions || !role.permissions.length) return [];
  const modelMap = {
    user: "Usuario",
    organization: "Organización",
    business: "Empresa",
    businessUnit: "Unidad de negocio",
    businessUnitGroup: "Grupo de unidades",
    role: "Rol",
    form: "Formulario",
    form_field: "Campo de formulario",
    form_response: "Respuesta de formulario",
  };
  const models = new Set();
  role.permissions.forEach((perm) => {
    const permName = perm.name || perm;
    const modelKey = permName.split(".")?.[0];
    if (modelKey === "person" || modelKey === "permission") return;
    if (modelMap[modelKey]) models.add(modelMap[modelKey]);
    else if (modelKey) models.add(modelKey.charAt(0).toUpperCase() + modelKey.slice(1));
  });
  return Array.from(models);
}

function translatePermission(name) {
  if (permissionTranslations[name]) return permissionTranslations[name];
  const action = name?.split(".")?.[1];
  return permissionTranslations[action] || action || name;
}

const sortBy = ref("id");
const sortDesc = ref(false);

function toggleSort(column) {
  if (sortBy.value === column) {
    sortDesc.value = !sortDesc.value;
  } else {
    sortBy.value = column;
    sortDesc.value = false;
  }
}

function goToEdit(role) {
  router.push({ path: `/roles/editar/${role.id}` });
}
function goToShow(role) {
  router.push({ path: `/roles/${role.id}` });
}

// Paginación controlada por el padre
const page = ref(props.page || 1);
watch(
  () => props.page,
  (val) => {
    page.value = val;
  }
);

const itemsPerPage = computed(() => props.itemsPerPage || 10);
const totalPages = computed(() =>
  Math.ceil((props.totalItems || 0) / itemsPerPage.value)
);

function emitPageChange(val) {
  emit("update:page", val);
}
</script>

<style scoped src="@/styles/roles.css"></style>
