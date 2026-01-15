<template>
  <div ref="mapContainer" class="map-container"></div>
</template>

<script setup>
import { onMounted, ref, watch, nextTick } from 'vue';

const props = defineProps({
  locations: {
    type: Array,
    required: true,
    default: () => []
  },
  height: {
    type: String,
    default: '500px'
  }
});

const mapContainer = ref(null);
let map = null;
let heatmap = null;

const initializeMap = () => {
  if (!props.locations || props.locations.length === 0) {
    return;
  }
  if (!mapContainer.value) {
    return;
  }
  if (!window.google?.maps) {
    return;
  }

  const centerLat = props.locations.reduce((sum, loc) => sum + loc.lat, 0) / props.locations.length;
  const centerLng = props.locations.reduce((sum, loc) => sum + loc.lng, 0) / props.locations.length;

  map = new google.maps.Map(mapContainer.value, {
    center: { lat: centerLat, lng: centerLng },
    zoom: 12,
    mapTypeId: 'roadmap',
    streetViewControl: false,
    fullscreenControl: true
  });

  const heatmapData = props.locations.map((loc) => ({
    location: new google.maps.LatLng(loc.lat, loc.lng),
    weight: 1
  }));

  heatmap = new google.maps.visualization.HeatmapLayer({
    data: heatmapData,
    map: map
  });

  heatmap.set('radius', 20);
  heatmap.set('opacity', 0.6);
  heatmap.set('dissipating', true);
  heatmap.set('maxIntensity', 2.0);
};

const updateHeatmap = () => {
  if (!map) return;

  if (heatmap) {
    heatmap.setMap(null);
  }

  if (props.locations && props.locations.length > 0) {
    const centerLat = props.locations.reduce((sum, loc) => sum + loc.lat, 0) / props.locations.length;
    const centerLng = props.locations.reduce((sum, loc) => sum + loc.lng, 0) / props.locations.length;
    map.setCenter({ lat: centerLat, lng: centerLng });

    const heatmapData = props.locations.map((loc) => ({
      location: new google.maps.LatLng(loc.lat, loc.lng),
      weight: 1
    }));

    heatmap = new google.maps.visualization.HeatmapLayer({
      data: heatmapData,
      map: map
    });

    heatmap.set('radius', 20);
    heatmap.set('opacity', 0.6);
    heatmap.set('dissipating', true);
    heatmap.set('maxIntensity', 2.0);
  }
};

onMounted(async () => {
  await nextTick();

  if (window.google?.maps) {
    initializeMap();
  }
});

watch(
  () => props.locations,
  () => {
    if (map) {
      updateHeatmap();
    }
  },
  { deep: true }
);
</script>

<style scoped>
.map-container {
  height: v-bind(height);
  width: 100%;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}
</style>
