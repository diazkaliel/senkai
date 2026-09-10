/**
 * SENKAI // ESTUDIO TEXTIL DTF
 * MOTOR DE MOCKUPS FOTOGRÁFICOS MULTICAPA (GHOST MANNEQUIN STUDIO) — V5 ULTRA REALISTA
 *
 * Pipeline de renderizado fotográfico de 4 capas:
 * 1. Sombra de piso de estudio fotográfico.
 * 2. Capa base de tinte cromático textil dinámico (con máscara alfa fotográfica).
 * 3. Capa de sombras, arrugas y textura de algodón 240g/380g en modo Multiply.
 * 4. Capa de brillo especular y softbox de estudio en modo Screen.
 */

export const GARMENT_ASSET_MAP = {
  tshirt_front: "/static/assets/garments/tshirt_front.png",
  tshirt_back: "/static/assets/garments/tshirt_back.png",
  hoodie_front: "/static/assets/garments/hoodie_front.png",
  hoodie_back: "/static/assets/garments/hoodie_back.png",
  crewneck_front: "/static/assets/garments/crewneck_front.png",
  crewneck_back: "/static/assets/garments/crewneck_back.png"
};

/**
 * Genera el markup HTML multicapa fotográfico para el simulador y catálogo.
 */
export function renderPhotorealisticMockup(key, colorHex = "#121212") {
  const imgSrc = GARMENT_ASSET_MAP[key] || GARMENT_ASSET_MAP.tshirt_front;

  return `
    <div class="photorealistic-garment-stage" data-garment="${key}">
      <!-- Sombra ambiental en el suelo del estudio -->
      <div class="garment-floor-shadow"></div>

      <!-- Capa 1: Tinte de color textil dinámico con máscara de silueta -->
      <div class="garment-color-base" style="background-color: ${colorHex}; -webkit-mask-image: url('${imgSrc}'); mask-image: url('${imgSrc}');"></div>

      <!-- Capa 2: Textura, costuras, caída y sombras fotográficas reales (Multiply) -->
      <img src="${imgSrc}" alt="Mockup ${key}" class="garment-photo-layer garment-multiply" loading="eager" draggable="false">

      <!-- Capa 3: Luces suaves de estudio, hombro caído y relieve (Screen) -->
      <img src="${imgSrc}" alt="Mockup ${key} Highlights" class="garment-photo-layer garment-screen" loading="eager" draggable="false">
    </div>
  `;
}

export const SVG_GARMENTS = {
  tshirt_front: (colorHex = "#121212") => renderPhotorealisticMockup("tshirt_front", colorHex),
  tshirt_back: (colorHex = "#121212") => renderPhotorealisticMockup("tshirt_back", colorHex),
  hoodie_front: (colorHex = "#121212") => renderPhotorealisticMockup("hoodie_front", colorHex),
  hoodie_back: (colorHex = "#121212") => renderPhotorealisticMockup("hoodie_back", colorHex),
  crewneck_front: (colorHex = "#121212") => renderPhotorealisticMockup("crewneck_front", colorHex),
  crewneck_back: (colorHex = "#121212") => renderPhotorealisticMockup("crewneck_back", colorHex),
};

// =========================================================================
// MINIATURAS VECTORIALES COMPACTAS PARA SELECTOR DE PRENDA
// =========================================================================
export const SVG_GARMENT_THUMBS = {
  tshirt: (colorHex = "#94a3b8") => `
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="th-ts-light" x1="14" y1="14" x2="66" y2="66">
          <stop offset="0%"  stop-color="#ffffff" stop-opacity="0.28"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0.38"/>
        </linearGradient>
      </defs>
      <path d="M26 18 L10 26 C8 27 9 34 11 38 L19 35 L19 65 L61 65 L61 35 L69 38 C71 34 72 27 70 26 L54 18 C48 22 32 22 26 18 Z"
            fill="${colorHex}" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M26 18 L10 26 C8 27 9 34 11 38 L19 35 L19 65 L61 65 L61 35 L69 38 C71 34 72 27 70 26 L54 18 C48 22 32 22 26 18 Z"
            fill="url(#th-ts-light)"/>
      <path d="M26 18 C32 23 48 23 54 18 C48 22 32 22 26 18 Z"
            fill="rgba(0,0,0,0.22)" stroke="rgba(255,255,255,0.38)" stroke-width="1"/>
      <path d="M27 18 L19 35" stroke="rgba(0,0,0,0.35)" stroke-width="1" stroke-dasharray="2 1.5"/>
      <path d="M53 18 L61 35" stroke="rgba(0,0,0,0.35)" stroke-width="1" stroke-dasharray="2 1.5"/>
    </svg>
  `,
  hoodie: (colorHex = "#94a3b8") => `
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="th-hd-light" x1="12" y1="12" x2="68" y2="68">
          <stop offset="0%"  stop-color="#ffffff" stop-opacity="0.28"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0.42"/>
        </linearGradient>
        <radialGradient id="th-hd-hood" cx="40%" cy="22%" r="60%">
          <stop offset="0%"  stop-color="#ffffff" stop-opacity="0.22"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0.38"/>
        </radialGradient>
      </defs>
      <path d="M27 20 L14 30 L6 46 C4 50 10 52 13 49 L20 38 L19 66 L61 66 L60 38 L67 49 C70 52 76 50 74 46 L66 30 L53 20 Z"
            fill="${colorHex}" stroke="rgba(255,255,255,0.28)" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M27 20 L14 30 L6 46 C4 50 10 52 13 49 L20 38 L19 66 L61 66 L60 38 L67 49 C70 52 76 50 74 46 L66 30 L53 20 Z"
            fill="url(#th-hd-light)"/>
      <path d="M27 20 C23 8 57 8 53 20 C48 30 32 30 27 20 Z"
            fill="${colorHex}" stroke="rgba(255,255,255,0.38)" stroke-width="1.2"/>
      <path d="M27 20 C23 8 57 8 53 20 C48 30 32 30 27 20 Z"
            fill="url(#th-hd-hood)"/>
      <path d="M36 24 Q35 34 34 40" stroke="rgba(255,255,255,0.88)" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M44 24 Q45 34 46 40" stroke="rgba(255,255,255,0.88)" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M25 52 L30 46 L50 46 L55 52 L57 66 L23 66 Z"
            fill="rgba(0,0,0,0.22)" stroke="rgba(255,255,255,0.24)" stroke-width="1"/>
      <line x1="29" y1="45" x2="31" y2="47" stroke="#e51d24" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="49" y1="45" x2="51" y2="47" stroke="#e51d24" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
  `,
  crewneck: (colorHex = "#94a3b8") => `
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="th-cn-light" x1="12" y1="12" x2="68" y2="68">
          <stop offset="0%"  stop-color="#ffffff" stop-opacity="0.26"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0.40"/>
        </linearGradient>
      </defs>
      <path d="M28 18 L14 30 L6 46 C4 50 10 52 13 49 L20 38 L19 66 L61 66 L60 38 L67 49 C70 52 76 50 74 46 L66 30 L52 18 Z"
            fill="${colorHex}" stroke="rgba(255,255,255,0.28)" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M28 18 L14 30 L6 46 C4 50 10 52 13 49 L20 38 L19 66 L61 66 L60 38 L67 49 C70 52 76 50 74 46 L66 30 L52 18 Z"
            fill="url(#th-cn-light)"/>
      <path d="M28 18 C33 25 47 25 52 18 C47 22 33 22 28 18 Z"
            fill="${colorHex}" stroke="rgba(255,255,255,0.40)" stroke-width="1.4"/>
      <path d="M37 21 L40 27 L43 21" stroke="rgba(0,0,0,0.45)" stroke-width="1.4" fill="none"/>
      <rect x="19" y="60" width="42" height="6" fill="rgba(0,0,0,0.22)" stroke="rgba(255,255,255,0.24)" stroke-width="1"/>
    </svg>
  `
};

// =========================================================================
// PRESET ARTWORKS (DISEÑOS DE MUESTRA DTF CON EL LOGO OFICIAL SENKAI)
// =========================================================================
export const PRESET_ARTWORKS = [
  {
    id: "art-senkai-official",
    name: "Senkai Studio Original (Oficial)",
    category: "Branding / Insignia",
    imageSrc: "/static/assets/logo.png",
    svgContent: `
      <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
        <img src="/static/assets/logo.png" alt="Senkai Official Logo" style="width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 4px 16px rgba(229,29,36,0.35)) drop-shadow(0 2px 8px rgba(0,0,0,0.5));">
      </div>
    `,
    suggestedPosition: "pecho_centro",
    suggestedSize: "A4"
  },
  {
    id: "art-senkai-badge",
    name: "Senkai Badge & Katakana (Pocket)",
    category: "Minimal / Pocket",
    imageSrc: "/static/assets/logo.png",
    svgContent: `
      <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
        <img src="/static/assets/logo.png" alt="Senkai Badge" style="width: 95%; height: 95%; object-fit: contain; filter: drop-shadow(0 2px 8px rgba(229,29,36,0.3)) drop-shadow(0 1px 4px rgba(0,0,0,0.4));">
      </div>
    `,
    suggestedPosition: "pecho_izquierdo",
    suggestedSize: "A6"
  },
  {
    id: "art-cyber-kanji",
    name: "Cyber Kanji 2026",
    category: "Cyberpunk / Techwear",
    svgContent: `
      <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="200" rx="14" fill="#060a11" fill-opacity="0.95"/>
        <circle cx="100" cy="100" r="74" stroke="#00f0ff" stroke-width="2.5" stroke-dasharray="10 5"/>
        <circle cx="100" cy="100" r="66" stroke="rgba(0,240,255,0.2)" stroke-width="1" stroke-dasharray="5 8"/>
        <text x="100" y="118" font-family="'Space Grotesk', sans-serif" font-weight="900" font-size="54" fill="#ffffff" text-anchor="middle">精工</text>
        <text x="100" y="148" font-family="monospace" font-weight="700" font-size="11" fill="#e51d24" text-anchor="middle" letter-spacing="4">SENKAI DTF</text>
        <path d="M48 44 L152 44" stroke="#e51d24" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M60 50 L140 50" stroke="rgba(229,29,36,0.4)" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    `,
    suggestedPosition: "pecho_centro",
    suggestedSize: "A4"
  },
  {
    id: "art-mecha-unit",
    name: "Mecha Unit Eva-01",
    category: "Anime / Mecha",
    svgContent: `
      <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <polygon points="100,16 188,168 12,168" stroke="#e51d24" stroke-width="4" fill="rgba(229,29,36,0.12)"/>
        <polygon points="100,48 162,155 38,155" stroke="#00f0ff" stroke-width="2" fill="rgba(0,240,255,0.04)"/>
        <polygon points="100,72 138,144 62,144" stroke="rgba(255,255,255,0.2)" stroke-width="1" fill="none"/>
        <text x="100" y="124" font-family="'Space Grotesk', sans-serif" font-weight="900" font-size="24" fill="#ffffff" text-anchor="middle">UNIT 01</text>
        <text x="100" y="144" font-family="monospace" font-weight="700" font-size="8" fill="#e51d24" text-anchor="middle" letter-spacing="2">SPEC: DTF 300DPI</text>
      </svg>
    `,
    suggestedPosition: "espalda_completa",
    suggestedSize: "A3"
  },
  {
    id: "art-acid-overkill",
    name: "Acid Type Streetwear",
    category: "Typography",
    svgContent: `
      <svg viewBox="0 0 240 160" fill="none" xmlns="http://www.w3.org/2000/svg">
        <text x="120" y="62" font-family="'Space Grotesk', sans-serif" font-weight="900" font-size="40" fill="#e51d24" text-anchor="middle" letter-spacing="-1">SEN<tspan fill="#ffffff">K</tspan>AI</text>
        <text x="120" y="108" font-family="'Space Grotesk', sans-serif" font-weight="900" font-size="38" fill="#ffffff" text-anchor="middle" letter-spacing="-1">STUDIO</text>
        <rect x="28" y="120" width="184" height="4" fill="#00f0ff" rx="2"/>
        <rect x="28" y="127" width="184" height="2" fill="rgba(0,240,255,0.3)" rx="1"/>
      </svg>
    `,
    suggestedPosition: "pecho_centro",
    suggestedSize: "A4"
  }
];
