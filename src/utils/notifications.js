import { ref } from 'vue';
import echo from '@/utils/echo';
import axiosInstance from '@/utils/axios';
import { useAuthStore } from '@/stores/auth';

export function useNotifications() {
  const notifications = ref([]);
  const unreadCount = ref(0);
  const isLoading = ref(false);
  const auth = useAuthStore();

  // Cargar notificaciones iniciales
  const fetchNotifications = async () => {
    isLoading.value = true;
    try {
      const response = await axiosInstance.get('/notifications');
      notifications.value = response.data.data || [];
      updateUnreadCount();
    } catch (error) {
      console.error('Error al cargar notificaciones:', error);
    } finally {
      isLoading.value = false;
    }
  };

  // Actualizar contador de no leídas
  const updateUnreadCount = () => {
    unreadCount.value = notifications.value.filter((n) => !n.read_at).length;
  };

  // Agregar nueva notificación
  const addNotification = (notification) => {
    console.log('📨 Agregando notificación:', notification);
    notifications.value = [notification, ...notifications.value];
    updateUnreadCount();
  };

  // Configurar Echo para notificaciones
  const setupEchoNotifications = () => {
    if (!auth.user?.id) {
      console.log('❌ Usuario no autenticado');
      return;
    }

    console.log('🔧 Configurando notificaciones para usuario:', auth.user.id);

    // Escuchar notificaciones del usuario
    echo
      .private(`user.${auth.user.id}`)
      .listen('notification.sent', (e) => {
        console.log('📨 Evento notification.sent recibido:', e);

        // Extraer datos de la estructura anidada
        const notificationData = e.notification || e;

        const notification = {
          id: notificationData.id || Date.now(),
          type: 'info',
          data: {
            message: notificationData.data?.message || 'Nueva notificación'
          },
          created_at: notificationData.created_at || new Date().toISOString(),
          read_at: notificationData.read_at || null
        };

        console.log('📝 Notificación procesada:', notification);
        addNotification(notification);
      })
      .listen('FormAssigned', (e) => {
        console.log('📨 Evento FormAssigned recibido:', e);

        const notification = {
          id: Date.now(),
          type: 'info',
          data: {
            message: `Se te asignó el formulario ${e.form_name}`
          },
          created_at: new Date().toISOString(),
          read_at: null
        };

        addNotification(notification);
      });
  };

  // Limpiar Echo
  const cleanupEcho = () => {
    if (auth.user?.id) {
      echo.leave(`user.${auth.user.id}`);
    }
  };

  return {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    addNotification,
    setupEchoNotifications,
    cleanupEcho
  };
}
