/**
 * SEIKO // CATÁLOGO STREETWEAR DE ALTA DEFINICIÓN (LOOKBOOK V4)
 * Exhibición pública hiperrealista con previsualización interactiva Frontal / Espalda,
 * selector dinámico de color en tarjeta, badges de gramaje y enlace al simulador 3D.
 */

import { SVG_GARMENTS, PRESET_ARTWORKS } from './svg_templates.js';

export class CatalogComponent {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.onSelectForCustomizer = options.onSelectForCustomizer || (() => {});
    this.onAddToCart = options.onAddToCart || (() => {});
    this.garments = [];
    this.activeFilter = "all";

    this.collectionItems = [
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
          { name: "Obsidian Black", hex: "#121212" },
          { name: "Chalk White", hex: "#F4F4F0" },
          { name: "Cement Gray", hex: "#7A7D84" },
          { name: "Terracotta", hex: "#8A4332" }
        ],
        frontArt: PRESET_ARTWORKS[1], // Senkai Badge Pocket
        backArt: PRESET_ARTWORKS[2],  // Cyber Kanji Maxi Espalda
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
        colorHex: "#7A7D84",
        currentView: "back", // Muestra la impresionante espalda por defecto
        availableColors: [
          { name: "Cement Gray", hex: "#7A7D84" },
          { name: "Obsidian Black", hex: "#121212" },
          { name: "Raw Bone", hex: "#D6D1C7" },
          { name: "Deep Olive", hex: "#2D3A2B" }
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
        colorHex: "#F4F4F0",
        currentView: "front",
        availableColors: [
          { name: "Chalk White", hex: "#F4F4F0" },
          { name: "Obsidian Black", hex: "#121212" },
          { name: "Washed Gray", hex: "#4A4D54" }
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
          { name: "Obsidian Black", hex: "#121212" },
          { name: "Heather Gray", hex: "#8A8E95" },
          { name: "Midnight Navy", hex: "#1A2238" }
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
        colorHex: "#1B2A4A",
        currentView: "front",
        availableColors: [
          { name: "Navy Deep", hex: "#1B2A4A" },
          { name: "Blanco Puro", hex: "#FFFFFF" },
          { name: "Negro", hex: "#121212" },
          { name: "Burgundy", hex: "#4A1521" }
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
          { name: "Obsidian Black", hex: "#121212" },
          { name: "Deep Olive", hex: "#2D3A2B" }
        ],
        frontArt: PRESET_ARTWORKS[1], // Pocket Badge
        backArt: PRESET_ARTWORKS[2],  // Cyber Kanji Maxi
        frontSpecs: { width: "80px", height: "80px", top: "34%", left: "37%" },
        backSpecs: { width: "210px", height: "210px", top: "43%", left: "50%" }
      }
    ];
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
          <span class="badge badge-cyan" style="margin-bottom: 0.5rem;">LOOKBOOK 2026 // EDICIÓN LIMITADA</span>
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
    const isBack = item.currentView === "back";
    const templateKey = `${item.garmentType}_${isBack ? 'back' : 'front'}`;
    const garmentSvg = SVG_GARMENTS[templateKey] ? SVG_GARMENTS[templateKey](item.colorHex) : SVG_GARMENTS.tshirt_front(item.colorHex);

    const activeArt = isBack ? item.backArt : item.frontArt;
    const activeSpecs = isBack ? item.backSpecs : item.frontSpecs;

    return `
      <div class="collection-card-pro" data-card-id="${item.id}">
        <!-- Badge superior de gramaje y especificación textil -->
        <div class="card-pro-top-bar">
          <span class="card-pro-badge">${item.badge}</span>
          <div class="card-pro-view-toggle">
            <button class="card-view-btn ${!isBack ? 'active' : ''}" data-flip-view="front" data-card-id="${item.id}" title="Ver cara frontal">
              FRENTE
            </button>
            <button class="card-view-btn ${isBack ? 'active' : ''}" data-flip-view="back" data-card-id="${item.id}" title="Ver cara trasera (espalda)">
              ESPALDA
            </button>
          </div>
        </div>

        <!-- Escenario visual interactivo -->
        <div class="card-pro-viewport" data-open-customizer="${item.garmentId}" data-color-hex="${item.colorHex}" data-view="${item.currentView}" title="Haz clic para personalizar en el simulador 3D">
          <div class="card-pro-garment-wrap">
            ${garmentSvg}
          </div>

          <!-- Estampa DTF superpuesta con fidelidad de escala -->
          <div class="card-pro-artwork-overlay" style="top: ${activeSpecs.top}; left: ${activeSpecs.left}; width: ${activeSpecs.width}; height: ${activeSpecs.height};">
            ${activeArt.svgContent}
          </div>

          <!-- Píldora indicadora de cara -->
          <div class="card-face-indicator">
            ${isBack ? '🔄 ESTAMPA TRASERA MAXI' : '👕 ESTAMPA FRONTAL'}
          </div>
        </div>

        <!-- Información y selector de colores en vivo -->
        <div class="card-pro-footer">
          <div class="card-pro-title-row">
            <h4 class="card-pro-name">${item.name}</h4>
            <div class="card-pro-price">$${item.price.toLocaleString('es-CL')} <small>CLP</small></div>
          </div>

          <!-- Selector de color dinámico en la misma tarjeta -->
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

          <!-- Acciones de la tarjeta -->
          <div class="card-pro-actions">
            <button class="btn btn-primary card-action-custom-btn" data-open-customizer="${item.garmentId}" data-color-hex="${item.colorHex}" data-view="${item.currentView}">
              <span class="material-symbols-outlined" style="font-size: 16px;">brush</span>
              Personalizar en Simulador 3D
            </button>
          </div>
        </div>
      </div>
    `;
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

    // Conmutador de vista Frontal / Trasera en la tarjeta
    this.container.querySelectorAll('.card-view-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cardId = e.currentTarget.dataset.cardId;
        const newView = e.currentTarget.dataset.flipView;
        const item = this.collectionItems.find(i => i.id === cardId);
        if (item && item.currentView !== newView) {
          item.currentView = newView;
          this.render();
          this.attachEvents();
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
