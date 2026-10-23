// Submódulo del CMS: Editor de las prendas destacadas del Lookbook, Categorías, Subcategorías y Galería Multi-imagen.
// Renderiza el gestor de categorías/subcategorías de filtro y las tarjetas de cada prenda
// para sincronizarlas con el backend y con la vitrina pública.

export const DEFAULT_LOOKBOOK_CATEGORIES = [
  {
    id: "urbanas",
    label: "Urbanas",
    subcategories: ["Oversized 240g", "Boxy Fit", "Acid Wash", "Gráfica Cyber"]
  },
  {
    id: "hoodies",
    label: "Hoodies",
    subcategories: ["Canguro 320g", "Crewneck 300g", "Zip Heavy"]
  },
  {
    id: "minimalista",
    label: "Minimalista",
    subcategories: ["Essential 180g", "Tonal Studio", "Monocromo"]
  },
  {
    id: "propios",
    label: "Diseños Propios",
    subcategories: ["Edición Taller", "Mecha Series", "Archivo Tokio"]
  }
];

export const DEFAULT_LOOKBOOK_ITEMS = [
  {
    id: "col-polera-cyber-kanji",
    name: "Polera Oversized 'Cyber Kanji 2026'",
    badge: "240g Peinado • Heavyweight",
    category: "urbanas",
    subcategory: "Oversized 240g",
    price: 22990,
    garment_id: "garment-polera-heavyweight-240",
    photo_front: "/static/assets/catalog/kanji_front_v2.png",
    photo_back: "/static/assets/catalog/kanji_back_v2.png",
    gallery_images: [],
    observation: "Corte drop shoulder relajado con cuello en rib reforzado de 3cm."
  },
  {
    id: "col-hoodie-mecha-unit",
    name: "Hoodie Canguro 'Mecha Unit Eva-01'",
    badge: "320g Afelpado • Heavyweight",
    category: "hoodies",
    subcategory: "Canguro 320g",
    price: 34990,
    garment_id: "garment-poleron-hoodie-320",
    photo_front: "/static/assets/garments/hoodie_front.png",
    photo_back: "/static/assets/garments/hoodie_back.png",
    gallery_images: [],
    observation: "Interior afelpado antipilling de 320g/m² con bolsillo canguro doble costura."
  },
  {
    id: "col-polera-acid-street",
    name: "Polera Heavy 'Acid Type Streetwear'",
    badge: "240g Peinado • Drop Shoulder",
    category: "urbanas",
    subcategory: "Boxy Fit",
    price: 21990,
    garment_id: "garment-polera-heavyweight-240",
    photo_front: "/static/assets/garments/tshirt_front.png",
    photo_back: "/static/assets/garments/tshirt_back.png",
    gallery_images: [],
    observation: "Tratamiento de suavizado al tacto y costuras reforzadas de hombro a hombro."
  },
  {
    id: "col-crewneck-tokyo-minimal",
    name: "Crewneck 'Tokyo Minimalist Studio'",
    badge: "300g Peinado • Cuello Redondo",
    category: "hoodies",
    subcategory: "Crewneck 300g",
    price: 29990,
    garment_id: "garment-poleron-crewneck-300",
    photo_front: "/static/assets/garments/crewneck_front.png",
    photo_back: "/static/assets/garments/crewneck_back.png",
    gallery_images: [],
    observation: "Pretina y puños en rib 1x1 con elastano para máxima durabilidad de forma."
  },
  {
    id: "col-polera-classic-regular",
    name: "Polera Clásica Regular 'Senkai Original'",
    badge: "180g Jersey • Regular Fit",
    category: "minimalista",
    subcategory: "Essential 180g",
    price: 16990,
    garment_id: "garment-polera-classic-180",
    photo_front: "/static/assets/garments/tshirt_front.png",
    photo_back: "/static/assets/garments/tshirt_back.png",
    gallery_images: [],
    observation: "Algodón 100% transpirable de 180g/m² para uso diario intensivo."
  },
  {
    id: "col-hoodie-cyberpunk-stealth",
    name: "Hoodie Heavy 'Senkai Stealth Edition'",
    badge: "320g Afelpado • Edición Taller",
    category: "propios",
    subcategory: "Edición Taller",
    price: 35990,
    garment_id: "garment-poleron-hoodie-320",
    photo_front: "/static/assets/garments/hoodie_front.png",
    photo_back: "/static/assets/garments/hoodie_back.png",
    gallery_images: [],
    observation: "Capucha envolvente de triple panel con forro interno en algodón peinado."
  }
];

export function renderSubcategoryChipMarkup(subcatName, escapeHtml) {
  const safeName = escapeHtml(subcatName || '');
  return `
    <div class="cms-subcat-chip" data-subcat-value="${safeName}">
      <span class="cms-subcat-chip-label" title="Haz clic para renombrar esta subcategoría">${safeName}</span>
      <button type="button" class="cms-subcat-chip-edit" title="Editar nombre de subcategoría" aria-label="Editar ${safeName}">
        <span class="material-symbols-outlined">edit</span>
      </button>
      <button type="button" class="cms-subcat-chip-remove" title="Eliminar subcategoría" aria-label="Eliminar ${safeName}">
        &times;
      </button>
    </div>
  `;
}

export function renderCategoryRowMarkup(cat, idx, escapeHtml) {
  const subcats = Array.isArray(cat.subcategories) ? cat.subcategories.filter(Boolean) : [];
  const subcatsStr = subcats.join(', ');
  const safeId = escapeHtml(cat.id || '');
  const safeLabel = escapeHtml(cat.label || '');

  return `
    <div class="cms-category-row" data-cat-index="${idx}" data-original-id="${safeId}">
      <div class="cms-category-row-top">
        <div class="cms-field-group" style="margin: 0;">
          <label class="cms-label" style="font-size: 0.68rem;">Nombre Visible de la Categoría (Pestaña)</label>
          <input type="text" class="cms-input" data-cat-field="label" value="${safeLabel}" placeholder="Ej: Poleras Oversized (240G)">
        </div>
        <div class="cms-field-group" style="margin: 0;">
          <label class="cms-label" style="font-size: 0.68rem;">Código / Slug Interno</label>
          <input type="text" class="cms-input" data-cat-field="id" value="${safeId}" placeholder="ej: urbanas" style="font-family: var(--font-mono); font-size: 0.78rem;">
        </div>
        <button type="button" class="btn btn-secondary btn-cms-remove-category" title="Eliminar esta categoría completa" style="min-height: 40px; padding: 0 0.85rem; color: var(--accent-signal-red); border-color: rgba(239,68,68,0.35);">
          <span class="material-symbols-outlined" style="font-size: 16px;">delete</span>
          <span style="font-size: 0.72rem; font-family: var(--font-mono);">Quitar</span>
        </button>
      </div>

      <div class="cms-category-row-subcats">
        <div class="cms-subcats-header">
          <span class="cms-label" style="font-size: 0.68rem; color: var(--accent-admin);">
            Subcategorías Asociadas (clic en una etiqueta para editar su nombre o en × para borrarla)
          </span>
        </div>

        <div class="cms-subcat-chips-container">
          ${subcats.map(sub => renderSubcategoryChipMarkup(sub, escapeHtml)).join('')}
        </div>

        <div class="cms-subcat-add-bar">
          <input
            type="text"
            class="cms-input cms-subcat-new-input"
            placeholder="Escribe una nueva subcategoría y presiona Enter o '+ Agregar'..."
            maxlength="60"
          >
          <button type="button" class="btn btn-secondary btn-cms-add-subcat">
            <span class="material-symbols-outlined" style="font-size: 15px;">add</span>
            <span>+ Subcategoría</span>
          </button>
        </div>

        <input type="hidden" data-cat-field="subcategories" value="${escapeHtml(subcatsStr)}">
      </div>
    </div>
  `;
}

export function renderGalleryImageItemMarkup(itemId, gIdx, imgUrl, escapeHtml) {
  const safeImg = escapeHtml(imgUrl || '');
  const randKey = Math.random().toString(36).substring(2, 7);
  const inputId = `input-gallery-${itemId}-${gIdx}-${randKey}`;
  const thumbId = `thumb-gallery-${itemId}-${gIdx}-${randKey}`;

  return `
    <div class="cms-gallery-item-row" style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.45rem;">
      <div class="cms-media-thumb-wrap" style="width: 44px; height: 44px; min-width: 44px;">
        <img id="${thumbId}" class="cms-media-thumb" src="${safeImg || '/static/assets/garments/tshirt_front.png'}" alt="Foto galería">
      </div>
      <input type="text" id="${inputId}" class="cms-input cms-img-input" data-gallery-image="true" data-preview-target="${thumbId}" value="${safeImg}" placeholder="URL o subir foto adicional..." style="font-size: 0.78rem;">
      <button type="button" class="btn-cms-upload" data-target-input="${inputId}" title="Subir imagen optimizada WebP" style="padding: 0 0.65rem; min-height: 36px;">
        <span class="material-symbols-outlined" style="font-size: 14px;">upload</span>
      </button>
      <button type="button" class="btn btn-secondary btn-cms-remove-gallery-img" title="Quitar esta foto" style="padding: 0 0.55rem; min-height: 36px; color: var(--accent-signal-red); border-color: rgba(239,68,68,0.35);">
        <span class="material-symbols-outlined" style="font-size: 14px;">close</span>
      </button>
    </div>
  `;
}

export function renderLookbookItemCardMarkup(item, idx, garments, activeCategories, escapeHtml) {
  const itemCategoryExists = activeCategories.some(c => c.id === item.category);
  const categoryOptions = itemCategoryExists
    ? activeCategories
    : [...activeCategories, { id: item.category || 'urbanas', label: item.category || 'Urbanas', subcategories: item.subcategory ? [item.subcategory] : [] }];

  const selectedCatObj = categoryOptions.find(c => c.id === item.category) || categoryOptions[0];
  const catSubcategories = Array.isArray(selectedCatObj?.subcategories) ? [...selectedCatObj.subcategories] : [];
  if (item.subcategory && !catSubcategories.includes(item.subcategory)) {
    catSubcategories.push(item.subcategory);
  }

  const galleryImages = Array.isArray(item.gallery_images) ? item.gallery_images : [];

  return `
    <div class="cms-lookbook-item-card" data-item-id="${item.id}" data-category="${item.category || 'urbanas'}" data-garment-id="${item.garment_id || item.garmentId || 'garment-polera-heavyweight-240'}">
      <div class="cms-lookbook-item-header" style="display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span class="cms-lookbook-item-id"><strong>PIEZA 0${idx + 1} // ${escapeHtml(item.name || item.id)}</strong></span>
          <span class="badge badge-cyan cms-item-taxonomy-badge" style="font-size: 0.65rem;">${escapeHtml(selectedCatObj?.label || item.category || 'urbanas').toUpperCase()}${item.subcategory ? ` • ${escapeHtml(item.subcategory)}` : ''}</span>
        </div>
        <button type="button" class="btn btn-secondary btn-cms-remove-item" title="Quitar esta prenda de la colección" style="color: var(--accent-signal-red); border-color: rgba(239,68,68,0.35); font-size: 0.72rem; padding: 0.3rem 0.65rem;">
          <span class="material-symbols-outlined" style="font-size: 15px;">delete</span>
          <span>Quitar de Colección</span>
        </button>
      </div>

      <div class="cms-lookbook-item-grid">
        <div class="cms-field-group">
          <label class="cms-label">Nombre Comercial de la Prenda</label>
          <input type="text" class="cms-input" data-field="name" value="${escapeHtml(item.name || '')}" placeholder="Ej: Polera Heavyweight...">
        </div>

        <div class="cms-field-group">
          <label class="cms-label">Badge Técnico / Etiqueta</label>
          <input type="text" class="cms-input" data-field="badge" value="${escapeHtml(item.badge || '')}" placeholder="Ej: 240g Peinado • Drop Shoulder">
        </div>

        <div class="cms-field-group">
          <label class="cms-label">Categoría Principal</label>
          <select class="cms-select" data-field="category">
            ${categoryOptions.map(cat => `
              <option value="${escapeHtml(cat.id)}" ${item.category === cat.id ? 'selected' : ''}>
                ${escapeHtml(cat.label)} (${escapeHtml(cat.id)})
              </option>
            `).join('')}
          </select>
        </div>

        <div class="cms-field-group">
          <label class="cms-label">
            <span>Subcategoría de Filtro</span>
            <span class="cms-label-hint">Según categoría elegida</span>
          </label>
          <select class="cms-select" data-field="subcategory">
            ${catSubcategories.length > 0 ? catSubcategories.map(sub => `
              <option value="${escapeHtml(sub)}" ${item.subcategory === sub ? 'selected' : ''}>
                ${escapeHtml(sub)}
              </option>
            `).join('') : `
              <option value="Edición Taller">Edición Taller</option>
            `}
          </select>
        </div>

        <div class="cms-field-group">
          <label class="cms-label">Precio de Venta en Vitrina (CLP)</label>
          <input type="number" class="cms-input" data-field="price" value="${item.price || 22990}" min="1000" step="500">
        </div>

        <div class="cms-field-group">
          <label class="cms-label">Prenda Base Vinculada en Inventario</label>
          <select class="cms-select" data-field="garment_id">
            ${garments.map(g => `
              <option value="${g.id}" ${(item.garment_id === g.id || item.garmentId === g.id) ? 'selected' : ''}>
                ${escapeHtml(g.name)} (${g.weight_gsm}g) — Base: $${g.base_price.toLocaleString('es-CL')} CLP
              </option>
            `).join('')}
          </select>
        </div>

        <!-- Observaciones / Especificaciones técnicas -->
        <div class="cms-field-group" style="grid-column: 1 / -1;">
          <label class="cms-label">
            <span>Observaciones Técnicas / Medidas / Especificaciones de Confección</span>
            <span class="cms-label-hint">Visible en la tarjeta de vitrina (ej: Medidas 100x150cm, gramaje especial, ojetillos)</span>
          </label>
          <input type="text" class="cms-input" data-field="observation" value="${escapeHtml(item.observation || '')}" placeholder="Ej: Medidas: 100x200cm con ojetillos perimetrales y lona mate de 440g...">
        </div>

        <!-- Foto Frontal -->
        <div class="cms-field-group cms-lookbook-photo-group">
          <label class="cms-label">
            <span>Foto Frontal Real</span>
            <span class="cms-label-hint">PNG transparente, JPG o WebP optimizado</span>
          </label>
          <div class="cms-media-row">
            <div class="cms-media-thumb-wrap">
              <img id="thumb-lookbook-${item.id}-front" class="cms-media-thumb" src="${item.photo_front || '/static/assets/garments/tshirt_front.png'}" alt="Foto frontal">
            </div>
            <div class="cms-media-body">
              <input type="text" id="input-lookbook-${item.id}-front" class="cms-input cms-img-input" data-field="photo_front" data-preview-target="thumb-lookbook-${item.id}-front" value="${escapeHtml(item.photo_front || '')}" placeholder="URL o subir archivo...">
              <div class="cms-media-actions">
                <button type="button" class="btn-cms-upload" data-target-input="input-lookbook-${item.id}-front" title="Subir foto frontal">
                  <span class="material-symbols-outlined">upload</span>
                  <span>Subir</span>
                </button>
                <button type="button" class="btn-cms-clear" data-target-input="input-lookbook-${item.id}-front" data-preview-target="thumb-lookbook-${item.id}-front" data-fallback="/static/assets/garments/tshirt_front.png" title="Limpiar y usar vector">
                  <span class="material-symbols-outlined">delete</span>
                  <span>Quitar</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Foto Trasera -->
        <div class="cms-field-group cms-lookbook-photo-group">
          <label class="cms-label">
            <span>Foto Trasera Real</span>
            <span class="cms-label-hint">Espalda de prenda con o sin estampa</span>
          </label>
          <div class="cms-media-row">
            <div class="cms-media-thumb-wrap">
              <img id="thumb-lookbook-${item.id}-back" class="cms-media-thumb" src="${item.photo_back || '/static/assets/garments/tshirt_back.png'}" alt="Foto trasera">
            </div>
            <div class="cms-media-body">
              <input type="text" id="input-lookbook-${item.id}-back" class="cms-input cms-img-input" data-field="photo_back" data-preview-target="thumb-lookbook-${item.id}-back" value="${escapeHtml(item.photo_back || '')}" placeholder="URL o subir archivo...">
              <div class="cms-media-actions">
                <button type="button" class="btn-cms-upload" data-target-input="input-lookbook-${item.id}-back" title="Subir foto trasera">
                  <span class="material-symbols-outlined">upload</span>
                  <span>Subir</span>
                </button>
                <button type="button" class="btn-cms-clear" data-target-input="input-lookbook-${item.id}-back" data-preview-target="thumb-lookbook-${item.id}-back" data-fallback="/static/assets/garments/tshirt_back.png" title="Limpiar y usar vector">
                  <span class="material-symbols-outlined">delete</span>
                  <span>Quitar</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Galería Fotográfica Adicional (Multi-Imagen) -->
        <div class="cms-field-group cms-lookbook-gallery-group" style="grid-column: 1 / -1; margin-top: 0.5rem; border-top: 1px dashed var(--border-subtle); padding-top: 0.75rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
            <label class="cms-label" style="margin: 0;">
              <span class="material-symbols-outlined" style="font-size: 16px; vertical-align: middle; color: var(--accent-admin);">collections</span>
              <span>Galería Fotográfica Adicional (Formatos WebP / PNG / JPG)</span>
            </label>
            <button type="button" class="btn btn-secondary btn-cms-add-gallery-img" data-item-id="${item.id}" style="font-size: 0.72rem; padding: 0.25rem 0.65rem;">
              <span class="material-symbols-outlined" style="font-size: 14px;">add_photo_alternate</span>
              <span>+ Añadir Foto a Galería</span>
            </button>
          </div>
          <div class="cms-gallery-items-container" data-item-id="${item.id}">
            ${galleryImages.map((imgUrl, gIdx) => renderGalleryImageItemMarkup(item.id, gIdx, imgUrl, escapeHtml)).join('')}
          </div>
        </div>

      </div>
    </div>
  `;
}

// Genero el HTML de la tarjeta de administración del Lookbook y Categorías
export function renderLookbookSection(lookbookItems, garments, escapeHtml, categories = DEFAULT_LOOKBOOK_CATEGORIES, catalogHeaders = {}) {
  const activeCategories = Array.isArray(categories) && categories.length > 0
    ? categories
    : DEFAULT_LOOKBOOK_CATEGORIES;

  const allSubcategories = Array.from(
    new Set(
      activeCategories.flatMap(c => Array.isArray(c.subcategories) ? c.subcategories : [])
    )
  );

  return `
    <div class="cms-card" id="cms-section-lookbook" data-section="lookbook" style="grid-column: 1 / -1; border-color: var(--border-strong);">
      <div class="cms-card-header">
        <div class="cms-card-title">
          <span class="material-symbols-outlined" style="font-size: 18px; color: var(--accent-admin);">apparel</span>
          <span>Prendas de Catálogo, Categorías, Subcategorías & Carrusel</span>
        </div>
        <span class="badge badge-crimson">CATÁLOGO & FILTROS</span>
      </div>

      <div class="cms-lookbook-notice">
        <span class="material-symbols-outlined" style="font-size: 16px; color: var(--accent-admin); vertical-align: middle;">info</span>
        <span><strong>Gestor Integral de Colecciones:</strong> Puedes agregar tantas piezas como desees con <strong>+ AGREGAR PRENDA AL CATÁLOGO</strong>, subir múltiples fotos por prenda a su galería en formato WebP liviano, agregar especificaciones u observaciones técnicas, y quitar prendas con <strong>Quitar de Colección</strong>. Los cambios se sincronizan en vivo.</span>
      </div>

      <!-- ENCABEZADOS PRINCIPALES DE LA ZONA DE CATÁLOGO / VITRINA -->
      <div class="cms-categories-manager-box" style="margin-bottom: 1.25rem;">
        <div class="cms-categories-manager-header">
          <div>
            <h4 style="font-family: var(--font-display); font-size: 0.98rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-primary); margin: 0;">
              Encabezados de la Zona de Catálogo & Colecciones
            </h4>
            <p style="font-size: 0.78rem; color: var(--text-muted); margin: 0.2rem 0 0;">
              Define el título, tag y texto descriptivo que los clientes ven sobre la grilla de productos en la vitrina pública.
            </p>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 0.75rem; margin-top: 0.85rem;">
          <div class="cms-field-group">
            <label class="cms-label" for="cms-lookbook-catalog-tag">Tag Superior Catálogo</label>
            <input type="text" id="cms-lookbook-catalog-tag" class="cms-input" maxlength="60" value="${escapeHtml(catalogHeaders?.catalog_tag || 'LOOKBOOK 2026 // EDICIÓN LIMITADA')}">
          </div>
          <div class="cms-field-group">
            <label class="cms-label" for="cms-lookbook-catalog-title">Título de la Zona de Catálogo</label>
            <input type="text" id="cms-lookbook-catalog-title" class="cms-input" maxlength="100" value="${escapeHtml(catalogHeaders?.catalog_title || 'Bases y Prendas de Taller')}">
          </div>
        </div>
        <div class="cms-field-group" style="margin-top: 0.65rem;">
          <label class="cms-label" for="cms-lookbook-catalog-desc">Descripción de la Zona de Catálogo</label>
          <textarea id="cms-lookbook-catalog-desc" class="cms-textarea" style="min-height: 55px;">${escapeHtml(catalogHeaders?.catalog_desc || 'Confección en algodón pesado de 240g a 320g con estampados DTF de alta resolución.')}</textarea>
        </div>
      </div>

      <!-- GESTOR DE CATEGORÍAS Y SUBCATEGORÍAS DEL CATÁLOGO -->
      <div class="cms-categories-manager-box">
        <div class="cms-categories-manager-header">
          <div>
            <h4 style="font-family: var(--font-display); font-size: 1rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-primary); margin: 0;">
              1. Categorías y Subcategorías de Filtro (Vitrina Principal)
            </h4>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin: 0.25rem 0 0;">
              Administra las pestañas principales del catálogo y sus etiquetas de subcategoría con edición directa.
            </p>
          </div>
          <div class="cms-categories-manager-actions">
            <button type="button" class="btn btn-secondary" id="cmsAddCategoryBtn" style="font-size: 0.76rem; padding: 0.55rem 1rem;">
              <span class="material-symbols-outlined" style="font-size: 16px;">add_circle</span>
              <span>+ Agregar Categoría</span>
            </button>
            <button type="button" class="btn-cms-save" data-action="save-section" data-target="lookbook" style="font-size: 0.76rem; padding: 0.55rem 1.15rem;">
              <span class="material-symbols-outlined" style="font-size: 16px;">save</span>
              <span>Guardar Categorías y Subcategorías</span>
            </button>
          </div>
        </div>

        <div id="cmsCategoriesRowsContainer">
          ${activeCategories.map((cat, idx) => renderCategoryRowMarkup(cat, idx, escapeHtml)).join('')}
        </div>
      </div>

      <datalist id="cms-subcategories-datalist">
        ${allSubcategories.map(sub => `<option value="${escapeHtml(sub)}"></option>`).join('')}
      </datalist>

      <div style="margin: 0.5rem 0 0.25rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
        <div>
          <h4 style="font-family: var(--font-display); font-size: 0.98rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-primary); margin: 0;">
            2. Asignación por Prenda Destacada (Catálogo & Carrusel)
          </h4>
          <p style="font-size: 0.78rem; color: var(--text-muted); margin: 0.2rem 0 0;">
            Configura todas las piezas de la colección: imágenes principales, galería adicional, observaciones y precios.
          </p>
        </div>
        <button type="button" class="btn btn-secondary" id="cmsAddLookbookItemBtnTop" style="font-size: 0.76rem; padding: 0.5rem 0.95rem;">
          <span class="material-symbols-outlined" style="font-size: 16px;">add_circle</span>
          <span>+ Agregar Prenda</span>
        </button>
      </div>

      <div class="cms-lookbook-list">
        ${lookbookItems.map((item, idx) => renderLookbookItemCardMarkup(item, idx, garments, activeCategories, escapeHtml)).join('')}
      </div>

      <div class="cms-lookbook-actions-bar" style="margin: 1.25rem 0; display: flex; justify-content: center;">
        <button type="button" class="btn btn-secondary" id="cmsAddLookbookItemBtn" style="font-size: 0.85rem; padding: 0.75rem 1.5rem; border-color: var(--accent-admin); color: var(--accent-admin);">
          <span class="material-symbols-outlined" style="font-size: 18px;">add_circle</span>
          <span>+ AGREGAR NUEVA PRENDA AL CATÁLOGO / LOOKBOOK</span>
        </button>
      </div>

      <div class="cms-card-footer" style="display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap;">
        <button type="button" class="btn btn-secondary" data-action="reset-lookbook-defaults" style="font-size: 0.8rem; padding: 0.65rem 1rem;">
          <span class="material-symbols-outlined" style="font-size: 16px;">restore</span>
          <span>Restaurar Prendas y Categorías por Defecto</span>
        </button>

        <button type="button" class="btn-cms-save" data-action="save-section" data-target="lookbook">
          <span class="material-symbols-outlined" style="font-size: 16px;">save</span>
          <span>Guardar Catálogo / Lookbook</span>
        </button>
      </div>
    </div>
  `;
}

// Recopilo los datos del formulario de categorías y prendas para armar el payload del backend
export function collectLookbookPayload(container) {
  const categoryRows = container.querySelectorAll('.cms-category-row');
  const categories = Array.from(categoryRows).map(row => {
    const idInput = row.querySelector('[data-cat-field="id"]');
    const labelInput = row.querySelector('[data-cat-field="label"]');
    const subcatsInput = row.querySelector('[data-cat-field="subcategories"]');
    const chipEls = row.querySelectorAll('.cms-subcat-chip');

    const rawLabel = labelInput ? labelInput.value.trim() : '';
    const rawId = (idInput ? idInput.value.trim() : '') || rawLabel;
    const normalizedId = rawId
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'categoria';

    let subcategories = [];
    if (chipEls && chipEls.length > 0) {
      subcategories = Array.from(chipEls)
        .map(chip => (chip.dataset.subcatValue || chip.querySelector('.cms-subcat-chip-label')?.textContent || '').trim())
        .filter(Boolean);
    } else if (subcatsInput && subcatsInput.value) {
      subcategories = subcatsInput.value.split(',').map(s => s.trim()).filter(Boolean);
    }

    return {
      id: normalizedId,
      label: rawLabel || normalizedId.toUpperCase(),
      subcategories
    };
  }).filter(c => c.id && c.label);

  const cards = container.querySelectorAll('.cms-lookbook-item-card');
  const items = Array.from(cards).map(card => {
    const id = card.dataset.itemId;
    const garmentSelect = card.querySelector('[data-field="garment_id"]');
    const categorySelect = card.querySelector('[data-field="category"]');
    const subcategoryInput = card.querySelector('[data-field="subcategory"]');
    const garmentId = garmentSelect ? garmentSelect.value : (card.dataset.garmentId || "garment-polera-heavyweight-240");
    const category = categorySelect ? categorySelect.value : (card.dataset.category || "urbanas");
    const subcategory = subcategoryInput && subcategoryInput.value.trim() ? subcategoryInput.value.trim() : null;
    const nameInput = card.querySelector('[data-field="name"]');
    const badgeInput = card.querySelector('[data-field="badge"]');
    const priceInput = card.querySelector('[data-field="price"]');
    const frontInput = card.querySelector('[data-field="photo_front"]');
    const backInput = card.querySelector('[data-field="photo_back"]');
    const observationInput = card.querySelector('[data-field="observation"]');

    const galleryInputs = card.querySelectorAll('[data-gallery-image]');
    const gallery_images = Array.from(galleryInputs)
      .map(inp => inp.value.trim())
      .filter(Boolean);

    // Si la prenda define una subcategoría nueva, me aseguro de registrarla en su categoría
    if (subcategory) {
      const targetCat = categories.find(c => c.id === category);
      if (targetCat && !targetCat.subcategories.includes(subcategory)) {
        targetCat.subcategories.push(subcategory);
      }
    }

    return {
      id: id || `col-item-${Date.now().toString(36)}`,
      name: (nameInput && nameInput.value.trim()) || "Prenda de Colección",
      badge: (badgeInput && badgeInput.value.trim()) || "Edición Taller",
      category: category || "urbanas",
      subcategory: subcategory || "Edición Taller",
      price: parseInt(priceInput ? priceInput.value : 22990, 10) || 22990,
      garment_id: garmentId || "garment-polera-heavyweight-240",
      photo_front: frontInput && frontInput.value.trim() ? frontInput.value.trim() : null,
      photo_back: backInput && backInput.value.trim() ? backInput.value.trim() : null,
      gallery_images,
      observation: observationInput && observationInput.value.trim() ? observationInput.value.trim() : null
    };
  });

  const tagInp = container.querySelector('#cms-lookbook-catalog-tag') || document.getElementById('cms-headers-catalog-tag');
  const titleInp = container.querySelector('#cms-lookbook-catalog-title') || document.getElementById('cms-headers-catalog-title');
  const descInp = container.querySelector('#cms-lookbook-catalog-desc') || document.getElementById('cms-headers-catalog-desc');

  const catalogHeadersPayload = {
    catalog_tag: tagInp && tagInp.value.trim() ? tagInp.value.trim() : 'LOOKBOOK 2026 // EDICIÓN LIMITADA',
    catalog_title: titleInp && titleInp.value.trim() ? titleInp.value.trim() : 'Bases y Prendas de Taller',
    catalog_desc: descInp ? descInp.value.trim() : ''
  };

  return {
    items,
    categories: categories.length > 0 ? categories : DEFAULT_LOOKBOOK_CATEGORIES,
    catalogHeaders: catalogHeadersPayload
  };
}
