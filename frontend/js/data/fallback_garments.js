// Catálogo base de respaldo.
// Si el backend está arrancando o la conexión a la API falla, levantamos la tienda
// con estas prendas por defecto para que la vitrina nunca quede vacía ni se rompa la UI.

export const FALLBACK_GARMENTS = [
  {
    id: "garment-polera-heavyweight-240",
    name: "Polera Heavyweight 240g Cuello Grueso",
    category: "polera_oversized",
    description: "Confeccionada en algodón peinado 240 GSM de alto gramaje con cuello rib acanalado de 3cm para máxima caída y presencia estructurada.",
    weight_gsm: 240,
    composition: "100% Algodón Peinado Ring-Spun",
    base_price: 18990,
    colors: [
      { name: "Negro", hex_code: "#121212", in_stock: true }
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    image_front_template: "/assets/templates/tshirt_front.svg",
    image_back_template: "/assets/templates/tshirt_back.svg",
    is_active: true
  },
  {
    id: "garment-polera-classic-180",
    name: "Polera Clásica Regular Fit 180g",
    category: "polera",
    description: "Algodón 180g/m² suave y transpirable. Costuras laterales reforzadas y tapacostura de hombro a hombro.",
    weight_gsm: 180,
    composition: "100% Algodón Jersey",
    base_price: 14990,
    colors: [
      { name: "Negro", hex_code: "#121212", in_stock: true }
    ],
    sizes: ["S", "M", "L", "XL"],
    image_front_template: "/assets/templates/tshirt_front.svg",
    image_back_template: "/assets/templates/tshirt_back.svg",
    is_active: true
  },
  {
    id: "garment-poleron-hoodie-320",
    name: "Polerón Canguro Hoodie Fleece 320g",
    category: "poleron_hoodie",
    description: "Algodón perchado pesado de 320 GSM con bolsillo canguro reforzado y cordón tubular al tono para una silueta relajada y abrigadora.",
    weight_gsm: 320,
    composition: "80% Algodón / 20% Poliéster",
    base_price: 24990,
    colors: [
      { name: "Negro", hex_code: "#121212", in_stock: true }
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    image_front_template: "/assets/templates/hoodie_front.svg",
    image_back_template: "/assets/templates/hoodie_back.svg",
    is_active: true
  },
  {
    id: "garment-poleron-crewneck-300",
    name: "Polerón Crewneck Cuello Redondo 300g",
    category: "poleron_crewneck",
    description: "Corte minimalista sin capucha con puños y pretina en rib 1x1 con elastano para máxima durabilidad.",
    weight_gsm: 300,
    composition: "80% Algodón / 20% Poliéster",
    base_price: 21990,
    colors: [
      { name: "Negro", hex_code: "#121212", in_stock: true }
    ],
    sizes: ["S", "M", "L", "XL"],
    image_front_template: "/assets/templates/crewneck_front.svg",
    image_back_template: "/assets/templates/crewneck_back.svg",
    is_active: true
  }
];
