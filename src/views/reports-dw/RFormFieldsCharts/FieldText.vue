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
  <div class="search-table-container">
    <v-table density="compact" style="width: 100%">
      <tbody>
        <tr>
          <td>
            <v-text-field
              v-model="fieldSearch[fieldObj.field.id]"
              :placeholder="`Buscar respuesta...`"
              prepend-inner-icon="mdi-magnify"
              clearable
              class="custom-search"
              density="compact"
              variant="outlined"
              color="primary"
              hide-details
              style="width: 100%; min-width: 0; padding-bottom: 12px"
            />
          </td>
        </tr>
        <tr
          v-for="(resp, i) in getPaginatedResponses(
            fieldObj.field.id,
            fieldObj.responses.filter((r) => {
              const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
              return !search || (r.value && r.value.toString().toLowerCase().includes(search));
            }),
            pageByField
          )"
          :key="i"
          class="response-row"
        >
          <td>
            <div class="response-value-cell">{{ resp.value }}</div>
          </td>
        </tr>
        <tr
          v-if="
            fieldObj.responses.filter((r) => {
              const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
              return !search || (r.value && r.value.toString().toLowerCase().includes(search));
            }).length === 0
          "
        >
          <td class="text-medium-emphasis">No hay respuestas registradas.</td>
        </tr>
      </tbody>
    </v-table>
    <div class="d-flex flex-column align-center mt-2">
      <v-pagination
        :model-value="pageByField[fieldObj.field.id]"
        :length="
          Math.max(
            1,
            Math.ceil(
              fieldObj.responses.filter((r) => {
                const search = (fieldSearch[fieldObj.field.id] || '').toString().toLowerCase();
                return !search || (r.value && r.value.toString().toLowerCase().includes(search));
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
