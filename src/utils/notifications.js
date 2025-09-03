import { ref } from 'vue';
import { useToast } from 'vue-toastification';
import echo from '@/utils/echo';
import axiosInstance from '@/utils/axios';
import { useAuthStore } from '@/stores/auth';

export function useNotifications() {
  const notifications = ref([]);
  const unreadCount = ref(0);
  const isLoading = ref(false);
  const toast = useToast();
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
    notifications.value.unshift(notification);
    updateUnreadCount();
    showNotificationToast(notification);
  };

  // Mostrar toast de notificación
  const showNotificationToast = (notification) => {
    const message = notification.data?.message || 'Nueva notificación';

    toast.info(message, {
      position: 'top-right',
      timeout: 5000,
      closeOnClick: true,
      pauseOnFocusLoss: true,
      pauseOnHover: true,
      draggable: true,
      draggablePercent: 0.6,
      showCloseButtonOnHover: false,
      hideProgressBar: false,
      closeButton: 'button',
      icon: true,
      rtl: false
    });
  };

  // Configurar Echo para notificaciones
  const setupEchoNotifications = () => {
    if (!auth.user?.id) return;

    // Escuchar notificaciones del usuario (Laravel Notifications)
    echo.private(`App.Models.User.${auth.user.id}`).notification((notification) => {
      console.log('Notificación recibida:', notification);

      // Verificar el tipo de notificación
      if (notification.data.type === 'form_response') {
        const notificationData = notification.data.notification;
        addNotification({
          id: notification.id,
          type: 'success',
          data: {
            message: `Nueva respuesta al formulario: ${notificationData.form_name || 'Formulario'}`
          },
          created_at: notification.data.timestamp,
          read_at: null
        });
      }
    });

    // Escuchar eventos personalizados por organización
    echo
      .private(`organization.${auth.user.organization_id}`)
      .listen('form.submitted', (e) => {
        const notification = {
          id: Date.now(),
          type: 'success',
          data: {
            message: `Nueva respuesta al formulario: ${e.form_name}`
          },
          created_at: new Date().toISOString(),
          read_at: null
        };
        addNotification(notification);
      })
      .listen('form.updated', (e) => {
        const notification = {
          id: Date.now(),
          type: 'info',
          data: {
            message: `Formulario actualizado: ${e.form_name}`
          },
          created_at: new Date().toISOString(),
          read_at: null
        };
        addNotification(notification);
      })
      .listen('form.assigned', (e) => {
        const notification = {
          id: Date.now(),
          type: 'info',
          data: {
            message: `Se te ha asignado el formulario: ${e.form_name}`
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
      echo.leave(`App.Models.User.${auth.user.id}`);
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
