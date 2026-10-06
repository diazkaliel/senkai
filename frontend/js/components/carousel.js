/**
 * SENKAI // ProductCarousel Controller
 * Riel de productos con CSS Scroll Snap nativo a 60 FPS, autoplay inteligente,
 * loop infinito suave, paginación segmentada y cumplimiento estricto de WCAG 2.2.2.
 */

import { COLLECTION_ITEMS, renderProductCardMarkup } from './catalog.js';

export class ProductCarousel {
  /**
   * @param {HTMLElement|string} containerId - Elemento o ID del contenedor
   * @param {Object} [options]
   * @param {Array} [options.items] - Colección de prendas destacadas
   * @param {number} [options.interval=4000] - Tiempo de permanencia por slide en ms
   * @param {boolean} [options.autoplay=true] - Estado inicial del movimiento automático
   * @param {Function} [options.onSelectForCustomizer] - Callback al enviar al taller DTF
   * @param {Function} [options.onAddToCart] - Callback para añadir directo al carrito
   */
  constructor(containerId, options = {}) {
    this.container = typeof containerId === 'string'
      ? document.getElementById(containerId)
      : containerId;

    this.onSelectForCustomizer = options.onSelectForCustomizer || (() => {});
    this.onAddToCart = options.onAddToCart || (() => {});
    this.garments = [];
    this.items = options.items ? [...options.items] : COLLECTION_ITEMS.map(i => ({ ...i }));

    // Configuración de movimiento automático y loop
    this.interval = options.interval || 4500;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.isAutoplayEnabled = options.autoplay !== false && !prefersReducedMotion;
    this.isUserInteracting = false; // Pausado temporalmente por hover/focus/touch
    this.autoplayTimer = null;
    this.currentSlideIndex = 0;

    // Referencias al DOM
    this.track = null;
    this.btnPrev = null;
    this.btnNext = null;
    this.btnAutoplay = null;
    this.progressBar = null;
    this.counterEl = null;
    this.dotsContainer = null;
    this.ticking = false;
  }

  /**
   * Inicializa o actualiza el carrusel con la lista de prendas de la base de datos.
   */
  init(garments = []) {
    this.garments = garments;
    if (!this.container) return;

    this.render();
    this.bindElements();
    this.attachEvents();
    this.updateState();

    if (this.isAutoplayEnabled) {
      this.startAutoplay();
    }
  }

  render() {
    this.container.innerHTML = `
      <section class="editorial-carousel-section" aria-roledescription="carousel" aria-label="Lanzamientos Destacados">
        <div class="carousel-header-bar">
          <div>
            <h3 class="carousel-title">Lanzamientos Destacados</h3>
          </div>

          <div class="carousel-controls-group">
            <button class="carousel-autoplay-btn ${this.isAutoplayEnabled ? '' : 'paused'}" id="carouselAutoplayToggle" aria-label="Pausar o reanudar movimiento automático" title="Pausar / Reanudar autoplay">
              <span class="status-dot"></span>
              <span class="material-symbols-outlined" style="font-size: 16px;">${this.isAutoplayEnabled ? 'pause' : 'play_arrow'}</span>
            </button>

            <div class="carousel-counter" aria-live="polite">
              <span class="current" id="carouselCurrentIndex">01</span> / <span id="carouselTotalCount">${String(this.items.length).padStart(2, '0')}</span>
            </div>

            <button class="carousel-nav-btn" id="carouselPrevBtn" aria-label="Prenda anterior (con loop)" title="Desplazar hacia la izquierda">
              <span class="material-symbols-outlined">arrow_back</span>
            </button>
            <button class="carousel-nav-btn" id="carouselNextBtn" aria-label="Siguiente prenda (con loop)" title="Desplazar hacia la derecha">
              <span class="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        </div>

        <div class="carousel-track-viewport">
          <div class="carousel-track" tabindex="0" role="region" aria-label="Riel continuo de prendas">
            ${this.items.map((item, index) => `
              <div class="carousel-slide-item" data-slide-index="${index}" role="group" aria-roledescription="slide" aria-label="${index + 1} de ${this.items.length}">
                ${renderProductCardMarkup(item, this.garments)}
              </div>
            `).join('')}
          </div>

          <div class="carousel-dock-footer">
            <div class="carousel-progress-rail" aria-hidden="true">
              <div class="carousel-progress-bar" id="carouselProgressBar"></div>
            </div>

            <div class="carousel-indicators-row" id="carouselIndicators" role="tablist" aria-label="Páginas del carrusel">
              ${this.items.map((_, index) => `
                <button class="carousel-indicator-bar ${index === 0 ? 'active' : ''}" 
                        data-goto-index="${index}" 
                        role="tab" 
                        aria-selected="${index === 0}" 
                        aria-label="Ir a prenda ${index + 1}">
                </button>
              `).join('')}
            </div>
          </div>
        </div>
      </section>
    `;
  }

  bindElements() {
    this.track = this.container.querySelector('.carousel-track');
    this.btnPrev = this.container.querySelector('#carouselPrevBtn');
    this.btnNext = this.container.querySelector('#carouselNextBtn');
    this.btnAutoplay = this.container.querySelector('#carouselAutoplayToggle');
    this.progressBar = this.container.querySelector('#carouselProgressBar');
    this.counterEl = this.container.querySelector('#carouselCurrentIndex');
    this.dotsContainer = this.container.querySelector('#carouselIndicators');
  }

  attachEvents() {
    if (!this.track) return;

    // Scroll pasivo sincronizado con requestAnimationFrame para 60 FPS sin tirones
    this.track.addEventListener('scroll', () => {
      if (!this.ticking) {
        window.requestAnimationFrame(() => {
          this.updateState();
          this.ticking = false;
        });
        this.ticking = true;
      }
    }, { passive: true });

    // Botones con comportamiento de loop circular
    if (this.btnPrev) {
      this.btnPrev.addEventListener('click', () => {
        this.prevSlide();
        this.restartAutoplayTimer();
      });
    }

    if (this.btnNext) {
      this.btnNext.addEventListener('click', () => {
        this.nextSlide();
        this.restartAutoplayTimer();
      });
    }

    // Botón de Play/Pause manual para WCAG 2.2.2
    if (this.btnAutoplay) {
      this.btnAutoplay.addEventListener('click', () => this.toggleAutoplay());
    }

    // Salto directo al pulsar las barras de paginación
    if (this.dotsContainer) {
      this.dotsContainer.addEventListener('click', (e) => {
        const dot = e.target.closest('[data-goto-index]');
        if (dot) {
          const targetIdx = parseInt(dot.dataset.gotoIndex, 10);
          this.goToSlide(targetIdx);
          this.restartAutoplayTimer();
        }
      });
    }

    // Navegación por teclado (Flechas) cuando el riel tiene foco
    this.track.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.prevSlide();
        this.restartAutoplayTimer();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.nextSlide();
        this.restartAutoplayTimer();
      }
    });

    // Pausa temporal en hover y reanudación limpia al salir
    this.container.addEventListener('mouseenter', () => {
      this.isUserInteracting = true;
      this.clearAutoplayTimer();
    });

    this.container.addEventListener('mouseleave', () => {
      this.isUserInteracting = false;
      if (this.isAutoplayEnabled) {
        this.startAutoplay();
      }
    });

    // Pausa temporal en interacción táctil
    this.track.addEventListener('touchstart', () => {
      this.isUserInteracting = true;
      this.clearAutoplayTimer();
    }, { passive: true });

    this.track.addEventListener('touchend', () => {
      // Breve margen de cortesía antes de reanudar el avance
      setTimeout(() => {
        this.isUserInteracting = false;
        if (this.isAutoplayEnabled) {
          this.startAutoplay();
        }
      }, 2500);
    }, { passive: true });

    // Pausa cuando el foco del teclado entra en cualquier control interno (evita que el slide escape mientras se opera)
    this.container.addEventListener('focusin', () => {
      this.isUserInteracting = true;
      this.clearAutoplayTimer();
    });

    this.container.addEventListener('focusout', (e) => {
      // Solo reanudar si el nuevo foco no pertenece a este contenedor
      if (!this.container.contains(e.relatedTarget)) {
        this.isUserInteracting = false;
        if (this.isAutoplayEnabled) {
          this.startAutoplay();
        }
      }
    });

    // Detener timer en pestañas inactivas para ahorrar ciclos de CPU y batería
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.clearAutoplayTimer();
      } else if (this.isAutoplayEnabled && !this.isUserInteracting) {
        this.startAutoplay();
      }
    });

    // Delegación de eventos para las interacciones de cada tarjeta
    this.container.addEventListener('click', (e) => {
      const toggleModeBtn = e.target.closest('[data-toggle-mode]');
      if (toggleModeBtn) {
        e.stopPropagation();
        const item = this.items.find(i => i.id === toggleModeBtn.dataset.toggleMode);
        if (item) {
          item.viewMode = (item.viewMode === 'svg') ? 'photo' : 'svg';
          this.updateSingleCard(item);
        }
        return;
      }

      const flipBtn = e.target.closest('.card-view-btn[data-flip-view]');
      if (flipBtn) {
        e.stopPropagation();
        const item = this.items.find(i => i.id === flipBtn.dataset.cardId);
        if (item) {
          const newView = flipBtn.dataset.flipView;
          item.currentView = newView;
          const isBack = newView === 'back';
          const cardEl = flipBtn.closest('.collection-card-pro');
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
        return;
      }

      const swatchDot = e.target.closest('.card-swatch-dot');
      if (swatchDot) {
        e.stopPropagation();
        const item = this.items.find(i => i.id === swatchDot.dataset.cardId);
        if (item && item.colorHex.toLowerCase() !== swatchDot.dataset.colorHex.toLowerCase()) {
          item.colorHex = swatchDot.dataset.colorHex;
          this.updateSingleCard(item);
        }
        return;
      }

      const customizerTrigger = e.target.closest('[data-open-customizer]');
      if (customizerTrigger) {
        this.onSelectForCustomizer(customizerTrigger.dataset.openCustomizer, {
          colorHex: customizerTrigger.dataset.colorHex,
          view: customizerTrigger.dataset.view || 'front'
        });
      }
    });
  }

  /**
   * Reemplaza el DOM de una tarjeta individual conservando intacta la posición de scroll.
   */
  updateSingleCard(item) {
    const cardEl = this.container.querySelector(`.collection-card-pro[data-card-id="${item.id}"]`);
    if (!cardEl) return;

    const template = document.createElement('template');
    template.innerHTML = renderProductCardMarkup(item, this.garments).trim();
    cardEl.replaceWith(template.content.firstElementChild);
  }

  /**
   * Inicia el temporizador de avance cíclico.
   */
  startAutoplay() {
    this.clearAutoplayTimer();
    if (!this.isAutoplayEnabled || this.isUserInteracting) return;

    this.autoplayTimer = setTimeout(() => {
      this.nextSlide();
      this.startAutoplay();
    }, this.interval);
  }

  clearAutoplayTimer() {
    if (this.autoplayTimer) {
      clearTimeout(this.autoplayTimer);
      this.autoplayTimer = null;
    }
  }

  restartAutoplayTimer() {
    if (this.isAutoplayEnabled && !this.isUserInteracting) {
      this.startAutoplay();
    }
  }

  toggleAutoplay() {
    this.isAutoplayEnabled = !this.isAutoplayEnabled;
    if (this.btnAutoplay) {
      this.btnAutoplay.classList.toggle('paused', !this.isAutoplayEnabled);
      const icon = this.btnAutoplay.querySelector('.material-symbols-outlined');
      if (icon) icon.textContent = this.isAutoplayEnabled ? 'pause' : 'play_arrow';
    }

    if (this.isAutoplayEnabled) {
      this.startAutoplay();
    } else {
      this.clearAutoplayTimer();
    }
  }

  /**
   * Desplaza hacia la siguiente prenda con loop infinito al inicio.
   */
  nextSlide() {
    if (this.currentSlideIndex === this.items.length - 1) {
      this.goToSlide(this.items.length - 1);
      setTimeout(() => {
        if (!this.track) return;
        this.track.style.scrollBehavior = 'auto';
        this.track.scrollTo({ left: 0 });
        this.track.style.scrollBehavior = '';
        this.currentSlideIndex = 0;
        this.syncActiveIndicators(0);
        this.updateState();
      }, 650);
    } else {
      const nextIdx = this.currentSlideIndex + 1;
      this.goToSlide(nextIdx);
    }
  }

  /**
   * Desplaza hacia la prenda anterior con loop infinito hacia el final.
   */
  prevSlide() {
    if (this.currentSlideIndex === 0) {
      if (!this.track) return;
      this.track.style.scrollBehavior = 'auto';
      const lastSlide = this.track.querySelector(`[data-slide-index="${this.items.length - 1}"]`);
      if (lastSlide) {
        const targetOffset = lastSlide.offsetLeft - this.track.offsetLeft;
        this.track.scrollTo({ left: targetOffset });
      }
      this.track.style.scrollBehavior = '';
      this.currentSlideIndex = this.items.length - 1;
      this.syncActiveIndicators(this.items.length - 1);
      this.updateState();
    } else {
      const prevIdx = this.currentSlideIndex - 1;
      this.goToSlide(prevIdx);
    }
  }

  /**
   * Navega de forma determinista hacia un slide dado su índice.
   */
  goToSlide(index) {
    if (!this.track) return;
    const targetSlide = this.track.querySelector(`[data-slide-index="${index}"]`);
    if (!targetSlide) return;

    // Desplazamiento exacto al offset del slide en relación al track
    const targetOffset = targetSlide.offsetLeft - this.track.offsetLeft;
    this.track.scrollTo({ left: targetOffset, behavior: 'smooth' });
    this.currentSlideIndex = index;
    this.syncActiveIndicators(index);
  }

  /**
   * Sincroniza las barras de paginación y el contador numérico.
   */
  syncActiveIndicators(activeIndex) {
    if (this.counterEl) {
      this.counterEl.textContent = String(activeIndex + 1).padStart(2, '0');
    }

    if (this.dotsContainer) {
      const dots = this.dotsContainer.querySelectorAll('.carousel-indicator-bar');
      dots.forEach((dot, idx) => {
        const isActive = idx === activeIndex;
        dot.classList.toggle('active', isActive);
        dot.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
    }
  }

  /**
   * Actualiza el progreso de la barra y detecta qué tarjeta es la visible dominante durante el scroll manual.
   */
  updateState() {
    if (!this.track) return;

    const scrollLeft = this.track.scrollLeft;
    const maxScroll = this.track.scrollWidth - this.track.clientWidth;

    // Barra de progreso continua
    const ratio = maxScroll > 0 ? (scrollLeft / maxScroll) : 0;
    if (this.progressBar) {
      this.progressBar.style.width = `${Math.min(Math.max(ratio * 100, 0), 100)}%`;
    }

    // Detección del slide dominante visible más cercano al margen izquierdo
    const slides = Array.from(this.track.querySelectorAll('.carousel-slide-item'));
    if (slides.length > 0) {
      const trackRect = this.track.getBoundingClientRect();
      let activeIndex = 0;
      let minDistance = Infinity;

      slides.forEach((slide, idx) => {
        const distance = Math.abs(slide.getBoundingClientRect().left - trackRect.left);
        if (distance < minDistance) {
          minDistance = distance;
          activeIndex = idx;
        }
      });

      slides.forEach((slide, idx) => {
        const isActive = idx === activeIndex;
        const isAdjacent = idx === activeIndex - 1 || idx === activeIndex + 1;
        
        slide.classList.toggle('is-active', isActive);
        slide.classList.toggle('is-adjacent', isAdjacent);
      });

      this.currentSlideIndex = activeIndex;
      this.syncActiveIndicators(activeIndex);
    }
  }
}
