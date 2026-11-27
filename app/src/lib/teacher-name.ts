// Single normalization for teacher names, shared by the registry «اساتید» tab (server merge) and the stats «به تفکیک استاد».
const TITLE = /^(?:سرکار\s+خانم|جناب\s+آقای|جناب\s+استاد|سرکار|خانم|استاد|آقای|جناب)\s+/;
export function teacherKey(raw: unknown): string {
  let s = String(raw ?? "").replace(/‌/g, " ").replace(/[‏‎ً-ٟ]/g, "")
    .replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/ة/g, "ه").replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/\s+/g, " ").trim();
  for (let i = 0; i < 3 && TITLE.test(s); i++) s = s.replace(TITLE, "").trim();
  return s;
}
export const NO_TEACHER = "نامشخص";
export const isNoTeacher = (raw: unknown) => { const k = teacherKey(raw); return !k || k === NO_TEACHER; };
/** Search normalization (client + server safe): teacherKey (title prefixes, ی/ي ک/ك, ZWNJ, Persian/Arabic digits) + lowercase. */
export const searchNorm = (raw: unknown) => teacherKey(raw).toLowerCase();
/** Query tokens for a search box; every token must be found in the same field. */
export const searchTokens = (q: string) => searchNorm(q).split(" ").filter(Boolean);
