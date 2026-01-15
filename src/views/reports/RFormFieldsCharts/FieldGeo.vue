<script setup>
import { computed } from "vue";
import GoogleMap from "@/utils/helpers/google/GoogleMap.vue";

const props = defineProps({
  fieldObj: { type: Object, required: true },
  fieldSearch: { type: Object, required: true },
  pageByField: { type: Object, required: true },
  setPage: { type: Function, required: true },
  geoLayerByField: { type: Object, required: true },
  getGeoCenter: { type: Function, required: true },
  getGeoZoom: { type: Function, required: true },
  getGeoAddress: { type: Function, required: true },
  getGeoCoords: { type: Function, required: true },
});

const pageSize = 10;

/* ===========================
   Helpers de filtro y puntos
   =========================== */

// Nueva función: obtiene dirección textual si existe en el objeto de respuesta
function getAddressFromValue(value) {
  // Si value es un objeto y tiene address, úsalo
  if (value && typeof value === "object" && value.address) {
    return value.address;
  }
  // Si value es string con JSON, intenta parsear
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && parsed.address) return parsed.address;
    } catch {}
  }
  // Si no, usa la función original de props
  return props.getGeoAddress(value);
}

function filterResponses(responses, search) {
  const s = (search || "").toString().toLowerCase();
  if (!s) return responses;
  return responses.filter((r) => {
    const folio = (r.folio || r.id || "").toString().toLowerCase();
    const user = (r.user?.name || r.user || "").toString().toLowerCase();
    const addrRaw = getAddressFromValue(r.value);
    const address = (addrRaw || "").toString().toLowerCase();
    return folio.includes(s) || user.includes(s) || address.includes(s);
  });
}

// Parsea coords desde value o, si no, desde props.getGeoCoords(value)
function parseCoords(value) {
  if (!value) return { lat: null, lng: null };

  // Caso 1: vienen como objeto
  if (typeof value === "object") {
    const latRaw =
      value.lat ??
      value.latitude ??
      value.latitud ??
      value.coords?.lat ??
      value.coords?.latitude ??
      null;
    const lngRaw =
      value.lng ??
      value.longitude ??
      value.longitud ??
      value.coords?.lng ??
      value.coords?.longitude ??
      null;

    const lat = latRaw !== null ? Number(latRaw) : null;
    const lng = lngRaw !== null ? Number(lngRaw) : null;

    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }

  // Caso 2: vienen en string tipo "25.6..., -100.3..." usando getGeoCoords
  const coordsString = props.getGeoCoords(value);
  if (coordsString && typeof coordsString === "string") {
    const [latStr, lngStr] = coordsString.split(",").map((s) => s.trim());
    const lat = Number(latStr);
    const lng = Number(lngStr);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }

  return { lat: null, lng: null };
}

function getMapPoints(responses) {
  return responses
    .map((r) => {
      const { lat, lng } = parseCoords(r.value);
      return {
        lat,
        lng,
        label: r.folio || r.id || "-",
        user: r.user,
        address: getAddressFromValue(r.value) || "-",
      };
    })
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
}

/* ===========================
   Helpers para Score (unificados)
   =========================== */

function toNum(x) {
  if (typeof x === "number") return x;
  if (typeof x === "string" && x.trim() !== "" && !isNaN(+x)) return +x;
  return undefined;
}

const fieldConfiguredPoints = computed(() => {
  const f = props.fieldObj?.field || {};
  const o = props.fieldObj || {};

  // Claves extendidas para cubrir la mayoría de variantes
  const keys = [
    "points",
    "point",
    "pts",
    "puntos",
    "max_points",
    "score",
    "score_max",
    "maxScore",
    "max_score",
    "total_points",
    "points_total",
    "puntaje",
    "puntaje_max",
    "max",
    "maxPts",
    "maxpts",
    "value",
    "valor",
    "weight",
    "weight_points",
  ];

  for (const src of [f, o]) {
    for (const k of keys) {
      const n = toNum(src?.[k]);
      if (n !== undefined) return n;
    }
  }
  return 0;
});

const hasScore = computed(() => {
  // Si el campo tiene puntos configurados, ya consideramos que maneja score
  if (fieldConfiguredPoints.value > 0) return true;

  // Flag explícito en el campo
  if (props.fieldObj.field?.has_rating === true) return true;

  // Tipos de campo que implican score
  const t = (props.fieldObj.field?.type ?? "").toString().toLowerCase();
  if (["rating", "score"].includes(t)) return true;

  // Respuestas con score explícito
  return (
    Array.isArray(props.fieldObj.responses) &&
    props.fieldObj.responses.some((r) => {
      const explicitKeys = ["score", "points", "puntos", "score_obtenido", "obtained"];
      return explicitKeys.some((k) => toNum(r?.[k]) !== undefined);
    })
  );
});

function getScoreObtained(resp) {
  // 1) Si la respuesta trae puntaje explícito, se respeta
  const explicitKeys = ["score", "points", "puntos", "score_obtenido", "obtained"];
  for (const k of explicitKeys) {
    const v = toNum(resp?.[k]);
    if (v !== undefined) return `${v} pts`;
  }

  // 2) Si no, y hay respuesta, usamos los puntos del campo (fieldConfiguredPoints)
  const answered =
    resp?.value !== null &&
    resp?.value !== undefined &&
    String(resp?.value).trim() !== "";
  const pts = answered ? fieldConfiguredPoints.value : 0;
  return `${pts} pts`;
}

/* ===========================
   Computed para no recalcular
   =========================== */

const fieldId = computed(() => props.fieldObj.field.id);
const search = computed(() => props.fieldSearch[fieldId.value] || "");
const page = computed(() => props.pageByField[fieldId.value] || 1);

const filteredResponses = computed(() =>
  filterResponses(props.fieldObj.responses || [], search.value)
);

const mapPoints = computed(() => getMapPoints(filteredResponses.value));

const paginatedResponses = computed(() => {
  const start = (page.value - 1) * pageSize;
  return filteredResponses.value.slice(start, start + pageSize);
});

/* ===========================
   Link al show del reporte
   =========================== */
function getReportShowLink(resp) {
  const formId =
    resp.form_id || resp.formId || props.fieldObj.form_id || props.fieldObj.formId;
  const reportId = resp.report_id || resp.reportId || resp.folio || resp.id;
  if (formId && reportId) {
    return {
      name: "Report Answer Show",
      params: { formId, reportId },
    };
  }
  return null;
}
</script>

<template>
  <div>
    <div class="search-table-container mt-6">
      <!-- Selector de capa -->
      <v-btn-toggle
        v-model="props.geoLayerByField[fieldId]"
        mandatory
        class="mb-4"
        color="primary"
        density="compact"
        style="max-width: 320px"
      >
        <v-btn value="points">Puntos</v-btn>
        <v-btn value="heatmap">Heatmap</v-btn>
      </v-btn-toggle>

      <!-- Mapa -->
      <template v-if="filteredResponses.length && mapPoints.length">
        <GoogleMap
          class="map-container"
          :points="mapPoints"
          :center="props.getGeoCenter(fieldId)"
          :zoom="props.getGeoZoom(fieldId)"
          :fit-bounds="true"
          :layer="props.geoLayerByField[fieldId] || 'points'"
          :key="`geo-${fieldId}-${mapPoints.length}-${props.geoLayerByField[fieldId]}`"
        />
      </template>
      <template v-else-if="filteredResponses.length && !mapPoints.length">
        <v-card
          class="pa-6 text-medium-emphasis"
          style="background: #f5f5f5; border-radius: 12px"
        >
          Hay registros, pero ninguno tiene coordenadas válidas para el mapa.
        </v-card>
      </template>
      <template v-else>
        <v-card
          class="pa-6 text-medium-emphasis"
          style="background: #f5f5f5; border-radius: 12px"
        >
          No hay ubicaciones válidas para mostrar.
        </v-card>
      </template>

      <!-- Searchbar y tabla/cards de registros debajo del mapa -->
      <v-text-field
        v-model="props.fieldSearch[fieldId]"
        :placeholder="`Buscar folio, usuario o dirección...`"
        prepend-inner-icon="mdi-magnify"
        clearable
        class="custom-search mt-4"
        density="compact"
        variant="outlined"
        color="primary"
        hide-details
        style="width: 100%; min-width: 0; padding-bottom: 12px"
      />

      <!-- Tabla en desktop -->
      <v-table
        density="compact"
        style="width: 100%"
        class="image-records-table d-none d-md-table"
      >
        <thead>
          <tr>
            <th>Folio</th>
            <th>Usuario</th>
            <th>Dirección</th>
            <th>Coordenadas</th>
            <th v-if="hasScore">Score obtenido</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="(resp, i) in paginatedResponses" :key="i">
            <tr class="response-row record-row">
              <td class="response-value-cell">
                <router-link
                  v-if="getReportShowLink(resp)"
                  :to="getReportShowLink(resp)"
                  style="color: #1976d2; text-decoration: underline; font-weight: 500"
                >
                  {{ resp.folio || resp.id || "-" }}
                </router-link>
                <span
                  v-else
                  style="color: #1976d2; text-decoration: underline; font-weight: 500"
                >
                  {{ resp.folio || resp.id || "-" }}
                </span>
              </td>
              <td class="response-value-cell">
                <span class="font-weight-medium">{{
                  resp.user?.name || resp.user || "-"
                }}</span>
              </td>
              <td class="response-value-cell">
                <a
                  v-if="getAddressFromValue(resp.value) !== '-'"
                  :href="`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    getAddressFromValue(resp.value)
                  )}`"
                  target="_blank"
                  rel="noopener noreferrer"
                  style="color: #1976d2; text-decoration: underline"
                >
                  {{ getAddressFromValue(resp.value) }}
                </a>
                <span v-else>{{ getAddressFromValue(resp.value) }}</span>
              </td>
              <td class="response-value-cell">
                {{ props.getGeoCoords(resp.value) }}
              </td>
              <td v-if="hasScore" class="response-value-cell">
                {{ getScoreObtained(resp) }}
              </td>
            </tr>
          </template>
          <tr v-if="filteredResponses.length === 0">
            <td :colspan="hasScore ? 5 : 4" class="text-medium-emphasis">
              No hay registros de geolocalización.
            </td>
          </tr>
        </tbody>
      </v-table>

      <!-- Cards en móvil/tablet -->
      <div class="image-records-cards d-md-none">
        <v-row>
          <v-col v-for="(resp, i) in paginatedResponses" :key="i" cols="12">
            <v-card
              class="mb-4 pa-3 elevation-1 rounded-lg response-card"
              style="cursor: default; position: relative"
            >
              <div
                v-if="hasScore"
                style="
                  position: absolute;
                  top: 12px;
                  right: 16px;
                  font-size: 0.85rem;
                  font-weight: 500;
                "
              >
                {{ getScoreObtained(resp) }}
              </div>
              <div class="d-flex flex-column mb-1" style="gap: 8px">
                <router-link
                  v-if="getReportShowLink(resp)"
                  :to="getReportShowLink(resp)"
                  style="
                    color: #1976d2;
                    text-decoration: underline;
                    font-weight: 500;
                    min-width: 60px;
                  "
                >
                  {{ resp.folio || resp.id || "-" }}
                </router-link>
                <span
                  v-else
                  style="
                    color: #1976d2;
                    text-decoration: underline;
                    font-weight: 500;
                    min-width: 60px;
                  "
                >
                  {{ resp.folio || resp.id || "-" }}
                </span>
                <span class="font-weight-medium" style="color: #333; font-size: 0.9rem">
                  {{ resp.user?.name || resp.user || "-" }}
                </span>
                <span style="font-size: 0.9rem; color: #1976d2">
                  <strong>Dirección:</strong>
                  <a
                    v-if="getAddressFromValue(resp.value) !== '-'"
                    :href="`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      getAddressFromValue(resp.value)
                    )}`"
                    target="_blank"
                    rel="noopener noreferrer"
                    style="color: #1976d2; text-decoration: underline"
                  >
                    {{ getAddressFromValue(resp.value) }}
                  </a>
                  <span v-else>{{ getAddressFromValue(resp.value) }}</span>
                </span>
                <span style="font-size: 0.9rem; color: #1976d2">
                  <strong>Coordenadas:</strong>
                  {{ props.getGeoCoords(resp.value) }}
                </span>
              </div>
            </v-card>
          </v-col>
          <v-col v-if="filteredResponses.length === 0" cols="12">
            <v-card
              class="response-card pa-3 text-medium-emphasis mb-4 rounded-lg elevation-1"
            >
              No hay registros de geolocalización.
            </v-card>
          </v-col>
        </v-row>
      </div>

      <div class="d-flex flex-column align-center mt-2">
        <v-pagination
          :model-value="props.pageByField[fieldId]"
          :length="Math.max(1, Math.ceil(filteredResponses.length / pageSize))"
          :total-visible="1"
          color="primary"
          @update:modelValue="props.setPage(fieldId, $event)"
          class="mobile-pagination"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.map-container {
  height: 360px;
  width: 100%;
  border-radius: 8px;
  border: 1px solid #ccc;
  overflow: hidden;
}
.image-records-table tr.record-row {
  background: #f5f5f5;
}
.image-records-table tr.record-row > td.response-value-cell {
  border-radius: 0;
  padding: 6px 12px;
}
.image-records-table tbody tr.record-row:not(:last-child) {
  border-bottom: 12px solid #fff;
}
.record-row > td.response-value-cell {
  padding-bottom: 14px;
}
.image-records-cards .response-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0px 2px 8px 0px rgba(60, 60, 60, 0.08);
  border: 1px solid #eaeaea;
  margin-bottom: 16px;
  transition: box-shadow 0.2s, border-color 0.2s;
}
.image-records-cards .response-card.selected-row {
  border-color: #1976d2;
  box-shadow: 0px 4px 16px 0px rgba(25, 118, 210, 0.12);
}
@media (min-width: 768px) {
  .image-records-cards {
    display: none !important;
  }
}
@media (max-width: 767px) {
  .image-records-table {
    display: none !important;
  }
  .image-records-cards {
    display: block !important;
  }
}
.selected-row {
  background: #e3f2fd;
}
.kpi-card {
  border: 1px solid #eaeaea;
  border-radius: 12px;
}
.kpi-row > .v-col {
  padding-left: 4px !important;
  padding-right: 4px !important;
}
.search-table-container {
  width: 100%;
  display: flex;
  flex-direction: column;
}
.custom-search {
  width: 100% !important;
  margin-left: 0 !important;
  margin-right: 0 !important;
  min-width: 0 !important;
}
.custom-search .v-field__outline {
  border-width: 0.5px !important;
  border-radius: 8px !important;
  border-color: #ccc !important;
}
.custom-search .v-field__input {
  font-size: 15px !important;
  padding: 8px 12px !important;
}
.custom-search .v-field__prepend-inner {
  color: #1677ff !important;
}
.custom-search .v-label {
  font-size: 14px !important;
  color: #555 !important;
}
.custom-search .v-field__clearable {
  color: #555 !important;
}
.response-value-cell {
  background: #f5f5f5;
  border-radius: 6px;
  padding: 6px 12px;
}
.mobile-pagination {
  margin-top: 8px;
  margin-bottom: 8px;
  justify-content: center;
  display: flex;
}
</style>
