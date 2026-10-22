// Coordinador principal de la mesa de personalización textil DTF (Senkai Studio).
// Acá orquesto el estado reactivo de la prenda (color, talla, cara activa),
// conecto el visor 3D con la consola de taller e integro la cotización en tiempo real.

import { PRESET_ARTWORKS } from './svg_templates.js?v=20261022_v1';
import { apiService } from '../services/api.js?v=20261022_v1';
import { notificationService } from '../services/notification_service.js?v=20261022_v1';
import { attachCustomizerEvents } from './customizer/customizer_events.js?v=20261022_v1';
import {
  renderVisualizerStage,
  renderDraggablePrintMarkup,
  getGarmentSvgMarkup,
  getPrintArtworkMarkup,
  getPrintBaseDimensions
} from './customizer/customizer_stage.js?v=20261022_v1';
import {
  renderAtelierConsole,
  getGarmentThumbType
} from './customizer/customizer_steps.js?v=20261022_v1';

const CUSTOMIZER_DRAFT_KEY = 'senkai_customizer_draft_v1';

export class CustomizerStudio {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.onAddToCart = options.onAddToCart || (() => {});

    // Estado reactivo: cara frontal inicia con estampa estándar, espalda inicia LISA
    this.state = {
      selectedGarment: null,
      selectedColor: null,
      userSelectedColor: false,
      selectedSize: "L",
      currentView: "front", // 'front' | 'back'
      quantity: 1,
      activePrintId: "print-front-1",
      activeStep: "garment", // 'garment' | 'print' | 'order'
      prints: [
        {
          id: "print-front-1",
          name: "Estampa Frontal",
          view: "front",
          print_size: "A4",
          artwork: PRESET_ARTWORKS[0],
          customArtworkDataUrl: null,
          designImageUrl: null,
          offset_x_pct: 50.0,
          offset_y_pct: 38.0,
          scale_factor: 1.0,
          calculated_cost: 0
        }
      ],
      pricing: {
        basePrice: 12990,
        dtfTotalUnit: 0,
        unitTotal: 12990,
        discountPct: 0,
        total: 12990
      }
    };

    this.garmentsList = [];
  }

  // Persistencia de borrador en localStorage
  saveDraft() {
    try {
      if (!this.state.selectedGarment) return;
      const draft = {
        garmentId: this.state.selectedGarment.id,
        selectedColor: this.state.selectedColor,
        userSelectedColor: this.state.userSelectedColor,
        selectedSize: this.state.selectedSize,
        currentView: this.state.currentView,
        quantity: this.state.quantity,
        activeStep: this.state.activeStep,
        prints: this.state.prints.map(p => ({
          id: p.id,
          name: p.name,
          view: p.view,
          print_size: p.print_size,
          presetArtworkId: p.artwork?.id || null,
          // Guardar DataURL solo si es liviana para no saturar los 5MB de localStorage
          customArtworkDataUrl: p.customArtworkDataUrl && p.customArtworkDataUrl.length < 500000 ? p.customArtworkDataUrl : null,
          designImageUrl: p.designImageUrl || null,
          offset_x_pct: p.offset_x_pct,
          offset_y_pct: p.offset_y_pct,
          scale_factor: p.scale_factor,
          calculated_cost: p.calculated_cost
        }))
      };
      localStorage.setItem(CUSTOMIZER_DRAFT_KEY, JSON.stringify(draft));
    } catch (e) {
      console.warn("No se pudo guardar el borrador del personalizador en localStorage:", e);
    }
  }

  loadDraft() {
    try {
      const raw = localStorage.getItem(CUSTOMIZER_DRAFT_KEY);
      if (!raw) return false;
      const draft = JSON.parse(raw);
      if (!draft || !draft.garmentId) return false;

      const garment = this.garmentsList.find(g => g.id === draft.garmentId && g.is_active !== false);
      if (!garment) return false;

      this.state.selectedGarment = garment;
      if (draft.selectedColor) {
        this.state.selectedColor = draft.selectedColor;
      } else {
        this.state.selectedColor = garment.colors[0];
      }
      this.state.userSelectedColor = !!draft.userSelectedColor;
      if (draft.selectedSize) this.state.selectedSize = draft.selectedSize;
      if (draft.currentView) this.state.currentView = draft.currentView;
      if (draft.quantity) this.state.quantity = draft.quantity;
      if (draft.activeStep) this.state.activeStep = draft.activeStep;
      this.state.pricing.basePrice = this.getSelectedSizePrice(garment, this.state.selectedSize);

      if (Array.isArray(draft.prints) && draft.prints.length > 0) {
        this.state.prints = draft.prints.map(p => {
          let artwork = null;
          if (p.presetArtworkId) {
            artwork = PRESET_ARTWORKS.find(a => a.id === p.presetArtworkId) || PRESET_ARTWORKS[0];
          }
          return {
            id: p.id,
            name: p.name,
            view: p.view,
            print_size: p.print_size || 'A4',
            artwork: artwork,
            customArtworkDataUrl: p.customArtworkDataUrl || null,
            designImageUrl: p.designImageUrl || null,
            offset_x_pct: typeof p.offset_x_pct === 'number' ? p.offset_x_pct : 50.0,
            offset_y_pct: typeof p.offset_y_pct === 'number' ? p.offset_y_pct : 40.0,
            scale_factor: typeof p.scale_factor === 'number' ? p.scale_factor : 1.0,
            calculated_cost: 0
          };
        });
        const currentPrints = this.state.prints.filter(p => p.view === this.state.currentView);
        this.state.activePrintId = currentPrints.length > 0 ? currentPrints[0].id : null;
      }
      return true;
    } catch (e) {
      console.warn("Error restaurando borrador de personalizador:", e);
      return false;
    }
  }

  getSelectedSizePrice(garment = this.state.selectedGarment, size = this.state.selectedSize) {
    if (!garment) return 12990;
    const sp = garment.size_prices || {};
    if (size && sp[size] !== undefined && sp[size] !== null && Number(sp[size]) >= 1000) {
      return Number(sp[size]);
    }
    return Number(garment.base_price) || 12990;
  }

  clearDraft() {
    try {
      localStorage.removeItem(CUSTOMIZER_DRAFT_KEY);
    } catch (e) {
      console.warn("Error limpiando borrador de personalizador:", e);
    }
  }

  // Inicializo el estudio con las prendas cargadas desde el backend o catálogo fallback
  async init(garments) {
    this.garmentsList = garments || [];
    const activeGarments = this.garmentsList.filter(g => g.is_active !== false);
    const defaultGarment = activeGarments[0] || this.garmentsList[0] || null;

    const restored = this.loadDraft();
    if (!restored && defaultGarment) {
      this.state.selectedGarment = defaultGarment;
      this.state.selectedColor = this.state.selectedGarment.colors[0];
      this.state.pricing.basePrice = this.getSelectedSizePrice();
    } else if (this.state.selectedGarment && this.garmentsList.length > 0) {
      const freshGarment = this.garmentsList.find(
        g => g.id === this.state.selectedGarment.id && g.is_active !== false
      ) || defaultGarment;
      this.state.selectedGarment = freshGarment;
      this.state.pricing.basePrice = this.getSelectedSizePrice();
    }
    this.render();
    this.attachEvents();
    await this.updateQuote();
  }

  // Permito cambiar la prenda desde el carrusel superior o el catálogo
  setGarmentById(garmentId, options = {}) {
    const found = this.garmentsList.find(g => g.id === garmentId);
    if (!found) return;
    if (found.is_active === false) {
      notificationService.warning(`El modelo "${found.name}" no se encuentra disponible temporalmente.`);
      return;
    }

    this.state.selectedGarment = found;
    this.state.selectedColor = found.colors?.[0] || { name: "Negro", hex_code: "#121212", in_stock: true };
    if (Array.isArray(found.sizes) && found.sizes.length > 0 && !found.sizes.includes(this.state.selectedSize)) {
      this.state.selectedSize = found.sizes.includes("L") ? "L" : found.sizes[0];
    }

    if (options.view) {
      this.state.currentView = options.view;
    }

    if (options.colorHex || options.view) {
      this.state.activeStep = "print";
    }

    this.state.pricing.basePrice = this.getSelectedSizePrice();
    this.saveDraft();
    this.render();
    this.attachEvents();
    this.updateQuote();
  }

  // Cambio la cara visible (frente o espalda) y enfoco la estampa correspondiente
  setView(view) {
    this.state.currentView = view;
    const printsOnView = this.state.prints.filter(p => p.view === view);

    if (printsOnView.length > 0) {
      const activePrint = this.getActivePrint();
      if (!activePrint || activePrint.view !== view) {
        this.state.activePrintId = printsOnView[0].id;
      }
    } else {
      this.state.activePrintId = null;
    }

    this.saveDraft();
    this.render();
    this.attachEvents();
  }

  // Retorno la estampa seleccionada en la cara activa
  getActivePrint() {
    if (!this.state.activePrintId) {
      const currentPrints = this.state.prints.filter(p => p.view === this.state.currentView);
      return currentPrints.length > 0 ? currentPrints[0] : null;
    }
    const found = this.state.prints.find(p => p.id === this.state.activePrintId);
    if (found && found.view === this.state.currentView) {
      return found;
    }
    const fallbackOnView = this.state.prints.find(p => p.view === this.state.currentView);
    return fallbackOnView || null;
  }

  // Métodos delegados a los submódulos auxiliares para mantener compatibilidad pública
  getGarmentThumbType(category) {
    return getGarmentThumbType(category);
  }

  getPrintBaseDimensions(printSize) {
    return getPrintBaseDimensions(printSize);
  }

  getGarmentSvgMarkup(category, view, colorHex) {
    return getGarmentSvgMarkup(category, view, colorHex);
  }

  getPrintArtworkMarkup(print) {
    return getPrintArtworkMarkup(print);
  }

  renderDraggablePrintMarkup(p, activePrint) {
    return renderDraggablePrintMarkup(p, activePrint);
  }

  // Agrego una nueva estampa en la cara actual
  addPrint(view = this.state.currentView) {
    const isBack = view === "back";
    const existing = this.state.prints.find(p => p.view === view);
    if (existing) {
      this.state.activePrintId = existing.id;
      this.state.currentView = view;
      this.saveDraft();
      this.render();
      this.attachEvents();
      return;
    }

    const defaultSize = isBack ? "A3" : "A4";
    const defaultY = isBack ? 42.0 : 38.0;

    const newPrint = {
      id: `print-${view}-${Date.now().toString(36)}`,
      name: `Estampa ${isBack ? 'Espalda' : 'Frente'}`,
      view: view,
      print_size: defaultSize,
      artwork: PRESET_ARTWORKS[isBack ? 1 : 0] || PRESET_ARTWORKS[0],
      customArtworkDataUrl: null,
      designImageUrl: null,
      offset_x_pct: 50.0,
      offset_y_pct: defaultY,
      scale_factor: 1.0,
      calculated_cost: 0
    };

    this.state.prints.push(newPrint);
    this.state.activePrintId = newPrint.id;
    this.state.currentView = view;
    this.saveDraft();
    this.render();
    this.attachEvents();
    this.updateQuote();
  }

  // Elimino una estampa específica por su identificador
  removePrint(printId) {
    this.state.prints = this.state.prints.filter(p => p.id !== printId);
    const printsOnCurrentView = this.state.prints.filter(p => p.view === this.state.currentView);
    if (printsOnCurrentView.length > 0) {
      this.state.activePrintId = printsOnCurrentView[0].id;
    } else {
      this.state.activePrintId = null;
    }
    this.saveDraft();
    this.render();
    this.attachEvents();
    this.updateQuote();
  }

  // Limpio todas las estampas de la cara visible para dejarla lisa
  clearCurrentFace() {
    this.state.prints = this.state.prints.filter(p => p.view !== this.state.currentView);
    this.state.activePrintId = null;
    this.saveDraft();
    this.render();
    this.attachEvents();
    this.updateQuote();
  }

  // Marco como activa la estampa seleccionada
  setActivePrint(printId) {
    const found = this.state.prints.find(p => p.id === printId);
    if (found) {
      this.state.activePrintId = printId;
      if (this.state.currentView !== found.view) {
        this.state.currentView = found.view;
      }
      this.render();
      this.attachEvents();
    }
  }

  // Renderizo el layout completo combinando el escenario y la consola de taller
  render() {
    if (!this.container || !this.state.selectedGarment) return;

    const basePrice = this.getSelectedSizePrice();
    this.state.pricing.basePrice = basePrice;
    this.state.pricing.dtfTotalUnit = 0;
    this.state.pricing.unitTotal = basePrice;
    this.state.pricing.total = basePrice * this.state.quantity;

    const g = this.state.selectedGarment;
    const currentColor = this.state.selectedColor.hex_code;
    const activePrint = this.getActivePrint();

    const frontPrints = this.state.prints.filter(p => p.view === 'front');
    const backPrints = this.state.prints.filter(p => p.view === 'back');

    this.container.innerHTML = `
      <div class="customizer-layout">
        ${renderVisualizerStage(this.state, g, currentColor, activePrint, frontPrints, backPrints)}
        ${renderAtelierConsole(this.state, this.garmentsList, activePrint)}
      </div>
    `;
  }

  // Conecto todos los listeners de la interfaz a través del submódulo de eventos
  attachEvents() {
    attachCustomizerEvents(this.container, this);
  }

  // Carga de archivo para la estampa activa con preview inmediato y subida binaria al servidor
  handleFileUpload(file) {
    if (!file.type.startsWith('image/') && !file.name.toLowerCase().endsWith('.pdf')) {
      notificationService.warning("Por favor sube un archivo de diseño válido (PNG, SVG, JPG, WebP o PDF).");
      return;
    }

    const activePrint = this.getActivePrint();
    if (!activePrint) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      activePrint.customArtworkDataUrl = event.target.result;
      activePrint.artwork = null;
      activePrint.name = file.name || "Mi Diseño Personalizado";
      this.saveDraft();
      this.render();
      this.attachEvents();
      this.updateQuote();

      // Subida binaria multipart asíncrona al taller para aligerar la orden
      try {
        const uploadRes = await apiService.uploadDTFDesign(file);
        if (uploadRes && uploadRes.url) {
          activePrint.designImageUrl = uploadRes.url;
          this.saveDraft();
          notificationService.success("Arte en alta resolución vinculado a la orden.");
        }
      } catch (uploadErr) {
        console.warn("Subida binaria no completada; se mantendrá previsualización local:", uploadErr);
      }
    };
    reader.readAsDataURL(file);
  }

  // Carga directa de archivo cuando la cara estaba vacía
  handleDirectFileUpload(file) {
    if (!file.type.startsWith('image/') && !file.name.toLowerCase().endsWith('.pdf')) {
      notificationService.warning("Por favor sube un archivo de diseño válido (PNG, SVG, JPG, WebP o PDF).");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const isBack = this.state.currentView === "back";
      const existing = this.state.prints.find(p => p.view === this.state.currentView);
      let targetPrint = null;

      if (existing) {
        existing.customArtworkDataUrl = event.target.result;
        existing.artwork = null;
        existing.name = file.name || `Estampa Propia (${isBack ? 'Espalda' : 'Frente'})`;
        this.state.activePrintId = existing.id;
        targetPrint = existing;
      } else {
        const newPrint = {
          id: `print-${this.state.currentView}-${Date.now().toString(36)}`,
          name: file.name || `Estampa Propia (${isBack ? 'Espalda' : 'Frente'})`,
          view: this.state.currentView,
          print_size: isBack ? "A3" : "A4",
          artwork: null,
          customArtworkDataUrl: event.target.result,
          designImageUrl: null,
          offset_x_pct: 50.0,
          offset_y_pct: isBack ? 42.0 : 38.0,
          scale_factor: 1.0,
          calculated_cost: 0
        };
        this.state.prints.push(newPrint);
        this.state.activePrintId = newPrint.id;
        targetPrint = newPrint;
      }

      this.saveDraft();
      this.render();
      this.attachEvents();
      this.updateQuote();

      // Subida binaria multipart asíncrona al taller
      try {
        const uploadRes = await apiService.uploadDTFDesign(file);
        if (uploadRes && uploadRes.url && targetPrint) {
          targetPrint.designImageUrl = uploadRes.url;
          this.saveDraft();
          notificationService.success("Arte en alta resolución vinculado a la orden.");
        }
      } catch (uploadErr) {
        console.warn("Subida binaria no completada; se mantendrá previsualización local:", uploadErr);
      }
    };
    reader.readAsDataURL(file);
  }

  // Cotización dinámica: el valor asignado a la prenda/talla ya incluye el estampado DTF
  async updateQuote() {
    const basePrice = this.getSelectedSizePrice();
    const unitTotal = basePrice;
    const total = unitTotal * this.state.quantity;

    this.state.pricing = {
      basePrice,
      dtfTotalUnit: 0,
      unitTotal,
      discountPct: 0,
      total
    };

    this.saveDraft();

    const quoteBasePrice = this.container?.querySelector('#quoteBasePrice');
    const quoteDtfPrice = this.container?.querySelector('#quoteDtfPrice');
    const quoteTotalVal = this.container?.querySelector('#quoteTotalVal');
    if (quoteBasePrice) quoteBasePrice.textContent = `$${basePrice.toLocaleString('es-CL')}`;
    if (quoteDtfPrice) quoteDtfPrice.textContent = 'INCLUIDO';
    if (quoteTotalVal) quoteTotalVal.textContent = `$${total.toLocaleString('es-CL')} CLP`;
  }

  // Armo el objeto de orden técnica y lo envío al carrito
  triggerAddToCart() {
    const g = this.state.selectedGarment;
    const frontPrints = this.state.prints.filter(p => p.view === 'front');
    const backPrints = this.state.prints.filter(p => p.view === 'back');

    const frontSummary = frontPrints.length > 0 
      ? frontPrints.map(p => `${p.print_size} (${(p.customArtworkDataUrl || p.designImageUrl) ? 'Propio' : (p.artwork ? p.artwork.name : 'DTF')})`).join(' + ')
      : 'Cara Lisa';

    const backSummary = backPrints.length > 0 
      ? backPrints.map(p => `${p.print_size} (${(p.customArtworkDataUrl || p.designImageUrl) ? 'Propio' : (p.artwork ? p.artwork.name : 'DTF')})`).join(' + ')
      : 'Cara Lisa';

    const item = {
      garment_id: g.id,
      garment_name: g.name,
      selected_color: this.state.selectedColor,
      selected_size: this.state.selectedSize,
      preview_front_summary: frontSummary,
      preview_back_summary: backSummary,
      prints: this.state.prints.map(p => ({
        id: p.id,
        view: p.view,
        print_size: p.print_size,
        design_name: (p.customArtworkDataUrl || p.designImageUrl) ? (p.name || "Diseño Personalizado del Cliente") : (p.artwork ? p.artwork.name : "Estampa"),
        // Prioriza la URL estática del servidor; fallback a DataURL si no hubo subida
        design_image_url: p.designImageUrl || p.customArtworkDataUrl || null,
        offset_x_pct: p.offset_x_pct,
        offset_y_pct: p.offset_y_pct,
        scale_factor: p.scale_factor,
        calculated_dtf_cost: p.calculated_cost
      })),
      quantity: this.state.quantity,
      unit_price: this.state.pricing.unitTotal,
      subtotal: this.state.pricing.total
    };

    this.onAddToCart(item);
  }
}