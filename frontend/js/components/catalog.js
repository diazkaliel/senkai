import { SVG_GARMENTS } from './svg_templates.js?v=20261018_v3';
import { COLLECTION_ITEMS, DEFAULT_CATALOG_CATEGORIES } from '../data/collection_items.js?v=20261018_v3';

export { COLLECTION_ITEMS, DEFAULT_CATALOG_CATEGORIES };

export class CatalogComponent {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.onSelectForCustomizer = options.onSelectForCustomizer || (() => {});
    this.onAddToCart = options.onAddToCart || (() => {});
    this.garments = [];

    // Estado de filtrado multicapa: categoría, subcategoría, gramaje, ordenamiento y texto
    this.activeFilter = "all";
    this.activeSubcategory = "all";
    this.activeWeightFilter = "all";
    this.activeSort = "featured";
    this.searchQuery = "";

    this.categories = DEFAULT_CATALOG_CATEGORIES.map(c => ({
      ...c,
      subcategories: [...(c.subcategories || [])]
    }));
    this.collectionItems = (options.items || COLLECTION_ITEMS).map(i => ({ ...i }));
    this.title = options.title || "Colección Textil Streetwear";
    this.desc = options.desc || "Prendas de alta gama confeccionadas en algodón pesado de 240g a 320g con estampados DTF de alta resolución en frente y espalda.";
    this.tag = options.tag || "LOOKBOOK 2026 // EDICIÓN LIMITADA";
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

  init(garments) {
    this.garments = garments || [];
    this._syncTaxonomyFromItems();
    this.render();
    this.attachEvents();
  }

  setHeaders(title, desc, tag) {
    if (title) this.title = title;
    if (desc) this.desc = desc;
    if (tag !== undefined) this.tag = tag;
    const titleEl = this.container?.querySelector('.collection-title-main');
    const descEl = this.container?.querySelector('.collection-desc-main');
    const tagEl = this.container?.querySelector('.collection-tag-badge');
    if (titleEl && title) titleEl.textContent = title;
    if (descEl && desc) descEl.textContent = desc;
    if (tagEl && tag) {
      tagEl.textContent = tag;
      tagEl.style.display = '';
    }
  }

  updateItems(newItems, customCategories = null) {
    if (Array.isArray(customCategories) && customCategories.length > 0) {
      this.categories = customCategories.map(c => ({
        id: c.id,
        label: c.label,
        subcategories: Array.isArray(c.subcategories) ? [...c.subcategories] : []
      }));
    }

    if (Array.isArray(newItems) && newItems.length > 0) {
      // Mantenemos los datos gráficos base (vectores/coordenadas) y aplicamos los cambios del CMS
      const merged = [];
      newItems.forEach((updated, idx) => {
        const baseItem = COLLECTION_ITEMS.find(b => b.id === updated.id) || COLLECTION_ITEMS[idx % COLLECTION_ITEMS.length];
        merged.push({
          ...baseItem,
          ...updated,
          garmentId: updated.garment_id || updated.garmentId || baseItem.garmentId,
          subcategory: updated.subcategory || baseItem.subcategory || "Edición Taller",
          photo_front: (updated.photo_front !== undefined) ? updated.photo_front : baseItem.photo_front,
          photo_back: (updated.photo_back !== undefined) ? updated.photo_back : baseItem.photo_back
        });
      });
      this.collectionItems = merged;
    }

    this._syncTaxonomyFromItems();

    // Si la categoría o subcategoría activa ya no existe, volvemos a 'all'
    if (this.activeFilter !== "all" && !this.categories.some(c => c.id === this.activeFilter)) {
      this.activeFilter = "all";
    }
    this.render();
    this.attachEvents();
  }

  // Asegura que cualquier categoría o subcategoría asignada a una prenda aparezca en los filtros
  _syncTaxonomyFromItems() {
    this.collectionItems.forEach(item => {
      const catId = (item.category || "urbanas").trim();
      const subcat = (item.subcategory || "").trim();
      let catObj = this.categories.find(c => c.id === catId);
      if (!catObj) {
        catObj = {
          id: catId,
          label: catId.replace(/[_-]+/g, ' ').toUpperCase(),
          subcategories: []
        };
        this.categories.push(catObj);
      }
      if (subcat && !catObj.subcategories.includes(subcat)) {
        catObj.subcategories.push(subcat);
      }
    });
  }

  // Obtiene las subcategorías disponibles según la categoría principal seleccionada
  getAvailableSubcategories() {
    if (this.activeFilter === "all") {
      const allSubs = new Set();
      this.categories.forEach(c => (c.subcategories || []).forEach(s => allSubs.add(s)));
      this.collectionItems.forEach(i => {
        if (i.subcategory) allSubs.add(i.subcategory);
      });
      return Array.from(allSubs);
    }
    const cat = this.categories.find(c => c.id === this.activeFilter);
    const subs = new Set(cat ? cat.subcategories : []);
    this.collectionItems
      .filter(i => i.category === this.activeFilter && i.subcategory)
      .forEach(i => subs.add(i.subcategory));
    return Array.from(subs);
  }

  // Filtra y ordena las prendas aplicando categoría, subcategoría, gramaje y búsqueda
  getFilteredAndSortedItems() {
    let list = [...this.collectionItems];

    // 1. Filtro por Categoría Principal
    if (this.activeFilter !== "all") {
      list = list.filter(item => item.category === this.activeFilter);
    }

    // 2. Filtro por Subcategoría
    if (this.activeSubcategory !== "all") {
      list = list.filter(item => (item.subcategory || "") === this.activeSubcategory);
    }

    // 3. Filtro por Gramaje Textil (GSM)
    if (this.activeWeightFilter !== "all") {
      list = list.filter(item => {
        const gId = item.garment_id || item.garmentId;
        const garment = this.garments.find(g => g.id === gId);
        const gsm = garment ? garment.weight_gsm : (parseInt(item.badge, 10) || 240);
        if (this.activeWeightFilter === "180") return gsm <= 190;
        if (this.activeWeightFilter === "240") return gsm > 190 && gsm <= 260;
        if (this.activeWeightFilter === "300+") return gsm >= 280;
        return true;
      });
    }

    // 4. Búsqueda por texto
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(item => {
        const nameMatch = (item.name || "").toLowerCase().includes(q);
        const badgeMatch = (item.badge || "").toLowerCase().includes(q);
        const subMatch = (item.subcategory || "").toLowerCase().includes(q);
        const catMatch = (item.category || "").toLowerCase().includes(q);
        return nameMatch || badgeMatch || subMatch || catMatch;
      });
    }

    // 5. Ordenamiento
    if (this.activeSort === "price-asc") {
      list.sort((a, b) => {
        const ga = this.garments.find(g => g.id === (a.garment_id || a.garmentId));
        const gb = this.garments.find(g => g.id === (b.garment_id || b.garmentId));
        return resolveItemPrice(a, ga) - resolveItemPrice(b, gb);
      });
    } else if (this.activeSort === "price-desc") {
      list.sort((a, b) => {
        const ga = this.garments.find(g => g.id === (a.garment_id || a.garmentId));
        const gb = this.garments.find(g => g.id === (b.garment_id || b.garmentId));
        return resolveItemPrice(b, gb) - resolveItemPrice(a, ga);
      });
    } else if (this.activeSort === "gsm-desc") {
      list.sort((a, b) => {
        const ga = this.garments.find(g => g.id === (a.garment_id || a.garmentId));
        const gb = this.garments.find(g => g.id === (b.garment_id || b.garmentId));
        return (gb?.weight_gsm || 240) - (ga?.weight_gsm || 240);
      });
    }

    return list;
  }

  hasActiveFilters() {
    return (
      this.activeFilter !== "all" ||
      this.activeSubcategory !== "all" ||
      this.activeWeightFilter !== "all" ||
      this.activeSort !== "featured" ||
      this.searchQuery.trim() !== ""
    );
  }

  resetAllFilters() {
    this.activeFilter = "all";
    this.activeSubcategory = "all";
    this.activeWeightFilter = "all";
    this.activeSort = "featured";
    this.searchQuery = "";
    this.render();
    this.attachEvents();
  }

  render() {
    if (!this.container) return;
    const itemsToShow = this.getFilteredAndSortedItems();
    const subcategories = this.getAvailableSubcategories();
    const totalCount = this.collectionItems.length;

    this.container.innerHTML = `
      <div class="collection-section">
        <div class="collection-header-center">
          <div class="badge collection-tag-badge" style="margin-bottom: 0.75rem; ${this.tag ? '' : 'display: none;'}">${this.escapeHtml(this.tag)}</div>
          <h2 class="collection-title-main">${this.escapeHtml(this.title)}</h2>
          <p class="collection-desc-main" style="font-size: 0.925rem; color: var(--text-secondary); max-width: 620px; margin: 0 auto;">
            ${this.escapeHtml(this.desc)}
          </p>
          
          <!-- NIVEL 1: CATEGORÍAS PRINCIPALES -->
          <div class="collection-tabs-row" role="tablist" aria-label="Categorías de prendas" style="margin-top: 2rem;">
            <button type="button" class="collection-tab-btn ${this.activeFilter === 'all' ? 'active' : ''}" data-filter="all">
              <span>TODAS LAS PRENDAS</span>
              <span class="collection-tab-count">${totalCount}</span>
            </button>
            ${this.categories.map(cat => {
              const count = this.collectionItems.filter(i => i.category === cat.id).length;
              return `
                <button type="button" class="collection-tab-btn ${this.activeFilter === cat.id ? 'active' : ''}" data-filter="${this.escapeHtml(cat.id)}">
                  <span>${this.escapeHtml(cat.label)}</span>
                  <span class="collection-tab-count">${count}</span>
                </button>
              `;
            }).join('')}
          </div>

          <!-- NIVEL 2: SUBCATEGORÍAS (GHOST PILLS) -->
          ${subcategories.length > 0 ? `
            <div class="collection-subcategories-row" role="group" aria-label="Subcategorías">
              <span class="subcat-row-label">SUBCATEGORÍAS //</span>
              <button type="button" class="collection-subcat-pill ${this.activeSubcategory === 'all' ? 'active' : ''}" data-subfilter="all">
                Todas
              </button>
              ${subcategories.map(sub => `
                <button type="button" class="collection-subcat-pill ${this.activeSubcategory === sub ? 'active' : ''}" data-subfilter="${this.escapeHtml(sub)}">
                  ${this.escapeHtml(sub)}
                </button>
              `).join('')}
            </div>
          ` : ''}

          <!-- NIVEL 3: BARRA TÉCNICA DE FILTRADO Y ORDENAMIENTO -->
          <div class="collection-filter-toolbar">
            <div class="filter-toolbar-search">
              <span class="material-symbols-outlined filter-search-icon" aria-hidden="true">tune</span>
              <input 
                type="text" 
                id="catalogLocalSearchInput" 
                class="filter-search-input" 
                placeholder="Filtrar por nombre, corte, diseño o subcategoría..." 
                value="${this.escapeHtml(this.searchQuery)}"
                aria-label="Filtrar prendas del catálogo"
              >
            </div>

            <div class="filter-toolbar-controls">
              <div class="filter-control-group">
                <label class="filter-control-label" for="catalogWeightFilterSelect">Gramaje:</label>
                <select id="catalogWeightFilterSelect" class="filter-control-select">
                  <option value="all" ${this.activeWeightFilter === 'all' ? 'selected' : ''}>Todos los Gramajes</option>
                  <option value="180" ${this.activeWeightFilter === '180' ? 'selected' : ''}>180 GSM (Regular Jersey)</option>
                  <option value="240" ${this.activeWeightFilter === '240' ? 'selected' : ''}>240 GSM (Heavyweight)</option>
                  <option value="300+" ${this.activeWeightFilter === '300+' ? 'selected' : ''}>300–320 GSM (Fleece Pesado)</option>
                </select>
              </div>

              <div class="filter-control-group">
                <label class="filter-control-label" for="catalogSortSelect">Ordenar:</label>
                <select id="catalogSortSelect" class="filter-control-select">
                  <option value="featured" ${this.activeSort === 'featured' ? 'selected' : ''}>Destacados de Taller</option>
                  <option value="price-asc" ${this.activeSort === 'price-asc' ? 'selected' : ''}>Precio: Menor a Mayor</option>
                  <option value="price-desc" ${this.activeSort === 'price-desc' ? 'selected' : ''}>Precio: Mayor a Menor</option>
                  <option value="gsm-desc" ${this.activeSort === 'gsm-desc' ? 'selected' : ''}>Mayor Gramaje (GSM)</option>
                </select>
              </div>

              <div class="filter-results-meta">
                <span>MOSTRANDO <strong>${itemsToShow.length}</strong> DE ${totalCount}</span>
                ${this.hasActiveFilters() ? `
                  <button type="button" class="btn-reset-catalog-filters" id="resetCatalogFiltersBtn">
                    [ LIMPIAR FILTROS ]
                  </button>
                ` : ''}
              </div>
            </div>
          </div>
        </div>

        ${itemsToShow.length > 0 ? `
          <div class="collection-products-grid">
            ${itemsToShow.map(item => this.renderProductCard(item)).join('')}
          </div>
        ` : `
          <div class="collection-empty-state">
            <span class="material-symbols-outlined" style="font-size: 32px; color: var(--text-muted);">filter_alt_off</span>
            <h4>Sin resultados para los filtros seleccionados</h4>
            <p>No encontramos prendas que coincidan con esta combinación de categoría, subcategoría o gramaje.</p>
            <button type="button" class="btn btn-secondary" id="emptyResetCatalogFiltersBtn">
              Restablecer todos los filtros
            </button>
          </div>
        `}
      </div>
    `;
  }

  renderProductCard(item) {
    return renderProductCardMarkup(item, this.garments, this.categories);
  }

  attachEvents() {
    if (!this.container) return;

    // 1. Filtros de categoría principal
    this.container.querySelectorAll('.collection-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const newCat = e.currentTarget.dataset.filter;
        if (this.activeFilter !== newCat) {
          this.activeFilter = newCat;
          this.activeSubcategory = "all"; // Al cambiar de categoría reinicio la subcategoría
          this.render();
          this.attachEvents();
        }
      });
    });

    // 2. Filtros de subcategoría
    this.container.querySelectorAll('.collection-subcat-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        const newSub = e.currentTarget.dataset.subfilter;
        if (this.activeSubcategory !== newSub) {
          this.activeSubcategory = newSub;
          this.render();
          this.attachEvents();
        }
      });
    });

    // 3. Filtro por gramaje (GSM)
    const weightSelect = this.container.querySelector('#catalogWeightFilterSelect');
    if (weightSelect) {
      weightSelect.addEventListener('change', (e) => {
        this.activeWeightFilter = e.target.value;
        this.render();
        this.attachEvents();
      });
    }

    // 4. Selector de ordenamiento
    const sortSelect = this.container.querySelector('#catalogSortSelect');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.activeSort = e.target.value;
        this.render();
        this.attachEvents();
      });
    }

    // 5. Buscador local dentro de la sección de catálogo
    const searchInput = this.container.querySelector('#catalogLocalSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const cursorPos = e.target.selectionStart;
        this.searchQuery = e.target.value;
        this.render();
        this.attachEvents();
        const newInput = this.container.querySelector('#catalogLocalSearchInput');
        if (newInput) {
          newInput.focus();
          try { newInput.setSelectionRange(cursorPos, cursorPos); } catch (_) {}
        }
      });
    }

    // 6. Botones de limpiar filtros
    const resetBtn = this.container.querySelector('#resetCatalogFiltersBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetAllFilters());
    }
    const emptyResetBtn = this.container.querySelector('#emptyResetCatalogFiltersBtn');
    if (emptyResetBtn) {
      emptyResetBtn.addEventListener('click', () => this.resetAllFilters());
    }

    // 7. Alternar entre fotografía real de estudio y ficha técnica SVG
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

    // 8. Conmutador de vista Frontal / Trasera en la tarjeta vía Flip 3D (disenio.md)
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
            cardEl.querySelector('.card-pro-face-front')?.setAttribute('aria-hidden', isBack ? 'true' : 'false');
            cardEl.querySelector('.card-pro-face-back')?.setAttribute('aria-hidden', !isBack ? 'true' : 'false');
          }
        }
      });
    });

    // 8b. Clic en el visor de la tarjeta voltea entre Frente y Espalda (sin redirigir al simulador)
    this.container.querySelectorAll('.card-pro-viewport[data-flip-viewport]').forEach(vp => {
      vp.addEventListener('click', (e) => {
        const cardId = e.currentTarget.dataset.flipViewport;
        const item = this.collectionItems.find(i => i.id === cardId);
        if (!item) return;
        const newView = item.currentView === "back" ? "front" : "back";
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
          e.currentTarget.dataset.view = newView;
          cardEl.querySelector('.card-pro-face-front')?.setAttribute('aria-hidden', isBack ? 'true' : 'false');
          cardEl.querySelector('.card-pro-face-back')?.setAttribute('aria-hidden', !isBack ? 'true' : 'false');
        }
      });
    });

    // 8c. Galería de fotos adicionales de la pieza del catálogo
    this.container.querySelectorAll('.card-gallery-thumb-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const photoUrl = e.currentTarget.dataset.photoUrl;
        const cardEl = e.currentTarget.closest('.collection-card-pro');
        if (!cardEl || !photoUrl) return;

        cardEl.querySelectorAll('.card-gallery-thumb-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');

        const frontImg = cardEl.querySelector('.card-pro-face-front .card-real-photo-img');
        if (frontImg) {
          frontImg.src = photoUrl;
        }
      });
    });

    // 9. Selector de color en vivo sobre la tarjeta del catálogo
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

    // 10. Selector de talla en vivo sobre la tarjeta del catálogo (actualiza precio si la talla es diferenciada)
    this.container.querySelectorAll('.card-size-pill[data-card-size]').forEach(pill => {
      pill.addEventListener('click', (e) => {
        e.stopPropagation();
        const cardId = e.currentTarget.dataset.cardId;
        const newSize = e.currentTarget.dataset.cardSize;
        const item = this.collectionItems.find(i => i.id === cardId);
        if (!item) return;
        item.selectedSize = newSize;

        const cardEl = e.currentTarget.closest('.collection-card-pro');
        if (cardEl) {
          cardEl.querySelectorAll('.card-size-pill[data-card-size]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.cardSize === newSize);
          });
          const gId = item.garment_id || item.garmentId;
          const garment = this.garments.find(g => g.id === gId);
          const updatedPrice = resolveItemPrice(item, garment, newSize);
          const priceEl = cardEl.querySelector('.card-pro-price');
          if (priceEl) {
            priceEl.innerHTML = `$${updatedPrice.toLocaleString('es-CL')} <small>CLP</small>`;
          }
        }
      });
    });

    // 11. Agregar prenda directamente al carro desde el catálogo (sin llevar al simulador)
    this.container.querySelectorAll('[data-add-to-cart]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cardId = e.currentTarget.dataset.addToCart;
        const item = this.collectionItems.find(i => i.id === cardId);
        if (!item) return;
        const gId = item.garment_id || item.garmentId;
        const garment = this.garments.find(g => g.id === gId);
        if (garment && garment.is_active === false) return;
        const cartItem = buildCatalogCartItem(item, garment);
        this.onAddToCart(cartItem);
      });
    });
  }
}

/**
 * Precio autoritativo de una pieza en la vitrina pública (Catálogo y Carrusel):
 * Respeta el precio explícito configurado en el Taller y aplica el precio o diferencial
 * específico de la talla seleccionada si fue configurado en la administración.
 */
export function resolveItemPrice(item, garment, selectedSize = null) {
  const size = selectedSize || item?.selectedSize || "L";
  const sp = garment?.size_prices || {};
  const explicitPrice = Number(item?.price);
  const baseGarmentPrice = Number(garment?.base_price) || 22990;

  if (size && sp[size] !== undefined && sp[size] !== null && Number(sp[size]) >= 1000) {
    const customSizePrice = Number(sp[size]);
    if (!Number.isNaN(explicitPrice) && explicitPrice > 0 && explicitPrice !== baseGarmentPrice) {
      return Math.max(1000, explicitPrice + (customSizePrice - baseGarmentPrice));
    }
    return customSizePrice;
  }

  if (!Number.isNaN(explicitPrice) && explicitPrice > 0) {
    return explicitPrice;
  }
  return baseGarmentPrice;
}

/**
 * Construye el objeto de orden de carrito a partir de una tarjeta del catálogo / lookbook.
 */
export function buildCatalogCartItem(item, garment) {
  const gId = item.garment_id || item.garmentId || garment?.id || "garment-polera-heavyweight-240";
  const availableSizes = (garment?.sizes && garment.sizes.length > 0) ? garment.sizes : ["S", "M", "L", "XL", "XXL"];
  const selectedSize = (item.selectedSize && availableSizes.includes(item.selectedSize))
    ? item.selectedSize
    : (availableSizes.includes("L") ? "L" : availableSizes[0]);
  const unitPrice = resolveItemPrice(item, garment, selectedSize);

  const colorHex = item.colorHex || "#121212";
  const colorObj = (item.availableColors || []).find(c => (c.hex || "").toLowerCase() === colorHex.toLowerCase());
  const selectedColor = {
    name: colorObj?.name || "Negro",
    hex_code: colorHex,
    in_stock: true
  };

  const prints = [];
  if (item.frontArt) {
    prints.push({
      id: `prn-cat-front-${item.id}`,
      view: "front",
      print_size: item.frontArt.suggestedSize || "A4",
      design_name: item.frontArt.name || `${item.name} (Frente)`,
      design_image_url: item.photo_front || item.photoFront || null,
      offset_x_pct: parseFloat(item.frontSpecs?.left) || 50.0,
      offset_y_pct: parseFloat(item.frontSpecs?.top) || 38.0,
      scale_factor: 1.0,
      calculated_dtf_cost: 0
    });
  }
  if (item.backArt) {
    prints.push({
      id: `prn-cat-back-${item.id}`,
      view: "back",
      print_size: item.backArt.suggestedSize || "A3",
      design_name: item.backArt.name || `${item.name} (Espalda)`,
      design_image_url: item.photo_back || item.photoBack || null,
      offset_x_pct: parseFloat(item.backSpecs?.left) || 50.0,
      offset_y_pct: parseFloat(item.backSpecs?.top) || 42.0,
      scale_factor: 1.0,
      calculated_dtf_cost: 0
    });
  }

  const frontSummary = item.frontArt
    ? `${item.frontArt.suggestedSize || 'A4'} (${item.frontArt.name || 'Arte Frontal'})`
    : 'Cara Lisa';
  const backSummary = item.backArt
    ? `${item.backArt.suggestedSize || 'A3'} (${item.backArt.name || 'Arte Espalda'})`
    : 'Cara Lisa';

  return {
    garment_id: gId,
    garment_name: item.name || garment?.name || "Prenda Catálogo",
    selected_color: selectedColor,
    selected_size: selectedSize,
    preview_front_summary: frontSummary,
    preview_back_summary: backSummary,
    prints,
    quantity: 1,
    unit_price: unitPrice,
    subtotal: unitPrice
  };
}

/**
 * Renderizador agnóstico de tarjetas de producto con estética técnica (grilla del catálogo).
 */
export function renderProductCardMarkup(item, garments = [], categories = DEFAULT_CATALOG_CATEGORIES) {
  const garmentId = item.garment_id || item.garmentId;
  const garment = (garments || []).find(g => g.id === garmentId);
  const isGarmentAvailable = garment ? garment.is_active !== false : true;
  const isBack = item.currentView === "back";
  const viewMode = item.viewMode || "photo";

  const availableSizes = (garment?.sizes && garment.sizes.length > 0) ? garment.sizes : ["S", "M", "L", "XL", "XXL"];
  const selectedSize = (item.selectedSize && availableSizes.includes(item.selectedSize))
    ? item.selectedSize
    : (availableSizes.includes("L") ? "L" : availableSizes[0]);
  const finalPrice = resolveItemPrice(item, garment, selectedSize);
  const defaultRefPrice = resolveItemPrice(item, garment, availableSizes.includes("L") ? "L" : availableSizes[0]);

  const catObj = (categories || []).find(c => c.id === item.category);
  const categoryLabel = catObj ? catObj.label : (item.category || "Colección");
  const subcategoryLabel = item.subcategory || "";

  const realPhotoFrontSrc = item.photo_front || item.photoFront || garment?.photo_front || '/static/assets/garments/tshirt_front.png';
  const realPhotoBackSrc = item.photo_back || item.photoBack || garment?.photo_back || '/static/assets/garments/tshirt_back.png';
  const galleryImages = Array.isArray(item.gallery_images) ? item.gallery_images.filter(Boolean) : [];
  const observationText = (item.observation || garment?.observation || "").trim();

  const isCustomFrontPhoto = !!(item.photo_front || item.photoFront);
  const isCustomBackPhoto = !!(item.photo_back || item.photoBack);
  const hasCustomPhotos = isCustomFrontPhoto || isCustomBackPhoto;
  const showCustomFront = isCustomFrontPhoto && viewMode === 'photo';
  const showCustomBack = isCustomBackPhoto && viewMode === 'photo';

  const garmentSvgFront = SVG_GARMENTS[`${item.garmentType}_front`]
    ? SVG_GARMENTS[`${item.garmentType}_front`](item.colorHex)
    : SVG_GARMENTS.tshirt_front(item.colorHex);

  const garmentSvgBack = SVG_GARMENTS[`${item.garmentType}_back`]
    ? SVG_GARMENTS[`${item.garmentType}_back`](item.colorHex)
    : SVG_GARMENTS.tshirt_back(item.colorHex);

  return `
    <div class="collection-card-pro corner-brackets reactive-border ${!isGarmentAvailable ? 'is-garment-disabled' : ''}" data-card-id="${item.id}" data-category="${item.category || ''}" data-subcategory="${subcategoryLabel}">
      <div class="card-pro-top-bar" style="display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
        <div style="display: flex; flex-direction: column; gap: 0.2rem;">
          <span class="tech-tag">SPEC // <strong>${item.badge}</strong></span>
          ${subcategoryLabel ? `<span class="card-subcat-tag">${categoryLabel} • <strong>${subcategoryLabel}</strong></span>` : ''}
        </div>
        <div style="display: flex; gap: 0.35rem; align-items: center;">
          ${hasCustomPhotos ? `
          <button class="card-view-btn mode-toggle-btn ${viewMode === 'photo' ? 'active' : ''}" data-toggle-mode="${item.id}" title="Alternar entre Foto Real y Simulación Técnica" style="font-size: 0.65rem; padding: 0.2rem 0.5rem;">
            <span class="material-symbols-outlined" style="font-size: 13px;" aria-hidden="true">${viewMode === 'photo' ? 'photo_camera' : 'architecture'}</span>
            <span>${viewMode === 'photo' ? 'FOTO' : 'TÉCNICO'}</span>
          </button>
          ` : ''}
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

      <div class="card-pro-viewport" data-flip-viewport="${item.id}" data-color-hex="${item.colorHex}" data-view="${item.currentView}" title="Clic para voltear Frente / Espalda">
        <div class="card-pro-flip-stage">
          <div class="card-pro-flip-flipper ${isBack ? 'is-flipped' : ''}">
            <!-- CARA FRONTAL -->
            <div class="card-pro-flip-face card-pro-face-front" aria-hidden="${isBack ? 'true' : 'false'}">
              <div class="card-pro-garment-wrap">
                ${showCustomFront ? `
                  <img src="${realPhotoFrontSrc}" alt="${item.name} Frontal" class="card-real-photo-img" onerror="this.src='/static/assets/garments/tshirt_front.png'">
                ` : `
                  ${garmentSvgFront}
                `}
              </div>
              ${(!showCustomFront) ? `
              <div class="card-pro-artwork-overlay" style="top: ${item.frontSpecs.top}; left: ${item.frontSpecs.left}; width: ${item.frontSpecs.width}; height: ${item.frontSpecs.height};">
                ${item.frontArt.svgContent}
              </div>
              ` : ''}
            </div>

            <!-- CARA TRASERA (ROTADA 180 DEG) -->
            <div class="card-pro-flip-face card-pro-face-back" aria-hidden="${!isBack ? 'true' : 'false'}">
              <div class="card-pro-garment-wrap">
                ${showCustomBack ? `
                  <img src="${realPhotoBackSrc}" alt="${item.name} Espalda" class="card-real-photo-img" onerror="this.src='/static/assets/garments/tshirt_back.png'">
                ` : `
                  ${garmentSvgBack}
                `}
              </div>
              ${(!showCustomBack) ? `
              <div class="card-pro-artwork-overlay" style="top: ${item.backSpecs.top}; left: ${item.backSpecs.left}; width: ${item.backSpecs.width}; height: ${item.backSpecs.height};">
                ${item.backArt.svgContent}
              </div>
              ` : ''}
            </div>
          </div>
        </div>

        <div class="card-face-indicator">
          <span class="material-symbols-outlined" style="font-size: 13px;" aria-hidden="true">${(hasCustomPhotos && viewMode === 'photo') ? 'photo_camera' : 'architecture'}</span>
          <span>${(hasCustomPhotos && viewMode === 'photo') ? 'FOTO REAL' : 'SIMULACIÓN ATELIER'}</span> • <span class="card-face-text">${isBack ? 'ESPALDA' : 'FRENTE'}</span>
        </div>
      </div>

      ${galleryImages.length > 0 ? `
        <div class="card-gallery-thumbnails-strip">
          ${[
            { label: 'Frente', url: realPhotoFrontSrc },
            { label: 'Espalda', url: realPhotoBackSrc },
            ...galleryImages.map((gUrl, idx) => ({ label: `Foto ${idx + 1}`, url: gUrl }))
          ].map((photo, pIdx) => `
            <button type="button"
                    class="card-gallery-thumb-btn ${pIdx === 0 ? 'active' : ''}"
                    data-gallery-target-card="${item.id}"
                    data-photo-url="${photo.url}"
                    title="Ver ${photo.label}">
              <img src="${photo.url}" alt="${photo.label}" onerror="this.src='/static/assets/garments/tshirt_front.png'">
            </button>
          `).join('')}
        </div>
      ` : ''}

      <div class="card-pro-footer">
        ${observationText ? `
          <div class="card-observation-badge" title="Especificaciones técnicas y medidas">
            <span class="material-symbols-outlined" style="font-size: 13px; color: var(--accent-admin);">tune</span>
            <span>SPEC // ${observationText}</span>
          </div>
        ` : ''}

        <div class="card-pro-title-row">
          <h4 class="card-pro-name">${item.name}</h4>
          <div class="card-pro-price">$${finalPrice.toLocaleString('es-CL')} <small>CLP</small></div>
        </div>

        <div class="card-pro-colors-row">
          <span class="card-colors-label">Color:</span>
          <div class="card-swatches-list" style="display: flex; align-items: center; gap: 0.45rem;">
            <button class="card-swatch-dot active" 
                    style="background: #121212; border: 1px solid rgba(255, 255, 255, 0.4);" 
                    title="Negro Industrial #121212"
                    data-card-id="${item.id}" 
                    data-color-hex="#121212">
            </button>
            <span style="font-size: 0.7rem; color: var(--text-muted); font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.05em;">
              Negro Industrial // All-Black
            </span>
          </div>
        </div>

        <div class="card-pro-sizes-row">
          <span class="card-colors-label">Talla:</span>
          <div class="card-sizes-list" role="group" aria-label="Seleccionar talla">
            ${availableSizes.map(sz => {
              const szPrice = resolveItemPrice(item, garment, sz);
              const isDiff = szPrice !== defaultRefPrice;
              return `
                <button type="button"
                        class="card-size-pill ${sz === selectedSize ? 'active' : ''} ${isDiff ? 'has-diff-price' : ''}"
                        data-card-size="${sz}"
                        data-card-id="${item.id}"
                        ${!isGarmentAvailable ? 'disabled' : ''}
                        title="Talla ${sz} — $${szPrice.toLocaleString('es-CL')} CLP">
                  ${sz}
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <div class="card-pro-actions">
          ${isGarmentAvailable ? `
            <button type="button" class="btn btn-primary card-action-custom-btn" data-add-to-cart="${item.id}">
              <span class="material-symbols-outlined" style="font-size: 16px;">add_shopping_cart</span>
              AGREGAR AL CARRO
            </button>
          ` : `
            <button type="button" class="btn btn-secondary card-action-custom-btn" disabled aria-disabled="true" style="opacity: 0.6; cursor: not-allowed;">
              <span class="material-symbols-outlined" style="font-size: 16px;">block</span>
              NO DISPONIBLE / SIN STOCK
            </button>
          `}
        </div>
      </div>
    </div>
  `;
}
