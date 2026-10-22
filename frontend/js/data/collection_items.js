// Catálogo estático de piezas de colección (Streetwear & Ediciones Especiales).
// Acá defino las piezas destacadas con sus siluetas base, artes preestablecidos
// para frente y espalda, coordenadas de prensado y gama de colores disponibles.

import { PRESET_ARTWORKS } from '../components/svg_templates.js?v=20261022_v1';

export const DEFAULT_CATALOG_CATEGORIES = [
  {
    id: "urbanas",
    label: "Poleras Oversized (240G)",
    subcategories: ["Drop Shoulder 240g", "Gráfica Cyberpunk", "Heavy Acid Wash"]
  },
  {
    id: "hoodies",
    label: "Polerones & Hoodies (320G)",
    subcategories: ["Hoodie Canguro 320g", "Crewneck 300g", "Fleece Térmico"]
  },
  {
    id: "minimalista",
    label: "Línea Regular (180G)",
    subcategories: ["Regular Fit 180g", "Esenciales Taller", "Monocromo"]
  },
  {
    id: "propios",
    label: "Colecciones de Taller",
    subcategories: ["Stealth Edition", "Series Limitadas", "Archivo Senkai"]
  }
];

export const COLLECTION_ITEMS = [
  {
    id: "col-polera-cyber-kanji",
    garmentId: "garment-polera-heavyweight-240",
    name: "Polera Oversized 'Cyber Kanji 2026'",
    price: 22990,
    badge: "240g Peinado • Heavyweight",
    category: "urbanas",
    subcategory: "Gráfica Cyberpunk",
    garmentType: "tshirt",
    colorHex: "#121212",
    currentView: "front",
    availableColors: [
      { name: "Negro", hex: "#121212" }
    ],
    frontArt: PRESET_ARTWORKS[1],
    backArt: PRESET_ARTWORKS[2],
    frontSpecs: { width: "85px", height: "85px", top: "35%", left: "36%" },
    backSpecs: { width: "190px", height: "190px", top: "42%", left: "50%" }
  },
  {
    id: "col-hoodie-mecha-unit",
    garmentId: "garment-poleron-hoodie-320",
    name: "Hoodie Canguro 'Mecha Unit Eva-01'",
    price: 34990,
    badge: "320g Afelpado • Heavyweight",
    category: "hoodies",
    subcategory: "Hoodie Canguro 320g",
    garmentType: "hoodie",
    colorHex: "#121212",
    currentView: "back",
    availableColors: [
      { name: "Negro", hex: "#121212" }
    ],
    frontArt: PRESET_ARTWORKS[0],
    backArt: PRESET_ARTWORKS[3],
    frontSpecs: { width: "110px", height: "110px", top: "40%", left: "50%" },
    backSpecs: { width: "200px", height: "200px", top: "44%", left: "50%" }
  },
  {
    id: "col-polera-acid-street",
    garmentId: "garment-polera-heavyweight-240",
    name: "Polera Heavy 'Acid Type Streetwear'",
    price: 21990,
    badge: "240g Peinado • Drop Shoulder",
    category: "urbanas",
    subcategory: "Drop Shoulder 240g",
    garmentType: "tshirt",
    colorHex: "#121212",
    currentView: "front",
    availableColors: [
      { name: "Negro", hex: "#121212" }
    ],
    frontArt: PRESET_ARTWORKS[4],
    backArt: PRESET_ARTWORKS[2],
    frontSpecs: { width: "150px", height: "100px", top: "38%", left: "50%" },
    backSpecs: { width: "180px", height: "180px", top: "42%", left: "50%" }
  },
  {
    id: "col-crewneck-tokyo-minimal",
    garmentId: "garment-poleron-crewneck-300",
    name: "Crewneck 'Tokyo Minimalist Studio'",
    price: 29990,
    badge: "300g Peinado • Cuello Redondo",
    category: "hoodies",
    subcategory: "Crewneck 300g",
    garmentType: "crewneck",
    colorHex: "#121212",
    currentView: "front",
    availableColors: [
      { name: "Negro", hex: "#121212" }
    ],
    frontArt: PRESET_ARTWORKS[1],
    backArt: PRESET_ARTWORKS[4],
    frontSpecs: { width: "80px", height: "80px", top: "34%", left: "36%" },
    backSpecs: { width: "170px", height: "115px", top: "40%", left: "50%" }
  },
  {
    id: "col-polera-classic-regular",
    garmentId: "garment-polera-classic-180",
    name: "Polera Clásica Regular 'Senkai Original'",
    price: 16990,
    badge: "180g Jersey • Regular Fit",
    category: "minimalista",
    subcategory: "Regular Fit 180g",
    garmentType: "tshirt",
    colorHex: "#121212",
    currentView: "front",
    availableColors: [
      { name: "Negro", hex: "#121212" }
    ],
    frontArt: PRESET_ARTWORKS[0],
    backArt: PRESET_ARTWORKS[1],
    frontSpecs: { width: "120px", height: "120px", top: "37%", left: "50%" },
    backSpecs: { width: "80px", height: "80px", top: "30%", left: "50%" }
  },
  {
    id: "col-hoodie-cyberpunk-stealth",
    garmentId: "garment-poleron-hoodie-320",
    name: "Hoodie Heavy 'Senkai Stealth Edition'",
    price: 35990,
    badge: "320g Afelpado • Edición Taller",
    category: "propios",
    subcategory: "Stealth Edition",
    garmentType: "hoodie",
    colorHex: "#121212",
    currentView: "back",
    availableColors: [
      { name: "Negro", hex: "#121212" }
    ],
    frontArt: PRESET_ARTWORKS[1],
    backArt: PRESET_ARTWORKS[2],
    frontSpecs: { width: "80px", height: "80px", top: "34%", left: "37%" },
    backSpecs: { width: "210px", height: "210px", top: "43%", left: "50%" }
  }
];

