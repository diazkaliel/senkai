/**
 * SEIKO // ESTUDIO DE PERSONALIZACIÓN DTF INTERACTIVO V2
 * Visualizador con miniaturas de prenda, stepper de cantidad,
 * slider personalizado, transiciones suaves entre vistas y cotizador en vivo.
 */

import { SVG_GARMENTS, SVG_GARMENT_THUMBS, PRESET_ARTWORKS } from './svg_templates.js';
import { apiService } from '../services/api.js';

export class CustomizerStudio {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.onAddToCart = options.onAddToCart || (() => {});
    
    this.state = {
      selectedGarment: null,
      selectedColor: null,
      selectedSize: "L",
      currentView: "front",
      selectedPosition: "pecho_centro",
      selectedPrintSize: "A4",
      selectedArtwork: PRESET_ARTWORKS[0],
      customArtworkDataUrl: null,
      scaleFactor: 1.0,
      quantity: 1,
      pricing: {
        basePrice: 12990,
        dtfPrice: 5900,
        unitTotal: 18890,
        discountPct: 0,
        total: 18890
      }
    };

    this.garmentsList = [];
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

  setGarmentById(garmentId) {
    const found = this.garmentsList.find(g => g.id === garmentId);
    if (found) {
      this.state.selectedGarment = found;
      this.state.selectedColor = found.colors[0];
      this.state.pricing.basePrice = found.base_price;
      this.state.currentView = "front";
      this.render();
      this.attachEvents();
      this.updateQuote();
    }
  }

  getGarmentThumbType(category) {
    if (category === "poleron_hoodie") return "hoodie";
    if (category === "poleron_crewneck") return "crewneck";
    return "tshirt";
  }

  render() {
    if (!this.state.selectedGarment) return;

    const g = this.state.selectedGarment;
    const currentColor = this.state.selectedColor.hex_code;
    const thumbType = this.getGarmentThumbType(g.category);

    const discountBadge = this.state.quantity >= 20
      ? '🔥 25% descuento por volumen'
      : this.state.quantity >= 10
        ? '✨ 15% descuento por volumen'
        : this.state.quantity >= 5
          ? '💎 10% descuento por volumen'
          : '';

    this.container.innerHTML = `
      <div class="customizer-layout">
        <!-- ===== VISUALIZADOR INTERACTIVO ===== -->
        <div class="visualizer-card glass-card">
        <!-- SVG FILTER FOR PHOTOREALISTIC TEXTURE -->
        <svg width="0" height="0" style="position:absolute;">
          <defs>
            <filter id="fabric-overlay" x="0" y="0" width="100%" height="100%">
              <feImage href="/static/assets/fabric_texture.jpg" preserveAspectRatio="xMidYMid slice" result="texture"/>
              <feComposite in="texture" in2="SourceGraphic" operator="in" result="maskedTexture"/>
              <feBlend mode="multiply" in="maskedTexture" in2="SourceGraphic" result="blend"/>
            </filter>
          </defs>
        </svg>

        <div class="visualizer-toolbar">
            <div class="view-toggle-group">
              <button class="view-toggle-btn ${this.state.currentView === 'front' ? 'active' : ''}" data-view="front">
                <span class="material-symbols-outlined" style="font-size: 16px; vertical-align: middle; margin-right: 4px;">visibility</span>
                FRONTAL
              </button>
              <button class="view-toggle-btn ${this.state.currentView === 'back' ? 'active' : ''}" data-view="back">
                <span class="material-symbols-outlined" style="font-size: 16px; vertical-align: middle; margin-right: 4px;">flip_to_back</span>
                TRASERA
              </button>
            </div>
            <span class="badge badge-cyan">
              <span class="pulse-indicator"></span> DTF 300 DPI
            </span>
          </div>

          <div class="canvas-viewport" id="canvasViewport">
            <div class="garment-svg-wrapper" id="garmentSvgWrapper">
              ${this.getGarmentSvgMarkup(g.category, this.state.currentView, currentColor)}
            </div>

            <div class="dtf-print-overlay" id="dtfPrintOverlay" style="${this.getDtfOverlayStyles()}">
              ${this.getArtworkMarkup()}
            </div>

            <div class="canvas-badge-info">
              <span>${g.name} • <strong style="color: var(--accent-cyan);">${this.state.selectedColor.name}</strong></span>
              <span style="color: var(--text-muted);">TALLA: <strong style="color: #fff;">${this.state.selectedSize}</strong></span>
            </div>
          </div>
        </div>

        <!-- ===== PANEL DE CONFIGURACIÓN ===== -->
        <div class="controls-card glass-card">

          <!-- PASO 1: Selección de Prenda Base con Miniatura SVG -->
          <div class="control-group">
            <div class="control-label-row">
              <span class="control-title"><span class="control-step-num">1</span> Prenda Base</span>
              <span class="control-badge-val">${g.weight_gsm}g • ${g.composition}</span>
            </div>
            <div class="garment-grid-options">
              ${this.garmentsList.map(item => {
                const type = this.getGarmentThumbType(item.category);
                return `
                <button class="garment-opt-btn ${item.id === g.id ? 'active' : ''}" data-garment-id="${item.id}">
                  <div class="garment-opt-thumb">
                    ${SVG_GARMENT_THUMBS[type](item.colors[0].hex_code)}
                  </div>
                  <div class="garment-opt-info">
                    <div class="garment-opt-name">${item.name}</div>
                    <div class="garment-opt-meta">$${item.base_price.toLocaleString('es-CL')} CLP • ${item.weight_gsm}g/m²</div>
                  </div>
                </button>
              `}).join('')}
            </div>
          </div>

          <!-- PASO 2: Color Textil -->
          <div class="control-group">
            <div class="control-label-row">
              <span class="control-title"><span class="control-step-num">2</span> Color Textil</span>
              <span class="control-badge-val">${this.state.selectedColor.name}</span>
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

          <!-- PASO 3: Talla -->
          <div class="control-group">
            <div class="control-label-row">
              <span class="control-title"><span class="control-step-num">3</span> Talla</span>
              <span class="control-badge-val">CORTE ${g.category.includes('polera') ? 'OVERSIZED / STREETWEAR' : 'RELAJADO / UNISEX'}</span>
            </div>
            <div class="size-pills-row">
              ${g.sizes.map(sz => `
                <button class="size-pill-btn ${sz === this.state.selectedSize ? 'active' : ''}" data-size="${sz}">
                  ${sz}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- PASO 4: Ubicación de Estampa DTF -->
          <div class="control-group">
            <div class="control-label-row">
              <span class="control-title"><span class="control-step-num">4</span> Ubicación de Estampa</span>
              <span class="control-badge-val">${this.getPositionDisplayName()}</span>
            </div>
            <div class="position-grid">
              <button class="position-btn ${this.state.selectedPosition === 'pecho_centro' ? 'active' : ''}" data-pos="pecho_centro" data-size="A4">
                <div class="position-btn-title">Pecho Frontal (A4)</div>
                <div class="position-btn-sub">20×30 cm • Centro</div>
              </button>
              <button class="position-btn ${this.state.selectedPosition === 'pecho_izquierdo' ? 'active' : ''}" data-pos="pecho_izquierdo" data-size="A6">
                <div class="position-btn-title">Pecho Izquierdo (A6)</div>
                <div class="position-btn-sub">10×10 cm • Bolsillo</div>
              </button>
              <button class="position-btn ${this.state.selectedPosition === 'espalda_completa' ? 'active' : ''}" data-pos="espalda_completa" data-size="A3">
                <div class="position-btn-title">Espalda Maxi (A3)</div>
                <div class="position-btn-sub">30×40 cm • Full Back</div>
              </button>
              <button class="position-btn ${this.state.selectedPosition === 'pecho_y_espalda' ? 'active' : ''}" data-pos="pecho_y_espalda" data-size="A4">
                <div class="position-btn-title">Doble Estampa</div>
                <div class="position-btn-sub">Pecho A6 + Espalda A4</div>
              </button>
            </div>
          </div>

          <!-- PASO 5: Arte / Diseño a Estampar -->
          <div class="control-group">
            <div class="control-label-row">
              <span class="control-title"><span class="control-step-num">5</span> Arte / Diseño</span>
              <span class="control-badge-val">${this.state.customArtworkDataUrl ? 'TU ARCHIVO' : this.state.selectedArtwork.name.toUpperCase()}</span>
            </div>
            
            <div class="preset-art-row">
              ${PRESET_ARTWORKS.map(art => `
                <div class="preset-art-thumb ${(!this.state.customArtworkDataUrl && this.state.selectedArtwork.id === art.id) ? 'active' : ''}" 
                     data-art-id="${art.id}"
                     title="${art.name}">
                  ${art.svgContent}
                </div>
              `).join('')}
            </div>

            <div class="upload-dropzone" id="uploadDropzone">
              <span class="material-symbols-outlined" style="font-size: 28px; color: var(--accent-cyan); margin-bottom: 0.35rem;">cloud_upload</span>
              <p style="font-weight: 700; font-size: 0.9rem;">Sube tu propio diseño</p>
              <p style="color: var(--text-muted); font-size: 0.725rem; margin-top: 2px;">PNG transparente, SVG o JPG • 300 DPI recomendado</p>
              <input type="file" id="fileInputDtf" accept="image/png, image/jpeg, image/svg+xml" style="display: none;">
            </div>
          </div>

          <!-- PASO 6: Escala y Cantidad -->
          <div class="control-group">
            <div class="control-label-row">
              <span class="control-title"><span class="control-step-num">6</span> Escala de Estampa</span>
              <span class="control-badge-val" id="scaleValText">${Math.round(this.state.scaleFactor * 100)}%</span>
            </div>
            <div class="scale-slider-wrap">
              <input type="range" id="scaleSlider" min="0.5" max="1.5" step="0.05" value="${this.state.scaleFactor}">
            </div>

            <div class="control-label-row" style="margin-top: 1.5rem;">
              <span class="control-title">Cantidad</span>
              <span class="control-badge-val" style="color: ${discountBadge ? 'var(--accent-lime)' : 'var(--accent-cyan)'};">${discountBadge || 'Precio unitario estándar'}</span>
            </div>
            <div style="display: flex; gap: 1rem; align-items: center;">
              <div class="qty-stepper">
                <button class="qty-stepper-btn" id="qtyMinus">−</button>
                <input type="number" class="qty-stepper-val" id="qtyInput" min="1" max="500" value="${this.state.quantity}">
                <button class="qty-stepper-btn" id="qtyPlus">+</button>
              </div>
              <span style="font-size: 0.8rem; color: var(--text-muted); font-family: var(--font-mono);">
                unidades
              </span>
            </div>
          </div>

          <!-- COTIZACIÓN EN VIVO -->
          <div class="live-quote-box">
            <div class="quote-row">
              <span>Prenda Base</span>
              <span id="quoteBasePrice">$${g.base_price.toLocaleString('es-CL')}</span>
            </div>
            <div class="quote-row">
              <span>Estampa DTF (${this.state.selectedPrintSize})</span>
              <span id="quoteDtfPrice">+$${this.state.pricing.dtfPrice.toLocaleString('es-CL')}</span>
            </div>
            ${this.state.pricing.discountPct > 0 ? `
              <div class="quote-row quote-discount-row">
                <span>Descuento Volumen (${this.state.pricing.discountPct}%)</span>
                <span>-$${Math.round(this.state.pricing.dtfPrice * this.state.pricing.discountPct / 100).toLocaleString('es-CL')}</span>
              </div>
            ` : ''}
            <div class="quote-total">
              <div>
                <div class="quote-total-label">Total Cotizado (${this.state.quantity} un.)</div>
                <div class="quote-total-price" id="quoteTotalVal">$${this.state.pricing.total.toLocaleString('es-CL')} CLP</div>
              </div>
              <button class="btn btn-accent" id="addToCartCustomizerBtn">
                <span class="material-symbols-outlined" style="font-size: 18px;">add_shopping_cart</span>
                AGREGAR
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  getPositionDisplayName() {
    const map = {
      pecho_centro: "PECHO FRONTAL A4",
      pecho_izquierdo: "PECHO IZQ A6",
      espalda_completa: "ESPALDA MAXI A3",
      pecho_y_espalda: "DOBLE ESTAMPA"
    };
    return map[this.state.selectedPosition] || this.state.selectedPosition.toUpperCase();
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

  getArtworkMarkup() {
    if (this.state.customArtworkDataUrl) {
      return `<img src="${this.state.customArtworkDataUrl}" alt="Estampa personalizada">`;
    }
    return this.state.selectedArtwork.svgContent;
  }

  getDtfOverlayStyles() {
    const pos = this.state.selectedPosition;
    const view = this.state.currentView;
    const scale = this.state.scaleFactor;
    const category = this.state.selectedGarment?.category || "";

    // Ocultar si la vista no corresponde a la ubicación
    if (pos === "espalda_completa" && view === "front") return "display: none;";
    if ((pos === "pecho_centro" || pos === "pecho_izquierdo") && view === "back") return "display: none;";

    let top, left, width, height;

    if (category === "poleron_hoodie") {
      if (pos === "pecho_izquierdo") {
        top = "30%";
        left = "36%";
        width = "72px";
        height = "72px";
      } else if (pos === "pecho_centro") {
        top = "37%";
        left = "50%";
        width = "170px";
        height = "170px";
      } else if (pos === "espalda_completa") {
        top = "44%";
        left = "50%";
        width = "220px";
        height = "220px";
      } else if (pos === "pecho_y_espalda") {
        if (view === "front") {
          top = "30%";
          left = "36%";
          width = "72px";
          height = "72px";
        } else {
          top = "44%";
          left = "50%";
          width = "195px";
          height = "195px";
        }
      }
    } else if (category === "poleron_crewneck") {
      if (pos === "pecho_izquierdo") {
        top = "31%";
        left = "36.5%";
        width = "72px";
        height = "72px";
      } else if (pos === "pecho_centro") {
        top = "38.5%";
        left = "50%";
        width = "175px";
        height = "175px";
      } else if (pos === "espalda_completa") {
        top = "43%";
        left = "50%";
        width = "220px";
        height = "220px";
      } else if (pos === "pecho_y_espalda") {
        if (view === "front") {
          top = "31%";
          left = "36.5%";
          width = "72px";
          height = "72px";
        } else {
          top = "43%";
          left = "50%";
          width = "195px";
          height = "195px";
        }
      }
    } else {
      // Polera T-Shirt
      if (pos === "pecho_izquierdo") {
        top = "31.5%";
        left = "37%";
        width = "74px";
        height = "74px";
      } else if (pos === "pecho_centro") {
        top = "39.5%";
        left = "50%";
        width = "180px";
        height = "180px";
      } else if (pos === "espalda_completa") {
        top = "41.5%";
        left = "50%";
        width = "225px";
        height = "225px";
      } else if (pos === "pecho_y_espalda") {
        if (view === "front") {
          top = "31.5%";
          left = "37%";
          width = "74px";
          height = "74px";
        } else {
          top = "41.5%";
          left = "50%";
          width = "200px";
          height = "200px";
        }
      }
    }

    return `
      top: ${top};
      left: ${left};
      transform: translate(-50%, -50%) scale(${scale});
      --stamp-scale: ${scale};
      width: ${width};
      height: ${height};
    `;
  }

  attachEvents() {
    // Vista frontal / trasera
    this.container.querySelectorAll('.view-toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.state.currentView = e.currentTarget.dataset.view;
        this.render();
        this.attachEvents();
      });
    });

    // Selección de prenda
    this.container.querySelectorAll('.garment-opt-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.setGarmentById(e.currentTarget.dataset.garmentId);
      });
    });

    // Selección de color
    this.container.querySelectorAll('.color-swatch-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const hex = e.currentTarget.dataset.colorHex;
        const name = e.currentTarget.dataset.colorName;
        this.state.selectedColor = { name, hex_code: hex, in_stock: true };
        this.render();
        this.attachEvents();
      });
    });

    // Selección de talla
    this.container.querySelectorAll('.size-pill-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.state.selectedSize = e.currentTarget.dataset.size;
        this.render();
        this.attachEvents();
      });
    });

    // Ubicación de estampa
    this.container.querySelectorAll('.position-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const pos = e.currentTarget.dataset.pos;
        const size = e.currentTarget.dataset.size;
        this.state.selectedPosition = pos;
        this.state.selectedPrintSize = size;
        
        if (pos === "espalda_completa") {
          this.state.currentView = "back";
        } else if (pos === "pecho_centro" || pos === "pecho_izquierdo") {
          this.state.currentView = "front";
        }

        this.render();
        this.attachEvents();
        this.updateQuote();
      });
    });

    // Presets de arte
    this.container.querySelectorAll('.preset-art-thumb').forEach(thumb => {
      thumb.addEventListener('click', (e) => {
        const artId = e.currentTarget.dataset.artId;
        const found = PRESET_ARTWORKS.find(a => a.id === artId);
        if (found) {
          this.state.selectedArtwork = found;
          this.state.customArtworkDataUrl = null;
          this.render();
          this.attachEvents();
        }
      });
    });

    // Dropzone de archivo
    const dropzone = this.container.querySelector('#uploadDropzone');
    const fileInput = this.container.querySelector('#fileInputDtf');

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());
      
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragging');
      });

      dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragging');
      });

      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragging');
        if (e.dataTransfer.files.length > 0) {
          this.handleFileUpload(e.dataTransfer.files[0]);
        }
      });

      fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          this.handleFileUpload(e.target.files[0]);
        }
      });
    }

    // Slider de escala
    const scaleSlider = this.container.querySelector('#scaleSlider');
    if (scaleSlider) {
      scaleSlider.addEventListener('input', (e) => {
        this.state.scaleFactor = parseFloat(e.target.value);
        const overlay = this.container.querySelector('#dtfPrintOverlay');
        const scaleValText = this.container.querySelector('#scaleValText');
        if (overlay) overlay.style.cssText = this.getDtfOverlayStyles();
        if (scaleValText) scaleValText.textContent = `${Math.round(this.state.scaleFactor * 100)}%`;
      });
    }

    // Stepper de cantidad (+/-)
    const qtyMinus = this.container.querySelector('#qtyMinus');
    const qtyPlus = this.container.querySelector('#qtyPlus');
    const qtyInput = this.container.querySelector('#qtyInput');

    if (qtyMinus && qtyPlus && qtyInput) {
      qtyMinus.addEventListener('click', () => {
        const val = Math.max(1, this.state.quantity - 1);
        this.state.quantity = val;
        qtyInput.value = val;
        this.updateQuote();
        this.refreshDiscountBadge();
      });

      qtyPlus.addEventListener('click', () => {
        const val = Math.min(500, this.state.quantity + 1);
        this.state.quantity = val;
        qtyInput.value = val;
        this.updateQuote();
        this.refreshDiscountBadge();
      });

      qtyInput.addEventListener('change', (e) => {
        const val = Math.max(1, Math.min(500, parseInt(e.target.value, 10) || 1));
        this.state.quantity = val;
        qtyInput.value = val;
        this.updateQuote();
        this.refreshDiscountBadge();
      });
    }

    // Agregar al carrito
    const addBtn = this.container.querySelector('#addToCartCustomizerBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.triggerAddToCart());
    }
  }

  refreshDiscountBadge() {
    // No se hace re-render completo, solo un re-render parcial se podría hacer
    // pero la cotización en vivo se actualiza via updateQuote
  }

  handleFileUpload(file) {
    if (!file.type.startsWith('image/')) {
      alert("Por favor sube un archivo de imagen válido (PNG, SVG, JPG).");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      this.state.customArtworkDataUrl = event.target.result;
      this.render();
      this.attachEvents();
    };
    reader.readAsDataURL(file);
  }

  async updateQuote() {
    try {
      const quote = await apiService.getDTFQuote(
        this.state.selectedPosition, 
        this.state.selectedPrintSize, 
        this.state.quantity
      );
      
      const unitDtf = quote.unit_dtf_price;
      const basePrice = this.state.selectedGarment.base_price;
      const unitTotal = basePrice + unitDtf;
      const total = unitTotal * this.state.quantity;

      this.state.pricing = {
        basePrice,
        dtfPrice: unitDtf,
        unitTotal,
        discountPct: quote.discount_percentage,
        total
      };

      const quoteDtfPrice = this.container.querySelector('#quoteDtfPrice');
      const quoteTotalVal = this.container.querySelector('#quoteTotalVal');
      if (quoteDtfPrice) quoteDtfPrice.textContent = `+$${unitDtf.toLocaleString('es-CL')}`;
      if (quoteTotalVal) quoteTotalVal.textContent = `$${total.toLocaleString('es-CL')} CLP`;
    } catch (err) {
      console.warn("Fallback: cotización local", err);
    }
  }

  triggerAddToCart() {
    const item = {
      garment_id: this.state.selectedGarment.id,
      garment_name: this.state.selectedGarment.name,
      selected_color: this.state.selectedColor,
      selected_size: this.state.selectedSize,
      dtf_config: {
        position: this.state.selectedPosition,
        print_size: this.state.selectedPrintSize,
        design_name: this.state.customArtworkDataUrl ? "Diseño Personalizado del Cliente" : this.state.selectedArtwork.name,
        design_image_url: this.state.customArtworkDataUrl || null,
        scale_factor: this.state.scaleFactor,
        offset_x_pct: 50.0,
        offset_y_pct: 42.0,
        calculated_dtf_cost: this.state.pricing.dtfPrice
      },
      quantity: this.state.quantity,
      unit_price: this.state.pricing.unitTotal,
      subtotal: this.state.pricing.total
    };

    this.onAddToCart(item);
  }
}
