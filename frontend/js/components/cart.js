// Carrito de compras y pasarela de checkout.
// Manejo los productos seleccionados, cálculo de totales (con o sin envío) y envío del pedido a taller.

import { apiService } from '../services/api.js?v=20261018_v3';
import { notificationService } from '../services/notification_service.js?v=20261018_v3';

const CART_STORAGE_KEY = 'senkai_cart_items_v1';

export class CartController {
  constructor(options = {}) {
    this.items = [];
    this.shippingCost = 3990;
    this.deliveryMethod = "shipping";
    this.onOrderSuccess = options.onOrderSuccess || (() => {});
    
    this.drawerEl = document.getElementById('cartDrawer');
    this.backdropEl = document.getElementById('drawerBackdrop');
    this.counterEl = document.getElementById('cartCounter');
    this.itemsListEl = document.getElementById('cartItemsList');
    this.checkoutModalEl = document.getElementById('checkoutModal');

    this.loadFromStorage();
    this.attachDOMEvents();
    this.updateUI();
  }

  loadFromStorage() {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.items = parsed;
        }
      }
    } catch (e) {
      console.warn("Error recuperando carrito de localStorage:", e);
      this.items = [];
    }
  }

  saveToStorage() {
    try {
      if (this.items && this.items.length > 0) {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(this.items));
      } else {
        localStorage.removeItem(CART_STORAGE_KEY);
      }
    } catch (e) {
      console.warn("Error guardando carrito en localStorage:", e);
    }
  }

  addItem(item) {
    this.items.push(item);
    this.saveToStorage();
    this.updateUI();
    this.openDrawer();
    notificationService.success(`✨ Prenda agregada a la orden de trabajo: ${item.garment_name}`);
  }

  removeItem(index) {
    this.items.splice(index, 1);
    this.saveToStorage();
    this.updateUI();
  }

  clear() {
    this.items = [];
    this.saveToStorage();
    this.updateUI();
  }

  getItemsCount() {
    return this.items.reduce((acc, item) => acc + item.quantity, 0);
  }

  getSubtotal() {
    return this.items.reduce((acc, item) => acc + item.subtotal, 0);
  }

  getTotal() {
    const shipping = this.deliveryMethod === "pickup" ? 0 : this.shippingCost;
    return this.getSubtotal() + shipping;
  }

  openDrawer() {
    if (this.drawerEl && this.backdropEl) {
      this.drawerEl.classList.add('open');
      this.backdropEl.classList.add('open');
    }
  }

  closeDrawer() {
    if (this.drawerEl && this.backdropEl) {
      this.drawerEl.classList.remove('open');
      this.backdropEl.classList.remove('open');
    }
  }

  openCheckoutModal() {
    if (this.items.length === 0) {
      notificationService.warning("Tu carrito está vacío. Agrega una prenda o estampa personalizada.");
      return;
    }
    this.closeDrawer();
    if (this.checkoutModalEl) {
      this.checkoutModalEl.classList.add('open');
      this.renderCheckoutSummary();
    }
  }

  closeCheckoutModal() {
    if (this.checkoutModalEl) {
      this.checkoutModalEl.classList.remove('open');
    }
  }

  updateUI() {
    const count = this.getItemsCount();
    if (this.counterEl) {
      this.counterEl.textContent = count;
      this.counterEl.style.display = count > 0 ? 'inline-block' : 'none';
    }

    if (!this.itemsListEl) return;

    if (this.items.length === 0) {
      this.itemsListEl.innerHTML = `
        <div class="cart-empty-state">
          <span class="material-symbols-outlined cart-empty-icon">shopping_bag</span>
          <p class="cart-empty-title">Tu carrito de taller está vacío</p>
          <p class="cart-empty-desc">Selecciona una prenda en el catálogo o configúrala en la mesa de personalización DTF.</p>
        </div>
      `;
    } else {
      this.itemsListEl.innerHTML = this.items.map((item, idx) => `
        <div class="cart-item">
          <div class="cart-item-preview" style="background: ${item.selected_color.hex_code};">
            <span style="font-size: 0.75rem; color: ${item.selected_color.hex_code === '#F4F4F0' || item.selected_color.hex_code === '#FFFFFF' ? '#000' : '#fff'}; font-weight: 800; font-family: var(--font-mono);">
              ${item.selected_size}
            </span>
          </div>
          <div class="cart-item-details">
            <div class="cart-item-title">${item.garment_name}</div>
            <div class="cart-item-specs">
              Color: <strong>${item.selected_color.name}</strong> • Talla: <strong>${item.selected_size}</strong><br>
              ${this.formatItemPrintsSpecs(item)}
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 0.8rem; font-family: var(--font-mono); color: var(--text-muted);">${item.quantity} un. x $${item.unit_price.toLocaleString('es-CL')}</span>
              <div class="cart-item-price">$${item.subtotal.toLocaleString('es-CL')} CLP</div>
            </div>
          </div>
          <span class="cart-item-remove" data-remove-idx="${idx}" title="Eliminar">&times;</span>
        </div>
      `).join('');

      this.itemsListEl.querySelectorAll('[data-remove-idx]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idx = parseInt(e.currentTarget.dataset.removeIdx, 10);
          this.removeItem(idx);
        });
      });
    }

    const drawerSubtotal = document.getElementById('drawerSubtotal');
    const drawerTotal = document.getElementById('drawerTotal');
    if (drawerSubtotal) drawerSubtotal.textContent = `$${this.getSubtotal().toLocaleString('es-CL')} CLP`;
    if (drawerTotal) drawerTotal.textContent = `$${this.getTotal().toLocaleString('es-CL')} CLP`;
  }

  /**
   * Resumen conciso para el operario y cliente de las estampas aplicadas a la prenda.
   * Muestra de forma nítida la condición de ambas caras (Frente y Espalda).
   */
  formatItemPrintsSpecs(item) {
    if (item.preview_front_summary || item.preview_back_summary) {
      const front = item.preview_front_summary || 'Cara Lisa';
      const back = item.preview_back_summary || 'Cara Lisa';
      return `
        <div style="font-size: 0.775rem; margin-top: 3px; line-height: 1.4;">
          <span style="color: var(--text-primary); font-weight: 700;">Frente:</span> ${front} &bull; 
          <span style="color: var(--text-primary); font-weight: 700;">Espalda:</span> ${back}
        </div>
      `;
    }
    if (item.prints && item.prints.length > 0) {
      const frontPrints = item.prints.filter(p => p.view === 'front');
      const backPrints = item.prints.filter(p => p.view === 'back');
      const front = frontPrints.length > 0 ? frontPrints.map(p => p.print_size).join(', ') : 'Cara Lisa';
      const back = backPrints.length > 0 ? backPrints.map(p => p.print_size).join(', ') : 'Cara Lisa';
      return `
        <div style="font-size: 0.775rem; margin-top: 3px; line-height: 1.4;">
          <span style="color: var(--text-primary); font-weight: 700;">Frente:</span> ${front} &bull; 
          <span style="color: var(--text-primary); font-weight: 700;">Espalda:</span> ${back}
        </div>
      `;
    }
    if (item.dtf_config) {
      return `Estampa: <strong>${item.dtf_config.position.toUpperCase()} [${item.dtf_config.print_size}]</strong>`;
    }
    return 'Prenda Lisa (Sin estampa)';
  }

  renderCheckoutSummary() {
    const summaryEl = document.getElementById('checkoutItemsSummary');
    const totalEl = document.getElementById('checkoutTotalVal');
    const shippingEl = document.getElementById('checkoutShippingVal');

    if (summaryEl) {
      summaryEl.innerHTML = this.items.map(i => {
        let frontSpec = 'Lisa';
        let backSpec = 'Lisa';
        if (i.prints && i.prints.length > 0) {
          const fp = i.prints.filter(p => p.view === 'front');
          const bp = i.prints.filter(p => p.view === 'back');
          if (fp.length > 0) frontSpec = fp.map(p => p.print_size).join('+');
          if (bp.length > 0) backSpec = bp.map(p => p.print_size).join('+');
        }

        return `
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem; padding-bottom: 0.5rem; border-bottom: 1px dashed rgba(255,255,255,0.06);">
            <div>
              <div style="color: var(--text-primary); font-weight: 600;">${i.quantity}x ${i.garment_name} (${i.selected_size}) - ${i.selected_color.name}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono);">
                Frente: [${frontSpec}] &bull; Espalda: [${backSpec}]
              </div>
            </div>
            <span style="font-family: var(--font-mono); font-weight: 600;">$${i.subtotal.toLocaleString('es-CL')} CLP</span>
          </div>
        `;
      }).join('');
    }

    const shipping = this.deliveryMethod === "pickup" ? 0 : this.shippingCost;
    if (shippingEl) shippingEl.textContent = shipping === 0 ? "GRATIS" : `$${shipping.toLocaleString('es-CL')} CLP`;
    if (totalEl) totalEl.textContent = `$${this.getTotal().toLocaleString('es-CL')} CLP`;
  }

  attachDOMEvents() {
    const cartTriggerBtn = document.getElementById('cartTriggerBtn');
    const closeDrawerBtn = document.getElementById('closeCartDrawerBtn');
    const goToCheckoutBtn = document.getElementById('goToCheckoutBtn');
    const closeCheckoutBtn = document.getElementById('closeCheckoutModalBtn');

    if (cartTriggerBtn) cartTriggerBtn.addEventListener('click', () => this.openDrawer());
    if (closeDrawerBtn) closeDrawerBtn.addEventListener('click', () => this.closeDrawer());
    if (this.backdropEl) this.backdropEl.addEventListener('click', () => this.closeDrawer());
    if (goToCheckoutBtn) goToCheckoutBtn.addEventListener('click', () => this.openCheckoutModal());
    if (closeCheckoutBtn) closeCheckoutBtn.addEventListener('click', () => this.closeCheckoutModal());

    const deliveryMethodSelect = document.getElementById('deliveryMethodSelect');
    const shippingAddressGroup = document.getElementById('shippingAddressGroup');

    if (deliveryMethodSelect) {
      deliveryMethodSelect.addEventListener('change', (e) => {
        this.deliveryMethod = e.target.value;
        if (shippingAddressGroup) {
          shippingAddressGroup.style.display = this.deliveryMethod === 'pickup' ? 'none' : 'block';
        }
        this.renderCheckoutSummary();
      });
    }

    const checkoutForm = document.getElementById('checkoutForm');
    if (checkoutForm) {
      checkoutForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleCheckoutSubmit(new FormData(checkoutForm));
      });
    }
  }

  async handleCheckoutSubmit(formData) {
    const submitBtn = document.getElementById('confirmOrderBtn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "INGRESANDO AL TALLER...";
    }

    const customer = {
      full_name: formData.get('fullName'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      delivery_method: this.deliveryMethod,
      shipping_address: formData.get('shippingAddress') || null,
      shipping_city: formData.get('shippingCity') || null,
      notes: formData.get('notes') || null
    };

    const orderPayload = {
      customer,
      items: this.items,
      total_amount: this.getTotal(),
      shipping_cost: this.deliveryMethod === 'pickup' ? 0 : this.shippingCost
    };

    try {
      const createdOrder = await apiService.createOrder(orderPayload);
      this.closeCheckoutModal();
      this.clear();
      this.onOrderSuccess(createdOrder);
      notificationService.success(`🎉 ¡Pedido #${createdOrder.order_number} ingresado con éxito!`);
    } catch (err) {
      notificationService.error("Hubo un problema al procesar tu pedido. Por favor intenta nuevamente.");
      console.error(err);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "CONFIRMAR PEDIDO Y PASAR A TALLER";
      }
    }
  }

  showToast(message, type = 'info') {
    notificationService.show(message, type);
  }
}
