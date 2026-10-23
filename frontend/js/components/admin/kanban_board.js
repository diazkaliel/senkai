// Centro de Gestión de Pedidos y Operaciones de Taller (Senkai Studio).
// Provee una vista de tabla operativa maestra con búsqueda en tiempo real, filtros por estado,
// transiciones de máquina de estados seguras, descarga de órdenes en PDF y acceso a fichas técnicas.

import { apiService, normalizeItemPrints } from '../../services/api.js?v=20261022_v2';
import { downloadOrderDossier } from '../../services/order_document_service.js?v=20261022_v2';
import { notificationService } from '../../services/notification_service.js?v=20261022_v2';

// Mapeo exhaustivo de transiciones legales autorizadas por la máquina de estados del backend
const STATE_TRANSITIONS = {
  pendiente_pago: [
    { next: "cola_impresion_dtf", label: "Aprobar Pago e Iniciar Impresión", icon: "print" },
    { next: "cancelado", label: "Cancelar Pedido", icon: "cancel" }
  ],
  cola_impresion_dtf: [
    { next: "en_planchado_curado", label: "A Planchado (160°C)", icon: "local_fire_department" },
    { next: "cancelado", label: "Cancelar Pedido", icon: "cancel" }
  ],
  en_planchado_curado: [
    { next: "control_calidad", label: "A Control Calidad", icon: "verified" },
    { next: "cola_impresion_dtf", label: "Re-imprimir DTF (Devolver)", icon: "undo" },
    { next: "cancelado", label: "Cancelar Pedido", icon: "cancel" }
  ],
  control_calidad: [
    { next: "listo_despacho", label: "Listo para Despacho", icon: "local_shipping" },
    { next: "en_planchado_curado", label: "Re-planchar (Devolver)", icon: "undo" },
    { next: "cancelado", label: "Cancelar Pedido", icon: "cancel" }
  ],
  listo_despacho: [
    { next: "entregado", label: "Marcar Entregado", icon: "check_circle" },
    { next: "cancelado", label: "Cancelar Pedido", icon: "cancel" }
  ],
  entregado: [],
  cancelado: []
};

const STATUS_METADATA = {
  pendiente_pago: { label: "Pendiente de Pago", badge: "badge-amber" },
  cola_impresion_dtf: { label: "1. Impresión DTF", badge: "badge-cyan" },
  en_planchado_curado: { label: "2. Planchado (160°C)", badge: "badge-crimson" },
  control_calidad: { label: "3. Control Calidad", badge: "badge-lime" },
  listo_despacho: { label: "4. Listo Despacho", badge: "badge-cyan" },
  entregado: { label: "5. Entregado", badge: "" },
  cancelado: { label: "Cancelado", badge: "badge-crimson" }
};

export class KanbanBoardComponent {
  constructor(container, options = {}) {
    this.container = container;
    this.orders = options.orders || [];
    this.metrics = options.metrics || null;
    this.onOrderUpdated = options.onOrderUpdated || (() => {});
    this.onOpenMockup = options.onOpenMockup || (() => {});

    // Estado reactivo de visualización: "table" (predeterminado) o "cards"
    this.viewMode = "table"; 
    this.searchQuery = "";
    this.fulfillmentFilter = "all"; // "all" | "pickup" | "shipping"
    this.phaseFilter = "all"; // "all" | estado específico
  }

  updateData(orders, metrics) {
    this.orders = orders || [];
    this.metrics = metrics || this.metrics;
    this.render();
  }

  formatTimeAgo(isoString) {
    if (!isoString) return { text: "Reciente", isDelayed: false };
    const date = new Date(isoString);
    const diffMs = Date.now() - date.getTime();
    if (isNaN(diffMs) || diffMs < 0) return { text: "Reciente", isDelayed: false };

    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return { text: `${Math.max(1, diffMins)}m`, isDelayed: false };
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return { text: `${diffHours}h`, isDelayed: false };
    const diffDays = Math.floor(diffHours / 24);
    return { text: `${diffDays}d`, isDelayed: diffDays >= 1 };
  }

  render() {
    if (!this.container) return;

    const m = this.metrics || {
      pending_print_count: 0,
      heat_pressing_count: 0,
      linear_meters_film_estimated: 0,
      total_revenue_clp: 0
    };

    const q = (this.searchQuery || "").toLowerCase().trim();
    const fFilter = this.fulfillmentFilter;
    const totalOrdersCount = this.orders.length;
    const pickupOrdersCount = this.orders.filter(o => o.customer && o.customer.delivery_method === "pickup").length;
    const shippingOrdersCount = this.orders.filter(o => o.customer && o.customer.delivery_method !== "pickup").length;

    // Filtro por texto y tipo de despacho
    const filteredOrders = this.orders.filter(order => {
      if (fFilter === "pickup" && order.customer && order.customer.delivery_method !== "pickup") return false;
      if (fFilter === "shipping" && order.customer && order.customer.delivery_method === "pickup") return false;

      if (this.phaseFilter !== "all" && order.status !== this.phaseFilter) return false;

      if (q) {
        const num = (order.order_number || "").toLowerCase();
        const name = (order.customer && order.customer.full_name || "").toLowerCase();
        const email = (order.customer && order.customer.email || "").toLowerCase();
        const city = (order.customer && order.customer.shipping_city || "").toLowerCase();
        const items = (order.items || []).map(i => i.garment_name.toLowerCase()).join(" ");
        if (!num.includes(q) && !name.includes(q) && !email.includes(q) && !city.includes(q) && !items.includes(q)) {
          return false;
        }
      }
      return true;
    });

    // Conteo por etapas operativas
    const countByPhase = {
      cola_impresion_dtf: this.orders.filter(o => o.status === 'cola_impresion_dtf').length,
      en_planchado_curado: this.orders.filter(o => o.status === 'en_planchado_curado').length,
      control_calidad: this.orders.filter(o => o.status === 'control_calidad').length,
      listo_despacho: this.orders.filter(o => o.status === 'listo_despacho').length,
      entregado: this.orders.filter(o => o.status === 'entregado').length
    };

    this.container.innerHTML = `
      <!-- Tarjetas KPI de resumen ejecutivo -->
      <div class="admin-kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Cola de Impresión DTF</div>
          <div class="kpi-value">${m.pending_print_count}</div>
          <div class="kpi-sub">Listos para software RIP</div>
        </div>
        <div class="kpi-card crimson">
          <div class="kpi-label">En Plancha Térmica</div>
          <div class="kpi-value">${m.heat_pressing_count}</div>
          <div class="kpi-sub">Termofijado a 160°C / 15s</div>
        </div>
        <div class="kpi-card lime">
          <div class="kpi-label">Metros Film Consumidos</div>
          <div class="kpi-value">${m.linear_meters_film_estimated} m</div>
          <div class="kpi-sub">Bobina industrial 60 cm</div>
        </div>
        <div class="kpi-card amber">
          <div class="kpi-label">Facturación Acumulada</div>
          <div class="kpi-value">$${m.total_revenue_clp.toLocaleString('es-CL')}</div>
          <div class="kpi-sub">CLP en pedidos confirmados</div>
        </div>
      </div>

      <!-- Barra de herramientas: Búsqueda, Filtros y Selector de Vistas -->
      <div class="kanban-board-wrap">
        <div class="kanban-header-bar">
          <h3 class="kanban-section-title">
            <span>Gestión de Pedidos & Fabricación</span>
            <span class="badge badge-admin">${this.orders.length} PEDIDOS</span>
          </h3>

          <div style="display: flex; align-items: center; gap: 1rem;">
            <div class="kanban-results-count">
              ${filteredOrders.length !== totalOrdersCount ? `
                <span>Mostrando <strong>${filteredOrders.length}</strong> de ${totalOrdersCount} pedidos</span>
              ` : `
                <span><strong>${totalOrdersCount}</strong> pedidos registrados</span>
              `}
            </div>

            <!-- Selector de Vista: Tabla (por defecto) vs Tarjetas -->
            <div class="orders-view-mode-toggle" role="group" aria-label="Cambiar modo de vista">
              <button type="button" class="orders-view-mode-btn ${this.viewMode === 'table' ? 'active' : ''}" data-view-mode="table" title="Vista de Tabla Operativa">
                <span class="material-symbols-outlined" style="font-size: 16px;">table_rows</span>
                <span>Tabla</span>
              </button>
              <button type="button" class="orders-view-mode-btn ${this.viewMode === 'cards' ? 'active' : ''}" data-view-mode="cards" title="Vista de Tarjetas">
                <span class="material-symbols-outlined" style="font-size: 16px;">grid_view</span>
                <span>Tarjetas</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Filtros superiores -->
        <div class="kanban-toolbar">
          <div class="kanban-search-box">
            <span class="material-symbols-outlined kanban-search-icon">search</span>
            <input 
              type="text" 
              id="kanbanSearchInput" 
              class="kanban-search-input" 
              placeholder="Buscar por código (SNK-...), cliente, correo o prenda..." 
              value="${this.searchQuery || ''}"
            />
            ${this.searchQuery ? `
              <button type="button" id="clearKanbanSearchBtn" class="kanban-clear-btn" title="Limpiar búsqueda">?</button>
            ` : ''}
          </div>

          <div class="kanban-filter-pills">
            <button type="button" class="kanban-filter-pill ${fFilter === 'all' ? 'active' : ''}" data-fulfillment="all">
              Todos (${totalOrdersCount})
            </button>
            <button type="button" class="kanban-filter-pill ${fFilter === 'pickup' ? 'active' : ''}" data-fulfillment="pickup">
              <span class="material-symbols-outlined" style="font-size: 13px; vertical-align: middle;">store</span> Retiro (${pickupOrdersCount})
            </button>
            <button type="button" class="kanban-filter-pill ${fFilter === 'shipping' ? 'active' : ''}" data-fulfillment="shipping">
              <span class="material-symbols-outlined" style="font-size: 13px; vertical-align: middle;">local_shipping</span> Despacho (${shippingOrdersCount})
            </button>
          </div>
        </div>

        <!-- Selector de etapas operativas -->
        <div class="kanban-phase-bar" role="group" aria-label="Filtrar por fase de taller">
          <button type="button" class="kanban-phase-pill ${this.phaseFilter === 'all' ? 'active' : ''}" data-phase="all">
            Todas <span class="phase-count">${totalOrdersCount}</span>
          </button>
          <button type="button" class="kanban-phase-pill ${this.phaseFilter === 'cola_impresion_dtf' ? 'active' : ''}" data-phase="cola_impresion_dtf">
            1. Impresión <span class="phase-count">${countByPhase.cola_impresion_dtf}</span>
          </button>
          <button type="button" class="kanban-phase-pill ${this.phaseFilter === 'en_planchado_curado' ? 'active' : ''}" data-phase="en_planchado_curado">
            2. Planchado <span class="phase-count">${countByPhase.en_planchado_curado}</span>
          </button>
          <button type="button" class="kanban-phase-pill ${this.phaseFilter === 'control_calidad' ? 'active' : ''}" data-phase="control_calidad">
            3. Calidad <span class="phase-count">${countByPhase.control_calidad}</span>
          </button>
          <button type="button" class="kanban-phase-pill ${this.phaseFilter === 'listo_despacho' ? 'active' : ''}" data-phase="listo_despacho">
            4. Despacho <span class="phase-count">${countByPhase.listo_despacho}</span>
          </button>
          <button type="button" class="kanban-phase-pill ${this.phaseFilter === 'entregado' ? 'active' : ''}" data-phase="entregado">
            5. Entregado <span class="phase-count">${countByPhase.entregado}</span>
          </button>
        </div>

        <!-- Renderizado de la Vista Seleccionada -->
        ${filteredOrders.length === 0 ? `
          <div class="kanban-empty-filter-state">
            <span class="material-symbols-outlined" style="font-size: 2.5rem; color: var(--text-muted); display: block; margin-bottom: 0.5rem;">search_off</span>
            <h4 style="font-size: 1.1rem; color: var(--text-primary); text-transform: uppercase;">Sin resultados</h4>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0.25rem 0 1rem;">No hay pedidos que coincidan con la búsqueda o filtro aplicado.</p>
            <button type="button" class="btn btn-secondary" id="resetKanbanFilterBtn" style="padding: 0.5rem 1.25rem; font-size: 0.8rem;">
              Limpiar Filtros
            </button>
          </div>
        ` : (this.viewMode === 'table' ? this._renderTableView(filteredOrders) : this._renderCardsView(filteredOrders))}
      </div>
    `;

    this._attachEvents();
  }

  // 1. Vista de Tabla Operativa Maestra (Predeterminada)
  _renderTableView(orders) {
    return `
      <div class="orders-table-card">
        <div class="orders-table-wrap">
          <table class="orders-master-table">
            <thead>
              <tr>
                <th>N° Orden</th>
                <th>Cliente & Entrega</th>
                <th>Prendas & Especificación DTF</th>
                <th>Total</th>
                <th>Fase Operativa</th>
                <th style="text-align: right;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${orders.map(order => this._renderTableRow(order)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // Fila individual de la tabla de pedidos
  _renderTableRow(order) {
    const c = order.customer || {};
    const isPickup = c.delivery_method === 'pickup';
    const timeAgo = this.formatTimeAgo(order.updated_at || order.created_at);
    const dateFormatted = order.created_at ? new Date(order.created_at).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }) : '—';

    const currentStatusMeta = STATUS_METADATA[order.status] || { label: order.status, badge: '' };
    const transitions = STATE_TRANSITIONS[order.status] || [];
    const primaryNext = transitions.length > 0 ? transitions[0] : null;

    const itemsSummary = (order.items || []).map(i => {
      const prints = normalizeItemPrints(i);
      const printTag = prints.length > 0 
        ? `[ ${prints.map(p => `${p.view === 'back' ? 'Espalda' : 'Frente'} ${p.print_size}`).join(', ')} ]`
        : 'Lisa';
      return `
        <div class="order-item-inline-chip">
          <strong>${i.quantity}x</strong> ${i.garment_name} (${i.selected_size}) 
          <span class="order-print-inline-desc">${printTag}</span>
        </div>
      `;
    }).join('');

    return `
      <tr data-order-id="${order.id}">
        <td>
          <div class="order-num-link">${order.order_number}</div>
          <div class="order-date-sub">${dateFormatted} • ${timeAgo.text}</div>
        </td>
        <td>
          <div class="order-customer-main">${c.full_name || 'Sin especificar'}</div>
          <div class="order-customer-sub">${c.email || '—'}</div>
          <div class="order-delivery-tag ${isPickup ? 'pickup' : 'shipping'}">
            <span class="material-symbols-outlined" style="font-size: 12px;">${isPickup ? 'store' : 'local_shipping'}</span>
            <span>${isPickup ? 'Retiro Providencia' : `Despacho a ${c.shipping_city || 'Santiago'}`}</span>
          </div>
          ${order.tracking_code ? `<div style="font-family: var(--font-mono); font-size: 0.675rem; color: #93c5fd; margin-top: 2px;">Guía: ${order.tracking_code}</div>` : ''}
        </td>
        <td>
          <div class="order-items-summary-list">
            ${itemsSummary}
          </div>
        </td>
        <td>
          <div class="order-table-total">$${(order.total_amount || 0).toLocaleString('es-CL')}</div>
          <div style="font-size: 0.68rem; font-family: var(--font-mono); color: var(--text-muted);">${(order.items || []).reduce((acc, it) => acc + (it.quantity || 1), 0)} prendas</div>
        </td>
        <td>
          <div class="order-status-selector-wrap">
            <select class="order-status-select" data-order-id="${order.id}" data-current-status="${order.status}" data-delivery="${c.delivery_method}">
              <option value="${order.status}" selected>? ${currentStatusMeta.label}</option>
              ${transitions.map(t => `
                <option value="${t.next}">? Cambiar a: ${t.label}</option>
              `).join('')}
            </select>
          </div>
        </td>
        <td style="text-align: right;" class="order-table-actions-cell">
          <div class="order-table-action-btns">
            <!-- Botón de Descarga Directa de la Orden Oficial -->
            <button type="button" class="btn-table-action download-order-btn" data-order-id="${order.id}" title="Descargar Orden Completa (PDF / Documento Oficial)">
              <span class="material-symbols-outlined" style="font-size: 15px;">download</span>
              <span>Descargar</span>
            </button>

            <!-- Botón de Ficha Técnica de Taller -->
            <button type="button" class="btn-table-action view-mockup-btn" data-order-id="${order.id}" title="Ver Ficha Técnica y Emplazamiento Textil">
              <span class="material-symbols-outlined" style="font-size: 15px;">receipt_long</span>
              <span>Ficha</span>
            </button>

            <!-- Botón de avance rápido de estado -->
            ${primaryNext ? `
              <button type="button" class="btn-table-action primary quick-advance-btn" data-order-id="${order.id}" data-next-status="${primaryNext.next}" data-delivery="${c.delivery_method}" title="${primaryNext.label}">
                <span class="material-symbols-outlined" style="font-size: 15px;">${primaryNext.icon}</span>
                <span>Avanzar</span>
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }

  // 2. Vista Alternativa de Tarjetas
  _renderCardsView(orders) {
    return `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.25rem; margin-top: 1rem;">
        ${orders.map(order => this._renderSingleCard(order)).join('')}
      </div>
    `;
  }

  _renderSingleCard(order) {
    const c = order.customer || {};
    const isPickup = c.delivery_method === 'pickup';
    const timeAgo = this.formatTimeAgo(order.updated_at || order.created_at);
    const transitions = STATE_TRANSITIONS[order.status] || [];
    const primaryNext = transitions.length > 0 ? transitions[0] : null;

    return `
      <div class="order-card" data-order-id="${order.id}">
        <div class="order-card-top">
          <span class="order-number">${order.order_number}</span>
          <span class="order-sla-chip ${timeAgo.isDelayed && order.status !== 'entregado' ? 'warning' : ''}">
            <span class="material-symbols-outlined" style="font-size: 13px;">schedule</span>
            <span>${timeAgo.text}</span>
          </span>
        </div>

        <div class="order-customer-name">${c.full_name || 'Sin especificar'}</div>
        <div class="order-delivery-info">
          <span class="material-symbols-outlined" style="font-size: 14px;">${isPickup ? 'store' : 'local_shipping'}</span>
          <span>${isPickup ? 'Retiro en Taller' : `Despacho a ${c.shipping_city || 'Santiago'}`}</span>
          ${order.tracking_code ? `<br><span class="order-tracking-badge">${order.tracking_code}</span>` : ''}
        </div>

        ${(order.items || []).map(i => {
          const prints = normalizeItemPrints(i);
          let printSpec = 'Lisa';
          if (prints.length > 0) {
            printSpec = prints.map(p => `${p.view === 'back' ? 'Espalda' : 'Frente'} [${p.print_size}]`).join(', ');
          }
          return `
            <div class="order-item-chip">
              <strong>${i.quantity}x ${i.garment_name}</strong> (${i.selected_size})<br>
              <span class="order-item-print-spec">${printSpec}</span>
            </div>
          `;
        }).join('')}

        <div class="order-total-row">
          <span class="order-total-label">Total:</span>
          <span class="order-total-val">$${(order.total_amount || 0).toLocaleString('es-CL')} CLP</span>
        </div>

        <div class="order-card-actions" style="margin-top: 1rem; display: flex; gap: 0.4rem; flex-wrap: wrap;">
          <button class="order-action-btn download-order-btn" data-order-id="${order.id}" style="flex: 1 1 auto; justify-content: center;">
            <span class="material-symbols-outlined" style="font-size: 16px;">download</span>
            <span>Descargar</span>
          </button>
          <button class="order-action-btn view-mockup-btn" data-order-id="${order.id}" style="flex: 1 1 auto; justify-content: center;">
            <span class="material-symbols-outlined" style="font-size: 16px;">receipt_long</span>
            <span>Ficha Técnica</span>
          </button>
          ${primaryNext ? `
            <button class="order-action-btn quick-advance-btn" data-order-id="${order.id}" data-next-status="${primaryNext.next}" data-delivery="${c.delivery_method}" style="flex: 2 1 100%; justify-content: center; background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.25);">
              <span class="material-symbols-outlined" style="font-size: 16px;">${primaryNext.icon}</span>
              <span>${primaryNext.label}</span>
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  _attachEvents() {
    // 1. Selector de modo de vista (Tabla vs Tarjetas)
    this.container.querySelectorAll('.orders-view-mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = e.currentTarget.dataset.viewMode;
        if (mode && mode !== this.viewMode) {
          this.viewMode = mode;
          this.render();
        }
      });
    });

    // 2. Búsqueda instantánea
    const searchInput = this.container.querySelector('#kanbanSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.render();
        const restoredInput = this.container.querySelector('#kanbanSearchInput');
        if (restoredInput) {
          restoredInput.focus();
          const len = restoredInput.value.length;
          restoredInput.setSelectionRange(len, len);
        }
      });
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.searchQuery = "";
          this.render();
        }
      });
    }

    const clearBtn = this.container.querySelector('#clearKanbanSearchBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.searchQuery = "";
        this.render();
      });
    }

    const resetBtn = this.container.querySelector('#resetKanbanFilterBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.searchQuery = "";
        this.fulfillmentFilter = "all";
        this.phaseFilter = "all";
        this.render();
      });
    }

    // 3. Filtro de despacho
    this.container.querySelectorAll('.kanban-filter-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = e.currentTarget.dataset.fulfillment;
        if (mode && mode !== this.fulfillmentFilter) {
          this.fulfillmentFilter = mode;
          this.render();
        }
      });
    });

    // 4. Filtro de fases
    this.container.querySelectorAll('.kanban-phase-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const phase = e.currentTarget.dataset.phase;
        if (phase && phase !== this.phaseFilter) {
          this.phaseFilter = phase;
          this.render();
        }
      });
    });

    // 5. Descarga directa de la orden oficial en PDF / HTML
    this.container.querySelectorAll('.download-order-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const orderId = e.currentTarget.dataset.orderId;
        const order = this.orders.find(o => o.id === orderId);
        if (order) {
          notificationService.success(`Descargando orden ${order.order_number}...`);
          downloadOrderDossier(order);
        }
      });
    });

    // 6. Abrir modal con la Ficha Técnica
    this.container.querySelectorAll('.view-mockup-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const orderId = e.currentTarget.dataset.orderId;
        const order = this.orders.find(o => o.id === orderId);
        if (order) {
          this.onOpenMockup(order);
        }
      });
    });

    // 7. Cambio directo de estado desde el selector desplegable
    this.container.querySelectorAll('.order-status-select').forEach(select => {
      select.addEventListener('change', async (e) => {
        const orderId = e.target.dataset.orderId;
        const newStatus = e.target.value;
        const currentStatus = e.target.dataset.currentStatus;
        const deliveryMethod = e.target.dataset.delivery;

        if (newStatus === currentStatus) return;

        let trackingCode = null;
        if (newStatus === 'listo_despacho' && deliveryMethod !== 'pickup') {
          const entered = prompt("Ingresa el código de seguimiento de la encomienda (Chilexpress/Starken):");
          if (entered !== null) trackingCode = entered.trim() || null;
        }

        select.disabled = true;
        try {
          await apiService.updateOrderStatus(orderId, newStatus, trackingCode);
          notificationService.success("Estado del pedido actualizado correctamente.");
          this.onOrderUpdated();
        } catch (err) {
          notificationService.error(err.message || "No se pudo actualizar el estado.");
          select.disabled = false;
          select.value = currentStatus;
        }
      });
    });

    // 8. Botón de avance rápido de etapa
    this.container.querySelectorAll('.quick-advance-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const orderId = e.currentTarget.dataset.orderId;
        const nextStatus = e.currentTarget.dataset.nextStatus;
        const deliveryMethod = e.currentTarget.dataset.delivery;

        let trackingCode = null;
        if (nextStatus === 'listo_despacho' && deliveryMethod !== 'pickup') {
          const entered = prompt("Ingresa el código de seguimiento de la encomienda (Chilexpress/Starken):");
          if (entered !== null) trackingCode = entered.trim() || null;
        }

        btn.disabled = true;
        btn.textContent = "...";

        try {
          await apiService.updateOrderStatus(orderId, nextStatus, trackingCode);
          notificationService.success("Pedido avanzado con éxito.");
          this.onOrderUpdated();
        } catch (err) {
          notificationService.error(err.message || "Error al avanzar pedido.");
          console.error(err);
          btn.disabled = false;
          btn.textContent = "Avanzar";
        }
      });
    });
  }
}
