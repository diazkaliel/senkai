/**
 * SENKAI // SISTEMA DE MICRO-INTERACCIONES Y MOVIMIENTO EDITORIAL
 * Scroll reveals, parallax, stagger, cursor gradient, contadores y tilt.
 */

// ============================================================================
// 1. NAVBAR: Compresión al scroll + Barra de progreso de lectura
// ============================================================================
function initNavbarScrollBehavior() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  const progressBar = document.createElement('div');
  progressBar.className = 'reading-progress-bar';
  navbar.appendChild(progressBar);

  const docHeight = () => document.documentElement.scrollHeight - window.innerHeight;

  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    navbar.classList.toggle('scrolled', scrollY > 60);

    const total = docHeight();
    if (total > 0) {
      progressBar.style.width = Math.min((scrollY / total) * 100, 100) + '%';
    }
  }, { passive: true });
}

// ============================================================================
// 2. SCROLL REVEAL — 5 direcciones con stagger automático y clase cinemática
// ============================================================================
let scrollObserver = null;

export function refreshScrollReveal() {
  const revealElements = document.querySelectorAll(
    '.reveal-up:not(.revealed), .reveal-left:not(.revealed), .reveal-right:not(.revealed), .reveal-scale:not(.revealed), .reveal-card:not(.revealed), .reveal-cinematic:not(.revealed)'
  );
  if (!revealElements.length) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    revealElements.forEach(el => el.classList.add('revealed'));
    return;
  }

  if (!scrollObserver) {
    scrollObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          scrollObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });
  }

  revealElements.forEach(el => scrollObserver.observe(el));
}

function initScrollReveal() {
  refreshScrollReveal();
}

// ============================================================================
// 3. STAGGERED CHILDREN — Asigna delays incrementales a hijos de .stagger-children
// ============================================================================
function initStaggeredReveal() {
  const containers = document.querySelectorAll('.stagger-children');
  if (!containers.length) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    containers.forEach(c => c.classList.add('revealed'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  containers.forEach(container => {
    const children = container.children;
    for (let i = 0; i < children.length; i++) {
      children[i].style.setProperty('--stagger-i', i);
    }
    observer.observe(container);
  });
}

// ============================================================================
// 4. SECTION VISIBILITY — Fade-in de secciones al entrar al viewport
// ============================================================================
function initSectionReveal() {
  const sections = document.querySelectorAll('.section-animate');
  if (!sections.length) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    sections.forEach(s => s.classList.add('section-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('section-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  sections.forEach(section => observer.observe(section));
}

// ============================================================================
// 5. TIMELINE — Relleno animado al entrar en viewport
// ============================================================================
function initTimelineFill() {
  const fill = document.getElementById('timelineFill');
  if (!fill) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        fill.classList.add('filled');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });

  observer.observe(fill.parentElement);
}

// ============================================================================
// 6. CONTADORES ANIMADOS con ease-out cúbico
// ============================================================================
function animateCounter(el, target, duration, prefix = '', suffix = '') {
  const startTime = performance.now();

  const step = (currentTime) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(target * eased);

    el.textContent = prefix + value + suffix;

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      el.textContent = prefix + target + suffix;
    }
  };

  requestAnimationFrame(step);
}

function initStatsCounters() {
  const statItems = document.querySelectorAll('.stat-item[data-count]');
  if (!statItems.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const item = entry.target;
        const count = parseInt(item.dataset.count, 10);
        const prefix = item.dataset.prefix || '';
        const suffix = item.dataset.suffix || '';
        const numberEl = item.querySelector('.stat-number');
        if (numberEl) animateCounter(numberEl, count, 1400, prefix, suffix);
        observer.unobserve(item);
      }
    });
  }, { threshold: 0.5 });

  statItems.forEach(item => observer.observe(item));
}

// ============================================================================
// 7. BOTONES MAGNÉTICOS — Atracción sutil hacia el cursor (max 5px)
// ============================================================================
function initMagneticHover() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if ('ontouchstart' in window) return;

  const magneticElements = document.querySelectorAll('.btn-magnetic');

  magneticElements.forEach(el => {
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = Math.max(-5, Math.min(5, (e.clientX - centerX) * 0.18));
      const deltaY = Math.max(-5, Math.min(5, (e.clientY - centerY) * 0.18));

      el.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    });

    el.addEventListener('mouseleave', () => {
      el.style.transform = 'translate(0px, 0px)';
    });
  });
}

// ============================================================================
// 8. TILT 3D por delegación con RAF Throttling (DESIGN.md: tope estricto 3.5deg)
// ============================================================================
function initCard3DTilt() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if ('ontouchstart' in window) return;

  let activeCard = null;
  let rafId = null;
  let latestEvent = null;

  const updateTilt = () => {
    rafId = null;
    if (!latestEvent) return;

    const e = latestEvent;
    const card = e.target.closest('.collection-card-pro, .hero-side-card, .protocol-card');
    if (!card) {
      if (activeCard) {
        activeCard.style.transform = '';
        activeCard = null;
      }
      return;
    }

    if (activeCard && activeCard !== card) {
      activeCard.style.transform = '';
    }
    activeCard = card;

    const rect = card.getBoundingClientRect();
    const normX = (e.clientX - rect.left) / rect.width - 0.5;
    const normY = (e.clientY - rect.top) / rect.height - 0.5;

    // Ángulo controlado y acotado (tope estricto de 3.5deg en rotateX y rotateY)
    const rotY = Math.max(-3.5, Math.min(3.5, Math.round(normX * 3.5 * 10) / 10));
    const rotX = Math.max(-3.5, Math.min(3.5, Math.round(-normY * 3.5 * 10) / 10));

    card.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-3px)`;
  };

  document.addEventListener('mousemove', (e) => {
    latestEvent = e;
    if (!rafId) {
      rafId = requestAnimationFrame(updateTilt);
    }
  }, { passive: true });

  document.addEventListener('mouseleave', () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    latestEvent = null;
    if (activeCard) {
      activeCard.style.transform = '';
      activeCard = null;
    }
  });
}

// ============================================================================
// 9. MARQUEE CINÉTICO — Aceleración reactiva al scroll en tracks directos y reversos
// ============================================================================
function initKineticMarquee() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const marqueeElements = document.querySelectorAll('.marquee-content, .marquee-content-reverse');
  if (!marqueeElements.length) return;

  let lastScrollY = window.scrollY;
  let velocityDecayId = null;

  window.addEventListener('scroll', () => {
    const currentY = window.scrollY;
    const delta = Math.abs(currentY - lastScrollY);
    lastScrollY = currentY;

    const scrollVelocity = Math.min(delta * 0.35, 12);
    const targetDuration = Math.max(12, 24 - scrollVelocity);

    marqueeElements.forEach(el => {
      el.style.animationDuration = `${targetDuration}s`;
    });

    clearTimeout(velocityDecayId);
    velocityDecayId = setTimeout(() => {
      marqueeElements.forEach(el => {
        el.style.animationDuration = el.classList.contains('marquee-content-reverse') ? '26s' : '22s';
      });
    }, 220);
  }, { passive: true });
}


// ============================================================================
// 10. PARALLAX LAYERS — Traducción vertical proporcional al scroll
// ============================================================================
function initParallaxLayers() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if ('ontouchstart' in window) return;

  const parallaxElements = document.querySelectorAll('.parallax-slow');
  if (!parallaxElements.length) return;

  let ticking = false;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        parallaxElements.forEach(el => {
          const rect = el.getBoundingClientRect();
          const centerY = rect.top + rect.height / 2;
          const viewCenter = window.innerHeight / 2;
          const offset = (centerY - viewCenter) * 0.08;
          el.style.transform = `translateY(${offset}px)`;
        });
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

// ============================================================================
// 11. HAMBURGER MENU — Toggle del drawer de navegación móvil
// ============================================================================
function initMobileNav() {
  const hamburger = document.getElementById('navHamburger');
  const drawer = document.getElementById('mobileNavDrawer');
  const backdrop = document.getElementById('mobileNavBackdrop');
  const closeBtn = document.getElementById('mobileNavClose');
  if (!hamburger || !drawer) return;

  const toggleMenu = (open) => {
    const isOpen = typeof open === 'boolean' ? open : !drawer.classList.contains('open');
    drawer.classList.toggle('open', isOpen);
    hamburger.classList.toggle('is-open', isOpen);
    if (backdrop) backdrop.classList.toggle('open', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  };

  hamburger.addEventListener('click', () => toggleMenu());
  if (closeBtn) closeBtn.addEventListener('click', () => toggleMenu(false));
  if (backdrop) backdrop.addEventListener('click', () => toggleMenu(false));

  drawer.querySelectorAll('.mobile-nav-link').forEach(link => {
    link.addEventListener('click', () => toggleMenu(false));
  });

  window.addEventListener('hashchange', () => toggleMenu(false));
}

// ============================================================================
// 12. TEXTURA SCANLINES (Atelier CRT analógico muy sutil)
// ============================================================================
function initScanlines() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!prefersReducedMotion && document.body) {
    document.body.classList.add('scanlines');
  }
}

// ============================================================================
// INICIALIZACIÓN Y REACTIVIDAD ANTE CAMBIOS DINÁMICOS DEL DOM
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  initScanlines();
  initNavbarScrollBehavior();
  initScrollReveal();
  initStaggeredReveal();
  initSectionReveal();
  initTimelineFill();
  initStatsCounters();
  initMagneticHover();
  initCard3DTilt();
  initKineticMarquee();
  initParallaxLayers();
  initMobileNav();
});

// Refrescar observadores cuando el catálogo, CMS o carrusel se hidratan
window.addEventListener('senkai:dom-updated', () => {
  refreshScrollReveal();
});
