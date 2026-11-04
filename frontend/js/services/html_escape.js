// Los datos comerciales y de clientes nunca se interpretan como marcado HTML.
// Esta utilidad se comparte entre tienda, Kanban y comprobantes para evitar reglas divergentes.
export function escapeHtml(untrustedText) {
  return String(untrustedText ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function safeColorHex(rawHex) {
  return typeof rawHex === "string" && /^#[0-9a-fA-F]{6}$/.test(rawHex)
    ? rawHex
    : "#121212";
}

export function safeArtworkUrl(untrustedUrl) {
  if (typeof untrustedUrl !== "string") return "";
  // Solo artes internos: se descartan esquemas ejecutables, URLs externas y atributos malformados.
  return /^\/static\/assets\/[a-zA-Z0-9_./-]+$/.test(untrustedUrl) && !untrustedUrl.includes("..")
    ? untrustedUrl
    : "";
}

export function safeNavigationHref(untrustedHref) {
  if (typeof untrustedHref !== "string") return "#personalizador";
  const destination = untrustedHref.trim();
  if (/^#[a-zA-Z0-9_-]+$/.test(destination)) return destination;
  if (/^\/(?!\/)[a-zA-Z0-9_/?#&=%.-]*$/.test(destination)) return destination;

  try {
    const parsed = new URL(destination);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") return parsed.href;
  } catch {
    // Evitamos que esquemas como javascript: o data: alcancen atributos de navegación.
  }
  return "#personalizador";
}
