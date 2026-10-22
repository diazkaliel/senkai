// Submódulo del Personalizador: Pasos guiados de configuración textil (Atelier Console).
// Divido la consola en 3 pasos ordenados:
// 1. Silueta textil, gama de colores y tabla de tallas.
// 2. Personalización gráfica (carga de arte, controles milimétricos y centrado).
// 3. Cantidad de lote con escala de descuentos y desglose de cotización.

import { SVG_GARMENT_THUMBS } from '../svg_templates.js?v=20261022_v1';

// Mapeo la categoría del producto al tipo de miniatura vectorial que le corresponde
export function getGarmentThumbType(category) {
  if (category === "poleron_hoodie" || category === "hoodie") return "hoodie";
  if (category === "poleron_crewneck" || category === "crewneck") return "crewneck";
  return "tshirt";
}

// Paso 01: Prenda, color de tela y talla seleccionada
export function renderGarmentStep(state, garmentsList) {
  const g = state.selectedGarment;

  return `
    <div class="inspector-step-pane">
      <!-- Silueta Textil -->
      <div class="inspector-box">
        <div class="control-label-row">
          <span class="control-label">Silueta Textil</span>
          <span class="control-meta">${g.weight_gsm}g/m² • ${g.composition}</span>
        </div>
        <div class="garment-cards-grid">
          ${garmentsList.map(item => {
            const type = getGarmentThumbType(item.category);
            const isSelected = item.id === g.id;
            const isAvailable = item.is_active !== false;
            const displayPrice = (item.size_prices && item.size_prices[state.selectedSize])
              ? Number(item.size_prices[state.selectedSize])
              : item.base_price;
            return `
              <button
                class="garment-card-btn ${isSelected ? 'active' : ''} ${!isAvailable ? 'is-disabled-garment' : ''}"
                data-garment-id="${item.id}"
                type="button"
                ${!isAvailable ? 'disabled aria-disabled="true" title="Temporalmente sin stock / No disponible"' : ''}>
                <div class="garment-card-thumb">
                  ${SVG_GARMENT_THUMBS[type]("#121212")}
                </div>
                <div class="garment-card-content">
                  <div class="garment-card-title">${item.name}</div>
                  <div class="garment-card-meta">
                    <span class="garment-gsm-tag">${item.weight_gsm}g/m²</span>
                    ${isAvailable
                      ? `<span class="garment-price-tag">$${displayPrice.toLocaleString('es-CL')}</span>`
                      : `<span class="garment-unavailable-tag">NO DISPONIBLE</span>`
                    }
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
          <span class="control-label">Tono de Confección</span>
          <span class="control-meta selected-color-name">Edición All-Black • <strong>Negro Industrial</strong></span>
        </div>
        <div class="color-swatches-row" style="display: flex; align-items: center; gap: 0.65rem;">
          <button class="color-swatch-btn active" 
                  style="background: #121212; border: 1px solid rgba(255, 255, 255, 0.4);" 
                  title="Negro Industrial #121212"
                  data-color-name="Negro"
                  data-color-hex="#121212"
                  type="button"
                  aria-label="Color Negro Industrial">
            <span class="swatch-check material-symbols-outlined" style="color: #ffffff; font-size: 18px;">check</span>
          </button>
          <span style="font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.05em;">
            Tinte exclusivo taller // #121212
          </span>
        </div>
      </div>

      <!-- Talla -->
      <div class="inspector-box">
        <div class="control-label-row">
          <span class="control-label">Talla de la Prenda</span>
          <span class="control-meta">Seleccionada: <strong>${state.selectedSize}</strong> • $${((g.size_prices && g.size_prices[state.selectedSize]) ? g.size_prices[state.selectedSize] : g.base_price).toLocaleString('es-CL')}</span>
        </div>
        <div class="size-pills-row">
          ${g.sizes.map(sz => {
            const szPrice = (g.size_prices && g.size_prices[sz]) ? Number(g.size_prices[sz]) : g.base_price;
            const hasDiffPrice = szPrice !== g.base_price;
            return `
              <button class="size-pill-btn ${sz === state.selectedSize ? 'active' : ''} ${hasDiffPrice ? 'has-custom-price' : ''}" data-size="${sz}" type="button" title="Talla ${sz}: $${szPrice.toLocaleString('es-CL')} CLP">
                <span>${sz}</span>
                ${hasDiffPrice ? `<small style="display: block; font-size: 0.62rem; font-family: var(--font-mono); opacity: 0.85; line-height: 1; margin-top: 2px;">$${szPrice.toLocaleString('es-CL')}</small>` : ''}
              </button>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Botón de avance -->
      <div class="step-nav-footer">
        <button class="btn btn-primary step-advance-btn" data-goto-step="print" type="button">
          <span>CONTINUAR A ESTAMPA & ARTE →</span>
        </button>
      </div>
    </div>
  `;
}

// Paso 02: Carga de diseño, posición milimétrica en X/Y y escala
export function renderPrintStep(state, activePrint) {
  const isFront = state.currentView === 'front';

  return `
    <div class="inspector-step-pane">
      <div class="step-face-indicator-bar">
        <span>Cara en Edición: <strong>${isFront ? 'FRENTE' : 'ESPALDA'}</strong></span>
        <button class="btn-switch-face-link" id="switchFaceFromStepBtn" type="button">
          Alternar a ${isFront ? 'Espalda ↷' : 'Frente ↶'}
        </button>
      </div>

      ${activePrint ? `
        <!-- Dropzone y Carga de Archivo Propio -->
        <div class="inspector-box">
          <div class="control-label-row">
            <span class="control-label">Archivo de Estampa</span>
            <span class="control-meta">${(activePrint.customArtworkDataUrl || activePrint.designImageUrl) ? 'Archivo Propio Subido' : (activePrint.artwork ? activePrint.artwork.name : 'Estampa DTF')}</span>
          </div>

          <div class="upload-dropzone" id="uploadDropzone" style="margin-bottom: 0.85rem;">
            <span class="material-symbols-outlined upload-dropzone-icon">cloud_upload</span>
            <p class="upload-dropzone-title">Subir imagen personalizada</p>
            <p class="upload-dropzone-sub">PNG sin fondo a 300 DPI, WebP, SVG o PDF</p>
            <input type="file" id="fileInputDtf" accept="image/png, image/jpeg, image/webp, image/svg+xml, application/pdf" style="display: none;">
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
              <span>Centrar Estampa en ${isFront ? 'el Pecho' : 'la Espalda'}</span>
            </button>
          </div>
        </div>
      ` : `
        <!-- Estado de cara lisa -->
        <div class="face-empty-state">
          <span class="material-symbols-outlined face-empty-icon">check_circle_outline</span>
          <div class="face-empty-title">CARA ${isFront ? 'FRONTAL' : 'TRASERA'} LISA</div>
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
            <input type="file" id="fileInputDirect" accept="image/png, image/jpeg, image/webp, image/svg+xml, application/pdf" style="display: none;">
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
  `;
}

// Paso 03: Selector de lote por volumen, desglose técnico de costos y notas de producción
export function renderOrderStep(state, discountBadge, g) {
  const printsCount = state.prints.length;
  const effectiveSizePrice = (g.size_prices && g.size_prices[state.selectedSize]) ? Number(g.size_prices[state.selectedSize]) : g.base_price;

  return `
    <div class="inspector-step-pane">
      <div class="inspector-box">
        <div class="control-label-row">
          <span class="control-label">Cantidad de esta Prenda</span>
          <span class="control-meta discount-tier-label">Estampado DTF incluido en el valor</span>
        </div>
        <div class="qty-selector-row">
          <div class="qty-stepper">
            <button class="qty-stepper-btn" id="qtyMinus" type="button" aria-label="Disminuir cantidad">−</button>
            <input type="number" class="qty-stepper-val" id="qtyInput" min="1" max="500" value="${state.quantity}" aria-label="Cantidad de prendas">
            <button class="qty-stepper-btn" id="qtyPlus" type="button" aria-label="Aumentar cantidad">+</button>
          </div>
        </div>
      </div>

      <!-- Desglose detallado -->
      <div class="inspector-box">
        <div class="control-label-row">
          <span class="control-label">Desglose Unitario</span>
          <span class="control-meta">Parámetros de Taller</span>
        </div>
        <div class="quote-row">
          <span>Prenda + Estampado (${g.name} - ${state.selectedSize})</span>
          <span id="quoteBasePrice">$${effectiveSizePrice.toLocaleString('es-CL')}</span>
        </div>
        <div class="quote-row">
          <span>Transfers DTF (${printsCount} estampa${printsCount !== 1 ? 's' : ''})</span>
          <span id="quoteDtfPrice" style="color: var(--accent-primary); font-weight: 700;">INCLUIDO</span>
        </div>
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
  `;
}

// Columna derecha completa: Pestañas de navegación, panel del paso activo y barra fija de cotización
export function renderAtelierConsole(state, garmentsList, activePrint) {
  const g = state.selectedGarment;
  const printsCount = state.prints.length;

  const discountBadge = state.quantity >= 20
    ? '25% dto. por volumen'
    : state.quantity >= 10
      ? '15% dto. por volumen'
      : state.quantity >= 5
        ? '10% dto. por volumen'
        : '';

  return `
    <div class="customizer-inspector-column">
      <div class="atelier-console-card">
        
        <!-- Barra de Pestañas de Paso -->
        <div class="atelier-tabs-nav" role="tablist">
          <button class="atelier-tab-btn ${state.activeStep === 'garment' ? 'active' : ''}" data-step="garment" type="button">
            <span class="tab-index">01</span>
            <span class="tab-text">PRENDA & TALLA</span>
          </button>
          <button class="atelier-tab-btn ${state.activeStep === 'print' ? 'active' : ''}" data-step="print" type="button">
            <span class="tab-index">02</span>
            <span class="tab-text">ESTAMPA & ARTE</span>
            ${printsCount > 0 ? `<span class="tab-active-dot" title="${printsCount} estampa(s)"></span>` : ''}
          </button>
          <button class="atelier-tab-btn ${state.activeStep === 'order' ? 'active' : ''}" data-step="order" type="button">
            <span class="tab-index">03</span>
            <span class="tab-text">LOTE & ORDEN</span>
          </button>
        </div>

        <!-- Cuerpo del Panel según Paso Activo -->
        <div class="atelier-tab-body">
          ${state.activeStep === 'garment' ? renderGarmentStep(state, garmentsList) : ''}
          ${state.activeStep === 'print' ? renderPrintStep(state, activePrint) : ''}
          ${state.activeStep === 'order' ? renderOrderStep(state, discountBadge, g) : ''}
        </div>

        <!-- Dock de Cotización Fijo y Botón de Acción -->
        <div class="live-quote-dock">
          <div class="quote-dock-row">
            <div class="quote-dock-info">
              <span class="quote-dock-garment">${g.name} [${state.selectedSize}]</span>
              <span class="quote-dock-sub">${printsCount} estampa${printsCount !== 1 ? 's' : ''} • Lote ${state.quantity} un.</span>
            </div>
            <div class="quote-dock-price">
              <span class="quote-dock-total" id="quoteTotalVal">$${state.pricing.total.toLocaleString('es-CL')}</span>
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
  `;
}
