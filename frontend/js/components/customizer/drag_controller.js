// Controlador de arrastre (Drag & Drop) y snap magnético sobre el lienzo textil.
// Permite mover la estampa libremente con mouse o dedo sobre la prenda, aplicando
// un imán suave al 50% horizontal y a la altura anatómica estándar de pecho o espalda.

export function attachDragController(viewport, state, callbacks = {}) {
  if (!viewport) return;

  const { onPrintMoved = () => {}, onActivePrintSet = () => {} } = callbacks;

  let draggedEl = null;
  let targetPrint = null;
  let startX = 0, startY = 0;
  let initialLeftPct = 50.0, initialTopPct = 38.0;

  const onPointerDown = (e) => {
    // Si el usuario hace clic directo en el gizmo o sobre la silueta textil teniendo estampa activa
    let printEl = e.target.closest('.dtf-print-draggable');
    if (!printEl) {
      const activeId = state.activePrintId;
      const currentActive = state.prints.find(p => p.id === activeId && p.view === state.currentView)
        || state.prints.find(p => p.view === state.currentView);
      if (currentActive && e.target.closest('.garment-stage-3d, .canvas-viewport')) {
        printEl = viewport.querySelector(`#draggable-${currentActive.id}`);
      }
    }
    if (!printEl) return;

    e.preventDefault();
    const printId = printEl.dataset.printId;
    targetPrint = state.prints.find(p => p.id === printId);
    if (!targetPrint || targetPrint.view !== state.currentView) return;

    // Si hago clic en una estampa secundaria, la convierto en la activa
    if (state.activePrintId !== printId) {
      onActivePrintSet(printId);
    }

    draggedEl = printEl;
    draggedEl.classList.add('is-dragging');
    viewport.classList.add('is-canvas-dragging');

    startX = e.clientX;
    startY = e.clientY;

    // Aseguro siempre tipos numéricos flotantes limpios para evitar concatenaciones de string accidentales
    initialLeftPct = parseFloat(targetPrint.offset_x_pct) || 50.0;
    initialTopPct = parseFloat(targetPrint.offset_y_pct) || (targetPrint.view === 'back' ? 42.0 : 38.0);

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const onPointerMove = (e) => {
    if (!draggedEl || !targetPrint) return;

    const rect = viewport.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    const deltaXPct = (deltaX / rect.width) * 100;
    const deltaYPct = (deltaY / rect.height) * 100;

    // Limito el movimiento dentro del área segura de prensado (16% a 84%)
    let newX = Math.min(84, Math.max(16, initialLeftPct + deltaXPct));
    let newY = Math.min(84, Math.max(16, initialTopPct + deltaYPct));

    const snapXEl = viewport.querySelector('#canvasSnapX');
    const snapYEl = viewport.querySelector('#canvasSnapY');

    // Imán horizontal: tolerancia sutil (0.8%).
    // Si la estampa ya arrancó en el centro (50%), permito liberarse de inmediato sin atrapar el inicio.
    const snapThresholdX = 0.8;
    if (Math.abs(newX - 50.0) < snapThresholdX && Math.abs(initialLeftPct - 50.0) > 0.4) {
      newX = 50.0;
      if (snapXEl) snapXEl.classList.add('active');
    } else {
      if (snapXEl) snapXEl.classList.remove('active');
    }

    // Imán vertical: snap a altura anatómica estándar de pecho (38%) o espalda (42%).
    // Si la estampa ya arrancó en defaultY, no la congelo en el eje Y; permito el desplazamiento libre arriba/abajo.
    const defaultY = targetPrint.view === 'back' ? 42.0 : 38.0;
    const snapThresholdY = 0.8;
    if (Math.abs(newY - defaultY) < snapThresholdY && Math.abs(initialTopPct - defaultY) > 0.4) {
      newY = defaultY;
      if (snapYEl) {
        snapYEl.style.top = `${defaultY}%`;
        snapYEl.classList.add('active');
      }
    } else {
      if (snapYEl) snapYEl.classList.remove('active');
    }

    targetPrint.offset_x_pct = Math.round(newX * 10) / 10;
    targetPrint.offset_y_pct = Math.round(newY * 10) / 10;

    draggedEl.style.left = `${targetPrint.offset_x_pct}%`;
    draggedEl.style.top = `${targetPrint.offset_y_pct}%`;

    onPrintMoved(targetPrint);
  };

  const onPointerUp = () => {
    if (draggedEl) {
      draggedEl.classList.remove('is-dragging');
      draggedEl = null;
      targetPrint = null;
    }
    viewport.classList.remove('is-canvas-dragging');

    const snapXEl = viewport.querySelector('#canvasSnapX');
    const snapYEl = viewport.querySelector('#canvasSnapY');
    if (snapXEl) snapXEl.classList.remove('active');
    if (snapYEl) snapYEl.classList.remove('active');

    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  };

  viewport.addEventListener('pointerdown', onPointerDown);
}
