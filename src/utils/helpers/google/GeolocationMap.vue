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
    console.log('No hay ubicaciones para mostrar');
    return;
  }
  if (!mapContainer.value) {
    console.error('El contenedor del mapa no está disponible');
    return;
  }
  if (!window.google?.maps) {
    console.error('Google Maps no está disponible');
    return;
  }

  // Calcular centro basado en las ubicaciones
  const centerLat = props.locations.reduce((sum, loc) => sum + loc.lat, 0) / props.locations.length;
  const centerLng = props.locations.reduce((sum, loc) => sum + loc.lng, 0) / props.locations.length;

  // Crear el mapa
  map = new google.maps.Map(mapContainer.value, {
    center: { lat: centerLat, lng: centerLng },
    zoom: 12,
    mapTypeId: 'roadmap',
    streetViewControl: false,
    fullscreenControl: true
  });

  // Crear los puntos de datos para el heatmap
  const heatmapData = props.locations.map((loc) => ({
    location: new google.maps.LatLng(loc.lat, loc.lng),
    weight: 1
  }));

  // Crear el heatmap
  heatmap = new google.maps.visualization.HeatmapLayer({
    data: heatmapData,
    map: map
  });

  // Configurar el heatmap SOLO DESPUÉS de que se haya creado
  heatmap.set('radius', 20);
  heatmap.set('opacity', 0.6);
  heatmap.set('dissipating', true);
  heatmap.set('maxIntensity', 2.0);
};

const updateHeatmap = () => {
  if (!map) return;

  // Limpiar el heatmap anterior si existe
  if (heatmap) {
    heatmap.setMap(null);
  }

  if (props.locations && props.locations.length > 0) {
    // Calcular nuevo centro
    const centerLat = props.locations.reduce((sum, loc) => sum + loc.lat, 0) / props.locations.length;
    const centerLng = props.locations.reduce((sum, loc) => sum + loc.lng, 0) / props.locations.length;
    map.setCenter({ lat: centerLat, lng: centerLng });

    // Crear los puntos de datos para el heatmap
    const heatmapData = props.locations.map((loc) => ({
      location: new google.maps.LatLng(loc.lat, loc.lng),
      weight: 1
    }));

    // Crear nuevo heatmap
    heatmap = new google.maps.visualization.HeatmapLayer({
      data: heatmapData,
      map: map
    });

    // Configurar el heatmap
    heatmap.set('radius', 20);
    heatmap.set('opacity', 0.6);
    heatmap.set('dissipating', true);
    heatmap.set('maxIntensity', 2.0);
  }
};

onMounted(async () => {
  // Esperar a que el DOM esté listo y Google Maps esté cargado
  await nextTick();

  if (window.google?.maps) {
    initializeMap();
  } else {
    console.error('Google Maps no está disponible');
  }
});

// Watch para actualizar el heatmap cuando cambien las ubicaciones
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
