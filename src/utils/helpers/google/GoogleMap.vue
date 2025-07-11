<template>
  <div ref="mapContainer" class="map-container"></div>
</template>

<script setup>
import { onMounted, ref } from 'vue';

const props = defineProps({
  address: {
    type: Object,
    required: true
  }
});

const mapContainer = ref(null);
let map = null;
let marker = null;

const loadMap = async () => {
  const fullAddress = `${props.address.street}, ${props.address.city}, ${props.address.state}, ${props.address.postal_code},`;
  const geocoder = new window.google.maps.Geocoder();

  geocoder.geocode({ address: fullAddress }, (results, status) => {
    if (status === 'OK' && results[0]) {
      const location = results[0].geometry.location;

      map = new window.google.maps.Map(mapContainer.value, {
        center: location,
        zoom: 15
      });

      marker = new window.google.maps.Marker({
        position: location,
        map
      });
    } else {
      console.error(status);
    }
  });
};

onMounted(() => {
  if (window.google?.maps) {
    loadMap();
  } else {
    console.error('Google maps epic fail');
  }
});
</script>

<style scoped>
.map-container {
  height: 300px;
  width: 100%;
  border-radius: 8px;
  border: 1px solid #ccc;
}
</style>
