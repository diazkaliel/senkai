/**
 * SENKAI // ESTUDIO DE PERSONALIZACIÓN TEXTIL DTF MULTI-ESTAMPA V4 PRO
 * Soporte reactivo de múltiples estampas por prenda con diseño frontal y trasero por defecto,
 * sincronización de caras, navegación HUD por pestañas y calibración milimétrica continua.
 */

import { SVG_GARMENTS, SVG_GARMENT_THUMBS, PRESET_ARTWORKS } from './svg_templates.js';
import { apiService } from '../services/api.js';

export class CustomizerStudio {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.onAddToCart = options.onAddToCart || (() => {});

    // Estado reactivo multi-estampa con diseños frontal y trasero inicializados por defecto
    this.state = {
      selectedGarment: null,
      selectedColor: null,
      selectedSize: "L",
      currentView: "front", // "front" o "back"
      activeStudioTab: "garment", // "garment" | "prints" | "pricing"
      quantity: 1,
      activePrintId: "print-front",
      prints: [
        {
          id: "print-front",
          name: "Estampa Frontal (Pecho)",
          view: "front",
          print_size: "A4",
          artwork: PRESET_ARTWORKS[0], // Senkai Original
          customArtworkDataUrl: null,
          offset_x_pct: 50.0,
          offset_y_pct: 38.0,
          scale_factor: 1.0,
          calculated_cost: 5900
        },
        {
          id: "print-back",
          name: "Estampa Trasera (Maxi Espalda)",
          view: "back",
          print_size: "A3",
          artwork: PRESET_ARTWORKS[2], // Cyber Kanji 2026
          customArtworkDataUrl: null,
          offset_x_pct: 50.0,
          offset_y_pct: 42.0,
          scale_factor: 1.0,
          calculated_cost: 8900
        }
      ],
      pricing: {
        basePrice: 12990,
        dtfTotalUnit: 14800,
        unitTotal: 27790,
        discountPct: 0,
        total: 27790
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
    if (found) {
      this.state.selectedGarment = found;
      if (options.colorHex) {
        const matchingColor = found.colors.find(c => c.hex_code.toLowerCase() === options.colorHex.toLowerCase());
        this.state.selectedColor = matchingColor || found.colors[0];
      } else if (!this.state.selectedColor || !found.colors.some(c => c.hex_code === this.state.selectedColor.hex_code)) {
        this.state.selectedColor = found.colors[0];
      }

      // Si se especificó una cara inicial
      if (options.view) {
        this.state.currentView = options.view;
      }

      this.state.pricing.basePrice = found.base_price;
      this.render();
      this.attachEvents();
      this.updateQuote();
    }
  }

  /**
   * Cambia la cara de visualización activa (frontal o trasera),
   * garantizando que el diseño por defecto de esa cara se visualice y esté activo.
   */
  setView(view) {
    this.state.currentView = view;
    const printsOnView = this.state.prints.filter(p => p.view === view);

    if (printsOnView.length > 0) {
      const activePrint = this.getActivePrint();
      if (!activePrint || activePrint.view !== view) {
        this.state.activePrintId = printsOnView[0].id;
      }
    } else {
      // Si la cara no tiene estampas, auto-generar la estampa por defecto
      const isBack = view === "back";
      const newPrint = {
        id: `print-${view}-${Date.now().toString(36)}`,
        name: isBack ? "Estampa Trasera (Maxi Espalda)" : "Estampa Frontal (Pecho)",
        view: view,
        print_size: isBack ? "A3" : "A4",
        artwork: isBack ? PRESET_ARTWORKS[2] : PRESET_ARTWORKS[0],
        customArtworkDataUrl: null,
        offset_x_pct: 50.0,
        offset_y_pct: isBack ? 42.0 : 38.0,
        scale_factor: 1.0,
        calculated_cost: isBack ? 8900 : 5900
      };
      this.state.prints.push(newPrint);
      this.state.activePrintId = newPrint.id;
      this.updateQuote();
    }

    this.render();
    this.attachEvents();
  }

  getActivePrint() {
    return this.state.prints.find(p => p.id === this.state.activePrintId) || this.state.prints[0];
  }

  getGarmentThumbType(category) {
    if (category === "poleron_hoodie") return "hoodie";
    if (category === "poleron_crewneck") return "crewneck";
    return "tshirt";
  }

  getPrintBaseDimensions(printSize) {
    const map = {
      A6: { width: 90, height: 90, cm: "10 x 10 cm" },
      A5: { width: 130, height: 160, cm: "15 x 20 cm" },
      A4: { width: 185, height: 230, cm: "20 x 30 cm" },
      A3: { width: 245, height: 320, cm: "30 x 40 cm" }
    };
    return map[printSize] || map.A4;
  }

  addPrint(view = this.state.currentView) {
    const nextNum = this.state.prints.length + 1;
    const defaultSize = view === "front" ? "A4" : "A3";
    const defaultY = view === "front" ? 38.0 : 42.0;

    const newPrint = {
      id: `print-${Date.now().toString(36)}`,
      name: `Estampa ${nextNum} (${view === 'front' ? 'Frontal' : 'Espalda'})`,
      view: view,
      print_size: defaultSize,
      artwork: PRESET_ARTWORKS[(nextNum - 1) % PRESET_ARTWORKS.length],
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
    if (this.state.prints.length <= 1) {
      alert("Debes conservar al menos un estampado en la prenda.");
      return;
    }
    this.state.prints = this.state.prints.filter(p => p.id !== printId);
    if (this.state.activePrintId === printId) {
      const fallback = this.state.prints[0];
      this.state.activePrintId = fallback.id;
      this.state.currentView = fallback.view;
    }
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
    if (!this.state.selectedGarment) return;

    const g = this.state.selectedGarment;
    const currentColor = this.state.selectedColor.hex_code;
    const activePrint = this.getActivePrint();

    const discountBadge = this.state.quantity >= 20
      ? '25% dto. por volumen'
      : this.state.quantity >= 10
        ? '15% dto. por volumen'
        : this.state.quantity >= 5
          ? '10% dto. por volumen'
          : '';

    // Estampas visibles en la cara activa del canvas
    const visiblePrints = this.state.prints.filter(p => p.view === this.state.currentView);
    const frontCount = this.state.prints.filter(p => p.view === 'front').length;
    const backCount = this.state.prints.filter(p => p.view === 'back').length;

    this.container.innerHTML = `
      <div class="customizer-layout">
        <!-- =================================================================
             1. ESCENARIO TEXTIL INTERACTIVO (STAGE DE AUTOR)
             ================================================================= -->
        <div class="visualizer-card">
          <!-- Barra superior flotante de cara y utilidades -->
          <div class="visualizer-toolbar">
            <div class="view-toggle-group">
              <button class="view-toggle-btn ${this.state.currentView === 'front' ? 'active' : ''}" data-view="front">
                <span>Frente</span>
                <span class="view-count-pill">${frontCount}</span>
              </button>
              <button class="view-toggle-btn ${this.state.currentView === 'back' ? 'active' : ''}" data-view="back">
                <span>Espalda</span>
                <span class="view-count-pill">${backCount}</span>
              </button>
            </div>
            
            <button class="canvas-action-btn" id="centerActivePrintBtn" title="Centrar estampa en la prenda">
              <span class="material-symbols-outlined" style="font-size: 16px;">filter_center_focus</span>
              <span>Centrar estampa</span>
            </button>
          </div>

          <!-- Escenario de la prenda con iluminación de estudio fotográfico -->
          <div class="canvas-viewport" id="canvasViewport" title="Haz clic y arrastra para posicionar tu estampa libremente">
            <div class="garment-svg-wrapper" id="garmentSvgWrapper">
              ${this.getGarmentSvgMarkup(g.category, this.state.currentView, currentColor)}
            </div>

            <!-- Guía de marco imprimible -->
            <div class="safe-print-boundary"></div>

            <!-- Renderizado de las estampas de la cara visible -->
            ${visiblePrints.map(p => {
              const dims = this.getPrintBaseDimensions(p.print_size);
              const isActive = p.id === activePrint.id;
              return `
                <div class="dtf-print-draggable ${isActive ? 'active-print' : ''}"
                     id="draggable-${p.id}"
                     data-print-id="${p.id}"
                     style="left: ${p.offset_x_pct}%; top: ${p.offset_y_pct}%; width: ${dims.width}px; height: ${dims.height}px; transform: translate(-50%, -50%) scale(${p.scale_factor});">
                  ${isActive ? `
                    <div class="print-gizmo-badge">
                      <span class="material-symbols-outlined" style="font-size: 13px;">drag_pan</span>
                      <span>${p.print_size}</span>
                      <span>•</span>
                      <span>${dims.cm}</span>
                    </div>
                    <span class="gizmo-handle handle-tl"></span>
                    <span class="gizmo-handle handle-tr"></span>
                    <span class="gizmo-handle handle-bl"></span>
                    <span class="gizmo-handle handle-br"></span>
                  ` : ''}
                  ${this.getPrintArtworkMarkup(p)}
                </div>
              `;
            }).join('')}

            <!-- Barra inferior informativa con resumen de la prenda activa -->
            <div class="canvas-badge-info">
              <div class="canvas-info-left">
                <span class="canvas-garment-title">${g.name}</span>
                <span class="canvas-info-sep">•</span>
                <span class="canvas-color-dot" style="background: ${currentColor};"></span>
                <span class="canvas-color-label">${this.state.selectedColor.name}</span>
                <span class="canvas-info-sep">•</span>
                <span class="canvas-size-label">Talla ${this.state.selectedSize}</span>
              </div>
              <div class="canvas-info-right">
                <span class="canvas-active-print-tag">${activePrint.name}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- =================================================================
             2. PANEL DE CONFIGURACIÓN DEL ESTUDIO (INSPECTOR DE TALLER)
             ================================================================= -->
        <div class="controls-card">
          <!-- Cabecera del panel de configuración -->
          <div class="studio-panel-header">
            <div>
              <h3 class="studio-panel-title">Configuración de Prenda</h3>
              <p class="studio-panel-desc">Diseña tu prenda textil DTF personalizada paso a paso</p>
            </div>
            <div class="active-face-pill ${this.state.currentView === 'front' ? 'face-front' : 'face-back'}">
              <span class="material-symbols-outlined" style="font-size: 14px;">visibility</span>
              <span>${this.state.currentView === 'front' ? 'Vista Frontal' : 'Vista Trasera'}</span>
            </div>
          </div>

          <!-- Barra de navegación por pasos de estudio -->
          <div class="studio-step-bar">
            <button class="studio-step-item ${this.state.activeStudioTab === 'garment' ? 'active' : ''}" data-tab="garment">
              <span class="step-num">1</span>
              <span class="step-label">Prenda & Talla</span>
            </button>
            <div class="step-line ${this.state.activeStudioTab !== 'garment' ? 'done' : ''}"></div>
            <button class="studio-step-item ${this.state.activeStudioTab === 'prints' ? 'active' : ''}" data-tab="prints">
              <span class="step-num">2</span>
              <span class="step-label">Estampas DTF</span>
            </button>
            <div class="step-line ${this.state.activeStudioTab === 'pricing' ? 'done' : ''}"></div>
            <button class="studio-step-item ${this.state.activeStudioTab === 'pricing' ? 'active' : ''}" data-tab="pricing">
              <span class="step-num">3</span>
              <span class="step-label">Pedido & Total</span>
            </button>
          </div>

          <!-- ===============================================================
               PASO 1: SELECCIÓN DE PRENDA, COLOR Y TALLA
               =============================================================== -->
          <div class="studio-tab-content ${this.state.activeStudioTab === 'garment' ? 'active' : ''}" id="tabContentGarment">
            
            <!-- Siluetas Textiles -->
            <div class="hud-box">
              <div class="control-label-row">
                <span class="control-title">1. Elige tu Prenda Base</span>
                <span class="control-badge-val">${g.weight_gsm}g/m² • ${g.composition}</span>
              </div>
              <div class="garment-cards-grid">
                ${this.garmentsList.map(item => {
                  const type = this.getGarmentThumbType(item.category);
                  const isSelected = item.id === g.id;
                  return `
                    <button class="garment-card-btn ${isSelected ? 'active' : ''}" data-garment-id="${item.id}">
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

            <!-- Colores Textiles -->
            <div class="hud-box" style="margin-top: 1rem;">
              <div class="control-label-row">
                <span class="control-title">2. Color de la Tela</span>
                <span class="control-badge-val" style="color: var(--accent-cyan); font-weight: 700;">
                  ${this.state.selectedColor.name}
                </span>
              </div>
              <div class="color-swatches-row">
                ${g.colors.map(color => `
                  <button class="color-swatch-btn ${color.hex_code === this.state.selectedColor.hex_code ? 'active' : ''}" 
                          style="background: ${color.hex_code};"
                          title="${color.name}"
                          data-color-name="${color.name}"
                          data-color-hex="${color.hex_code}">
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- Tallas Textiles -->
            <div class="hud-box" style="margin-top: 1rem;">
              <div class="control-label-row">
                <span class="control-title">3. Talla de Prenda</span>
                <span class="control-badge-val">Talla seleccionada: <strong>${this.state.selectedSize}</strong></span>
              </div>
              <div class="size-pills-row">
                ${g.sizes.map(sz => `
                  <button class="size-pill-btn ${sz === this.state.selectedSize ? 'active' : ''}" data-size="${sz}">
                    ${sz}
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- Botón de avance al Paso 2 -->
            <div class="step-nav-footer">
              <button class="btn btn-primary step-next-btn" id="toStepPrintsBtn">
                <span>Continuar a Estampas DTF</span>
                <span class="material-symbols-outlined" style="font-size: 18px;">arrow_forward</span>
              </button>
            </div>
          </div>

          <!-- ===============================================================
               PASO 2: GESTIÓN DE ESTAMPAS DTF, TAMAÑOS Y ARTE
               =============================================================== -->
          <div class="studio-tab-content ${this.state.activeStudioTab === 'prints' ? 'active' : ''}" id="tabContentPrints">
            
            <!-- Barra de Capas Multi-Estampa -->
            <div class="hud-box">
              <div class="control-label-row">
                <span class="control-title">Estampas en esta Prenda</span>
                <span class="control-badge-val">${this.state.prints.length} estampa(s) en diseño</span>
              </div>

              <div class="print-layers-bar">
                ${this.state.prints.map((p, idx) => `
                  <div class="print-layer-chip ${p.id === activePrint.id ? 'active' : ''}" data-layer-id="${p.id}">
                    <span class="badge ${p.view === 'front' ? 'badge-cyan' : 'badge-crimson'}" style="font-size: 0.65rem; padding: 2px 6px;">
                      ${p.view === 'front' ? 'FRENTE' : 'ESPALDA'}
                    </span>
                    <span>#${idx + 1} [${p.print_size}]</span>
                    ${this.state.prints.length > 1 ? `
                      <button class="print-layer-remove-btn" data-remove-id="${p.id}" title="Eliminar estampa">&times;</button>
                    ` : ''}
                  </div>
                `).join('')}

                <button class="add-print-layer-btn" id="addPrintBtn" title="Agregar otra estampa a la prenda">
                  <span class="material-symbols-outlined" style="font-size: 16px;">add</span>
                  <span>Agregar Estampa</span>
                </button>
              </div>
            </div>

            <!-- Cara Textil de la Estampa Activa -->
            <div class="hud-box" style="margin-top: 1rem;">
              <div class="control-label-row">
                <span class="control-title">Ubicación de la Estampa Activa</span>
                <span class="control-badge-val">${activePrint.view === 'front' ? 'Frente (Pecho)' : 'Espalda (Dorsal)'}</span>
              </div>
              <div class="face-toggle-row">
                <button class="btn ${activePrint.view === 'front' ? 'btn-primary' : 'btn-secondary'} face-select-btn" id="setPrintViewFront">
                  Cara Frontal
                </button>
                <button class="btn ${activePrint.view === 'back' ? 'btn-primary' : 'btn-secondary'} face-select-btn" id="setPrintViewBack">
                  Cara Trasera
                </button>
              </div>
            </div>

            <!-- Formatos y Dimensiones DTF -->
            <div class="hud-box" style="margin-top: 1rem;">
              <div class="control-label-row">
                <span class="control-title">Tamaño de Impresión DTF</span>
                <span class="control-badge-val" style="color: var(--accent-cyan); font-weight: 700;">
                  ${this.getPrintBaseDimensions(activePrint.print_size).cm}
                </span>
              </div>
              <div class="size-cards-grid">
                ${[
                  { key: 'A6', cm: '10 × 10 cm', label: 'Bolsillo / Logo', price: 2900 },
                  { key: 'A5', cm: '15 × 20 cm', label: 'Mediano / Manga', price: 3900 },
                  { key: 'A4', cm: '20 × 30 cm', label: 'Estándar / Pecho', price: 5900 },
                  { key: 'A3', cm: '30 × 40 cm', label: 'Maxi / Espalda', price: 8900 }
                ].map(s => `
                  <button class="size-card-btn ${activePrint.print_size === s.key ? 'active' : ''}" data-set-print-size="${s.key}">
                    <div class="size-card-header">
                      <span class="size-card-key">${s.key}</span>
                      <span class="size-card-cm">${s.cm}</span>
                    </div>
                    <div class="size-card-sub">${s.label}</div>
                    <div class="size-card-price">+$${s.price.toLocaleString('es-CL')}</div>
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- Calibración y Posicionamiento -->
            <div class="hud-box" style="margin-top: 1rem;">
              <div class="control-label-row">
                <span class="control-title">Ajuste de Posición y Escala</span>
                <span style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono);">Arrastra en la prenda o calibra</span>
              </div>

              <!-- Atajos de Posición Rápida -->
              <div class="preset-pos-row">
                <button class="btn btn-secondary preset-pos-shortcut" data-pos-x="50" data-pos-y="38">
                  Pecho Centro
                </button>
                <button class="btn btn-secondary preset-pos-shortcut" data-pos-x="36" data-pos-y="31">
                  Bolsillo Izq
                </button>
                <button class="btn btn-secondary preset-pos-shortcut" data-pos-x="50" data-pos-y="42">
                  Espalda Maxi
                </button>
              </div>

              <!-- Sliders ergonómicos de calibración -->
              <div class="cyber-sliders-container">
                <div class="cyber-slider-group">
                  <div class="slider-header-row">
                    <span>Posición Horizontal (X)</span>
                    <strong id="posXValText">${Math.round(activePrint.offset_x_pct)}%</strong>
                  </div>
                  <input type="range" class="cyber-slider" id="posXSlider" min="16" max="84" step="0.5" value="${activePrint.offset_x_pct}">
                </div>

                <div class="cyber-slider-group">
                  <div class="slider-header-row">
                    <span>Posición Vertical (Y)</span>
                    <strong id="posYValText">${Math.round(activePrint.offset_y_pct)}%</strong>
                  </div>
                  <input type="range" class="cyber-slider" id="posYSlider" min="16" max="84" step="0.5" value="${activePrint.offset_y_pct}">
                </div>

                <div class="cyber-slider-group">
                  <div class="slider-header-row">
                    <span>Escala del Diseño</span>
                    <strong id="scaleValText">${Math.round(activePrint.scale_factor * 100)}%</strong>
                  </div>
                  <input type="range" class="cyber-slider" id="scaleSlider" min="0.5" max="1.6" step="0.05" value="${activePrint.scale_factor}">
                </div>
              </div>
            </div>

            <!-- Galería de Gráficas y Subida de Archivo -->
            <div class="hud-box" style="margin-top: 1rem;">
              <div class="control-label-row">
                <span class="control-title">Diseño de la Estampa</span>
                <span class="control-badge-val">${activePrint.customArtworkDataUrl ? 'Archivo Propio' : activePrint.artwork.name}</span>
              </div>

              <div class="preset-art-row">
                ${PRESET_ARTWORKS.map(art => `
                  <div class="preset-art-thumb ${(!activePrint.customArtworkDataUrl && activePrint.artwork.id === art.id) ? 'active' : ''}" 
                       data-art-id="${art.id}"
                       title="${art.name}">
                    ${art.svgContent}
                  </div>
                `).join('')}
              </div>

              <!-- Subida de archivo PNG/SVG del cliente -->
              <div class="upload-dropzone" id="uploadDropzone" style="margin-top: 0.75rem;">
                <span class="material-symbols-outlined" style="font-size: 26px; color: var(--color-primary); margin-bottom: 0.25rem;">cloud_upload</span>
                <p style="font-weight: 600; font-size: 0.85rem; color: var(--text-primary);">Subir archivo personalizado</p>
                <p style="color: var(--text-muted); font-size: 0.75rem; margin-top: 2px;">PNG transparente a 300 DPI o SVG vectorial</p>
                <input type="file" id="fileInputDtf" accept="image/png, image/jpeg, image/svg+xml" style="display: none;">
              </div>
            </div>

            <!-- Navegación entre pasos -->
            <div class="step-nav-footer-dual">
              <button class="btn btn-secondary step-back-btn" id="backStepGarmentBtn">
                <span class="material-symbols-outlined" style="font-size: 18px;">arrow_back</span>
                <span>Prenda & Color</span>
              </button>
              <button class="btn btn-primary step-next-btn" id="toStepPricingBtn">
                <span>Continuar al Pedido</span>
                <span class="material-symbols-outlined" style="font-size: 18px;">arrow_forward</span>
              </button>
            </div>
          </div>

          <!-- ===============================================================
               PASO 3: LOTE, PEDIDO Y ESPECIFICACIONES
               =============================================================== -->
          <div class="studio-tab-content ${this.state.activeStudioTab === 'pricing' ? 'active' : ''}" id="tabContentPricing">
            
            <!-- Botón Volver a Estampas -->
            <button class="btn btn-secondary step-back-btn" id="backStepPrintsBtn" style="margin-bottom: 1rem; width: 100%; justify-content: flex-start;">
              <span class="material-symbols-outlined" style="font-size: 18px;">arrow_back</span>
              <span>Volver a Estampas DTF</span>
            </button>

            <!-- Stepper de Cantidad y Descuentos -->
            <div class="hud-box">
              <div class="control-label-row">
                <span class="control-title">Cantidad de Prendas</span>
                <span class="control-badge-val" style="color: ${discountBadge ? 'var(--accent-lime)' : 'var(--text-secondary)'}; font-weight: 700;">
                  ${discountBadge || 'Precio unitario estándar'}
                </span>
              </div>
              <div class="qty-selector-row">
                <div class="qty-stepper">
                  <button class="qty-stepper-btn" id="qtyMinus" aria-label="Disminuir cantidad">−</button>
                  <input type="number" class="qty-stepper-val" id="qtyInput" min="1" max="500" value="${this.state.quantity}" aria-label="Cantidad de prendas">
                  <button class="qty-stepper-btn" id="qtyPlus" aria-label="Aumentar cantidad">+</button>
                </div>
                <div class="qty-discount-pills">
                  <span class="qty-tier-pill ${this.state.quantity >= 5 && this.state.quantity < 10 ? 'active' : ''}">5+ un: 10% dto</span>
                  <span class="qty-tier-pill ${this.state.quantity >= 10 && this.state.quantity < 20 ? 'active' : ''}">10+ un: 15% dto</span>
                  <span class="qty-tier-pill ${this.state.quantity >= 20 ? 'active' : ''}">20+ un: 25% dto</span>
                </div>
              </div>
            </div>

            <!-- Ficha Técnica de Termofijado -->
            <div class="hud-box" style="margin-top: 1rem;">
              <div class="control-label-row">
                <span class="control-title">Especificaciones de Termofijado</span>
                <span class="control-badge-val">Calidad Taller</span>
              </div>
              <div class="production-specs-mini-grid">
                <div>
                  <small>TEMPERATURA</small>
                  <strong>160 °C</strong>
                </div>
                <div>
                  <small>TIEMPO PRENSA</small>
                  <strong>15 Seg</strong>
                </div>
                <div>
                  <small>DESPEGUE</small>
                  <strong>En Frío</strong>
                </div>
                <div>
                  <small>PRESIÓN</small>
                  <strong>4.5 Bares</strong>
                </div>
              </div>
            </div>

          </div>

          <!-- =================================================================
               PIE FIJO CON COTIZACIÓN EN VIVO Y CTA DE COMPRA
               ================================================================= -->
          <div class="live-quote-box">
            <div class="quote-row">
              <span>Prenda Base (${g.name})</span>
              <span id="quoteBasePrice">$${g.base_price.toLocaleString('es-CL')}</span>
            </div>
            <div class="quote-row">
              <span>Transfers DTF (${this.state.prints.length} estampa${this.state.prints.length > 1 ? 's' : ''})</span>
              <span id="quoteDtfPrice">+$${this.state.pricing.dtfTotalUnit.toLocaleString('es-CL')}</span>
            </div>
            ${this.state.pricing.discountPct > 0 ? `
              <div class="quote-row quote-discount-row">
                <span>Descuento por Volumen (${this.state.pricing.discountPct}%)</span>
                <span>-$${Math.round(this.state.pricing.dtfTotalUnit * this.state.pricing.discountPct / 100).toLocaleString('es-CL')}</span>
              </div>
            ` : ''}
            <div class="quote-total">
              <div>
                <div class="quote-total-label">Total Pedido (${this.state.quantity} un.)</div>
                <div class="quote-total-price" id="quoteTotalVal">$${this.state.pricing.total.toLocaleString('es-CL')} CLP</div>
              </div>
              <button class="btn btn-accent btn-add-cart" id="addToCartCustomizerBtn">
                <span class="material-symbols-outlined" style="font-size: 20px;">add_shopping_cart</span>
                <span>AGREGAR AL CARRITO</span>
              </button>
            </div>
          </div>

        </div>
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
    // 1. Selector de vista de prenda (Frontal / Trasera)
    this.container.querySelectorAll('.view-toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.setView(e.currentTarget.dataset.view);
      });
    });

    // 2. Navegación por pasos de estudio
    this.container.querySelectorAll('.studio-step-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.state.activeStudioTab = e.currentTarget.dataset.tab;
        this.render();
        this.attachEvents();
      });
    });

    // 2.1 Botones de navegación lineal
    const toStepPrintsBtn = this.container.querySelector('#toStepPrintsBtn');
    if (toStepPrintsBtn) {
      toStepPrintsBtn.addEventListener('click', () => {
        this.state.activeStudioTab = 'prints';
        this.render();
        this.attachEvents();
      });
    }

    const toStepPricingBtn = this.container.querySelector('#toStepPricingBtn');
    if (toStepPricingBtn) {
      toStepPricingBtn.addEventListener('click', () => {
        this.state.activeStudioTab = 'pricing';
        this.render();
        this.attachEvents();
      });
    }

    const backStepGarmentBtn = this.container.querySelector('#backStepGarmentBtn');
    if (backStepGarmentBtn) {
      backStepGarmentBtn.addEventListener('click', () => {
        this.state.activeStudioTab = 'garment';
        this.render();
        this.attachEvents();
      });
    }

    const backStepPrintsBtn = this.container.querySelector('#backStepPrintsBtn');
    if (backStepPrintsBtn) {
      backStepPrintsBtn.addEventListener('click', () => {
        this.state.activeStudioTab = 'prints';
        this.render();
        this.attachEvents();
      });
    }

    // 3. Selección de prenda base
    this.container.querySelectorAll('.garment-card-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.setGarmentById(e.currentTarget.dataset.garmentId);
      });
    });

    // 4. Selección de color
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

    // 6. Gestor de capas multi-estampa: seleccionar estampa activa
    this.container.querySelectorAll('.print-layer-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        if (e.target.classList.contains('print-layer-remove-btn')) return;
        this.setActivePrint(chip.dataset.layerId);
      });
    });

    // 7. Eliminar estampa
    this.container.querySelectorAll('.print-layer-remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removePrint(btn.dataset.removeId);
      });
    });

    // 8. Botón "+ Agregar Estampa"
    const addPrintBtn = this.container.querySelector('#addPrintBtn');
    if (addPrintBtn) {
      addPrintBtn.addEventListener('click', () => {
        this.addPrint(this.state.currentView);
      });
    }

    // 9. Cambiar cara de la estampa activa (Frontal / Trasera)
    const setFrontBtn = this.container.querySelector('#setPrintViewFront');
    const setBackBtn = this.container.querySelector('#setPrintViewBack');

    if (setFrontBtn) {
      setFrontBtn.addEventListener('click', () => {
        const active = this.getActivePrint();
        if (active && active.view !== 'front') {
          active.view = 'front';
          this.setView('front');
        }
      });
    }

    if (setBackBtn) {
      setBackBtn.addEventListener('click', () => {
        const active = this.getActivePrint();
        if (active && active.view !== 'back') {
          active.view = 'back';
          this.setView('back');
        }
      });
    }

    // 9.5. Centrar estampa activa
    const centerBtn = this.container.querySelector('#centerActivePrintBtn');
    if (centerBtn) {
      centerBtn.addEventListener('click', () => {
        const active = this.getActivePrint();
        if (active) {
          active.offset_x_pct = 50.0;
          active.offset_y_pct = active.view === 'back' ? 42.0 : 38.0;
          this.render();
          this.attachEvents();
        }
      });
    }

    // 10. Cambiar tamaño / formato DTF
    this.container.querySelectorAll('.size-card-btn[data-set-print-size]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const newSize = e.currentTarget.dataset.setPrintSize;
        const active = this.getActivePrint();
        if (active) {
          active.print_size = newSize;
          this.render();
          this.attachEvents();
          this.updateQuote();
        }
      });
    });

    // 11. Sliders de posicionamiento milimétrico
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
          const badge = draggableEl.querySelector('.print-gizmo-badge');
          if (badge) {
            const dims = this.getPrintBaseDimensions(active.print_size);
            badge.innerHTML = `
              <span class="material-symbols-outlined" style="font-size: 13px;">drag_pan</span>
              <span>${active.print_size}</span>
              <span>•</span>
              <span>${dims.cm}</span>
            `;
          }
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

    // 12. Atajos rápidos de posición
    this.container.querySelectorAll('.preset-pos-shortcut').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const x = parseFloat(e.currentTarget.dataset.posX);
        const y = parseFloat(e.currentTarget.dataset.posY);
        const active = this.getActivePrint();
        if (active) {
          active.offset_x_pct = x;
          active.offset_y_pct = y;
          this.render();
          this.attachEvents();
        }
      });
    });

    // 13. Selección de arte predeterminado
    this.container.querySelectorAll('.preset-art-thumb[data-art-id]').forEach(thumb => {
      thumb.addEventListener('click', (e) => {
        const artId = e.currentTarget.dataset.artId;
        const art = PRESET_ARTWORKS.find(a => a.id === artId);
        const active = this.getActivePrint();
        if (art && active) {
          active.artwork = art;
          active.customArtworkDataUrl = null;
          this.render();
          this.attachEvents();
        }
      });
    });

    // 14. Subida de archivo personalizado para la estampa activa
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

    // 15. Stepper de Cantidad
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

    // 16. Agregar al carrito
    const addBtn = this.container.querySelector('#addToCartCustomizerBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.triggerAddToCart());
    }

    // 17. Inicializar controlador de arrastre libre sobre el canvas
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

      // Seleccionar estampa al hacer clic
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

      // Límites de seguridad de prensa térmica (16% a 84%)
      const newX = Math.min(84, Math.max(16, initialLeftPct + deltaXPct));
      const newY = Math.min(84, Math.max(16, initialTopPct + deltaYPct));

      targetPrint.offset_x_pct = Math.round(newX * 10) / 10;
      targetPrint.offset_y_pct = Math.round(newY * 10) / 10;

      draggedEl.style.left = `${targetPrint.offset_x_pct}%`;
      draggedEl.style.top = `${targetPrint.offset_y_pct}%`;

      // Sincronizar sliders si la estampa es la activa
      const posXSlider = this.container.querySelector('#posXSlider');
      const posYSlider = this.container.querySelector('#posYSlider');
      const posXValText = this.container.querySelector('#posXValText');
      const posYValText = this.container.querySelector('#posYValText');

      if (posXSlider) posXSlider.value = targetPrint.offset_x_pct;
      if (posYSlider) posYSlider.value = targetPrint.offset_y_pct;
      if (posXValText) posXValText.textContent = `${Math.round(targetPrint.offset_x_pct)}%`;
      if (posYValText) posYValText.textContent = `${Math.round(targetPrint.offset_y_pct)}%`;

      const badge = draggedEl.querySelector('.print-gizmo-badge');
      if (badge) {
        badge.innerHTML = `
          <span class="material-symbols-outlined" style="font-size: 12px;">pan_tool</span>
          <span>${targetPrint.print_size}</span>
          <span>•</span>
          <span>X:${Math.round(targetPrint.offset_x_pct)}% Y:${Math.round(targetPrint.offset_y_pct)}%</span>
        `;
      }
    };

    const onPointerUp = () => {
      if (draggedEl) {
        draggedEl.classList.remove('is-dragging');
        draggedEl = null;
        targetPrint = null;
      }
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
    const item = {
      garment_id: g.id,
      garment_name: g.name,
      selected_color: this.state.selectedColor,
      selected_size: this.state.selectedSize,
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
