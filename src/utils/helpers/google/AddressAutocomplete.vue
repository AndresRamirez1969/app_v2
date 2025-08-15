<template>
  <div class="address-fields">
    <!-- Calle -->
    <div class="field-group single">
      <v-text-field
        ref="autocompleteInput"
        v-model="fields.street"
        label="Calle"
        variant="outlined"
        color="primary"
        :placeholder="placeholder || 'Ingresa una calle'"
        hide-details
        density="compact"
        @focus="initAutocomplete"
        @input="onStreetInput"
      />
    </div>

    <!-- Número exterior e interior -->
    <div class="field-group">
      <v-text-field
        v-model="fields.outdoor_number"
        label="Número exterior"
        variant="outlined"
        color="primary"
        hide-details
        density="compact"
      />
      <v-text-field
        v-model="fields.indoor_number"
        label="Número interior"
        variant="outlined"
        color="primary"
        hide-details
        density="compact"
      />
    </div>

    <!-- Colonia y Código Postal -->
    <div class="field-group">
      <v-text-field v-model="fields.neighborhood" label="Colonia" variant="outlined" color="primary" hide-details density="compact" />
      <v-text-field v-model="fields.postal_code" label="Código Postal" variant="outlined" color="primary" hide-details density="compact" />
    </div>

    <!-- Ciudad y Estado -->
    <div class="field-group">
      <v-text-field v-model="fields.city" label="Ciudad" variant="outlined" color="primary" hide-details density="compact" />
      <v-text-field v-model="fields.state" label="Estado" variant="outlined" color="primary" hide-details density="compact" />
    </div>

    <!-- País -->
    <div class="field-group single">
      <v-autocomplete
        v-model="fields.country"
        :items="countries"
        label="País"
        variant="outlined"
        color="primary"
        hide-details
        density="compact"
        v-model:search-input="countrySearch"
        :item-title="'name'"
        :item-value="'name'"
        clearable
        :return-object="false"
        :filter="customCountryFilter"
      />
    </div>

    <!-- Mapa -->
    <div v-if="showMap" ref="mapContainer" class="map-preview" />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  placeholder: { type: String, default: '' },
  initialValue: { type: Object, default: () => ({}) },
  mode: { type: String, default: 'edit' } // 'create' o 'edit'
});
const emit = defineEmits(['update:parsedAddress']);

const autocompleteInput = ref(null);
const autocomplete = ref(null);
const map = ref(null);
const marker = ref(null);
const mapContainer = ref(null);

const showMap = ref(false);

const fields = ref({
  street: '',
  outdoor_number: '',
  indoor_number: '',
  neighborhood: '',
  postal_code: '',
  city: '',
  state: '',
  country: ''
});

const countrySearch = ref('');
const countries = [
  { name: 'México' },
  { name: 'Estados Unidos' },
  { name: 'Canadá' },
  { name: 'España' },
  { name: 'Argentina' } /* ...otros países */
];

watch(
  () => props.initialValue,
  (val) => {
    if (val && typeof val === 'object') {
      Object.assign(fields.value, val);
      if (props.mode === 'edit' && (val.street || val.city || val.state)) {
        showMap.value = true;
        setTimeout(() => updateMapFromFields(), 300);
      }
    }
  },
  { immediate: true }
);

function onStreetInput() {
  if (props.mode === 'create') {
    if (!showMap.value && fields.value.street.trim()) {
      showMap.value = true;
    }
    if (showMap.value) {
      updateMapFromFields();
    }
  }
}

let autocompleteInitialized = false;
const initAutocomplete = () => {
  if (autocompleteInitialized) return;
  autocompleteInitialized = true;

  const inputEl = autocompleteInput.value?.$el?.querySelector('input');
  if (!inputEl || !window.google || !google.maps.places) return;

  autocomplete.value = new window.google.maps.places.Autocomplete(inputEl, { types: ['geocode'] });
  autocomplete.value.addListener('place_changed', () => {
    const place = autocomplete.value.getPlace();
    fillFieldsFromPlace(place);
    updateMapFromAddress(place);
    showMap.value = true;
  });
};

const fillFieldsFromPlace = (place) => {
  const components = place.address_components || [];
  const getComponent = (type) => components.find((comp) => comp.types.includes(type))?.long_name || '';

  fields.value.street = getComponent('route');
  fields.value.outdoor_number = getComponent('street_number');
  fields.value.neighborhood = getComponent('sublocality') || getComponent('neighborhood');
  fields.value.postal_code = getComponent('postal_code');
  fields.value.city = getComponent('locality');
  fields.value.state = getComponent('administrative_area_level_1');
  fields.value.country = getComponent('country');

  const matched = countries.find((c) => c.name.toLowerCase() === fields.value.country.toLowerCase());
  if (matched) fields.value.country = matched.name;

  emit('update:parsedAddress', { ...fields.value });
};

watch(fields, (val) => emit('update:parsedAddress', { ...val }), { deep: true });

const normalize = (str) =>
  str
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

const customCountryFilter = (item, queryText) => normalize(item.name).includes(normalize(queryText));

// INTEGRACIÓN: Usar AdvancedMarkerElement en vez de Marker
const initMap = (lat, lng) => {
  const position = { lat, lng };
  if (!map.value) {
    map.value = new google.maps.Map(mapContainer.value, {
      center: position,
      zoom: 16
    });
    if (google.maps.marker && google.maps.marker.AdvancedMarkerElement) {
      marker.value = new google.maps.marker.AdvancedMarkerElement({
        map: map.value,
        position
      });
    } else {
      // fallback para versiones antiguas
      marker.value = new google.maps.Marker({ position, map: map.value });
    }
  } else {
    map.value.setCenter(position);
    if (marker.value && marker.value.position) {
      // AdvancedMarkerElement
      marker.value.position = position;
    } else if (marker.value && marker.value.setPosition) {
      // Marker clásico
      marker.value.setPosition(position);
    }
  }
};

const updateMapFromAddress = (place) => {
  const geocoder = new google.maps.Geocoder();
  const address = place.formatted_address || fields.value.street;

  geocoder.geocode({ address }, (results, status) => {
    if (status === 'OK' && results[0]) {
      const location = results[0].geometry.location;
      initMap(location.lat(), location.lng());
    }
  });
};

const updateMapFromFields = () => {
  const geocoder = new google.maps.Geocoder();
  const address = [fields.value.street, fields.value.city, fields.value.state, fields.value.postal_code, fields.value.country]
    .filter(Boolean)
    .join(', ');

  if (address.trim()) {
    geocoder.geocode({ address }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const location = results[0].geometry.location;
        initMap(location.lat(), location.lng());
      }
    });
  }
};

// debounce para evitar llamadas constantes
let debounceTimeout;
watch(
  () => [fields.value.street, fields.value.city, fields.value.state, fields.value.postal_code, fields.value.country],
  () => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      if (props.mode === 'edit' || (props.mode === 'create' && showMap.value)) {
        updateMapFromFields();
      }
    }, 800);
  },
  { deep: true }
);
</script>

<style scoped>
.address-fields {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.field-group {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.field-group.single {
  grid-template-columns: 1fr;
}

.v-text-field,
.v-autocomplete {
  width: 100%;
}

.map-preview {
  height: 300px;
  width: 100%;
  border-radius: 8px;
  margin-top: 16px;
}

@media (max-width: 900px) {
  .field-group,
  .field-group.single {
    grid-template-columns: 1fr !important;
  }
}
</style>
