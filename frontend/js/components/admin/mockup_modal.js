// Ficha Técnica de Confección y Emplazamiento Textil de Senkai Atelier.
// Muestra el mockup de la prenda en Negro Industrial, el registro anatómico de estampas,
// los parámetros de termofijado de taller y permite descargar la orden oficial en PDF.

import { apiService, normalizeItemPrints } from '../../services/api.js?v=20261022_v1';
import { SVG_GARMENTS, PRESET_ARTWORKS } from '../svg_templates.js?v=20261022_v1';
import { downloadOrderDossier } from '../../services/order_document_service.js?v=20261022_v1';
import { notificationService } from '../../services/notification_service.js?v=20261022_v1';

const PRINT_DIMENSIONS = {
  A6: { width: 90, height: 90, cm: "10 × 10 cm", desc: "Bolsillo" },
  A5: { width: 130, height: 160, cm: "15 × 20 cm", desc: "Mediano" },
  A4: { width: 185, height: 230, cm: "20 × 30 cm", desc: "Estándar Pecho" },
  A3: { width: 245, height: 320, cm: "30 × 40 cm", desc: "Maxi Dorsal" }
};

export class MockupModalComponent {
  constructor(modalBackdropId, modalCardId, options = {}) {
    this.modalEl = document.getElementById(modalBackdropId);
    this.cardEl = document.getElementById(modalCardId);
    this.onStatusChanged = options.onStatusChanged || (() => {});

    this.activeOrder = null;
    this.activeItemIndex = 0;
    this.activeView = "front"; // "front" | "back"

    if (this.modalEl) {
      this.modalEl.addEventListener('click', (e) => {
        if (e.target === this.modalEl) {
          this.close();
        }
      });
    }
  }

  normalizeItemPrints(item) {
    return normalizeItemPrints(item);
  }

  getGarmentTemplateKey(garmentNameOrId) {
    const s = (garmentNameOrId || "").toLowerCase();
    if (s.includes("hoodie") || s.includes("canguro")) return "hoodie";
    if (s.includes("crewneck") || s.includes("cuello redondo")) return "crewneck";
    return "tshirt";
  }

  getArtworkMarkup(print) {
    if (print.design_image_url) {
      return `<img src="${print.design_image_url}" alt="${print.design_name || 'Arte DTF'}">`;
    }
    const matched = PRESET_ARTWORKS.find(a => a.name === print.design_name || a.id === print.design_name);
    if (matched) return matched.svgContent;

    return PRESET_ARTWORKS[0].svgContent;
  }

  open(order) {
    if (!order) return;
    this.activeOrder = order;
    this.activeItemIndex = 0;

    const firstItem = order.items[0];
    const prints = firstItem ? this.normalizeItemPrints(firstItem) : [];
    const hasFront = prints.some(p => p.view === 'front');
    const hasBack = prints.some(p => p.view === 'back');
    this.activeView = hasFront ? 'front' : (hasBack ? 'back' : 'front');

    this.render();
    if (this.modalEl) {
      this.modalEl.classList.add('open');
    }
  }

  close() {
    if (this.modalEl) {
      this.modalEl.classList.remove('open');
    }
  }

  render() {
    if (!this.cardEl || !this.activeOrder) return;

    const order = this.activeOrder;
    const currentItem = order.items[this.activeItemIndex] || order.items[0];
    const prints = this.normalizeItemPrints(currentItem);
    const garmentType = this.getGarmentTemplateKey(currentItem.garment_name || currentItem.garment_id);

    const templateFn = SVG_GARMENTS[`${garmentType}_${this.activeView}`] || SVG_GARMENTS.tshirt_front;
    const garmentSvg = templateFn(currentItem.selected_color.hex_code);
    const printsForCurrentView = prints.filter(p => p.view === this.activeView);

    this.cardEl.innerHTML = `
      <div class="mockup-modal-top">
        <div>
          <span class="badge badge-admin" style="margin-bottom: 0.35rem;">ORDEN ${order.order_number} // FICHA TÉCNICA DE PRODUCCIÓN</span>
          <h2>Especificación de Confección & Estampado</h2>
          <div style="font-size: 0.8rem; font-family: var(--font-mono); color: var(--text-muted); margin-top: 0.35rem;">
            Cliente: <strong>${order.customer.full_name}</strong> • ${order.customer.email} • 
            ${order.customer.delivery_method === 'pickup' 
              ? '<span style="color: #6ee7b7;">Retiro en Taller Providencia</span>' 
              : `<span style="color: #93c5fd;">Despacho a ${order.customer.shipping_city || 'Santiago'}</span>`}
          </div>
        </div>
        <div style="display: flex; gap: 0.5rem; align-items: center;">
          <button class="btn btn-secondary" id="downloadOrderModalTopBtn" style="padding: 0.5rem 0.9rem; font-size: 0.75rem; display: inline-flex; align-items: center; gap: 0.35rem;">
            <span class="material-symbols-outlined" style="font-size: 16px;">download</span>
            <span>Descargar Orden PDF</span>
          </button>
          <button class="mockup-modal-close-btn" id="closeMockupModalBtn" aria-label="Cerrar modal">&times;</button>
        </div>
      </div>

      <div class="mockup-modal-grid">
        <!-- COLUMNA IZQUIERDA: VISUALIZADOR ANATÓMICO DE LA PRENDA -->
        <div class="mockup-stage-box">
          <div class="mockup-stage-controls">
            <!-- Conmutador Cara Frontal / Cara Trasera -->
            <div class="mockup-view-toggle">
              <button class="mockup-view-btn ${this.activeView === 'front' ? 'active' : ''}" id="mockupViewFrontBtn">
                Frontal (${prints.filter(p => p.view === 'front').length})
              </button>
              <button class="mockup-view-btn ${this.activeView === 'back' ? 'active' : ''}" id="mockupViewBackBtn">
                Espalda (${prints.filter(p => p.view === 'back').length})
              </button>
            </div>

            <!-- Selector de Ítems en órdenes combinadas -->
            ${order.items.length > 1 ? `
              <select class="mockup-item-selector" id="mockupItemSelect">
                ${order.items.map((item, idx) => `
                  <option value="${idx}" ${idx === this.activeItemIndex ? 'selected' : ''}>
                    Prenda ${idx + 1}: ${item.garment_name} (${item.selected_size})
                  </option>
                `).join('')}
              </select>
            ` : `
              <span style="font-size: 0.75rem; font-family: var(--font-mono); color: var(--text-muted);">
                Talla: <strong style="color: var(--text-primary);">${currentItem.selected_size}</strong> • Negro Industrial
              </span>
            `}
          </div>

          <!-- Escenario visual limpio -->
          <div class="mockup-stage-viewport">
            ${garmentSvg}

            <!-- Límite visual de prensado térmico -->
            <div class="safe-print-boundary" style="pointer-events: none;"></div>

            ${printsForCurrentView.length === 0 ? `
              <div style="position: absolute; bottom: 1.5rem; background: rgba(0,0,0,0.85); padding: 6px 14px; font-size: 0.75rem; font-family: var(--font-mono); color: var(--text-muted); pointer-events: none; border: 1px solid var(--border-subtle);">
                Cara ${this.activeView === 'front' ? 'Frontal' : 'Dorsal'} Lisa (Sin estampa)
              </div>
            ` : printsForCurrentView.map(p => {
              const dim = PRINT_DIMENSIONS[p.print_size] || PRINT_DIMENSIONS.A4;
              return `
                <div class="mockup-print-overlay" 
                     style="left: ${p.offset_x_pct}%; top: ${p.offset_y_pct}%; width: ${dim.width}px; height: ${dim.height}px; transform: translate(-50%, -50%) scale(${p.scale_factor});">
                  <div class="mockup-print-badge">
                    ${p.view === 'back' ? 'ESPALDA' : 'FRENTE'} • ${p.print_size} (${dim.cm}) • ${Math.round(p.scale_factor * 100)}%
                  </div>
                  <div class="mockup-print-art">
                    ${this.getArtworkMarkup(p)}
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <div style="margin-top: 0.85rem; font-size: 0.725rem; font-family: var(--font-mono); color: var(--text-muted); text-align: center;">
            <span class="material-symbols-outlined" style="font-size: 14px; vertical-align: middle;">straighten</span> Emplazamiento visual calibrado al eje anatómico del film DTF.
          </div>
        </div>

        <!-- COLUMNA DERECHA: ESPECIFICACIONES TÉCNICAS DE TALLER -->
        <div class="mockup-specs-box">
          <div class="mockup-spec-card">
            <div class="mockup-spec-card-title">
              <span class="material-symbols-outlined" style="font-size: 18px;">checkroom</span>
              Prenda Base & Patronaje
            </div>
            <div class="mockup-garment-summary">
              <div class="mockup-color-chip" style="background: ${currentItem.selected_color?.hex_code || '#121212'};" title="${currentItem.selected_color?.name || 'Negro'}"></div>
              <div>
                <strong style="font-size: 0.95rem; color: var(--text-primary);">${currentItem.garment_name}</strong><br>
                <span style="font-size: 0.8rem; font-family: var(--font-mono); color: var(--text-muted);">
                  Color: <strong>${currentItem.selected_color?.name || 'Negro Industrial'}</strong> • Talla: <strong>${currentItem.selected_size}</strong> • Cantidad: <strong>${currentItem.quantity} un.</strong>
                </span>
                ${currentItem.preview_front_summary || currentItem.preview_back_summary ? `
                  <div style="font-size: 0.75rem; font-family: var(--font-mono); color: var(--text-secondary); margin-top: 0.35rem;">
                    Frente: <strong style="color: var(--text-primary);">${currentItem.preview_front_summary || 'Cara Lisa'}</strong> • Espalda: <strong style="color: var(--text-primary);">${currentItem.preview_back_summary || 'Cara Lisa'}</strong>
                  </div>
                ` : ''}
              </div>
            </div>
          </div>

          <div class="mockup-spec-card">
            <div class="mockup-spec-card-title">
              <span class="material-symbols-outlined" style="font-size: 18px;">layers</span>
              Registro de Estampas DTF (${prints.length} registradas)
            </div>

            ${prints.length === 0 ? `
              <p style="font-size: 0.8rem; color: var(--text-muted); font-family: var(--font-mono); padding: 0.5rem 0;">Esta prenda fue ordenada lisa, sin estampado.</p>
            ` : `
              <table class="mockup-prints-table">
                <thead>
                  <tr>
                    <th>Cara</th>
                    <th>Formato</th>
                    <th>Posición (X, Y)</th>
                    <th>Diseño</th>
                  </tr>
                </thead>
                <tbody>
                  ${prints.map((p, idx) => {
                    const dim = PRINT_DIMENSIONS[p.print_size] || PRINT_DIMENSIONS.A4;
                    return `
                      <tr>
                        <td><span class="badge ${p.view === 'front' ? 'badge-admin' : 'badge-accent'}" style="font-size: 0.65rem;">${p.view === 'front' ? 'FRONTAL' : 'ESPALDA'}</span></td>
                        <td><strong>${p.print_size}</strong><br><small style="color: var(--text-muted);">${dim.cm}</small></td>
                        <td>X: <strong>${Math.round(p.offset_x_pct)}%</strong><br>Y: <strong>${Math.round(p.offset_y_pct)}%</strong></td>
                        <td>
                          <strong>${p.design_name || `Estampa #${idx + 1}`}</strong>
                          ${p.design_image_url ? `
                            <br><a href="${p.design_image_url}" download="senkai_art_${order.order_number}_${p.print_size}.png" target="_blank" style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.7rem; font-family: var(--font-mono); color: var(--text-primary); text-decoration: underline; margin-top: 4px;">
                              <span class="material-symbols-outlined" style="font-size: 14px; vertical-align: middle;">download</span> Descargar Arte RIP
                            </a>
                          ` : ''}
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            `}
          </div>

          <div class="mockup-spec-card">
            <div class="mockup-spec-card-title">
              <span class="material-symbols-outlined" style="font-size: 18px;">local_fire_department</span>
              Parámetros de Termofijado de Taller
            </div>
            <div class="mockup-thermal-grid">
              <div class="mockup-thermal-item">
                <div class="param-label">Temperatura Prensa</div>
                <div class="param-value">160 °C (320 °F)</div>
              </div>
              <div class="mockup-thermal-item">
                <div class="param-label">Tiempo Prensado</div>
                <div class="param-value">15 Segundos</div>
              </div>
              <div class="mockup-thermal-item">
                <div class="param-label">Presión Neumática</div>
                <div class="param-value">4.5 Bares (Media)</div>
              </div>
              <div class="mockup-thermal-item">
                <div class="param-label">Despegue Film</div>
                <div class="param-value" style="color: #6ee7b7;">Cold Peel (Frío)</div>
              </div>
            </div>
            <p style="font-size: 0.725rem; font-family: var(--font-mono); color: var(--text-muted); margin-top: 0.75rem;">
              <span class="material-symbols-outlined" style="font-size: 14px; vertical-align: middle;">info</span> Dejar enfriar totalmente el transfer antes de retirar el film PET. Aplicar reprensado de 5 segundos con papel siliconado para sellar la poliamida.
            </p>
          </div>

          ${order.customer?.notes ? `
            <div class="mockup-spec-card" style="border-left: 3px solid var(--accent-warning);">
              <div class="mockup-spec-card-title" style="color: var(--accent-warning);">
                <span class="material-symbols-outlined" style="font-size: 18px;">edit_note</span>
                Nota Especial del Cliente
              </div>
              <p style="font-size: 0.85rem; color: var(--text-primary); font-style: italic;">
                "${order.customer.notes}"
              </p>
            </div>
          ` : ''}
        </div>
      </div>

      <div class="mockup-modal-footer">
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <button class="btn btn-primary" id="downloadOrderModalFooterBtn" style="padding: 0.6rem 1.35rem; font-size: 0.825rem; display: inline-flex; align-items: center; gap: 0.4rem;">
            <span class="material-symbols-outlined" style="font-size: 17px;">download</span>
            <span>Descargar Orden Completa (PDF)</span>
          </button>
          <button class="btn btn-secondary" id="printJobSheetBtn" style="padding: 0.6rem 1.15rem; font-size: 0.825rem; display: inline-flex; align-items: center; gap: 0.35rem;">
            <span class="material-symbols-outlined" style="font-size: 16px;">print</span>
            <span>Imprimir Ficha</span>
          </button>
        </div>

        <div style="display: flex; gap: 0.5rem; align-items: center;">
          ${order.status === 'cola_impresion_dtf' ? `
            <button class="btn btn-secondary" id="approveToPressBtn" style="padding: 0.6rem 1.4rem; font-size: 0.825rem; display: inline-flex; align-items: center; gap: 0.35rem; border-color: rgba(255,255,255,0.3);">
              <span class="material-symbols-outlined" style="font-size: 16px;">local_fire_department</span>
              <span>Avanzar a Planchado</span>
            </button>
          ` : ''}
          <button class="btn btn-secondary" id="closeMockupModalFooterBtn" style="padding: 0.6rem 1.25rem; font-size: 0.825rem;">
            Cerrar
          </button>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  attachEvents() {
    const closeBtn = this.cardEl.querySelector('#closeMockupModalBtn');
    const closeFooterBtn = this.cardEl.querySelector('#closeMockupModalFooterBtn');
    if (closeBtn) closeBtn.addEventListener('click', () => this.close());
    if (closeFooterBtn) closeFooterBtn.addEventListener('click', () => this.close());

    // Botones de descarga de la orden oficial en PDF / HTML
    const dlTopBtn = this.cardEl.querySelector('#downloadOrderModalTopBtn');
    const dlFooterBtn = this.cardEl.querySelector('#downloadOrderModalFooterBtn');
    const triggerDownload = () => {
      if (this.activeOrder) {
        notificationService.success(`Generando orden ${this.activeOrder.order_number}...`);
        downloadOrderDossier(this.activeOrder);
      }
    };
    if (dlTopBtn) dlTopBtn.addEventListener('click', triggerDownload);
    if (dlFooterBtn) dlFooterBtn.addEventListener('click', triggerDownload);

    const approveBtn = this.cardEl.querySelector('#approveToPressBtn');
    if (approveBtn && this.activeOrder) {
      approveBtn.addEventListener('click', async () => {
        approveBtn.disabled = true;
        approveBtn.textContent = "Actualizando...";
        try {
          await apiService.updateOrderStatus(this.activeOrder.id, "en_planchado_curado");
          notificationService.success("Pedido avanzado a Planchado / Curado (160°C).");
          this.close();
          this.onStatusChanged();
        } catch (err) {
          notificationService.error("Error al actualizar estado del pedido.");
          console.error(err);
          approveBtn.disabled = false;
          approveBtn.textContent = "Avanzar a Planchado";
        }
      });
    }

    const viewFrontBtn = this.cardEl.querySelector('#mockupViewFrontBtn');
    const viewBackBtn = this.cardEl.querySelector('#mockupViewBackBtn');

    if (viewFrontBtn) {
      viewFrontBtn.addEventListener('click', () => {
        this.activeView = 'front';
        this.render();
      });
    }

    if (viewBackBtn) {
      viewBackBtn.addEventListener('click', () => {
        this.activeView = 'back';
        this.render();
      });
    }

    const itemSelect = this.cardEl.querySelector('#mockupItemSelect');
    if (itemSelect) {
      itemSelect.addEventListener('change', (e) => {
        this.activeItemIndex = parseInt(e.target.value, 10) || 0;
        this.render();
      });
    }

    const printJobBtn = this.cardEl.querySelector('#printJobSheetBtn');
    if (printJobBtn) {
      printJobBtn.addEventListener('click', () => {
        if (this.activeOrder) {
          downloadOrderDossier(this.activeOrder);
        } else {
          window.print();
        }
      });
    }
  }
}
