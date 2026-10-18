// Portal de Administración y Taller de Senkai DTF Studio.
// Este archivo actúa como contenedor y router de las 4 herramientas del taller:
// 1. Tablero Kanban de producción (kanban_board.js)
// 2. Analítica y métricas de facturación (analytics_dashboard.js)
// 3. Editor editorial CMS (content_editor.js)
// 4. Gestor de catálogo y stock físico (inventory_manager.js)

import { apiService } from '../services/api.js';
import { KanbanBoardComponent } from './admin/kanban_board.js';
import { ContentEditorComponent } from './admin/content_editor.js';
import { AnalyticsDashboardComponent } from './admin/analytics_dashboard.js';
import { InventoryManagerComponent } from './admin/inventory_manager.js';
import { MockupModalComponent } from './admin/mockup_modal.js';

export class AdminWorkshopPortal {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.orders = [];
    this.metrics = null;
    this.garments = [];
    this.activeTab = "kanban"; // "kanban" | "analytics" | "cms" | "inventory"

    // Ficha CAD y visor de producción en modal
    this.mockupModal = new MockupModalComponent('adminMockupModal', 'adminMockupCard', {
      onStatusChanged: () => this.refreshData()
    });

    // Si el backend nos rebota con 401, borro el token y muestro la pantalla de login
    window.addEventListener('senkai:workshop-unauthorized', () => {
      apiService.setWorkshopToken('');
      this.renderAuthGate("La clave de taller no es válida o expiró. Ingrésala nuevamente.");
    });
  }

  async init() {
    await this.refreshData();
  }

  // Pido las órdenes, métricas y catálogo al backend
  async refreshData() {
    if (!apiService.hasWorkshopToken()) {
      this.renderAuthGate();
      return;
    }

    try {
      this.orders = await apiService.getOrders();
      this.metrics = await apiService.getWorkshopMetrics();
      this.garments = (await apiService.getGarments()) || [];
      this.render();
      this.attachEvents();
    } catch (err) {
      if (err.message === "UNAUTHORIZED") {
        this.renderAuthGate("Token de taller inválido o no autorizado. Revisa tus credenciales.");
        return;
      }
      console.error("Error al cargar datos del taller:", err);
    }
  }

  // Pantalla de bloqueo si no hay sesión activa en el taller
  renderAuthGate(errorMessage = "") {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="admin-portal container admin-auth-wrap" style="max-width: 460px; margin: 4rem auto; text-align: center;">
        <div class="surface-card-elevated" style="padding: 2.5rem 2rem; background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); box-shadow: var(--shadow-xl); border-radius: var(--radius-sm);">
          <div style="margin-bottom: 1rem;">
            <span class="material-symbols-outlined" style="font-size: 2.75rem; color: var(--accent-admin);">lock</span>
          </div>
          <h2 style="font-family: var(--font-display); font-size: 1.5rem; margin-bottom: 0.5rem; letter-spacing: -0.02em;">Acceso Restringido al Taller</h2>
          <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1.5rem;">
            Ingresa la clave de seguridad para acceder al tablero de producción y las métricas de Senkai.
          </p>

          ${errorMessage ? `
            <div style="background: rgba(239, 68, 68, 0.15); border: 1px solid var(--accent-primary); color: #fca5a5; padding: 0.75rem; font-size: 0.8rem; margin-bottom: 1.25rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
              <span class="material-symbols-outlined" style="font-size: 16px;">warning</span>
              <span>${errorMessage}</span>
            </div>
          ` : ''}

          <form id="workshopAuthForm" style="display: flex; flex-direction: column; gap: 1rem;">
            <input 
              type="password" 
              id="workshopTokenInput" 
              placeholder="Ingresa clave de taller..." 
              required
              autofocus
              style="padding: 0.85rem 1rem; border: 1px solid var(--border-subtle); background: var(--bg-surface-elevated); color: var(--text-primary); font-family: var(--font-mono); font-size: 0.9rem;"
            />
            <button type="submit" class="btn btn-primary" style="padding: 0.85rem; width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;">
              <span class="material-symbols-outlined" style="font-size: 18px;">key</span>
              <span>Desbloquear Taller</span>
            </button>
            <button type="button" id="authBackToStoreBtn" class="btn btn-secondary" style="padding: 0.65rem; width: 100%; font-size: 0.8rem; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;">
              <span class="material-symbols-outlined" style="font-size: 16px;">storefront</span>
              <span>Ir a la Tienda</span>
            </button>
          </form>
        </div>
      </div>
    `;

    const form = document.getElementById('workshopAuthForm');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const tokenInput = document.getElementById('workshopTokenInput');
        if (tokenInput) {
          apiService.setWorkshopToken(tokenInput.value.trim());
          await this.refreshData();
        }
      });
    }

    const backBtn = document.getElementById('authBackToStoreBtn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        window.location.hash = "#inicio";
      });
    }
  }

  // Estructura base del panel: Cabecera, Pestañas y Contenedor de la pestaña activa
  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="admin-portal container">
        <!-- Cabecera del panel de taller -->
        <div class="admin-header-row">
          <div class="admin-title-badge">
            <span class="badge badge-admin">ATELIER OPERATIVO // GESTIÓN DE PEDIDOS Y PRODUCCIÓN</span>
            <h2>Centro de Operaciones // DTF Studio</h2>
          </div>
          <div class="admin-header-actions">
            <button class="btn btn-secondary" id="logoutWorkshopBtn" title="Cerrar sesión de taller">
              <span class="material-symbols-outlined" style="font-size: 16px;">lock</span>
              <span>Salir</span>
            </button>
            <button class="btn btn-secondary" id="refreshWorkshopBtn" title="Recargar pedidos">
              <span class="material-symbols-outlined" style="font-size: 16px;">refresh</span>
              <span>Actualizar</span>
            </button>
            <button class="btn btn-primary" id="returnStorefrontBtn" title="Volver a la vitrina">
              <span class="material-symbols-outlined" style="font-size: 16px;">storefront</span>
              <span>Tienda Pública</span>
            </button>
          </div>
        </div>

        <!-- Pestañas de navegación -->
        <div class="admin-tabs-nav" role="tablist">
          <button class="admin-tab-btn ${this.activeTab === 'kanban' ? 'active' : ''}" data-tab="kanban" role="tab" aria-selected="${this.activeTab === 'kanban'}">
            <span class="material-symbols-outlined tab-icon">receipt_long</span>
            <span class="tab-text-full">Gestión de Pedidos</span>
            <span class="tab-text-short">Pedidos</span>
            <span class="tab-badge">${this.orders.length}</span>
          </button>
          <button class="admin-tab-btn ${this.activeTab === 'analytics' ? 'active' : ''}" data-tab="analytics" role="tab" aria-selected="${this.activeTab === 'analytics'}">
            <span class="material-symbols-outlined tab-icon">monitoring</span>
            <span class="tab-text-full">Analítica & Rendimiento</span>
            <span class="tab-text-short">Métricas</span>
          </button>
          <button class="admin-tab-btn ${this.activeTab === 'cms' ? 'active' : ''}" data-tab="cms" role="tab" aria-selected="${this.activeTab === 'cms'}">
            <span class="material-symbols-outlined tab-icon">edit_note</span>
            <span class="tab-text-full">Editor CMS</span>
            <span class="tab-text-short">CMS</span>
          </button>
          <button class="admin-tab-btn ${this.activeTab === 'inventory' ? 'active' : ''}" data-tab="inventory" role="tab" aria-selected="${this.activeTab === 'inventory'}">
            <span class="material-symbols-outlined tab-icon">inventory_2</span>
            <span class="tab-text-full">Bodega & Stock Físico</span>
            <span class="tab-text-short">Bodega</span>
          </button>
        </div>

        <!-- Host dinámico donde se monta el componente de la pestaña activa -->
        <div id="adminTabContentHost"></div>
      </div>
    `;

    this._mountActiveTab();
  }

  // Monto el componente correspondiente según la pestaña seleccionada
  _mountActiveTab() {
    const host = this.container.querySelector('#adminTabContentHost');
    if (!host) return;

    if (this.activeTab === 'kanban') {
      const kanban = new KanbanBoardComponent(host, {
        orders: this.orders,
        metrics: this.metrics,
        onOrderUpdated: () => this.refreshData(),
        onOpenMockup: (order) => this.mockupModal.open(order)
      });
      kanban.render();
    } else if (this.activeTab === 'analytics') {
      new AnalyticsDashboardComponent(host).init();
    } else if (this.activeTab === 'cms') {
      new ContentEditorComponent(host).init();
    } else if (this.activeTab === 'inventory') {
      new InventoryManagerComponent(host, this.garments).init();
    }
  }

  // Eventos globales del portal (cambio de tabs, logout, recarga y navegación)
  attachEvents() {
    const logoutBtn = this.container.querySelector('#logoutWorkshopBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        apiService.setWorkshopToken('');
        this.renderAuthGate();
      });
    }

    const refreshBtn = this.container.querySelector('#refreshWorkshopBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshData());
    }

    const returnBtn = this.container.querySelector('#returnStorefrontBtn');
    if (returnBtn) {
      returnBtn.addEventListener('click', () => {
        window.location.hash = "#inicio";
      });
    }

    this.container.querySelectorAll('.admin-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.dataset.tab;
        if (tab && tab !== this.activeTab) {
          this.activeTab = tab;
          this.render();
          this.attachEvents();
        }
      });
    });
  }
}
