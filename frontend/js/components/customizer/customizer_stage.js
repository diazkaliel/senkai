// Submódulo del Personalizador: Escenario y Canvas Textil con Volteo 3D.
// Acá renderizo la silueta SVG de la prenda seleccionada, el área segura de prensado
// y la estampa activa con sus gizmos de escala y centrado.

import { SVG_GARMENTS, PRESET_ARTWORKS } from '../svg_templates.js';

// Medidas base en píxeles del film DTF sobre el mockup
export function getPrintBaseDimensions(printSize) {
  const map = {
    A6: { width: 90, height: 90, cm: "10 × 10 cm", desc: "Bolsillo" },
    A5: { width: 130, height: 160, cm: "15 × 20 cm", desc: "Mediano" },
    A4: { width: 185, height: 230, cm: "20 × 30 cm", desc: "Estándar" },
    A3: { width: 245, height: 320, cm: "30 × 40 cm", desc: "Maxi" }
  };
  return map[printSize] || map.A4;
}

// Devuelvo el SVG vectorial de la prenda según su categoría y cara (frente o espalda)
export function getGarmentSvgMarkup(category, view, colorHex) {
  if (category === "poleron_hoodie" || category === "hoodie") {
    return view === "back" ? SVG_GARMENTS.hoodie_back(colorHex) : SVG_GARMENTS.hoodie_front(colorHex);
  } else if (category === "poleron_crewneck" || category === "crewneck") {
    return view === "back" ? SVG_GARMENTS.crewneck_back(colorHex) : SVG_GARMENTS.crewneck_front(colorHex);
  } else {
    return view === "back" ? SVG_GARMENTS.tshirt_back(colorHex) : SVG_GARMENTS.tshirt_front(colorHex);
  }
}

// Devuelvo el arte de la estampa: si subió una foto propia muestro el <img>, si no el SVG predeterminado
export function getPrintArtworkMarkup(print) {
  const imgSrc = print.designImageUrl || print.customArtworkDataUrl;
  if (imgSrc) {
    return `<img src="${imgSrc}" alt="${print.name}">`;
  }
  return print.artwork ? print.artwork.svgContent : PRESET_ARTWORKS[0].svgContent;
}

// Renderizo la caja arrastrable de la estampa con su manilla de tamaño si está seleccionada
export function renderDraggablePrintMarkup(p, activePrint) {
  const dims = getPrintBaseDimensions(p.print_size);
  const isActive = activePrint && p.id === activePrint.id;
  return `
    <div class="dtf-print-draggable ${isActive ? 'active-print' : ''}"
         id="draggable-${p.id}"
         data-print-id="${p.id}"
         style="left: ${p.offset_x_pct}%; top: ${p.offset_y_pct}%; width: ${dims.width}px; height: ${dims.height}px; transform: translate(-50%, -50%) scale(${p.scale_factor});">
      ${isActive ? `
        <div class="print-gizmo-badge">
          <span class="material-symbols-outlined" style="font-size: 13px;">drag_pan</span>
          <span>${Math.round(p.scale_factor * 100)}%</span>
        </div>
        <span class="gizmo-handle handle-tl"></span>
        <span class="gizmo-handle handle-tr"></span>
        <span class="gizmo-handle handle-bl"></span>
        <span class="gizmo-handle handle-br"></span>
      ` : ''}
      ${getPrintArtworkMarkup(p)}
    </div>
  `;
}

// Estructura completa del visor: Toolbar de conmutación de cara, flipper 3D y badge de especificaciones
export function renderVisualizerStage(state, g, currentColor, activePrint, frontPrints, backPrints) {
  const frontCount = frontPrints.length;
  const backCount = backPrints.length;

  return `
    <div class="customizer-stage-column">
      <div class="visualizer-card">
        
        <!-- Barra superior: Selector Frente / Espalda & Centrado -->
        <div class="visualizer-toolbar">
          <div class="view-toggle-group" role="tablist" aria-label="Cara visible de la prenda">
            <button class="view-toggle-btn ${state.currentView === 'front' ? 'active' : ''}" data-view="front" type="button">
              <span>FRENTE</span>
              <span class="view-count-pill">${frontCount > 0 ? `${frontCount} ESTAMPA` : 'LISA'}</span>
            </button>
            <button class="view-toggle-btn ${state.currentView === 'back' ? 'active' : ''}" data-view="back" type="button">
              <span>ESPALDA</span>
              <span class="view-count-pill">${backCount > 0 ? `${backCount} ESTAMPA` : 'LISA'}</span>
            </button>
          </div>

          <div class="visualizer-actions-right">
            ${activePrint ? `
              <button class="canvas-action-btn btn-magnetic" id="centerActivePrintBtn" title="Centrar estampa en el eje anatómico" type="button">
                <span class="material-symbols-outlined" style="font-size: 15px;">filter_center_focus</span>
                <span>Centrar</span>
              </button>
            ` : `
              <button class="canvas-action-btn btn-magnetic" id="quickAddFacePrintBtn" title="Agregar estampa en esta cara" type="button" style="color: var(--accent-primary);">
                <span class="material-symbols-outlined" style="font-size: 15px;">add_circle</span>
                <span>+ Estampa</span>
              </button>
            `}
          </div>
        </div>

        <!-- Escenario interactivo con Volteo 3D -->
        <div class="canvas-viewport" id="canvasViewport" title="Arrastra directamente sobre la prenda para calibrar la posición">
          <div class="canvas-snap-guide snap-x" id="canvasSnapX"></div>
          <div class="canvas-snap-guide snap-y" id="canvasSnapY"></div>

          <div class="garment-stage-3d">
            <div class="garment-card-flipper ${state.currentView === 'back' ? 'is-flipped' : ''}" id="garmentFlipper">
              
              <!-- CARA FRONTAL -->
              <div class="garment-flip-face face-front ${state.currentView === 'front' ? 'is-active-face' : 'is-inactive-face'}" aria-hidden="${state.currentView === 'back'}">
                <div class="garment-svg-wrapper">
                  ${getGarmentSvgMarkup(g.category, 'front', currentColor)}
                </div>
                <div class="safe-print-boundary" title="Área útil de prensado frontal"></div>
                ${frontPrints.map(p => renderDraggablePrintMarkup(p, activePrint)).join('')}
              </div>

              <!-- CARA TRASERA -->
              <div class="garment-flip-face face-back ${state.currentView === 'back' ? 'is-active-face' : 'is-inactive-face'}" aria-hidden="${state.currentView === 'front'}">
                <div class="garment-svg-wrapper">
                  ${getGarmentSvgMarkup(g.category, 'back', currentColor)}
                </div>
                <div class="safe-print-boundary" title="Área útil de prensado dorsal"></div>
                ${backPrints.map(p => renderDraggablePrintMarkup(p, activePrint)).join('')}
              </div>

            </div>
          </div>

          <!-- Ficha técnica flotante al pie del lienzo -->
          <div class="canvas-badge-info">
            <div class="canvas-info-left">
              <span class="canvas-garment-title">${g.name}</span>
              <span class="canvas-info-sep">•</span>
              <span class="canvas-color-dot" style="background: ${currentColor};"></span>
              <span class="canvas-color-label">${state.selectedColor.name}</span>
              <span class="canvas-info-sep">•</span>
              <span class="canvas-size-label">TALLA ${state.selectedSize}</span>
            </div>
            <div class="canvas-info-right">
              <span class="canvas-active-print-tag">
                ${activePrint ? `${activePrint.name} [${Math.round(activePrint.scale_factor * 100)}%]` : `Cara ${state.currentView === 'front' ? 'Frontal' : 'Trasera'} Lisa`}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  `;
}
