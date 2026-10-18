// Submódulo del CMS: Secciones Generales y Parámetros del Taller.
// Acá agrupo las secciones complementarias (anuncios, marquesina, encabezados,
// métricas de calibración, manifiesto, protocolo de producción y pie de página).

// 1. Cintillo de Anuncios Superior
export function renderAnnouncementSection(announcement, escapeHtml) {
  return `
    <div class="cms-card" id="cms-section-announcement" data-section="announcement">
      <div class="cms-card-header">
        <div class="cms-card-title">
          <span class="material-symbols-outlined" style="font-size: 18px; color: var(--accent-admin);">campaign</span>
          <span>Cintillo de Anuncios Superior</span>
        </div>
        <span class="badge badge-admin">GLOBAL</span>
      </div>
      
      <div class="cms-switch-row">
        <div class="cms-switch-label-wrap">
          <span class="cms-switch-title">Cintillo Activo</span>
          <span class="cms-switch-desc">Muestra u oculta la barra en la cabecera pública</span>
        </div>
        <label class="cms-toggle">
          <input type="checkbox" id="cms-announcement-active" ${announcement.is_active ? 'checked' : ''}>
          <span class="cms-toggle-slider"></span>
        </label>
      </div>

      <div class="cms-field-group">
        <label class="cms-label" for="cms-announcement-text">
          <span>Texto del Anuncio</span>
          <span class="cms-char-counter" id="char-announcement-text">0/160</span>
        </label>
        <input type="text" id="cms-announcement-text" class="cms-input" maxlength="160" value="${escapeHtml(announcement.text)}">
      </div>

      <div class="cms-card-footer">
        <button class="btn-cms-save" data-action="save-section" data-target="announcement">
          <span class="material-symbols-outlined" style="font-size: 16px;">save</span>
          <span>Guardar Cintillo</span>
        </button>
      </div>
    </div>
  `;
}

export function collectAnnouncementPayload() {
  return {
    text: document.getElementById('cms-announcement-text').value.trim(),
    is_active: document.getElementById('cms-announcement-active').checked
  };
}

// 2. Cinta Deslizante Marquee (Ticker continuo)
export function renderMarqueeSection(marquee, escapeHtml) {
  return `
    <div class="cms-card" id="cms-section-marquee" data-section="marquee">
      <div class="cms-card-header">
        <div class="cms-card-title">
          <span class="material-symbols-outlined" style="font-size: 18px; color: var(--accent-admin);">repeat</span>
          <span>Cinta Deslizante (Marquee Ticker)</span>
        </div>
        <span class="badge badge-crimson">DINÁMICO</span>
      </div>

      <div class="cms-switch-row">
        <div class="cms-switch-label-wrap">
          <span class="cms-switch-title">Cinta Activa</span>
          <span class="cms-switch-desc">Muestra u oculta la cinta en la vitrina pública</span>
        </div>
        <label class="cms-toggle">
          <input type="checkbox" id="cms-marquee-active" ${marquee.is_active ? 'checked' : ''}>
          <span class="cms-toggle-slider"></span>
        </label>
      </div>

      <div class="cms-field-group">
        <label class="cms-label" for="cms-marquee-items">
          <span>Elementos de la Cinta (separados por coma)</span>
        </label>
        <textarea id="cms-marquee-items" class="cms-textarea" style="min-height: 70px;">${escapeHtml((marquee.items || []).join(', '))}</textarea>
      </div>

      <div class="cms-card-footer">
        <button class="btn-cms-save" data-action="save-section" data-target="marquee">
          <span class="material-symbols-outlined" style="font-size: 16px;">save</span>
          <span>Guardar Cinta Marquee</span>
        </button>
      </div>
    </div>
  `;
}

export function collectMarqueePayload() {
  const rawItems = document.getElementById('cms-marquee-items').value;
  const items = rawItems
    .split(/[\n,]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
  return {
    items: items.length > 0 ? items : ["LIMITED EDITION", "NEW ARRIVAL"],
    is_active: document.getElementById('cms-marquee-active').checked
  };
}

// 3. Encabezados de Sección (Catálogo y Personalizador)
export function renderHeadersSection(headers, escapeHtml) {
  return `
    <div class="cms-card" id="cms-section-headers" data-section="headers">
      <div class="cms-card-header">
        <div class="cms-card-title">
          <span class="material-symbols-outlined" style="font-size: 18px; color: var(--accent-admin);">title</span>
          <span>Encabezados de Secciones (Colecciones & Atelier)</span>
        </div>
        <span class="badge badge-admin">PORTADA</span>
      </div>

      <div class="cms-field-group">
        <label class="cms-label" for="cms-headers-catalog-tag">Tag Superior Colecciones</label>
        <input type="text" id="cms-headers-catalog-tag" class="cms-input" maxlength="60" value="${escapeHtml(headers.catalog_tag || 'LOOKBOOK 2026 // EDICIÓN LIMITADA')}">
      </div>

      <div class="cms-form-row-2col">
        <div class="cms-field-group">
          <label class="cms-label" for="cms-headers-catalog-title">Título Colecciones</label>
          <input type="text" id="cms-headers-catalog-title" class="cms-input" maxlength="100" value="${escapeHtml(headers.catalog_title || 'Colección Textil Streetwear')}">
        </div>
        <div class="cms-field-group">
          <label class="cms-label" for="cms-headers-customizer-title">Título Atelier</label>
          <input type="text" id="cms-headers-customizer-title" class="cms-input" maxlength="100" value="${escapeHtml(headers.customizer_title || 'Atelier de Personalización DTF')}">
        </div>
      </div>

      <div class="cms-field-group">
        <label class="cms-label" for="cms-headers-catalog-desc">Descripción Colecciones</label>
        <textarea id="cms-headers-catalog-desc" class="cms-textarea" style="min-height: 60px;">${escapeHtml(headers.catalog_desc || '')}</textarea>
      </div>

      <div class="cms-field-group">
        <label class="cms-label" for="cms-headers-customizer-desc">Descripción Atelier</label>
        <textarea id="cms-headers-customizer-desc" class="cms-textarea" style="min-height: 60px;">${escapeHtml(headers.customizer_desc || '')}</textarea>
      </div>

      <div class="cms-card-footer">
        <button class="btn-cms-save" data-action="save-section" data-target="headers">
          <span class="material-symbols-outlined" style="font-size: 16px;">save</span>
          <span>Guardar Encabezados</span>
        </button>
      </div>
    </div>
  `;
}

export function collectHeadersPayload() {
  return {
    catalog_tag: document.getElementById('cms-headers-catalog-tag').value.trim() || "LOOKBOOK 2026 // EDICIÓN LIMITADA",
    catalog_title: document.getElementById('cms-headers-catalog-title').value.trim() || "Colección Textil Streetwear",
    catalog_desc: document.getElementById('cms-headers-catalog-desc').value.trim(),
    customizer_title: document.getElementById('cms-headers-customizer-title').value.trim() || "Atelier de Personalización DTF",
    customizer_desc: document.getElementById('cms-headers-customizer-desc').value.trim()
  };
}

// 4. Métricas y Parámetros Técnicos
export function renderStatsSection(stats) {
  return `
    <div class="cms-card" id="cms-section-stats" data-section="stats">
      <div class="cms-card-header">
        <div class="cms-card-title">
          <span class="material-symbols-outlined" style="font-size: 18px; color: var(--accent-admin);">query_stats</span>
          <span>Métricas y Parámetros Técnicos</span>
        </div>
        <span class="badge badge-lime">CALIBRACIÓN</span>
      </div>

      <div class="cms-form-row-2col">
        <div class="cms-field-group">
          <label class="cms-label" for="cms-stats-dpi">Resolución DTF (DPI)</label>
          <input type="number" id="cms-stats-dpi" class="cms-input" min="150" max="1200" value="${stats.dpi}">
        </div>
        <div class="cms-field-group">
          <label class="cms-label" for="cms-stats-min-order">Pedido Mínimo (Prendas)</label>
          <input type="number" id="cms-stats-min-order" class="cms-input" min="0" max="100" value="${stats.min_order}">
        </div>
      </div>

      <div class="cms-form-row-2col" style="margin-top: 0.5rem;">
        <div class="cms-field-group">
          <label class="cms-label" for="cms-stats-wash-cycles">Ciclos de Lavado (+N)</label>
          <input type="number" id="cms-stats-wash-cycles" class="cms-input" min="10" max="200" value="${stats.wash_cycles}">
        </div>
        <div class="cms-field-group">
          <label class="cms-label" for="cms-stats-curing-temp">Prensa Térmica (°C)</label>
          <input type="number" id="cms-stats-curing-temp" class="cms-input" min="120" max="220" value="${stats.curing_temp}">
        </div>
      </div>

      <div class="cms-card-footer">
        <button class="btn-cms-save" data-action="save-section" data-target="stats">
          <span class="material-symbols-outlined" style="font-size: 16px;">save</span>
          <span>Guardar Parámetros</span>
        </button>
      </div>
    </div>
  `;
}

export function collectStatsPayload() {
  return {
    dpi: parseInt(document.getElementById('cms-stats-dpi').value, 10) || 300,
    min_order: parseInt(document.getElementById('cms-stats-min-order').value, 10) || 0,
    wash_cycles: parseInt(document.getElementById('cms-stats-wash-cycles').value, 10) || 50,
    curing_temp: parseInt(document.getElementById('cms-stats-curing-temp').value, 10) || 160
  };
}

// 5. Manifiesto y Declaración de Marca
export function renderStatementSection(statement, escapeHtml) {
  return `
    <div class="cms-card" id="cms-section-statement" data-section="statement">
      <div class="cms-card-header">
        <div class="cms-card-title">
          <span class="material-symbols-outlined" style="font-size: 18px; color: var(--accent-admin);">format_quote</span>
          <span>Manifiesto de Marca (Statement)</span>
        </div>
        <span class="badge badge-crimson">EDITORIAL</span>
      </div>

      <div class="cms-field-group">
        <label class="cms-label" for="cms-statement-headline">
          <span>Titular en Mayúsculas</span>
          <span class="cms-char-counter" id="char-statement-headline">0/80</span>
        </label>
        <input type="text" id="cms-statement-headline" class="cms-input" maxlength="80" value="${escapeHtml(statement.headline)}">
      </div>

      <div class="cms-field-group">
        <label class="cms-label" for="cms-statement-body">
          <span>Cuerpo del Manifiesto</span>
          <span class="cms-char-counter" id="char-statement-body">0/500</span>
        </label>
        <textarea id="cms-statement-body" class="cms-textarea" maxlength="500">${escapeHtml(statement.body)}</textarea>
      </div>

      <div class="cms-card-footer">
        <button class="btn-cms-save" data-action="save-section" data-target="statement">
          <span class="material-symbols-outlined" style="font-size: 16px;">save</span>
          <span>Guardar Manifiesto</span>
        </button>
      </div>
    </div>
  `;
}

export function collectStatementPayload() {
  return {
    headline: document.getElementById('cms-statement-headline').value.trim(),
    body: document.getElementById('cms-statement-body').value.trim()
  };
}

// 6. Pliego de Términos y Condiciones de Taller (Editable y con Cláusulas Dinámicas)
export function renderProtocolSection(protocol, escapeHtml) {
  const steps = Array.isArray(protocol?.steps) && protocol.steps.length > 0 ? protocol.steps : [
    {
      step_number: "01",
      title: "Confección a Pedido y Tolerancias DTF",
      description: "Toda prenda personalizada se produce bajo demanda según las coordenadas y archivos aprobados en la Mesa de Diseño."
    }
  ];

  return `
    <div class="cms-card" id="cms-section-protocol" data-section="protocol" style="grid-column: 1 / -1;">
      <div class="cms-card-header">
        <div class="cms-card-title">
          <span class="material-symbols-outlined" style="font-size: 18px; color: var(--accent-admin);">gavel</span>
          <span>Términos y Condiciones de Taller (Vitrina Principal)</span>
        </div>
        <span class="badge badge-lime">PLIEGO LEGAL & TÉCNICO</span>
      </div>

      <div class="cms-form-row-2col" style="margin-bottom: 1rem;">
        <div class="cms-field-group">
          <label class="cms-label" for="cms-protocol-tag">Etiqueta / Sello Superior</label>
          <input type="text" id="cms-protocol-tag" class="cms-input" maxlength="80" value="${escapeHtml(protocol?.section_tag || 'PLIEGO LEGAL & TÉCNICO // VIGENCIA 2026')}">
        </div>
        <div class="cms-field-group">
          <label class="cms-label" for="cms-protocol-title">Título Principal de la Sección</label>
          <input type="text" id="cms-protocol-title" class="cms-input" maxlength="120" value="${escapeHtml(protocol?.section_title || 'Términos y Condiciones de Taller')}">
        </div>
      </div>

      <div class="cms-form-row-2col" style="margin-bottom: 1.25rem;">
        <div class="cms-field-group">
          <label class="cms-label" for="cms-protocol-desc">Bajada / Introducción Normativa</label>
          <textarea id="cms-protocol-desc" class="cms-textarea" maxlength="400" style="min-height: 64px;">${escapeHtml(protocol?.section_desc || '')}</textarea>
        </div>
        <div class="cms-field-group">
          <label class="cms-label" for="cms-protocol-footer">Declaración Legal al Pie</label>
          <textarea id="cms-protocol-footer" class="cms-textarea" maxlength="500" style="min-height: 64px;">${escapeHtml(protocol?.legal_footer || 'Al confirmar una orden de producción en Senkai Studio, el cliente declara conocer y aceptar las presentes especificaciones técnicas y condiciones de confección bajo demanda.')}</textarea>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem; flex-wrap: wrap; gap: 0.5rem;">
        <span class="cms-label" style="margin: 0;">Cláusulas Activas (${steps.length})</span>
        <button type="button" class="btn btn-secondary" id="cmsAddTermsClauseBtn" style="font-size: 0.75rem; padding: 0.45rem 0.9rem; display: inline-flex; align-items: center; gap: 0.35rem;">
          <span class="material-symbols-outlined" style="font-size: 15px;">add</span>
          <span>Agregar Cláusula</span>
        </button>
      </div>

      <div class="cms-form-row-2col" id="cmsTermsClausesList" style="gap: 1rem;">
        ${steps.map((step, idx) => renderSingleTermsClauseCard(step, idx, escapeHtml)).join('')}
      </div>

      <div class="cms-card-footer">
        <button class="btn-cms-save" data-action="save-section" data-target="protocol">
          <span class="material-symbols-outlined" style="font-size: 16px;">save</span>
          <span>Guardar Términos y Condiciones</span>
        </button>
      </div>
    </div>
  `;
}

export function renderSingleTermsClauseCard(step, idx, escapeHtml) {
  const numStr = step.step_number || String(idx + 1).padStart(2, '0');
  return `
    <div class="cms-terms-clause-item" data-clause-index="${idx}" style="background: var(--bg-surface-elevated); padding: 1.15rem; border: 1px solid var(--border-subtle); display: flex; flex-direction: column; gap: 0.75rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;">
        <span class="badge" style="width: fit-content;">CLÁUSULA ${escapeHtml(numStr)}</span>
        <button type="button" class="btn-cms-remove-clause" data-remove-clause="${idx}" title="Eliminar esta cláusula" style="background: transparent; border: 1px solid var(--border-subtle); color: var(--text-muted); padding: 0.2rem 0.5rem; font-size: 0.7rem; font-family: var(--font-mono); cursor: pointer;">
          ✕ Quitar
        </button>
      </div>
      <div class="cms-field-group">
        <label class="cms-label">Título de la Cláusula</label>
        <input type="text" class="cms-input cms-clause-title" maxlength="120" value="${escapeHtml(step.title || '')}" placeholder="Ej: Política de Cambios y Garantía Legal">
      </div>
      <div class="cms-field-group">
        <label class="cms-label">Detalle / Condición</label>
        <textarea class="cms-textarea cms-clause-desc" maxlength="800" style="min-height: 90px;" placeholder="Describe la condición técnica o comercial...">${escapeHtml(step.description || '')}</textarea>
      </div>
    </div>
  `;
}

export function collectProtocolPayload() {
  const clauseEls = document.querySelectorAll('#cmsTermsClausesList .cms-terms-clause-item');
  const steps = Array.from(clauseEls).map((el, idx) => {
    const titleEl = el.querySelector('.cms-clause-title');
    const descEl = el.querySelector('.cms-clause-desc');
    return {
      step_number: String(idx + 1).padStart(2, '0'),
      title: (titleEl ? titleEl.value.trim() : '') || `Cláusula ${idx + 1}`,
      description: (descEl ? descEl.value.trim() : '') || 'Condición operativa de taller.'
    };
  });

  return {
    section_tag: (document.getElementById('cms-protocol-tag')?.value.trim()) || "PLIEGO LEGAL & TÉCNICO // VIGENCIA 2026",
    section_title: (document.getElementById('cms-protocol-title')?.value.trim()) || "Términos y Condiciones de Taller",
    section_desc: (document.getElementById('cms-protocol-desc')?.value.trim()) || "Normativa operativa de estampado DTF y condiciones comerciales.",
    legal_footer: (document.getElementById('cms-protocol-footer')?.value.trim()) || "",
    steps: steps.length > 0 ? steps : [
      {
        step_number: "01",
        title: "Confección a Pedido y Tolerancias DTF",
        description: "Toda prenda personalizada se produce bajo demanda según las especificaciones aprobadas."
      }
    ]
  };
}

// 7. Contacto y Taller Físico
export function renderContactSection(contact, escapeHtml) {
  return `
    <div class="cms-card" id="cms-section-contact" data-section="contact" style="grid-column: 1 / -1;">
      <div class="cms-card-header">
        <div class="cms-card-title">
          <span class="material-symbols-outlined" style="font-size: 18px; color: var(--accent-admin);">call</span>
          <span>Datos de Contacto y Taller Físico</span>
        </div>
        <span class="badge badge-admin">FOOTER</span>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
        <div class="cms-field-group">
          <label class="cms-label" for="cms-contact-city">Ciudad / Región</label>
          <input type="text" id="cms-contact-city" class="cms-input" value="${escapeHtml(contact.workshop_city)}">
        </div>
        <div class="cms-field-group">
          <label class="cms-label" for="cms-contact-address">Dirección de Taller</label>
          <input type="text" id="cms-contact-address" class="cms-input" value="${escapeHtml(contact.address)}">
        </div>
        <div class="cms-field-group">
          <label class="cms-label" for="cms-contact-email">Email de Atención</label>
          <input type="email" id="cms-contact-email" class="cms-input" value="${escapeHtml(contact.email)}">
        </div>
        <div class="cms-field-group">
          <label class="cms-label" for="cms-contact-phone">Teléfono de Taller</label>
          <input type="text" id="cms-contact-phone" class="cms-input" value="${escapeHtml(contact.phone)}">
        </div>
        <div class="cms-field-group">
          <label class="cms-label" for="cms-contact-whatsapp">WhatsApp Directo</label>
          <input type="text" id="cms-contact-whatsapp" class="cms-input" value="${escapeHtml(contact.whatsapp_number || contact.phone || '')}">
        </div>
        <div class="cms-field-group">
          <label class="cms-label" for="cms-contact-instagram">Instagram</label>
          <input type="text" id="cms-contact-instagram" class="cms-input" value="${escapeHtml(contact.instagram)}">
        </div>
        <div class="cms-field-group">
          <label class="cms-label" for="cms-contact-hours">Horarios de Atención</label>
          <input type="text" id="cms-contact-hours" class="cms-input" value="${escapeHtml(contact.business_hours || 'Lunes a Viernes 09:00 - 18:30 hrs')}">
        </div>
        <div class="cms-field-group" style="grid-column: 1 / -1;">
          <label class="cms-label" for="cms-contact-copyright">Texto de Pie de Página / Copyright</label>
          <input type="text" id="cms-contact-copyright" class="cms-input" value="${escapeHtml(contact.copyright_text || 'Estudio de Estampado Textil de Precisión • Santiago, Chile')}">
        </div>
      </div>

      <div class="cms-card-footer">
        <button class="btn-cms-save" data-action="save-section" data-target="contact">
          <span class="material-symbols-outlined" style="font-size: 16px;">save</span>
          <span>Guardar Datos de Contacto</span>
        </button>
      </div>
    </div>
  `;
}

export function collectContactPayload() {
  return {
    workshop_city: document.getElementById('cms-contact-city').value.trim(),
    address: document.getElementById('cms-contact-address').value.trim(),
    email: document.getElementById('cms-contact-email').value.trim(),
    phone: document.getElementById('cms-contact-phone').value.trim(),
    whatsapp_number: document.getElementById('cms-contact-whatsapp').value.trim(),
    instagram: document.getElementById('cms-contact-instagram').value.trim(),
    business_hours: document.getElementById('cms-contact-hours').value.trim(),
    copyright_text: document.getElementById('cms-contact-copyright').value.trim()
  };
}
