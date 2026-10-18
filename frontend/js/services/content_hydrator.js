// Servicio de hidratación del DOM con el contenido dinámico del CMS.
// Separo toda esta lógica acá para no saturar app.js. Cada función se encarga de
// una sección de la vitrina, verificando que los elementos existan antes de tocarlos.

export class ContentHydrator {
  constructor() {}

  // Sanitizo texto básico para evitar inyecciones si alguien mete HTML raro desde el panel
  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Aplico todos los bloques de contenido que recibo del backend
  apply(content) {
    if (!content) return;

    this._hydrateAnnouncement(content.announcement);
    this._hydrateHero(content.hero);
    this._hydrateMarquee(content.marquee);
    this._hydrateHeaders(content.headers);
    this._hydrateStats(content.stats);
    this._hydrateStatement(content.statement);
    this._hydrateEditorial(content.editorial);
    this._hydrateProtocol(content.protocol);
    this._hydrateContact(content.contact);
  }

  // 1. Barra superior de anuncios del taller
  _hydrateAnnouncement(announcement) {
    if (!announcement) return;
    const bar = document.getElementById('topAnnouncementBar');
    const text = document.getElementById('topAnnouncementText');

    if (bar) bar.style.display = announcement.is_active ? '' : 'none';
    if (text) {
      text.innerHTML = `<span class="live-pulse-dot"></span> ${this.escapeHtml(announcement.text)}`;
    }
  }

  // 2. Título, subtítulo, botones e imágenes del hero
  _hydrateHero(hero) {
    if (!hero) return;

    const title = document.getElementById('heroTitle');
    const sub = document.getElementById('heroSubtitle');
    const ctaText = document.getElementById('heroCtaText');
    const ctaLink = document.getElementById('heroCtaLink');
    const sideTop = document.getElementById('heroSideTopTag');
    const sideBottom = document.getElementById('heroSideBottomTag');

    if (title && hero.headline) {
      title.innerHTML = this.escapeHtml(hero.headline).replace(/\n/g, '<br>');
    }
    if (sub && hero.subtitle) sub.textContent = hero.subtitle;
    if (ctaText && hero.cta_text) ctaText.textContent = hero.cta_text;
    if (ctaLink && hero.cta_url) ctaLink.setAttribute('href', hero.cta_url);
    if (sideTop && hero.side_card_top_tag) sideTop.textContent = hero.side_card_top_tag;
    if (sideBottom && hero.side_card_bottom_tag) sideBottom.textContent = hero.side_card_bottom_tag;

    // Imágenes del hero con fallback si la URL personalizada falla
    const heroMainImg = document.getElementById('heroMainImg');
    const heroBadgeText = document.getElementById('heroBadgeText');
    const heroSideTopImg = document.getElementById('heroSideTopImg');
    const heroSideBottomImg = document.getElementById('heroSideBottomImg');

    if (heroMainImg && hero.hero_main_image) {
      heroMainImg.onerror = () => { heroMainImg.src = '/static/assets/hero_main_tshirt.png'; };
      heroMainImg.src = hero.hero_main_image;
    }
    if (heroBadgeText && hero.hero_badge_text) heroBadgeText.textContent = hero.hero_badge_text;
    if (heroSideTopImg && hero.side_card_top_image) {
      heroSideTopImg.onerror = () => { heroSideTopImg.src = '/static/assets/hero_side_top.png'; };
      heroSideTopImg.src = hero.side_card_top_image;
    }
    if (heroSideBottomImg && hero.side_card_bottom_image) {
      heroSideBottomImg.onerror = () => { heroSideBottomImg.src = '/static/assets/hero_side_bottom.png'; };
      heroSideBottomImg.src = hero.side_card_bottom_image;
    }
  }

  // 3. Cinta deslizante continua (duplico los ítems para el efecto de loop infinito)
  _hydrateMarquee(marquee) {
    if (!marquee) return;
    const wrap = document.getElementById('marqueeWrap');
    const contentEl = document.getElementById('marqueeContent');
    const contentRevEl = document.getElementById('marqueeContentReverse');

    if (wrap) wrap.style.display = marquee.is_active ? '' : 'none';
    if (contentEl && marquee.items && marquee.items.length > 0) {
      const doubleItems = marquee.items.concat(marquee.items);
      contentEl.innerHTML = doubleItems.map(it => `
        <div class="marquee-item">${this.escapeHtml(it)}</div>
        <div class="marquee-item">✦</div>
      `).join('');

      if (contentRevEl) {
        const revItems = [...marquee.items].reverse().concat([...marquee.items].reverse());
        contentRevEl.innerHTML = revItems.map((it, idx) => `
          <div class="marquee-item">${idx % 2 === 0 ? `<span class="highlight">${this.escapeHtml(it)}</span>` : this.escapeHtml(it)}</div>
          <div class="marquee-item">//</div>
        `).join('');
      }
    }
  }

  // 4. Títulos y descripciones de las secciones de catálogo y personalizador
  _hydrateHeaders(headers) {
    if (!headers) return;
    const catTitle = document.querySelector('.collection-title-main');
    const catTag = document.querySelector('.collection-header-center .badge');
    const catDesc = document.querySelector('.collection-desc-main, .collection-header-center p');
    const custTitle = document.getElementById('customizerSectionTitle');
    const custDesc = document.getElementById('customizerSectionDesc');

    if (catTitle && headers.catalog_title) catTitle.textContent = headers.catalog_title;
    if (catTag && headers.catalog_tag) catTag.textContent = headers.catalog_tag;
    if (catDesc && headers.catalog_desc) catDesc.textContent = headers.catalog_desc;
    if (custTitle && headers.customizer_title) custTitle.textContent = headers.customizer_title;
    if (custDesc && headers.customizer_desc) custDesc.textContent = headers.customizer_desc;
  }

  // 5. Métricas numéricas del taller (DPI, lavados, temperatura, pedido mínimo)
  _hydrateStats(stats) {
    if (!stats) return;
    const dpi = document.getElementById('stat-dpi');
    const minOrder = document.getElementById('stat-min-order');
    const lavados = document.getElementById('stat-lavados');
    const temp = document.getElementById('stat-temp');

    if (dpi && stats.dpi != null) dpi.textContent = stats.dpi;
    if (minOrder && stats.min_order != null) minOrder.textContent = stats.min_order;
    if (lavados && stats.wash_cycles != null) lavados.textContent = `+${stats.wash_cycles}`;
    if (temp && stats.curing_temp != null) temp.textContent = `${stats.curing_temp}°C`;

    // Sincronizo además las especificaciones rápidas del hero
    const heroSpecs = document.querySelectorAll('.hero-specs-row .hero-spec-item span:last-child');
    if (heroSpecs && heroSpecs.length >= 3) {
      if (stats.dpi != null) heroSpecs[0].textContent = `${stats.dpi} DPI Ultra HD`;
      if (stats.curing_temp != null) heroSpecs[1].textContent = `Curado a ${stats.curing_temp}°C`;
      if (stats.min_order != null) heroSpecs[2].textContent = stats.min_order === 0 ? "Cero Mínimo" : `Mín. ${stats.min_order} un.`;
    }
  }

  // 6. Manifiesto de calidad
  _hydrateStatement(statement) {
    if (!statement) return;
    const headline = document.getElementById('statementHeadline');
    const body = document.getElementById('statementBody');

    if (headline && statement.headline) headline.textContent = statement.headline;
    if (body && statement.body) body.textContent = statement.body;
  }

  // 7. Bloques editoriales: Misión y Visión con sus fotos y badges
  _hydrateEditorial(editorial) {
    if (!editorial) return;
    const mTag = document.getElementById('editorialMissionTag');
    const mTitle = document.getElementById('editorialMissionTitle');
    const mBody = document.getElementById('editorialMissionBody');
    const vTag = document.getElementById('editorialVisionTag');
    const vTitle = document.getElementById('editorialVisionTitle');
    const vBody = document.getElementById('editorialVisionBody');
    const missionImg = document.getElementById('editorialMissionImg');
    const visionImg = document.getElementById('editorialVisionImg');

    if (mTag && editorial.mission_tag) mTag.textContent = editorial.mission_tag;
    if (mTitle && editorial.mission_title) mTitle.textContent = editorial.mission_title;
    if (mBody && editorial.mission_body) mBody.textContent = editorial.mission_body;
    if (vTag && editorial.vision_tag) vTag.textContent = editorial.vision_tag;
    if (vTitle && editorial.vision_title) vTitle.textContent = editorial.vision_title;
    if (vBody && editorial.vision_body) vBody.textContent = editorial.vision_body;

    if (missionImg && editorial.mission_image) {
      missionImg.onerror = () => { missionImg.src = '/static/assets/garments/hoodie_back.png'; };
      missionImg.src = editorial.mission_image;
    }
    if (visionImg && editorial.vision_image) {
      visionImg.onerror = () => { visionImg.src = '/static/assets/garments/tshirt_front.png'; };
      visionImg.src = editorial.vision_image;
    }
  }

  // 8. Pliego de Términos y Condiciones de Taller (editable desde el CMS)
  _hydrateProtocol(protocol) {
    if (!protocol) return;
    const pBadge = document.getElementById('protocolBadgeTag');
    const pTitle = document.getElementById('protocolTitle');
    const pDesc = document.getElementById('protocolDesc');
    const pFooter = document.getElementById('protocolLegalFooter');
    const pFooterBox = document.getElementById('protocolLegalFooterBox');
    const stepsGrid = document.getElementById('protocolStepsGrid');

    if (pBadge && protocol.section_tag) pBadge.textContent = protocol.section_tag;
    if (pTitle && protocol.section_title) pTitle.textContent = protocol.section_title;
    if (pDesc && protocol.section_desc) pDesc.textContent = protocol.section_desc;
    if (pFooter && protocol.legal_footer !== undefined) {
      pFooter.textContent = protocol.legal_footer || '';
      if (pFooterBox) pFooterBox.style.display = protocol.legal_footer ? 'flex' : 'none';
    }

    if (protocol.steps && Array.isArray(protocol.steps) && protocol.steps.length > 0) {
      if (stepsGrid) {
        stepsGrid.innerHTML = protocol.steps.map((step, idx) => {
          const numStr = this.escapeHtml(step.step_number || String(idx + 1).padStart(2, '0'));
          return `
            <article class="terms-clause-card reveal-card is-visible" style="--reveal-delay: ${idx * 60}ms;">
              <div class="terms-clause-header">
                <span class="terms-clause-code">CLÁUSULA // ${numStr}</span>
                <span class="terms-clause-pill">NORMATIVA TALLER</span>
              </div>
              <h3 class="terms-clause-title" id="protocolStepTitle${idx}">${this.escapeHtml(step.title || '')}</h3>
              <p class="terms-clause-desc" id="protocolStepDesc${idx}">${this.escapeHtml(step.description || '')}</p>
            </article>
          `;
        }).join('');
      } else {
        protocol.steps.forEach((step, idx) => {
          const st = document.getElementById(`protocolStepTitle${idx}`);
          const sd = document.getElementById(`protocolStepDesc${idx}`);
          if (st && step.title) st.textContent = step.title;
          if (sd && step.description) sd.textContent = step.description;
        });
      }
    }
  }

  // 9. Datos de contacto, dirección y redes en el pie de página
  _hydrateContact(contact) {
    if (!contact) return;
    const addr = document.getElementById('footerAddressLine');
    if (addr && contact.workshop_city && contact.address) {
      addr.textContent = `Estudio de Estampado Textil de Precisión • ${contact.workshop_city} • ${contact.address}`;
    }

    const hours = document.getElementById('footerHours');
    if (hours && contact.business_hours) hours.textContent = contact.business_hours;

    const waLink = document.getElementById('footerWhatsappLink');
    const waText = document.getElementById('footerWhatsappText');
    if (waLink && contact.whatsapp_number) {
      const cleanNum = contact.whatsapp_number.replace(/\D/g, '');
      waLink.href = `https://wa.me/${cleanNum}`;
    }
    if (waText && contact.whatsapp_number) waText.textContent = contact.whatsapp_number;

    const igLink = document.getElementById('footerInstagramLink');
    const igText = document.getElementById('footerInstagramText');
    if (igLink && contact.instagram_handle) {
      const handle = contact.instagram_handle.replace(/^@/, '');
      igLink.href = `https://instagram.com/${handle}`;
    }
    if (igText && contact.instagram_handle) igText.textContent = contact.instagram_handle;

    const copy = document.getElementById('footerCopyright');
    if (copy && contact.copyright_text) copy.textContent = contact.copyright_text;
  }
}

export const contentHydrator = new ContentHydrator();
