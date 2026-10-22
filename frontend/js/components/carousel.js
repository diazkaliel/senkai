/**
 * SENKAI // Carrusel de lanzamientos destacados
 *
 * Cómo está armado:
 * - El desplazamiento lo hace el navegador (scroll-snap). JS solo decide a qué slide ir.
 * - El slide activo lo detecta un IntersectionObserver; no medimos nada en cada evento de scroll.
 * - El autoplay no usa setTimeout. La barra del índice es una animación CSS y, cuando termina
 *   (animationend), pasamos al siguiente. Pausar es animation-play-state: paused, así la barra
 *   y el tiempo real nunca se desfasan y al reanudar sigue desde donde quedó.
 * - Todos los eventos van delegados en el contenedor y se enlazan una sola vez, aunque app.js
 *   vuelva a llamar a init() cuando se refresca el catálogo.
 */

import { COLLECTION_ITEMS, resolveItemPrice, buildCatalogCartItem } from './catalog.js?v=20261022_v1';
import { SVG_GARMENTS } from './svg_templates.js?v=20261022_v1';

const FILL_ANIMATION = 'drop-rail-fill';
const SLIDE_VISIBLE_RATIO = 0.6;
const WRAP_FADE_MS = 220;
const TOUCH_RESUME_MS = 2500;

// Las medidas del arte en COLLECTION_ITEMS están en px pensadas para la tarjeta del catálogo (~360px).
// Acá el visor es cuadrado y fluido, así que las paso a porcentaje sobre esa referencia.
const ART_REFERENCE_PX = 360;
const HEAT_PRESS_SPEC = '160 °C · 15 s · peel en frío';

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const pad2 = (n) => String(n).padStart(2, '0');
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const toPct = (px) => `${((parseFloat(px) || 0) / ART_REFERENCE_PX * 100).toFixed(2)}%`;
const sameHex = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasFinePointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

// "Polera Oversized 'Cyber Kanji 2026'" -> { line: 'Polera Oversized', title: 'Cyber Kanji 2026' }
function splitItemName(name = '') {
  const match = /^(.*?)\s*'(.+)'\s*$/.exec(name);
  return match ? { line: match[1], title: match[2] } : { line: '', title: name };
}

export class ProductCarousel {
  /**
   * @param {HTMLElement|string} containerId
   * @param {Object}   [options]
   * @param {Array}    [options.items]     Piezas a destacar (por defecto, la colección completa)
   * @param {number}   [options.interval]  Permanencia de cada pieza en ms
   * @param {boolean}  [options.autoplay]  Arranca avanzando solo (se ignora si hay reduced-motion)
   * @param {Function} [options.onSelectForCustomizer]
   * @param {Function} [options.onAddToCart]
   */
  constructor(containerId, options = {}) {
    this.container = typeof containerId === 'string'
      ? document.getElementById(containerId)
      : containerId;

    this.onSelectForCustomizer = options.onSelectForCustomizer || (() => {});
    this.onAddToCart = options.onAddToCart || (() => {});
    // Copia propia: cambiar color o cara acá no debe alterar las tarjetas del catálogo
    this.items = (options.items || COLLECTION_ITEMS).map(item => ({ ...item }));
    this.garments = [];

    this.interval = options.interval || 6500;
    this.autoplayEnabled = options.autoplay !== false && !prefersReducedMotion();

    this.currentIndex = 0;
    this.pendingIndex = null; // destino de un scroll programático que todavía no termina
    this.isWrapping = false;

    // Motivos por los que el autoplay queda retenido. Basta con uno para frenar la barra.
    this.holds = {
      hover: false,
      focus: false,
      touch: false,
      hidden: document.hidden,
      offscreen: true,
    };

    this.dom = {};
    this.slideObserver = null;
    this.sectionObserver = null;
    this.pendingTimer = null;
    this.touchTimer = null;
    this.parallaxFrame = null;
    this.lastPointer = null;
    this.eventsBound = false;
  }

  init(garments = []) {
    if (!this.container) return;

    this.garments = garments || [];
    this.currentIndex = clamp(this.currentIndex, 0, Math.max(this.items.length - 1, 0));

    this.render();
    this.cacheDom();

    if (!this.eventsBound) {
      this.bindEvents();
      this.eventsBound = true;
    }

    if (!this.items.length) return;

    this.observe();
    this.setActive(this.currentIndex, { force: true });
    this.goTo(this.currentIndex, { instant: true });
    this.syncPlayback();
  }

  updateItems(newItems) {
    if (!newItems || !newItems.length) return;
    this.items = COLLECTION_ITEMS.map(baseItem => {
      const updated = newItems.find(n => n.id === baseItem.id);
      if (!updated) {
        const existing = this.items.find(i => i.id === baseItem.id);
        return existing || { ...baseItem };
      }
      return {
        ...baseItem,
        ...updated,
        garmentId: updated.garment_id || updated.garmentId || baseItem.garmentId,
        photo_front: (updated.photo_front !== undefined) ? updated.photo_front : baseItem.photo_front,
        photo_back: (updated.photo_back !== undefined) ? updated.photo_back : baseItem.photo_back
      };
    });
    newItems.forEach(newItem => {
      if (!this.items.some(i => i.id === newItem.id)) {
        this.items.push(newItem);
      }
    });
    this.init(this.garments);
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  findGarment(item) {
    const gId = item.garment_id || item.garmentId;
    return this.garments.find(g => g.id === gId) || null;
  }

  render() {
    const total = this.items.length;

    if (!total) {
      this.container.innerHTML = `
        <section class="drop-index drop-index--empty" aria-label="Lanzamientos destacados">
          <p class="drop-index__empty">No hay lanzamientos publicados por ahora.</p>
        </section>
      `;
      return;
    }

    this.container.innerHTML = `
      <section class="drop-index" aria-roledescription="carrusel" aria-label="Lanzamientos destacados" style="--drop-interval: ${this.interval}ms;">
        <header class="drop-index__head">
          <h2 class="drop-index__title">
            Lanzamientos destacados<sup class="drop-index__count">(${pad2(total)})</sup>
          </h2>

          <div class="drop-index__controls">
            <button type="button" class="drop-ctl drop-ctl--play" data-drop-action="toggle">
              <span class="drop-ctl__dot" aria-hidden="true"></span>
              <span data-drop-play-label>Pausar</span>
            </button>

            <p class="drop-index__counter" aria-live="off" aria-atomic="true">
              <span class="drop-index__counter-current" data-drop-counter>01</span>
              <span class="drop-index__counter-sep" aria-hidden="true">/</span>
              <span class="sr-only">de</span>
              ${pad2(total)}
            </p>

            <button type="button" class="drop-ctl drop-ctl--arrow" data-drop-action="prev" aria-label="Lanzamiento anterior">
              <span class="material-symbols-outlined" aria-hidden="true">west</span>
            </button>
            <button type="button" class="drop-ctl drop-ctl--arrow" data-drop-action="next" aria-label="Lanzamiento siguiente">
              <span class="material-symbols-outlined" aria-hidden="true">east</span>
            </button>
          </div>
        </header>

        <div class="drop-index__viewport">
          <ol class="drop-index__track" tabindex="0" aria-label="Piezas destacadas. Usa las flechas del teclado para recorrerlas.">
            ${this.items.map((item, i) => this.renderSlide(item, i, total)).join('')}
          </ol>
        </div>

        <nav class="drop-rail" aria-label="Índice de lanzamientos">
          <ol class="drop-rail__list">
            ${this.items.map((item, i) => this.renderRailItem(item, i)).join('')}
          </ol>
        </nav>
      </section>
    `;
  }

  renderSlide(item, index, total) {
    const garment = this.findGarment(item);
    const { line, title } = splitItemName(item.name);
    const isBack = item.currentView === 'back';
    const color = item.availableColors.find(c => sameHex(c.hex, item.colorHex)) || item.availableColors[0];
    const weight = garment?.weight_gsm;
    const code = `SK-${weight || '000'} / ${pad2(index + 1)}`;
    const price = resolveItemPrice(item, garment);

    const specs = [
      ['Gramaje', weight ? `${weight} g/m²` : item.badge],
      ['Tela', garment?.composition || '—'],
      ['Estampa', `${item.frontArt.suggestedSize || '—'} frente · ${item.backArt.suggestedSize || '—'} espalda`],
      ['Curado', HEAT_PRESS_SPEC],
    ];

    return `
      <li class="drop-slide" data-drop-index="${index}" aria-roledescription="slide" aria-label="${index + 1} de ${total}: ${escapeHtml(title)}">
        <div class="drop-slide__stage" data-drop-stage>
          <span class="drop-slide__numeral" aria-hidden="true">${pad2(index + 1)}</span>
          <span class="drop-slide__guide" aria-hidden="true"></span>

          <div class="drop-slide__frame">
            <div class="drop-slide__tilt">
              <div class="drop-slide__flipper${isBack ? ' is-flipped' : ''}">
                ${this.renderFace(item, 'front', isBack)}
                ${this.renderFace(item, 'back', !isBack)}
              </div>
            </div>
          </div>

          <p class="drop-slide__readout" aria-hidden="true">
            <span class="drop-slide__reg"></span>
            <span data-drop-readout>${this.readoutText(item)}</span>
          </p>

          <div class="drop-slide__views" role="group" aria-label="Cara de la prenda">
            <button type="button" class="drop-chip" data-drop-view="front" aria-pressed="${!isBack}">Frente</button>
            <button type="button" class="drop-chip" data-drop-view="back" aria-pressed="${isBack}">Espalda</button>
          </div>
        </div>

        <div class="drop-slide__sheet">
          <p class="drop-slide__code" style="--i: 0;">
            <span>${escapeHtml(code)}</span>
            ${line ? `<span class="drop-slide__line">${escapeHtml(line)}</span>` : ''}
          </p>

          <h3 class="drop-slide__name" style="--i: 1;">${escapeHtml(title)}</h3>

          ${garment?.description
            ? `<p class="drop-slide__desc" style="--i: 2;">${escapeHtml(garment.description)}</p>`
            : ''}

          <dl class="drop-slide__specs" style="--i: 3;">
            ${specs.map(([label, value]) => `
              <div>
                <dt>${label}</dt>
                <dd>${escapeHtml(value)}</dd>
              </div>
            `).join('')}
          </dl>

          <div class="drop-slide__colors" style="--i: 4;">
            <p class="drop-slide__label">Color <span data-drop-color-name>${escapeHtml(color.name)}</span></p>
            <div class="drop-slide__swatches" role="group" aria-label="Color de la prenda">
              ${item.availableColors.map(c => `
                <button type="button"
                        class="drop-swatch"
                        style="--swatch: ${c.hex};"
                        data-drop-color="${c.hex}"
                        data-drop-color-label="${escapeHtml(c.name)}"
                        aria-label="${escapeHtml(c.name)}"
                        aria-pressed="${sameHex(c.hex, color.hex)}"></button>
              `).join('')}
            </div>
          </div>

          <div class="drop-slide__buy" style="--i: 5;">
            <p class="drop-slide__price">
              <span class="drop-slide__price-value">$${price.toLocaleString('es-CL')}</span>
              <span class="drop-slide__price-unit">CLP</span>
            </p>
            ${(garment && garment.is_active === false) ? `
              <button type="button" class="btn btn-secondary drop-slide__cta" disabled aria-disabled="true" style="opacity: 0.6; cursor: not-allowed;">
                No disponible
                <span class="material-symbols-outlined" aria-hidden="true">block</span>
              </button>
            ` : `
              <button type="button" class="btn btn-primary drop-slide__cta" data-drop-open="${index}">
                Agregar al carro
                <span class="material-symbols-outlined" aria-hidden="true">add_shopping_cart</span>
              </button>
            `}
          </div>
        </div>
      </li>
    `;
  }

  renderFace(item, side, hidden) {
    const render = SVG_GARMENTS[`${item.garmentType}_${side}`] || SVG_GARMENTS[`tshirt_${side}`];
    const art = side === 'front' ? item.frontArt : item.backArt;
    const spec = side === 'front' ? item.frontSpecs : item.backSpecs;
    const photoSrc = side === 'front'
      ? (item.photo_front ?? item.photoFront)
      : (item.photo_back ?? item.photoBack);

    if (photoSrc) {
      return `
        <div class="drop-slide__face drop-slide__face--${side}" aria-hidden="${hidden}">
          <img src="${photoSrc}" alt="${escapeHtml(item.name)} ${side}" class="card-real-photo-img" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; pointer-events: none;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
          <div class="drop-slide__fallback-wrap" style="display: none; width: 100%; height: 100%; position: absolute; inset: 0; align-items: center; justify-content: center;">
            ${render ? render(item.colorHex) : ''}
            ${art && spec ? `
            <div class="drop-slide__art" style="top: ${spec.top}; left: ${spec.left}; width: ${toPct(spec.width)}; height: ${toPct(spec.height)};">
              ${art.svgContent}
            </div>
            ` : ''}
          </div>
        </div>
      `;
    }

    return `
      <div class="drop-slide__face drop-slide__face--${side}" aria-hidden="${hidden}">
        ${render ? render(item.colorHex) : ''}
        ${art && spec ? `
        <div class="drop-slide__art" style="top: ${spec.top}; left: ${spec.left}; width: ${toPct(spec.width)}; height: ${toPct(spec.height)};">
          ${art.svgContent}
        </div>
        ` : ''}
      </div>
    `;
  }

  renderRailItem(item, index) {
    const { title } = splitItemName(item.name);

    return `
      <li class="drop-rail__item">
        <button type="button" class="drop-rail__btn" data-drop-goto="${index}" aria-label="Ir a ${escapeHtml(title)}">
          <span class="drop-rail__bar" aria-hidden="true"><span class="drop-rail__fill"></span></span>
          <span class="drop-rail__meta" aria-hidden="true">
            <span class="drop-rail__num">${pad2(index + 1)}</span>
            <span class="drop-rail__name">${escapeHtml(title)}</span>
            <span class="drop-rail__chip" data-drop-chip style="--swatch: ${item.colorHex};"></span>
          </span>
        </button>
      </li>
    `;
  }

  readoutText(item) {
    const isBack = item.currentView === 'back';
    const spec = isBack ? item.backSpecs : item.frontSpecs;
    const art = isBack ? item.backArt : item.frontArt;
    const x = (parseFloat(spec.left) || 0).toFixed(1);
    const y = (parseFloat(spec.top) || 0).toFixed(1);
    return `${isBack ? 'Espalda' : 'Frente'} · DTF ${art.suggestedSize || '—'} · X ${x} Y ${y}`;
  }

  cacheDom() {
    const root = this.container;
    this.dom = {
      section: root.querySelector('.drop-index'),
      viewport: root.querySelector('.drop-index__viewport'),
      track: root.querySelector('.drop-index__track'),
      slides: [...root.querySelectorAll('.drop-slide')],
      railButtons: [...root.querySelectorAll('.drop-rail__btn')],
      counter: root.querySelector('[data-drop-counter]'),
      counterLive: root.querySelector('.drop-index__counter'),
      toggle: root.querySelector('[data-drop-action="toggle"]'),
      toggleLabel: root.querySelector('[data-drop-play-label]'),
    };
  }

  // ---------------------------------------------------------------------------
  // Eventos (una sola vez, todo delegado en el contenedor)
  // ---------------------------------------------------------------------------

  bindEvents() {
    const root = this.container;

    root.addEventListener('click', (e) => this.handleClick(e));
    root.addEventListener('keydown', (e) => this.handleKeydown(e));

    // La barra del índice llegó al final: turno del siguiente
    root.addEventListener('animationend', (e) => {
      if (e.animationName === FILL_ANIMATION) this.next();
    });

    // scrollend no burbujea, por eso lo escucho en captura
    root.addEventListener('scrollend', (e) => {
      if (e.target === this.dom.track) this.settlePending();
    }, true);

    root.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'mouse') this.setHold('hover', true);
    });

    root.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'mouse') this.setHold('hover', false);
      this.resetParallax();
    });

    root.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'touch') return;
      clearTimeout(this.touchTimer);
      this.setHold('touch', true);
    });

    const releaseTouch = (e) => {
      if (e.pointerType !== 'touch') return;
      clearTimeout(this.touchTimer);
      this.touchTimer = setTimeout(() => this.setHold('touch', false), TOUCH_RESUME_MS);
    };
    root.addEventListener('pointerup', releaseTouch);
    root.addEventListener('pointercancel', releaseTouch);

    // Solo el foco de teclado retiene el autoplay. Si retuviera también el foco por clic,
    // el carrusel quedaría quieto después de tocar una flecha hasta hacer clic afuera.
    root.addEventListener('focusin', (e) => {
      if (e.target.matches(':focus-visible')) this.setHold('focus', true);
    });

    root.addEventListener('focusout', (e) => {
      if (!root.contains(e.relatedTarget)) this.setHold('focus', false);
    });

    document.addEventListener('visibilitychange', () => this.setHold('hidden', document.hidden));

    if (hasFinePointer() && !prefersReducedMotion()) {
      root.addEventListener('pointermove', (e) => {
        this.lastPointer = e;
        if (!this.parallaxFrame) {
          this.parallaxFrame = requestAnimationFrame(() => this.applyParallax());
        }
      }, { passive: true });
    }
  }

  handleClick(e) {
    const action = e.target.closest('[data-drop-action]');
    if (action) {
      const name = action.dataset.dropAction;
      if (name === 'prev') this.prev();
      if (name === 'next') this.next();
      if (name === 'toggle') this.toggleAutoplay();
      return;
    }

    const railBtn = e.target.closest('[data-drop-goto]');
    if (railBtn) {
      this.goTo(Number(railBtn.dataset.dropGoto));
      return;
    }

    const viewBtn = e.target.closest('[data-drop-view]');
    if (viewBtn) {
      this.setView(this.slideIndexOf(viewBtn), viewBtn.dataset.dropView);
      return;
    }

    const swatch = e.target.closest('[data-drop-color]');
    if (swatch) {
      this.setColor(this.slideIndexOf(swatch), swatch);
      return;
    }

    const cta = e.target.closest('[data-drop-open]');
    if (cta) {
      const item = this.items[Number(cta.dataset.dropOpen)];
      if (item) {
        const garment = this.findGarment(item);
        if (garment && garment.is_active === false) return;
        const cartItem = buildCatalogCartItem(item, garment);
        this.onAddToCart(cartItem);
      }
    }
  }

  handleKeydown(e) {
    if (e.target !== this.dom.track) return;

    const keyActions = {
      ArrowRight: () => this.next(),
      ArrowLeft: () => this.prev(),
      Home: () => this.goTo(0),
      End: () => this.goTo(this.items.length - 1),
    };

    const run = keyActions[e.key];
    if (!run) return;
    e.preventDefault();
    run();
  }

  slideIndexOf(el) {
    return Number(el.closest('.drop-slide')?.dataset.dropIndex);
  }

  // ---------------------------------------------------------------------------
  // Observadores
  // ---------------------------------------------------------------------------

  observe() {
    this.slideObserver?.disconnect();
    this.sectionObserver?.disconnect();

    const { track, section, slides } = this.dom;
    if (!track || !section) return;

    this.slideObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        // El callback también salta al bajar del umbral; ahí isIntersecting sigue en true
        if (entry.intersectionRatio < SLIDE_VISIBLE_RATIO) continue;

        const index = Number(entry.target.dataset.dropIndex);
        // En un salto programático (1 -> 5) pasan los slides intermedios; esos no cuentan
        if (this.pendingIndex !== null && index !== this.pendingIndex) continue;

        this.setActive(index);
      }
    }, { root: track, threshold: SLIDE_VISIBLE_RATIO });

    slides.forEach(slide => this.slideObserver.observe(slide));

    // Si nadie está mirando la sección, la barra no corre
    this.sectionObserver = new IntersectionObserver(([entry]) => {
      this.setHold('offscreen', !entry.isIntersecting);
    }, { threshold: 0.25 });

    this.sectionObserver.observe(section);
  }

  // ---------------------------------------------------------------------------
  // Navegación
  // ---------------------------------------------------------------------------

  get targetIndex() {
    return this.pendingIndex ?? this.currentIndex;
  }

  next() {
    if (this.isWrapping || !this.items.length) return;
    const last = this.items.length - 1;
    if (this.targetIndex >= last) this.wrapTo(0);
    else this.goTo(this.targetIndex + 1);
  }

  prev() {
    if (this.isWrapping || !this.items.length) return;
    if (this.targetIndex <= 0) this.wrapTo(this.items.length - 1);
    else this.goTo(this.targetIndex - 1);
  }

  goTo(index, { instant = false } = {}) {
    const { track, slides } = this.dom;
    const slide = slides?.[index];
    if (!track || !slide) return;

    this.pendingIndex = index;
    // La UI responde al instante; el scroll llega después
    this.setActive(index);

    const behavior = instant || prefersReducedMotion() ? 'auto' : 'smooth';
    track.scrollTo({ left: slide.offsetLeft, behavior });

    // Respaldo para navegadores sin scrollend, o si ya estábamos en ese slide y no hubo scroll
    clearTimeout(this.pendingTimer);
    this.pendingTimer = setTimeout(() => this.settlePending(), behavior === 'auto' ? 60 : 900);
  }

  // Volver de la última a la primera arrastrando todo el riel se ve torpe:
  // fundido corto, salto seco y vuelta a aparecer.
  wrapTo(index) {
    const { viewport } = this.dom;
    if (!viewport || prefersReducedMotion()) {
      this.goTo(index, { instant: true });
      return;
    }

    this.isWrapping = true;
    viewport.classList.add('is-wrapping');

    setTimeout(() => {
      this.goTo(index, { instant: true });
      requestAnimationFrame(() => {
        viewport.classList.remove('is-wrapping');
        this.isWrapping = false;
      });
    }, WRAP_FADE_MS);
  }

  settlePending() {
    clearTimeout(this.pendingTimer);
    this.pendingIndex = null;
  }

  setActive(index, { force = false } = {}) {
    const { slides, railButtons, counter } = this.dom;
    if (!slides?.length) return;
    if (!force && index === this.currentIndex && slides[index].classList.contains('is-current')) return;

    this.currentIndex = index;

    slides.forEach((slide, i) => {
      const isCurrent = i === index;
      slide.classList.toggle('is-current', isCurrent);
      // Fuera de pantalla no debe recibir tab ni lectores de pantalla
      slide.toggleAttribute('inert', !isCurrent);
      if (!isCurrent) this.resetParallax(slide);
    });

    railButtons.forEach((btn, i) => {
      btn.classList.toggle('is-active', i === index);
      btn.classList.toggle('is-done', i < index);
      if (i === index) btn.setAttribute('aria-current', 'true');
      else btn.removeAttribute('aria-current');
    });

    if (counter) counter.textContent = pad2(index + 1);
  }

  // ---------------------------------------------------------------------------
  // Interacción dentro de cada pieza
  // ---------------------------------------------------------------------------

  setView(index, view) {
    const item = this.items[index];
    const slide = this.dom.slides[index];
    if (!item || !slide || item.currentView === view) return;

    item.currentView = view;
    const isBack = view === 'back';

    slide.querySelector('.drop-slide__flipper')?.classList.toggle('is-flipped', isBack);
    slide.querySelector('.drop-slide__face--front')?.setAttribute('aria-hidden', String(isBack));
    slide.querySelector('.drop-slide__face--back')?.setAttribute('aria-hidden', String(!isBack));
    slide.querySelectorAll('[data-drop-view]').forEach(btn => {
      btn.setAttribute('aria-pressed', String(btn.dataset.dropView === view));
    });

    const readout = slide.querySelector('[data-drop-readout]');
    if (readout) readout.textContent = this.readoutText(item);
  }

  setColor(index, swatch) {
    const item = this.items[index];
    const slide = this.dom.slides[index];
    const hex = swatch.dataset.dropColor;
    if (!item || !slide || sameHex(item.colorHex, hex)) return;

    item.colorHex = hex;

    // Solo cambio el tinte de la capa base; la foto en multiply hace el resto y no hay re-render
    slide.querySelectorAll('.garment-color-base').forEach(layer => {
      layer.style.backgroundColor = hex;
    });

    slide.querySelectorAll('[data-drop-color]').forEach(btn => {
      btn.setAttribute('aria-pressed', String(btn === swatch));
    });

    const nameEl = slide.querySelector('[data-drop-color-name]');
    if (nameEl) nameEl.textContent = swatch.dataset.dropColorLabel;

    this.dom.railButtons[index]?.querySelector('[data-drop-chip]')?.style.setProperty('--swatch', hex);
  }

  // ---------------------------------------------------------------------------
  // Parallax del visor (RAF, una lectura de layout por frame como máximo)
  // ---------------------------------------------------------------------------

  applyParallax() {
    this.parallaxFrame = null;

    const stage = this.dom.slides?.[this.currentIndex]?.querySelector('[data-drop-stage]');
    const e = this.lastPointer;
    if (!stage || !e) return;

    if (!stage.contains(e.target)) {
      this.resetParallax();
      return;
    }

    const rect = stage.getBoundingClientRect();
    // Normalizado a -1..1 desde el centro del visor
    const x = clamp(((e.clientX - rect.left) / rect.width - 0.5) * 2, -1, 1);
    const y = clamp(((e.clientY - rect.top) / rect.height - 0.5) * 2, -1, 1);

    stage.style.setProperty('--mx', x.toFixed(3));
    stage.style.setProperty('--my', y.toFixed(3));
  }

  resetParallax(slide = this.dom.slides?.[this.currentIndex]) {
    const stage = slide?.querySelector('[data-drop-stage]');
    if (!stage) return;
    stage.style.removeProperty('--mx');
    stage.style.removeProperty('--my');
  }

  // ---------------------------------------------------------------------------
  // Autoplay
  // ---------------------------------------------------------------------------

  toggleAutoplay() {
    this.autoplayEnabled = !this.autoplayEnabled;
    this.syncPlayback();
  }

  setHold(reason, value) {
    if (this.holds[reason] === value) return;
    this.holds[reason] = value;
    this.syncPlayback();
  }

  syncPlayback() {
    const { section, toggle, toggleLabel, counterLive } = this.dom;
    if (!section) return;

    const isHeld = Object.values(this.holds).some(Boolean);

    section.classList.toggle('is-manual', !this.autoplayEnabled);
    section.classList.toggle('is-held', this.autoplayEnabled && isHeld);

    if (toggle) {
      toggle.dataset.state = this.autoplayEnabled ? 'running' : 'stopped';
      toggle.setAttribute('aria-label', this.autoplayEnabled
        ? 'Pausar el avance automático'
        : 'Reanudar el avance automático');
    }
    if (toggleLabel) toggleLabel.textContent = this.autoplayEnabled ? 'Pausar' : 'Reanudar';

    // Con autoplay activo no anunciamos cada cambio (WCAG 2.2.2); en manual, sí
    if (counterLive) counterLive.setAttribute('aria-live', this.autoplayEnabled ? 'off' : 'polite');
  }
}
