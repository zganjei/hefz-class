import { searchNorm, searchTokens } from "./teacher-name";

type P = { full_name?: string; class_name?: string; teacher_name?: string; code?: string; phone?: string };
/** Only the fields a person sees in the registry list are searched (name, class, teacher, code, phone digits). Never hidden fields (notes, Excel extras). */
export const personHaystack = (p: P) => searchNorm([p.full_name, p.class_name, p.teacher_name, p.code].filter(Boolean).join(" ")) + " " + searchNorm(p.phone).replace(/\D/g, "");
/** Every query token (normalized: ی/ي ک/ك, ZWNJ, Persian/Arabic digits, title prefixes, case) must appear somewhere in the haystack. Empty query matches all. */
export function personMatches(p: P, query: string): boolean {
  const t = searchTokens(query); if (!t.length) return true;
  const h = personHaystack(p); return t.every(x => h.includes(x));
}
