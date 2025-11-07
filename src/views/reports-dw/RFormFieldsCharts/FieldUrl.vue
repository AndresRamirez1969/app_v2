<script setup>
defineProps({
  fieldObj: { type: Object, required: true },
  fieldSearch: { type: Object, required: true },
  pageByField: { type: Object, required: true },
  setPage: { type: Function, required: true }
});

const pageSize = 10;

function getPaginatedResponses(fieldId, responses, pageByField) {
  const page = pageByField[fieldId] || 1;
  const start = (page - 1) * pageSize;
  return responses.slice(start, start + pageSize);
}
</script>

<template>
  <div class="mb-2 d-flex align-center justify-space-between">
    <div class="text-h6 font-weight-bold">Registros de URLs</div>
  </div>
  <div class="search-table-container mt-6">
    <v-text-field
      v-model="fieldSearch[fieldObj.field.id]"
      :placeholder="`Buscar folio, usuario o URL...`"
      prepend-inner-icon="mdi-magnify"
      clearable
      class="custom-search"
      density="compact"
      variant="outlined"
      color="primary"
      hide-details
      style="width: 100%; min-width: 0; padding-bottom: 12px"
    />

    <!-- Tabla en desktop -->
    <v-table density="compact" style="width: 100%" class="image-records-table d-none d-md-table">
      <thead>
        <tr>
          <th>Folio</th>
          <th>Usuario</th>
          <th>URL</th>
        </tr>
      </thead>
      <tbody>
        <template
          v-for="(resp, i) in getPaginatedResponses(
            fieldObj.field.id,
            fieldObj.responses.filter((r) => {
              const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
              return (
                !search ||
                (r.folio && r.folio.toString().toLowerCase().includes(search)) ||
                (r.user && r.user.toString().toLowerCase().includes(search)) ||
                (r.value && r.value.toString().toLowerCase().includes(search))
              );
            }),
            pageByField
          )"
          :key="i"
        >
          <tr class="response-row record-row">
            <td class="response-value-cell">
              <span class="folio-link" style="color: #1976d2; text-decoration: underline; font-weight: 500">
                {{ resp.folio || resp.id || '-' }}
              </span>
            </td>
            <td class="response-value-cell">
              <span class="font-weight-medium">{{ resp.user?.name || resp.user || '-' }}</span>
            </td>
            <td class="response-value-cell">
              <a
                v-if="resp.value"
                :href="resp.value"
                target="_blank"
                rel="noopener noreferrer"
                style="color: #1976d2; text-decoration: underline; word-break: break-all"
              >
                {{ resp.value }}
              </a>
              <span v-else>-</span>
            </td>
          </tr>
        </template>
        <tr
          v-if="
            fieldObj.responses.filter((r) => {
              const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
              return (
                !search ||
                (r.folio && r.folio.toString().toLowerCase().includes(search)) ||
                (r.user && r.user.toString().toLowerCase().includes(search)) ||
                (r.value && r.value.toString().toLowerCase().includes(search))
              );
            }).length === 0
          "
        >
          <td colspan="3" class="text-medium-emphasis">No hay URLs registradas.</td>
        </tr>
      </tbody>
    </v-table>

    <!-- Cards en móvil/tablet -->
    <div class="image-records-cards d-md-none">
      <v-row>
        <v-col
          v-for="(resp, i) in getPaginatedResponses(
            fieldObj.field.id,
            fieldObj.responses.filter((r) => {
              const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
              return (
                !search ||
                (r.folio && r.folio.toString().toLowerCase().includes(search)) ||
                (r.user && r.user.toString().toLowerCase().includes(search)) ||
                (r.value && r.value.toString().toLowerCase().includes(search))
              );
            }),
            pageByField
          )"
          :key="i"
          cols="12"
        >
          <v-card class="mb-4 pa-3 elevation-1 rounded-lg response-card" style="cursor: default">
            <div class="d-flex flex-column mb-1" style="gap: 8px">
              <span class="folio-link text-caption" style="color: #1976d2; text-decoration: underline; font-weight: 500; min-width: 60px">
                {{ resp.folio || resp.id || '-' }}
              </span>
              <span class="font-weight-medium" style="color: #333; font-size: 0.9rem">
                {{ resp.user?.name || resp.user || '-' }}
              </span>
              <span style="font-size: 0.9rem; color: #1976d2">
                <strong>URL:</strong>
                <a
                  v-if="resp.value"
                  :href="resp.value"
                  target="_blank"
                  rel="noopener noreferrer"
                  style="color: #1976d2; text-decoration: underline; word-break: break-all"
                >
                  {{ resp.value }}
                </a>
                <span v-else>-</span>
              </span>
            </div>
          </v-card>
        </v-col>
        <v-col
          v-if="
            fieldObj.responses.filter((r) => {
              const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
              return (
                !search ||
                (r.folio && r.folio.toString().toLowerCase().includes(search)) ||
                (r.user && r.user.toString().toLowerCase().includes(search)) ||
                (r.value && r.value.toString().toLowerCase().includes(search))
              );
            }).length === 0
          "
          cols="12"
        >
          <v-card class="response-card pa-3 text-medium-emphasis mb-4 rounded-lg elevation-1"> No hay URLs registradas. </v-card>
        </v-col>
      </v-row>
    </div>

    <div class="d-flex flex-column align-center mt-2">
      <v-pagination
        :model-value="pageByField[fieldObj.field.id]"
        :length="
          Math.max(
            1,
            Math.ceil(
              fieldObj.responses.filter((r) => {
                const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                return (
                  !search ||
                  (r.folio && r.folio.toString().toLowerCase().includes(search)) ||
                  (r.user && r.user.toString().toLowerCase().includes(search)) ||
                  (r.value && r.value.toString().toLowerCase().includes(search))
                );
              }).length / pageSize
            )
          )
        "
        :total-visible="1"
        color="primary"
        @update:modelValue="setPage(fieldObj.field.id, $event)"
        class="mobile-pagination"
      />
    </div>
  </div>
</template>
