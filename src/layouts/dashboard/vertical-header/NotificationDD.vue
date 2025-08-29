<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue';
// icons
import { CheckCircleOutlined, GiftOutlined, MessageOutlined, SettingOutlined, BellOutlined } from '@ant-design/icons-vue';
import { useAuthStore } from '@/stores/auth';
import axiosInstance from '@/utils/axios';

const notifications = ref([]);
const auth = useAuthStore();

const fetchNotifications = async () => {
  const response = await axiosInstance.get('/notifications');
  notifications.value = response.data.data;
  console.log('notifications', notifications.value);
};

// ELIMINAR toda la función setupEchoListener()

const isActive = ref(true);

// Función para obtener el color del avatar según el tipo
const getNotificationColor = (type) => {
  const colors = {
    info: 'lightprimary',
    success: 'lightsuccess',
    warning: 'lightwarning',
    error: 'lighterror',
    default: 'lightprimary'
  };
  return colors[type] || colors.default;
};

// Función para obtener el icono según el tipo
const getNotificationIcon = (type) => {
  const icons = {
    info: MessageOutlined,
    success: CheckCircleOutlined,
    warning: SettingOutlined,
    error: SettingOutlined,
    default: BellOutlined
  };
  return icons[type] || icons.default;
};

// Función para formatear el tiempo
const formatTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Ahora';
  if (diffMins < 60) return `${diffMins} min`;
  if (diffHours < 24) return `${diffHours} horas`;
  if (diffDays < 7) return `${diffDays} días`;
  return date.toLocaleDateString();
};

// Actualizar el badge con el número real de notificaciones no leídas
const unreadCount = computed(() => {
  return notifications.value.filter((n) => !n.read_at).length;
});

function deactivateItem() {
  isActive.value = false;
}
</script>

<template>
  <!-- ---------------------------------------------- -->
  <!-- notifications DD -->
  <!-- ---------------------------------------------- -->
  <v-menu :close-on-content-click="false" offset="6, 0">
    <template v-slot:activator="{ props }">
      <v-btn icon class="text-secondary ml-sm-2 ml-1" color="darkText" rounded="sm" size="small" v-bind="props">
        <v-badge :content="unreadCount" color="primary" offset-x="-4" offset-y="-5">
          <BellOutlined :style="{ fontSize: '16px' }" />
        </v-badge>
      </v-btn>
    </template>
    <v-sheet rounded="md" width="387" class="notification-dropdown">
      <div class="pa-4">
        <div class="d-flex align-center justify-space-between">
          <h6 class="text-subtitle-1 mb-0">Notificaciones</h6>
          <v-btn
            variant="text"
            color="success"
            icon
            rounded
            size="small"
            @click="deactivateItem()"
            :class="isActive ? 'd-block' : 'd-none'"
          >
            <CheckCircleOutlined :style="{ fontSize: '16px' }" />
            <v-tooltip aria-label="tooltip" activator="parent" location="bottom" :content-class="isActive ? 'custom-tooltip' : 'd-none'">
              <span class="text-caption">Marcar como leído</span>
            </v-tooltip>
          </v-btn>
        </div>
      </div>
      <v-divider></v-divider>
      <perfect-scrollbar style="height: calc(100vh - 300px); max-height: 265px">
        <v-list class="py-0" lines="two" aria-label="notification list" aria-busy="true">
          <v-list-item
            v-for="notification in notifications"
            :key="notification.id"
            :value="notification.id"
            color="secondary"
            class="no-spacer py-1"
          >
            <template v-slot:prepend>
              <v-avatar size="36" variant="flat" :color="getNotificationColor(notification.type)" class="mr-3 py-2">
                <component :is="getNotificationIcon(notification.type)" />
              </v-avatar>
            </template>
            <div class="d-inline-flex justify-space-between w-100">
              <span class="text-caption">{{ formatTime(notification.created_at) }}</span>
            </div>
            <p class="text-caption text-medium-emphasis my-0">{{ notification.data.message }}</p>
          </v-list-item>

          <!-- Mostrar mensaje si no hay notificaciones -->
          <div v-if="notifications.length === 0" class="text-center pa-4">
            <p class="text-caption text-grey">No hay notificaciones</p>
          </div>
        </v-list>
      </perfect-scrollbar>
    </v-sheet>
  </v-menu>
</template>

<style lang="scss">
.v-tooltip {
  > .v-overlay__content.custom-tooltip {
    padding: 2px 6px;
  }
}
</style>
