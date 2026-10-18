// Submódulo del CMS: Editor de Narrativa Editorial (Misión y Visión de Taller).
// Acá controlo los textos técnicos de precisión DTF y las fotos asociadas a cada bloque.

export function renderEditorialSection(editorial, escapeHtml) {
  return `
    <div class="cms-card" id="cms-section-editorial" data-section="editorial">
      <div class="cms-card-header">
        <div class="cms-card-title">
          <span class="material-symbols-outlined" style="font-size: 18px; color: var(--accent-admin);">article</span>
          <span>Narrativa Editorial (Misión & Visión)</span>
        </div>
        <span class="badge badge-admin">HISTORIA & MARCA</span>
      </div>

      <!-- Bloque 1: Misión -->
      <div class="cms-sub-block">
        <div class="cms-sub-title">Bloque 01: Matriz de Inyección DTF (Misión)</div>
        <div class="cms-field-group">
          <label class="cms-label" for="cms-editorial-mission-tag">Etiqueta de Sección</label>
          <input type="text" id="cms-editorial-mission-tag" class="cms-input" value="${escapeHtml(editorial.mission_tag || 'MISIÓN // SENKAI ATELIER')}">
        </div>
        <div class="cms-field-group">
          <label class="cms-label" for="cms-editorial-mission-title">Título</label>
          <input type="text" id="cms-editorial-mission-title" class="cms-input" value="${escapeHtml(editorial.mission_title)}">
        </div>
        <div class="cms-field-group">
          <label class="cms-label" for="cms-editorial-mission-body">Cuerpo Editorial</label>
          <textarea id="cms-editorial-mission-body" class="cms-textarea" style="min-height: 80px;">${escapeHtml(editorial.mission_body)}</textarea>
        </div>
        <div class="cms-field-group">
          <label class="cms-label">Foto de la Misión</label>
          <div class="cms-media-row">
            <div class="cms-media-thumb-wrap">
              <img id="thumb-editorial-mission-image" class="cms-media-thumb" src="${editorial.mission_image || '/static/assets/garments/hoodie_back.png'}" alt="Misión">
            </div>
            <div class="cms-media-body">
              <input type="text" id="cms-editorial-mission-image" class="cms-input cms-img-input" data-preview-target="thumb-editorial-mission-image" value="${escapeHtml(editorial.mission_image || '/static/assets/garments/hoodie_back.png')}" placeholder="URL del banner...">
              <div class="cms-media-actions">
                <button type="button" class="btn-cms-upload" data-target-input="cms-editorial-mission-image" title="Subir imagen desde tu equipo">
                  <span class="material-symbols-outlined">upload</span>
                  <span>Subir</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bloque 2: Visión -->
      <div class="cms-sub-block" style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px dashed var(--border-subtle);">
        <div class="cms-sub-title">Bloque 02: Resistencia +50 Lavados (Visión)</div>
        <div class="cms-field-group">
          <label class="cms-label" for="cms-editorial-vision-tag">Etiqueta de Sección</label>
          <input type="text" id="cms-editorial-vision-tag" class="cms-input" value="${escapeHtml(editorial.vision_tag || 'VISIÓN // PROTOCOLO INDUSTRIAL')}">
        </div>
        <div class="cms-field-group">
          <label class="cms-label" for="cms-editorial-vision-title">Título</label>
          <input type="text" id="cms-editorial-vision-title" class="cms-input" value="${escapeHtml(editorial.vision_title)}">
        </div>
        <div class="cms-field-group">
          <label class="cms-label" for="cms-editorial-vision-body">Cuerpo Editorial</label>
          <textarea id="cms-editorial-vision-body" class="cms-textarea" style="min-height: 80px;">${escapeHtml(editorial.vision_body)}</textarea>
        </div>
        <div class="cms-field-group">
          <label class="cms-label">Foto de la Visión</label>
          <div class="cms-media-row">
            <div class="cms-media-thumb-wrap">
              <img id="thumb-editorial-vision-image" class="cms-media-thumb" src="${editorial.vision_image || '/static/assets/garments/tshirt_front.png'}" alt="Visión">
            </div>
            <div class="cms-media-body">
              <input type="text" id="cms-editorial-vision-image" class="cms-input cms-img-input" data-preview-target="thumb-editorial-vision-image" value="${escapeHtml(editorial.vision_image || '/static/assets/garments/tshirt_front.png')}" placeholder="URL del banner...">
              <div class="cms-media-actions">
                <button type="button" class="btn-cms-upload" data-target-input="cms-editorial-vision-image" title="Subir imagen desde tu equipo">
                  <span class="material-symbols-outlined">upload</span>
                  <span>Subir</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="cms-card-footer">
        <button class="btn-cms-save" data-action="save-section" data-target="editorial">
          <span class="material-symbols-outlined" style="font-size: 16px;">save</span>
          <span>Guardar Narrativa Editorial</span>
        </button>
      </div>
    </div>
  `;
}

// Armo el payload de Misión y Visión con fallbacks seguros
export function collectEditorialPayload() {
  return {
    mission_tag: document.getElementById('cms-editorial-mission-tag').value.trim(),
    mission_title: document.getElementById('cms-editorial-mission-title').value.trim(),
    mission_body: document.getElementById('cms-editorial-mission-body').value.trim(),
    mission_image: document.getElementById('cms-editorial-mission-image').value.trim() || '/static/assets/garments/hoodie_back.png',
    vision_tag: document.getElementById('cms-editorial-vision-tag').value.trim(),
    vision_title: document.getElementById('cms-editorial-vision-title').value.trim(),
    vision_body: document.getElementById('cms-editorial-vision-body').value.trim(),
    vision_image: document.getElementById('cms-editorial-vision-image').value.trim() || '/static/assets/garments/tshirt_front.png'
  };
}
