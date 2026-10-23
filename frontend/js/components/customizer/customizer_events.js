// Submódulo del Personalizador: Enlace de eventos del DOM y controles de usuario.
// Acá centralizo la escucha de clics, inputs de calibración, subida de archivos
// y conecto el drag & drop del lienzo interactivo con el estado del estudio.

import { attachDragController } from './drag_controller.js?v=20261022_v2';

export function attachCustomizerEvents(container, studio) {
  if (!container || !studio) return;

  // 1. Pestañas de navegación de la consola (Paso 01, 02, 03)
  container.querySelectorAll('.atelier-tab-btn[data-step]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      studio.state.activeStep = e.currentTarget.dataset.step;
      studio.saveDraft();
      studio.render();
      studio.attachEvents();
    });
  });

  // 2. Botones de avance y retorno entre pasos
  container.querySelectorAll('[data-goto-step]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      studio.state.activeStep = e.currentTarget.dataset.gotoStep;
      studio.saveDraft();
      studio.render();
      studio.attachEvents();
    });
  });

  // 3. Conmutador directo de cara desde el paso 2
  const switchFaceBtn = container.querySelector('#switchFaceFromStepBtn');
  if (switchFaceBtn) {
    switchFaceBtn.addEventListener('click', () => {
      studio.setView(studio.state.currentView === 'front' ? 'back' : 'front');
    });
  }

  // 4. Selector frente / espalda en la barra superior del visualizador
  container.querySelectorAll('.view-toggle-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      studio.setView(e.currentTarget.dataset.view);
    });
  });

  // 5. Miniaturas de captura previa si existen en el DOM
  container.querySelectorAll('.capture-card').forEach(card => {
    card.addEventListener('click', (e) => {
      studio.setView(e.currentTarget.dataset.view);
    });
  });

  // 6. Selección de prenda base en el catálogo de siluetas
  container.querySelectorAll('.garment-card-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      studio.setGarmentById(e.currentTarget.dataset.garmentId);
    });
  });

  // 7. Muestrario de colores de la tela
  container.querySelectorAll('.color-swatch-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const hex = e.currentTarget.dataset.colorHex;
      const name = e.currentTarget.dataset.colorName;

      // Si el color ya está activo, no demollemos el lienzo ni reiniciamos el estado del mouse
      if (studio.state.selectedColor?.hex_code?.toLowerCase() === hex?.toLowerCase()) {
        studio.state.userSelectedColor = true;
        return;
      }

      studio.state.selectedColor = { name, hex_code: hex, in_stock: true };
      studio.state.userSelectedColor = true;
      studio.saveDraft();

      // Actualización reactiva sin demoler el escenario ni perder el contexto de puntero
      const colorLayers = container.querySelectorAll('.garment-color-base');
      if (colorLayers.length > 0) {
        colorLayers.forEach(layer => {
          layer.style.backgroundColor = hex;
        });
        const colorDot = container.querySelector('.canvas-color-dot');
        const colorLabel = container.querySelector('.canvas-color-label');
        if (colorDot) colorDot.style.background = hex;
        if (colorLabel) colorLabel.textContent = name;
        container.querySelectorAll('.color-swatch-btn').forEach(b => {
          const isMatch = b.dataset.colorHex?.toLowerCase() === hex?.toLowerCase();
          b.classList.toggle('active', isMatch);
        });
      } else {
        studio.render();
        studio.attachEvents();
      }
    });
  });

  // 8. Pastillas de selección de talla (S, M, L, XL, etc.)
  container.querySelectorAll('.size-pill-btn[data-size]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      studio.state.selectedSize = e.currentTarget.dataset.size;
      studio.state.pricing.basePrice = studio.getSelectedSizePrice();
      studio.saveDraft();
      studio.render();
      studio.attachEvents();
      studio.updateQuote();
    });
  });

  // 9. Acciones para agregar estampa cuando la cara está lisa
  const addFacePrintBtn = container.querySelector('#addFacePrintBtn');
  if (addFacePrintBtn) {
    addFacePrintBtn.addEventListener('click', () => studio.addPrint(studio.state.currentView));
  }
  const quickAddBtn = container.querySelector('#quickAddFacePrintBtn');
  if (quickAddBtn) {
    quickAddBtn.addEventListener('click', () => studio.addPrint(studio.state.currentView));
  }

  // 10. Quitar estampa activa y dejar la cara lisa
  const removeFacePrintBtn = container.querySelector('#removeFacePrintBtn');
  if (removeFacePrintBtn) {
    removeFacePrintBtn.addEventListener('click', () => studio.clearCurrentFace());
  }

  // 11. Carga directa de arte desde el estado vacío de cara lisa
  const uploadDirectBtn = container.querySelector('#uploadDirectBtn');
  const fileInputDirect = container.querySelector('#fileInputDirect');
  if (uploadDirectBtn && fileInputDirect) {
    uploadDirectBtn.addEventListener('click', () => fileInputDirect.click());
    fileInputDirect.addEventListener('change', (e) => {
      if (e.target.files.length > 0) studio.handleDirectFileUpload(e.target.files[0]);
    });
  }

  // 12. Centrado anatómico de la estampa sobre el pecho o espalda
  const centerBtn = container.querySelector('#centerActivePrintBtn');
  const centerShortcutBtn = container.querySelector('#centerShortcutBtn');
  const applyCenter = () => {
    const active = studio.getActivePrint();
    if (active) {
      active.offset_x_pct = 50.0;
      active.offset_y_pct = active.view === 'back' ? 42.0 : 38.0;
      studio.saveDraft();
      studio.render();
      studio.attachEvents();
    }
  };
  if (centerBtn) centerBtn.addEventListener('click', applyCenter);
  if (centerShortcutBtn) centerShortcutBtn.addEventListener('click', applyCenter);

  // 13. Sliders de calibración fina (X, Y y Zoom de escala)
  const posXSlider = container.querySelector('#posXSlider');
  const posYSlider = container.querySelector('#posYSlider');
  const scaleSlider = container.querySelector('#scaleSlider');

  const updateSliderPrintPosition = () => {
    const active = studio.getActivePrint();
    if (active && posXSlider && posYSlider) {
      active.offset_x_pct = parseFloat(posXSlider.value);
      active.offset_y_pct = parseFloat(posYSlider.value);
      const xText = container.querySelector('#posXValText');
      const yText = container.querySelector('#posYValText');
      if (xText) xText.textContent = `${Math.round(active.offset_x_pct)}%`;
      if (yText) yText.textContent = `${Math.round(active.offset_y_pct)}%`;

      const draggableEl = container.querySelector(`#draggable-${active.id}`);
      if (draggableEl) {
        draggableEl.style.left = `${active.offset_x_pct}%`;
        draggableEl.style.top = `${active.offset_y_pct}%`;
      }
    }
  };

  if (posXSlider) {
    posXSlider.addEventListener('input', updateSliderPrintPosition);
    posXSlider.addEventListener('change', () => studio.saveDraft());
  }
  if (posYSlider) {
    posYSlider.addEventListener('input', updateSliderPrintPosition);
    posYSlider.addEventListener('change', () => studio.saveDraft());
  }

  if (scaleSlider) {
    scaleSlider.addEventListener('input', () => {
      const active = studio.getActivePrint();
      if (active) {
        active.scale_factor = parseFloat(scaleSlider.value);
        const scText = container.querySelector('#scaleValText');
        if (scText) scText.textContent = `${Math.round(active.scale_factor * 100)}%`;

        const draggableEl = container.querySelector(`#draggable-${active.id}`);
        if (draggableEl) {
          draggableEl.style.transform = `translate(-50%, -50%) scale(${active.scale_factor})`;
        }
      }
    });
    scaleSlider.addEventListener('change', () => studio.saveDraft());
  }

  // 14. Dropzone de subida de imagen con soporte drag & drop
  const dropzone = container.querySelector('#uploadDropzone');
  const fileInput = container.querySelector('#fileInputDtf');
  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragging'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragging'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragging');
      if (e.dataTransfer.files.length > 0) studio.handleFileUpload(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) studio.handleFileUpload(e.target.files[0]);
    });
  }

  // 15. Selector de volumen de lote (Stepper)
  const qtyMinus = container.querySelector('#qtyMinus');
  const qtyPlus = container.querySelector('#qtyPlus');
  const qtyInput = container.querySelector('#qtyInput');

  if (qtyMinus && qtyPlus && qtyInput) {
    qtyMinus.addEventListener('click', () => {
      studio.state.quantity = Math.max(1, studio.state.quantity - 1);
      qtyInput.value = studio.state.quantity;
      studio.updateQuote();
    });
    qtyPlus.addEventListener('click', () => {
      studio.state.quantity = Math.min(500, studio.state.quantity + 1);
      qtyInput.value = studio.state.quantity;
      studio.updateQuote();
    });
    qtyInput.addEventListener('change', (e) => {
      studio.state.quantity = Math.max(1, Math.min(500, parseInt(e.target.value, 10) || 1));
      qtyInput.value = studio.state.quantity;
      studio.updateQuote();
    });
  }

  // 16. Botón para añadir la configuración a la orden de trabajo
  const addBtn = container.querySelector('#addToCartCustomizerBtn');
  if (addBtn) {
    addBtn.addEventListener('click', () => studio.triggerAddToCart());
  }

  // 17. Controlador de arrastre libre sobre el lienzo
  const viewport = container.querySelector('#canvasViewport');
  attachDragController(viewport, studio.state, {
    onActivePrintSet: (printId) => studio.setActivePrint(printId),
    onPrintMoved: (targetPrint) => {
      const sliderX = container.querySelector('#posXSlider');
      const sliderY = container.querySelector('#posYSlider');
      const textX = container.querySelector('#posXValText');
      const textY = container.querySelector('#posYValText');

      if (sliderX) sliderX.value = targetPrint.offset_x_pct;
      if (sliderY) sliderY.value = targetPrint.offset_y_pct;
      if (textX) textX.textContent = `${Math.round(targetPrint.offset_x_pct)}%`;
      if (textY) textY.textContent = `${Math.round(targetPrint.offset_y_pct)}%`;
      studio.saveDraft();
    }
  });
}
