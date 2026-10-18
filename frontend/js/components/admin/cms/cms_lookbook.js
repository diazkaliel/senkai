// Submódulo del CMS: Editor de las 6 prendas destacadas del Lookbook, Categorías, Subcategorías y Carrusel.
// Acá renderizo el gestor de categorías/subcategorías de filtro y las tarjetas de cada prenda
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
    photo_back: "/static/assets/catalog/kanji_back_v2.png"
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
    photo_back: "/static/assets/garments/hoodie_back.png"
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
    photo_back: "/static/assets/garments/tshirt_back.png"
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
    photo_back: "/static/assets/garments/crewneck_back.png"
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
    photo_back: "/static/assets/garments/tshirt_back.png"
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
    photo_back: "/static/assets/garments/hoodie_back.png"
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

// Genero el HTML de la tarjeta de administración del Lookbook y Categorías
export function renderLookbookSection(lookbookItems, garments, escapeHtml, categories = DEFAULT_LOOKBOOK_CATEGORIES) {
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
        <span><strong>Gestor Visual de Categorías y Subcategorías:</strong> Crea nuevas categorías con <strong>+ Agregar Categoría</strong>, añade subcategorías escribiendo su nombre y pulsando <strong>+ Subcategoría</strong> (o Enter), edita cualquier subcategoría haciendo clic sobre su etiqueta, o elimínala con <strong>&times;</strong>. Usa el botón <strong>Guardar Categorías y Subcategorías</strong> para aplicar los cambios en la tienda al instante.</span>
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

      <div style="margin: 0.5rem 0 0.25rem;">
        <h4 style="font-family: var(--font-display); font-size: 0.98rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-primary); margin: 0;">
          2. Asignación por Prenda Destacada (Catálogo & Carrusel)
        </h4>
        <p style="font-size: 0.78rem; color: var(--text-muted); margin: 0.2rem 0 0;">
          Selecciona a qué Categoría y Subcategoría pertenece cada prenda publicada en la vitrina.
        </p>
      </div>

      <div class="cms-lookbook-list">
        ${lookbookItems.map((item, idx) => {
          const itemCategoryExists = activeCategories.some(c => c.id === item.category);
          const categoryOptions = itemCategoryExists
            ? activeCategories
            : [...activeCategories, { id: item.category || 'urbanas', label: item.category || 'Urbanas', subcategories: item.subcategory ? [item.subcategory] : [] }];

          const selectedCatObj = categoryOptions.find(c => c.id === item.category) || categoryOptions[0];
          const catSubcategories = Array.isArray(selectedCatObj?.subcategories) ? [...selectedCatObj.subcategories] : [];
          if (item.subcategory && !catSubcategories.includes(item.subcategory)) {
            catSubcategories.push(item.subcategory);
          }

          return `
          <div class="cms-lookbook-item-card" data-item-id="${item.id}" data-category="${item.category || 'urbanas'}" data-garment-id="${item.garment_id || item.garmentId || 'garment-polera-heavyweight-240'}">
            <div class="cms-lookbook-item-header">
              <span class="cms-lookbook-item-id"><strong>SLIDE 0${idx + 1} // ${escapeHtml(item.name || item.id)}</strong></span>
              <span class="badge badge-cyan cms-item-taxonomy-badge" style="font-size: 0.65rem;">${escapeHtml(selectedCatObj?.label || item.category || 'urbanas').toUpperCase()}${item.subcategory ? ` • ${escapeHtml(item.subcategory)}` : ''}</span>
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

              <!-- Foto Frontal -->
              <div class="cms-field-group cms-lookbook-photo-group">
                <label class="cms-label">
                  <span>Foto Frontal Real</span>
                  <span class="cms-label-hint">PNG transparente o fondo neutro</span>
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

            </div>
          </div>
        `}).join('')}
      </div>

      <div class="cms-card-footer" style="display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap;">
        <button type="button" class="btn btn-secondary" data-action="reset-lookbook-defaults" style="font-size: 0.8rem; padding: 0.65rem 1rem;">
          <span class="material-symbols-outlined" style="font-size: 16px;">restore</span>
          <span>Restaurar Prendas y Categorías por Defecto</span>
        </button>

        <button class="btn-cms-save" data-action="save-section" data-target="lookbook">
          <span class="material-symbols-outlined" style="font-size: 16px;">save</span>
          <span>Guardar Catálogo / Lookbook</span>
        </button>
      </div>
    </div>
  `;
}

// Recopilo los datos del formulario de categorías y las 6 prendas para armar el payload del backend
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

    // Si la prenda define una subcategoría nueva, me aseguro de registrarla en su categoría
    if (subcategory) {
      const targetCat = categories.find(c => c.id === category);
      if (targetCat && !targetCat.subcategories.includes(subcategory)) {
        targetCat.subcategories.push(subcategory);
      }
    }

    return {
      id,
      name: nameInput ? nameInput.value.trim() : "Prenda",
      badge: badgeInput ? badgeInput.value.trim() : "Edición Taller",
      category,
      subcategory,
      price: parseInt(priceInput ? priceInput.value : 22990, 10) || 22990,
      garment_id: garmentId,
      photo_front: frontInput && frontInput.value.trim() ? frontInput.value.trim() : null,
      photo_back: backInput && backInput.value.trim() ? backInput.value.trim() : null
    };
  });

  return {
    items,
    categories: categories.length > 0 ? categories : DEFAULT_LOOKBOOK_CATEGORIES
  };
}


