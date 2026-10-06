import { SVG_GARMENTS, PRESET_ARTWORKS } from './svg_templates.js';

export const COLLECTION_ITEMS = [
  {
    id: "col-polera-cyber-kanji",
        garmentId: "garment-polera-heavyweight-240",
        name: "Polera Oversized 'Cyber Kanji 2026'",
        price: 22990,
        badge: "240g Peinado • Heavyweight",
        category: "urbanas",
        garmentType: "tshirt",
        colorHex: "#121212",
        currentView: "front",
        availableColors: [
          { name: "Negro", hex: "#121212" },
          { name: "Gris", hex: "#61646B" },
          { name: "Azul", hex: "#142036" },
          { name: "Rojo", hex: "#B21B24" },
          { name: "Blanco", hex: "#FFFFFF" }
        ],
        frontArt: PRESET_ARTWORKS[1],
        backArt: PRESET_ARTWORKS[2],
        frontSpecs: { width: "85px", height: "85px", top: "35%", left: "36%" },
        backSpecs: { width: "190px", height: "190px", top: "42%", left: "50%" }
      },
      {
        id: "col-hoodie-mecha-unit",
        garmentId: "garment-poleron-hoodie-320",
        name: "Hoodie Canguro 'Mecha Unit Eva-01'",
        price: 34990,
        badge: "320g Afelpado • Heavyweight",
        category: "hoodies",
        garmentType: "hoodie",
        colorHex: "#61646B",
        currentView: "back",
        availableColors: [
          { name: "Negro", hex: "#121212" },
          { name: "Gris", hex: "#61646B" },
          { name: "Azul", hex: "#142036" },
          { name: "Rojo", hex: "#B21B24" },
          { name: "Blanco", hex: "#FFFFFF" }
        ],
        frontArt: PRESET_ARTWORKS[0], // Senkai Official
        backArt: PRESET_ARTWORKS[3],  // Mecha Unit Eva-01 Maxi
        frontSpecs: { width: "110px", height: "110px", top: "40%", left: "50%" },
        backSpecs: { width: "200px", height: "200px", top: "44%", left: "50%" }
      },
      {
        id: "col-polera-acid-street",
        garmentId: "garment-polera-heavyweight-240",
        name: "Polera Heavy 'Acid Type Streetwear'",
        price: 21990,
        badge: "240g Peinado • Drop Shoulder",
        category: "urbanas",
        garmentType: "tshirt",
        colorHex: "#FFFFFF",
        currentView: "front",
        availableColors: [
          { name: "Negro", hex: "#121212" },
          { name: "Gris", hex: "#61646B" },
          { name: "Azul", hex: "#142036" },
          { name: "Rojo", hex: "#B21B24" },
          { name: "Blanco", hex: "#FFFFFF" }
        ],
        frontArt: PRESET_ARTWORKS[4], // Acid Type Streetwear
        backArt: PRESET_ARTWORKS[2],  // Cyber Kanji 2026
        frontSpecs: { width: "150px", height: "100px", top: "38%", left: "50%" },
        backSpecs: { width: "180px", height: "180px", top: "42%", left: "50%" }
      },
      {
        id: "col-crewneck-tokyo-minimal",
        garmentId: "garment-poleron-crewneck-300",
        name: "Crewneck 'Tokyo Minimalist Studio'",
        price: 29990,
        badge: "300g Peinado • Cuello Redondo",
        category: "hoodies",
        garmentType: "crewneck",
        colorHex: "#121212",
        currentView: "front",
        availableColors: [
          { name: "Negro", hex: "#121212" },
          { name: "Gris", hex: "#61646B" },
          { name: "Azul", hex: "#142036" },
          { name: "Rojo", hex: "#B21B24" },
          { name: "Blanco", hex: "#FFFFFF" }
        ],
        frontArt: PRESET_ARTWORKS[1], // Senkai Badge Pocket
        backArt: PRESET_ARTWORKS[4],  // Acid Type
        frontSpecs: { width: "80px", height: "80px", top: "34%", left: "36%" },
        backSpecs: { width: "170px", height: "115px", top: "40%", left: "50%" }
      },
      {
        id: "col-polera-classic-regular",
        garmentId: "garment-polera-classic-180",
        name: "Polera Clásica Regular 'Senkai Original'",
        price: 16990,
        badge: "180g Jersey • Regular Fit",
        category: "minimalista",
        garmentType: "tshirt",
        colorHex: "#142036",
        currentView: "front",
        availableColors: [
          { name: "Negro", hex: "#121212" },
          { name: "Gris", hex: "#61646B" },
          { name: "Azul", hex: "#142036" },
          { name: "Rojo", hex: "#B21B24" },
          { name: "Blanco", hex: "#FFFFFF" }
        ],
        frontArt: PRESET_ARTWORKS[0], // Senkai Official
        backArt: PRESET_ARTWORKS[1],  // Minimalist Badge
        frontSpecs: { width: "120px", height: "120px", top: "37%", left: "50%" },
        backSpecs: { width: "80px", height: "80px", top: "30%", left: "50%" }
      },
      {
        id: "col-hoodie-cyberpunk-stealth",
        garmentId: "garment-poleron-hoodie-320",
        name: "Hoodie Heavy 'Senkai Stealth Edition'",
        price: 35990,
        badge: "320g Afelpado • Edición Taller",
        category: "propios",
        garmentType: "hoodie",
        colorHex: "#121212",
        currentView: "back",
        availableColors: [
          { name: "Negro", hex: "#121212" },
          { name: "Gris", hex: "#61646B" },
          { name: "Azul", hex: "#142036" },
          { name: "Rojo", hex: "#B21B24" },
          { name: "Blanco", hex: "#FFFFFF" }
        ],
        frontArt: PRESET_ARTWORKS[1], // Pocket Badge
        backArt: PRESET_ARTWORKS[2],  // Cyber Kanji Maxi
        frontSpecs: { width: "80px", height: "80px", top: "34%", left: "37%" },
        backSpecs: { width: "210px", height: "210px", top: "43%", left: "50%" }
      }
    ];

export class CatalogComponent {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.onSelectForCustomizer = options.onSelectForCustomizer || (() => {});
    this.onAddToCart = options.onAddToCart || (() => {});
    this.garments = [];
    this.activeFilter = "all";
    this.collectionItems = options.items || COLLECTION_ITEMS;
  }

  init(garments) {
    this.garments = garments || [];
    this.render();
    this.attachEvents();
  }

  render() {
    const itemsToShow = this.activeFilter === "all"
      ? this.collectionItems
      : this.collectionItems.filter(item => item.category === this.activeFilter);

    this.container.innerHTML = `
      <div class="collection-section">
        <div class="collection-header-center">
          <h2 class="collection-title-main">Colección Textil Streetwear</h2>
          <p style="font-size: 0.925rem; color: var(--text-secondary); max-width: 600px; margin: 0 auto;">
            Prendas de alta gama confeccionadas en algodón pesado de 240g a 320g con estampados DTF de alta resolución en frente y espalda.
          </p>
          
          <div class="collection-tabs-row" style="margin-top: 2rem;">
            <button class="collection-tab-btn ${this.activeFilter === 'all' ? 'active' : ''}" data-filter="all">TODAS LAS PRENDAS</button>
            <button class="collection-tab-btn ${this.activeFilter === 'urbanas' ? 'active' : ''}" data-filter="urbanas">POLERAS OVERSIZED (240G)</button>
            <button class="collection-tab-btn ${this.activeFilter === 'hoodies' ? 'active' : ''}" data-filter="hoodies">POLERONES & HOODIES (320G)</button>
            <button class="collection-tab-btn ${this.activeFilter === 'minimalista' ? 'active' : ''}" data-filter="minimalista">LÍNEA REGULAR (180G)</button>
          </div>
        </div>

        <div class="collection-products-grid">
          ${itemsToShow.map(item => this.renderProductCard(item)).join('')}
        </div>
      </div>
    `;
  }

  renderProductCard(item) {
    return renderProductCardMarkup(item, this.garments);
  }

  attachEvents() {
    // Filtros de categoría de colección
    this.container.querySelectorAll('.collection-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.activeFilter = e.currentTarget.dataset.filter;
        this.render();
        this.attachEvents();
      });
    });

    // Alternar entre fotografía real de estudio y ficha técnica SVG
    this.container.querySelectorAll('[data-toggle-mode]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cardId = e.currentTarget.dataset.toggleMode;
        const item = this.collectionItems.find(i => i.id === cardId);
        if (item) {
          item.viewMode = (item.viewMode === "svg") ? "photo" : "svg";
          this.render();
          this.attachEvents();
        }
      });
    });

    // Conmutador de vista Frontal / Trasera en la tarjeta vía Flip 3D (DESIGN.md)
    this.container.querySelectorAll('.card-view-btn[data-flip-view]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cardId = e.currentTarget.dataset.cardId;
        const newView = e.currentTarget.dataset.flipView;
        const item = this.collectionItems.find(i => i.id === cardId);
        if (item && item.currentView !== newView) {
          item.currentView = newView;
          const isBack = newView === "back";
          const cardEl = e.currentTarget.closest('.collection-card-pro');
          if (cardEl) {
            const flipper = cardEl.querySelector('.card-pro-flip-flipper');
            if (flipper) flipper.classList.toggle('is-flipped', isBack);
            const faceText = cardEl.querySelector('.card-face-text');
            if (faceText) faceText.textContent = isBack ? 'ESPALDA' : 'FRENTE';
            cardEl.querySelectorAll('.card-view-btn[data-flip-view]').forEach(b => {
              b.classList.toggle('active', b.dataset.flipView === newView);
            });
            const viewport = cardEl.querySelector('.card-pro-viewport');
            if (viewport) viewport.dataset.view = newView;
            const ctaBtn = cardEl.querySelector('.card-action-custom-btn');
            if (ctaBtn) ctaBtn.dataset.view = newView;
            cardEl.querySelector('.card-pro-face-front')?.setAttribute('aria-hidden', isBack ? 'true' : 'false');
            cardEl.querySelector('.card-pro-face-back')?.setAttribute('aria-hidden', !isBack ? 'true' : 'false');
          }
        }
      });
    });

    // Selector de color en vivo sobre la tarjeta del catálogo
    this.container.querySelectorAll('.card-swatch-dot').forEach(dot => {
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        const cardId = e.currentTarget.dataset.cardId;
        const newColorHex = e.currentTarget.dataset.colorHex;
        const item = this.collectionItems.find(i => i.id === cardId);
        if (item && item.colorHex.toLowerCase() !== newColorHex.toLowerCase()) {
          item.colorHex = newColorHex;
          this.render();
          this.attachEvents();
        }
      });
    });

    // Apertura directa en el simulador 3D con prenda y color seleccionados
    this.container.querySelectorAll('[data-open-customizer]').forEach(el => {
      el.addEventListener('click', (e) => {
        const garmentId = e.currentTarget.dataset.openCustomizer;
        const colorHex = e.currentTarget.dataset.colorHex;
        const view = e.currentTarget.dataset.view || "front";
        this.onSelectForCustomizer(garmentId, { colorHex, view });
      });
    });
  }
}

/**
 * Renderizador agnóstico de tarjetas de producto con estética técnica.
 * Reutilizado tanto en la grilla del catálogo como en el riel editorial (carrusel).
 */
export function renderProductCardMarkup(item, garments = []) {
  const garment = (garments || []).find(g => g.id === item.garmentId);
  const isBack = item.currentView === "back";
  const viewMode = item.viewMode || "photo";

  const basePrice = garment ? garment.base_price : (item.price - (item.artCost || 10000));
  const finalPrice = basePrice + (item.artCost || 10000);

  const realPhotoFrontSrc = garment?.photo_front || '/static/assets/garments/tshirt_front.png';
  const realPhotoBackSrc = garment?.photo_back || '/static/assets/garments/tshirt_back.png';

  const garmentSvgFront = SVG_GARMENTS[`${item.garmentType}_front`]
    ? SVG_GARMENTS[`${item.garmentType}_front`](item.colorHex)
    : SVG_GARMENTS.tshirt_front(item.colorHex);

  const garmentSvgBack = SVG_GARMENTS[`${item.garmentType}_back`]
    ? SVG_GARMENTS[`${item.garmentType}_back`](item.colorHex)
    : SVG_GARMENTS.tshirt_back(item.colorHex);

  return `
    <div class="collection-card-pro corner-brackets reactive-border" data-card-id="${item.id}">
      <div class="card-pro-top-bar" style="display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
        <span class="tech-tag">SPEC // <strong>${item.badge}</strong></span>
        <div style="display: flex; gap: 0.35rem; align-items: center;">
          <button class="card-view-btn mode-toggle-btn ${viewMode === 'photo' ? 'active' : ''}" data-toggle-mode="${item.id}" title="Alternar entre Foto Real y Vector SVG" style="font-size: 0.65rem; padding: 0.2rem 0.5rem;">
            ${viewMode === 'photo' ? '📷 FOTO' : '📐 SVG'}
          </button>
          <div class="card-pro-view-toggle">
            <button class="card-view-btn ${!isBack ? 'active' : ''}" data-flip-view="front" data-card-id="${item.id}" title="Ver cara frontal">
              FRENTE
            </button>
            <button class="card-view-btn ${isBack ? 'active' : ''}" data-flip-view="back" data-card-id="${item.id}" title="Ver cara trasera (espalda)">
              ESPALDA
            </button>
          </div>
        </div>
      </div>

      <div class="card-pro-viewport" data-open-customizer="${item.garmentId}" data-color-hex="${item.colorHex}" data-view="${item.currentView}" title="Personalizar en taller DTF">
        <div class="card-pro-flip-stage">
          <div class="card-pro-flip-flipper ${isBack ? 'is-flipped' : ''}">
            <!-- CARA FRONTAL -->
            <div class="card-pro-flip-face card-pro-face-front" aria-hidden="${isBack ? 'true' : 'false'}">
              <div class="card-pro-garment-wrap">
                ${viewMode === 'photo' ? `
                  <img src="${realPhotoFrontSrc}" alt="${item.name} Frontal" class="card-real-photo-img" onerror="this.src='/static/assets/garments/tshirt_front.png'">
                ` : `
                  ${garmentSvgFront}
                `}
              </div>
              <div class="card-pro-artwork-overlay" style="top: ${item.frontSpecs.top}; left: ${item.frontSpecs.left}; width: ${item.frontSpecs.width}; height: ${item.frontSpecs.height}; ${viewMode === 'photo' ? 'opacity: 0.95;' : ''}">
                ${item.frontArt.svgContent}
              </div>
            </div>

            <!-- CARA TRASERA (ROTADA 180 DEG) -->
            <div class="card-pro-flip-face card-pro-face-back" aria-hidden="${!isBack ? 'true' : 'false'}">
              <div class="card-pro-garment-wrap">
                ${viewMode === 'photo' ? `
                  <img src="${realPhotoBackSrc}" alt="${item.name} Espalda" class="card-real-photo-img" onerror="this.src='/static/assets/garments/tshirt_back.png'">
                ` : `
                  ${garmentSvgBack}
                `}
              </div>
              <div class="card-pro-artwork-overlay" style="top: ${item.backSpecs.top}; left: ${item.backSpecs.left}; width: ${item.backSpecs.width}; height: ${item.backSpecs.height}; ${viewMode === 'photo' ? 'opacity: 0.95;' : ''}">
                ${item.backArt.svgContent}
              </div>
            </div>
          </div>
        </div>

        <div class="card-face-indicator">
          ${viewMode === 'photo' ? '📷 FOTO REAL' : '📐 FICHA TÉCNICA'} • <span class="card-face-text">${isBack ? 'ESPALDA' : 'FRENTE'}</span>
        </div>
      </div>

      <div class="card-pro-footer">
        <div class="card-pro-title-row">
          <h4 class="card-pro-name">${item.name}</h4>
          <div class="card-pro-price">$${finalPrice.toLocaleString('es-CL')} <small>CLP</small></div>
        </div>

        <div class="card-pro-colors-row">
          <span class="card-colors-label">Color:</span>
          <div class="card-swatches-list">
            ${item.availableColors.map(c => `
              <button class="card-swatch-dot ${c.hex.toLowerCase() === item.colorHex.toLowerCase() ? 'active' : ''}" 
                      style="background: ${c.hex};" 
                      title="${c.name}"
                      data-card-id="${item.id}" 
                      data-color-hex="${c.hex}">
              </button>
            `).join('')}
          </div>
        </div>

        <div class="card-pro-actions">
          <button class="btn btn-primary card-action-custom-btn" data-open-customizer="${item.garmentId}" data-color-hex="${item.colorHex}" data-view="${item.currentView}">
            <span class="material-symbols-outlined" style="font-size: 16px;">precision_manufacturing</span>
            CONFIGURAR EN ATELIER ↗
          </button>
        </div>
      </div>
    </div>
  `;
}
