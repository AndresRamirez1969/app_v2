<script setup>
import GoogleMap from '@/utils/helpers/google/GoogleMap.vue';

defineProps({
  fieldObj: { type: Object, required: true },
  fieldSearch: { type: Object, required: true },
  pageByField: { type: Object, required: true },
  setPage: { type: Function, required: true },
  geoLayerByField: { type: Object, required: true },
  getGeoPoints: { type: Function, required: true },
  getGeoCenter: { type: Function, required: true },
  getGeoZoom: { type: Function, required: true },
  getGeoAddress: { type: Function, required: true },
  getGeoCoords: { type: Function, required: true }
});

const pageSize = 10;
</script>

<template>
  <div>
    <div class="mb-2 d-flex align-center justify-space-between">
      <div class="text-h6 font-weight-bold">Registros de geolocalización</div>
    </div>

    <div class="search-table-container mt-6">
      <!-- Selector de capa -->
      <v-btn-toggle
        v-model="geoLayerByField[fieldObj.field.id]"
        mandatory
        class="mb-4"
        color="primary"
        density="compact"
        style="max-width: 320px"
      >
        <v-btn value="points">Puntos</v-btn>
        <v-btn value="heatmap">Heatmap</v-btn>
      </v-btn-toggle>

      <template v-if="getGeoPoints(fieldObj.field.id).length">
        <GoogleMap
          class="map-container"
          :points="getGeoPoints(fieldObj.field.id)"
          :center="getGeoCenter(fieldObj.field.id)"
          :zoom="getGeoZoom(fieldObj.field.id)"
          :fit-bounds="true"
          :layer="geoLayerByField[fieldObj.field.id] || 'points'"
          :key="`geo-${fieldObj.field.id}-${getGeoPoints(fieldObj.field.id).length}-${geoLayerByField[fieldObj.field.id]}`"
        />
      </template>
      <template v-else>
        <v-card class="pa-6 text-medium-emphasis" style="background: #f5f5f5; border-radius: 12px">
          No hay ubicaciones válidas para mostrar.
        </v-card>
      </template>

      <!-- Searchbar y tabla/cards de registros debajo del mapa -->
      <v-text-field
        v-model="fieldSearch[fieldObj.field.id]"
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
      <v-table density="compact" style="width: 100%" class="image-records-table d-none d-md-table">
        <thead>
          <tr>
            <th>Folio</th>
            <th>Usuario</th>
            <th>Dirección</th>
            <th>Coordenadas</th>
          </tr>
        </thead>
        <tbody>
          <template
            v-for="(resp, i) in getGeoPoints(fieldObj.field.id).slice(
              (pageByField[fieldObj.field.id] - 1) * pageSize,
              (pageByField[fieldObj.field.id] || 1) * pageSize
            )"
            :key="i"
          >
            <tr class="response-row record-row">
              <td class="response-value-cell">
                <span class="folio-link" style="color: #1976d2; text-decoration: underline; font-weight: 500">
                  {{ resp.label || '-' }}
                </span>
              </td>
              <td class="response-value-cell">
                <span class="font-weight-medium">{{ resp.user?.name || resp.user || '-' }}</span>
              </td>
              <td class="response-value-cell">
                <a
                  v-if="getGeoAddress(resp.value) !== '-'"
                  :href="`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(getGeoAddress(resp.value))}`"
                  target="_blank"
                  rel="noopener noreferrer"
                  style="color: #1976d2; text-decoration: underline"
                >
                  {{ getGeoAddress(resp.value) }}
                </a>
                <span v-else>{{ getGeoAddress(resp.value) }}</span>
              </td>
              <td class="response-value-cell">
                {{ getGeoCoords(resp.value) }}
              </td>
            </tr>
          </template>
          <tr v-if="getGeoPoints(fieldObj.field.id).length === 0">
            <td colspan="4" class="text-medium-emphasis">No hay registros de geolocalización.</td>
          </tr>
        </tbody>
      </v-table>

      <!-- Cards en móvil/tablet -->
      <div class="image-records-cards d-md-none">
        <v-row>
          <v-col
            v-for="(resp, i) in getGeoPoints(fieldObj.field.id).slice(
              (pageByField[fieldObj.field.id] - 1) * pageSize,
              (pageByField[fieldObj.field.id] || 1) * pageSize
            )"
            :key="i"
            cols="12"
          >
            <v-card class="mb-4 pa-3 elevation-1 rounded-lg response-card" style="cursor: default">
              <div class="d-flex flex-column mb-1" style="gap: 8px">
                <span class="folio-link text-caption" style="color: #1976d2; text-decoration: underline; font-weight: 500; min-width: 60px">
                  {{ resp.label || '-' }}
                </span>
                <span class="font-weight-medium" style="color: #333; font-size: 0.9rem">
                  {{ resp.user?.name || resp.user || '-' }}
                </span>
                <span style="font-size: 0.9rem; color: #1976d2">
                  <strong>Dirección:</strong>
                  <a
                    v-if="getGeoAddress(resp.value) !== '-'"
                    :href="`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(getGeoAddress(resp.value))}`"
                    target="_blank"
                    rel="noopener noreferrer"
                    style="color: #1976d2; text-decoration: underline"
                  >
                    {{ getGeoAddress(resp.value) }}
                  </a>
                  <span v-else>{{ getGeoAddress(resp.value) }}</span>
                </span>
                <span style="font-size: 0.9rem; color: #1976d2">
                  <strong>Coordenadas:</strong>
                  {{ getGeoCoords(resp.value) }}
                </span>
              </div>
            </v-card>
          </v-col>
          <v-col v-if="getGeoPoints(fieldObj.field.id).length === 0" cols="12">
            <v-card class="response-card pa-3 text-medium-emphasis mb-4 rounded-lg elevation-1">
              No hay registros de geolocalización.
            </v-card>
          </v-col>
        </v-row>
      </div>

      <div class="d-flex flex-column align-center mt-2">
        <v-pagination
          :model-value="pageByField[fieldObj.field.id]"
          :length="Math.max(1, Math.ceil(getGeoPoints(fieldObj.field.id).length / pageSize))"
          :total-visible="1"
          color="primary"
          @update:modelValue="setPage(fieldObj.field.id, $event)"
          class="mobile-pagination"
        />
      </div>
    </div>
  </div>
</template>
