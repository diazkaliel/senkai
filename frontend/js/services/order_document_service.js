// Servicio de Generación y Descarga de Documentos Oficiales de Taller (Senkai Studio).
// Genera fichas de trabajo, comprobantes de producción y órdenes oficiales en formato
// A4 descargables directamente como archivo HTML autosuficiente e imprimibles como PDF.

import { normalizeItemPrints } from './api.js?v=20261018_v3';

export function generateOrderHtmlDocument(order) {
  if (!order) return "";

  const items = order.items || [];
  const c = order.customer || {};
  const dateStr = order.created_at ? new Date(order.created_at).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) : "Fecha no registrada";

  const isPickup = c.delivery_method === "pickup";

  const statusLabels = {
    pendiente_pago: "PENDIENTE DE PAGO",
    cola_impresion_dtf: "1. COLA DE IMPRESIÓN DTF",
    en_planchado_curado: "2. PLANCHADO / TERMOFIJADO (160°C)",
    control_calidad: "3. CONTROL DE CALIDAD",
    listo_despacho: "4. LISTO PARA DESPACHO",
    entregado: "5. COMPLETADO Y ENTREGADO",
    cancelado: "CANCELADO"
  };

  const statusText = statusLabels[order.status] || (order.status || "").toUpperCase();

  const itemsRows = items.map((item, idx) => {
    const prints = normalizeItemPrints(item);
    const printsDesc = prints.length > 0
      ? prints.map(p => `<strong>${p.view === 'back' ? 'Espalda' : 'Frontal'}</strong> [${p.print_size}] — X:${Math.round(p.offset_x_pct)}% Y:${Math.round(p.offset_y_pct)}% (${p.design_name || 'Arte DTF'})`).join('<br>')
      : '<em>Prenda Lisa (Sin estampa)</em>';

    return `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e5e5; font-family: monospace; font-size: 13px;">${idx + 1}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e5e5;">
          <strong style="font-size: 14px; text-transform: uppercase;">${item.garment_name}</strong><br>
          <span style="font-size: 12px; color: #555;">Talla: <strong>${item.selected_size}</strong> • Color: <strong>${item.selected_color?.name || 'Negro'}</strong></span>
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e5e5; font-size: 12px;">
          ${printsDesc}
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e5e5; text-align: center; font-weight: bold; font-size: 14px;">${item.quantity}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e5e5; text-align: right; font-family: monospace; font-size: 13px;">$${(item.unit_price || 0).toLocaleString('es-CL')}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e5e5; text-align: right; font-family: monospace; font-weight: bold; font-size: 13px;">$${(item.subtotal || 0).toLocaleString('es-CL')}</td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Orden de Producción // ${order.order_number} // Senkai Studio</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 14mm 16mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #111111;
      background: #ffffff;
      padding: 24px;
      line-height: 1.45;
      font-size: 13px;
    }
    .sheet-wrapper {
      max-width: 800px;
      margin: 0 auto;
    }
    .header-table {
      width: 100%;
      border-bottom: 2px solid #000;
      padding-bottom: 14px;
      margin-bottom: 20px;
    }
    .brand-title {
      font-size: 22px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .brand-sub {
      font-size: 10px;
      letter-spacing: 0.16em;
      color: #555;
      text-transform: uppercase;
      margin-top: 2px;
    }
    .order-badge-box {
      text-align: right;
    }
    .order-num {
      font-family: monospace;
      font-size: 20px;
      font-weight: 900;
      letter-spacing: 0.05em;
    }
    .order-status {
      display: inline-block;
      margin-top: 4px;
      padding: 3px 8px;
      background: #000;
      color: #fff;
      font-size: 10px;
      font-family: monospace;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .dossier-grid {
      display: table;
      width: 100%;
      margin-bottom: 24px;
      border: 1px solid #ddd;
    }
    .dossier-col {
      display: table-cell;
      width: 50%;
      padding: 14px 16px;
      vertical-align: top;
    }
    .dossier-col:first-child {
      border-right: 1px solid #ddd;
    }
    .section-label {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #666;
      margin-bottom: 8px;
      border-bottom: 1px solid #eee;
      padding-bottom: 4px;
    }
    .client-field {
      margin-bottom: 5px;
      font-size: 12.5px;
    }
    .client-field strong {
      display: inline-block;
      width: 90px;
      color: #444;
      font-size: 11px;
      text-transform: uppercase;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .items-table th {
      background: #f4f4f4;
      border-top: 1px solid #000;
      border-bottom: 2px solid #000;
      padding: 8px 12px;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      text-align: left;
    }
    .totals-box {
      width: 280px;
      margin-left: auto;
      margin-bottom: 24px;
      border: 1px solid #000;
      padding: 12px 14px;
      background: #fafafa;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
      font-size: 12px;
    }
    .totals-total {
      display: flex;
      justify-content: space-between;
      border-top: 1px solid #000;
      margin-top: 8px;
      padding-top: 6px;
      font-size: 15px;
      font-weight: 900;
    }
    .thermal-box {
      border: 1px solid #222;
      background: #fafafa;
      padding: 14px;
      margin-bottom: 24px;
    }
    .thermal-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-top: 8px;
      text-align: center;
    }
    .thermal-card {
      background: #fff;
      border: 1px solid #ccc;
      padding: 8px;
    }
    .thermal-param {
      font-size: 9.5px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #666;
    }
    .thermal-val {
      font-size: 14px;
      font-weight: 800;
      font-family: monospace;
      margin-top: 3px;
    }
    .sign-table {
      width: 100%;
      margin-top: 30px;
      border-top: 1px dashed #999;
      padding-top: 16px;
    }
    .sign-table td {
      width: 25%;
      text-align: center;
      font-size: 11px;
      padding: 10px;
    }
    .sign-line {
      border-bottom: 1px solid #000;
      height: 35px;
      margin-bottom: 6px;
    }
    .footer-stamp {
      text-align: center;
      margin-top: 24px;
      font-size: 10px;
      color: #888;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
    .no-print-bar {
      background: #111;
      color: #fff;
      padding: 12px 20px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-radius: 4px;
    }
    .print-action-btn {
      background: #fff;
      color: #000;
      border: none;
      padding: 8px 16px;
      font-weight: bold;
      font-size: 12px;
      cursor: pointer;
      border-radius: 3px;
    }
    @media print {
      body { padding: 0; }
      .no-print-bar { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="sheet-wrapper">
    <div class="no-print-bar">
      <span><strong>Senkai Atelier</strong> // Vista de Impresión y Descarga de Orden</span>
      <button class="print-action-btn" onclick="window.print()">GUARDAR COMO PDF / IMPRIMIR</button>
    </div>

    <table class="header-table">
      <tr>
        <td>
          <div class="brand-title">SENKAI // ATELIER TEXTIL</div>
          <div class="brand-sub">DTF Studio • Confección y Termofijado Industrial • Providencia, Santiago</div>
          <div style="font-size: 11px; color: #555; margin-top: 6px;">Emisión: ${dateStr}</div>
        </td>
        <td class="order-badge-box">
          <div class="order-num">${order.order_number}</div>
          <div class="order-status">${statusText}</div>
          ${order.tracking_code ? `<div style="font-size: 11px; font-family: monospace; margin-top: 4px;">Seguimiento: <strong>${order.tracking_code}</strong></div>` : ''}
        </td>
      </tr>
    </table>

    <div class="dossier-grid">
      <div class="dossier-col">
        <div class="section-label">Datos del Cliente</div>
        <div class="client-field"><strong>Nombre:</strong> ${c.full_name || 'Sin especificar'}</div>
        <div class="client-field"><strong>Email:</strong> ${c.email || '—'}</div>
        <div class="client-field"><strong>Teléfono:</strong> ${c.phone || '—'}</div>
      </div>
      <div class="dossier-col">
        <div class="section-label">Método de Entrega</div>
        <div class="client-field">
          <strong>Modalidad:</strong> 
          <span style="font-weight: bold; background: #eee; padding: 2px 6px; font-size: 11px;">
            ${isPickup ? 'RETIRO EN TALLER PROVIDENCIA' : 'DESPACHO A DOMICILIO'}
          </span>
        </div>
        ${!isPickup ? `
          <div class="client-field"><strong>Dirección:</strong> ${c.shipping_address || '—'}</div>
          <div class="client-field"><strong>Ciudad/Comuna:</strong> ${c.shipping_city || 'Santiago'}</div>
        ` : `
          <div class="client-field" style="color: #666; font-size: 11.5px;">Listo para entrega en taller central una vez completado el control de calidad.</div>
        `}
        ${c.notes ? `
          <div class="client-field" style="margin-top: 6px; padding: 6px; background: #fff8e6; border: 1px solid #ffd591; font-size: 11.5px;">
            <strong>Nota Cliente:</strong> "${c.notes}"
          </div>
        ` : ''}
      </div>
    </div>

    <div class="section-label" style="font-size: 11px; margin-bottom: 8px;">Detalle de Prendas & Especificación DTF</div>
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 30px;">#</th>
          <th>Prenda / Silueta</th>
          <th>Especificación de Estampa DTF</th>
          <th style="width: 50px; text-align: center;">Cant.</th>
          <th style="width: 85px; text-align: right;">Unitario</th>
          <th style="width: 95px; text-align: right;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>

    <div class="totals-box">
      <div class="totals-row">
        <span>Subtotal Prendas & DTF:</span>
        <span style="font-family: monospace;">$${((order.total_amount || 0) - (order.shipping_cost || 0)).toLocaleString('es-CL')}</span>
      </div>
      <div class="totals-row">
        <span>Costo de Despacho:</span>
        <span style="font-family: monospace;">$${(order.shipping_cost || 0).toLocaleString('es-CL')}</span>
      </div>
      <div class="totals-total">
        <span>TOTAL ORDEN:</span>
        <span style="font-family: monospace;">$${(order.total_amount || 0).toLocaleString('es-CL')} CLP</span>
      </div>
    </div>

    <div class="thermal-box">
      <div class="section-label" style="border-bottom: none; margin-bottom: 4px;">Protocolo de Termofijado Industrial (Taller DTF)</div>
      <div class="thermal-grid">
        <div class="thermal-card">
          <div class="thermal-param">Temperatura</div>
          <div class="thermal-val">160 °C (320 °F)</div>
        </div>
        <div class="thermal-card">
          <div class="thermal-param">Tiempo Prensa</div>
          <div class="thermal-val">15 Segundos</div>
        </div>
        <div class="thermal-card">
          <div class="thermal-param">Presión Neumática</div>
          <div class="thermal-val">4.5 Bares</div>
        </div>
        <div class="thermal-card">
          <div class="thermal-param">Despegue Film</div>
          <div class="thermal-val">Cold Peel (Frío)</div>
        </div>
      </div>
      <div style="font-size: 10.5px; color: #555; margin-top: 8px; text-align: center;">
        * Curado final: aplicar reprensado de 5 segundos con teflón/siliconado tras retirar el film PET para fijación profunda.
      </div>
    </div>

    <table class="sign-table">
      <tr>
        <td>
          <div class="sign-line"></div>
          <strong>Operador RIP / Impresión</strong><br><span style="color: #777; font-size: 9.5px;">Calibración de color</span>
        </td>
        <td>
          <div class="sign-line"></div>
          <strong>Prensado Térmico</strong><br><span style="color: #777; font-size: 9.5px;">160°C / 15s</span>
        </td>
        <td>
          <div class="sign-line"></div>
          <strong>Control de Calidad</strong><br><span style="color: #777; font-size: 9.5px;">Sin fisuras / sangrado</span>
        </td>
        <td>
          <div class="sign-line"></div>
          <strong>Empaque & Despacho</strong><br><span style="color: #777; font-size: 9.5px;">Recepción / Courier</span>
        </td>
      </tr>
    </table>

    <div class="footer-stamp">
      Senkai Studio — All-Black Garment Manufacturing — Documento Oficial de Producción
    </div>
  </div>
</body>
</html>`;
}

// Descarga directa del archivo HTML y apertura instantánea del diálogo de impresión a PDF
export function downloadOrderDossier(order) {
  if (!order) return;

  const htmlContent = generateOrderHtmlDocument(order);
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const filename = `Orden_${order.order_number || 'SENKAI'}.html`;

  // 1. Descarga del archivo físico directamente al dispositivo
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // 2. Apertura de ventana limpia para Guardar como PDF / Imprimir
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    // Damos un breve tick para que carguen fuentes y estilos antes de llamar al print
    setTimeout(() => {
      try {
        printWindow.focus();
        printWindow.print();
      } catch (e) {
        console.warn("Print dialog closed or prevented by browser:", e);
      }
    }, 400);
  }
}
