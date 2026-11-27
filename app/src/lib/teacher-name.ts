// Single normalization for teacher names, shared by the registry «اساتید» tab (server merge) and the stats «به تفکیک استاد».
const TITLE = /^(?:سرکار\s+خانم|جناب\s+آقای|جناب\s+استاد|سرکار|خانم|استاد|آقای|جناب)\s+/;
export function teacherKey(raw: unknown): string {
  let s = String(raw ?? "").replace(/‌/g, " ").replace(/[‏‎ً-ٟ]/g, "")
    .replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/ة/g, "ه").replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/\s+/g, " ").trim();
  for (let i = 0; i < 3 && TITLE.test(s); i++) s = s.replace(TITLE, "").trim();
  return s;
}
export const NO_TEACHER = "نامشخص";
export const isNoTeacher = (raw: unknown) => { const k = teacherKey(raw); return !k || k === NO_TEACHER; };
/** Search normalization (client + server safe): teacherKey (title prefixes, ی/ي ک/ك, ZWNJ, Persian/Arabic digits) + lowercase. */
export const searchNorm = (raw: unknown) => teacherKey(raw).toLowerCase();
/** Query tokens for a search box; every token must be found in the same field. */
export const searchTokens = (q: string) => searchNorm(q).split(" ").filter(Boolean);
/** Display only: drop a leading word «کلاس » (normal/ZWNJ space, Arabic ك) so lists read «شهید آرمان علی وردی». Stored names, matching and links keep the real name. «گروه …» and inner «کلاس» are untouched. */
export const displayClassName = (raw: unknown): string => { const s = String(raw ?? ""); const r = s.replace(/^\s*[کك]لاس[\s‌]+(?=\S)/, ""); return r || s; };
const SP = "[\\s‌]+", K = "[کك]", Y = "[یي]";
const DISPLAY_TITLE = new RegExp(`^\\s*(?:سر${K}ار${SP}خانم|جناب${SP}آقا${Y}|جناب${SP}استاد|سر${K}ار|خانم|استاد|آقا${Y}|جناب)${SP}(?=\\S)`);
/** Display only: drop leading honorific titles («سرکار خانم»، «سرکار»، «خانم»، «استاد»، «آقای»، «جناب») so teachers read as plain names. Handles ZWNJ and Arabic ی/ك. Keeps the original letters of the name; a bare title with no name, or «خانم» elsewhere in the name, is untouched. Stored data, matching and exports keep the raw value. */
export const displayTeacherName = (raw: unknown): string => { const s = String(raw ?? ""); let r = s; for (let i = 0; i < 3 && DISPLAY_TITLE.test(r); i++) r = r.replace(DISPLAY_TITLE, ""); r = r.trim(); return !r || /^(?:سر[کك]ار|خانم|استاد|آقا[یي]|جناب)$/.test(r) ? s : r; };
