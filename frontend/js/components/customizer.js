/**
 * SENKAI // PERSONALIZADOR TEXTIL DTF DE ALTA PRECISIÓN
 * Flujo consolidado en 3 pasos: Prenda/Color/Talla, Personalización/Mockup y Pedido.
 * Elimina la sobrecarga de selección de papel DIN (A6-A3) y unifica la carga de imagen con la calibración.
 */

import { SVG_GARMENTS, SVG_GARMENT_THUMBS, PRESET_ARTWORKS } from './svg_templates.js';
import { apiService } from '../services/api.js';

export class CustomizerStudio {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.onAddToCart = options.onAddToCart || (() => {});

    // Estado reactivo: cara frontal inicia con estampa estándar, espalda inicia LISA.
    this.state = {
      selectedGarment: null,
      selectedColor: null,
      selectedSize: "L",
      currentView: "front", // 'front' | 'back'
      quantity: 1,
      activePrintId: "print-front-1",
      activeStep: "garment", // 'garment' | 'print' | 'order'
      prints: [
        {
          id: "print-front-1",
          name: "Estampa Frontal",
          view: "front",
          print_size: "A4",
          artwork: PRESET_ARTWORKS[0],
          customArtworkDataUrl: null,
          offset_x_pct: 50.0,
          offset_y_pct: 38.0,
          scale_factor: 1.0,
          calculated_cost: 5900
        }
      ],
      pricing: {
        basePrice: 12990,
        dtfTotalUnit: 5900,
        unitTotal: 18890,
        discountPct: 0,
        total: 18890
      }
    };

    this.garmentsList = [];
    this.dragControllerActive = false;
  }

  async init(garments) {
    this.garmentsList = garments || [];
    if (this.garmentsList.length > 0) {
      this.state.selectedGarment = this.garmentsList[0];
      this.state.selectedColor = this.state.selectedGarment.colors[0];
      this.state.pricing.basePrice = this.state.selectedGarment.base_price;
    }
    this.render();
    this.attachEvents();
    await this.updateQuote();
  }

  setGarmentById(garmentId, options = {}) {
    const found = this.garmentsList.find(g => g.id === garmentId);
    if (!found) return;

    this.state.selectedGarment = found;
    if (options.colorHex) {
      const matchingColor = found.colors.find(c => c.hex_code.toLowerCase() === options.colorHex.toLowerCase());
      this.state.selectedColor = matchingColor || found.colors[0];
    } else if (!this.state.selectedColor || !found.colors.some(c => c.hex_code === this.state.selectedColor.hex_code)) {
      this.state.selectedColor = found.colors[0];
    }

    if (options.view) {
      this.state.currentView = options.view;
    }

    if (options.colorHex || options.view) {
      this.state.activeStep = "print";
    }

    this.state.pricing.basePrice = found.base_price;
    this.render();
    this.attachEvents();
    this.updateQuote();
  }

  setView(view) {
    this.state.currentView = view;
    const printsOnView = this.state.prints.filter(p => p.view === view);

    if (printsOnView.length > 0) {
      const activePrint = this.getActivePrint();
      if (!activePrint || activePrint.view !== view) {
        this.state.activePrintId = printsOnView[0].id;
      }
    } else {
      this.state.activePrintId = null;
    }

    this.render();
    this.attachEvents();
  }

  getActivePrint() {
    if (!this.state.activePrintId) {
      const currentPrints = this.state.prints.filter(p => p.view === this.state.currentView);
      return currentPrints.length > 0 ? currentPrints[0] : null;
    }
    const found = this.state.prints.find(p => p.id === this.state.activePrintId);
    if (found && found.view === this.state.currentView) {
      return found;
    }
    const fallbackOnView = this.state.prints.find(p => p.view === this.state.currentView);
    return fallbackOnView || null;
  }

  getGarmentThumbType(category) {
    if (category === "poleron_hoodie") return "hoodie";
    if (category === "poleron_crewneck") return "crewneck";
    return "tshirt";
  }

  getPrintBaseDimensions(printSize) {
    const map = {
      A6: { width: 90, height: 90, cm: "10 × 10 cm", desc: "Bolsillo" },
      A5: { width: 130, height: 160, cm: "15 × 20 cm", desc: "Mediano" },
      A4: { width: 185, height: 230, cm: "20 × 30 cm", desc: "Estándar" },
      A3: { width: 245, height: 320, cm: "30 × 40 cm", desc: "Maxi" }
    };
    return map[printSize] || map.A4;
  }

  addPrint(view = this.state.currentView) {
    const isBack = view === "back";
    const existing = this.state.prints.find(p => p.view === view);
    if (existing) {
      // Regla de negocio: 1 sola estampa por cara (o cara lisa). Enfocar la existente.
      this.state.activePrintId = existing.id;
      this.state.currentView = view;
      this.render();
      this.attachEvents();
      return;
    }

    const defaultSize = isBack ? "A3" : "A4";
    const defaultY = isBack ? 42.0 : 38.0;

    const newPrint = {
      id: `print-${view}-${Date.now().toString(36)}`,
      name: `Estampa ${isBack ? 'Espalda' : 'Frente'}`,
      view: view,
      print_size: defaultSize,
      artwork: PRESET_ARTWORKS[isBack ? 1 : 0] || PRESET_ARTWORKS[0],
      customArtworkDataUrl: null,
      offset_x_pct: 50.0,
      offset_y_pct: defaultY,
      scale_factor: 1.0,
      calculated_cost: defaultSize === "A3" ? 8900 : 5900
    };

    this.state.prints.push(newPrint);
    this.state.activePrintId = newPrint.id;
    this.state.currentView = view;
    this.render();
    this.attachEvents();
    this.updateQuote();
  }

  removePrint(printId) {
    this.state.prints = this.state.prints.filter(p => p.id !== printId);
    const printsOnCurrentView = this.state.prints.filter(p => p.view === this.state.currentView);
    if (printsOnCurrentView.length > 0) {
      this.state.activePrintId = printsOnCurrentView[0].id;
    } else {
      this.state.activePrintId = null;
    }
    this.render();
    this.attachEvents();
    this.updateQuote();
  }

  clearCurrentFace() {
    this.state.prints = this.state.prints.filter(p => p.view !== this.state.currentView);
    this.state.activePrintId = null;
    this.render();
    this.attachEvents();
    this.updateQuote();
  }

  setActivePrint(printId) {
    const found = this.state.prints.find(p => p.id === printId);
    if (found) {
      this.state.activePrintId = printId;
      if (this.state.currentView !== found.view) {
        this.state.currentView = found.view;
      }
      this.render();
      this.attachEvents();
    }
  }

  render() {
    if (!this.container || !this.state.selectedGarment) return;

    const g = this.state.selectedGarment;
    const currentColor = this.state.selectedColor.hex_code;
    const activePrint = this.getActivePrint();

    const frontPrints = this.state.prints.filter(p => p.view === 'front');
    const backPrints = this.state.prints.filter(p => p.view === 'back');
    const frontCount = frontPrints.length;
    const backCount = backPrints.length;

    const discountBadge = this.state.quantity >= 20
      ? '25% dto. por volumen'
      : this.state.quantity >= 10
        ? '15% dto. por volumen'
        : this.state.quantity >= 5
          ? '10% dto. por volumen'
          : '';

    this.container.innerHTML = `
      <div class="customizer-layout">
        <!-- COLUMNA IZQUIERDA: CANVAS TEXTIL CON FLIP 3D Y METADATOS TÉCNICOS -->
        <div class="customizer-stage-column">
          <div class="visualizer-card">
            
            <!-- Barra superior: Conmutador Frente / Espalda & Centrado -->
            <div class="visualizer-toolbar">
              <div class="view-toggle-group" role="tablist" aria-label="Cara visible de la prenda">
                <button class="view-toggle-btn ${this.state.currentView === 'front' ? 'active' : ''}" data-view="front" type="button">
                  <span>FRENTE</span>
                  <span class="view-count-pill">${frontCount > 0 ? `${frontCount} ESTAMPA` : 'LISA'}</span>
                </button>
                <button class="view-toggle-btn ${this.state.currentView === 'back' ? 'active' : ''}" data-view="back" type="button">
                  <span>ESPALDA</span>
                  <span class="view-count-pill">${backCount > 0 ? `${backCount} ESTAMPA` : 'LISA'}</span>
                </button>
              </div>

              <div class="visualizer-actions-right">
                ${activePrint ? `
                  <button class="canvas-action-btn btn-magnetic" id="centerActivePrintBtn" title="Centrar estampa en el eje anatómico" type="button">
                    <span class="material-symbols-outlined" style="font-size: 15px;">filter_center_focus</span>
                    <span>Centrar</span>
                  </button>
                ` : `
                  <button class="canvas-action-btn btn-magnetic" id="quickAddFacePrintBtn" title="Agregar estampa en esta cara" type="button" style="color: var(--accent-primary);">
                    <span class="material-symbols-outlined" style="font-size: 15px;">add_circle</span>
                    <span>+ Estampa</span>
                  </button>
                `}
              </div>
            </div>

            <!-- Escenario interactivo con Volteo 3D -->
            <div class="canvas-viewport" id="canvasViewport" title="Arrastra directamente sobre la prenda para calibrar la posición">
              <div class="canvas-snap-guide snap-x" id="canvasSnapX"></div>
              <div class="canvas-snap-guide snap-y" id="canvasSnapY"></div>

              <div class="garment-stage-3d">
                <div class="garment-card-flipper ${this.state.currentView === 'back' ? 'is-flipped' : ''}" id="garmentFlipper">
                  
                  <!-- CARA FRONTAL -->
                  <div class="garment-flip-face face-front">
                    <div class="garment-svg-wrapper">
                      ${this.getGarmentSvgMarkup(g.category, 'front', currentColor)}
                    </div>
                    <div class="safe-print-boundary" title="Área útil de prensado frontal"></div>
                    ${frontPrints.map(p => this.renderDraggablePrintMarkup(p, activePrint)).join('')}
                  </div>

                  <!-- CARA TRASERA -->
                  <div class="garment-flip-face face-back">
                    <div class="garment-svg-wrapper">
                      ${this.getGarmentSvgMarkup(g.category, 'back', currentColor)}
                    </div>
                    <div class="safe-print-boundary" title="Área útil de prensado dorsal"></div>
                    ${backPrints.map(p => this.renderDraggablePrintMarkup(p, activePrint)).join('')}
                  </div>

                </div>
              </div>

              <!-- Ficha técnica flotante en la base del canvas -->
              <div class="canvas-badge-info">
                <div class="canvas-info-left">
                  <span class="canvas-garment-title">${g.name}</span>
                  <span class="canvas-info-sep">•</span>
                  <span class="canvas-color-dot" style="background: ${currentColor};"></span>
                  <span class="canvas-color-label">${this.state.selectedColor.name}</span>
                  <span class="canvas-info-sep">•</span>
                  <span class="canvas-size-label">TALLA ${this.state.selectedSize}</span>
                </div>
                <div class="canvas-info-right">
                  <span class="canvas-active-print-tag">
                    ${activePrint ? `${activePrint.name} [${Math.round(activePrint.scale_factor * 100)}%]` : `Cara ${this.state.currentView === 'front' ? 'Frontal' : 'Trasera'} Lisa`}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- COLUMNA DERECHA: CONSOLA DE TALLER CON NAVEGACIÓN MODULAR Y DOCK DE PRECIO -->
        <div class="customizer-inspector-column">
          <div class="atelier-console-card">
            
            <!-- Barra de Pestañas de Paso -->
            <div class="atelier-tabs-nav" role="tablist">
              <button class="atelier-tab-btn ${this.state.activeStep === 'garment' ? 'active' : ''}" data-step="garment" type="button">
                <span class="tab-index">01</span>
                <span class="tab-text">PRENDA & TALLA</span>
              </button>
              <button class="atelier-tab-btn ${this.state.activeStep === 'print' ? 'active' : ''}" data-step="print" type="button">
                <span class="tab-index">02</span>
                <span class="tab-text">ESTAMPA & ARTE</span>
                ${this.state.prints.length > 0 ? `<span class="tab-active-dot" title="${this.state.prints.length} estampa(s)"></span>` : ''}
              </button>
              <button class="atelier-tab-btn ${this.state.activeStep === 'order' ? 'active' : ''}" data-step="order" type="button">
                <span class="tab-index">03</span>
                <span class="tab-text">LOTE & ORDEN</span>
              </button>
            </div>

            <!-- Cuerpo del Panel según Paso Activo -->
            <div class="atelier-tab-body">
              ${this.state.activeStep === 'garment' ? `
                <!-- PASO 01: PRENDA, COLOR & TALLA -->
                <div class="inspector-step-pane">
                  <!-- Silueta Textil -->
                  <div class="inspector-box">
                    <div class="control-label-row">
                      <span class="control-label">Silueta Textil</span>
                      <span class="control-meta">${g.weight_gsm}g/m² • ${g.composition}</span>
                    </div>
                    <div class="garment-cards-grid">
                      ${this.garmentsList.map(item => {
                        const type = this.getGarmentThumbType(item.category);
                        const isSelected = item.id === g.id;
                        return `
                          <button class="garment-card-btn ${isSelected ? 'active' : ''}" data-garment-id="${item.id}" type="button">
                            <div class="garment-card-thumb">
                              ${SVG_GARMENT_THUMBS[type](item.colors[0].hex_code)}
                            </div>
                            <div class="garment-card-content">
                              <div class="garment-card-title">${item.name}</div>
                              <div class="garment-card-meta">
                                <span class="garment-gsm-tag">${item.weight_gsm}g/m²</span>
                                <span class="garment-price-tag">$${item.base_price.toLocaleString('es-CL')}</span>
                              </div>
                            </div>
                          </button>
                        `;
                      }).join('')}
                    </div>
                  </div>

                  <!-- Color de la Tela -->
                  <div class="inspector-box">
                    <div class="control-label-row">
                      <span class="control-label">Color de la Tela</span>
                      <span class="control-meta selected-color-name">Seleccionado: <strong>${this.state.selectedColor.name}</strong></span>
                    </div>
                    <div class="color-swatches-row">
                      ${g.colors.map(color => {
                        const isSelected = color.hex_code === this.state.selectedColor.hex_code;
                        const isLight = color.hex_code.toLowerCase() === '#ffffff' || color.hex_code.toLowerCase() === '#f4f4f5';
                        return `
                          <button class="color-swatch-btn ${isSelected ? 'active' : ''}" 
                                  style="background: ${color.hex_code};"
                                  title="${color.name}"
                                  data-color-name="${color.name}"
                                  data-color-hex="${color.hex_code}"
                                  type="button"
                                  aria-label="Color ${color.name}">
                            ${isSelected ? `<span class="swatch-check material-symbols-outlined" style="color: ${isLight ? '#000000' : '#ffffff'}; font-size: 18px;">check</span>` : ''}
                          </button>
                        `;
                      }).join('')}
                    </div>
                  </div>

                  <!-- Talla -->
                  <div class="inspector-box">
                    <div class="control-label-row">
                      <span class="control-label">Talla de la Prenda</span>
                      <span class="control-meta">Seleccionada: <strong>${this.state.selectedSize}</strong></span>
                    </div>
                    <div class="size-pills-row">
                      ${g.sizes.map(sz => `
                        <button class="size-pill-btn ${sz === this.state.selectedSize ? 'active' : ''}" data-size="${sz}" type="button">
                          ${sz}
                        </button>
                      `).join('')}
                    </div>
                  </div>

                  <!-- Botón de avance -->
                  <div class="step-nav-footer">
                    <button class="btn btn-primary step-advance-btn" data-goto-step="print" type="button">
                      <span>CONTINUAR A ESTAMPA & ARTE →</span>
                    </button>
                  </div>
                </div>
              ` : ''}

              ${this.state.activeStep === 'print' ? `
                <!-- PASO 02: PERSONALIZACIÓN & MOCKUP -->
                <div class="inspector-step-pane">
                  <div class="step-face-indicator-bar">
                    <span>Cara en Edición: <strong>${this.state.currentView === 'front' ? 'FRENTE' : 'ESPALDA'}</strong></span>
                    <button class="btn-switch-face-link" id="switchFaceFromStepBtn" type="button">
                      Alternar a ${this.state.currentView === 'front' ? 'Espalda ↷' : 'Frente ↶'}
                    </button>
                  </div>

                  ${activePrint ? `
                    <!-- Dropzone y Carga de Archivo Propio -->
                    <div class="inspector-box">
                      <div class="control-label-row">
                        <span class="control-label">Archivo de Estampa</span>
                        <span class="control-meta">${activePrint.customArtworkDataUrl ? 'Archivo Propio Subido' : activePrint.artwork.name}</span>
                      </div>

                      <div class="upload-dropzone" id="uploadDropzone" style="margin-bottom: 0.85rem;">
                        <span class="material-symbols-outlined upload-dropzone-icon">cloud_upload</span>
                        <p class="upload-dropzone-title">Subir imagen personalizada</p>
                        <p class="upload-dropzone-sub">PNG sin fondo a 300 DPI o SVG vectorial</p>
                        <input type="file" id="fileInputDtf" accept="image/png, image/jpeg, image/svg+xml" style="display: none;">
                      </div>

                      <!-- Botón de Quitar Estampa / Dejar Lisa -->
                      <button class="btn-remove-face-print" id="removeFacePrintBtn" type="button" title="Quitar diseño y dejar cara lisa">
                        <span class="material-symbols-outlined" style="font-size: 16px;">delete_outline</span>
                        <span>Quitar estampa de esta cara (Dejar Lisa)</span>
                      </button>
                    </div>

                    <!-- Posición y Ajuste Milimétrico en Mockup -->
                    <div class="inspector-box">
                      <div class="control-label-row">
                        <span class="control-label">Ajuste de Posición y Tamaño</span>
                        <span class="control-meta">Arrastra en la prenda o calibra con sliders</span>
                      </div>

                      <div class="fine-tuning-grid">
                        <div class="tuning-field">
                          <div class="tuning-label">
                            <span>Horizontal (X)</span>
                            <strong id="posXValText">${Math.round(activePrint.offset_x_pct)}%</strong>
                          </div>
                          <input type="range" class="tuning-slider" id="posXSlider" min="16" max="84" step="0.5" value="${activePrint.offset_x_pct}">
                        </div>
                        <div class="tuning-field">
                          <div class="tuning-label">
                            <span>Vertical (Y)</span>
                            <strong id="posYValText">${Math.round(activePrint.offset_y_pct)}%</strong>
                          </div>
                          <input type="range" class="tuning-slider" id="posYSlider" min="16" max="84" step="0.5" value="${activePrint.offset_y_pct}">
                        </div>
                        <div class="tuning-field tuning-field-full">
                          <div class="tuning-label">
                            <span>Escala del Arte (Zoom)</span>
                            <strong id="scaleValText">${Math.round(activePrint.scale_factor * 100)}%</strong>
                          </div>
                          <input type="range" class="tuning-slider" id="scaleSlider" min="0.5" max="1.6" step="0.05" value="${activePrint.scale_factor}">
                        </div>
                      </div>

                      <!-- Botón de centrado anatómico -->
                      <div style="margin-top: 0.85rem;">
                        <button class="preset-pos-shortcut" id="centerShortcutBtn" type="button" style="width: 100%; justify-content: center; display: inline-flex; align-items: center; gap: 0.4rem;">
                          <span class="material-symbols-outlined" style="font-size: 15px;">filter_center_focus</span>
                          <span>Centrar Estampa en ${this.state.currentView === 'front' ? 'el Pecho' : 'la Espalda'}</span>
                        </button>
                      </div>
                    </div>
                  ` : `
                    <!-- Estado de cara lisa -->
                    <div class="face-empty-state">
                      <span class="material-symbols-outlined face-empty-icon">check_circle_outline</span>
                      <div class="face-empty-title">CARA ${this.state.currentView === 'front' ? 'FRONTAL' : 'TRASERA'} LISA</div>
                      <p class="face-empty-desc">Esta cara no tiene estampas. La prenda se confeccionará limpia en este lado.</p>
                      <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; justify-content: center; width: 100%;">
                        <button class="btn-add-face-print" id="addFacePrintBtn" type="button">
                          <span class="material-symbols-outlined" style="font-size: 16px;">add</span>
                          <span>Agregar Estampa</span>
                        </button>
                        <button class="btn-add-face-print" id="uploadDirectBtn" type="button" style="background: transparent; border: 1px solid var(--border-strong); color: var(--text-primary);">
                          <span class="material-symbols-outlined" style="font-size: 16px;">upload_file</span>
                          <span>Subir Mi Imagen Directamente</span>
                        </button>
                        <input type="file" id="fileInputDirect" accept="image/png, image/jpeg, image/svg+xml" style="display: none;">
                      </div>
                    </div>
                  `}

                  <div class="step-nav-footer step-nav-between">
                    <button class="btn btn-secondary step-advance-btn" data-goto-step="garment" type="button">
                      <span>← Prenda Base</span>
                    </button>
                    <button class="btn btn-primary step-advance-btn" data-goto-step="order" type="button">
                      <span>CONTINUAR A LOTE & CANTIDAD →</span>
                    </button>
                  </div>
                </div>
              ` : ''}

              ${this.state.activeStep === 'order' ? `
                <!-- PASO 03: DETALLES DEL PEDIDO & MULTI-PRENDA -->
                <div class="inspector-step-pane">
                  <div class="inspector-box">
                    <div class="control-label-row">
                      <span class="control-label">Cantidad de esta Prenda</span>
                      <span class="control-meta discount-tier-label">${discountBadge || 'Precio unitario estándar'}</span>
                    </div>
                    <div class="qty-selector-row">
                      <div class="qty-stepper">
                        <button class="qty-stepper-btn" id="qtyMinus" type="button" aria-label="Disminuir cantidad">−</button>
                        <input type="number" class="qty-stepper-val" id="qtyInput" min="1" max="500" value="${this.state.quantity}" aria-label="Cantidad de prendas">
                        <button class="qty-stepper-btn" id="qtyPlus" type="button" aria-label="Aumentar cantidad">+</button>
                      </div>
                      <div class="qty-discount-pills">
                        <span class="qty-tier-pill ${this.state.quantity >= 5 && this.state.quantity < 10 ? 'active' : ''}">5+ un: 10% dto</span>
                        <span class="qty-tier-pill ${this.state.quantity >= 10 && this.state.quantity < 20 ? 'active' : ''}">10+ un: 15% dto</span>
                        <span class="qty-tier-pill ${this.state.quantity >= 20 ? 'active' : ''}">20+ un: 25% dto</span>
                      </div>
                    </div>
                  </div>

                  <!-- Desglose detallado -->
                  <div class="inspector-box">
                    <div class="control-label-row">
                      <span class="control-label">Desglose Unitario DTF</span>
                      <span class="control-meta">Parámetros de Taller</span>
                    </div>
                    <div class="quote-row">
                      <span>Prenda Base (${g.name} - ${this.state.selectedSize})</span>
                      <span id="quoteBasePrice">$${g.base_price.toLocaleString('es-CL')}</span>
                    </div>
                    <div class="quote-row">
                      <span>Transfers DTF (${this.state.prints.length} estampa${this.state.prints.length !== 1 ? 's' : ''})</span>
                      <span id="quoteDtfPrice">+$${this.state.pricing.dtfTotalUnit.toLocaleString('es-CL')}</span>
                    </div>
                    ${this.state.pricing.discountPct > 0 ? `
                      <div class="quote-row quote-discount-row">
                        <span>Descuento por Volumen (${this.state.pricing.discountPct}%)</span>
                        <span>-$${Math.round(this.state.pricing.dtfTotalUnit * this.state.pricing.discountPct / 100).toLocaleString('es-CL')}</span>
                      </div>
                    ` : ''}
                  </div>

                  <div class="order-multi-item-tip">
                    <span class="material-symbols-outlined order-multi-item-tip-icon">info</span>
                    <p>
                      <strong>¿Deseas personalizar más prendas?</strong> Puedes agregar esta prenda a tu orden y luego configurar otra prenda (mismo diseño o diferente) para enviarlas juntas en un solo pedido.
                    </p>
                  </div>

                  <div class="step-nav-footer">
                    <button class="btn btn-secondary step-advance-btn" data-goto-step="print" type="button">
                      <span>← Calibrar Estampa</span>
                    </button>
                  </div>
                </div>
              ` : ''}
            </div>

            <!-- 3. Dock de Cotización Fijo y Botón de Acción -->
            <div class="live-quote-dock">
              <div class="quote-dock-row">
                <div class="quote-dock-info">
                  <span class="quote-dock-garment">${g.name} [${this.state.selectedSize}]</span>
                  <span class="quote-dock-sub">${this.state.prints.length} estampa${this.state.prints.length !== 1 ? 's' : ''} • Lote ${this.state.quantity} un.</span>
                </div>
                <div class="quote-dock-price">
                  <span class="quote-dock-total" id="quoteTotalVal">$${this.state.pricing.total.toLocaleString('es-CL')}</span>
                  <span class="quote-dock-currency">CLP</span>
                </div>
              </div>
              <button class="btn btn-primary btn-add-cart-dock" id="addToCartCustomizerBtn" type="button">
                <span class="material-symbols-outlined" style="font-size: 18px;">playlist_add</span>
                <span>+ AGREGAR A LA ORDEN DE TRABAJO</span>
              </button>
            </div>

          </div>
        </div>
      </div>
    `;
  }

  renderDraggablePrintMarkup(p, activePrint) {
    const dims = this.getPrintBaseDimensions(p.print_size);
    const isActive = activePrint && p.id === activePrint.id;
    return `
      <div class="dtf-print-draggable ${isActive ? 'active-print' : ''}"
           id="draggable-${p.id}"
           data-print-id="${p.id}"
           style="left: ${p.offset_x_pct}%; top: ${p.offset_y_pct}%; width: ${dims.width}px; height: ${dims.height}px; transform: translate(-50%, -50%) scale(${p.scale_factor});">
        ${isActive ? `
          <div class="print-gizmo-badge">
            <span class="material-symbols-outlined" style="font-size: 13px;">drag_pan</span>
            <span>${Math.round(p.scale_factor * 100)}%</span>
          </div>
          <span class="gizmo-handle handle-tl"></span>
          <span class="gizmo-handle handle-tr"></span>
          <span class="gizmo-handle handle-bl"></span>
          <span class="gizmo-handle handle-br"></span>
        ` : ''}
        ${this.getPrintArtworkMarkup(p)}
      </div>
    `;
  }

  getGarmentSvgMarkup(category, view, colorHex) {
    if (category === "poleron_hoodie") {
      return view === "back" ? SVG_GARMENTS.hoodie_back(colorHex) : SVG_GARMENTS.hoodie_front(colorHex);
    } else if (category === "poleron_crewneck") {
      return view === "back" ? SVG_GARMENTS.crewneck_back(colorHex) : SVG_GARMENTS.crewneck_front(colorHex);
    } else {
      return view === "back" ? SVG_GARMENTS.tshirt_back(colorHex) : SVG_GARMENTS.tshirt_front(colorHex);
    }
  }

  getPrintArtworkMarkup(print) {
    if (print.customArtworkDataUrl) {
      return `<img src="${print.customArtworkDataUrl}" alt="${print.name}">`;
    }
    return print.artwork ? print.artwork.svgContent : PRESET_ARTWORKS[0].svgContent;
  }

  attachEvents() {
    // 0. Pestañas de la consola de taller
    this.container.querySelectorAll('.atelier-tab-btn[data-step]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.state.activeStep = e.currentTarget.dataset.step;
        this.render();
        this.attachEvents();
      });
    });

    // 0.1 Botones de avance / retorno entre pasos
    this.container.querySelectorAll('[data-goto-step]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.state.activeStep = e.currentTarget.dataset.gotoStep;
        this.render();
        this.attachEvents();
      });
    });

    // 0.2 Botón para alternar cara directamente desde el paso 2
    const switchFaceFromStepBtn = this.container.querySelector('#switchFaceFromStepBtn');
    if (switchFaceFromStepBtn) {
      switchFaceFromStepBtn.addEventListener('click', () => {
        this.setView(this.state.currentView === 'front' ? 'back' : 'front');
      });
    }

    // 1. Selector de vista de prenda (Frente / Espalda)
    this.container.querySelectorAll('.view-toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.setView(e.currentTarget.dataset.view);
      });
    });

    // 2. Miniaturas de Doble Captura (si existen en DOM)
    this.container.querySelectorAll('.capture-card').forEach(card => {
      card.addEventListener('click', (e) => {
        this.setView(e.currentTarget.dataset.view);
      });
    });

    // 3. Selección de silueta textil (Prenda)
    this.container.querySelectorAll('.garment-card-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.setGarmentById(e.currentTarget.dataset.garmentId);
      });
    });

    // 4. Selección de color de tela
    this.container.querySelectorAll('.color-swatch-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const hex = e.currentTarget.dataset.colorHex;
        const name = e.currentTarget.dataset.colorName;
        this.state.selectedColor = { name, hex_code: hex, in_stock: true };
        this.render();
        this.attachEvents();
      });
    });

    // 5. Selección de talla
    this.container.querySelectorAll('.size-pill-btn[data-size]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.state.selectedSize = e.currentTarget.dataset.size;
        this.render();
        this.attachEvents();
      });
    });

    // 6. Botones para agregar estampa
    const addFacePrintBtn = this.container.querySelector('#addFacePrintBtn');
    if (addFacePrintBtn) {
      addFacePrintBtn.addEventListener('click', () => {
        this.addPrint(this.state.currentView);
      });
    }

    const quickAddBtn = this.container.querySelector('#quickAddFacePrintBtn');
    if (quickAddBtn) {
      quickAddBtn.addEventListener('click', () => {
        this.addPrint(this.state.currentView);
      });
    }

    // 7. Botón para quitar estampa / dejar cara lisa
    const removeFacePrintBtn = this.container.querySelector('#removeFacePrintBtn');
    if (removeFacePrintBtn) {
      removeFacePrintBtn.addEventListener('click', () => {
        this.clearCurrentFace();
      });
    }

    // 8. Botón de subida directa cuando la cara está lisa
    const uploadDirectBtn = this.container.querySelector('#uploadDirectBtn');
    const fileInputDirect = this.container.querySelector('#fileInputDirect');
    if (uploadDirectBtn && fileInputDirect) {
      uploadDirectBtn.addEventListener('click', () => fileInputDirect.click());
      fileInputDirect.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          this.handleDirectFileUpload(e.target.files[0]);
        }
      });
    }

    // 9. Centrado anatómico
    const centerBtn = this.container.querySelector('#centerActivePrintBtn');
    const centerShortcutBtn = this.container.querySelector('#centerShortcutBtn');
    const applyCenter = () => {
      const active = this.getActivePrint();
      if (active) {
        active.offset_x_pct = 50.0;
        active.offset_y_pct = active.view === 'back' ? 42.0 : 38.0;
        this.render();
        this.attachEvents();
      }
    };
    if (centerBtn) centerBtn.addEventListener('click', applyCenter);
    if (centerShortcutBtn) centerShortcutBtn.addEventListener('click', applyCenter);

    // 10. Sliders de calibración milimétrica y escala
    const posXSlider = this.container.querySelector('#posXSlider');
    const posYSlider = this.container.querySelector('#posYSlider');
    const scaleSlider = this.container.querySelector('#scaleSlider');

    const updateSliderPrintPosition = () => {
      const active = this.getActivePrint();
      if (active && posXSlider && posYSlider) {
        active.offset_x_pct = parseFloat(posXSlider.value);
        active.offset_y_pct = parseFloat(posYSlider.value);
        const xText = this.container.querySelector('#posXValText');
        const yText = this.container.querySelector('#posYValText');
        if (xText) xText.textContent = `${Math.round(active.offset_x_pct)}%`;
        if (yText) yText.textContent = `${Math.round(active.offset_y_pct)}%`;

        const draggableEl = this.container.querySelector(`#draggable-${active.id}`);
        if (draggableEl) {
          draggableEl.style.left = `${active.offset_x_pct}%`;
          draggableEl.style.top = `${active.offset_y_pct}%`;
        }
      }
    };

    if (posXSlider) posXSlider.addEventListener('input', updateSliderPrintPosition);
    if (posYSlider) posYSlider.addEventListener('input', updateSliderPrintPosition);

    if (scaleSlider) {
      scaleSlider.addEventListener('input', () => {
        const active = this.getActivePrint();
        if (active) {
          active.scale_factor = parseFloat(scaleSlider.value);
          const scText = this.container.querySelector('#scaleValText');
          if (scText) scText.textContent = `${Math.round(active.scale_factor * 100)}%`;

          const draggableEl = this.container.querySelector(`#draggable-${active.id}`);
          if (draggableEl) {
            draggableEl.style.transform = `translate(-50%, -50%) scale(${active.scale_factor})`;
          }
        }
      });
    }

    // 11. Subida de archivo personalizado para estampa activa
    const dropzone = this.container.querySelector('#uploadDropzone');
    const fileInput = this.container.querySelector('#fileInputDtf');

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());
      dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragging'); });
      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragging'));
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragging');
        if (e.dataTransfer.files.length > 0) this.handleFileUpload(e.dataTransfer.files[0]);
      });
      fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) this.handleFileUpload(e.target.files[0]);
      });
    }

    // 12. Stepper de cantidad
    const qtyMinus = this.container.querySelector('#qtyMinus');
    const qtyPlus = this.container.querySelector('#qtyPlus');
    const qtyInput = this.container.querySelector('#qtyInput');

    if (qtyMinus && qtyPlus && qtyInput) {
      qtyMinus.addEventListener('click', () => {
        this.state.quantity = Math.max(1, this.state.quantity - 1);
        qtyInput.value = this.state.quantity;
        this.updateQuote();
      });
      qtyPlus.addEventListener('click', () => {
        this.state.quantity = Math.min(500, this.state.quantity + 1);
        qtyInput.value = this.state.quantity;
        this.updateQuote();
      });
      qtyInput.addEventListener('change', (e) => {
        this.state.quantity = Math.max(1, Math.min(500, parseInt(e.target.value, 10) || 1));
        qtyInput.value = this.state.quantity;
        this.updateQuote();
      });
    }

    // 13. Botón agregar a la orden de trabajo
    const addBtn = this.container.querySelector('#addToCartCustomizerBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.triggerAddToCart());
    }

    // 14. Inicializar controlador de arrastre libre en canvas
    this.setupDragController();
  }

  setupDragController() {
    const viewport = this.container.querySelector('#canvasViewport');
    if (!viewport) return;

    let draggedEl = null;
    let targetPrint = null;
    let startX = 0, startY = 0;
    let initialLeftPct = 50, initialTopPct = 50;

    const onPointerDown = (e) => {
      const printEl = e.target.closest('.dtf-print-draggable');
      if (!printEl) return;

      e.preventDefault();
      const printId = printEl.dataset.printId;
      targetPrint = this.state.prints.find(p => p.id === printId);
      if (!targetPrint) return;

      if (this.state.activePrintId !== printId) {
        this.setActivePrint(printId);
      }

      draggedEl = printEl;
      draggedEl.classList.add('is-dragging');

      startX = e.clientX;
      startY = e.clientY;
      initialLeftPct = targetPrint.offset_x_pct;
      initialTopPct = targetPrint.offset_y_pct;

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    };

    const onPointerMove = (e) => {
      if (!draggedEl || !targetPrint) return;

      const rect = viewport.getBoundingClientRect();
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      const deltaXPct = (deltaX / rect.width) * 100;
      const deltaYPct = (deltaY / rect.height) * 100;

      let newX = Math.min(84, Math.max(16, initialLeftPct + deltaXPct));
      let newY = Math.min(84, Math.max(16, initialTopPct + deltaYPct));

      const snapXEl = viewport.querySelector('#canvasSnapX');
      const snapYEl = viewport.querySelector('#canvasSnapY');

      if (Math.abs(newX - 50.0) < 2.5) {
        newX = 50.0;
        if (snapXEl) snapXEl.classList.add('active');
      } else {
        if (snapXEl) snapXEl.classList.remove('active');
      }

      const defaultY = targetPrint.view === 'back' ? 42.0 : 38.0;
      if (Math.abs(newY - defaultY) < 2.5) {
        newY = defaultY;
        if (snapYEl) snapYEl.classList.add('active');
      } else {
        if (snapYEl) snapYEl.classList.remove('active');
      }

      targetPrint.offset_x_pct = Math.round(newX * 10) / 10;
      targetPrint.offset_y_pct = Math.round(newY * 10) / 10;

      draggedEl.style.left = `${targetPrint.offset_x_pct}%`;
      draggedEl.style.top = `${targetPrint.offset_y_pct}%`;

      const posXSlider = this.container.querySelector('#posXSlider');
      const posYSlider = this.container.querySelector('#posYSlider');
      const posXValText = this.container.querySelector('#posXValText');
      const posYValText = this.container.querySelector('#posYValText');

      if (posXSlider) posXSlider.value = targetPrint.offset_x_pct;
      if (posYSlider) posYSlider.value = targetPrint.offset_y_pct;
      if (posXValText) posXValText.textContent = `${Math.round(targetPrint.offset_x_pct)}%`;
      if (posYValText) posYValText.textContent = `${Math.round(targetPrint.offset_y_pct)}%`;
    };

    const onPointerUp = () => {
      if (draggedEl) {
        draggedEl.classList.remove('is-dragging');
        draggedEl = null;
        targetPrint = null;
      }
      const snapXEl = viewport.querySelector('#canvasSnapX');
      const snapYEl = viewport.querySelector('#canvasSnapY');
      if (snapXEl) snapXEl.classList.remove('active');
      if (snapYEl) snapYEl.classList.remove('active');

      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    viewport.addEventListener('pointerdown', onPointerDown);
  }

  handleFileUpload(file) {
    if (!file.type.startsWith('image/')) {
      alert("Por favor sube un archivo de imagen válido (PNG, SVG, JPG).");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const activePrint = this.getActivePrint();
      if (activePrint) {
        activePrint.customArtworkDataUrl = event.target.result;
        this.render();
        this.attachEvents();
      }
    };
    reader.readAsDataURL(file);
  }

  handleDirectFileUpload(file) {
    if (!file.type.startsWith('image/')) {
      alert("Por favor sube un archivo de imagen válido (PNG, SVG, JPG).");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const isBack = this.state.currentView === "back";
      const existing = this.state.prints.find(p => p.view === this.state.currentView);
      if (existing) {
        // Actualiza el arte de la estampa existente en esta cara (evita capas duplicadas)
        existing.customArtworkDataUrl = event.target.result;
        existing.artwork = null;
        existing.name = `Estampa Propia (${isBack ? 'Espalda' : 'Frente'})`;
        this.state.activePrintId = existing.id;
      } else {
        const newPrint = {
          id: `print-${this.state.currentView}-${Date.now().toString(36)}`,
          name: `Estampa Propia (${isBack ? 'Espalda' : 'Frente'})`,
          view: this.state.currentView,
          print_size: isBack ? "A3" : "A4",
          artwork: null,
          customArtworkDataUrl: event.target.result,
          offset_x_pct: 50.0,
          offset_y_pct: isBack ? 42.0 : 38.0,
          scale_factor: 1.0,
          calculated_cost: isBack ? 8900 : 5900
        };
        this.state.prints.push(newPrint);
        this.state.activePrintId = newPrint.id;
      }
      this.render();
      this.attachEvents();
      this.updateQuote();
    };
    reader.readAsDataURL(file);
  }

  async updateQuote() {
    try {
      const printsPayload = this.state.prints.map(p => ({
        id: p.id,
        view: p.view,
        print_size: p.print_size,
        design_name: p.customArtworkDataUrl ? "Diseño Personalizado" : (p.artwork ? p.artwork.name : "Estampa"),
        offset_x_pct: p.offset_x_pct,
        offset_y_pct: p.offset_y_pct,
        scale_factor: p.scale_factor
      }));

      const quote = await apiService.getMultiDTFQuote(printsPayload, this.state.quantity);

      const dtfUnitTotal = quote.unit_dtf_total;
      const basePrice = this.state.selectedGarment.base_price;
      const unitTotal = basePrice + dtfUnitTotal;
      const total = unitTotal * this.state.quantity;

      this.state.pricing = {
        basePrice,
        dtfTotalUnit: dtfUnitTotal,
        unitTotal,
        discountPct: quote.discount_percentage,
        total
      };

      const quoteDtfPrice = this.container.querySelector('#quoteDtfPrice');
      const quoteTotalVal = this.container.querySelector('#quoteTotalVal');
      if (quoteDtfPrice) quoteDtfPrice.textContent = `+$${dtfUnitTotal.toLocaleString('es-CL')}`;
      if (quoteTotalVal) quoteTotalVal.textContent = `$${total.toLocaleString('es-CL')} CLP`;
    } catch (err) {
      console.warn("Fallback de cotización local:", err);
    }
  }

  triggerAddToCart() {
    const g = this.state.selectedGarment;
    const frontPrints = this.state.prints.filter(p => p.view === 'front');
    const backPrints = this.state.prints.filter(p => p.view === 'back');

    const frontSummary = frontPrints.length > 0 
      ? frontPrints.map(p => `${p.print_size} (${p.customArtworkDataUrl ? 'Propio' : (p.artwork ? p.artwork.name : 'DTF')})`).join(' + ')
      : 'Cara Lisa';

    const backSummary = backPrints.length > 0 
      ? backPrints.map(p => `${p.print_size} (${p.customArtworkDataUrl ? 'Propio' : (p.artwork ? p.artwork.name : 'DTF')})`).join(' + ')
      : 'Cara Lisa';

    const item = {
      garment_id: g.id,
      garment_name: g.name,
      selected_color: this.state.selectedColor,
      selected_size: this.state.selectedSize,
      preview_front_summary: frontSummary,
      preview_back_summary: backSummary,
      prints: this.state.prints.map(p => ({
        id: p.id,
        view: p.view,
        print_size: p.print_size,
        design_name: p.customArtworkDataUrl ? "Diseño Personalizado del Cliente" : (p.artwork ? p.artwork.name : "Estampa"),
        design_image_url: p.customArtworkDataUrl || null,
        offset_x_pct: p.offset_x_pct,
        offset_y_pct: p.offset_y_pct,
        scale_factor: p.scale_factor,
        calculated_dtf_cost: p.calculated_cost
      })),
      quantity: this.state.quantity,
      unit_price: this.state.pricing.unitTotal,
      subtotal: this.state.pricing.total
    };

    this.onAddToCart(item);
  }
}