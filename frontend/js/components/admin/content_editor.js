// Editor CMS de la vitrina pública de Senkai DTF Studio.
// Este componente orquesta los submódulos de edición de cada sección (Lookbook, Hero,
// Editorial, Anuncios, Marquee, Encabezados, Stats, Manifiesto, Protocolo y Contacto)
// permitiendo guardar cambios de forma atómica en el backend mediante FastAPI y Pydantic v2.

import { apiService } from '../../services/api.js?v=20261022_v1';
import {
  DEFAULT_LOOKBOOK_ITEMS,
  DEFAULT_LOOKBOOK_CATEGORIES,
  renderSubcategoryChipMarkup,
  renderCategoryRowMarkup,
  renderLookbookItemCardMarkup,
  renderGalleryImageItemMarkup,
  renderLookbookSection,
  collectLookbookPayload
} from './cms/cms_lookbook.js?v=20261022_v1';
import { renderHeroSection, collectHeroPayload } from './cms/cms_hero.js?v=20261022_v1';
import { renderEditorialSection, collectEditorialPayload } from './cms/cms_editorial.js?v=20261022_v1';
import {
  renderAnnouncementSection, collectAnnouncementPayload,
  renderMarqueeSection, collectMarqueePayload,
  renderHeadersSection, collectHeadersPayload,
  renderStatsSection, collectStatsPayload,
  renderStatementSection, collectStatementPayload,
  renderProtocolSection, collectProtocolPayload,
  renderContactSection, collectContactPayload
} from './cms/cms_sections.js?v=20261022_v1';
import { attachImageManagementEvents } from './cms/cms_uploader.js?v=20261022_v1';

export class ContentEditorComponent {
  constructor(container) {
    this.container = container;
    this.content = null;
    this.garments = [];
    this.toastEl = null;
  }

  // Sanitizo cadenas para evitar inyecciones al renderizar
  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  async init() {
    this.renderLoading();
    try {
      this.content = await apiService.getSiteContent();
      this.garments = (await apiService.getGarments()) || [];
      this.render();
      this.attachEvents();
    } catch (err) {
      console.error("Error al cargar configuración del CMS:", err);
      this.container.innerHTML = `
        <div style="padding: 3rem; text-align: center; color: var(--accent-signal-red);">
          <p>⚠️ Error al conectar con el servicio de contenidos.</p>
        </div>
      `;
    }
  }

  renderLoading() {
    this.container.innerHTML = `
      <div style="padding: 4rem 2rem; text-align: center; font-family: var(--font-mono); color: var(--text-muted);">
        <div class="spinner-inline" style="margin-bottom: 1rem;">⏳</div>
        <p>Cargando configuración editorial de la tienda...</p>
      </div>
    `;
  }

  render() {
    if (!this.content) return;

    const { announcement, hero, stats, statement, editorial, protocol, contact } = this.content;
    const marquee = this.content.marquee || {
      items: ["LIMITED EDITION", "NEW ARRIVAL", "HEAVYWEIGHT 240G", "DTF 300 DPI", "FLEECE 320G", "SENKAI ATELIER"],
      is_active: true
    };
    const headers = this.content.headers || {
      catalog_tag: "LOOKBOOK 2026 // EDICIÓN LIMITADA",
      catalog_title: "Streetwear Heavyweight Exclusivo",
      catalog_desc: "Prendas de alta gama confeccionadas en algodón pesado de 240g a 320g con estampados DTF de alta resolución.",
      customizer_title: "Atelier de Personalización DTF",
      customizer_desc: "Selecciona la prenda base, modula el color y posiciona tu arte con cotización en tiempo real."
    };

    // Sincronizo las 6 prendas del Lookbook combinando los valores guardados con los predeterminados
    const hasSavedItems = this.content.lookbook && Array.isArray(this.content.lookbook.items);
    const savedLookbook = hasSavedItems ? this.content.lookbook.items : null;

    const lookbookCategories = (this.content.lookbook && Array.isArray(this.content.lookbook.categories) && this.content.lookbook.categories.length > 0)
      ? this.content.lookbook.categories
      : DEFAULT_LOOKBOOK_CATEGORIES;

    const lookbookItems = (savedLookbook !== null)
      ? savedLookbook
      : DEFAULT_LOOKBOOK_ITEMS.map(defItem => ({ ...defItem }));

    this.container.innerHTML = `
      <div class="cms-panel-wrap">
        <!-- Cabecera del panel CMS -->
        <div class="cms-intro-header">
          <div>
            <h3>Gestor Editorial & Contenido Dinámico</h3>
            <p>Modifica los textos, categorías, términos y condiciones y especificaciones de la vitrina pública con validación en tiempo real.</p>
          </div>
          <div>
            <span class="badge badge-lime">SISTEMA TIPADO PYDANTIC V2</span>
          </div>
        </div>

        <!-- Barra de navegación rápida a cada sección -->
        <div class="cms-quick-nav-bar">
          <div class="cms-quick-nav-title">
            <span class="material-symbols-outlined" style="font-size: 16px; color: var(--accent-admin);">navigation</span>
            <span>Acceso Directo a Secciones del Atelier</span>
          </div>
          <div class="cms-quick-nav-buttons">
            <button type="button" class="btn-cms-jump primary-highlight" data-target-section="cms-section-lookbook">
              <span class="material-symbols-outlined" style="font-size: 15px;">apparel</span>
              <span>Catálogo, Categorías & Filtros</span>
            </button>
            <button type="button" class="btn-cms-jump primary-highlight" data-target-section="cms-section-protocol">
              <span class="material-symbols-outlined" style="font-size: 15px;">gavel</span>
              <span>Términos y Condiciones</span>
            </button>
            <button type="button" class="btn-cms-jump primary-highlight" data-target-section="cms-section-hero">
              <span class="material-symbols-outlined" style="font-size: 15px;">view_carousel</span>
              <span>Hero & Portada</span>
            </button>
            <button type="button" class="btn-cms-jump" data-target-section="cms-section-editorial">
              <span class="material-symbols-outlined" style="font-size: 15px;">article</span>
              <span>Narrativa Editorial</span>
            </button>
            <button type="button" class="btn-cms-jump" data-target-section="cms-section-announcement">
              <span class="material-symbols-outlined" style="font-size: 15px;">campaign</span>
              <span>Cintillo Global</span>
            </button>
            <button type="button" class="btn-cms-jump" data-target-section="cms-section-marquee">
              <span class="material-symbols-outlined" style="font-size: 15px;">repeat</span>
              <span>Cinta Marquee</span>
            </button>
            <button type="button" class="btn-cms-jump" data-target-section="cms-section-headers">
              <span class="material-symbols-outlined" style="font-size: 15px;">title</span>
              <span>Títulos Principales</span>
            </button>
            <button type="button" class="btn-cms-jump" data-target-section="cms-section-stats">
              <span class="material-symbols-outlined" style="font-size: 15px;">query_stats</span>
              <span>Parámetros DTF</span>
            </button>
            <button type="button" class="btn-cms-jump" data-target-section="cms-section-statement">
              <span class="material-symbols-outlined" style="font-size: 15px;">format_quote</span>
              <span>Manifiesto</span>
            </button>
            <button type="button" class="btn-cms-jump" data-target-section="cms-section-contact">
              <span class="material-symbols-outlined" style="font-size: 15px;">call</span>
              <span>Contacto & Taller</span>
            </button>
          </div>
        </div>

        <!-- Cuadrícula con las tarjetas de edición por sección -->
        <div class="cms-grid">
          ${renderLookbookSection(lookbookItems, this.garments, (s) => this.escapeHtml(s), lookbookCategories)}
          ${renderProtocolSection(protocol, (s) => this.escapeHtml(s))}
          ${renderHeroSection(hero, (s) => this.escapeHtml(s))}
          ${renderEditorialSection(editorial, (s) => this.escapeHtml(s))}
          ${renderAnnouncementSection(announcement, (s) => this.escapeHtml(s))}
          ${renderMarqueeSection(marquee, (s) => this.escapeHtml(s))}
          ${renderHeadersSection(headers, (s) => this.escapeHtml(s))}
          ${renderStatsSection(stats)}
          ${renderStatementSection(statement, (s) => this.escapeHtml(s))}
          ${renderContactSection(contact, (s) => this.escapeHtml(s))}
        </div>
      </div>

      <!-- Toast para avisos de guardado o errores -->
      <div id="cmsToast" class="cms-toast"></div>
    `;

    this.toastEl = document.getElementById('cmsToast');
    this.updateCharCounters();
  }

  // Contadores dinámicos de caracteres para los campos de texto restringidos
  updateCharCounters() {
    const bindCounter = (inputId, counterId, max) => {
      const el = document.getElementById(inputId);
      const counter = document.getElementById(counterId);
      if (el && counter) {
        const update = () => { counter.textContent = `${el.value.length}/${max}`; };
        el.addEventListener('input', update);
        update();
      }
    };

    bindCounter('cms-announcement-text', 'char-announcement-text', 160);
    bindCounter('cms-statement-headline', 'char-statement-headline', 80);
    bindCounter('cms-statement-body', 'char-statement-body', 500);
  }

  // Sincroniza los selectores de categoría y subcategoría en las tarjetas de prendas
  syncCategorySelectOptions() {
    const rows = this.container.querySelectorAll('.cms-category-row');
    const idRenameMap = new Map();

    const cats = Array.from(rows).map(row => {
      const idInput = row.querySelector('[data-cat-field="id"]');
      const labelInput = row.querySelector('[data-cat-field="label"]');
      const hiddenSubInput = row.querySelector('[data-cat-field="subcategories"]');
      const idVal = idInput?.value.trim() || '';
      const labelVal = labelInput?.value.trim() || '';
      const normId = (idVal || labelVal)
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '');

      const origId = row.dataset.originalId;
      if (origId && normId && origId !== normId) {
        idRenameMap.set(origId, normId);
        row.dataset.originalId = normId;
      }

      const chips = Array.from(row.querySelectorAll('.cms-subcat-chip'))
        .map(chip => (chip.dataset.subcatValue || chip.querySelector('.cms-subcat-chip-label')?.textContent || '').trim())
        .filter(Boolean);

      if (hiddenSubInput) {
        hiddenSubInput.value = chips.join(', ');
      }

      return { id: normId, label: labelVal || normId, subcategories: chips };
    }).filter(c => c.id);

    if (cats.length === 0) return;

    this.container.querySelectorAll('.cms-lookbook-item-card').forEach(card => {
      const catSelect = card.querySelector('select[data-field="category"]');
      const subSelect = card.querySelector('[data-field="subcategory"]');
      const badgeEl = card.querySelector('.cms-item-taxonomy-badge');

      if (!catSelect) return;

      let currentCat = catSelect.value;
      if (idRenameMap.has(currentCat)) {
        currentCat = idRenameMap.get(currentCat);
      }
      if (!cats.some(c => c.id === currentCat)) {
        currentCat = cats[0].id;
      }

      catSelect.innerHTML = cats.map(c => `
        <option value="${this.escapeHtml(c.id)}" ${c.id === currentCat ? 'selected' : ''}>
          ${this.escapeHtml(c.label)} (${this.escapeHtml(c.id)})
        </option>
      `).join('');

      const activeCatObj = cats.find(c => c.id === currentCat) || cats[0];
      const availableSubs = [...(activeCatObj?.subcategories || [])];

      if (subSelect) {
        const currentSub = subSelect.value || '';
        const selectedSub = availableSubs.includes(currentSub)
          ? currentSub
          : (availableSubs[0] || currentSub || 'Edición Taller');

        if (selectedSub && !availableSubs.includes(selectedSub)) {
          availableSubs.push(selectedSub);
        }

        if (subSelect.tagName === 'SELECT') {
          subSelect.innerHTML = availableSubs.map(sub => `
            <option value="${this.escapeHtml(sub)}" ${sub === selectedSub ? 'selected' : ''}>
              ${this.escapeHtml(sub)}
            </option>
          `).join('');
        }
      }

      if (badgeEl) {
        const subText = subSelect ? subSelect.value : '';
        badgeEl.textContent = `${(activeCatObj?.label || currentCat).toUpperCase()}${subText ? ` • ${subText}` : ''}`;
      }
    });
  }

  // Activa edición en línea de una etiqueta (chip) de subcategoría
  startSubcategoryChipEdit(chipEl) {
    if (!chipEl || chipEl.classList.contains('is-editing')) return;
    const oldVal = (chipEl.dataset.subcatValue || chipEl.querySelector('.cms-subcat-chip-label')?.textContent || '').trim();
    chipEl.classList.add('is-editing');

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'cms-subcat-inline-input';
    input.value = oldVal;
    input.maxLength = 60;

    const finishEdit = (save) => {
      if (!chipEl.classList.contains('is-editing')) return;
      chipEl.classList.remove('is-editing');
      const newVal = save ? input.value.trim() : oldVal;
      const finalVal = newVal || oldVal;

      chipEl.dataset.subcatValue = finalVal;
      chipEl.innerHTML = `
        <span class="cms-subcat-chip-label" title="Haz clic para renombrar esta subcategoría">${this.escapeHtml(finalVal)}</span>
        <button type="button" class="cms-subcat-chip-edit" title="Editar nombre de subcategoría" aria-label="Editar ${this.escapeHtml(finalVal)}">
          <span class="material-symbols-outlined">edit</span>
        </button>
        <button type="button" class="cms-subcat-chip-remove" title="Eliminar subcategoría" aria-label="Eliminar ${this.escapeHtml(finalVal)}">
          &times;
        </button>
      `;

      // Si renombró la subcategoría, actualizo también las prendas que la tenían seleccionada
      if (oldVal && finalVal !== oldVal) {
        this.container.querySelectorAll('.cms-lookbook-item-card [data-field="subcategory"]').forEach(subSelect => {
          if (subSelect.value === oldVal) {
            const opt = document.createElement('option');
            opt.value = finalVal;
            opt.textContent = finalVal;
            opt.selected = true;
            subSelect.appendChild(opt);
            subSelect.value = finalVal;
          }
        });
      }

      this.syncCategorySelectOptions();
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        finishEdit(true);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        finishEdit(false);
      }
    });
    input.addEventListener('blur', () => finishEdit(true));

    chipEl.innerHTML = '';
    chipEl.appendChild(input);
    input.focus();
    input.select();
  }

  // Añade una nueva etiqueta (chip) de subcategoría dentro de una fila de categoría
  addSubcategoryChipToRow(rowEl) {
    if (!rowEl) return;
    const input = rowEl.querySelector('.cms-subcat-new-input');
    const chipsContainer = rowEl.querySelector('.cms-subcat-chips-container');
    if (!input || !chipsContainer) return;

    const rawVal = input.value.trim();
    if (!rawVal) {
      input.focus();
      return;
    }

    // Permitir ingresar una o varias si el usuario separó con comas
    const newSubs = rawVal.split(',').map(s => s.trim()).filter(Boolean);
    const existing = Array.from(chipsContainer.querySelectorAll('.cms-subcat-chip'))
      .map(c => (c.dataset.subcatValue || '').toLowerCase());

    let addedCount = 0;
    newSubs.forEach(sub => {
      if (!existing.includes(sub.toLowerCase())) {
        chipsContainer.insertAdjacentHTML('beforeend', renderSubcategoryChipMarkup(sub, (s) => this.escapeHtml(s)));
        existing.push(sub.toLowerCase());
        addedCount++;
      }
    });

    input.value = '';
    if (addedCount > 0) {
      this.syncCategorySelectOptions();
    } else {
      this.showToast('Esa subcategoría ya existe en esta categoría.', 'error');
    }
  }

  attachEvents() {
    if (this._eventsAttached) return;
    this._eventsAttached = true;

    // 1. Salto suave al hacer clic en los botones de acceso rápido
    this.container.querySelectorAll('.btn-cms-jump').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = btn.dataset.targetSection;
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          targetEl.classList.remove('cms-section-highlight');
          void targetEl.offsetWidth; // Forzar reflujo de animación
          targetEl.classList.add('cms-section-highlight');
          setTimeout(() => {
            if (targetEl) targetEl.classList.remove('cms-section-highlight');
          }, 2400);
        }
      });
    });

    // 2. Guardar sección individual (delegado en el contenedor para evitar duplicación y soportar elementos dinámicos)
    this.container.addEventListener('click', async (e) => {
      const saveBtn = e.target.closest('.btn-cms-save');
      if (!saveBtn) return;
      e.preventDefault();
      if (saveBtn.disabled || saveBtn.classList.contains('loading')) return;
      const targetSection = saveBtn.dataset.target;
      if (targetSection) {
        await this.handleSaveSection(targetSection, saveBtn);
      }
    });

    // 3. Gestor de previsualización y subida de fotos
    attachImageManagementEvents(this.container, (msg, type) => this.showToast(msg, type));

    // 4. Gestión dinámica de Categorías y Subcategorías (Chips) en el Lookbook
    const addCategoryBtn = this.container.querySelector('#cmsAddCategoryBtn');
    const categoriesContainer = this.container.querySelector('#cmsCategoriesRowsContainer');
    if (addCategoryBtn && categoriesContainer) {
      addCategoryBtn.addEventListener('click', () => {
        const idx = categoriesContainer.querySelectorAll('.cms-category-row').length;
        const newCat = {
          id: `categoria-${idx + 1}`,
          label: `Nueva Categoría ${idx + 1}`,
          subcategories: ["Edición Limitada", "Heavyweight"]
        };
        categoriesContainer.insertAdjacentHTML(
          'beforeend',
          renderCategoryRowMarkup(newCat, idx, (s) => this.escapeHtml(s))
        );
        this.syncCategorySelectOptions();
        const rows = categoriesContainer.querySelectorAll('.cms-category-row');
        const lastRow = rows[rows.length - 1];
        const labelInput = lastRow?.querySelector('[data-cat-field="label"]');
        if (labelInput) {
          labelInput.focus();
          labelInput.select();
        }
      });

      categoriesContainer.addEventListener('click', (e) => {
        // A) Eliminar categoría completa
        const removeCatBtn = e.target.closest('.btn-cms-remove-category');
        if (removeCatBtn) {
          const rows = categoriesContainer.querySelectorAll('.cms-category-row');
          if (rows.length <= 1) {
            this.showToast('Debe existir al menos una categoría activa en el catálogo.', 'error');
            return;
          }
          const row = removeCatBtn.closest('.cms-category-row');
          if (row) {
            row.remove();
            this.syncCategorySelectOptions();
          }
          return;
        }

        // B) Agregar nueva subcategoría (botón '+ Subcategoría')
        const addSubBtn = e.target.closest('.btn-cms-add-subcat');
        if (addSubBtn) {
          const row = addSubBtn.closest('.cms-category-row');
          this.addSubcategoryChipToRow(row);
          return;
        }

        // C) Eliminar una etiqueta (chip) de subcategoría ('x')
        const removeSubBtn = e.target.closest('.cms-subcat-chip-remove');
        if (removeSubBtn) {
          const chip = removeSubBtn.closest('.cms-subcat-chip');
          if (chip) {
            chip.remove();
            this.syncCategorySelectOptions();
          }
          return;
        }

        // D) Editar nombre de subcategoría (clic en etiqueta o ícono lápiz)
        const editSubTrigger = e.target.closest('.cms-subcat-chip-edit, .cms-subcat-chip-label');
        if (editSubTrigger) {
          const chip = editSubTrigger.closest('.cms-subcat-chip');
          this.startSubcategoryChipEdit(chip);
        }
      });

      // Permitir agregar subcategoría presionando Enter en el campo '.cms-subcat-new-input'
      categoriesContainer.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.classList.contains('cms-subcat-new-input')) {
          e.preventDefault();
          const row = e.target.closest('.cms-category-row');
          this.addSubcategoryChipToRow(row);
        }
      });

      // Auto-generar slug cuando el usuario escribe el nombre de una categoría nueva y sincronizar selectores
      categoriesContainer.addEventListener('input', (e) => {
        if (e.target.matches('[data-cat-field="label"]')) {
          const row = e.target.closest('.cms-category-row');
          const idInput = row?.querySelector('[data-cat-field="id"]');
          if (idInput && (idInput.value.startsWith('categoria-') || !idInput.dataset.manualSlug)) {
            const autoSlug = e.target.value
              .trim()
              .toLowerCase()
              .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9_-]+/g, '-')
              .replace(/^-+|-+$/g, '');
            if (autoSlug) {
              idInput.value = autoSlug;
            }
          }
        } else if (e.target.matches('[data-cat-field="id"]')) {
          e.target.dataset.manualSlug = 'true';
        }
        this.syncCategorySelectOptions();
      });
    }

    // Sincronizar subcategorías disponibles cuando se cambia la categoría o subcategoría en una tarjeta de prenda
    const lookbookList = this.container.querySelector('.cms-lookbook-list');
    if (lookbookList) {
      lookbookList.addEventListener('change', (e) => {
        if (e.target.matches('select[data-field="category"], select[data-field="subcategory"]')) {
          this.syncCategorySelectOptions();
        }
      });

      // Delegación de eventos para quitar prendas y gestionar galería fotográfica
      lookbookList.addEventListener('click', (e) => {
        // Quitar prenda completa de la colección
        const removeCardBtn = e.target.closest('.btn-cms-remove-item');
        if (removeCardBtn) {
          e.preventDefault();
          const card = removeCardBtn.closest('.cms-lookbook-item-card');
          const itemName = card.querySelector('[data-field="name"]')?.value || 'esta prenda';
          if (confirm(`¿Estás seguro de quitar "${itemName}" de la colección? (Recuerda presionar Guardar Catálogo para aplicar el cambio)`)) {
            card.remove();
            this.showToast(`Prenda retirada de la lista. Presiona Guardar Catálogo para confirmar.`, 'info');
          }
          return;
        }

        // Añadir foto a galería multi-imagen
        const addGalleryBtn = e.target.closest('.btn-cms-add-gallery-img');
        if (addGalleryBtn) {
          e.preventDefault();
          const itemId = addGalleryBtn.dataset.itemId;
          const container = lookbookList.querySelector(`.cms-gallery-items-container[data-item-id="${itemId}"]`);
          if (container) {
            const count = container.querySelectorAll('.cms-gallery-item-row').length;
            const rowHtml = renderGalleryImageItemMarkup(itemId, count, '', this.escapeHtml.bind(this));
            container.insertAdjacentHTML('beforeend', rowHtml);
          }
          return;
        }

        // Quitar foto de galería multi-imagen
        const removeGalleryBtn = e.target.closest('.btn-cms-remove-gallery-img');
        if (removeGalleryBtn) {
          e.preventDefault();
          const row = removeGalleryBtn.closest('.cms-gallery-item-row');
          if (row) row.remove();
          return;
        }
      });
    }

    // Botones para agregar una nueva prenda al catálogo/lookbook
    const addLookbookItemHandler = () => {
      const listEl = this.container.querySelector('.cms-lookbook-list');
      if (!listEl) return;
      const currentCards = listEl.querySelectorAll('.cms-lookbook-item-card');
      const nextIdx = currentCards.length;
      const newId = `col-item-${Date.now().toString(36)}`;
      const activeCats = (this.content.lookbook && Array.isArray(this.content.lookbook.categories) && this.content.lookbook.categories.length > 0)
        ? this.content.lookbook.categories
        : DEFAULT_LOOKBOOK_CATEGORIES;

      const newItem = {
        id: newId,
        name: `Nueva Prenda de Colección #${nextIdx + 1}`,
        badge: "Edición Taller 2026",
        category: activeCats[0]?.id || "urbanas",
        subcategory: activeCats[0]?.subcategories?.[0] || "Edición Taller",
        price: 24990,
        garment_id: this.garments[0]?.id || "garment-polera-heavyweight-240",
        photo_front: "",
        photo_back: "",
        gallery_images: [],
        observation: ""
      };

      const cardHtml = renderLookbookItemCardMarkup(newItem, nextIdx, this.garments, activeCats, this.escapeHtml.bind(this));
      listEl.insertAdjacentHTML('beforeend', cardHtml);
      this.syncCategorySelectOptions();
      this.showToast(`Prenda añadida al catálogo. Recuerda presionar 'Guardar Catálogo / Lookbook' para persistir.`, 'info');
    };

    const addLookbookBtn = this.container.querySelector('#cmsAddLookbookItemBtn');
    const addLookbookBtnTop = this.container.querySelector('#cmsAddLookbookItemBtnTop');
    if (addLookbookBtn) addLookbookBtn.addEventListener('click', addLookbookItemHandler);
    if (addLookbookBtnTop) addLookbookBtnTop.addEventListener('click', addLookbookItemHandler);

    // 5. Gestión dinámica de Cláusulas de Términos y Condiciones
    const addClauseBtn = this.container.querySelector('#cmsAddTermsClauseBtn');
    const clausesContainer = this.container.querySelector('#cmsTermsClausesContainer');
    if (addClauseBtn && clausesContainer) {
      addClauseBtn.addEventListener('click', () => {
        const currentClauses = clausesContainer.querySelectorAll('.cms-terms-clause-card');
        if (currentClauses.length >= 12) {
          this.showToast('Máximo 12 cláusulas permitidas en la sección.', 'error');
          return;
        }
        const nextNum = String(currentClauses.length + 1).padStart(2, '0');
        const clauseHtml = `
          <div class="cms-terms-clause-card" data-clause-index="${currentClauses.length}" style="padding: 1rem; background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); margin-bottom: 0.85rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.65rem;">
              <strong style="font-size: 0.78rem; color: var(--accent-admin); font-family: var(--font-mono);">CLÁUSULA #${nextNum}</strong>
              <button type="button" class="btn-cms-remove-clause" title="Eliminar esta cláusula" style="background: transparent; border: 1px solid var(--border-subtle); color: var(--text-muted); padding: 2px 8px; font-size: 0.7rem; font-family: var(--font-mono); cursor: pointer;">
                ✕ Quitar
              </button>
            </div>
            <div style="display: grid; grid-template-columns: 110px 1fr; gap: 0.65rem; margin-bottom: 0.5rem;">
              <div>
                <label class="cms-label" style="font-size: 0.7rem;">Código</label>
                <input type="text" class="cms-input" data-clause-field="step_number" value="${nextNum}" maxlength="10">
              </div>
              <div>
                <label class="cms-label" style="font-size: 0.7rem;">Título de la Cláusula</label>
                <input type="text" class="cms-input" data-clause-field="title" value="${nextNum}. Nueva Cláusula Operativa" maxlength="90">
              </div>
            </div>
            <div style="margin-bottom: 0.5rem;">
              <label class="cms-label" style="font-size: 0.7rem;">Detalle / Condición Legal y Técnica</label>
              <textarea class="cms-textarea" data-clause-field="description" rows="2" maxlength="420">Especifica aquí los alcances, plazos o condiciones técnicas aplicables.</textarea>
            </div>
            <div>
              <label class="cms-label" style="font-size: 0.7rem;">Tag de Norma / Referencia</label>
              <input type="text" class="cms-input" data-clause-field="badge" value="NORMA TALLER SENKAI" maxlength="60">
            </div>
          </div>
        `;
        clausesContainer.insertAdjacentHTML('beforeend', clauseHtml);
      });

      clausesContainer.addEventListener('click', (e) => {
        const removeClauseBtn = e.target.closest('.btn-cms-remove-clause');
        if (!removeClauseBtn) return;
        const currentClauses = clausesContainer.querySelectorAll('.cms-terms-clause-card');
        if (currentClauses.length <= 1) {
          this.showToast('Debe permanecer al menos 1 cláusula en Términos y Condiciones.', 'error');
          return;
        }
        const card = removeClauseBtn.closest('.cms-terms-clause-card');
        if (card) card.remove();
      });
    }

    // 6. Restauración de las 6 prendas y categorías canónicas del Lookbook
    const resetLookbookBtn = this.container.querySelector('[data-action="reset-lookbook-defaults"]');
    if (resetLookbookBtn) {
      resetLookbookBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (!confirm('¿Deseas restaurar las 6 prendas y categorías predeterminadas en el Catálogo y Carrusel?')) {
          return;
        }

        try {
          resetLookbookBtn.disabled = true;
          const defaultPayload = {
            items: DEFAULT_LOOKBOOK_ITEMS,
            categories: DEFAULT_LOOKBOOK_CATEGORIES
          };
          await apiService.updateSiteSection('lookbook', defaultPayload);
          this.content.lookbook = defaultPayload;
          this.showToast('Prendas y categorías predeterminadas restauradas con éxito.', 'success');
          window.dispatchEvent(new CustomEvent('senkai:cms-updated', { detail: { sectionKey: 'lookbook', payload: defaultPayload } }));
          this.render();
          this.attachEvents();
        } catch (err) {
          console.error("Error al restaurar lookbook:", err);
          this.showToast(`Error al restaurar: ${err.message}`, 'error');
        } finally {
          resetLookbookBtn.disabled = false;
        }
      });
    }
  }

  // Guardo la sección modificada comunicándome con el endpoint PUT /admin/content/{section_key}
  async handleSaveSection(sectionKey, buttonEl) {
    if (!buttonEl || buttonEl.disabled || buttonEl.classList.contains('loading')) {
      return;
    }
    const originalHtml = buttonEl.getAttribute('data-original-html') || buttonEl.innerHTML;
    buttonEl.setAttribute('data-original-html', originalHtml);
    buttonEl.disabled = true;
    buttonEl.classList.add('loading');
    buttonEl.innerHTML = `<span class="material-symbols-outlined cms-spin" style="font-size: 16px;">progress_activity</span> <span>Guardando...</span>`;

    try {
      const payload = this.collectSectionPayload(sectionKey);
      await apiService.updateSiteSection(sectionKey, payload);

      // Actualizo la copia local en memoria
      this.content[sectionKey] = payload;
      this.showToast(`Sección '${sectionKey}' guardada con éxito en línea.`, "success");

      // Notifico a la vitrina pública para que se refresque reactivamente
      window.dispatchEvent(new CustomEvent('senkai:cms-updated', { detail: { sectionKey, payload } }));
    } catch (err) {
      console.error(`Error guardando ${sectionKey}:`, err);
      if (err.message === "UNAUTHORIZED") {
        this.showToast(`No autorizado: Debes ingresar la clave de taller autorizada.`, "error");
        window.dispatchEvent(new CustomEvent('senkai:workshop-unauthorized'));
      } else {
        this.showToast(`Error al guardar: ${err.message || "Fallo de validación"}`, "error");
      }
    } finally {
      buttonEl.disabled = false;
      buttonEl.classList.remove('loading');
      buttonEl.innerHTML = buttonEl.getAttribute('data-original-html') || originalHtml;
      buttonEl.removeAttribute('data-original-html');
    }
  }

  // Delega la recolección de campos al submódulo especializado correspondiente
  collectSectionPayload(sectionKey) {
    switch (sectionKey) {
      case 'lookbook':
        return collectLookbookPayload(this.container);
      case 'hero':
        return collectHeroPayload();
      case 'editorial':
        return collectEditorialPayload();
      case 'announcement':
        return collectAnnouncementPayload();
      case 'marquee':
        return collectMarqueePayload();
      case 'headers':
        return collectHeadersPayload();
      case 'stats':
        return collectStatsPayload();
      case 'statement':
        return collectStatementPayload();
      case 'protocol':
        return collectProtocolPayload();
      case 'contact':
        return collectContactPayload();
      default:
        throw new Error(`Sección desconocida: ${sectionKey}`);
    }
  }

  showToast(message, type = "success") {
    if (!this.toastEl) return;
    this.toastEl.textContent = message;
    this.toastEl.className = `cms-toast show ${type}`;
    setTimeout(() => {
      if (this.toastEl) {
        this.toastEl.classList.remove('show');
      }
    }, 3500);
  }
}
