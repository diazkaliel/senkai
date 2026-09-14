/**
 * SEIKO // CONTROLADOR DE CARRITO Y CHECKOUT
 * Manejo de estado del carrito, cálculo de subtotales y envío de orden a taller.
 */

import { apiService } from '../services/api.js';

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

    this.attachDOMEvents();
  }

  addItem(item) {
    this.items.push(item);
    this.updateUI();
    this.openDrawer();
    this.showToast(`✨ Prenda agregada: ${item.garment_name}`);
  }

  removeItem(index) {
    this.items.splice(index, 1);
    this.updateUI();
  }

  clear() {
    this.items = [];
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
      alert("Tu carrito está vacío. Agrega una prenda o estampa personalizada.");
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
        <div style="text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
          <span class="material-symbols-outlined" style="font-size: 48px; opacity: 0.35; margin-bottom: 1rem;">shopping_bag</span>
          <p style="font-size: 1rem; font-weight: 600; color: var(--text-primary);">Tu carrito está vacío</p>
          <p style="font-size: 0.825rem; margin-top: 0.25rem;">Selecciona una prenda en el catálogo o configúrala en el personalizador DTF.</p>
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
   * Maneja tanto el nuevo modelo multi-estampa libre como el formato legado de estampa única.
   */
  formatItemPrintsSpecs(item) {
    if (item.prints && item.prints.length > 0) {
      const printsSummary = item.prints.map(p => {
        const sideLabel = p.view === 'back' ? 'Espalda' : 'Frontal';
        return `${sideLabel} [${p.print_size}]`;
      }).join(' + ');
      return `Estampas DTF (${item.prints.length}): <strong>${printsSummary}</strong>`;
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
        let printBadge = 'Lisa';
        if (i.prints && i.prints.length > 0) {
          printBadge = i.prints.map(p => `${p.view === 'back' ? 'Espalda' : 'Front'} ${p.print_size}`).join('+');
        } else if (i.dtf_config) {
          printBadge = i.dtf_config.print_size;
        }

        return `
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.4rem;">
            <span>${i.quantity}x ${i.garment_name} (${i.selected_size}) [DTF: ${printBadge}]</span>
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
      this.showToast(`🎉 ¡Pedido #${createdOrder.order_number} ingresado con éxito!`);
    } catch (err) {
      alert("Hubo un error al procesar tu pedido. Intenta nuevamente.");
      console.error(err);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "CONFIRMAR PEDIDO Y PASAR A TALLER";
      }
    }
  }

  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <span class="pulse-indicator"></span>
      <span>${message}</span>
    `;
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    container.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 4000);
  }
}
