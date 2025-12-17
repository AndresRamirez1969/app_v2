<script setup>
import { computed } from 'vue';

const props = defineProps({
  fieldObj: { type: Object, required: true },
  fieldSearch: { type: Object, required: true },
  pageByField: { type: Object, required: true },
  setPage: { type: Function, required: true }
});

const pageSize = 10;

/** Determina si el campo tiene ponderación (para mostrar la columna “Score obtenido”). */
const hasRating = computed(() => {
  if (props.fieldObj.field?.has_rating === true) return true;
  if (['rating', 'score'].includes(props.fieldObj.field?.type)) return true;
  if ((props.fieldObj.field?.weight ?? 0) > 0) return true; // <— NUEVO
  if (Array.isArray(props.fieldObj.responses) && props.fieldObj.responses.some((r) => r.weight !== undefined)) return true;
  return false;
});

function getPaginatedResponses(fieldId, responses, pageByField) {
  const page = pageByField[fieldId] || 1;
  const start = (page - 1) * pageSize;
  return responses.slice(start, start + pageSize);
}

function filterResponses(responses, search) {
  const s = (search || '').toString().toLowerCase();
  if (!s) return responses;
  return responses.filter((r) => {
    const folio = (r.folio || r.id || '').toString().toLowerCase();
    const nombre = (r.nombre || r.user?.name || r.user || '').toString().toLowerCase();
    // Si value viene como arreglo/JSON, lo aplanamos a texto para búsqueda
    let rawVal = r.value;
    try {
      if (typeof rawVal === 'string' && rawVal.trim().startsWith('[')) {
        const arr = JSON.parse(rawVal);
        if (Array.isArray(arr)) rawVal = arr.join(', ');
      }
    } catch (_) {}
    const valor = (rawVal ?? '').toString().toLowerCase();
    return folio.includes(s) || nombre.includes(s) || valor.includes(s);
  });
}

/** === NUEVO === Criterio robusto de “respondido”, igual que en backend */
function isAnsweredFrontend(resp, fieldType) {
  const v = resp?.value;
  if (fieldType === 'selector' || fieldType === 'checkbox') {
    let arr = v;
    try {
      if (typeof v === 'string' && v.trim().startsWith('[')) arr = JSON.parse(v);
    } catch {}
    return Array.isArray(arr) ? arr.filter((x) => (typeof x === 'string' ? x.trim() !== '' : !!x)).length > 0 : !!v;
  }
  if (fieldType === 'geolocation') {
    try {
      if (typeof v === 'string' && v.trim().startsWith('{')) return !!(JSON.parse(v)?.lat ?? null) && !!(JSON.parse(v)?.lng ?? null);
    } catch {}
    return v && typeof v === 'object' && v.lat != null && v.lng != null;
  }
  return v !== undefined && v !== null && String(v).trim() !== '';
}

/** === ACTUALIZADO === Usa score_obtained del backend, si no, calcula localmente. */
function getScoreObtained(resp) {
  if (resp.score_obtained !== undefined && resp.score_obtained !== null) {
    return Number(resp.score_obtained);
  }
  const fieldType = props.fieldObj.field?.type;
  const answered = isAnsweredFrontend(resp, fieldType); // si ya tienes esta función, úsala; si no, tu lógica actual
  const weight = Number(resp.weight ?? props.fieldObj.field?.weight ?? 0); // <— NUEVO fallback
  return answered ? weight : 0;
}

/** Formatea el valor para mostrar; maneja URL, selector/checkbox y JSONs. */
function renderValue(resp, type) {
  let value = resp?.value;

  // Selector/checkbox: si llega como JSON de arreglo, mostrar lista legible
  if ((type === 'selector' || type === 'checkbox') && value) {
    try {
      if (typeof value === 'string' && value.trim().startsWith('[')) {
        const arr = JSON.parse(value);
        if (Array.isArray(arr)) value = arr.filter((v) => (typeof v === 'string' ? v.trim() !== '' : !!v)).join(', ');
      }
    } catch (_) {}
  }

  if (type === 'url' && value) {
    const safe = String(value);
    return `<a href="${safe}" target="_blank" rel="noopener noreferrer" style="color: #1976d2; text-decoration: underline; word-break: break-all">${safe}</a>`;
  }

  // Si es objeto (p.ej. geolocation) lo mostramos bonito
  if (value && typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch (_) {
      return String(value);
    }
  }

  return value || '-';
}

/** Opcional: formatear puntos sin .0 cuando es entero */
function fmtPts(n) {
  const num = Number(n);
  return Number.isInteger(num) ? `${num}` : `${num.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}
</script>

<template>
  <div class="search-table-container">
    <v-text-field
      v-model="props.fieldSearch[props.fieldObj.field.id]"
      :placeholder="`Buscar por folio, nombre o valor...`"
      prepend-inner-icon="mdi-magnify"
      clearable
      class="custom-search"
      density="compact"
      variant="outlined"
      color="primary"
      hide-details
      style="width: 100%; min-width: 0; padding-bottom: 12px"
    />

    <v-table density="compact" style="width: 100%" class="records-table d-none d-md-table">
      <thead>
        <tr>
          <th>Folio</th>
          <th>Nombre</th>
          <th>
            <template v-if="props.fieldObj.field.type === 'email'">Email</template>
            <template
              v-else-if="
                props.fieldObj.field.type === 'phone' || props.fieldObj.field.type === 'tel' || props.fieldObj.field.type === 'telefono'
              "
            >
              Teléfono
            </template>
            <template v-else-if="props.fieldObj.field.type === 'url'">URL</template>
            <template v-else-if="props.fieldObj.field.type === 'textarea'">Respuesta</template>
            <template v-else>Respuesta</template>
          </th>
          <th v-if="hasRating">Score obtenido</th>
        </tr>
      </thead>
      <tbody>
        <template
          v-for="(resp, i) in getPaginatedResponses(
            props.fieldObj.field.id,
            filterResponses(props.fieldObj.responses, props.fieldSearch[props.fieldObj.field.id]),
            props.pageByField
          )"
          :key="i"
        >
          <tr class="response-row">
            <td>
              <div class="response-value-cell">
                <a
                  :href="`/folio/${resp.folio || resp.id}`"
                  target="_blank"
                  rel="noopener noreferrer"
                  style="color: #1976d2; text-decoration: underline; font-weight: 500"
                >
                  {{ resp.folio || resp.id || '-' }}
                </a>
              </div>
            </td>
            <td>
              <div class="response-value-cell">
                <span class="font-weight-medium">{{ resp.nombre || resp.user?.name || resp.user || '-' }}</span>
              </div>
            </td>
            <td>
              <div class="response-value-cell">
                <span v-if="props.fieldObj.field.type === 'url'" v-html="renderValue(resp, 'url')" />
                <span v-else v-text="renderValue(resp, props.fieldObj.field.type)" />
              </div>
            </td>
            <td v-if="hasRating">
              <div class="response-value-cell">{{ fmtPts(getScoreObtained(resp)) }} pts</div>
            </td>
          </tr>
          <tr
            v-if="
              i <
              getPaginatedResponses(
                props.fieldObj.field.id,
                filterResponses(props.fieldObj.responses, props.fieldSearch[props.fieldObj.field.id]),
                props.pageByField
              ).length -
                1
            "
          >
            <td :colspan="hasRating ? 4 : 3" style="height: 6px; padding: 0; border: none; background: transparent"></td>
          </tr>
        </template>
        <tr v-if="filterResponses(props.fieldObj.responses, props.fieldSearch[props.fieldObj.field.id]).length === 0">
          <td :colspan="hasRating ? 4 : 3" class="text-medium-emphasis">No hay respuestas registradas.</td>
        </tr>
      </tbody>
    </v-table>

    <div class="records-cards d-md-none">
      <v-row>
        <v-col
          v-for="(resp, i) in getPaginatedResponses(
            props.fieldObj.field.id,
            filterResponses(props.fieldObj.responses, props.fieldSearch[props.fieldObj.field.id]),
            props.pageByField
          )"
          :key="i"
          cols="12"
        >
          <v-card class="mb-4 pa-3 elevation-1 rounded-lg response-card" style="cursor: default">
            <div v-if="hasRating" style="position: absolute; top: 12px; right: 16px; font-size: 0.85rem; font-weight: 500">
              {{ fmtPts(getScoreObtained(resp)) }} pts
            </div>
            <div class="d-flex flex-column mb-1" style="gap: 8px">
              <a
                :href="`/folio/${resp.folio || resp.id}`"
                target="_blank"
                rel="noopener noreferrer"
                style="color: #1976d2; text-decoration: underline; font-weight: 500; min-width: 60px; font-size: 0.95rem"
              >
                {{ resp.folio || resp.id || '-' }}
              </a>
              <span class="font-weight-medium" style="color: #333; font-size: 0.95rem">
                {{ resp.nombre || resp.user?.name || resp.user || '-' }}
              </span>
              <span style="font-size: 0.95rem">
                <template v-if="props.fieldObj.field.type === 'email'"><strong>Email:</strong> {{ renderValue(resp, 'email') }}</template>
                <template
                  v-else-if="
                    props.fieldObj.field.type === 'phone' || props.fieldObj.field.type === 'tel' || props.fieldObj.field.type === 'telefono'
                  "
                >
                  <strong>Teléfono:</strong> {{ renderValue(resp, 'phone') }}
                </template>
                <template v-else-if="props.fieldObj.field.type === 'url'">
                  <strong>URL:</strong> <span v-html="renderValue(resp, 'url')" />
                </template>
                <template v-else-if="props.fieldObj.field.type === 'textarea'">
                  <strong>Respuesta:</strong> {{ renderValue(resp, 'textarea') }}
                </template>
                <template v-else> <strong>Respuesta:</strong> {{ renderValue(resp, props.fieldObj.field.type) }} </template>
              </span>
            </div>
          </v-card>
        </v-col>
        <v-col v-if="filterResponses(props.fieldObj.responses, props.fieldSearch[props.fieldObj.field.id]).length === 0" cols="12">
          <v-card class="response-card pa-3 text-medium-emphasis mb-4 rounded-lg elevation-1"> No hay respuestas registradas. </v-card>
        </v-col>
      </v-row>
    </div>

    <div class="d-flex flex-column align-center mt-2">
      <v-pagination
        :model-value="props.pageByField[props.fieldObj.field.id]"
        :length="
          Math.max(1, Math.ceil(filterResponses(props.fieldObj.responses, props.fieldSearch[props.fieldObj.field.id]).length / pageSize))
        "
        :total-visible="1"
        color="primary"
        @update:modelValue="props.setPage(props.fieldObj.field.id, $event)"
        class="mobile-pagination"
      />
    </div>
  </div>
</template>

<style scoped>
.records-table {
  border-collapse: separate !important;
}
.response-row {
  background: #f5f5f5;
  border-radius: 8px;
}
.records-table tr > td {
  padding-bottom: 12px;
  padding-top: 12px;
}
.records-cards .response-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0px 2px 8px 0px rgba(60, 60, 60, 0.08);
  border: 1px solid #eaeaea;
  margin-bottom: 16px;
}
@media (min-width: 768px) {
  .records-cards {
    display: none !important;
  }
}
@media (max-width: 767px) {
  .records-table {
    display: none !important;
  }
  .records-cards {
    display: block !important;
  }
}
</style>
