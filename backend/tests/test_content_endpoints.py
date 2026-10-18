"""
Pruebas automatizadas para los endpoints del CMS y contenido dinámico de la tienda.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings
from app.services.content_service import DEFAULT_SECTIONS_CONTENT


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client
        # Restaurar valores canónicos de producción al finalizar la suite para no contaminar la DB local
        headers = {"X-Workshop-Token": settings.WORKSHOP_SECRET_KEY}
        for sec_key, def_payload in DEFAULT_SECTIONS_CONTENT.items():
            test_client.put(
                f"{settings.API_V1_PREFIX}/admin/content/{sec_key}",
                json=def_payload,
                headers=headers
            )


def test_get_public_content(client):
    """Verifica que la vitrina pública pueda leer el contenido consolidado."""
    res = client.get(f"{settings.API_V1_PREFIX}/content")
    assert res.status_code == 200
    data = res.json()
    assert "hero" in data
    assert "announcement" in data
    assert "stats" in data
    assert "statement" in data
    assert "editorial" in data
    assert "protocol" in data
    assert "contact" in data

    # Validar campos internos de Hero
    assert "headline" in data["hero"]
    assert "cta_text" in data["hero"]
    # Validar campos de Stats
    assert data["stats"]["dpi"] >= 150


def test_update_content_unauthorized(client):
    """Verifica que sin token de taller no se pueda actualizar ninguna sección."""
    payload = {
        "text": "Nuevo cintillo no autorizado",
        "is_active": True
    }
    res = client.put(f"{settings.API_V1_PREFIX}/admin/content/announcement", json=payload)
    assert res.status_code == 401


def test_update_announcement_authorized(client):
    """Verifica que con token de taller se actualice correctamente el anuncio."""
    headers = {"X-Workshop-Token": settings.WORKSHOP_SECRET_KEY}
    payload = {
        "text": "TALLER INDUSTRIAL ACTIVO // DESPACHO EN EL MISMO DÍA",
        "is_active": True
    }
    res = client.put(
        f"{settings.API_V1_PREFIX}/admin/content/announcement",
        json=payload,
        headers=headers
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["data"]["text"] == payload["text"]

    # Re-consultar el endpoint público para confirmar persistencia
    public_res = client.get(f"{settings.API_V1_PREFIX}/content")
    assert public_res.status_code == 200
    assert public_res.json()["announcement"]["text"] == payload["text"]


def test_update_content_invalid_section(client):
    """Verifica el manejo de error al intentar actualizar una sección que no existe."""
    headers = {"X-Workshop-Token": settings.WORKSHOP_SECRET_KEY}
    res = client.put(
        f"{settings.API_V1_PREFIX}/admin/content/seccion_inexistente",
        json={"algo": "invalido"},
        headers=headers
    )
    assert res.status_code == 404


def test_update_stats_validation_error(client):
    """Verifica que valores absurdos fuera de rango técnico sean rechazados con 422."""
    headers = {"X-Workshop-Token": settings.WORKSHOP_SECRET_KEY}
    # Temperatura de 900°C supera el rango físico de 120-220°C para poliamida DTF
    invalid_stats = {
        "dpi": 300,
        "min_order": 0,
        "wash_cycles": 50,
        "curing_temp": 900
    }
    res = client.put(
        f"{settings.API_V1_PREFIX}/admin/content/stats",
        json=invalid_stats,
        headers=headers
    )
    assert res.status_code == 422


def test_update_marquee_and_headers(client):
    """Verifica la actualización atómica del ticker Marquee y los encabezados de sección."""
    headers = {"X-Workshop-Token": settings.WORKSHOP_SECRET_KEY}
    
    # 1. Actualizar cinta Marquee
    marquee_payload = {
        "items": ["TEST DTF 2026", "EDICIÓN TALLER", "PRENSA 160C"],
        "is_active": True
    }
    res_m = client.put(
        f"{settings.API_V1_PREFIX}/admin/content/marquee",
        json=marquee_payload,
        headers=headers
    )
    assert res_m.status_code == 200
    assert res_m.json()["data"]["items"] == marquee_payload["items"]

    # 2. Actualizar encabezados de secciones
    headers_payload = {
        "catalog_tag": "NUEVAS COLECCIONES 2026",
        "catalog_title": "Streetwear Heavyweight Exclusivo",
        "catalog_desc": "Confección nacional y DTF de alta fidelidad.",
        "customizer_title": "Mesa de Personalización DTF",
        "customizer_desc": "Diseña en vivo y cotiza en segundos."
    }
    res_h = client.put(
        f"{settings.API_V1_PREFIX}/admin/content/headers",
        json=headers_payload,
        headers=headers
    )
    assert res_h.status_code == 200
    assert res_h.json()["data"]["catalog_title"] == headers_payload["catalog_title"]

    # 3. Comprobar que GET /content devuelve los datos actualizados
    res_pub = client.get(f"{settings.API_V1_PREFIX}/content")
    assert res_pub.status_code == 200
    pub_data = res_pub.json()
    assert pub_data["marquee"]["items"] == marquee_payload["items"]
    assert pub_data["headers"]["catalog_title"] == headers_payload["catalog_title"]


def test_update_hero_editorial_and_lookbook_with_images(client):
    """Verifica la edición de contenido multimedia, categorías, subcategorías e imágenes de catálogo (Lookbook)."""
    headers = {"X-Workshop-Token": settings.WORKSHOP_SECRET_KEY}

    # 1. Actualizar Hero con imágenes personalizadas y badge
    hero_payload = {
        "headline": "TEXTILES DE CALLE\nEDICIÓN LIMITADA",
        "subtitle": "Estampado de precisión con tintas DTF base agua y polímeros elásticos.",
        "cta_text": "ATELIER 2026",
        "cta_url": "#personalizador",
        "hero_main_image": "/static/assets/custom_hero_oversized.png",
        "hero_badge_text": "ALGODÓN 100% ORGÁNICO 260 GSM",
        "side_card_top_tag": "DROP SHOULDER 240G",
        "side_card_top_image": "/static/assets/custom_side_top.png",
        "side_card_bottom_tag": "CREWNECK 300G",
        "side_card_bottom_image": "/static/assets/custom_side_bottom.png"
    }
    res_h = client.put(
        f"{settings.API_V1_PREFIX}/admin/content/hero",
        json=hero_payload,
        headers=headers
    )
    assert res_h.status_code == 200
    assert res_h.json()["data"]["hero_main_image"] == hero_payload["hero_main_image"]
    assert res_h.json()["data"]["hero_badge_text"] == hero_payload["hero_badge_text"]

    # 2. Actualizar Editorial con imágenes de taller
    editorial_payload = {
        "mission_tag": "INGENIERÍA TEXTIL",
        "mission_title": "Matriz DTF HD",
        "mission_body": "Inyección microscópica de polímero con acabado ultra suave al tacto.",
        "mission_image": "/static/assets/custom_mission.png",
        "vision_tag": "LABORATORIO TÉCNICO",
        "vision_title": "Fijación 160°C",
        "vision_body": "Polimerización profunda garantizada para más de cincuenta lavados continuos.",
        "vision_image": "/static/assets/custom_vision.png"
    }
    res_e = client.put(
        f"{settings.API_V1_PREFIX}/admin/content/editorial",
        json=editorial_payload,
        headers=headers
    )
    assert res_e.status_code == 200
    assert res_e.json()["data"]["mission_image"] == editorial_payload["mission_image"]
    assert res_e.json()["data"]["vision_image"] == editorial_payload["vision_image"]

    # 3. Actualizar Lookbook (Catálogo de 6 piezas, categorías y subcategorías)
    lookbook_payload = {
        "categories": [
            {
                "id": "urbanas",
                "label": "Urbanas",
                "subcategories": ["Oversized 240g", "Boxy Fit", "Acid Wash"]
            },
            {
                "id": "outerwear",
                "label": "Outerwear Heavy",
                "subcategories": ["Bomber 350g", "Work Jacket"]
            }
        ],
        "items": [
            {
                "id": "col-polera-cyber-kanji",
                "name": "Polera Cyber Kanji Rediseñada",
                "badge": "260g Orgánico • Oversize",
                "category": "urbanas",
                "subcategory": "Oversized 240g",
                "price": 24990,
                "garment_id": "garment-polera-heavyweight-240",
                "photo_front": "/static/assets/catalog/kanji_front_v2.png",
                "photo_back": "/static/assets/catalog/kanji_back_v2.png"
            },
            {
                "id": "col-hoodie-mecha-unit",
                "name": "Hoodie Canguro 'Mecha Unit Eva-01'",
                "badge": "320g Afelpado • Heavyweight",
                "category": "outerwear",
                "subcategory": "Bomber 350g",
                "price": 34990,
                "garment_id": "garment-poleron-hoodie-320",
                "photo_front": "/static/assets/garments/hoodie_front.png",
                "photo_back": "/static/assets/garments/hoodie_back.png"
            },
            {
                "id": "col-polera-acid-street",
                "name": "Polera Heavy 'Acid Type Streetwear'",
                "badge": "240g Peinado • Drop Shoulder",
                "category": "urbanas",
                "subcategory": "Boxy Fit",
                "price": 21990,
                "garment_id": "garment-polera-heavyweight-240",
                "photo_front": "/static/assets/garments/tshirt_front.png",
                "photo_back": "/static/assets/garments/tshirt_back.png"
            },
            {
                "id": "col-crewneck-tokyo-minimal",
                "name": "Crewneck 'Tokyo Minimalist Studio'",
                "badge": "300g Peinado • Cuello Redondo",
                "category": "urbanas",
                "subcategory": "Acid Wash",
                "price": 29990,
                "garment_id": "garment-poleron-crewneck-300",
                "photo_front": "/static/assets/garments/crewneck_front.png",
                "photo_back": "/static/assets/garments/crewneck_back.png"
            },
            {
                "id": "col-polera-classic-regular",
                "name": "Polera Clásica Regular 'Senkai Original'",
                "badge": "180g Jersey • Regular Fit",
                "category": "urbanas",
                "subcategory": "Oversized 240g",
                "price": 16990,
                "garment_id": "garment-polera-classic-180",
                "photo_front": "/static/assets/garments/tshirt_front.png",
                "photo_back": "/static/assets/garments/tshirt_back.png"
            },
            {
                "id": "col-hoodie-cyberpunk-stealth",
                "name": "Hoodie Heavy 'Senkai Stealth Edition'",
                "badge": "320g Afelpado • Edición Taller",
                "category": "outerwear",
                "subcategory": "Work Jacket",
                "price": 35990,
                "garment_id": "garment-poleron-hoodie-320",
                "photo_front": "/static/assets/garments/hoodie_front.png",
                "photo_back": "/static/assets/garments/hoodie_back.png"
            }
        ]
    }
    res_l = client.put(
        f"{settings.API_V1_PREFIX}/admin/content/lookbook",
        json=lookbook_payload,
        headers=headers
    )
    assert res_l.status_code == 200
    assert len(res_l.json()["data"]["items"]) == 6
    assert len(res_l.json()["data"]["categories"]) == 2
    assert res_l.json()["data"]["items"][0]["subcategory"] == "Oversized 240g"

    # 4. Validar consolidado en GET /content
    res_pub = client.get(f"{settings.API_V1_PREFIX}/content")
    assert res_pub.status_code == 200
    pub_data = res_pub.json()
    assert pub_data["hero"]["hero_main_image"] == hero_payload["hero_main_image"]
    assert pub_data["editorial"]["mission_image"] == editorial_payload["mission_image"]
    assert len(pub_data["lookbook"]["items"]) == 6
    assert pub_data["lookbook"]["items"][0]["price"] == 24990
    assert pub_data["lookbook"]["categories"][1]["id"] == "outerwear"


def test_update_terms_and_conditions_section(client):
    """Verifica que la sección de Términos y Condiciones (protocol) soporte múltiples cláusulas y nota legal."""
    headers = {"X-Workshop-Token": settings.WORKSHOP_SECRET_KEY}
    terms_payload = {
        "section_tag": "NORMATIVA COMERCIAL // CONDICIONES DE SERVICIO",
        "section_title": "Términos y Condiciones del Taller",
        "section_desc": "Condiciones oficiales de confección bajo demanda y garantías.",
        "legal_footer": "Regido por la Ley N° 19.496 sobre Protección de los Derechos de los Consumidores.",
        "steps": [
            {
                "step_number": "01",
                "title": "01. Confección a Pedido",
                "description": "Producción personalizada según especificaciones técnicas del cliente.",
                "badge": "ARTE 300 DPI"
            },
            {
                "step_number": "02",
                "title": "02. Garantía de Curado",
                "description": "Termofijado industrial a 160°C resistente a más de 50 lavados.",
                "badge": "50+ LAVADOS"
            },
            {
                "step_number": "03",
                "title": "03. Despacho y Retiro",
                "description": "Producción en 24 a 48 horas hábiles desde confirmación.",
                "badge": "SLA 24-48H"
            },
            {
                "step_number": "04",
                "title": "04. Garantía Legal",
                "description": "Reposición sin costo ante fallas de fábrica o desprendimiento.",
                "badge": "LEY 19.496"
            }
        ]
    }
    res = client.put(
        f"{settings.API_V1_PREFIX}/admin/content/protocol",
        json=terms_payload,
        headers=headers
    )
    assert res.status_code == 200
    saved = res.json()["data"]
    assert saved["section_title"] == "Términos y Condiciones del Taller"
    assert saved["legal_footer"].startswith("Regido por la Ley")
    assert len(saved["steps"]) == 4

