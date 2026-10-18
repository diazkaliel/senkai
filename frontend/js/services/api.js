// Cliente API para comunicar el frontend con el backend FastAPI (/api/v1).
// Guardo el token de taller en sessionStorage y localStorage para que persista al refrescar.

const API_BASE = "/api/v1";

let workshopToken = sessionStorage.getItem("senkai_workshop_token") || 
                    localStorage.getItem("senkai_workshop_token") || "";

export const apiService = {
  // Autenticación y credenciales de taller
  setWorkshopToken(token) {
    workshopToken = token ? token.trim() : "";
    if (workshopToken) {
      sessionStorage.setItem("senkai_workshop_token", workshopToken);
      localStorage.setItem("senkai_workshop_token", workshopToken);
    } else {
      sessionStorage.removeItem("senkai_workshop_token");
      localStorage.removeItem("senkai_workshop_token");
    }
  },

  getWorkshopToken() {
    if (!workshopToken) {
      workshopToken = sessionStorage.getItem("senkai_workshop_token") || 
                      localStorage.getItem("senkai_workshop_token") || "";
    }
    return workshopToken;
  },

  hasWorkshopToken() {
    return Boolean(this.getWorkshopToken());
  },

  _getAuthHeaders() {
    const token = this.getWorkshopToken();
    return token ? { "X-Workshop-Token": token } : {};
  },

  // Catálogo de Prendas
  async getGarments() {
    try {
      const res = await fetch(`${API_BASE}/garments/`);
      if (!res.ok) throw new Error("Error al obtener catálogo de prendas");
      return await res.json();
    } catch (err) {
      console.warn("FastAPI fallback: Usando catálogo local", err);
      return null;
    }
  },

  async getGarment(id) {
    const res = await fetch(`${API_BASE}/garments/${id}`);
    if (!res.ok) throw new Error("Prenda no encontrada");
    return await res.json();
  },

  // Cotizador DTF
  async getDTFQuote(position, printSize, quantity = 1) {
    const params = new URLSearchParams({
      position: position,
      print_size: printSize,
      quantity: quantity.toString()
    });
    const res = await fetch(`${API_BASE}/customizer/quote?${params.toString()}`);
    if (!res.ok) throw new Error("Error al cotizar DTF");
    return await res.json();
  },

  async getMultiDTFQuote(prints, quantity = 1) {
    const res = await fetch(`${API_BASE}/customizer/quote-multi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prints, quantity })
    });
    if (!res.ok) throw new Error("Error al cotizar multi-estampa DTF");
    return await res.json();
  },

  // Carga binaria de arte gráfico para el personalizador DTF
  async uploadDTFDesign(file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/customizer/upload`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Error al subir diseño DTF al servidor");
    }
    return await res.json();
  },

  // Pedidos
  async createOrder(orderPayload) {
    const res = await fetch(`${API_BASE}/orders/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload)
    });
    if (!res.ok) throw new Error("Error al procesar el pedido");
    return await res.json();
  },

  async getOrders(statusFilter = null) {
    const url = statusFilter 
      ? `${API_BASE}/orders/?status=${statusFilter}` 
      : `${API_BASE}/orders/`;
    const res = await fetch(url, {
      headers: this._getAuthHeaders()
    });
    if (!res.ok) {
      if (res.status === 401) throw new Error("UNAUTHORIZED");
      throw new Error("Error al obtener pedidos");
    }
    return await res.json();
  },

  async getOrderByNumber(orderNumber) {
    const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(orderNumber)}`);
    if (!res.ok) throw new Error("Pedido no encontrado");
    return await res.json();
  },

  // Admin / Taller
  async getWorkshopMetrics() {
    const res = await fetch(`${API_BASE}/admin/metrics`, {
      headers: this._getAuthHeaders()
    });
    if (!res.ok) {
      if (res.status === 401) throw new Error("UNAUTHORIZED");
      throw new Error("Error al obtener métricas de taller");
    }
    return await res.json();
  },

  async getWorkshopAnalytics(days = 30) {
    const res = await fetch(`${API_BASE}/admin/analytics?days=${days}`, {
      headers: this._getAuthHeaders()
    });
    if (!res.ok) {
      if (res.status === 401) throw new Error("UNAUTHORIZED");
      throw new Error("Error al obtener analítica de taller");
    }
    return await res.json();
  },

  async updateOrderStatus(orderId, newStatus, trackingCode = null) {
    const res = await fetch(`${API_BASE}/admin/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { 
        "Content-Type": "application/json",
        ...this._getAuthHeaders()
      },
      body: JSON.stringify({
        status: newStatus,
        tracking_code: trackingCode
      })
    });
    if (!res.ok) {
      if (res.status === 401) throw new Error("UNAUTHORIZED");
      throw new Error("Error al actualizar estado del pedido");
    }
    return await res.json();
  },

  // =========================================================================
  // GESTIÓN DE CONTENIDO CMS & VITRINA PÚBLICA
  // =========================================================================
  async getSiteContent() {
    try {
      const res = await fetch(`${API_BASE}/content`);
      if (!res.ok) throw new Error("Error al obtener contenido de la tienda");
      return await res.json();
    } catch (err) {
      console.warn("Fallo al consultar CMS; operando con contenido estático:", err);
      return null;
    }
  },

  async updateSiteSection(sectionKey, payload) {
    const res = await fetch(`${API_BASE}/admin/content/${encodeURIComponent(sectionKey)}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...this._getAuthHeaders()
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      if (res.status === 401) throw new Error("UNAUTHORIZED");
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.detail || "Error al actualizar la sección editorial");
    }
    return await res.json();
  },

  async updateGarment(garmentId, payload) {
    const res = await fetch(`${API_BASE}/admin/garments/${encodeURIComponent(garmentId)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...this._getAuthHeaders()
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      if (res.status === 401) throw new Error("UNAUTHORIZED");
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.detail || "Error al actualizar la prenda del catálogo");
    }
    return await res.json();
  },

  // Inventario Físico de Variantes (Talla x Color)
  async getGarmentVariants(garmentId) {
    const res = await fetch(`${API_BASE}/admin/garments/${encodeURIComponent(garmentId)}/variants`, {
      headers: this._getAuthHeaders()
    });
    if (!res.ok) {
      if (res.status === 401) throw new Error("UNAUTHORIZED");
      throw new Error("Error al consultar variantes de inventario");
    }
    return await res.json();
  },

  async updateVariantStock(garmentId, variantId, stockQuantity, isActive = true, options = {}) {
    const bodyPayload = {
      is_active: isActive
    };
    if (stockQuantity !== undefined && stockQuantity !== null) {
      bodyPayload.stock_quantity = stockQuantity;
    }
    if (options.customPrice !== undefined) {
      bodyPayload.custom_price = options.customPrice;
    }
    if (options.clearCustomPrice !== undefined) {
      bodyPayload.clear_custom_price = options.clearCustomPrice;
    }
    const res = await fetch(`${API_BASE}/admin/garments/${encodeURIComponent(garmentId)}/variants/${encodeURIComponent(variantId)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...this._getAuthHeaders()
      },
      body: JSON.stringify(bodyPayload)
    });
    if (!res.ok) {
      if (res.status === 401) throw new Error("UNAUTHORIZED");
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.detail || "Error al actualizar existencias de la variante");
    }
    return await res.json();
  },

  async uploadAdminImage(file) {
    const formData = new FormData();
    formData.append("file", file);

    const headers = this._getAuthHeaders(); // Fetch configura automáticamente multipart boundary al omitir Content-Type

    const res = await fetch(`${API_BASE}/admin/upload-image`, {
      method: "POST",
      headers,
      body: formData
    });

    if (!res.ok) {
      if (res.status === 401) throw new Error("UNAUTHORIZED");
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.detail || "Error al subir la imagen al servidor");
    }
    return await res.json();
  }
};

/**
 * Normaliza configuraciones de estampas DTF para pedidos legacy o multi-estampa.
 * Reutilizado transversalmente por el tablero Kanban y el modal de ficha técnica CAD.
 */
export function normalizeItemPrints(item) {
  if (item.prints && item.prints.length > 0) {
    return item.prints;
  }
  if (item.dtf_config) {
    if (item.dtf_config.position === 'pecho_y_espalda') {
      return [
        {
          id: "legacy-print-front",
          view: "front",
          print_size: "A6",
          design_name: "Insignia Senkai (Pecho)",
          design_image_url: item.dtf_config.design_image_url || null,
          offset_x_pct: 35.0,
          offset_y_pct: 32.0,
          scale_factor: 0.85,
          calculated_dtf_cost: 2500
        },
        {
          id: "legacy-print-back",
          view: "back",
          print_size: item.dtf_config.print_size || "A3",
          design_name: "Estampa Trasera Maxi",
          design_image_url: item.dtf_config.design_image_url || null,
          offset_x_pct: 50.0,
          offset_y_pct: 42.0,
          scale_factor: 1.0,
          calculated_dtf_cost: 8900
        }
      ];
    }
    const isBack = item.dtf_config.position === 'espalda_completa';
    return [{
      id: "legacy-print",
      view: isBack ? "back" : "front",
      print_size: item.dtf_config.print_size || "A4",
      design_name: item.dtf_config.design_name || "Estampa DTF",
      design_image_url: item.dtf_config.design_image_url || null,
      offset_x_pct: item.dtf_config.offset_x_pct ?? 50.0,
      offset_y_pct: item.dtf_config.offset_y_pct ?? 40.0,
      scale_factor: item.dtf_config.scale_factor ?? 1.0,
      calculated_dtf_cost: item.dtf_config.calculated_dtf_cost || 5900
    }];
  }
  return [];
}

