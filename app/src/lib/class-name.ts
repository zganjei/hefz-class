/** One normaliser for class names, shared by registry-class creation and the roster match (ي/ی, ك/ک, diacritics, ZWNJ, spacing, case, leading «کلاس»). */
export function normClassName(s: unknown): string {
  const t = String(s ?? "").replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/[ً-ٟ‌]/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
  return t.replace(/^کلاس(\s+|$)/, "").trim();
}
