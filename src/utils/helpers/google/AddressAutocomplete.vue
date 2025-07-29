<!--Text-field reutilizable para campo de direccion (pasar <AddressAutocomplete/> a formulario)-->
<template>
  <v-text-field
    ref="autocompleteInput"
    v-model="address"
    label="Dirección"
    variant="outlined"
    color="primary"
    hide-details
    :placeholder="placeholder || 'Ingresa una dirección'"
  />
</template>

<script setup>
// Lógica de auto completar direcciones con el API de Google Maps
import { ref, onMounted, watch } from 'vue';

const props = defineProps({
  placeholder: {
    type: String,
    default: ''
  },
  initialValue: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['update:parsedAddress']);

const autocompleteInput = ref(null);
const address = ref('');
let autocomplete;

onMounted(() => {
  const waitForGoogle = () => {
    if (window.google && google.maps && google.maps.places) {
      initAutocomplete();
    } else {
      setTimeout(waitForGoogle, 100);
    }
  };

  const initAutocomplete = () => {
    const inputEl = autocompleteInput.value?.$el.querySelector('input');
    if (!inputEl) return;

    autocomplete = new google.maps.places.Autocomplete(inputEl, {
      types: ['geocode'],
      componentRestrictions: { country: 'mx' }
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      const addressComponents = place.address_components || [];

      const getComponent = (type) => addressComponents.find((comp) => comp.types.includes(type))?.long_name || '';

      const parsedAddress = {
        street: getComponent('route'),
        outdoor_number: getComponent('street_number'),
        neighborhood: getComponent('sublocality') || getComponent('neighborhood'),
        postal_code: getComponent('postal_code'),
        city: getComponent('locality'),
        state: getComponent('administrative_area_level_1'),
        country: getComponent('country')
      };

      address.value = place.formatted_address || inputEl.value;
      emit('update:parsedAddress', parsedAddress);
    });
  };

  waitForGoogle();
});

// Si recibimos un initialValue, mostramos una versión legible en el campo
watch(
  () => props.initialValue,
  (val) => {
    if (val && typeof val === 'object') {
      const composed = [val.street, val.outdoor_number, val.neighborhood, val.city, val.state].filter(Boolean).join(', ');
      address.value = composed;
    }
  },
  { immediate: true }
);
</script>
