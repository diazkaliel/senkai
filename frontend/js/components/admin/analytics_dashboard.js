/**
 * SEIKO // MÓDULO DE ANALÍTICA DE DATOS Y BUSINESS INTELLIGENCE DE TALLER
 * Visualizaciones interactivas en SVG nativo sin dependencias pesadas.
 * Curva de ingresos/pedidos con tooltip de seguimiento, ranking de prendas y logística.
 */

import { apiService } from '../../services/api.js';

export class AnalyticsDashboardComponent {
  constructor(hostElement) {
    this.host = hostElement;
    this.days = 30;
    this.metricMode = "revenue"; // "revenue" | "orders"
    this.data = null;
    this.isLoading = false;
    this.activePointIndex = null;
  }

  async init() {
    await this.loadData();
  }

  async loadData() {
    this.isLoading = true;
    this.renderLoading();
    try {
      this.data = await apiService.getWorkshopAnalytics(this.days);
      this.render();
      this.attachEvents();
    } catch (err) {
      console.error("Error al cargar analítica de taller:", err);
      this.renderError(err.message || "Error al conectar con el motor analítico.");
    } finally {
      this.isLoading = false;
    }
  }

  renderLoading() {
    if (!this.host) return;
    this.host.innerHTML = `
      <div class="analytics-loading-state">
        <div class="spinner-inline"></div>
        <p>Procesando métricas y series temporales de taller...</p>
      </div>
    `;
  }

  renderError(message) {
    if (!this.host) return;
    this.host.innerHTML = `
      <div class="analytics-error-state">
        <span class="material-symbols-outlined" style="font-size: 2.5rem; color: var(--accent-warning); margin-bottom: 0.5rem;">warning</span>
        <h4>No se pudo cargar la analítica</h4>
        <p>${message}</p>
        <button class="btn btn-secondary" id="retryAnalyticsBtn" style="margin-top: 1rem; display: inline-flex; align-items: center; gap: 0.35rem;">
          <span class="material-symbols-outlined" style="font-size: 16px;">refresh</span> Reintentar Carga
        </button>
      </div>
    `;
    const btn = this.host.querySelector('#retryAnalyticsBtn');
    if (btn) btn.addEventListener('click', () => this.loadData());
  }

  render() {
    if (!this.host || !this.data) return;

    const d = this.data;
    const isRev = this.metricMode === "revenue";

    this.host.innerHTML = `
      <div class="analytics-dashboard">
        
        <!-- BARRA SUPERIOR DE FILTROS Y EXPORTACIÓN -->
        <div class="analytics-top-bar">
          <div class="analytics-title-group">
            <span class="badge badge-admin">INTELIGENCIA DE TALLER // TIEMPO REAL</span>
            <h3>Rendimiento Comercial y Operativo</h3>
            <p class="analytics-subtitle">
              Analítica consolidada de los últimos <strong>${this.days} días</strong> con recálculo autoritativo.
            </p>
          </div>

          <div class="analytics-controls">
            <!-- Selector de Rango de Días -->
            <div class="analytics-pills-group" role="group" aria-label="Rango de tiempo">
              <button class="analytics-pill-btn ${this.days === 7 ? 'active' : ''}" data-days="7">7 Días</button>
              <button class="analytics-pill-btn ${this.days === 14 ? 'active' : ''}" data-days="14">14 Días</button>
              <button class="analytics-pill-btn ${this.days === 30 ? 'active' : ''}" data-days="30">30 Días</button>
            </div>

            <!-- Botón de Exportación CSV -->
            <button class="btn btn-secondary btn-export-csv" id="exportAnalyticsCsvBtn" title="Descargar reporte para contabilidad" style="display: inline-flex; align-items: center; gap: 0.35rem;">
              <span class="material-symbols-outlined" style="font-size: 16px;">download</span> Exportar CSV
            </button>
          </div>
        </div>

        <!-- TARJETAS KPI RESUMEN DEL PERÍODO -->
        <div class="analytics-kpi-row">
          <div class="analytics-kpi-card">
            <div class="kpi-micro-label">Facturación del Período</div>
            <div class="kpi-main-val">$${d.total_revenue_period.toLocaleString('es-CL')} <span class="currency-tag">CLP</span></div>
            <div class="kpi-footer-note">Histórico: $${d.historical_revenue_clp.toLocaleString('es-CL')} CLP</div>
          </div>

          <div class="analytics-kpi-card">
            <div class="kpi-micro-label">Ticket Promedio (AOV)</div>
            <div class="kpi-main-val">$${d.average_order_value_clp.toLocaleString('es-CL')} <span class="currency-tag">CLP</span></div>
            <div class="kpi-footer-note">Promedio por orden confirmada</div>
          </div>

          <div class="analytics-kpi-card">
            <div class="kpi-micro-label">Volumen de Producción</div>
            <div class="kpi-main-val">${d.total_units_period} <span class="currency-tag">PRENDAS</span></div>
            <div class="kpi-footer-note">En ${d.total_orders_period} pedidos procesados</div>
          </div>

          <div class="analytics-kpi-card">
            <div class="kpi-micro-label">Preferencia Logística</div>
            <div class="kpi-main-val">${d.logistics.pickup_percentage}% <span class="currency-tag">RETIRO</span></div>
            <div class="kpi-footer-note">${d.logistics.shipping_percentage}% Envío a domicilio</div>
          </div>
        </div>

        <!-- GRÁFICO PRINCIPAL: SERIE TEMPORAL INTERACTIVA -->
        <div class="analytics-chart-panel">
          <div class="chart-header">
            <div>
              <h4 class="chart-title">Evolución Diaria: Tendencia y Actividad</h4>
              <span class="chart-sub">Desplaza el cursor o toca la gráfica para inspeccionar cada jornada</span>
            </div>

            <div class="chart-toggle-group">
              <button class="chart-toggle-btn ${isRev ? 'active' : ''}" data-metric="revenue">
                <span class="material-symbols-outlined" style="font-size: 14px; vertical-align: middle;">payments</span> Facturación ($)
              </button>
              <button class="chart-toggle-btn ${!isRev ? 'active' : ''}" data-metric="orders">
                <span class="material-symbols-outlined" style="font-size: 14px; vertical-align: middle;">inventory_2</span> Pedidos (Cant.)
              </button>
            </div>
          </div>

          <div class="chart-viewport-box" id="timeseriesChartBox">
            ${this.renderTimeSeriesSvg(d.timeseries, isRev)}
            <div class="chart-floating-tooltip" id="chartFloatingTooltip" style="display: none;"></div>
          </div>
        </div>

        <!-- FILA DE PANELES: RANKING DE PRENDAS Y LOGÍSTICA -->
        <div class="analytics-grid-two-cols">
          
          <!-- PANEL RANKING BESTSELLERS -->
          <div class="analytics-sub-panel">
            <div class="sub-panel-header">
              <h4>Prendas Base Bestsellers</h4>
              <span class="badge badge-cyan">${d.top_garments.length} Modelos</span>
            </div>
            <p class="sub-panel-desc">Prendas con mayor demanda y rotación de stock en el taller.</p>

            <div class="garment-bars-list">
              ${d.top_garments.length === 0 ? `
                <div class="empty-mini-note">Sin registros en el período seleccionado.</div>
              ` : d.top_garments.map(g => `
                <div class="garment-bar-row">
                  <div class="garment-bar-info">
                    <span class="garment-bar-name">${g.garment_name}</span>
                    <span class="garment-bar-counts">${g.units_sold} un. • $${g.revenue_clp.toLocaleString('es-CL')} CLP</span>
                  </div>
                  <div class="garment-bar-track">
                    <div class="garment-bar-fill" style="width: ${Math.max(g.share_percentage, 4)}%;"></div>
                  </div>
                  <div class="garment-bar-pct">${g.share_percentage}%</div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- PANEL DISTRIBUCIÓN LOGÍSTICA -->
          <div class="analytics-sub-panel">
            <div class="sub-panel-header">
              <h4>Distribución Logística & Despacho</h4>
              <span class="badge badge-lime">Cumplimiento</span>
            </div>
            <p class="sub-panel-desc">Balance entre retiros presenciales en taller y envíos express por courier.</p>

            <div class="logistics-visual-box">
              <div class="logistics-ratio-bar">
                <div class="ratio-segment pickup" style="width: ${d.logistics.pickup_percentage}%;" title="Retiro en Taller: ${d.logistics.pickup_percentage}%"></div>
                <div class="ratio-segment shipping" style="width: ${d.logistics.shipping_percentage}%;" title="Envío Express: ${d.logistics.shipping_percentage}%"></div>
              </div>

              <div class="logistics-legend-row">
                <div class="legend-item">
                  <span class="legend-dot pickup"></span>
                  <div>
                    <strong>Retiro en Taller (Providencia)</strong><br>
                    <small>${d.logistics.pickup_count} pedidos (${d.logistics.pickup_percentage}%)</small>
                  </div>
                </div>

                <div class="legend-item">
                  <span class="legend-dot shipping"></span>
                  <div>
                    <strong>Despacho a Domicilio Express</strong><br>
                    <small>${d.logistics.shipping_count} pedidos (${d.logistics.shipping_percentage}%)</small>
                  </div>
                </div>
              </div>

              <div class="logistics-callout">
                <span class="material-symbols-outlined" style="font-size: 16px; color: var(--accent-admin);">info</span>
                <span>El retiro en taller agiliza los tiempos de entrega eliminando la espera de courier externo.</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    `;
  }

  renderTimeSeriesSvg(points, isRevenue) {
    if (!points || points.length === 0) {
      return `<div class="empty-mini-note">Sin datos para graficar.</div>`;
    }

    const svgW = 860;
    const svgH = 280;
    const padL = 55;
    const padR = 25;
    const padT = 25;
    const padB = 45;

    const plotW = svgW - padL - padR;
    const plotH = svgH - padT - padB;

    // Obtener valores máximos para escala
    const values = points.map(p => isRevenue ? p.revenue_clp : p.orders_count);
    const maxVal = Math.max(...values, isRevenue ? 10000 : 1);

    // Mapeo de coordenadas (x, y)
    const coords = points.map((p, i) => {
      const x = padL + (i / (points.length - 1 || 1)) * plotW;
      const v = isRevenue ? p.revenue_clp : p.orders_count;
      const y = padT + plotH - (v / maxVal) * plotH;
      return { x, y, point: p, val: v };
    });

    // Construcción de línea SVG
    const linePathD = coords.reduce((acc, c, i) => {
      return i === 0 ? `M ${c.x.toFixed(1)} ${c.y.toFixed(1)}` : `${acc} L ${c.x.toFixed(1)} ${c.y.toFixed(1)}`;
    }, "");

    // Construcción de polígono de área con gradiente
    const firstC = coords[0];
    const lastC = coords[coords.length - 1];
    const areaPathD = `${linePathD} L ${lastC.x.toFixed(1)} ${padT + plotH} L ${firstC.x.toFixed(1)} ${padT + plotH} Z`;

    // 4 Líneas guía horizontales en el eje Y
    const yTicks = [0, 0.33, 0.66, 1.0].map(ratio => {
      const yPos = padT + plotH - ratio * plotH;
      const tickVal = Math.round(ratio * maxVal);
      const label = isRevenue ? `$${(tickVal >= 1000 ? Math.round(tickVal / 1000) + 'k' : tickVal)}` : tickVal;
      return { yPos, label };
    });

    // Etiquetas en el eje X (mostramos hasta 7 etiquetas espaciadas)
    const step = Math.max(1, Math.floor(points.length / 6));
    const xLabels = coords.filter((_, i) => i % step === 0 || i === coords.length - 1);

    return `
      <svg class="analytics-svg" viewBox="0 0 ${svgW} ${svgH}" preserveAspectRatio="none">
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--accent-admin)" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="var(--accent-admin)" stop-opacity="0.0"/>
          </linearGradient>
        </defs>

        <!-- LÍNEAS GUÍA HORIZONTALES -->
        ${yTicks.map(t => `
          <line x1="${padL}" y1="${t.yPos}" x2="${svgW - padR}" y2="${t.yPos}" stroke="rgba(255, 255, 255, 0.07)" stroke-dasharray="3 3" />
          <text x="${padL - 10}" y="${t.yPos + 4}" fill="var(--text-muted)" font-size="10" font-family="var(--font-mono)" text-anchor="end">${t.label}</text>
        `).join('')}

        <!-- POLÍGONO DE ÁREA -->
        <path d="${areaPathD}" fill="url(#areaGradient)" />

        <!-- LÍNEA PRINCIPAL DEL GRÁFICO -->
        <path d="${linePathD}" fill="none" stroke="var(--accent-admin)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

        <!-- ETIQUETAS EJE X -->
        ${xLabels.map(c => `
          <text x="${c.x}" y="${svgH - 12}" fill="var(--text-muted)" font-size="10" font-family="var(--font-mono)" text-anchor="middle">${c.point.label}</text>
          <line x1="${c.x}" y1="${padT + plotH}" x2="${c.x}" y2="${padT + plotH + 5}" stroke="rgba(255, 255, 255, 0.15)" />
        `).join('')}

        <!-- PUNTOS INTERACTIVOS -->
        ${coords.map((c, idx) => `
          <circle 
            class="chart-dot" 
            cx="${c.x.toFixed(1)}" 
            cy="${c.y.toFixed(1)}" 
            r="4" 
            data-index="${idx}"
            data-date="${c.point.date}"
            data-label="${c.point.label}"
            data-revenue="${c.point.revenue_clp}"
            data-orders="${c.point.orders_count}"
            data-units="${c.point.units_count}"
          />
        `).join('')}

        <!-- LÍNEA VERTICAL GUÍA DE SEGUIMIENTO (OCULTA POR DEFECTO) -->
        <line id="chartGuideLine" x1="0" y1="${padT}" x2="0" y2="${padT + plotH}" stroke="var(--accent-white)" stroke-opacity="0.35" stroke-width="1.5" stroke-dasharray="2 2" style="display: none; pointer-events: none;" />
      </svg>
    `;
  }

  attachEvents() {
    // 1. Selector de Días (7, 14, 30)
    this.host.querySelectorAll('.analytics-pill-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const d = parseInt(e.currentTarget.dataset.days, 10);
        if (d && d !== this.days) {
          this.days = d;
          await this.loadData();
        }
      });
    });

    // 2. Selector de Métrica (Facturación vs Pedidos)
    this.host.querySelectorAll('.chart-toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const metric = e.currentTarget.dataset.metric;
        if (metric && metric !== this.metricMode) {
          this.metricMode = metric;
          this.render();
          this.attachEvents();
        }
      });
    });

    // 3. Interactividad Tooltip Flotante sobre la Curva
    const chartBox = this.host.querySelector('#timeseriesChartBox');
    const tooltip = this.host.querySelector('#chartFloatingTooltip');
    const guideLine = this.host.querySelector('#chartGuideLine');

    if (chartBox && tooltip) {
      const dots = chartBox.querySelectorAll('.chart-dot');

      dots.forEach(dot => {
        dot.addEventListener('mouseenter', (e) => {
          const d = e.currentTarget.dataset;
          const cx = parseFloat(e.currentTarget.getAttribute('cx'));
          const cy = parseFloat(e.currentTarget.getAttribute('cy'));

          const revFmt = parseInt(d.revenue, 10).toLocaleString('es-CL');
          const isRev = this.metricMode === "revenue";

          tooltip.innerHTML = `
            <div class="tooltip-date">${d.date} (${d.label})</div>
            <div class="tooltip-main ${isRev ? 'highlight' : ''}">
              <span>Facturación:</span> <strong>$${revFmt} CLP</strong>
            </div>
            <div class="tooltip-sub">
              <span>Pedidos:</span> <strong>${d.orders} un.</strong>
              <span style="margin: 0 4px">•</span>
              <span>Prendas:</span> <strong>${d.units} un.</strong>
            </div>
          `;

          tooltip.style.display = 'block';

          // Posicionar tooltip relativo al contenedor
          const boxRect = chartBox.getBoundingClientRect();
          const svgEl = chartBox.querySelector('.analytics-svg');
          if (svgEl) {
            const svgRect = svgEl.getBoundingClientRect();
            const scaleX = svgRect.width / 860;
            const scaleY = svgRect.height / 280;

            const pixelX = (cx * scaleX);
            const pixelY = (cy * scaleY);

            tooltip.style.left = `${Math.min(Math.max(pixelX, 80), boxRect.width - 120)}px`;
            tooltip.style.top = `${Math.max(pixelY - 70, 10)}px`;

            if (guideLine) {
              guideLine.setAttribute('x1', cx);
              guideLine.setAttribute('x2', cx);
              guideLine.style.display = 'block';
            }
          }
        });
      });

      chartBox.addEventListener('mouseleave', () => {
        if (tooltip) tooltip.style.display = 'none';
        if (guideLine) guideLine.style.display = 'none';
      });
    }

    // 4. Exportar Reporte a Archivo CSV
    const exportBtn = this.host.querySelector('#exportAnalyticsCsvBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportCsv());
    }
  }

  exportCsv() {
    if (!this.data) return;

    const d = this.data;
    let csvContent = "\uFEFF"; // UTF-8 BOM para soporte correcto de caracteres en Excel

    // Cabecera Resumen
    csvContent += `REPORTE ANALÍTICO SENKAI DTF ATELIER\n`;
    csvContent += `Rango Analizado,Últimos ${d.period_days} días\n`;
    csvContent += `Facturación Período,$${d.total_revenue_period} CLP\n`;
    csvContent += `Pedidos Período,${d.total_orders_period}\n`;
    csvContent += `Ticket Promedio (AOV),$${d.average_order_value_clp} CLP\n`;
    csvContent += `Prendas Producidas,${d.total_units_period}\n`;
    csvContent += `Retiro en Taller,${d.logistics.pickup_count} (${d.logistics.pickup_percentage}%)\n`;
    csvContent += `Despacho a Domicilio,${d.logistics.shipping_count} (${d.logistics.shipping_percentage}%)\n\n`;

    // Tabla Serie Temporal
    csvContent += `SERIE TEMPORAL DIARIA\n`;
    csvContent += `Fecha,Día,Facturación (CLP),Pedidos,Prendas\n`;
    d.timeseries.forEach(p => {
      csvContent += `${p.date},${p.label},${p.revenue_clp},${p.orders_count},${p.units_count}\n`;
    });
    csvContent += `\n`;

    // Tabla Prendas Bestsellers
    csvContent += `RANKING PRENDAS BASE\n`;
    csvContent += `ID Prenda,Nombre Prenda,Unidades Vendidas,Total Facturado (CLP),Participación (%)\n`;
    d.top_garments.forEach(g => {
      csvContent += `"${g.garment_id}","${g.garment_name}",${g.units_sold},${g.revenue_clp},${g.share_percentage}%\n`;
    });

    // Descarga vía Blob en navegador
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `senkai_analitica_${d.period_days}dias_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
