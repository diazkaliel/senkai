/**
 * SEIKO // DTF TEXTILE STUDIO - API CLIENT SERVICE
 * Conector asíncrono con el backend FastAPI (/api/v1)
 * Gestión segura de tokens de taller mediante sessionStorage sin secretos en código fuente.
 */

const API_BASE = "/api/v1";

let workshopToken = sessionStorage.getItem("senkai_workshop_token") || "";

export const apiService = {
  // Autenticación y credenciales de taller
  setWorkshopToken(token) {
    workshopToken = token ? token.trim() : "";
    if (workshopToken) {
      sessionStorage.setItem("senkai_workshop_token", workshopToken);
    } else {
      sessionStorage.removeItem("senkai_workshop_token");
    }
  },

  getWorkshopToken() {
    return workshopToken;
  },

  hasWorkshopToken() {
    return Boolean(workshopToken);
  },

  _getAuthHeaders() {
    return workshopToken ? { "X-Workshop-Token": workshopToken } : {};
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
  }
};

