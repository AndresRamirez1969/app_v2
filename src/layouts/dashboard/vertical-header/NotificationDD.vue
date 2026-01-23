<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { CheckCircleOutlined, MessageOutlined, SettingOutlined, BellOutlined } from '@ant-design/icons-vue';
import { useNotifications } from '@/utils/notifications';
import { mdiThemeLightDark  } from '@mdi/js';
import { useTheme } from 'vuetify';

const theme = useTheme();

const { notifications, unreadCount, isLoading, fetchNotifications, setupEchoNotifications, cleanupEcho } = useNotifications();

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

watch(notifications, (newNotifications) => {}, { deep: true });

watch(unreadCount, (newCount) => {});

onMounted(async () => {
  await fetchNotifications();
  setTimeout(() => {
    setupEchoNotifications();
  }, 100);
});

onUnmounted(() => {
  cleanupEcho();
});
</script>

<template>
  <!-- <div class="d-flex align-center">
    <v-tooltip text="Cambiar temática" location="bottom">
      <template v-slot:activator="{ props }">
        <v-btn
          icon
          variant="text"
          class="text-secondary ml-sm-2 ml-1"
          color="onSurface"
          rounded="sm"
          size="small"
          v-bind="props"
          @click="theme.global.name.value = theme.global.name.value === 'light' ? 'dark' : 'light'"
        >
          <v-icon :icon="mdiThemeLightDark" :style="{ fontSize: '16px' }" />
        </v-btn>
      </template>
    </v-tooltip>
  </div> -->
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
        </div>
      </div>
      <v-divider></v-divider>
      <perfect-scrollbar style="height: calc(100vh - 300px); max-height: 265px">
        <v-list class="py-0" lines="two" aria-label="notification list">
          <div v-if="isLoading" class="text-center py-4">
            <v-progress-circular indeterminate color="primary" size="24" />
            <p class="text-caption mt-2">Cargando notificaciones...</p>
          </div>

          <v-list-item
            v-else
            v-for="notification in notifications"
            :key="notification.id"
            :value="notification.id"
            color="secondary"
            class="no-spacer py-1"
            :class="{ unread: !notification.read_at }"
          >
            <template v-slot:prepend>
              <v-avatar size="36" variant="flat" :color="getNotificationColor(notification.type)" class="mr-3 py-2">
                <component :is="getNotificationIcon(notification.type)" />
              </v-avatar>
            </template>
            <div class="d-inline-flex justify-space-between w-100">
              <span class="text-caption">{{ formatTime(notification.created_at) }}</span>
              <v-icon v-if="!notification.read_at" size="12" color="primary">mdi-circle</v-icon>
            </div>
            <p class="text-caption text-medium-emphasis my-0">{{ notification.data.message }}</p>
          </v-list-item>

          <div v-if="!isLoading && notifications.length === 0" class="text-center pa-4">
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

.unread {
  background-color: rgba(var(--v-theme-primary), 0.05);
}

.unread:hover {
  background-color: rgba(var(--v-theme-primary), 0.1);
}
</style>
