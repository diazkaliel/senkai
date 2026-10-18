// Orquestador principal de la vitrina y navegación SPA de Senkai DTF Studio.
// Inicializo los componentes del storefront (carrito, mesa de diseño, lookbook y catálogo),
// coordino las rutas por hash (#inicio vs #admin) y sincronizo los cambios del CMS en vivo.

import { apiService } from './services/api.js?v=20261018_v3';
import { contentHydrator } from './services/content_hydrator.js?v=20261018_v3';
import { FALLBACK_GARMENTS } from './data/fallback_garments.js?v=20261018_v3';
import { CustomizerStudio } from './components/customizer.js?v=20261018_v3';
import { CatalogComponent } from './components/catalog.js?v=20261018_v3';
import { ProductCarousel } from './components/carousel.js?v=20261018_v3';
import { CartController } from './components/cart.js?v=20261018_v3';
import { OrderTrackerComponent } from './components/order_tracker.js?v=20261018_v3';
import { AdminWorkshopPortal } from './components/admin.js?v=20261018_v3';
import './components/motion_effects.js?v=20261018_v3';

class SenkaiApp {
  constructor() {
    this.storefrontView = document.getElementById('storefrontView');
    this.adminView = document.getElementById('adminView');
    this.garments = [];

    // Inicializo el carrito y conecto el callback para cuando una orden se crea con éxito
    this.cart = new CartController({
      onOrderSuccess: (order) => this.showOrderSuccessModal(order)
    });

    // Mesa de personalización técnica DTF
    this.customizer = new CustomizerStudio('customizerContainer', {
      onAddToCart: (item) => this.cart.addItem(item)
    });

    // Carrusel superior de lanzamientos destacados
    this.carousel = new ProductCarousel('carouselContainer', {
      onSelectForCustomizer: (garmentId, options = {}) => {
        this.customizer.setGarmentById(garmentId, options);
        const section = document.getElementById('personalizador');
        if (section) section.scrollIntoView({ behavior: 'smooth' });
      },
      onAddToCart: (item) => this.cart.addItem(item)
    });

    // Catálogo general de prendas base
    this.catalog = new CatalogComponent('catalogContainer', {
      onSelectForCustomizer: (garmentId, options = {}) => {
        this.customizer.setGarmentById(garmentId, options);
        const section = document.getElementById('personalizador');
        if (section) section.scrollIntoView({ behavior: 'smooth' });
      },
      onAddToCart: (item) => this.cart.addItem(item)
    });

    // Módulo público de rastreo de pedidos por número de orden
    this.orderTracker = new OrderTrackerComponent('orderTrackerContainer');

    // Portal administrativo de taller (Kanban, Analítica, CMS y Stock)
    this.admin = new AdminWorkshopPortal('adminViewContainer');
  }

  async start() {
    try {
      // 1. Cargo prendas desde la API; si falla o no hay datos, uso el fallback local
      this.garments = await apiService.getGarments();
      if (!this.garments || this.garments.length === 0) {
        this.garments = FALLBACK_GARMENTS;
      }

      // 2. Inicializo los componentes visuales con el catálogo activo
      await this.customizer.init(this.garments);
      this.catalog.init(this.garments);
      this.carousel.init(this.garments);
      this.orderTracker.init();

      // 3. Hidrato el contenido editable desde el CMS (anuncios, hero, stats, etc.)
      await this.hydrateSiteContent();

      // 4. Aviso al sistema de animaciones para calcular observadores del DOM
      window.dispatchEvent(new CustomEvent('senkai:dom-updated'));

      // 5. Manejo de navegación por hash (#inicio, #catalogo, #personalizador, #rastreo, #admin)
      window.addEventListener('hashchange', () => this.handleRouting());
      this.handleRouting();

      // 6. Escuchadores para refrescar la vitrina al vuelo cuando el taller guarda cambios
      window.addEventListener('senkai:cms-updated', () => {
        this.hydrateSiteContent();
        window.dispatchEvent(new CustomEvent('senkai:dom-updated'));
      });

      window.addEventListener('senkai:catalog-updated', async () => {
        try {
          this.garments = (await apiService.getGarments()) || this.garments;
          this.catalog.init(this.garments);
          this.carousel.init(this.garments);
          await this.customizer.init(this.garments);
          await this.hydrateSiteContent();
          window.dispatchEvent(new CustomEvent('senkai:dom-updated'));
        } catch (err) {
          console.error("Error al refrescar catálogo en vivo:", err);
        }
      });

      this.setupGlobalEvents();
    } catch (err) {
      console.error("Error iniciando Senkai App:", err);
    }
  }

  // Conmuto entre la vitrina pública y el panel privado de taller según el hash
  handleRouting() {
    const hash = window.location.hash || "#inicio";

    // Cierro cualquier drawer abierto al cambiar de vista para no bloquear la pantalla
    if (this.cart && typeof this.cart.closeDrawer === 'function') {
      this.cart.closeDrawer();
    }
    const mobileDrawer = document.getElementById('mobileNavDrawer');
    const mobileBackdrop = document.getElementById('mobileNavBackdrop');
    const hamburger = document.getElementById('navHamburger');
    if (mobileDrawer) mobileDrawer.classList.remove('open');
    if (mobileBackdrop) mobileBackdrop.classList.remove('open');
    if (hamburger) hamburger.classList.remove('is-open');
    document.body.style.overflow = "";

    if (hash === "#admin") {
      this.storefrontView.style.display = "none";
      this.adminView.style.display = "block";
      this.admin.init();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      this.adminView.style.display = "none";
      this.storefrontView.style.display = "block";

      // Actualizo el estado visual de los links activos en la barra de navegación
      document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(link => {
        if (link.getAttribute('href') === hash) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });

      const targetSection = document.querySelector(hash);
      if (targetSection) {
        targetSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }

  // Pido los contenidos editoriales a la API y delego la inyección al hydrator
  async hydrateSiteContent() {
    try {
      const content = await apiService.getSiteContent();
      if (!content) return;
      contentHydrator.apply(content);

      // Sincronizo encabezados dinámicos con el componente de catálogo
      if (content.headers && this.catalog && typeof this.catalog.setHeaders === 'function') {
        this.catalog.setHeaders(content.headers.catalog_title, content.headers.catalog_desc, content.headers.catalog_tag);
      }

      // Sincronizo las prendas destacadas y categorías del Lookbook con el carrusel y el catálogo
      if (content.lookbook && Array.isArray(content.lookbook.items)) {
        if (this.carousel && typeof this.carousel.updateItems === 'function') {
          this.carousel.updateItems(content.lookbook.items);
        }
        if (this.catalog && typeof this.catalog.updateItems === 'function') {
          this.catalog.updateItems(content.lookbook.items, content.lookbook.categories);
        }
      }
    } catch (err) {
      console.warn("Fallo leve de hidratación CMS:", err);
    }
  }

  // Eventos globales: buscador rápido en tiempo real y cierre de modales
  setupGlobalEvents() {
    const adminToggleBtn = document.getElementById('adminToggleBtn');
    if (adminToggleBtn) {
      adminToggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.hash = "#admin";
      });
    }

    const filterProducts = (query) => {
      const cards = document.querySelectorAll('.collection-card-pro, .collection-card');
      cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        if (!query || text.includes(query)) {
          card.style.display = "";
        } else {
          card.style.display = "none";
        }
      });
    };

    const searchInput = document.getElementById('globalSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        filterProducts(e.target.value.toLowerCase().trim());
      });
    }

    const mobileSearchInput = document.getElementById('mobileSearchInput');
    if (mobileSearchInput) {
      mobileSearchInput.addEventListener('input', (e) => {
        filterProducts(e.target.value.toLowerCase().trim());
      });
    }

    const closeSuccessModalBtn = document.getElementById('closeSuccessModalBtn');
    const trackOrderFromSuccessBtn = document.getElementById('trackOrderFromSuccessBtn');
    const successModal = document.getElementById('orderSuccessModal');
    if (closeSuccessModalBtn && successModal) {
      closeSuccessModalBtn.addEventListener('click', () => {
        successModal.classList.remove('open');
      });
    }
    if (trackOrderFromSuccessBtn && successModal) {
      trackOrderFromSuccessBtn.addEventListener('click', () => {
        const orderCode = document.getElementById('successOrderNumber')?.textContent?.trim();
        successModal.classList.remove('open');
        window.location.hash = '#rastreo';
        if (orderCode && this.orderTracker) {
          this.orderTracker.trackOrder(orderCode);
        }
      });
    }
  }

  // Muestro el modal de confirmación con el resumen de la orden generada
  showOrderSuccessModal(order) {
    const modal = document.getElementById('orderSuccessModal');
    const orderNumEl = document.getElementById('successOrderNumber');
    const orderDetailsEl = document.getElementById('successOrderDetails');

    if (this.orderTracker && order.order_number) {
      this.orderTracker.saveLastOrderNumber(order.order_number);
    }

    if (orderNumEl) orderNumEl.textContent = order.order_number;
    if (orderDetailsEl) {
      orderDetailsEl.innerHTML = `
        <div class="success-details-box">
          <p style="font-size: 0.9rem; color: var(--text-primary); margin-bottom: 0.35rem;"><strong>Cliente:</strong> ${order.customer.full_name}</p>
          <p style="font-size: 0.9rem; color: var(--text-primary); margin-bottom: 0.35rem;"><strong>Modalidad:</strong> ${order.customer.delivery_method === 'pickup' ? 'Retiro en Taller Senkai (Providencia)' : 'Despacho Express a Domicilio'}</p>
          <p style="font-size: 0.9rem; color: var(--text-primary); margin-bottom: 0.35rem;"><strong>Fecha estimada:</strong> ${order.estimated_delivery}</p>
          <p style="font-size: 0.9rem; color: var(--accent-primary); margin-top: 0.5rem; font-family: var(--font-mono);"><strong>Estado de Producción:</strong> ${order.status.toUpperCase()}</p>
        </div>
      `;
    }

    if (modal) {
      modal.classList.add('open');
    }
  }
}

// Arranco la aplicación cuando el navegador termina de parsear el HTML
document.addEventListener('DOMContentLoaded', () => {
  const app = new SenkaiApp();
  app.start();
});
