// Servicio centralizado de notificaciones toast para la interfaz de Senkai.
// Reemplaza los alerts nativos por avisos no bloqueantes, accesibles (aria-live)
// y con soporte para tipos semánticos: éxito, advertencia, error e informativo.

class NotificationService {
  constructor() {
    this.container = null;
    this.maxVisible = 4;
  }

  // Garantizo que el contenedor de toasts exista en el DOM con atributos de accesibilidad
  ensureContainer() {
    if (!this.container || !document.body.contains(this.container)) {
      this.container = document.getElementById('toastContainer');
      if (!this.container) {
        this.container = document.createElement('div');
        this.container.id = 'toastContainer';
        this.container.className = 'toast-container';
        this.container.setAttribute('role', 'region');
        this.container.setAttribute('aria-label', 'Notificaciones del sistema');
        this.container.setAttribute('aria-live', 'polite');
        document.body.appendChild(this.container);
      }
    }
    return this.container;
  }

  // Despacho un toast en pantalla
  show(message, type = 'info', durationMs = 4000) {
    if (typeof window === 'undefined' || !document.body) return;

    const container = this.ensureContainer();

    // Limito la cantidad máxima de avisos simultáneos para no saturar la pantalla
    while (container.children.length >= this.maxVisible) {
      container.firstElementChild.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');

    const iconMap = {
      success: 'check_circle',
      warning: 'warning',
      error: 'error',
      info: 'info'
    };

    const iconName = iconMap[type] || 'info';

    toast.innerHTML = `
      <span class="material-symbols-outlined" style="font-size: 18px; flex-shrink: 0;">${iconName}</span>
      <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    // Animación de salida y limpieza del elemento
    let isRemoved = false;
    const removeToast = () => {
      if (isRemoved) return;
      isRemoved = true;
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 200ms ease-out';
      setTimeout(() => {
        if (toast.parentNode) toast.remove();
      }, 200);
    };

    const timer = setTimeout(removeToast, durationMs);

    // Si el usuario hace clic en el toast, lo descarto de inmediato
    toast.style.cursor = 'pointer';
    toast.addEventListener('click', () => {
      clearTimeout(timer);
      removeToast();
    });

    return toast;
  }

  success(message, durationMs = 4000) {
    return this.show(message, 'success', durationMs);
  }

  warning(message, durationMs = 4500) {
    return this.show(message, 'warning', durationMs);
  }

  error(message, durationMs = 5000) {
    return this.show(message, 'error', durationMs);
  }

  info(message, durationMs = 4000) {
    return this.show(message, 'info', durationMs);
  }
}

export const notificationService = new NotificationService();

// Conecto al objeto global window para asegurar compatibilidad retroactiva
if (typeof window !== 'undefined') {
  window.showToast = (msg, type = 'info') => notificationService.show(msg, type);
}
