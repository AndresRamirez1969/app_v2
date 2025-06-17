<template>
    <v-text-field
        ref="autocompleteInput"
        v-model="address"
        label="Dirección"
        variant="outlined"
        color="primary"
        hide-details
    />
</template>

<script setup>
import { ref, onMounted } from 'vue';

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
      componentRestrictions: { country: 'mx' },
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      address.value = place.formatted_address || inputEl.value;
      console.log('Selected place:', place); 
    });
  };

  waitForGoogle();
});
</script>