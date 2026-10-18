/**
 * SENKAI // GESTOR DE INVENTARIO FÍSICO, MATRIZ DE STOCK Y PRECIOS OFICIALES
 * Módulo para control de existencias por Talla x Color, alerta de stock crítico,
 * edición de precios base de tela y sincronización directa con los precios de la página web principal.
 */

import { apiService } from '../../services/api.js?v=20261018_v3';
import { DEFAULT_LOOKBOOK_ITEMS, DEFAULT_LOOKBOOK_CATEGORIES } from './cms/cms_lookbook.js?v=20261018_v3';

export class InventoryManagerComponent {
  constructor(containerElement, garments = []) {
    this.container = containerElement;
    this.garments = garments;
    this.selectedGarmentId = garments[0]?.id || null;
    this.selectedPriceSize = "S";
    this.variants = [];
    this.lookbookItems = [];
    this.lookbookCategories = DEFAULT_LOOKBOOK_CATEGORIES;
    this.isLoading = false;
    this.feedbackMessage = null;
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  getEffectiveSizePrice(garment, size) {
    if (!garment) return 0;
    const sp = garment.size_prices || {};
    if (sp[size] !== undefined && sp[size] !== null && Number(sp[size]) >= 1000) {
      return Number(sp[size]);
    }
    const variantWithCustom = this.variants.find(
      v => v.garment_id === garment.id && v.size === size && v.custom_price && Number(v.custom_price) >= 1000
    );
    if (variantWithCustom) {
      return Number(variantWithCustom.custom_price);
    }
    return Number(garment.base_price) || 0;
  }

  hasCustomSizePrices(garment) {
    if (!garment) return false;
    const sizeOrder = ["S", "M", "L", "XL", "XXL"];
    const activeSizes = Array.isArray(garment.sizes) && garment.sizes.length > 0
      ? sizeOrder.filter(s => garment.sizes.includes(s))
      : sizeOrder;
    const prices = activeSizes.map(sz => this.getEffectiveSizePrice(garment, sz)).filter(p => p >= 1000);
    if (prices.length <= 1) return false;
    return new Set(prices).size > 1;
  }

  async init() {
    if (!this.selectedGarmentId && this.garments.length > 0) {
      this.selectedGarmentId = this.garments[0].id;
    }
    await this.loadData();
  }

  async loadData() {
    if (!this.selectedGarmentId) return;
    this.isLoading = true;
    this.render();

    try {
      const [variants, siteContent] = await Promise.all([
        apiService.getGarmentVariants(this.selectedGarmentId),
        apiService.getSiteContent().catch(() => null)
      ]);
      this.variants = variants || [];

      const currentGarment = this.garments.find(g => g.id === this.selectedGarmentId);
      if (currentGarment) {
        if (!currentGarment.size_prices) currentGarment.size_prices = {};
        this.variants.forEach(v => {
          if (v.custom_price && Number(v.custom_price) >= 1000) {
            currentGarment.size_prices[v.size] = Number(v.custom_price);
          } else if (currentGarment.size_prices[v.size] === undefined) {
            currentGarment.size_prices[v.size] = Number(currentGarment.base_price) || 15990;
          }
        });
      }

      const savedItems = (siteContent && siteContent.lookbook && Array.isArray(siteContent.lookbook.items))
        ? siteContent.lookbook.items
        : [];
      if (siteContent && siteContent.lookbook && Array.isArray(siteContent.lookbook.categories) && siteContent.lookbook.categories.length > 0) {
        this.lookbookCategories = siteContent.lookbook.categories;
      }

      // Fusiono con las 6 prendas base para asegurar que siempre estén disponibles para editar su precio
      const merged = DEFAULT_LOOKBOOK_ITEMS.map(defItem => {
        const found = savedItems.find(s => s.id === defItem.id);
        return found ? { ...defItem, ...found } : { ...defItem };
      });
      savedItems.forEach(s => {
        if (!merged.some(m => m.id === s.id)) {
          merged.push(s);
        }
      });
      this.lookbookItems = merged;
    } catch (err) {
      console.error("Fallo al consultar inventario de variantes y precios:", err);
      this.variants = [];
    } finally {
      this.isLoading = false;
      this.render();
      this.attachEvents();
    }
  }

  async loadVariants() {
    await this.loadData();
  }

  showFeedback(text, type = "success") {
    this.feedbackMessage = { text, type };
    const banner = this.container?.querySelector('#invFeedbackBanner');
    if (banner) {
      banner.className = `inventory-feedback-banner show ${type}`;
      banner.textContent = text;
      setTimeout(() => {
        if (banner) banner.classList.remove('show');
      }, 4500);
    }
  }

  render() {
    if (!this.container) return;

    const currentGarment = this.garments.find(g => g.id === this.selectedGarmentId);
    const sizeOrder = ["S", "M", "L", "XL", "XXL"];
    const activeSizesForGarment = currentGarment && Array.isArray(currentGarment.sizes) && currentGarment.sizes.length > 0
      ? sizeOrder.filter(s => currentGarment.sizes.includes(s))
      : sizeOrder;

    // Agrupar variantes por color para armar la matriz bidimensional
    const colorsMap = new Map();
    const availableSizesInVariants = new Set(activeSizesForGarment);
    this.variants.forEach(v => {
      availableSizesInVariants.add(v.size);
      if (!colorsMap.has(v.color_name)) {
        colorsMap.set(v.color_name, { hex: v.color_hex, sizes: {} });
      }
      colorsMap.get(v.color_name).sizes[v.size] = v;
    });

    const selectableSizes = sizeOrder.filter(s => availableSizesInVariants.has(s));
    if (!selectableSizes.includes(this.selectedPriceSize)) {
      this.selectedPriceSize = selectableSizes[0] || "S";
    }
    const selectedSizeCurrentPrice = currentGarment
      ? this.getEffectiveSizePrice(currentGarment, this.selectedPriceSize)
      : 0;

    const hasCustomSizes = this.hasCustomSizePrices(currentGarment);
    const isCurrentGarmentActive = currentGarment ? currentGarment.is_active !== false : true;

    // Prendas de la página web principal vinculadas a este modelo textil
    const linkedLookbookItems = currentGarment
      ? this.lookbookItems.filter(item => (item.garment_id || item.garmentId) === currentGarment.id)
      : [];

    const totalStock = this.variants.reduce((acc, v) => acc + v.stock_quantity, 0);
    const lowStockCount = this.variants.filter(v => v.stock_quantity < 10 && v.stock_quantity > 0).length;
    const outOfStockCount = this.variants.filter(v => v.stock_quantity === 0).length;

    this.container.innerHTML = `
      <div class="inventory-module-wrap">
        
        <!-- BANNER DE ORIENTACIÓN RÁPIDA -->
        <div class="inventory-help-callout">
          <span class="material-symbols-outlined inventory-help-icon" style="font-size: 24px; color: var(--accent-admin);">payments</span>
          <div class="inventory-help-text">
            <strong>Control de Disponibilidad de Prendas, Stock y Valor Individual por Talla</strong>
            <p>Desde aquí puedes <strong>encender o apagar tipos de prenda</strong> (ej. deshabilitar <em>Oversized</em> temporalmente sin eliminarla), seleccionar cualquier talla (<strong>S, M, L, XL, XXL</strong>) para asignarle un <strong>valor individual independiente</strong> (con estampado incluido) y gestionar el stock físico.</p>
          </div>
          <button type="button" class="btn btn-secondary inventory-jump-to-cms-btn" id="jumpToCmsFromInventory">
            <span class="material-symbols-outlined" style="font-size: 14px; vertical-align: middle;">edit_note</span>
            <span>Ir a Editor CMS (Textos y Categorías) ↗</span>
          </button>
        </div>

        <div id="invFeedbackBanner" class="inventory-feedback-banner ${this.feedbackMessage ? `show ${this.feedbackMessage.type}` : ''}">
          ${this.feedbackMessage ? this.escapeHtml(this.feedbackMessage.text) : ''}
        </div>

        <!-- PANEL DE ENCENDIDO / APAGADO DE TIPOS DE PRENDAS DISPONIBLES -->
        <div class="inventory-availability-panel">
          <div class="availability-panel-header">
            <div>
              <span class="badge badge-admin">CONTROL DE CATÁLOGO ACTIVO</span>
              <h4>Disponibilidad de Tipos de Prenda (Encender / Apagar)</h4>
              <p>Apaga cualquier silueta que no tengas disponible actualmente (por ejemplo, <strong>Oversize</strong>) sin borrarla del sistema. Al estar apagada, el cliente no podrá seleccionarla ni pedirla en el Simulador ni en el Catálogo.</p>
            </div>
          </div>
          <div class="availability-garments-grid">
            ${this.garments.map(g => {
              const isActive = g.is_active !== false;
              const isSelected = g.id === this.selectedGarmentId;
              return `
                <div class="availability-garment-card ${isActive ? 'is-enabled' : 'is-disabled'} ${isSelected ? 'is-selected-model' : ''}" data-avail-card="${g.id}">
                  <div class="availability-card-top">
                    <div class="availability-model-meta">
                      <strong>${this.escapeHtml(g.name)}</strong>
                      <small>${g.weight_gsm || 240} GSM • Estampado Incluido</small>
                    </div>
                    <span class="availability-status-pill ${isActive ? 'online' : 'offline'}">
                      ${isActive ? 'ENCENDIDA' : 'APAGADA'}
                    </span>
                  </div>
                  <div class="availability-card-actions">
                    <button
                      type="button"
                      class="btn-toggle-garment-power ${isActive ? 'power-on' : 'power-off'}"
                      data-toggle-garment-active="${g.id}"
                      title="${isActive ? 'Apagar prenda para que el cliente no pueda pedirla' : 'Encender prenda para habilitar pedidos'}">
                      <span class="material-symbols-outlined" style="font-size: 16px;">${isActive ? 'toggle_on' : 'toggle_off'}</span>
                      <span>${isActive ? 'Disponible en Tienda (Apagar)' : 'Pausada en Tienda (Encender)'}</span>
                    </button>
                    <button
                      type="button"
                      class="btn-select-garment-edit ${isSelected ? 'active' : ''}"
                      data-garment-id="${g.id}">
                      ${isSelected ? 'Editando Tallas ✓' : 'Editar Tallas / Stock'}
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- CABECERA DEL MÓDULO -->
        <div class="inventory-top-row">
          <div>
            <span class="badge badge-admin">LOGÍSTICA & TALLER INDUSTRIAL</span>
            <h3 class="inventory-title">Bodega, Tallas & Precios Independientes</h3>
            <p class="inventory-desc">
              Editando actualmente: <strong>${currentGarment ? this.escapeHtml(currentGarment.name) : ''}</strong> (${isCurrentGarmentActive ? 'Habilitada para clientes' : 'Pausada — No disponible para clientes'}).
            </p>
          </div>

          <!-- SELECTOR DE MODELO TEXTIL (GHOST PILLS CON PRECIO) -->
          <div class="inventory-garment-tabs">
            ${this.garments.map(g => {
              const isActive = g.is_active !== false;
              return `
                <button 
                  type="button" 
                  class="inventory-model-pill ${g.id === this.selectedGarmentId ? 'active' : ''} ${!isActive ? 'is-muted-off' : ''}" 
                  data-garment-id="${g.id}">
                  <span>${this.escapeHtml(g.name)}</span>
                  <span class="pill-price-tag">${isActive ? `$${g.base_price.toLocaleString('es-CL')}` : 'OFF'}</span>
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <!-- TARJETAS DE RESUMEN DE BODEGA Y VALOR COMERCIAL -->
        <div class="inventory-kpi-grid">
          <div class="inventory-kpi-card">
            <span class="kpi-label">Stock Total de Prenda</span>
            <span class="kpi-val">${totalStock} <small>unidades</small></span>
            <span class="kpi-note">En todas las tallas (${sizeOrder.join(', ')})</span>
          </div>
          <div class="inventory-kpi-card">
            <span class="kpi-label">Valor Talla Seleccionada (${this.selectedPriceSize})</span>
            <span class="kpi-val" id="kpiBasePriceVal">$${selectedSizeCurrentPrice.toLocaleString('es-CL')} <small>CLP</small></span>
            <span class="kpi-note" id="kpiBasePriceNote">${hasCustomSizes ? 'Tallas con valores individuales independientes' : 'Estampado DTF incluido en el valor'}</span>
          </div>
          <div class="inventory-kpi-card ${lowStockCount > 0 ? 'warning' : ''}">
            <span class="kpi-label">Variantes con Stock Crítico (&lt;10)</span>
            <span class="kpi-val">${lowStockCount} <small>variantes</small></span>
            <span class="kpi-note">${lowStockCount > 0 ? 'Reabastecer corte/tela pronto' : 'Existencias saludables'}</span>
          </div>
          <div class="inventory-kpi-card ${!isCurrentGarmentActive ? 'danger' : (outOfStockCount > 0 ? 'danger' : '')}">
            <span class="kpi-label">Estado Comercial del Modelo</span>
            <span class="kpi-val" style="font-size: 1.35rem;">${isCurrentGarmentActive ? 'ENCENDIDO' : 'APAGADO'}</span>
            <span class="kpi-note">${isCurrentGarmentActive ? 'Clientes pueden cotizar y comprar' : 'Pedidos bloqueados para clientes'}</span>
          </div>
        </div>

        <!-- FILA DE DOS COLUMNAS: MATRIZ DE TALLAS/TELAS + EDITOR DE PRECIOS -->
        <div class="inventory-main-layout">
          
          <!-- COLUMNA IZQUIERDA: MATRIZ BIDIMENSIONAL (COLOR X TALLA + VALOR POR TALLA) -->
          <div class="inventory-matrix-card">
            <div class="matrix-card-header">
              <div>
                <h4>Matriz de Tallas, Stock y Valores Individuales // ${currentGarment ? this.escapeHtml(currentGarment.name) : ''}</h4>
                <p style="font-size: 0.775rem; color: var(--text-muted); margin: 0.2rem 0 0;">
                  Especificación textil: <strong>${currentGarment ? `${currentGarment.weight_gsm} GSM • ${this.escapeHtml(currentGarment.composition)}` : ''}</strong>. Cada talla conserva su valor de forma independiente.
                </p>
              </div>
              <span class="badge badge-lime">TALLAS & PRECIOS INDEPENDIENTES</span>
            </div>

            ${this.isLoading ? `
              <div class="inventory-loading-box">
                <div class="spinner-inline"></div>
                <span>Consultando existencias y precios en base de datos...</span>
              </div>
            ` : `
              <div class="table-responsive">
                <table class="inventory-matrix-table">
                  <thead>
                    <tr>
                      <th>Color / Parámetro</th>
                      ${sizeOrder.map(s => {
                        const hasSize = availableSizesInVariants.has(s);
                        const effPrice = currentGarment ? this.getEffectiveSizePrice(currentGarment, s) : 0;
                        const isSelectedSz = s === this.selectedPriceSize;
                        return `
                          <th style="text-align: center;" class="${isSelectedSz ? 'th-selected-size' : ''}">
                            <div>Talla ${s}</div>
                            ${hasSize && currentGarment ? `
                              <span class="matrix-th-price ${isSelectedSz ? 'is-custom' : ''}" data-th-size-price="${s}">
                                $${effPrice.toLocaleString('es-CL')}
                              </span>
                            ` : ''}
                          </th>
                        `;
                      }).join('')}
                    </tr>
                  </thead>
                  <tbody>
                    ${Array.from(colorsMap.entries()).map(([colorName, colorData]) => `
                      <tr>
                        <td class="color-header-cell">
                          <span class="color-dot" style="background-color: ${colorData.hex};"></span>
                          <div class="color-info-wrap">
                            <strong>${this.escapeHtml(colorName)}</strong>
                            <small>Stock físico (un.)</small>
                          </div>
                        </td>
                        ${sizeOrder.map(size => {
                          const variant = colorData.sizes[size];
                          if (!variant) {
                            return `<td class="cell-na" style="text-align: center; color: var(--text-muted); font-family: var(--font-mono); font-size: 0.75rem;">—</td>`;
                          }

                          let statusClass = "stock-ok";
                          if (variant.stock_quantity === 0) statusClass = "stock-empty";
                          else if (variant.stock_quantity < 10) statusClass = "stock-low";

                          return `
                            <td class="cell-stock ${statusClass}">
                              <div class="stock-control-wrap">
                                <input 
                                  type="number" 
                                  class="stock-input" 
                                  min="0" 
                                  max="9999" 
                                  value="${variant.stock_quantity}" 
                                  data-variant-id="${variant.id}" 
                                  data-garment-id="${variant.garment_id}"
                                  aria-label="Stock ${this.escapeHtml(colorName)} talla ${size}"
                                />
                                <button 
                                  type="button" 
                                  class="btn-save-stock" 
                                  data-variant-id="${variant.id}" 
                                  data-garment-id="${variant.garment_id}"
                                  title="Guardar existencias">
                                  <span class="material-symbols-outlined" style="font-size: 15px;">check</span>
                                </button>
                              </div>
                            </td>
                          `;
                        }).join('')}
                      </tr>
                    `).join('')}

                    <!-- FILA DE VALORES / PRECIOS POR TALLA EN LA MATRIZ -->
                    ${currentGarment ? `
                      <tr class="matrix-size-price-row">
                        <td class="color-header-cell matrix-price-label-cell">
                          <span class="material-symbols-outlined" style="font-size: 18px; color: var(--accent-admin); flex-shrink: 0;">sell</span>
                          <div class="color-info-wrap">
                            <strong>Valor por Talla</strong>
                            <small>Precio CLP Independiente</small>
                          </div>
                        </td>
                        ${sizeOrder.map(size => {
                          const hasSize = availableSizesInVariants.has(size);
                          if (!hasSize) {
                            return `<td class="cell-na" style="text-align: center; color: var(--text-muted); font-family: var(--font-mono); font-size: 0.75rem;">—</td>`;
                          }
                          const effPrice = this.getEffectiveSizePrice(currentGarment, size);
                          const isSelectedSz = size === this.selectedPriceSize;
                          return `
                            <td class="cell-size-price ${isSelectedSz ? 'has-custom-size-price' : ''}" data-matrix-price-cell="${size}">
                              <div class="matrix-price-control-stack">
                                <div class="stock-control-wrap">
                                  <span class="matrix-currency-sign">$</span>
                                  <input
                                    type="number"
                                    class="stock-input matrix-size-price-input"
                                    min="1000"
                                    step="500"
                                    value="${effPrice}"
                                    data-size="${size}"
                                    data-garment-id="${currentGarment.id}"
                                    aria-label="Valor CLP talla ${size}"
                                  />
                                  <button
                                    type="button"
                                    class="btn-save-size-price"
                                    data-size="${size}"
                                    data-garment-id="${currentGarment.id}"
                                    title="Guardar valor individual para talla ${size}">
                                    <span class="material-symbols-outlined" style="font-size: 15px;">check</span>
                                  </button>
                                </div>
                                <span class="matrix-size-price-tag ${isSelectedSz ? 'is-custom' : ''}" data-size-tag="${size}">
                                  Talla ${size} • Independiente
                                </span>
                              </div>
                            </td>
                          `;
                        }).join('')}
                      </tr>
                    ` : ''}
                  </tbody>
                </table>
              </div>
            `}
          </div>

          <!-- COLUMNA DERECHA: SELECTOR DE TALLA Y ASIGNACIÓN DE VALOR INDIVIDUAL + VITRINA -->
          ${currentGarment ? `
            <div class="inventory-garment-settings-card">
              <div class="matrix-card-header">
                <div>
                  <h4>Valor Individual por Talla</h4>
                  <p style="font-size: 0.775rem; color: var(--text-muted); margin: 0.2rem 0 0;">
                    Selecciona una talla y asígnale su valor propio sin alterar las demás tallas
                  </p>
                </div>
                <span class="badge badge-crimson">ESTAMPADO INCLUIDO</span>
              </div>

              <!-- 1. Selector de Talla y Asignación de Valor Individual Independiente -->
              <div class="inventory-price-section-box">
                <label class="cms-label">
                  <span>1. Selecciona la Talla para Asignar su Valor Individual</span>
                </label>
                <p class="inventory-price-hint">
                  Elige cualquier talla de <strong>${this.escapeHtml(currentGarment.name)}</strong> y define su precio final (estampado incluido). El valor que asignes es 100% independiente de las otras tallas:
                </p>

                <!-- Píldoras selectoras de talla -->
                <div class="inv-size-selector-pills" role="group" aria-label="Seleccionar talla para editar precio">
                  ${selectableSizes.map(sz => {
                    const szPrice = this.getEffectiveSizePrice(currentGarment, sz);
                    const isSelected = sz === this.selectedPriceSize;
                    return `
                      <button
                        type="button"
                        class="inv-size-selector-pill ${isSelected ? 'active' : ''}"
                        data-select-price-size="${sz}">
                        <span class="pill-sz-code">Talla ${sz}</span>
                        <span class="pill-sz-val" data-pill-size-price="${sz}">$${szPrice.toLocaleString('es-CL')}</span>
                      </button>
                    `;
                  }).join('')}
                </div>

                <!-- Editor directo para la talla seleccionada -->
                <div class="inv-selected-size-editor-box">
                  <div class="selected-size-editor-header">
                    <span class="selected-size-title" id="invSelectedSizeLabel">
                      Valor Individual para <strong>Talla ${this.selectedPriceSize}</strong>
                    </span>
                    <span class="badge badge-lime" id="invSelectedSizeBadge">TALLA ${this.selectedPriceSize}</span>
                  </div>
                  <div class="selected-size-input-row">
                    <div class="inventory-currency-input-wrap" style="flex: 1;">
                      <span class="currency-prefix">$</span>
                      <input
                        type="number"
                        id="invSelectedSizePriceInput"
                        class="cms-input inv-price-input-main"
                        data-selected-size="${this.selectedPriceSize}"
                        value="${selectedSizeCurrentPrice}"
                        min="1000"
                        step="500"
                        aria-label="Valor individual para Talla ${this.selectedPriceSize}"
                      >
                      <span class="currency-suffix">CLP</span>
                    </div>
                    <button
                      type="button"
                      class="btn btn-primary inv-save-single-size-btn"
                      id="invSaveSelectedSizeBtn"
                      data-garment-id="${currentGarment.id}">
                      <span class="material-symbols-outlined" style="font-size: 16px;">check_circle</span>
                      <span id="invSaveSelectedSizeBtnText">Guardar Talla ${this.selectedPriceSize}</span>
                    </button>
                  </div>
                  <div class="selected-size-helper-actions">
                    <small>Solo modifica la talla seleccionada.</small>
                    <button
                      type="button"
                      class="btn-match-base-price"
                      id="invApplySelectedToAllSizesBtn"
                      title="Opcional: Copiar el valor actual a todas las tallas de esta prenda">
                      Igualar todas las tallas a este valor
                    </button>
                  </div>
                </div>

                <!-- Grilla completa con todas las tallas visibles e independientes -->
                <div class="inventory-size-pricing-Subbox">
                  <div class="size-pricing-header-row" style="margin-bottom: 0.55rem;">
                    <span style="font-size: 0.76rem; font-weight: 700; color: var(--text-primary); text-transform: uppercase;">
                      Resumen de Valores por Talla (Edición Directa)
                    </span>
                  </div>

                  <div id="invSizePricesPanel" class="inventory-size-prices-panel" style="display: block;">
                    <div class="inventory-size-prices-grid">
                      ${selectableSizes.map(sz => {
                        const effPrice = this.getEffectiveSizePrice(currentGarment, sz);
                        const isSelected = sz === this.selectedPriceSize;
                        return `
                          <div class="inventory-size-price-item ${isSelected ? 'is-custom' : ''}" data-size-card="${sz}">
                            <div class="size-price-item-top">
                              <span class="size-price-badge-label">Talla ${sz}</span>
                              <span class="size-price-status-pill ${isSelected ? 'is-custom' : ''}" data-panel-size-tag="${sz}">
                                ${isSelected ? 'Activa' : 'Independiente'}
                              </span>
                            </div>
                            <div class="inventory-currency-input-wrap compact" style="width: 100%;">
                              <span class="currency-prefix">$</span>
                              <input
                                type="number"
                                class="cms-input inv-size-price-input"
                                data-size="${sz}"
                                value="${effPrice}"
                                min="1000"
                                step="500"
                                aria-label="Precio específico Talla ${sz}"
                              >
                            </div>
                          </div>
                        `;
                      }).join('')}
                    </div>
                  </div>
                </div>
              </div>

              <!-- 2. Precios en Página Web Principal (Catálogo y Carrusel) -->
              <div class="inventory-price-section-box" style="margin-top: 1.15rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem;">
                  <label class="cms-label" style="margin: 0;">
                    <span>2. Precios de Vitrina (Catálogo & Carrusel)</span>
                  </label>
                  ${linkedLookbookItems.length > 0 ? `
                    <button type="button" class="btn-match-base-price" id="invMatchBasePriceBtn" title="Copia el valor de la talla seleccionada en las tarjetas vinculadas">
                      Igualar a Talla ${this.selectedPriceSize}
                    </button>
                  ` : ''}
                </div>
                <p class="inventory-price-hint">
                  Tarjetas del catálogo vinculadas a este tipo de prenda (al elegir una talla en el catálogo, se cobra el valor individual de esa talla):
                </p>

                ${linkedLookbookItems.length > 0 ? `
                  <div class="inventory-linked-items-list">
                    ${linkedLookbookItems.map(item => `
                      <div class="inventory-linked-item-row" data-lookbook-item-id="${this.escapeHtml(item.id)}">
                        <div class="linked-item-info">
                          <strong>${this.escapeHtml(item.name)}</strong>
                          <small>${this.escapeHtml(item.category || 'urbanas').toUpperCase()}${item.subcategory ? ` • ${this.escapeHtml(item.subcategory)}` : ''}</small>
                        </div>
                        <div class="inventory-currency-input-wrap compact">
                          <span class="currency-prefix">$</span>
                          <input
                            type="number"
                            class="cms-input inv-lookbook-price-input"
                            data-lookbook-id="${this.escapeHtml(item.id)}"
                            data-original-price="${item.price}"
                            value="${item.price}"
                            min="1000"
                            step="500"
                            aria-label="Precio vitrina ${this.escapeHtml(item.name)}"
                          >
                        </div>
                      </div>
                    `).join('')}
                  </div>
                ` : `
                  <div style="padding: 0.75rem; background: var(--bg-main); border: 1px solid var(--border-subtle); font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono);">
                    No hay tarjetas de vitrina vinculadas a este modelo. Los valores por talla aplican directamente en el Simulador DTF.
                  </div>
                `}
              </div>

              <!-- Vista previa fotográfica y plantillas -->
              <div class="inventory-photos-preview" style="margin-top: 1.25rem;">
                <div class="photo-preview-box">
                  <span class="photo-preview-label">Frontal</span>
                  <img id="inv-preview-front" src="${currentGarment.photo_front || currentGarment.image_front_template || '/static/assets/garments/tshirt_front.png'}" alt="Frente" onerror="this.src='/static/assets/garments/tshirt_front.png'">
                </div>
                <div class="photo-preview-box">
                  <span class="photo-preview-label">Espalda</span>
                  <img id="inv-preview-back" src="${currentGarment.photo_back || currentGarment.image_back_template || '/static/assets/garments/tshirt_back.png'}" alt="Espalda" onerror="this.src='/static/assets/garments/tshirt_back.png'">
                </div>
              </div>

              <div class="cms-field-group" style="margin-bottom: 0.85rem;">
                <label class="cms-label" for="inv-photo-front">URL Foto Real Frontal (Prenda Base)</label>
                <input type="text" id="inv-photo-front" class="cms-input" style="font-size: 0.78rem; font-family: var(--font-mono);" value="${this.escapeHtml(currentGarment.photo_front || '')}" placeholder="/static/assets/garments/...">
              </div>

              <div class="cms-field-group" style="margin-bottom: 1.25rem;">
                <label class="cms-label" for="inv-photo-back">URL Foto Real Espalda (Prenda Base)</label>
                <input type="text" id="inv-photo-back" class="cms-input" style="font-size: 0.78rem; font-family: var(--font-mono);" value="${this.escapeHtml(currentGarment.photo_back || '')}" placeholder="/static/assets/garments/...">
              </div>

              <button class="btn btn-primary" id="invSaveGarmentDetailsBtn" style="width: 100%; padding: 0.85rem; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;">
                <span class="material-symbols-outlined" style="font-size: 17px;">save</span>
                <span>Guardar Todos los Precios por Talla y Sincronizar Web</span>
              </button>
            </div>
          ` : ''}

        </div>
      </div>
    `;
  }

  // Cambia la talla activa en el selector individual sin alterar los precios de ninguna talla
  _selectSizeForPricing(size) {
    if (!size) return;
    this.selectedPriceSize = size;
    const panelInput = this.container.querySelector(`.inv-size-price-input[data-size="${size}"]`);
    const matrixInput = this.container.querySelector(`.matrix-size-price-input[data-size="${size}"]`);
    const currentPrice = panelInput
      ? parseInt(panelInput.value || '0', 10)
      : (matrixInput ? parseInt(matrixInput.value || '0', 10) : 0);

    const selectedInput = this.container.querySelector('#invSelectedSizePriceInput');
    if (selectedInput) {
      selectedInput.dataset.selectedSize = size;
      if (!isNaN(currentPrice) && currentPrice > 0) {
        selectedInput.value = currentPrice;
      }
    }

    const labelEl = this.container.querySelector('#invSelectedSizeLabel');
    if (labelEl) {
      labelEl.innerHTML = `Valor Individual para <strong>Talla ${size}</strong>`;
    }
    const badgeEl = this.container.querySelector('#invSelectedSizeBadge');
    if (badgeEl) {
      badgeEl.textContent = `TALLA ${size}`;
    }
    const saveBtnText = this.container.querySelector('#invSaveSelectedSizeBtnText');
    if (saveBtnText) {
      saveBtnText.textContent = `Guardar Talla ${size}`;
    }
    const matchBtn = this.container.querySelector('#invMatchBasePriceBtn');
    if (matchBtn) {
      matchBtn.textContent = `Igualar a Talla ${size}`;
    }
    const kpiVal = this.container.querySelector('#kpiBasePriceVal');
    if (kpiVal && !isNaN(currentPrice) && currentPrice >= 1000) {
      kpiVal.innerHTML = `$${currentPrice.toLocaleString('es-CL')} <small>CLP</small>`;
    }

    this.container.querySelectorAll('.inv-size-selector-pill').forEach(pill => {
      pill.classList.toggle('active', pill.dataset.selectPriceSize === size);
    });

    this.container.querySelectorAll('[data-size-card]').forEach(card => {
      const isSel = card.dataset.sizeCard === size;
      card.classList.toggle('is-custom', isSel);
      const tag = card.querySelector('[data-panel-size-tag]');
      if (tag) {
        tag.textContent = isSel ? 'Activa' : 'Independiente';
        tag.classList.toggle('is-custom', isSel);
      }
    });

    this.container.querySelectorAll('[data-matrix-price-cell]').forEach(cell => {
      const isSel = cell.dataset.matrixPriceCell === size;
      cell.classList.toggle('has-custom-size-price', isSel);
    });
  }

  // Sincroniza visualmente SOLO la talla indicada entre el selector, la grilla y la matriz
  _syncSizePriceVisuals(size, priceVal) {
    const matrixInput = this.container.querySelector(`.matrix-size-price-input[data-size="${size}"]`);
    if (matrixInput && parseInt(matrixInput.value, 10) !== priceVal) {
      matrixInput.value = priceVal;
    }

    const panelInput = this.container.querySelector(`.inv-size-price-input[data-size="${size}"]`);
    if (panelInput && parseInt(panelInput.value, 10) !== priceVal) {
      panelInput.value = priceVal;
    }

    if (this.selectedPriceSize === size) {
      const selectedInput = this.container.querySelector('#invSelectedSizePriceInput');
      if (selectedInput && parseInt(selectedInput.value, 10) !== priceVal) {
        selectedInput.value = priceVal;
      }
      const kpiVal = this.container.querySelector('#kpiBasePriceVal');
      if (kpiVal && !isNaN(priceVal) && priceVal >= 1000) {
        kpiVal.innerHTML = `$${priceVal.toLocaleString('es-CL')} <small>CLP</small>`;
      }
    }

    const pillPrice = this.container.querySelector(`[data-pill-size-price="${size}"]`);
    if (pillPrice && !isNaN(priceVal) && priceVal >= 1000) {
      pillPrice.textContent = `$${priceVal.toLocaleString('es-CL')}`;
    }

    const thBadge = this.container.querySelector(`[data-th-size-price="${size}"]`);
    if (thBadge && !isNaN(priceVal) && priceVal >= 1000) {
      thBadge.textContent = `$${priceVal.toLocaleString('es-CL')}`;
    }
  }

  // Recolecta el mapa completo de precios por talla independientes desde la interfaz
  _collectSizePricesMap() {
    const sizePrices = {};
    const inputs = this.container.querySelectorAll('.inv-size-price-input');
    const sourceInputs = inputs.length > 0 ? inputs : this.container.querySelectorAll('.matrix-size-price-input');

    for (const input of sourceInputs) {
      const sz = input.dataset.size;
      const val = parseInt(input.value, 10);
      if (isNaN(val) || val < 1000) {
        return { error: `⚠️ El valor de la talla ${sz} debe ser mayor o igual a $1.000 CLP.` };
      }
      sizePrices[sz] = val;
    }
    return { sizePrices };
  }

  async _persistSingleSizePrice(garmentId, size, newSizePrice, triggerBtn = null) {
    const currentGarment = this.garments.find(g => g.id === garmentId);
    if (!currentGarment) return;

    if (isNaN(newSizePrice) || newSizePrice < 1000) {
      this.showFeedback(`⚠️ El valor para la talla ${size} debe ser de al menos $1.000 CLP.`, "error");
      return;
    }

    this._syncSizePriceVisuals(size, newSizePrice);

    const { sizePrices, error } = this._collectSizePricesMap();
    if (error) {
      this.showFeedback(error, "error");
      return;
    }
    sizePrices[size] = newSizePrice;

    // El precio referencial de la prenda usa la talla S o el menor valor disponible
    const refBasePrice = sizePrices["S"] || Object.values(sizePrices)[0] || currentGarment.base_price;

    const originalHtml = triggerBtn ? triggerBtn.innerHTML : '';
    if (triggerBtn) {
      triggerBtn.disabled = true;
      triggerBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 15px;">sync</span>';
    }

    try {
      const updatedGarment = await apiService.updateGarment(garmentId, {
        base_price: refBasePrice,
        size_prices: sizePrices
      });
      currentGarment.base_price = updatedGarment.base_price;
      currentGarment.size_prices = { ...sizePrices, ...(updatedGarment.size_prices || {}) };
      this.variants.forEach(v => {
        if (v.garment_id === garmentId && currentGarment.size_prices[v.size]) {
          v.custom_price = currentGarment.size_prices[v.size];
        }
      });

      const activePillPrice = this.container.querySelector(`.inventory-model-pill[data-garment-id="${currentGarment.id}"] .pill-price-tag`);
      if (activePillPrice && currentGarment.is_active !== false) {
        activePillPrice.textContent = `$${currentGarment.base_price.toLocaleString('es-CL')}`;
      }

      if (triggerBtn) {
        triggerBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 15px; color: var(--accent-success);">check</span>';
        setTimeout(() => {
          triggerBtn.innerHTML = originalHtml;
          triggerBtn.disabled = false;
        }, 1000);
      }

      this.showFeedback(
        `✓ Valor individual de Talla ${size} guardado en $${newSizePrice.toLocaleString('es-CL')} CLP (las demás tallas mantienen su valor independiente).`,
        "success"
      );

      window.dispatchEvent(new CustomEvent('senkai:catalog-updated', {
        detail: { garmentId, base_price: currentGarment.base_price, size_prices: currentGarment.size_prices }
      }));
    } catch (err) {
      if (err.message === "UNAUTHORIZED") {
        this.showFeedback("Sesión de taller no autorizada o expirada.", "error");
        window.dispatchEvent(new CustomEvent('senkai:workshop-unauthorized'));
      } else {
        this.showFeedback(`Error al guardar valor de talla ${size}: ${err.message}`, "error");
      }
      if (triggerBtn) {
        triggerBtn.innerHTML = originalHtml;
        triggerBtn.disabled = false;
      }
    }
  }

  attachEvents() {
    // Salto rápido a la pestaña CMS y realce de la sección lookbook
    const jumpBtn = this.container.querySelector('#jumpToCmsFromInventory');
    if (jumpBtn) {
      jumpBtn.addEventListener('click', () => {
        const cmsTab = document.querySelector('[data-tab="cms"]');
        if (cmsTab) {
          cmsTab.click();
          setTimeout(() => {
            const lookbookSec = document.getElementById('cms-section-lookbook');
            if (lookbookSec) {
              lookbookSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
              lookbookSec.classList.remove('cms-section-highlight');
              void lookbookSec.offsetWidth;
              lookbookSec.classList.add('cms-section-highlight');
              setTimeout(() => {
                if (lookbookSec) lookbookSec.classList.remove('cms-section-highlight');
              }, 2400);
            }
          }, 150);
        }
      });
    }

    // 0. Encender / Apagar disponibilidad de un tipo de prenda (ej. Oversized)
    this.container.querySelectorAll('[data-toggle-garment-active]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const gId = e.currentTarget.dataset.toggleGarmentActive;
        const targetGarment = this.garments.find(g => g.id === gId);
        if (!targetGarment) return;

        const currentActive = targetGarment.is_active !== false;
        const nextActive = !currentActive;

        btn.disabled = true;
        try {
          const updated = await apiService.updateGarment(gId, { is_active: nextActive });
          targetGarment.is_active = updated.is_active;

          this.feedbackMessage = {
            text: nextActive
              ? `✓ "${targetGarment.name}" ENCENDIDA: Ahora está disponible para pedidos en el Simulador y Catálogo.`
              : `✓ "${targetGarment.name}" APAGADA: Se conserva en el panel pero los clientes no podrán pedirla temporalmente.`,
            type: "success"
          };

          window.dispatchEvent(new CustomEvent('senkai:catalog-updated', {
            detail: { garmentId: gId, is_active: nextActive }
          }));

          this.render();
          this.attachEvents();
        } catch (err) {
          btn.disabled = false;
          if (err.message === "UNAUTHORIZED") {
            this.showFeedback("Sesión de taller no autorizada o expirada.", "error");
            window.dispatchEvent(new CustomEvent('senkai:workshop-unauthorized'));
          } else {
            this.showFeedback(`Error al cambiar disponibilidad: ${err.message}`, "error");
          }
        }
      });
    });

    // 1. Selector de modelo textil (tanto desde las píldoras como desde las tarjetas de disponibilidad)
    this.container.querySelectorAll('[data-garment-id].inventory-model-pill, [data-garment-id].btn-select-garment-edit').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const gId = e.currentTarget.dataset.garmentId;
        if (gId && gId !== this.selectedGarmentId) {
          this.selectedGarmentId = gId;
          this.feedbackMessage = null;
          await this.loadData();
        }
      });
    });

    // 2. Guardado individual de existencias por variante
    this.container.querySelectorAll('.btn-save-stock').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const variantId = e.currentTarget.dataset.variantId;
        const garmentId = e.currentTarget.dataset.garmentId;
        const input = this.container.querySelector(`.stock-input[data-variant-id="${variantId}"]`);
        if (!input) return;

        const newQty = parseInt(input.value, 10);
        if (isNaN(newQty) || newQty < 0) {
          this.showFeedback("⚠️ El valor de existencias debe ser un número entero mayor o igual a 0.", "error");
          return;
        }

        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 15px;">sync</span>';

        try {
          await apiService.updateVariantStock(garmentId, variantId, newQty);
          
          // Actualizar caché local
          const v = this.variants.find(it => it.id === variantId);
          if (v) v.stock_quantity = newQty;

          btn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 15px; color: var(--accent-success);">check</span>';
          setTimeout(() => {
            btn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 15px;">check</span>';
            btn.disabled = false;
          }, 1200);

          this.showFeedback(`Existencias actualizadas correctamente (${newQty} unidades).`, "success");

          // Disparar sincronización con tienda pública
          window.dispatchEvent(new CustomEvent('senkai:catalog-updated', {
            detail: { garmentId, variantId, stockQuantity: newQty }
          }));
        } catch (err) {
          if (err.message === "UNAUTHORIZED") {
            this.showFeedback("Sesión de taller no autorizada o expirada.", "error");
            window.dispatchEvent(new CustomEvent('senkai:workshop-unauthorized'));
          } else {
            this.showFeedback(`Error al guardar stock: ${err.message}`, "error");
          }
          btn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 15px; color: var(--accent-primary);">close</span>';
          btn.disabled = false;
        }
      });
    });

    // Permitir guardar con Enter en el input de existencias
    this.container.querySelectorAll('.stock-input[data-variant-id]').forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const variantId = input.dataset.variantId;
          const saveBtn = this.container.querySelector(`.btn-save-stock[data-variant-id="${variantId}"]`);
          if (saveBtn) saveBtn.click();
        }
      });
    });

    // 2.B. Selector de Talla Individual y Edición Independiente por Talla
    this.container.querySelectorAll('[data-select-price-size]').forEach(pill => {
      pill.addEventListener('click', (e) => {
        const sz = e.currentTarget.dataset.selectPriceSize;
        this._selectSizeForPricing(sz);
        const selectedInput = this.container.querySelector('#invSelectedSizePriceInput');
        if (selectedInput) {
          selectedInput.focus();
          selectedInput.select();
        }
      });
    });

    const selectedSizePriceInput = this.container.querySelector('#invSelectedSizePriceInput');
    const saveSelectedSizeBtn = this.container.querySelector('#invSaveSelectedSizeBtn');
    const applySelectedToAllBtn = this.container.querySelector('#invApplySelectedToAllSizesBtn');
    const matchBaseBtn = this.container.querySelector('#invMatchBasePriceBtn');

    if (selectedSizePriceInput) {
      selectedSizePriceInput.addEventListener('input', () => {
        const sz = this.selectedPriceSize;
        const val = parseInt(selectedSizePriceInput.value || '0', 10);
        // Solo actualiza la talla seleccionada, sin modificar las demás tallas
        this._syncSizePriceVisuals(sz, val);
      });
      selectedSizePriceInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && saveSelectedSizeBtn) {
          e.preventDefault();
          saveSelectedSizeBtn.click();
        }
      });
    }

    if (saveSelectedSizeBtn && selectedSizePriceInput) {
      saveSelectedSizeBtn.addEventListener('click', async () => {
        const garmentId = saveSelectedSizeBtn.dataset.garmentId;
        const sz = this.selectedPriceSize;
        const val = parseInt(selectedSizePriceInput.value || '0', 10);
        await this._persistSingleSizePrice(garmentId, sz, val, saveSelectedSizeBtn);
      });
    }

    if (applySelectedToAllBtn && selectedSizePriceInput) {
      applySelectedToAllBtn.addEventListener('click', () => {
        const val = parseInt(selectedSizePriceInput.value || '0', 10);
        if (isNaN(val) || val < 1000) {
          this.showFeedback("⚠️ Ingresa un valor mayor o igual a $1.000 CLP antes de igualar las tallas.", "error");
          return;
        }
        this.container.querySelectorAll('.inv-size-price-input').forEach(inp => {
          this._syncSizePriceVisuals(inp.dataset.size, val);
        });
        this.showFeedback(`Valor $${val.toLocaleString('es-CL')} copiado en todas las tallas. Presiona Guardar para confirmar.`, "success");
      });
    }

    // Sincronización en vivo al editar un precio por talla en la grilla de resumen
    this.container.querySelectorAll('.inv-size-price-input').forEach(input => {
      input.addEventListener('focus', () => {
        const sz = input.dataset.size;
        if (sz && sz !== this.selectedPriceSize) {
          this._selectSizeForPricing(sz);
        }
      });
      input.addEventListener('input', () => {
        const sz = input.dataset.size;
        const val = parseInt(input.value || '0', 10);
        this._syncSizePriceVisuals(sz, val);
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const sz = input.dataset.size;
          const val = parseInt(input.value || '0', 10);
          if (this.selectedGarmentId) {
            this._persistSingleSizePrice(this.selectedGarmentId, sz, val);
          }
        }
      });
    });

    // Sincronización en vivo al editar un precio por talla directamente en la matriz izquierda
    this.container.querySelectorAll('.matrix-size-price-input').forEach(input => {
      input.addEventListener('focus', () => {
        const sz = input.dataset.size;
        if (sz && sz !== this.selectedPriceSize) {
          this._selectSizeForPricing(sz);
        }
      });
      input.addEventListener('input', () => {
        const sz = input.dataset.size;
        const val = parseInt(input.value || '0', 10);
        this._syncSizePriceVisuals(sz, val);
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const sz = input.dataset.size;
          const saveSizeBtn = this.container.querySelector(`.btn-save-size-price[data-size="${sz}"]`);
          if (saveSizeBtn) saveSizeBtn.click();
        }
      });
    });

    // Guardado rápido del valor de una talla desde el botón ✓ de la matriz
    this.container.querySelectorAll('.btn-save-size-price').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const size = e.currentTarget.dataset.size;
        const garmentId = e.currentTarget.dataset.garmentId;
        const matrixInput = this.container.querySelector(`.matrix-size-price-input[data-size="${size}"]`);
        if (!matrixInput) return;
        const newSizePrice = parseInt(matrixInput.value, 10);
        await this._persistSingleSizePrice(garmentId, size, newSizePrice, e.currentTarget);
      });
    });

    if (matchBaseBtn && selectedSizePriceInput) {
      matchBaseBtn.addEventListener('click', () => {
        const currentSelectedVal = parseInt(selectedSizePriceInput.value || '0', 10);
        if (isNaN(currentSelectedVal) || currentSelectedVal < 1000) return;
        this.container.querySelectorAll('.inv-lookbook-price-input').forEach(lbInput => {
          lbInput.value = currentSelectedVal;
        });
      });
    }

    // 4. Guardado integral de todos los valores por talla, precios de vitrina web principal y fotos
    const saveGarmentBtn = this.container.querySelector('#invSaveGarmentDetailsBtn');
    if (saveGarmentBtn) {
      saveGarmentBtn.addEventListener('click', async () => {
        const currentGarment = this.garments.find(g => g.id === this.selectedGarmentId);
        if (!currentGarment) return;

        const frontInput = this.container.querySelector('#inv-photo-front');
        const backInput = this.container.querySelector('#inv-photo-back');

        const newPhotoFront = frontInput ? frontInput.value.trim() : null;
        const newPhotoBack = backInput ? backInput.value.trim() : null;

        // Recopilar todos los precios por talla independientes
        const { sizePrices, error: sizeError } = this._collectSizePricesMap();
        if (sizeError) {
          this.showFeedback(sizeError, "error");
          return;
        }

        const newPrice = sizePrices["S"] || Object.values(sizePrices)[0] || currentGarment.base_price;

        // Recopilar precios de las prendas de vitrina vinculadas
        const lookbookPriceUpdates = new Map();
        for (const lbInput of this.container.querySelectorAll('.inv-lookbook-price-input')) {
          const lbId = lbInput.dataset.lookbookId;
          const lbPrice = parseInt(lbInput.value, 10);
          if (isNaN(lbPrice) || lbPrice < 1000) {
            this.showFeedback("⚠️ Todos los precios de vitrina deben ser mayores o iguales a $1.000 CLP.", "error");
            return;
          }
          lookbookPriceUpdates.set(lbId, lbPrice);
        }

        saveGarmentBtn.disabled = true;
        saveGarmentBtn.textContent = "Sincronizando precios por talla...";

        try {
          // A) Actualizar prenda y valores independientes por talla en SQLite
          const updatedGarment = await apiService.updateGarment(currentGarment.id, {
            base_price: newPrice,
            size_prices: sizePrices,
            photo_front: newPhotoFront || null,
            photo_back: newPhotoBack || null
          });

          currentGarment.base_price = updatedGarment.base_price;
          currentGarment.size_prices = { ...sizePrices, ...(updatedGarment.size_prices || {}) };
          currentGarment.photo_front = newPhotoFront;
          currentGarment.photo_back = newPhotoBack;

          this.variants.forEach(v => {
            if (v.garment_id === currentGarment.id && currentGarment.size_prices[v.size]) {
              v.custom_price = currentGarment.size_prices[v.size];
            }
          });

          // B) Actualizar precios de las prendas vinculadas en el Lookbook / Catálogo principal
          if (lookbookPriceUpdates.size > 0 && this.lookbookItems.length > 0) {
            this.lookbookItems = this.lookbookItems.map(item => {
              if (lookbookPriceUpdates.has(item.id)) {
                return { ...item, price: lookbookPriceUpdates.get(item.id) };
              }
              return item;
            });

            const lookbookPayload = {
              items: this.lookbookItems,
              categories: this.lookbookCategories
            };
            await apiService.updateSiteSection('lookbook', lookbookPayload);

            this.container.querySelectorAll('.inv-lookbook-price-input').forEach(lbInput => {
              const lbId = lbInput.dataset.lookbookId;
              if (lookbookPriceUpdates.has(lbId)) {
                lbInput.dataset.originalPrice = String(lookbookPriceUpdates.get(lbId));
              }
            });

            window.dispatchEvent(new CustomEvent('senkai:cms-updated', {
              detail: { sectionKey: 'lookbook', payload: lookbookPayload }
            }));
          }

          // Actualizar etiquetas de precio en las píldoras y KPIs del taller
          const activePillPrice = this.container.querySelector(`.inventory-model-pill[data-garment-id="${currentGarment.id}"] .pill-price-tag`);
          if (activePillPrice && currentGarment.is_active !== false) {
            activePillPrice.textContent = `$${newPrice.toLocaleString('es-CL')}`;
          }

          // Actualizar previsualizaciones fotográficas
          const frontImg = this.container.querySelector('#inv-preview-front');
          const backImg = this.container.querySelector('#inv-preview-back');
          if (frontImg && newPhotoFront) frontImg.src = newPhotoFront;
          if (backImg && newPhotoBack) backImg.src = newPhotoBack;

          // C) Disparar evento global para refrescar Catálogo, Carrusel y Personalizador en vivo
          window.dispatchEvent(new CustomEvent('senkai:catalog-updated', {
            detail: {
              garmentId: currentGarment.id,
              base_price: newPrice,
              size_prices: currentGarment.size_prices,
              photo_front: newPhotoFront,
              photo_back: newPhotoBack
            }
          }));

          this.showFeedback(
            `✓ Valores individuales por talla guardados y sincronizados en toda la tienda web.`,
            "success"
          );
        } catch (err) {
          console.error("Error al actualizar precios de prenda:", err);
          if (err.message === "UNAUTHORIZED") {
            this.showFeedback("Sesión de taller no autorizada o expirada. Ingresa nuevamente la clave.", "error");
            window.dispatchEvent(new CustomEvent('senkai:workshop-unauthorized'));
          } else {
            this.showFeedback(`Error al actualizar: ${err.message || err}`, "error");
          }
        } finally {
          saveGarmentBtn.disabled = false;
          saveGarmentBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 17px;">save</span> <span>Guardar Todos los Precios por Talla y Sincronizar Web</span>';
        }
      });
    }
  }
}

