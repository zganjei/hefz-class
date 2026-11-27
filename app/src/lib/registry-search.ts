import { displayClassName, searchNorm, searchTokens } from "./teacher-name";

type P = { full_name?: string; class_name?: string; teacher_name?: string; code?: string; phone?: string };
/** Only the fields a person sees in the registry list are searched (name, class, teacher, code, phone digits). Never hidden fields (notes, Excel extras). */
export type SearchMatch = { group: "name" | "other"; /** how many query tokens were found in the name (higher = better) */ nameHits: number; /** for group "other": why it matched, e.g. «استاد: زهراسادات رضایی» */ reasons: string[] };

const FIELDS: { label: string; get: (p: P) => string; digits?: boolean }[] = [
  { label: "استاد", get: p => p.teacher_name || "" },
  { label: "کلاس", get: p => p.class_name || "" },
  { label: "کد", get: p => p.code || "" },
  { label: "تلفن", get: p => p.phone || "", digits: true },
];
/** Every query token (normalized: ی/ي ک/ك, ZWNJ, Persian/Arabic digits, title prefixes, case) must appear in the name or in another visible field.
 *  group "name": at least one token is in the person's NAME (ranked by how many); group "other": matched only via teacher/class/code/phone. null = no match. Empty query = name group. */
export function personMatch(p: P, query: string): SearchMatch | null {
  const t = searchTokens(query); if (!t.length) return { group: "name", nameHits: 0, reasons: [] };
  const name = searchNorm(p.full_name);
  const fields = FIELDS.map(f => ({ ...f, raw: f.get(p), v: f.digits ? searchNorm(f.get(p)).replace(/\D/g, "") : searchNorm(f.get(p)) }));
  let nameHits = 0; const reasons: string[] = [];
  for (const x of t) {
    if (name.includes(x)) { nameHits++; continue; }
    const f = fields.find(f => f.v.includes(x)); if (!f) return null;
    const r = f.digits ? f.label : f.label + ": " + (f.label === "کلاس" ? displayClassName(f.raw.trim()) : f.raw.trim());
    if (!reasons.includes(r)) reasons.push(r);
  }
  return { group: nameHits > 0 ? "name" : "other", nameHits, reasons: nameHits > 0 && nameHits === t.length ? [] : reasons };
}
export const personMatches = (p: P, query: string): boolean => personMatch(p, query) !== null;
/** Split + rank a list: name matches first (more name tokens first, stable otherwise), then the rest with their reasons. */
export function rankPeople<T extends P>(list: T[], query: string): { main: T[]; other: { p: T; reasons: string[] }[] } {
  const main: { p: T; h: number }[] = [], other: { p: T; reasons: string[] }[] = [];
  for (const p of list) { const m = personMatch(p, query); if (!m) continue; if (m.group === "name") main.push({ p, h: m.nameHits }); else other.push({ p, reasons: m.reasons }); }
  main.sort((a, b) => b.h - a.h);
  return { main: main.map(x => x.p), other };
}
