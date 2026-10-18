// Submódulo del CMS: Editor de la Sección Hero y Portada.
// Acá controlo los títulos principales, textos de llamado a la acción (CTA) y
// las fotos de la prenda principal y de las tarjetas laterales de la portada.

export function renderHeroSection(hero, escapeHtml) {
  return `
    <div class="cms-card" id="cms-section-hero" data-section="hero">
      <div class="cms-card-header">
        <div class="cms-card-title">
          <span class="material-symbols-outlined" style="font-size: 18px; color: var(--accent-admin);">view_carousel</span>
          <span>Hero & Portada Principal</span>
        </div>
        <span class="badge badge-admin">PRINCIPAL</span>
      </div>

      <div class="cms-field-group">
        <label class="cms-label" for="cms-hero-headline">
          <span>Titular Principal (Headline)</span>
          <span class="cms-label-hint">Usa salto de línea para separar las frases del banner</span>
        </label>
        <textarea id="cms-hero-headline" class="cms-textarea" style="min-height: 80px;">${escapeHtml(hero.headline)}</textarea>
      </div>

      <div class="cms-field-group">
        <label class="cms-label" for="cms-hero-subtitle">Subtítulo de la Portada</label>
        <textarea id="cms-hero-subtitle" class="cms-textarea" style="min-height: 70px;">${escapeHtml(hero.subtitle)}</textarea>
      </div>

      <div class="cms-grid-2">
        <div class="cms-field-group">
          <label class="cms-label" for="cms-hero-cta-text">Texto Botón Principal</label>
          <input type="text" id="cms-hero-cta-text" class="cms-input" value="${escapeHtml(hero.cta_text)}">
        </div>
        <div class="cms-field-group">
          <label class="cms-label" for="cms-hero-cta-url">Enlace del Botón</label>
          <input type="text" id="cms-hero-cta-url" class="cms-input" value="${escapeHtml(hero.cta_url || '#personalizador')}">
        </div>
      </div>

      <!-- Imagen Central del Hero -->
      <div class="cms-field-group">
        <label class="cms-label">
          <span>Foto Central de Portada</span>
          <span class="cms-label-hint">PNG transparente de alta resolución</span>
        </label>
        <div class="cms-media-row">
          <div class="cms-media-thumb-wrap">
            <img id="thumb-hero-main-image" class="cms-media-thumb" src="${hero.hero_main_image || '/static/assets/hero_main_tshirt.png'}" alt="Foto central">
          </div>
          <div class="cms-media-body">
            <input type="text" id="cms-hero-main-image" class="cms-input cms-img-input" data-preview-target="thumb-hero-main-image" value="${escapeHtml(hero.hero_main_image || '/static/assets/hero_main_tshirt.png')}" placeholder="URL o subir imagen...">
            <div class="cms-media-actions">
              <button type="button" class="btn-cms-upload" data-target-input="cms-hero-main-image" title="Subir imagen desde tu equipo">
                <span class="material-symbols-outlined">upload</span>
                <span>Subir</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="cms-field-group">
        <label class="cms-label" for="cms-hero-badge-text">Badge Flotante sobre la Prenda Central</label>
        <input type="text" id="cms-hero-badge-text" class="cms-input" value="${escapeHtml(hero.hero_badge_text || 'ALGODÓN PEINADO 240 GSM')}">
      </div>

      <!-- Tarjeta Lateral Superior -->
      <div class="cms-grid-2">
        <div class="cms-field-group">
          <label class="cms-label" for="cms-hero-side-top">Tag Tarjeta Lateral Superior</label>
          <input type="text" id="cms-hero-side-top" class="cms-input" value="${escapeHtml(hero.side_card_top_tag || 'HEAVYWEIGHT 240G')}">
        </div>
        <div class="cms-field-group">
          <label class="cms-label">Foto Tarjeta Superior</label>
          <div class="cms-media-row">
            <div class="cms-media-thumb-wrap">
              <img id="thumb-hero-side-top-image" class="cms-media-thumb" src="${hero.side_card_top_image || '/static/assets/hero_side_top.png'}" alt="Lateral sup">
            </div>
            <div class="cms-media-body">
              <input type="text" id="cms-hero-side-top-image" class="cms-input cms-img-input" data-preview-target="thumb-hero-side-top-image" value="${escapeHtml(hero.side_card_top_image || '/static/assets/hero_side_top.png')}">
              <div class="cms-media-actions">
                <button type="button" class="btn-cms-upload" data-target-input="cms-hero-side-top-image" title="Subir imagen">
                  <span class="material-symbols-outlined">upload</span>
                  <span>Subir</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tarjeta Lateral Inferior -->
      <div class="cms-grid-2">
        <div class="cms-field-group">
          <label class="cms-label" for="cms-hero-side-bottom">Tag Tarjeta Lateral Inferior</label>
          <input type="text" id="cms-hero-side-bottom" class="cms-input" value="${escapeHtml(hero.side_card_bottom_tag || 'FLEECE 320G')}">
        </div>
        <div class="cms-field-group">
          <label class="cms-label">Foto Tarjeta Inferior</label>
          <div class="cms-media-row">
            <div class="cms-media-thumb-wrap">
              <img id="thumb-hero-side-bottom-image" class="cms-media-thumb" src="${hero.side_card_bottom_image || '/static/assets/hero_side_bottom.png'}" alt="Lateral inf">
            </div>
            <div class="cms-media-body">
              <input type="text" id="cms-hero-side-bottom-image" class="cms-input cms-img-input" data-preview-target="thumb-hero-side-bottom-image" value="${escapeHtml(hero.side_card_bottom_image || '/static/assets/hero_side_bottom.png')}">
              <div class="cms-media-actions">
                <button type="button" class="btn-cms-upload" data-target-input="cms-hero-side-bottom-image" title="Subir imagen">
                  <span class="material-symbols-outlined">upload</span>
                  <span>Subir</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="cms-card-footer">
        <button class="btn-cms-save" data-action="save-section" data-target="hero">
          <span class="material-symbols-outlined" style="font-size: 16px;">save</span>
          <span>Guardar Hero Principal</span>
        </button>
      </div>
    </div>
  `;
}

// Armo el payload de la sección Hero validando que no queden campos críticos vacíos
export function collectHeroPayload() {
  return {
    headline: document.getElementById('cms-hero-headline').value.trim(),
    subtitle: document.getElementById('cms-hero-subtitle').value.trim(),
    cta_text: document.getElementById('cms-hero-cta-text').value.trim(),
    cta_url: document.getElementById('cms-hero-cta-url').value.trim() || '#personalizador',
    hero_main_image: document.getElementById('cms-hero-main-image').value.trim() || '/static/assets/hero_main_tshirt.png',
    hero_badge_text: document.getElementById('cms-hero-badge-text').value.trim() || 'ALGODÓN PEINADO 240 GSM',
    side_card_top_tag: document.getElementById('cms-hero-side-top').value.trim() || 'HEAVYWEIGHT 240G',
    side_card_top_image: document.getElementById('cms-hero-side-top-image').value.trim() || '/static/assets/hero_side_top.png',
    side_card_bottom_tag: document.getElementById('cms-hero-side-bottom').value.trim() || 'FLEECE 320G',
    side_card_bottom_image: document.getElementById('cms-hero-side-bottom-image').value.trim() || '/static/assets/hero_side_bottom.png'
  };
}
