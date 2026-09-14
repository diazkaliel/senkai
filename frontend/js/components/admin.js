/**
 * SEIKO // PANEL ADMINISTRATIVO Y TABLERO KANBAN DE TALLER
 * Monitoreo de producción textil DTF, métricas, inventario y visor de mockups de taller.
 */

import { apiService } from '../services/api.js';
import { SVG_GARMENTS, PRESET_ARTWORKS } from './svg_templates.js';

const PRINT_DIMENSIONS = {
  A6: { width: 90, height: 90, cm: "10 x 10 cm" },
  A5: { width: 130, height: 160, cm: "15 x 20 cm" },
  A4: { width: 185, height: 230, cm: "20 x 30 cm" },
  A3: { width: 245, height: 320, cm: "30 x 40 cm" }
};

export class AdminWorkshopPortal {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.orders = [];
    this.metrics = null;

    // Estado para el visor de mockup técnico
    this.activeMockupOrder = null;
    this.activeItemIndex = 0;
    this.activeMockupView = "front"; // "front" | "back"

    this.mockupModalEl = document.getElementById('adminMockupModal');
    this.mockupCardEl = document.getElementById('adminMockupCard');
  }

  async init() {
    await this.refreshData();
  }

  async refreshData() {
    if (!apiService.hasWorkshopToken()) {
      this.renderAuthGate();
      return;
    }

    try {
      this.orders = await apiService.getOrders();
      this.metrics = await apiService.getWorkshopMetrics();
      this.render();
      this.attachEvents();
    } catch (err) {
      if (err.message === "UNAUTHORIZED") {
        this.renderAuthGate("Token de taller inválido o no autorizado. Verifique sus credenciales.");
        return;
      }
      console.error("Error cargando datos de taller:", err);
    }
  }

  renderAuthGate(errorMessage = "") {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="admin-portal container" style="max-width: 460px; margin: 4rem auto; text-align: center;">
        <div class="glass-card" style="padding: 2.5rem 2rem; border-radius: var(--radius-md); background: rgba(18, 18, 20, 0.9); backdrop-filter: blur(20px); border: 1px solid var(--glass-border); box-shadow: var(--shadow-glass);">
          <div style="font-size: 2.5rem; margin-bottom: 1rem;">🔒</div>
          <h2 style="font-family: var(--font-display); font-size: 1.5rem; margin-bottom: 0.5rem; letter-spacing: -0.02em;">Acceso Restringido al Taller</h2>
          <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1.5rem;">
            Ingrese la clave de seguridad para acceder al tablero Kanban de producción y métricas del taller Senkai.
          </p>

          ${errorMessage ? `
            <div style="background: rgba(239, 68, 68, 0.15); border: 1px solid var(--accent-crimson); color: #fca5a5; padding: 0.75rem; border-radius: var(--radius-xs); font-size: 0.8rem; margin-bottom: 1.25rem;">
              ⚠️ ${errorMessage}
            </div>
          ` : ''}

          <form id="workshopAuthForm" style="display: flex; flex-direction: column; gap: 1rem;">
            <input 
              type="password" 
              id="workshopTokenInput" 
              placeholder="Ingrese token de taller..." 
              required
              autofocus
              style="padding: 0.85rem 1rem; border-radius: var(--radius-xs); border: 1px solid var(--glass-border); background: var(--bg-surface-elevated); color: var(--text-primary); font-family: var(--font-mono); font-size: 0.9rem;"
            />
            <button type="submit" class="btn btn-primary" style="padding: 0.85rem; width: 100%;">
              ⚡ Desbloquear Panel de Producción
            </button>
            <button type="button" id="authBackToStoreBtn" class="btn btn-secondary" style="padding: 0.65rem; width: 100%; font-size: 0.8rem;">
              Ir a la Tienda Pública
            </button>
          </form>
        </div>
      </div>
    `;

    const form = document.getElementById('workshopAuthForm');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const tokenInput = document.getElementById('workshopTokenInput');
        if (tokenInput) {
          apiService.setWorkshopToken(tokenInput.value);
          await this.refreshData();
        }
      });
    }

    const backBtn = document.getElementById('authBackToStoreBtn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        window.location.hash = "#inicio";
      });
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
            <button class="btn btn-secondary" id="logoutWorkshopBtn" style="padding: 0.6rem 1rem; font-size: 0.8rem;" title="Cerrar Sesión de Taller">
              🔒 Salir
            </button>
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

  /**
   * Normaliza los estampados de un ítem para tolerar tanto el formato multi-estampa nuevo
   * como el modelo legado dtf_config de órdenes iniciales o preexistentes.
   */
  normalizeItemPrints(item) {
    if (item.prints && item.prints.length > 0) {
      return item.prints;
    }
    if (item.dtf_config) {
      if (item.dtf_config.position === 'pecho_y_espalda') {
        return [
          {
            id: "legacy-print-front",
            view: "front",
            print_size: "A6",
            design_name: "Insignia Senkai (Pecho)",
            design_image_url: item.dtf_config.design_image_url || null,
            offset_x_pct: 35.0,
            offset_y_pct: 32.0,
            scale_factor: 0.85,
            calculated_dtf_cost: 2500
          },
          {
            id: "legacy-print-back",
            view: "back",
            print_size: item.dtf_config.print_size || "A3",
            design_name: "Estampa Trasera Maxi",
            design_image_url: item.dtf_config.design_image_url || null,
            offset_x_pct: 50.0,
            offset_y_pct: 42.0,
            scale_factor: 1.0,
            calculated_dtf_cost: 8900
          }
        ];
      }
      const isBack = item.dtf_config.position === 'espalda_completa';
      return [{
        id: "legacy-print",
        view: isBack ? "back" : "front",
        print_size: item.dtf_config.print_size || "A4",
        design_name: item.dtf_config.design_name || "Estampa DTF",
        design_image_url: item.dtf_config.design_image_url || null,
        offset_x_pct: item.dtf_config.offset_x_pct ?? 50.0,
        offset_y_pct: item.dtf_config.offset_y_pct ?? 40.0,
        scale_factor: item.dtf_config.scale_factor ?? 1.0,
        calculated_dtf_cost: item.dtf_config.calculated_dtf_cost || 5900
      }];
    }
    return [];
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

        ${order.items.map(i => {
          const prints = this.normalizeItemPrints(i);
          let dtfSummary = 'Prenda Lisa';
          if (prints.length > 0) {
            dtfSummary = `🎯 DTF (${prints.length}): ` + prints.map(p => `${p.view === 'back' ? 'Espalda' : 'Front'} [${p.print_size}]`).join(', ');
          }
          return `
            <div class="order-item-chip">
              <strong>${i.quantity}x ${i.garment_name}</strong> (${i.selected_size} - ${i.selected_color.name})<br>
              <span style="color: var(--accent-cyan); font-size: 0.725rem;">${dtfSummary}</span>
            </div>
          `;
        }).join('')}

        <div style="display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: 700; margin-top: 0.5rem;">
          <span style="color: var(--text-muted);">Total:</span>
          <span style="color: var(--accent-cyan); font-family: var(--font-display); font-size: 1rem;">$${order.total_amount.toLocaleString('es-CL')} CLP</span>
        </div>

        <div class="order-card-actions">
          <button class="order-action-btn view-mockup-btn" data-order-id="${order.id}" title="Ver Ficha Técnica y Mockup Real de Taller">
            👁️ Ver Mockup
          </button>
          ${nextAction ? `
            <button class="order-action-btn advance-status-btn" data-order-id="${order.id}" data-next-status="${nextAction.next}">
              ${nextAction.label}
            </button>
          ` : `
            <span style="font-size: 0.75rem; color: var(--accent-lime); display: flex; align-items: center; justify-content: center; font-family: var(--font-mono);">✅ Entregado</span>
          `}
        </div>
      </div>
    `;
  }

  attachEvents() {
    const logoutBtn = this.container.querySelector('#logoutWorkshopBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        apiService.setWorkshopToken('');
        this.renderAuthGate();
      });
    }

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

    // Botones de avance de estado Kanban
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

    // Botones para abrir el Visor de Mockup y Ficha Técnica
    this.container.querySelectorAll('.view-mockup-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const orderId = e.currentTarget.dataset.orderId;
        this.openMockupModal(orderId);
      });
    });

    // Cierre del modal con backdrop
    if (this.mockupModalEl) {
      this.mockupModalEl.addEventListener('click', (e) => {
        if (e.target === this.mockupModalEl) {
          this.closeMockupModal();
        }
      });
    }
  }

  // =========================================================================
  // CONTROLADOR DEL VISOR DE MOCKUP Y FICHA TÉCNICA (ADMIN)
  // =========================================================================

  openMockupModal(orderId) {
    const order = this.orders.find(o => o.id === orderId);
    if (!order) return;

    this.activeMockupOrder = order;
    this.activeItemIndex = 0;

    // Si el primer ítem solo tiene estampas en la espalda, iniciamos en vista trasera
    const firstItem = order.items[0];
    const prints = firstItem ? this.normalizeItemPrints(firstItem) : [];
    const hasFront = prints.some(p => p.view === 'front');
    const hasBack = prints.some(p => p.view === 'back');
    this.activeMockupView = hasFront ? 'front' : (hasBack ? 'back' : 'front');

    this.renderMockupModal();

    if (this.mockupModalEl) {
      this.mockupModalEl.classList.add('open');
    }
  }

  closeMockupModal() {
    if (this.mockupModalEl) {
      this.mockupModalEl.classList.remove('open');
    }
  }

  getGarmentTemplateKey(garmentNameOrId) {
    const s = (garmentNameOrId || "").toLowerCase();
    if (s.includes("hoodie") || s.includes("canguro")) return "hoodie";
    if (s.includes("crewneck") || s.includes("cuello redondo")) return "crewneck";
    return "tshirt";
  }

  getArtworkMarkup(print) {
    if (print.design_image_url) {
      return `<img src="${print.design_image_url}" alt="${print.design_name}">`;
    }
    // Si coincide con arte predeterminado
    const matched = PRESET_ARTWORKS.find(a => a.name === print.design_name || a.id === print.design_name);
    if (matched) return matched.svgContent;

    return PRESET_ARTWORKS[0].svgContent;
  }

  renderMockupModal() {
    if (!this.mockupCardEl || !this.activeMockupOrder) return;

    const order = this.activeMockupOrder;
    const currentItem = order.items[this.activeItemIndex] || order.items[0];
    const prints = this.normalizeItemPrints(currentItem);
    const garmentType = this.getGarmentTemplateKey(currentItem.garment_name || currentItem.garment_id);

    // Render del mockup fotográfico de la prenda base con el tinte exacto
    const templateFn = SVG_GARMENTS[`${garmentType}_${this.activeMockupView}`] || SVG_GARMENTS.tshirt_front;
    const garmentSvg = templateFn(currentItem.selected_color.hex_code);

    // Filtrar estampas correspondientes a la cara visualizada actualmente
    const printsForCurrentView = prints.filter(p => p.view === this.activeMockupView);

    this.mockupCardEl.innerHTML = `
      <div class="mockup-modal-top">
        <div>
          <span class="badge badge-cyan" style="margin-bottom: 0.35rem;">ORDEN ${order.order_number} • FICHA TÉCNICA DE PRODUCCIÓN</span>
          <h2>Mockup Textil y Calibración de Plancha</h2>
          <div style="font-size: 0.8rem; font-family: var(--font-mono); color: var(--text-muted); margin-top: 0.25rem;">
            Cliente: <strong>${order.customer.full_name}</strong> • ${order.customer.email} • ${order.customer.delivery_method === 'pickup' ? 'Retiro en Taller' : `Despacho a ${order.customer.shipping_city || 'Santiago'}`}
          </div>
        </div>
        <button class="mockup-modal-close-btn" id="closeMockupModalBtn" aria-label="Cerrar modal">&times;</button>
      </div>

      <div class="mockup-modal-grid">
        <!-- COLUMNA IZQUIERDA: VISOR VISUAL DEL PRODUCTO -->
        <div class="mockup-stage-box">
          <div class="mockup-stage-controls">
            <!-- Selector de Cara Frontal / Trasera -->
            <div class="mockup-view-toggle">
              <button class="mockup-view-btn ${this.activeMockupView === 'front' ? 'active' : ''}" id="mockupViewFrontBtn">
                Frontal (${prints.filter(p => p.view === 'front').length})
              </button>
              <button class="mockup-view-btn ${this.activeMockupView === 'back' ? 'active' : ''}" id="mockupViewBackBtn">
                Espalda (${prints.filter(p => p.view === 'back').length})
              </button>
            </div>

            <!-- Selector de Ítem si la orden contiene más de una prenda -->
            ${order.items.length > 1 ? `
              <select class="mockup-item-selector" id="mockupItemSelect">
                ${order.items.map((item, idx) => `
                  <option value="${idx}" ${idx === this.activeItemIndex ? 'selected' : ''}>
                    Ítem ${idx + 1}: ${item.garment_name} (${item.selected_size})
                  </option>
                `).join('')}
              </select>
            ` : `
              <span style="font-size: 0.75rem; font-family: var(--font-mono); color: var(--text-muted);">
                Talla: <strong style="color: var(--text-primary);">${currentItem.selected_size}</strong>
              </span>
            `}
          </div>

          <!-- Escenario visual con renderizado fiel de coordenadas -->
          <div class="mockup-stage-viewport">
            <!-- Plataforma 3D iluminada del tocadiscos de estudio -->
            <div class="mockup-turntable-pedestal"></div>

            ${garmentSvg}

            <!-- Límite de seguridad de plancha térmica (Área imprimible) -->
            <div class="safe-print-boundary" style="pointer-events: none;">
              <div class="safe-boundary-label">ÁREA ÚTIL PRENSA 40x50 CM</div>
            </div>

            <!-- Retícula HUD de calibración central de plato térmico -->
            <div class="mockup-center-reticle"></div>

            <!-- Capas de estampas registradas para la cara activa -->
            ${printsForCurrentView.length === 0 ? `
              <div style="position: absolute; bottom: 1.5rem; background: rgba(0,0,0,0.7); padding: 5px 12px; border-radius: 4px; font-size: 0.75rem; font-family: var(--font-mono); color: var(--text-muted); pointer-events: none; border: 1px solid var(--glass-border);">
                Sin estampas registradas en cara ${this.activeMockupView === 'front' ? 'frontal' : 'trasera'}
              </div>
            ` : printsForCurrentView.map(p => {
              const dim = PRINT_DIMENSIONS[p.print_size] || PRINT_DIMENSIONS.A4;
              return `
                <div class="mockup-print-overlay" 
                     style="left: ${p.offset_x_pct}%; top: ${p.offset_y_pct}%; width: ${dim.width}px; height: ${dim.height}px; transform: translate(-50%, -50%) scale(${p.scale_factor});">
                  <div class="mockup-reticle-crosshair"></div>
                  <div class="mockup-print-badge">
                    ${p.print_size} (${dim.cm}) • X:${Math.round(p.offset_x_pct)}% Y:${Math.round(p.offset_y_pct)}% • ${Math.round(p.scale_factor * 100)}%
                  </div>
                  <div class="mockup-print-art">
                    ${this.getArtworkMarkup(p)}
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <div style="margin-top: 0.85rem; font-size: 0.725rem; font-family: var(--font-mono); color: var(--text-muted); text-align: center;">
            🎯 Las coordenadas porcentuales corresponden a la posición exacta del cabezal de plancha.
          </div>
        </div>

        <!-- COLUMNA DERECHA: FICHA TÉCNICA INDUSTRIAL -->
        <div class="mockup-specs-box">
          <!-- Tarjeta 1: Especificaciones de la prenda base -->
          <div class="mockup-spec-card">
            <div class="mockup-spec-card-title">
              <span class="material-symbols-outlined" style="font-size: 18px;">checkroom</span>
              Prenda Base & Textil
            </div>
            <div class="mockup-garment-summary">
              <div class="mockup-color-chip" style="background: ${currentItem.selected_color.hex_code};" title="${currentItem.selected_color.name}"></div>
              <div>
                <strong style="font-size: 0.95rem; color: var(--text-primary);">${currentItem.garment_name}</strong><br>
                <span style="font-size: 0.8rem; font-family: var(--font-mono); color: var(--text-muted);">
                  Color: <strong>${currentItem.selected_color.name}</strong> • Talla: <strong>${currentItem.selected_size}</strong> • Cantidad: <strong>${currentItem.quantity} un.</strong>
                </span>
              </div>
            </div>
          </div>

          <!-- Tarjeta 2: Registro de estampas DTF para operario RIP -->
          <div class="mockup-spec-card">
            <div class="mockup-spec-card-title">
              <span class="material-symbols-outlined" style="font-size: 18px;">layers</span>
              Registro de Estampas (${prints.length} registradas)
            </div>

            ${prints.length === 0 ? `
              <p style="font-size: 0.8rem; color: var(--text-muted); font-family: var(--font-mono);">Esta prenda fue solicitada sin estampado (Prenda Lisa).</p>
            ` : `
              <table class="mockup-prints-table">
                <thead>
                  <tr>
                    <th>Cara</th>
                    <th>Formato</th>
                    <th>Posición (X, Y)</th>
                    <th>Escala</th>
                    <th>Diseño</th>
                  </tr>
                </thead>
                <tbody>
                  ${prints.map((p, idx) => {
                    const dim = PRINT_DIMENSIONS[p.print_size] || PRINT_DIMENSIONS.A4;
                    return `
                      <tr>
                        <td><span class="badge ${p.view === 'front' ? 'badge-cyan' : 'badge-crimson'}" style="font-size: 0.65rem;">${p.view === 'front' ? 'FRONTAL' : 'ESPALDA'}</span></td>
                        <td><strong>${p.print_size}</strong><br><small style="color: var(--text-muted);">${dim.cm}</small></td>
                        <td>X: <strong>${Math.round(p.offset_x_pct)}%</strong><br>Y: <strong>${Math.round(p.offset_y_pct)}%</strong></td>
                        <td><strong>${p.scale_factor.toFixed(2)}x</strong></td>
                        <td>${p.design_name || `Estampa #${idx + 1}`}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            `}
          </div>

          <!-- Tarjeta 3: Calibración y Parámetros de Prensa Térmica -->
          <div class="mockup-spec-card">
            <div class="mockup-spec-card-title">
              <span class="material-symbols-outlined" style="font-size: 18px;">heat</span>
              Parámetros de Termofijado Industrial
            </div>
            <div class="mockup-thermal-grid">
              <div class="mockup-thermal-item">
                <div class="param-label">Temperatura Plancha</div>
                <div class="param-value">160 °C (320 °F)</div>
              </div>
              <div class="mockup-thermal-item">
                <div class="param-label">Tiempo de Prensado</div>
                <div class="param-value">15 Segundos</div>
              </div>
              <div class="mockup-thermal-item">
                <div class="param-label">Presión Neumática</div>
                <div class="param-value">4.5 Bares (Media)</div>
              </div>
              <div class="mockup-thermal-item">
                <div class="param-label">Tipo de Despegue</div>
                <div class="param-value" style="color: var(--accent-cyan);">Cold Peel (En Frío)</div>
              </div>
            </div>
            <p style="font-size: 0.725rem; font-family: var(--font-mono); color: var(--text-muted); margin-top: 0.75rem;">
              ⚠️ Protocolo: Dejar enfriar totalmente el transfer antes de retirar el film PET. Aplicar reprensado de 5 segundos con papel siliconado para sellar la poliamida en las fibras.
            </p>
          </div>

          <!-- Notas especiales del cliente -->
          ${order.customer.notes ? `
            <div class="mockup-spec-card" style="border-left: 3px solid var(--accent-amber);">
              <div class="mockup-spec-card-title" style="color: var(--accent-amber);">
                <span class="material-symbols-outlined" style="font-size: 18px;">edit_note</span>
                Instrucciones Especiales del Cliente
              </div>
              <p style="font-size: 0.85rem; color: var(--text-primary); font-style: italic;">
                "${order.customer.notes}"
              </p>
            </div>
          ` : ''}
        </div>
      </div>

      <div class="mockup-modal-footer">
        <button class="btn btn-secondary" id="printJobSheetBtn" style="padding: 0.6rem 1.25rem; font-size: 0.825rem;">
          🖨️ Imprimir Ficha de Taller
        </button>
        <button class="btn btn-accent" id="approveToPressBtn" style="padding: 0.6rem 1.4rem; font-size: 0.825rem;">
          🔥 Validar y Pasar a Planchado
        </button>
        <button class="btn btn-primary" id="closeMockupModalFooterBtn" style="padding: 0.6rem 1.5rem; font-size: 0.825rem;">
          Listo / Cerrar
        </button>
      </div>
    `;

    // Conectar eventos del modal
    const closeBtn = this.mockupCardEl.querySelector('#closeMockupModalBtn');
    const closeFooterBtn = this.mockupCardEl.querySelector('#closeMockupModalFooterBtn');
    if (closeBtn) closeBtn.addEventListener('click', () => this.closeMockupModal());
    if (closeFooterBtn) closeFooterBtn.addEventListener('click', () => this.closeMockupModal());

    const approveBtn = this.mockupCardEl.querySelector('#approveToPressBtn');
    if (approveBtn) {
      approveBtn.addEventListener('click', async () => {
        approveBtn.disabled = true;
        approveBtn.textContent = "Actualizando...";
        try {
          await apiService.updateOrderStatus(order.id, "en_planchado_curado");
          this.closeMockupModal();
          await this.refreshData();
        } catch (err) {
          alert("Error al actualizar estado del pedido.");
          console.error(err);
        }
      });
    }

    const viewFrontBtn = this.mockupCardEl.querySelector('#mockupViewFrontBtn');
    const viewBackBtn = this.mockupCardEl.querySelector('#mockupViewBackBtn');

    if (viewFrontBtn) {
      viewFrontBtn.addEventListener('click', () => {
        this.activeMockupView = 'front';
        this.renderMockupModal();
      });
    }

    if (viewBackBtn) {
      viewBackBtn.addEventListener('click', () => {
        this.activeMockupView = 'back';
        this.renderMockupModal();
      });
    }

    const itemSelect = this.mockupCardEl.querySelector('#mockupItemSelect');
    if (itemSelect) {
      itemSelect.addEventListener('change', (e) => {
        this.activeItemIndex = parseInt(e.target.value, 10) || 0;
        this.renderMockupModal();
      });
    }

    const printJobBtn = this.mockupCardEl.querySelector('#printJobSheetBtn');
    if (printJobBtn) {
      printJobBtn.addEventListener('click', () => {
        window.print();
      });
    }
  }
}

