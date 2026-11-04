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
