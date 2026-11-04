// Seguimiento privado por identificador aleatorio; el folio SNK es solo una referencia visible.
// Permite al cliente consultar en qué etapa técnica del taller se encuentra su pedido.

import { apiService } from '../services/api.js?v=20261022_v2';

const LAST_TRACKING_STORAGE_KEY = 'senkai_last_tracking_capability_v1';
const PRIVATE_TRACKING_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const PRODUCTION_STAGES = [
  {
    key: 'cola_impresion_dtf',
    code: 'FASE 01',
    label: 'Cola de Impresión DTF',
    desc: 'Recepción de orden, procesado RIP a 300 DPI e inyección sobre film técnico.',
    icon: 'print'
  },
  {
    key: 'en_planchado_curado',
    code: 'FASE 02',
    label: 'Planchado & Curado 160°C',
    desc: 'Transferencia térmica en prensa neumática y control de calidad de costuras.',
    icon: 'iron'
  },
  {
    key: 'listo_despacho',
    code: 'FASE 03',
    label: 'Listo para Despacho / Retiro',
    desc: 'Prenda empacada y lista para retiro en taller o entrega a courier express.',
    icon: 'inventory_2'
  },
  {
    key: 'entregado',
    code: 'FASE 04',
    label: 'Pedido Entregado',
    desc: 'Orden completada y entregada satisfactoriamente.',
    icon: 'verified'
  }
];

const STATUS_META = {
  pendiente_pago: {
    label: 'Pendiente de Validación',
    stageIndex: 0,
    badgeClass: 'status-warning'
  },
  cola_impresion_dtf: {
    label: 'En Cola de Impresión DTF',
    stageIndex: 0,
    badgeClass: 'status-active'
  },
  en_planchado_curado: {
    label: 'En Planchado y Curado Térmico (160°C)',
    stageIndex: 1,
    badgeClass: 'status-active'
  },
  control_calidad: {
    label: 'En Control de Calidad y Empaque',
    stageIndex: 1,
    badgeClass: 'status-active'
  },
  listo_despacho: {
    label: 'Listo para Despacho / Retiro en Taller',
    stageIndex: 2,
    badgeClass: 'status-ready'
  },
  entregado: {
    label: 'Entregado y Finalizado',
    stageIndex: 3,
    badgeClass: 'status-completed'
  },
  cancelado: {
    label: 'Orden Cancelada',
    stageIndex: -1,
    badgeClass: 'status-cancelled'
  }
};

export class OrderTrackerComponent {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.currentOrder = null;
    this.isLoading = false;
    this.errorMessage = null;
    this.queryValue = '';
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  saveLastTrackingToken(orderId, orderNumber) {
    const trackingId = String(orderId || '').trim().toLowerCase();
    if (!PRIVATE_TRACKING_ID_PATTERN.test(trackingId)) return;
    try {
      // Solo el UUID aleatorio autoriza el seguimiento. El folio es una etiqueta.
      localStorage.setItem(LAST_TRACKING_STORAGE_KEY, JSON.stringify({
        id: trackingId,
        number: String(orderNumber || '').trim().toUpperCase()
      }));
      this.render();
      this.attachEvents();
    } catch (_) {}
  }

  getLastTrackingOrder() {
    try {
      const stored = JSON.parse(localStorage.getItem(LAST_TRACKING_STORAGE_KEY) || 'null');
      return stored && PRIVATE_TRACKING_ID_PATTERN.test(stored.id) ? stored : null;
    } catch (_) {
      return null;
    }
  }

  init() {
    if (!this.container) return;
    const saved = this.getLastTrackingOrder();
    if (saved && !this.queryValue) {
      this.queryValue = saved.id;
    }
    this.render();
    this.attachEvents();
  }

  async trackOrder(orderNumberInput) {
    const cleanCode = String(orderNumberInput || '').trim().toLowerCase();
    if (!PRIVATE_TRACKING_ID_PATTERN.test(cleanCode)) {
      this.errorMessage = 'Ingresa el código privado de seguimiento (UUID) que recibiste al comprar. El folio SNK no autoriza consultas públicas.';
      this.currentOrder = null;
      this.render();
      this.attachEvents();
      return;
    }

    this.queryValue = cleanCode;
    this.isLoading = true;
    this.errorMessage = null;
    this.render();
    this.attachEvents();

    try {
      const order = await apiService.getOrderByNumber(cleanCode);
      this.currentOrder = order;
      this.saveLastTrackingToken(cleanCode, order.order_number);
    } catch (err) {
      this.currentOrder = null;
      this.errorMessage = `No encontramos ningún pedido con el código "${cleanCode}". Verifica que corresponda al código privado de seguimiento.`;
    } finally {
      this.isLoading = false;
      this.render();
      this.attachEvents();
    }
  }

  render() {
    if (!this.container) return;
    const recentOrderCode = this.getLastTrackingOrder();

    this.container.innerHTML = `
      <div class="order-tracker-card">
        <div class="order-tracker-search-bar">
          <form id="orderTrackerForm" class="order-tracker-form" novalidate>
            <div class="tracker-input-wrap">
              <span class="material-symbols-outlined tracker-input-icon" aria-hidden="true">qr_code_scanner</span>
              <input
                type="text"
                id="orderTrackerInput"
                class="tracker-code-input"
                placeholder="Código privado de seguimiento (UUID)"
                value="${this.escapeHtml(this.queryValue)}"
                aria-label="Código privado de seguimiento del pedido"
                autocomplete="off"
              >
            </div>
            <button type="submit" class="btn btn-primary tracker-submit-btn" ${this.isLoading ? 'disabled' : ''}>
              <span class="material-symbols-outlined" style="font-size: 18px;">${this.isLoading ? 'sync' : 'travel_explore'}</span>
              <span>${this.isLoading ? 'CONSULTANDO...' : 'RASTREAR PEDIDO'}</span>
            </button>
          </form>

          ${recentOrderCode ? `
            <div class="tracker-recent-hint">
              <span>Tu último pedido registrado:</span>
              <button type="button" class="tracker-quick-code-btn" data-quick-order="${this.escapeHtml(recentOrderCode.id)}">
                ${this.escapeHtml(recentOrderCode.number || 'Pedido reciente')} ?
              </button>
            </div>
          ` : ''}
        </div>

        ${this.errorMessage ? `
          <div class="tracker-feedback-error" role="alert">
            <span class="material-symbols-outlined">error_outline</span>
            <span>${this.escapeHtml(this.errorMessage)}</span>
          </div>
        ` : ''}

        ${this.currentOrder ? this.renderOrderStatusResult(this.currentOrder) : `
          <div class="tracker-empty-prompt">
            <span class="material-symbols-outlined tracker-empty-icon">local_shipping</span>
            <p>Ingresa el <strong>código privado de seguimiento</strong> mostrado al confirmar tu compra. Tu folio SNK sigue siendo la referencia de taller, pero no autoriza el acceso público.</p>
          </div>
        `}
      </div>
    `;
  }

  renderOrderStatusResult(order) {
    const statusKey = order.status || 'cola_impresion_dtf';
    const meta = STATUS_META[statusKey] || {
      label: statusKey.toUpperCase(),
      stageIndex: 0,
      badgeClass: 'status-active'
    };

    const isCancelled = statusKey === 'cancelado';
    const deliveryLabel = order.customer?.delivery_method === 'pickup'
      ? 'Retiro en Taller Senkai (Providencia, Santiago)'
      : `Despacho Express a Domicilio${order.customer?.shipping_city ? ` (${this.escapeHtml(order.customer.shipping_city)})` : ''}`;

    return `
      <div class="tracker-result-panel">
        <div class="tracker-result-header">
          <div class="tracker-order-id-group">
            <span class="tracker-order-eyebrow">ORDEN DE PRODUCCIÓN VERIFICADA</span>
            <h3 class="tracker-order-number">${this.escapeHtml(order.order_number)}</h3>
          </div>
          <div class="tracker-status-pill ${meta.badgeClass}">
            <span class="status-dot"></span>
            <span>ESTADO ACTUAL: ${this.escapeHtml(meta.label)}</span>
          </div>
        </div>

        ${isCancelled ? `
          <div class="tracker-feedback-error" style="margin-bottom: 1.5rem;">
            <span class="material-symbols-outlined">cancel</span>
            <span>Esta orden se encuentra cancelada. Si tienes dudas, contáctanos por WhatsApp indicando tu código ${this.escapeHtml(order.order_number)}.</span>
          </div>
        ` : `
          <div class="tracker-pipeline-steps" role="list" aria-label="Etapas de producción del pedido">
            ${PRODUCTION_STAGES.map((stage, idx) => {
              const isCompleted = idx < meta.stageIndex || statusKey === 'entregado';
              const isCurrent = idx === meta.stageIndex && statusKey !== 'entregado';
              const stateClass = isCompleted ? 'is-completed' : (isCurrent ? 'is-current' : 'is-pending');
              return `
                <div class="tracker-stage-card ${stateClass}" role="listitem">
                  <div class="tracker-stage-top">
                    <span class="tracker-stage-code">${stage.code}</span>
                    <span class="material-symbols-outlined tracker-stage-icon">
                      ${isCompleted ? 'check_circle' : stage.icon}
                    </span>
                  </div>
                  <h4 class="tracker-stage-title">${stage.label}</h4>
                  <p class="tracker-stage-desc">${stage.desc}</p>
                  <span class="tracker-stage-tag">
                    ${isCompleted ? 'COMPLETADO ?' : (isCurrent ? 'EN PROCESO AHORA' : 'PENDIENTE')}
                  </span>
                </div>
              `;
            }).join('')}
          </div>
        `}


        <div class="tracker-details-grid">
          <div class="tracker-meta-box">
            <span class="tracker-meta-label">INFORMACIÓN DE PRODUCCIÓN</span>
            <div class="tracker-meta-rows">
              <div class="tracker-meta-row">
                <span>Entrega estimada:</span>
                <strong>${this.escapeHtml(order.estimated_delivery || 'Por confirmar')}</strong>
              </div>
              ${order.tracking_code ? `
                <div class="tracker-meta-row">
                  <span>Código courier:</span>
                  <strong class="tracker-courier-code">${this.escapeHtml(order.tracking_code)}</strong>
                </div>
              ` : ''}
            </div>
            <p class="tracker-meta-label">Por privacidad, esta consulta no publica nombres, direcciones, compras ni importes.</p>
          </div>
        </div>
      </div>
    `;
  }

  attachEvents() {
    if (!this.container) return;

    const form = this.container.querySelector('#orderTrackerForm');
    const input = this.container.querySelector('#orderTrackerInput');

    if (form && input) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.trackOrder(input.value);
      });
    }

    this.container.querySelectorAll('[data-quick-order]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const code = e.currentTarget.dataset.quickOrder;
        if (code) {
          this.trackOrder(code);
        }
      });
    });
  }
}
