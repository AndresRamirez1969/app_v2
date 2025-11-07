<template>
  <div ref="mapContainer" class="map-container"></div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue';

// Recibe una lista de puntos [{ lat, lng, label }]
const props = defineProps({
  points: {
    type: Array,
    required: true
  },
  layer: {
    type: String,
    default: 'points' // 'points' o 'heatmap'
  }
});

const mapContainer = ref(null);
let map = null;
let markers = [];
let heatmap = null;
let lastLayer = null;

function clearMarkers() {
  markers.forEach((m) => m.setMap(null));
  markers = [];
}

function clearHeatmap() {
  if (heatmap) {
    heatmap.setMap(null);
    heatmap = null;
  }
}

function clearMap() {
  clearMarkers();
  clearHeatmap();
  if (map) {
    map = null;
    if (mapContainer.value) mapContainer.value.innerHTML = '';
  }
}

function loadMap() {
  if (!window.google?.maps || !props.points.length) return;

  // Si el tipo de capa cambió, recrea el mapa
  if (lastLayer !== props.layer) {
    clearMap();
    lastLayer = props.layer;
  }

  // Centra el mapa en el primer punto
  const center = props.points[0];
  if (!map) {
    map = new window.google.maps.Map(mapContainer.value, {
      center: { lat: Number(center.lat), lng: Number(center.lng) },
      zoom: 12
    });
  } else {
    map.setCenter({ lat: Number(center.lat), lng: Number(center.lng) });
  }

  clearMarkers();
  clearHeatmap();

  if (props.layer === 'points') {
    props.points.forEach((point) => {
      if (!point.lat || !point.lng) return;
      const marker = new window.google.maps.Marker({
        position: { lat: Number(point.lat), lng: Number(point.lng) },
        map,
        title: point.label || ''
      });
      markers.push(marker);
    });
  } else if (props.layer === 'heatmap') {
    if (window.google.maps.visualization) {
      const heatmapData = props.points.map((p) => new window.google.maps.LatLng(Number(p.lat), Number(p.lng)));
      heatmap = new window.google.maps.visualization.HeatmapLayer({
        data: heatmapData,
        map
      });
    }
  }
}

onMounted(() => {
  loadMap();
});

watch(
  () => [props.points, props.layer],
  () => {
    loadMap();
  }
);
</script>

<style scoped>
.map-container {
  height: 300px;
  width: 100%;
  border-radius: 8px;
  border: 1px solid #ccc;
}
</style>
