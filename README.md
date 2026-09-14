# SENKAI // Estudio Textil DTF

Plataforma e-commerce y estudio de personalización textil industrial especializado en técnica **DTF (Direct to Film)** para poleras heavyweight, hoodies y crewnecks de alta gama.

---

## ⚡ Características Principales

- **Personalizador DTF Interactivo en Tiempo Real**:
  - Renderizado SVG dinámico con simulación de texturas textiles.
  - Vistas frontal y trasera con ajuste de posición porcentual y escala.
  - Carga de archivos de diseño con soporte para PNG transparente, SVG y PDF vectorial.
  - Cotizador en vivo según área de impresión (A6, A5, A4, A3) y descuentos por volumen.
- **Catálogo Textil de Alta Gama**:
  - Prendas base de alto gramaje (180g regular, 240g oversized, 300g crewneck y 320g hoodie fleece).
  - Variantes de color y tallas con verificación de stock.
- **Panel Administrativo & Tablero Kanban de Taller**:
  - Monitoreo de pedidos en flujo productivo: Cola de Impresión RIP, Termofijado (160°C / 15s), Control de Calidad y Despacho.
  - Métricas de consumo de insumos (cálculo de metros lineales de film DTF de 60cm) y facturación acumulada.
- **Carrito & Checkout Integrado**:
  - Métodos de retiro en taller y despacho a domicilio.
  - Trazabilidad con números de seguimiento de pedidos.

---

## 🛠️ Stack Tecnológico

- **Backend**: Python 3.12+, [FastAPI](https://fastapi.tiangolo.com/), [Pydantic v2](https://docs.pydantic.dev/), [Uvicorn](https://www.uvicorn.org/).
- **Frontend**: Single Page Application (SPA) nativa en Vanilla JavaScript (ES Modules) y CSS Glassmorphic modular de alto rendimiento sin sobrecarga de frameworks.
- **API Documentation**: Swagger UI OpenAPI v3 disponible en `/api/v1/docs`.

---

## 🚀 Inicio Rápido (Desarrollo Local)

### 1. Requisitos Previos
- Python 3.10 o superior instalado.
- Git instalado.

### 2. Instalación de Dependencias
```bash
# Clonar repositorio
git clone https://github.com/diazkaliel/senkai.git
cd senkai

# Crear entorno virtual
python -m venv venv

# Activar entorno virtual
# En Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# En Windows (CMD):
.\venv\Scripts\activate.bat
# En Linux/macOS:
source venv/bin/activate

# Instalar dependencias bloqueadas
pip install -r requirements.txt
```

### 3. Configuración de Entorno
Copia el archivo de ejemplo para configurar tus variables locales:
```bash
cp .env.example .env
```

### 4. Ejecutar Servidor
En Windows puedes simplemente hacer doble clic en `iniciar.bat` o ejecutar:
```bash
uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```

- **Tienda y Personalizador**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Panel de Taller**: [http://127.0.0.1:8000/#admin](http://127.0.0.1:8000/#admin)
- **Documentación API Swagger**: [http://127.0.0.1:8000/api/v1/docs](http://127.0.0.1:8000/api/v1/docs)

---

## 🧪 Pruebas Automatizadas
Para ejecutar la suite de integración de endpoints (sin requerir servidor activo):
```bash
pytest backend/tests/test_endpoints.py -v
```

---

## 📁 Estructura del Repositorio

```text
senkai/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # Endpoints REST (garments, customizer, orders, admin)
│   │   ├── core/            # Configuración dinámica con pydantic-settings
│   │   ├── db/              # Persistencia relacional SQLite con SQLAlchemy 2.0
│   │   ├── schemas/         # Contratos Pydantic v2 autoritativos
│   │   ├── services/        # Lógica de cotización DTF, catálogo y pedidos
│   │   └── main.py          # FastAPI application & SPA static server
│   └── tests/               # Pruebas automatizadas con Pytest & TestClient

├── frontend/
│   ├── assets/              # Gráficos, templates SVG y recursos multimedia
│   ├── css/                 # Hojas de estilo modulares (glassmorphism, tokens)
│   ├── js/
│   │   ├── components/      # Componentes UI (customizer, cart, catalog, admin)
│   │   ├── services/        # Cliente API asíncrono
│   │   └── app.js           # Orquestador y enrutador SPA
│   └── index.html           # Punto de entrada de la aplicación
├── requirements.txt         # Dependencias Python bloqueadas
├── .env.example             # Plantilla de variables de entorno
├── .gitignore               # Exclusiones de Git
└── README.md                # Documentación del proyecto
```

---

## 📄 Licencia
Privado / Propietario — Senkai DTF Studio.
