/**
 * SEIKO // PANEL ADMINISTRATIVO Y TABLERO KANBAN DE TALLER
 * Monitoreo de producción textil DTF, métricas e inventario de telas.
 */

import { apiService } from '../services/api.js';

export class AdminWorkshopPortal {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.orders = [];
    this.metrics = null;
  }

  async init() {
    await this.refreshData();
  }

  async refreshData() {
    try {
      this.orders = await apiService.getOrders();
      this.metrics = await apiService.getWorkshopMetrics();
      this.render();
      this.attachEvents();
    } catch (err) {
      console.error("Error cargando datos de taller:", err);
    }
  }

  render() {
    if (!this.container) return;

    const m = this.metrics || {
      total_orders: 0,
      pending_print_count: 0,
      heat_pressing_count: 0,
      ready_for_pickup_count: 0,
      linear_meters_film_estimated: 0,
      total_revenue_clp: 0
    };

    const cols = {
      cola_impresion_dtf: { title: "1. COLA IMPRESIÓN DTF", orders: [], badgeClass: "badge-cyan" },
      en_planchado_curado: { title: "2. PLANCHADO / TERMOFIJADO (160°C)", orders: [], badgeClass: "badge-crimson" },
      control_calidad: { title: "3. CONTROL DE CALIDAD", orders: [], badgeClass: "badge-lime" },
      listo_despacho: { title: "4. LISTO PARA DESPACHO", orders: [], badgeClass: "badge-cyan" },
      entregado: { title: "5. COMPLETADO Y ENTREGADO", orders: [], badgeClass: "" }
    };

    this.orders.forEach(order => {
      const st = order.status;
      if (cols[st]) {
        cols[st].orders.push(order);
      } else {
        cols.cola_impresion_dtf.orders.push(order);
      }
    });

    this.container.innerHTML = `
      <div class="admin-portal container">
        <!-- HEADER DE ADMINISTRACIÓN -->
        <div class="admin-header-row">
          <div class="admin-title-badge">
            <span class="badge badge-cyan"><span class="pulse-indicator"></span> TALLER INDUSTRIAL ACTIVO</span>
            <h2>Panel de Producción Seiko DTF</h2>
          </div>
          <div style="display: flex; gap: 0.75rem;">
            <button class="btn btn-secondary" id="refreshWorkshopBtn" style="padding: 0.6rem 1.25rem; font-size: 0.8rem;">
              🔄 Actualizar Datos
            </button>
            <button class="btn btn-primary" id="returnStorefrontBtn" style="padding: 0.6rem 1.4rem; font-size: 0.8rem;">
              🛍️ Ir a la Tienda Pública
            </button>
          </div>
        </div>

        <!-- TARJETAS KPI DE TALLER -->
        <div class="admin-kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Pedidos en Cola DTF</div>
            <div class="kpi-value">${m.pending_print_count}</div>
            <div class="kpi-sub">Listos para software RIP</div>
          </div>
          <div class="kpi-card crimson">
            <div class="kpi-label">En Plancha Térmica</div>
            <div class="kpi-value">${m.heat_pressing_count}</div>
            <div class="kpi-sub">Termofijado a 160°C / 15s</div>
          </div>
          <div class="kpi-card lime">
            <div class="kpi-label">Metros Film DTF Usados</div>
            <div class="kpi-value">${m.linear_meters_film_estimated} m</div>
            <div class="kpi-sub">Bobina industrial 60 cm</div>
          </div>
          <div class="kpi-card amber">
            <div class="kpi-label">Facturación Acumulada</div>
            <div class="kpi-value">$${m.total_revenue_clp.toLocaleString('es-CL')}</div>
            <div class="kpi-sub">CLP en pedidos activos</div>
          </div>
        </div>

        <!-- TABLERO KANBAN DE ESTADOS DE PRODUCCIÓN -->
        <div class="kanban-board-wrap">
          <h3 class="kanban-section-title">
            <span>Flujo de Fabricación Textil</span>
            <span class="badge">${this.orders.length} Pedidos en Total</span>
          </h3>

          <div class="kanban-board">
            ${Object.entries(cols).map(([colKey, colData]) => `
              <div class="kanban-col" data-col-status="${colKey}">
                <div class="kanban-col-header">
                  <div class="kanban-col-title">
                    <span class="badge ${colData.badgeClass}">${colData.title}</span>
                  </div>
                  <span class="kanban-col-count">${colData.orders.length}</span>
                </div>
                <div class="kanban-col-body">
                  ${colData.orders.length === 0 ? `
                    <div style="text-align: center; color: var(--text-muted); font-size: 0.8rem; padding: 3rem 0; font-family: var(--font-mono);">
                      Sin pedidos en este estado
                    </div>
                  ` : colData.orders.map(order => this.renderKanbanOrderCard(order, colKey)).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- TABLA DE INVENTARIO DE PRENDAS BASE -->
        <div class="inventory-card">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
            <div>
              <h3 style="font-size: 1.35rem; font-weight: 700; text-transform: uppercase;">Inventario de Prendas Base Lisas</h3>
              <p style="font-size: 0.85rem; color: var(--text-muted);">Stock de poleras y polerones vírgenes para estampado inmediato</p>
            </div>
            <span class="badge badge-lime">STOCK ÓPTIMO EN BODEGA</span>
          </div>

          <div class="table-responsive">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Prenda / Gramaje</th>
                  <th>Colores Base</th>
                  <th>Tallas Disponibles</th>
                  <th>Precio Venta Lisa</th>
                  <th>Capacidad DTF Diaria</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Polera Oversized Heavyweight 240g</strong><br><small>100% Algodón Peinado</small></td>
                  <td>Obsidian, Chalk White, Washed Gray, Deep Green, Terracotta</td>
                  <td>S, M, L, XL, XXL</td>
                  <td>$12.990 CLP</td>
                  <td><span class="badge badge-lime">150 prendas/día</span></td>
                </tr>
                <tr>
                  <td><strong>Polera Clásica Regular Fit 180g</strong><br><small>100% Algodón Jersey</small></td>
                  <td>Negro, Blanco Puro, Navy Deep, Burgundy</td>
                  <td>S, M, L, XL</td>
                  <td>$8.990 CLP</td>
                  <td><span class="badge badge-lime">200 prendas/día</span></td>
                </tr>
                <tr>
                  <td><strong>Polerón Canguro Hoodie Heavy 320g</strong><br><small>80/20 Algodón Afelpado</small></td>
                  <td>Obsidian, Cement Gray, Deep Olive, Raw Bone</td>
                  <td>S, M, L, XL, XXL</td>
                  <td>$24.990 CLP</td>
                  <td><span class="badge badge-crimson">80 prendas/día</span></td>
                </tr>
                <tr>
                  <td><strong>Polerón Crewneck Cuello Redondo 300g</strong><br><small>80/20 Algodón Peinado</small></td>
                  <td>Obsidian, Heather Gray, Midnight Navy</td>
                  <td>S, M, L, XL</td>
                  <td>$21.990 CLP</td>
                  <td><span class="badge badge-lime">90 prendas/día</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  renderKanbanOrderCard(order, currentStatus) {
    const nextStatusMap = {
      cola_impresion_dtf: { next: "en_planchado_curado", label: "🔥 Pasar a Planchado" },
      en_planchado_curado: { next: "control_calidad", label: "🔍 Pasar a Control Calidad" },
      control_calidad: { next: "listo_despacho", label: "📦 Listo para Despacho" },
      listo_despacho: { next: "entregado", label: "✅ Marcar Entregado" }
    };

    const nextAction = nextStatusMap[currentStatus];

    return `
      <div class="order-card" data-order-id="${order.id}">
        <div class="order-card-top">
          <span class="order-number">${order.order_number}</span>
          <span style="font-size: 0.75rem; font-family: var(--font-mono); color: var(--text-muted);">${new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        </div>
        
        <div class="order-customer-name">${order.customer.full_name}</div>
        <div style="font-size: 0.775rem; color: var(--text-muted); margin-bottom: 0.5rem;">
          ${order.customer.delivery_method === 'pickup' ? '📍 Retiro en Taller Providencia' : `🚚 Envío: ${order.customer.shipping_city || 'Santiago'}`}
        </div>

        ${order.items.map(i => `
          <div class="order-item-chip">
            <strong>${i.quantity}x ${i.garment_name}</strong> (${i.selected_size} - ${i.selected_color.name})<br>
            ${i.dtf_config ? `🎯 DTF: ${i.dtf_config.position.toUpperCase()} [${i.dtf_config.print_size}]` : 'Prenda Lisa'}
          </div>
        `).join('')}

        <div style="display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: 700; margin-top: 0.5rem;">
          <span style="color: var(--text-muted);">Total:</span>
          <span style="color: var(--accent-cyan); font-family: var(--font-display); font-size: 1rem;">$${order.total_amount.toLocaleString('es-CL')} CLP</span>
        </div>

        <div class="order-card-actions">
          ${nextAction ? `
            <button class="order-action-btn advance-status-btn" data-order-id="${order.id}" data-next-status="${nextAction.next}">
              ${nextAction.label}
            </button>
          ` : `
            <span style="font-size: 0.75rem; color: var(--accent-lime); width: 100%; text-align: center; font-family: var(--font-mono);">✅ Pedido Entregado</span>
          `}
        </div>
      </div>
    `;
  }

  attachEvents() {
    const refreshBtn = this.container.querySelector('#refreshWorkshopBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshData());
    }

    const returnBtn = this.container.querySelector('#returnStorefrontBtn');
    if (returnBtn) {
      returnBtn.addEventListener('click', () => {
        window.location.hash = "#inicio";
      });
    }

    this.container.querySelectorAll('.advance-status-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const orderId = e.currentTarget.dataset.orderId;
        const nextStatus = e.currentTarget.dataset.nextStatus;
        btn.disabled = true;
        btn.textContent = "Actualizando...";
        
        try {
          await apiService.updateOrderStatus(orderId, nextStatus);
          await this.refreshData();
        } catch (err) {
          alert("Error al mover el pedido de estado.");
          console.error(err);
        }
      });
    });
  }
}
