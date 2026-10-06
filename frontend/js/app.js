/**
 * SEIKO // ORQUESTADOR PRINCIPAL DE LA APLICACIÓN
 * Rutas cliente, interacción con API, efectos de iluminación y ciclo de vida.
 */

import { apiService } from './services/api.js';
import { CustomizerStudio } from './components/customizer.js';
import { CatalogComponent } from './components/catalog.js';
import { ProductCarousel } from './components/carousel.js';
import { CartController } from './components/cart.js';
import { AdminWorkshopPortal } from './components/admin.js';
import './components/motion_effects.js';

class SeikoApp {
  constructor() {
    this.storefrontView = document.getElementById('storefrontView');
    this.adminView = document.getElementById('adminView');
    this.garments = [];
    
    this.cart = new CartController({
      onOrderSuccess: (order) => this.showOrderSuccessModal(order)
    });
    
    this.customizer = new CustomizerStudio('customizerContainer', {
      onAddToCart: (item) => this.cart.addItem(item)
    });

    this.carousel = new ProductCarousel('carouselContainer', {
      onSelectForCustomizer: (garmentId, options = {}) => {
        this.customizer.setGarmentById(garmentId, options);
        const customizerSec = document.getElementById('personalizador');
        if (customizerSec) {
          customizerSec.scrollIntoView({ behavior: 'smooth' });
        }
      },
      onAddToCart: (item) => this.cart.addItem(item)
    });

    this.catalog = new CatalogComponent('catalogContainer', {
      onSelectForCustomizer: (garmentId, options = {}) => {
        this.customizer.setGarmentById(garmentId, options);
        const customizerSec = document.getElementById('personalizador');
        if (customizerSec) {
          customizerSec.scrollIntoView({ behavior: 'smooth' });
        }
      },
      onAddToCart: (item) => this.cart.addItem(item)
    });

    this.admin = new AdminWorkshopPortal('adminViewContainer');
  }

  async start() {
    try {
      this.garments = await apiService.getGarments();
      
      if (!this.garments || this.garments.length === 0) {
        this.garments = this.getFallbackGarments();
      }

      await this.customizer.init(this.garments);
      this.catalog.init(this.garments);
      this.carousel.init(this.garments);

      // Hidratación progresiva del contenido CMS sobre el HTML semántico
      await this.hydrateSiteContent();

      // Notificar al subsistema de animaciones que el DOM dinámico está listo
      window.dispatchEvent(new CustomEvent('senkai:dom-updated'));

      window.addEventListener('hashchange', () => this.handleRouting());
      this.handleRouting();

      // Escuchar eventos en vivo emitidos al guardar en el panel administrativo
      window.addEventListener('senkai:cms-updated', () => {
        this.hydrateSiteContent();
        window.dispatchEvent(new CustomEvent('senkai:dom-updated'));
      });

      window.addEventListener('senkai:catalog-updated', async () => {
        try {
          this.garments = (await apiService.getGarments()) || this.garments;
          this.catalog.init(this.garments);
          this.carousel.init(this.garments);
          this.customizer.init(this.garments);
          window.dispatchEvent(new CustomEvent('senkai:dom-updated'));
        } catch (err) {
          console.error("Error al refrescar catálogo:", err);
        }
      });

      this.setupGlobalEvents();
    } catch (err) {
      console.error("Error iniciando Seiko App:", err);
    }

  }

  handleRouting() {
    const hash = window.location.hash || "#inicio";

    if (hash === "#admin") {
      this.storefrontView.style.display = "none";
      this.adminView.style.display = "block";
      this.admin.init();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      this.adminView.style.display = "none";
      this.storefrontView.style.display = "block";

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
    const successModal = document.getElementById('orderSuccessModal');
    if (closeSuccessModalBtn && successModal) {
      closeSuccessModalBtn.addEventListener('click', () => {
        successModal.classList.remove('open');
      });
    }
  }

  showOrderSuccessModal(order) {
    const modal = document.getElementById('orderSuccessModal');
    const orderNumEl = document.getElementById('successOrderNumber');
    const orderDetailsEl = document.getElementById('successOrderDetails');

    if (orderNumEl) orderNumEl.textContent = order.order_number;
    if (orderDetailsEl) {
      orderDetailsEl.innerHTML = `
        <div style="margin-top: 1rem; padding: 1.25rem; background: var(--bg-surface-elevated); border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); text-align: left; font-family: var(--font-body);">
          <p style="font-size: 0.9rem; color: var(--text-primary);"><strong>Cliente:</strong> ${order.customer.full_name}</p>
          <p style="font-size: 0.9rem; color: var(--text-primary);"><strong>Modalidad:</strong> ${order.customer.delivery_method === 'pickup' ? 'Retiro en Taller Providencia' : 'Despacho Express a Domicilio'}</p>
          <p style="font-size: 0.9rem; color: var(--text-primary);"><strong>Fecha estimada:</strong> ${order.estimated_delivery}</p>
          <p style="font-size: 0.9rem; color: var(--accent-primary); margin-top: 0.5rem; font-family: var(--font-mono);"><strong>Estado de Producción:</strong> ${order.status.toUpperCase()}</p>
        </div>
      `;
    }

    if (modal) {
      modal.classList.add('open');
    }
  }

  getFallbackGarments() {
    return [
      {
        id: "garment-polera-heavyweight-240",
        name: "Polera Oversized Heavyweight 240g",
        category: "polera_oversized",
        description: "Algodón peinado premium de 240g/m². Corte relajado drop-shoulder con cuello reforzado de 3cm.",
        weight_gsm: 240,
        composition: "100% Algodón Peinado Ringspun",
        base_price: 12990,
        colors: [
          { name: "Negro", hex_code: "#121212", in_stock: true },
          { name: "Gris", hex_code: "#61646B", in_stock: true },
          { name: "Azul", hex_code: "#142036", in_stock: true },
          { name: "Rojo", hex_code: "#B21B24", in_stock: true },
          { name: "Blanco", hex_code: "#FFFFFF", in_stock: true }
        ],
        sizes: ["S", "M", "L", "XL", "XXL"],
        image_front_template: "/assets/templates/tshirt_front.svg",
        image_back_template: "/assets/templates/tshirt_back.svg",
        is_active: true
      },
      {
        id: "garment-polera-classic-180",
        name: "Polera Clásica Regular Fit 180g",
        category: "polera",
        description: "Algodón 180g/m² suave y transpirable. Costuras laterales reforzadas y tapacostura de hombro a hombro.",
        weight_gsm: 180,
        composition: "100% Algodón Jersey",
        base_price: 8990,
        colors: [
          { name: "Negro", hex_code: "#121212", in_stock: true },
          { name: "Gris", hex_code: "#61646B", in_stock: true },
          { name: "Azul", hex_code: "#142036", in_stock: true },
          { name: "Rojo", hex_code: "#B21B24", in_stock: true },
          { name: "Blanco", hex_code: "#FFFFFF", in_stock: true }
        ],
        sizes: ["S", "M", "L", "XL"],
        image_front_template: "/assets/templates/tshirt_front.svg",
        image_back_template: "/assets/templates/tshirt_back.svg",
        is_active: true
      },
      {
        id: "garment-poleron-hoodie-320",
        name: "Polerón Canguro Hoodie Heavy 320g",
        category: "poleron_hoodie",
        description: "Polerón premium con interior afelpado (fleece) de 320g/m². Capucha forrada de doble capa y bolsillo canguro.",
        weight_gsm: 320,
        composition: "80% Algodón / 20% Poliéster",
        base_price: 24990,
        colors: [
          { name: "Negro", hex_code: "#121212", in_stock: true },
          { name: "Gris", hex_code: "#61646B", in_stock: true },
          { name: "Azul", hex_code: "#142036", in_stock: true },
          { name: "Rojo", hex_code: "#B21B24", in_stock: true },
          { name: "Blanco", hex_code: "#FFFFFF", in_stock: true }
        ],
        sizes: ["S", "M", "L", "XL", "XXL"],
        image_front_template: "/assets/templates/hoodie_front.svg",
        image_back_template: "/assets/templates/hoodie_back.svg",
        is_active: true
      },
      {
        id: "garment-poleron-crewneck-300",
        name: "Polerón Crewneck Cuello Redondo 300g",
        category: "poleron_crewneck",
        description: "Corte minimalista sin capucha con puños y pretina en rib 1x1 con elastano para máxima durabilidad.",
        weight_gsm: 300,
        composition: "80% Algodón / 20% Poliéster",
        base_price: 21990,
        colors: [
          { name: "Negro", hex_code: "#121212", in_stock: true },
          { name: "Gris", hex_code: "#61646B", in_stock: true },
          { name: "Azul", hex_code: "#142036", in_stock: true },
          { name: "Rojo", hex_code: "#B21B24", in_stock: true },
          { name: "Blanco", hex_code: "#FFFFFF", in_stock: true }
        ],
        sizes: ["S", "M", "L", "XL"],
        image_front_template: "/assets/templates/crewneck_front.svg",
        image_back_template: "/assets/templates/crewneck_back.svg",
        is_active: true
      }
    ];
  }

  /**
   * Consulta los contenidos vigentes al backend e hidrata reactivamente la vitrina pública.
   * Evita reescrituras agresivas preservando el layout inicial y SEO.
   */
  async hydrateSiteContent() {
    try {
      const content = await apiService.getSiteContent();
      if (!content) return;
      this.applyContentToDOM(content);
    } catch (err) {
      console.warn("Fallo de hidratación CMS:", err);
    }
  }

  applyContentToDOM(content) {
    if (!content) return;

    // 1. Barra de Anuncios
    if (content.announcement) {
      const bar = document.getElementById('topAnnouncementBar');
      const text = document.getElementById('topAnnouncementText');
      if (bar) bar.style.display = content.announcement.is_active ? '' : 'none';
      if (text) {
        text.innerHTML = `<span class="live-pulse-dot"></span> ${this.escapeHtml(content.announcement.text)}`;
      }
    }

    // 2. Hero Principal
    if (content.hero) {
      const title = document.getElementById('heroTitle');
      const sub = document.getElementById('heroSubtitle');
      const ctaText = document.getElementById('heroCtaText');
      const ctaLink = document.getElementById('heroCtaLink');
      const sideTop = document.getElementById('heroSideTopTag');
      const sideBottom = document.getElementById('heroSideBottomTag');

      if (title) {
        title.innerHTML = this.escapeHtml(content.hero.headline).replace(/\n/g, '<br>');
      }
      if (sub) sub.textContent = content.hero.subtitle;
      if (ctaText) ctaText.textContent = content.hero.cta_text;
      if (ctaLink && content.hero.cta_url) {
        ctaLink.setAttribute('href', content.hero.cta_url);
      }
      if (sideTop && content.hero.side_card_top_tag) {
        sideTop.textContent = content.hero.side_card_top_tag;
      }
      if (sideBottom && content.hero.side_card_bottom_tag) {
        sideBottom.textContent = content.hero.side_card_bottom_tag;
      }
    }

    // 2.1 Cinta Deslizante Marquee
    if (content.marquee) {
      const wrap = document.getElementById('marqueeWrap');
      const contentEl = document.getElementById('marqueeContent');
      if (wrap) wrap.style.display = content.marquee.is_active ? '' : 'none';
      if (contentEl && content.marquee.items && content.marquee.items.length > 0) {
        const doubleItems = content.marquee.items.concat(content.marquee.items);
        contentEl.innerHTML = doubleItems.map(it => `
          <div class="marquee-item">${this.escapeHtml(it)}</div>
          <div class="marquee-item">✦</div>
        `).join('');
      }
    }

    // 2.2 Encabezados de Sección (Colección & Atelier)
    if (content.headers) {
      const catTitle = document.querySelector('.collection-title-main');
      const catTag = document.querySelector('.collection-header-center .badge');
      const custTitle = document.getElementById('customizerSectionTitle');
      const custDesc = document.getElementById('customizerSectionDesc');

      if (catTitle && content.headers.catalog_title) catTitle.textContent = content.headers.catalog_title;
      if (catTag && content.headers.catalog_tag) catTag.textContent = content.headers.catalog_tag;
      if (custTitle && content.headers.customizer_title) custTitle.textContent = content.headers.customizer_title;
      if (custDesc && content.headers.customizer_desc) custDesc.textContent = content.headers.customizer_desc;
    }

    // 3. Métricas y Parámetros Técnicos
    if (content.stats) {
      const dpi = document.getElementById('stat-dpi');
      const minOrder = document.getElementById('stat-min-order');
      const lavados = document.getElementById('stat-lavados');
      const temp = document.getElementById('stat-temp');
      if (dpi) dpi.textContent = content.stats.dpi;
      if (minOrder) minOrder.textContent = content.stats.min_order;
      if (lavados) lavados.textContent = `+${content.stats.wash_cycles}`;
      if (temp) temp.textContent = `${content.stats.curing_temp}°C`;
    }

    // 4. Manifiesto y Statement
    if (content.statement) {
      const headline = document.getElementById('statementHeadline');
      const body = document.getElementById('statementBody');
      if (headline) headline.textContent = content.statement.headline;
      if (body) body.textContent = content.statement.body;
    }

    // 5. Narrativa Editorial (Misión & Visión)
    if (content.editorial) {
      const mTag = document.getElementById('editorialMissionTag');
      const mTitle = document.getElementById('editorialMissionTitle');
      const mBody = document.getElementById('editorialMissionBody');
      const vTag = document.getElementById('editorialVisionTag');
      const vTitle = document.getElementById('editorialVisionTitle');
      const vBody = document.getElementById('editorialVisionBody');

      if (mTag) mTag.textContent = content.editorial.mission_tag;
      if (mTitle) mTitle.textContent = content.editorial.mission_title;
      if (mBody) mBody.textContent = content.editorial.mission_body;
      if (vTag) vTag.textContent = content.editorial.vision_tag;
      if (vTitle) vTitle.textContent = content.editorial.vision_title;
      if (vBody) vBody.textContent = content.editorial.vision_body;
    }

    // 6. Protocolo de Producción (3 Pasos)
    if (content.protocol) {
      const pBadge = document.getElementById('protocolBadgeTag');
      const pTitle = document.getElementById('protocolTitle');
      const pDesc = document.getElementById('protocolDesc');

      if (pBadge && content.protocol.section_tag) pBadge.textContent = content.protocol.section_tag;
      if (pTitle) pTitle.textContent = content.protocol.section_title;
      if (pDesc) pDesc.textContent = content.protocol.section_desc;

      if (content.protocol.steps && Array.isArray(content.protocol.steps)) {
        content.protocol.steps.forEach((step, idx) => {
          const st = document.getElementById(`protocolStepTitle${idx}`);
          const sd = document.getElementById(`protocolStepDesc${idx}`);
          if (st) st.textContent = step.title;
          if (sd) sd.textContent = step.description;
        });
      }
    }

    // 7. Footer & Ubicación
    if (content.contact) {
      const addr = document.getElementById('footerAddressLine');
      if (addr) {
        addr.textContent = `Estudio de Estampado Textil de Precisión • ${content.contact.workshop_city} • ${content.contact.address}`;
      }
      const hours = document.getElementById('footerHours');
      if (hours && content.contact.business_hours) {
        hours.textContent = content.contact.business_hours;
      }
      const waLink = document.getElementById('footerWhatsappLink');
      const waText = document.getElementById('footerWhatsappText');
      if (waText && content.contact.whatsapp_number) {
        waText.textContent = content.contact.whatsapp_number;
      }
      if (waLink && content.contact.whatsapp_number) {
        const cleanNum = content.contact.whatsapp_number.replace(/[^0-9]/g, '');
        waLink.href = `https://wa.me/${cleanNum}`;
      }
      const igLink = document.getElementById('footerInstagramLink');
      const igText = document.getElementById('footerInstagramText');
      if (igText && content.contact.instagram) {
        igText.textContent = content.contact.instagram;
      }
      if (igLink && content.contact.instagram) {
        const handle = content.contact.instagram.replace('@', '');
        igLink.href = `https://instagram.com/${handle}`;
      }
      const copy = document.getElementById('footerCopyright');
      if (copy && content.contact.copyright_text) {
        copy.textContent = `© 2026 ${content.contact.copyright_text}`;
      }
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}


document.addEventListener('DOMContentLoaded', () => {
  const app = new SeikoApp();
  app.start();
});
