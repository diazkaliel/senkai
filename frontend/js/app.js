/**
 * SEIKO // ORQUESTADOR PRINCIPAL DE LA APLICACIÓN
 * Rutas cliente, interacción con API, efectos de iluminación y ciclo de vida.
 */

import { apiService } from './services/api.js';
import { CustomizerStudio } from './components/customizer.js';
import { CatalogComponent } from './components/catalog.js';
import { CartController } from './components/cart.js';
import { AdminWorkshopPortal } from './components/admin.js';

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

      window.addEventListener('hashchange', () => this.handleRouting());
      this.handleRouting();

      this.setupGlobalEvents();
      this.setupMouseSpotlight();

      console.log("⚡ Seiko DTF Studio Frontend iniciado.");
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

      document.querySelectorAll('.nav-link').forEach(link => {
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

    const searchInput = document.getElementById('globalSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const cards = document.querySelectorAll('.collection-card');
        cards.forEach(card => {
          const text = card.textContent.toLowerCase();
          if (!query || text.includes(query)) {
            card.style.display = "flex";
          } else {
            card.style.display = "none";
          }
        });
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

  setupMouseSpotlight() {
    // Iluminación reactiva al cursor sobre tarjetas de cristal
    document.addEventListener('mousemove', (e) => {
      document.querySelectorAll('.glass-card, .collection-card, .hero-main-glass-card, .hero-side-card, .product-card').forEach(card => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
      });
    });
  }

  showOrderSuccessModal(order) {
    const modal = document.getElementById('orderSuccessModal');
    const orderNumEl = document.getElementById('successOrderNumber');
    const orderDetailsEl = document.getElementById('successOrderDetails');

    if (orderNumEl) orderNumEl.textContent = order.order_number;
    if (orderDetailsEl) {
      orderDetailsEl.innerHTML = `
        <div style="margin-top: 1rem; padding: 1.25rem; background: var(--bg-surface-elevated); border-radius: var(--radius-xs); border: 1px solid var(--glass-border); text-align: left; font-family: var(--font-body);">
          <p style="font-size: 0.9rem; color: var(--text-primary);"><strong>Cliente:</strong> ${order.customer.full_name}</p>
          <p style="font-size: 0.9rem; color: var(--text-primary);"><strong>Modalidad:</strong> ${order.customer.delivery_method === 'pickup' ? 'Retiro en Taller Providencia' : 'Despacho Express a Domicilio'}</p>
          <p style="font-size: 0.9rem; color: var(--text-primary);"><strong>Fecha estimada:</strong> ${order.estimated_delivery}</p>
          <p style="font-size: 0.9rem; color: var(--accent-cyan); margin-top: 0.5rem; font-family: var(--font-mono);"><strong>Estado de Producción:</strong> ${order.status.toUpperCase()}</p>
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
          { name: "Obsidian Black", hex_code: "#121212", in_stock: true },
          { name: "Vintage Chalk White", hex_code: "#F4F4F0", in_stock: true },
          { name: "Slate Washed Gray", hex_code: "#3D404A", in_stock: true },
          { name: "Forest Deep Green", hex_code: "#1E3329", in_stock: true },
          { name: "Raw Terracotta", hex_code: "#8D4330", in_stock: true }
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
          { name: "Obsidian Black", hex_code: "#121212", in_stock: true },
          { name: "Pure White", hex_code: "#FFFFFF", in_stock: true },
          { name: "Navy Deep Blue", hex_code: "#101D2D", in_stock: true }
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
          { name: "Obsidian Black", hex_code: "#121212", in_stock: true },
          { name: "Cement Gray", hex_code: "#7A7D84", in_stock: true },
          { name: "Deep Olive Green", hex_code: "#2B3629", in_stock: true }
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
          { name: "Obsidian Black", hex_code: "#121212", in_stock: true },
          { name: "Heather Gray", hex_code: "#61646B", in_stock: true }
        ],
        sizes: ["S", "M", "L", "XL"],
        image_front_template: "/assets/templates/crewneck_front.svg",
        image_back_template: "/assets/templates/crewneck_back.svg",
        is_active: true
      }
    ];
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new SeikoApp();
  app.start();
});
