/**
 * SEIKO // NUEVA COLECCIÓN GLASSMORPHIC
 * Inspirado directamente en la estética visual de la referencia:
 * Tarjetas de cristal traslúcidas, siluetas textiles realistas y filtros de colección.
 */

import { SVG_GARMENTS } from './svg_templates.js';

export class CatalogComponent {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.onSelectForCustomizer = options.onSelectForCustomizer || (() => {});
    this.onAddToCart = options.onAddToCart || (() => {});
    this.garments = [];
    this.activeFilter = "all";

    this.collectionItems = [
      {
        id: "col-urbana-grafitti",
        garmentId: "garment-polera-heavyweight-240",
        name: "Modelo Urbana Grafitti",
        price: 18990,
        colorHex: "#FFFFFF",
        category: "urbanas",
        garmentType: "polera",
        realImage: "/static/assets/catalog_urbana.png"
      },
      {
        id: "col-diseno-propio-abstracto",
        garmentId: "garment-polera-heavyweight-240",
        name: "Diseño Propio Abstracto",
        price: 22990,
        colorHex: "#D5E2ED",
        category: "propios",
        garmentType: "polera",
        realImage: "/static/assets/catalog_abstracto.png"
      },
      {
        id: "col-modelo-minimalista-azul",
        garmentId: "garment-polera-classic-180",
        name: "Modelo Minimalista Azul",
        price: 15990,
        colorHex: "#7497B5",
        category: "minimalista",
        garmentType: "polera",
        realImage: "/static/assets/catalog_minimalista.png"
      },
      {
        id: "col-hoodie-senkai-cyber",
        garmentId: "garment-poleron-hoodie-320",
        name: "Hoodie Senkai Cyberpunk 380g",
        price: 28990,
        colorHex: "#121212",
        category: "hoodies",
        garmentType: "poleron_hoodie",
        artworkImg: "/static/assets/logo.png",
        artScale: "85%",
        artTop: "40%",
        artLeft: "50%"
      },
      {
        id: "col-polera-street-anime",
        garmentId: "garment-polera-heavyweight-240",
        name: "Polera Senkai Street Anime",
        price: 19990,
        colorHex: "#1E222A",
        category: "urbanas",
        garmentType: "polera",
        artworkImg: "/static/assets/logo.png",
        artScale: "88%",
        artTop: "39.5%",
        artLeft: "50%"
      },
      {
        id: "col-crewneck-vintage-mecha",
        garmentId: "garment-poleron-crewneck-300",
        name: "Crewneck Vintage Mecha 01",
        price: 24990,
        colorHex: "#61646B",
        category: "hoodies",
        garmentType: "poleron_crewneck",
        artworkImg: "/static/assets/logo.png",
        artScale: "55%",
        artTop: "37%",
        artLeft: "50%"
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
          <h2 class="collection-title-main">NUEVA COLECCIÓN</h2>
          
          <div class="collection-tabs-row">
            <button class="collection-tab-btn ${this.activeFilter === 'all' ? 'active' : ''}" data-filter="all">TODAS</button>
            <button class="collection-tab-btn ${this.activeFilter === 'urbanas' ? 'active' : ''}" data-filter="urbanas">POLERAS URBANAS</button>
            <button class="collection-tab-btn ${this.activeFilter === 'propios' ? 'active' : ''}" data-filter="propios">DISEÑOS PROPIOS</button>
            <button class="collection-tab-btn ${this.activeFilter === 'minimalista' ? 'active' : ''}" data-filter="minimalista">COLECCIÓN MINIMALISTA</button>
            <button class="collection-tab-btn ${this.activeFilter === 'hoodies' ? 'active' : ''}" data-filter="hoodies">POLERONES STREETWEAR</button>
          </div>
        </div>

        <div class="collection-products-grid">
          ${itemsToShow.map(item => `
            <div class="collection-card" data-garment-id="${item.garmentId}" data-product-id="${item.id}" title="Click para abrir en el personalizador">
              <div class="collection-card-preview">
                ${item.realImage ? `
                  <img src="${item.realImage}" alt="${item.name}" style="width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 14px 28px rgba(0,0,0,0.8));">
                ` : `
                  ${this.renderGarmentSvg(item.garmentType, item.colorHex)}
                  <div class="collection-card-print" style="top: ${item.artTop}; left: ${item.artLeft}; width: ${item.artScale}; height: ${item.artScale};">
                    <img src="${item.artworkImg}" alt="${item.name}">
                  </div>
                `}
              </div>
              <div class="collection-card-info">
                <div class="collection-card-name">${item.name}</div>
                <div class="collection-card-price">$${item.price.toLocaleString('es-CL')} <span style="font-size: 0.75rem; color: var(--text-muted);">CLP</span></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  renderGarmentSvg(type, colorHex) {
    if (type === "poleron_hoodie") return SVG_GARMENTS.hoodie_front(colorHex);
    if (type === "poleron_crewneck") return SVG_GARMENTS.crewneck_front(colorHex);
    return SVG_GARMENTS.tshirt_front(colorHex);
  }

  attachEvents() {
    this.container.querySelectorAll('.collection-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.activeFilter = e.currentTarget.dataset.filter;
        this.render();
        this.attachEvents();
      });
    });

    this.container.querySelectorAll('.collection-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const garmentId = e.currentTarget.dataset.garmentId;
        this.onSelectForCustomizer(garmentId);
      });
    });
  }
}
