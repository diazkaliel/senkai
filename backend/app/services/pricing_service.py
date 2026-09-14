"""
Motor de cotización industrial DTF y cálculo de consumo de insumos.
Contiene funciones puras sin dependencias de I/O, garantizando alta velocidad
y cobertura de pruebas unitarias exhaustiva.
"""

import uuid
from typing import List, Dict, Any

from app.core.config import settings
from app.schemas.domain import (
    DTFPrintPosition, DTFPrintSize, DTFPrintItem
)

# Factores de consumo de film DTF (bobina 60cm) por formato estandarizado
LINEAR_METERS_BY_SIZE: Dict[str, float] = {
    DTFPrintSize.A3.value: 0.40,
    DTFPrintSize.A4.value: 0.30,
    DTFPrintSize.A5.value: 0.20,
    DTFPrintSize.A6.value: 0.15,
    DTFPrintSize.CUSTOM.value: 0.30,
}


class PricingService:
    """Calculador de tarifas y consumo de película DTF de confección."""

    @staticmethod
    def get_volume_discount_percentage(quantity: int) -> int:
        """
        Escala autoritativa de descuentos por lote de producción:
        - 20+ unidades: 25% descuento
        - 10-19 unidades: 15% descuento
        - 5-9 unidades: 10% descuento
        - 1-4 unidades: 0% descuento
        """
        if quantity >= 20:
            return 25
        if quantity >= 10:
            return 15
        if quantity >= 5:
            return 10
        return 0

    def calculate_single_print_price(
        self,
        position: DTFPrintPosition,
        print_size: DTFPrintSize,
        quantity: int = 1
    ) -> Dict[str, Any]:
        """Calcula el costo para un transfer simple o combinado (pecho + espalda)."""
        if position == DTFPrintPosition.CHEST_AND_BACK:
            base_dtf = settings.DTF_PRINT_PRICING.get("DOUBLE_A4_A6", 7900)
        else:
            base_dtf = settings.DTF_PRINT_PRICING.get(print_size.value, 5900)

        discount_pct = self.get_volume_discount_percentage(quantity)
        unit_cost = int(base_dtf * (1 - discount_pct / 100))
        total_dtf = unit_cost * quantity

        return {
            "position": position,
            "print_size": print_size,
            "unit_dtf_price": unit_cost,
            "discount_percentage": discount_pct,
            "total_dtf_cost": total_dtf,
            "heat_press_specs": {
                "temperature_c": settings.DTF_HEAT_PRESS_TEMP_C,
                "seconds": settings.DTF_HEAT_PRESS_SECONDS,
                "peel": settings.DTF_PEEL_TYPE
            }
        }

    def calculate_multi_prints_price(
        self,
        prints: List[DTFPrintItem],
        quantity: int = 1
    ) -> Dict[str, Any]:
        """
        Calcula el valor de prendas con N estampas simultáneas (pecho, espalda, mangas).
        Aplica el descuento por volumen del lote a cada transfer individual.
        """
        discount_pct = self.get_volume_discount_percentage(quantity)
        verified_prints: List[DTFPrintItem] = []
        unit_dtf_total = 0
        total_meters_per_unit = 0.0

        for p in prints:
            size_val = p.print_size.value if hasattr(p.print_size, "value") else str(p.print_size)
            base_cost = settings.DTF_PRINT_PRICING.get(size_val, 5900)
            unit_cost = int(base_cost * (1 - discount_pct / 100))
            unit_dtf_total += unit_cost

            # Estimación de film según formato
            total_meters_per_unit += LINEAR_METERS_BY_SIZE.get(size_val, 0.15)

            p_copy = p.model_copy()
            p_copy.calculated_dtf_cost = unit_cost
            if not p_copy.id:
                p_copy.id = f"prn-{uuid.uuid4().hex[:6]}"
            verified_prints.append(p_copy)

        total_cost = unit_dtf_total * quantity

        return {
            "prints": verified_prints,
            "quantity": quantity,
            "unit_dtf_total": unit_dtf_total,
            "discount_percentage": discount_pct,
            "total_dtf_cost": total_cost,
            "linear_meters_estimated": round(total_meters_per_unit * quantity, 2),
            "heat_press_specs": {
                "temperature_c": settings.DTF_HEAT_PRESS_TEMP_C,
                "seconds": settings.DTF_HEAT_PRESS_SECONDS,
                "peel": settings.DTF_PEEL_TYPE
            }
        }

    def estimate_consumed_film_meters(self, items_payload: List[Dict[str, Any]]) -> float:
        """Calcula el consumo total en metros lineales de film DTF para una lista de ítems."""
        meters = 0.0
        for item in items_payload:
            qty = item.get("quantity", 1)
            prints_list = item.get("prints", [])
            if prints_list:
                for prn in prints_list:
                    size = prn.get("print_size")
                    size_key = size.value if hasattr(size, "value") else str(size)
                    meters += LINEAR_METERS_BY_SIZE.get(size_key, 0.15) * qty
            elif item.get("dtf_config"):
                size = item["dtf_config"].get("print_size")
                size_key = size.value if hasattr(size, "value") else str(size)
                meters += LINEAR_METERS_BY_SIZE.get(size_key, 0.15) * qty
        return round(meters, 2)


pricing_service = PricingService()
