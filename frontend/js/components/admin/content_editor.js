/**
 * SEIKO // MÓDULO CMS EDITORIAL DE LA TIENDA PÚBLICA
 * Permite al administrador editar de forma persistente y atómica todos los textos,
 * métricas de taller, anuncios y manifiestos de la vitrina pública.
 */

import { apiService } from '../../services/api.js';

export class ContentEditorComponent {
  constructor(container) {
    this.container = container;
    this.content = null;
    this.toastEl = null;
  }

  async init() {
    this.renderLoading();
    try {
      this.content = await apiService.getSiteContent();
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
      catalog_title: "Colección Textil Streetwear",
      catalog_desc: "Prendas de alta gama confeccionadas en algodón pesado de 240g a 320g con estampados DTF de alta resolución.",
      customizer_title: "Atelier de Personalización DTF",
      customizer_desc: "Selecciona la prenda base, modula el color y posiciona tu arte con cotización en tiempo real."
    };

    this.container.innerHTML = `
      <div class="cms-panel-wrap">
        <div class="cms-intro-header">
          <div>
            <h3>Gestor Editorial & Contenido Dinámico</h3>
            <p>Modifica los textos, anuncios y especificaciones de la vitrina pública con validación de taller en tiempo real.</p>
          </div>
          <div>
            <span class="badge badge-lime">SISTEMA TIPADO PYDANTIC V2</span>
          </div>
        </div>

        <div class="cms-grid">
          <!-- 1. BARRA DE ANUNCIOS SUPERIOR -->
          <div class="cms-card" data-section="announcement">
            <div class="cms-card-header">
              <div class="cms-card-title">
                <span>📢</span>
                <span>Cintillo de Anuncios Superior</span>
              </div>
              <span class="badge badge-cyan">GLOBAL</span>
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
              <input type="text" id="cms-announcement-text" class="cms-input" maxlength="160" value="${this.escapeHtml(announcement.text)}">
            </div>

            <div class="cms-card-footer">
              <button class="btn-cms-save" data-action="save-section" data-target="announcement">
                Guardar Cintillo
              </button>
            </div>
          </div>

          <!-- 2. HERO PRINCIPAL -->
          <div class="cms-card" data-section="hero">
            <div class="cms-card-header">
              <div class="cms-card-title">
                <span>⚡</span>
                <span>Hero Principal & CTA</span>
              </div>
              <span class="badge badge-cyan">PORTADA</span>
            </div>

            <div class="cms-field-group">
              <label class="cms-label" for="cms-hero-headline">
                <span>Titular de Impacto (Líneas con salto)</span>
                <span class="cms-char-counter" id="char-hero-headline">0/100</span>
              </label>
              <textarea id="cms-hero-headline" class="cms-textarea" maxlength="100" style="min-height: 70px;">${this.escapeHtml(hero.headline)}</textarea>
            </div>

            <div class="cms-field-group">
              <label class="cms-label" for="cms-hero-subtitle">
                <span>Subtítulo Técnico</span>
                <span class="cms-char-counter" id="char-hero-subtitle">0/300</span>
              </label>
              <textarea id="cms-hero-subtitle" class="cms-textarea" maxlength="300">${this.escapeHtml(hero.subtitle)}</textarea>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div class="cms-field-group">
                <label class="cms-label" for="cms-hero-cta-text">Texto Botón</label>
                <input type="text" id="cms-hero-cta-text" class="cms-input" maxlength="30" value="${this.escapeHtml(hero.cta_text)}">
              </div>
              <div class="cms-field-group">
                <label class="cms-label" for="cms-hero-cta-url">Enlace / Hash</label>
                <input type="text" id="cms-hero-cta-url" class="cms-input" maxlength="100" value="${this.escapeHtml(hero.cta_url)}">
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 0.5rem;">
              <div class="cms-field-group">
                <label class="cms-label" for="cms-hero-side-top">Tag Tarjeta Lateral Superior</label>
                <input type="text" id="cms-hero-side-top" class="cms-input" maxlength="50" value="${this.escapeHtml(hero.side_card_top_tag || 'HEAVYWEIGHT 240G')}">
              </div>
              <div class="cms-field-group">
                <label class="cms-label" for="cms-hero-side-bottom">Tag Tarjeta Lateral Inferior</label>
                <input type="text" id="cms-hero-side-bottom" class="cms-input" maxlength="50" value="${this.escapeHtml(hero.side_card_bottom_tag || 'FLEECE 320G')}">
              </div>
            </div>

            <div class="cms-card-footer">
              <button class="btn-cms-save" data-action="save-section" data-target="hero">
                Guardar Hero
              </button>
            </div>
          </div>

          <!-- 3. CINTA DESLIZANTE MARQUEE -->
          <div class="cms-card" data-section="marquee">
            <div class="cms-card-header">
              <div class="cms-card-title">
                <span>🔄</span>
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
              <textarea id="cms-marquee-items" class="cms-textarea" style="min-height: 70px;">${this.escapeHtml((marquee.items || []).join(', '))}</textarea>
            </div>

            <div class="cms-card-footer">
              <button class="btn-cms-save" data-action="save-section" data-target="marquee">
                Guardar Cinta Marquee
              </button>
            </div>
          </div>

          <!-- 4. ENCABEZADOS DE SECCIÓN -->
          <div class="cms-card" data-section="headers">
            <div class="cms-card-header">
              <div class="cms-card-title">
                <span>📑</span>
                <span>Encabezados de Secciones (Colecciones & Atelier)</span>
              </div>
              <span class="badge badge-cyan">PORTADA</span>
            </div>

            <div class="cms-field-group">
              <label class="cms-label" for="cms-headers-catalog-tag">Tag Superior Colecciones</label>
              <input type="text" id="cms-headers-catalog-tag" class="cms-input" maxlength="60" value="${this.escapeHtml(headers.catalog_tag || 'LOOKBOOK 2026 // EDICIÓN LIMITADA')}">
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div class="cms-field-group">
                <label class="cms-label" for="cms-headers-catalog-title">Título Colecciones</label>
                <input type="text" id="cms-headers-catalog-title" class="cms-input" maxlength="100" value="${this.escapeHtml(headers.catalog_title || 'Colección Textil Streetwear')}">
              </div>
              <div class="cms-field-group">
                <label class="cms-label" for="cms-headers-customizer-title">Título Atelier</label>
                <input type="text" id="cms-headers-customizer-title" class="cms-input" maxlength="100" value="${this.escapeHtml(headers.customizer_title || 'Atelier de Personalización DTF')}">
              </div>
            </div>

            <div class="cms-field-group">
              <label class="cms-label" for="cms-headers-catalog-desc">Descripción Colecciones</label>
              <textarea id="cms-headers-catalog-desc" class="cms-textarea" style="min-height: 60px;">${this.escapeHtml(headers.catalog_desc || '')}</textarea>
            </div>

            <div class="cms-field-group">
              <label class="cms-label" for="cms-headers-customizer-desc">Descripción Atelier</label>
              <textarea id="cms-headers-customizer-desc" class="cms-textarea" style="min-height: 60px;">${this.escapeHtml(headers.customizer_desc || '')}</textarea>
            </div>

            <div class="cms-card-footer">
              <button class="btn-cms-save" data-action="save-section" data-target="headers">
                Guardar Encabezados
              </button>
            </div>
          </div>

          <!-- 5. BANDA DE ESTADÍSTICAS & TALLER -->
          <div class="cms-card" data-section="stats">
            <div class="cms-card-header">
              <div class="cms-card-title">
                <span>📊</span>
                <span>Métricas y Parámetros Técnicos</span>
              </div>
              <span class="badge badge-lime">CALIBRACIÓN</span>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div class="cms-field-group">
                <label class="cms-label" for="cms-stats-dpi">Resolución DTF (DPI)</label>
                <input type="number" id="cms-stats-dpi" class="cms-input" min="150" max="1200" value="${stats.dpi}">
              </div>
              <div class="cms-field-group">
                <label class="cms-label" for="cms-stats-min-order">Pedido Mínimo (Prendas)</label>
                <input type="number" id="cms-stats-min-order" class="cms-input" min="0" max="100" value="${stats.min_order}">
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
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
                Guardar Parámetros
              </button>
            </div>
          </div>

          <!-- 4. MANIFIESTO Y DECLARACIÓN DE MARCA -->
          <div class="cms-card" data-section="statement">
            <div class="cms-card-header">
              <div class="cms-card-title">
                <span>🔥</span>
                <span>Manifiesto de Marca (Statement)</span>
              </div>
              <span class="badge badge-crimson">EDITORIAL</span>
            </div>

            <div class="cms-field-group">
              <label class="cms-label" for="cms-statement-headline">
                <span>Titular en Mayúsculas</span>
                <span class="cms-char-counter" id="char-statement-headline">0/80</span>
              </label>
              <input type="text" id="cms-statement-headline" class="cms-input" maxlength="80" value="${this.escapeHtml(statement.headline)}">
            </div>

            <div class="cms-field-group">
              <label class="cms-label" for="cms-statement-body">
                <span>Cuerpo del Manifiesto</span>
                <span class="cms-char-counter" id="char-statement-body">0/500</span>
              </label>
              <textarea id="cms-statement-body" class="cms-textarea" maxlength="500">${this.escapeHtml(statement.body)}</textarea>
            </div>

            <div class="cms-card-footer">
              <button class="btn-cms-save" data-action="save-section" data-target="statement">
                Guardar Manifiesto
              </button>
            </div>
          </div>

          <!-- 5. NARRATIVA EDITORIAL (MISIÓN Y VISIÓN) -->
          <div class="cms-card" data-section="editorial" style="grid-column: 1 / -1;">
            <div class="cms-card-header">
              <div class="cms-card-title">
                <span>📖</span>
                <span>Narrativa Editorial (Misión & Visión)</span>
              </div>
              <span class="badge badge-cyan">BLOQUE DUAL</span>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
              <!-- Columna Misión -->
              <div style="display: flex; flex-direction: column; gap: 1rem;">
                <div class="cms-field-group">
                  <label class="cms-label" for="cms-editorial-mission-tag">Etiqueta Misión</label>
                  <input type="text" id="cms-editorial-mission-tag" class="cms-input" value="${this.escapeHtml(editorial.mission_tag)}">
                </div>
                <div class="cms-field-group">
                  <label class="cms-label" for="cms-editorial-mission-title">Título Misión</label>
                  <input type="text" id="cms-editorial-mission-title" class="cms-input" value="${this.escapeHtml(editorial.mission_title)}">
                </div>
                <div class="cms-field-group">
                  <label class="cms-label" for="cms-editorial-mission-body">Cuerpo Misión</label>
                  <textarea id="cms-editorial-mission-body" class="cms-textarea" maxlength="500">${this.escapeHtml(editorial.mission_body)}</textarea>
                </div>
              </div>

              <!-- Columna Visión -->
              <div style="display: flex; flex-direction: column; gap: 1rem;">
                <div class="cms-field-group">
                  <label class="cms-label" for="cms-editorial-vision-tag">Etiqueta Visión</label>
                  <input type="text" id="cms-editorial-vision-tag" class="cms-input" value="${this.escapeHtml(editorial.vision_tag)}">
                </div>
                <div class="cms-field-group">
                  <label class="cms-label" for="cms-editorial-vision-title">Título Visión</label>
                  <input type="text" id="cms-editorial-vision-title" class="cms-input" value="${this.escapeHtml(editorial.vision_title)}">
                </div>
                <div class="cms-field-group">
                  <label class="cms-label" for="cms-editorial-vision-body">Cuerpo Visión</label>
                  <textarea id="cms-editorial-vision-body" class="cms-textarea" maxlength="500">${this.escapeHtml(editorial.vision_body)}</textarea>
                </div>
              </div>
            </div>

            <div class="cms-card-footer">
              <button class="btn-cms-save" data-action="save-section" data-target="editorial">
                Guardar Narrativa Editorial
              </button>
            </div>
          </div>

          <!-- 6. PROTOCOLO DE TALLER (3 PASOS) -->
          <div class="cms-card" data-section="protocol" style="grid-column: 1 / -1;">
            <div class="cms-card-header">
              <div class="cms-card-title">
                <span>🛠️</span>
                <span>Protocolo de Producción (3 Etapas)</span>
              </div>
              <span class="badge badge-lime">LINEA DE TIEMPO</span>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 1rem; margin-bottom: 1rem;">
              <div class="cms-field-group">
                <label class="cms-label" for="cms-protocol-title">Título de la Sección</label>
                <input type="text" id="cms-protocol-title" class="cms-input" value="${this.escapeHtml(protocol.section_title)}">
              </div>
              <div class="cms-field-group">
                <label class="cms-label" for="cms-protocol-desc">Descripción General</label>
                <input type="text" id="cms-protocol-desc" class="cms-input" value="${this.escapeHtml(protocol.section_desc)}">
              </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
              ${protocol.steps.map((step, idx) => `
                <div style="background: var(--bg-surface-elevated); padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); display: flex; flex-direction: column; gap: 0.75rem;">
                  <span class="badge" style="width: fit-content;">PASO ${step.step_number}</span>
                  <div class="cms-field-group">
                    <label class="cms-label" for="cms-step-title-${idx}">Título Paso</label>
                    <input type="text" id="cms-step-title-${idx}" class="cms-input" value="${this.escapeHtml(step.title)}">
                  </div>
                  <div class="cms-field-group">
                    <label class="cms-label" for="cms-step-desc-${idx}">Descripción</label>
                    <textarea id="cms-step-desc-${idx}" class="cms-textarea" style="min-height: 80px;">${this.escapeHtml(step.description)}</textarea>
                  </div>
                </div>
              `).join('')}
            </div>

            <div class="cms-card-footer">
              <button class="btn-cms-save" data-action="save-section" data-target="protocol">
                Guardar Protocolo
              </button>
            </div>
          </div>

          <!-- 7. CONTACTO & TALLER -->
          <div class="cms-card" data-section="contact" style="grid-column: 1 / -1;">
            <div class="cms-card-header">
              <div class="cms-card-title">
                <span>📍</span>
                <span>Datos de Contacto y Taller Físico</span>
              </div>
              <span class="badge badge-cyan">FOOTER</span>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
              <div class="cms-field-group">
                <label class="cms-label" for="cms-contact-city">Ciudad / Región</label>
                <input type="text" id="cms-contact-city" class="cms-input" value="${this.escapeHtml(contact.workshop_city)}">
              </div>
              <div class="cms-field-group">
                <label class="cms-label" for="cms-contact-address">Dirección de Taller</label>
                <input type="text" id="cms-contact-address" class="cms-input" value="${this.escapeHtml(contact.address)}">
              </div>
              <div class="cms-field-group">
                <label class="cms-label" for="cms-contact-email">Email de Atención</label>
                <input type="email" id="cms-contact-email" class="cms-input" value="${this.escapeHtml(contact.email)}">
              </div>
              <div class="cms-field-group">
                <label class="cms-label" for="cms-contact-phone">Teléfono de Taller</label>
                <input type="text" id="cms-contact-phone" class="cms-input" value="${this.escapeHtml(contact.phone)}">
              </div>
              <div class="cms-field-group">
                <label class="cms-label" for="cms-contact-whatsapp">WhatsApp Directo</label>
                <input type="text" id="cms-contact-whatsapp" class="cms-input" value="${this.escapeHtml(contact.whatsapp_number || contact.phone || '')}">
              </div>
              <div class="cms-field-group">
                <label class="cms-label" for="cms-contact-instagram">Instagram</label>
                <input type="text" id="cms-contact-instagram" class="cms-input" value="${this.escapeHtml(contact.instagram)}">
              </div>
              <div class="cms-field-group">
                <label class="cms-label" for="cms-contact-hours">Horarios de Atención</label>
                <input type="text" id="cms-contact-hours" class="cms-input" value="${this.escapeHtml(contact.business_hours || 'Lunes a Viernes 09:00 - 18:30 hrs')}">
              </div>
              <div class="cms-field-group" style="grid-column: 1 / -1;">
                <label class="cms-label" for="cms-contact-copyright">Texto de Pie de Página / Copyright</label>
                <input type="text" id="cms-contact-copyright" class="cms-input" value="${this.escapeHtml(contact.copyright_text || 'Estudio de Estampado Textil de Precisión • Santiago, Chile')}">
              </div>
            </div>

            <div class="cms-card-footer">
              <button class="btn-cms-save" data-action="save-section" data-target="contact">
                Guardar Datos de Contacto
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- TOAST DE CONFIRMACIÓN -->
      <div id="cmsToast" class="cms-toast"></div>
    `;

    this.toastEl = document.getElementById('cmsToast');
    this.updateCharCounters();
  }

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  updateCharCounters() {
    const bindCounter = (inputId, counterId, max) => {
      const el = document.getElementById(inputId);
      const counter = document.getElementById(counterId);
      if (el && counter) {
        const update = () => {
          counter.textContent = `${el.value.length}/${max}`;
        };
        el.addEventListener('input', update);
        update();
      }
    };

    bindCounter('cms-announcement-text', 'char-announcement-text', 160);
    bindCounter('cms-hero-headline', 'char-hero-headline', 100);
    bindCounter('cms-hero-subtitle', 'char-hero-subtitle', 300);
    bindCounter('cms-statement-headline', 'char-statement-headline', 80);
    bindCounter('cms-statement-body', 'char-statement-body', 500);
  }

  attachEvents() {
    this.container.querySelectorAll('.btn-cms-save').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const targetSection = e.currentTarget.dataset.target;
        await this.handleSaveSection(targetSection, e.currentTarget);
      });
    });
  }

  async handleSaveSection(sectionKey, buttonEl) {
    buttonEl.disabled = true;
    buttonEl.classList.add('loading');
    const originalText = buttonEl.textContent;
    buttonEl.textContent = "Guardando...";

    try {
      const payload = this.collectSectionPayload(sectionKey);
      await apiService.updateSiteSection(sectionKey, payload);

      // Actualizar caché local
      this.content[sectionKey] = payload;

      this.showToast(`✅ Sección '${sectionKey}' actualizada con éxito.`, "success");
      
      // Notificar al storefront si está activo en la misma pestaña
      window.dispatchEvent(new CustomEvent('senkai:cms-updated', { detail: { sectionKey, payload } }));
    } catch (err) {
      console.error(`Error guardando ${sectionKey}:`, err);
      this.showToast(`⚠️ Error: ${err.message || "Fallo de validación"}`, "error");
    } finally {
      buttonEl.disabled = false;
      buttonEl.classList.remove('loading');
      buttonEl.textContent = originalText;
    }
  }

  collectSectionPayload(sectionKey) {
    switch (sectionKey) {
      case 'announcement':
        return {
          text: document.getElementById('cms-announcement-text').value.trim(),
          is_active: document.getElementById('cms-announcement-active').checked
        };
      case 'hero':
        return {
          headline: document.getElementById('cms-hero-headline').value.trim(),
          subtitle: document.getElementById('cms-hero-subtitle').value.trim(),
          cta_text: document.getElementById('cms-hero-cta-text').value.trim(),
          cta_url: document.getElementById('cms-hero-cta-url').value.trim() || '#personalizador',
          side_card_top_tag: document.getElementById('cms-hero-side-top').value.trim() || 'HEAVYWEIGHT 240G',
          side_card_bottom_tag: document.getElementById('cms-hero-side-bottom').value.trim() || 'FLEECE 320G'
        };
      case 'marquee': {
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
      case 'headers':
        return {
          catalog_tag: document.getElementById('cms-headers-catalog-tag').value.trim() || "LOOKBOOK 2026 // EDICIÓN LIMITADA",
          catalog_title: document.getElementById('cms-headers-catalog-title').value.trim() || "Colección Textil Streetwear",
          catalog_desc: document.getElementById('cms-headers-catalog-desc').value.trim(),
          customizer_title: document.getElementById('cms-headers-customizer-title').value.trim() || "Atelier de Personalización DTF",
          customizer_desc: document.getElementById('cms-headers-customizer-desc').value.trim()
        };
      case 'stats':
        return {
          dpi: parseInt(document.getElementById('cms-stats-dpi').value, 10) || 300,
          min_order: parseInt(document.getElementById('cms-stats-min-order').value, 10) || 0,
          wash_cycles: parseInt(document.getElementById('cms-stats-wash-cycles').value, 10) || 50,
          curing_temp: parseInt(document.getElementById('cms-stats-curing-temp').value, 10) || 160
        };
      case 'statement':
        return {
          headline: document.getElementById('cms-statement-headline').value.trim(),
          body: document.getElementById('cms-statement-body').value.trim()
        };
      case 'editorial':
        return {
          mission_tag: document.getElementById('cms-editorial-mission-tag').value.trim(),
          mission_title: document.getElementById('cms-editorial-mission-title').value.trim(),
          mission_body: document.getElementById('cms-editorial-mission-body').value.trim(),
          vision_tag: document.getElementById('cms-editorial-vision-tag').value.trim(),
          vision_title: document.getElementById('cms-editorial-vision-title').value.trim(),
          vision_body: document.getElementById('cms-editorial-vision-body').value.trim()
        };
      case 'protocol':
        return {
          section_tag: "CÓMO TRABAJAMOS",
          section_title: document.getElementById('cms-protocol-title').value.trim(),
          section_desc: document.getElementById('cms-protocol-desc').value.trim(),
          steps: [
            {
              step_number: "01",
              title: document.getElementById('cms-step-title-0').value.trim(),
              description: document.getElementById('cms-step-desc-0').value.trim()
            },
            {
              step_number: "02",
              title: document.getElementById('cms-step-title-1').value.trim(),
              description: document.getElementById('cms-step-desc-1').value.trim()
            },
            {
              step_number: "03",
              title: document.getElementById('cms-step-title-2').value.trim(),
              description: document.getElementById('cms-step-desc-2').value.trim()
            }
          ]
        };
      case 'contact':
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
