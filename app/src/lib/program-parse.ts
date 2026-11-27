// Tolerant parser for weekly study-program sheets (Excel rows or pasted tab-separated text). Pure: used in the browser and in checks.
export type ProgramDay = { kind: "new" | "class" | "rest"; new: string | null; review: string[]; basket: string[] };
export type ProgramWeek = { title: string; days: ProgramDay[] };
export type ParseResult = { weeks: ProgramWeek[]; warnings: string[] };

const PERSIAN = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_IND = "٠١٢٣٤٥٦٧٨٩";
const DAYS = ["شنبه", "یکشنبه", "دوشنبه", "سهشنبه", "چهارشنبه", "پنجشنبه", "جمعه"];
const toLatin = (s: string) => s.replace(/[۰-۹]/g, d => String(PERSIAN.indexOf(d))).replace(/[٠-٩]/g, d => String(ARABIC_IND.indexOf(d)));
const toPersian = (s: string) => s.replace(/\d/g, d => PERSIAN[+d]);
const cellText = (v: unknown) => (v === null || v === undefined ? "" : String(v)).replace(/[‎‏ ]/g, " ").replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/\s+/g, " ").trim();
const isDash = (s: string) => !s || /^[-–—_.\s]+$/.test(s);
const dayKey = (s: string) => cellText(s).replace(/[\s‌]/g, "");

/** Normalises one Quran range to the form the app resolves: "آیه ۱ سوره فتح", "آیات ۱ تا ۹ سوره فتح", "سوره فتح". */
export function normalizeRange(raw: string): string {
  let s = toLatin(cellText(raw)).replace(/سور\s+ه/g, "سوره").replace(/ا\s*ل\s*(?=عمران)/g, "ال");
  s = s.replace(/(\d)\s*(تا|و)\s*(\d)/g, "$1 $2 $3").replace(/\s+/g, " ").trim();
  s = s.replace(/سو\s*ر?\s*ه/g, "سوره").replace(/(آیه|آیات)\s*(\d)/g, "$1 $2");   // typos: "سوه", "سو ره", "آیه۶"
  s = s.replace(/^((?:آیه|آیات)\s+\d+(?:\s+(?:تا|و)\s+\d+)?)\s+(?!سوره)(\S+)$/, "$1 سوره $2");   // "آیات 1 تا 8 صف" -> add the missing "سوره"
  s = s.replace(/(سوره\s+)(?:ممحمد|حمد|احزاز|تووبه)/, (_m, a) => a + ({ "ممحمد": "محمد", "حمد": "محمد", "احزاز": "احزاب", "تووبه": "توبه" } as Record<string, string>)[_m.slice(a.length)]);
  const flipped = s.match(/^سوره\s+(\S+)\s+آیه\s+(\d+)$/);   // "سوره فتح آیه 1" -> "آیه 1 سوره فتح"
  if (flipped) s = `آیه ${flipped[2]} سوره ${flipped[1]}`;
  if (/^آیه\s+\d+\s+(تا|و)\s+\d+/.test(s)) s = s.replace(/^آیه/, "آیات");
  return toPersian(s);
}
const splitItems = (cell: string): string[] => {
  if (isDash(cell)) return [];
  return cell.split("+").flatMap(p => p.split(/\s+و\s+(?=سوره)/)).map(p => normalizeRange(p)).filter(p => !isDash(p));
};

function parseDay(cells: { n: string; r: string; b: string }): ProgramDay {
  const n = cells.n, special = /آزمون|امتحان|بدون حفظ|تعطیل|مرور کلی/.test(n);
  let kind: ProgramDay["kind"] = "rest", nw: string | null = null;
  const review = splitItems(cells.r), basket = splitItems(cells.b);
  if (!isDash(n)) {
    if (special) {
      if (/تعطیل/.test(n)) kind = "rest";
      else { kind = "class"; review.unshift(n); }
    } else { kind = "new"; nw = normalizeRange(n); }
  }
  return { kind, new: nw, review, basket };
}

const emptyDay = (): ProgramDay => ({ kind: "rest", new: null, review: [], basket: [] });
function cleanTitle(s: string): string {
  const t = cellText(s).replace(/^[^\p{L}\p{N}]+/u, "").replace(/\(?\s*حفظ\s*فعال\s*\)?/g, "").replace(/\s+/g, " ").trim();
  return t.replace(/^هفته\s*[\d۰-۹]*\s*[-–:]?\s*/, "").trim() || t;
}

/** rows: array of arrays of cell values (Excel sheet via sheet_to_json({header:1}) or pasted TSV split). */
export function parseProgramRows(rows: unknown[][]): ParseResult {
  const warnings: string[] = [];
  const weeks: { title: string; days: (ProgramDay | null)[]; cols: [number, number, number] }[] = [];
  let cur: (typeof weeks)[number] | null = null, lastIdx = -1;
  const start = (title: string) => { cur = { title, days: Array(7).fill(null), cols: [2, 3, 4] }; weeks.push(cur); lastIdx = -1; };
  for (const row of rows) {
    const cells = (row || []).map(cellText);
    const first = cells[0] || "";
    const idx = DAYS.indexOf(dayKey(first));
    if (idx < 0 && /هفته/.test(first)) { start(cleanTitle(first)); continue; }
    if (idx < 0 && first === "روز") {   // column header row: locate columns by their titles
      if (!cur) start("");
      const c = cur!;
      cells.forEach((h, i) => { if (/سبد/.test(h)) c.cols[2] = i; else if (/ده\s*درس|مرور/.test(h)) c.cols[1] = i; else if (/حفظ/.test(h)) c.cols[0] = i; });
      continue;
    }
    if (idx < 0) continue;
    if (!cur || idx <= lastIdx) start("");   // pasted text without week headers: a day number that does not increase starts a new week
    const c = cur!;
    c.days[idx] = parseDay({ n: cells[c.cols[0]] || "", r: cells[c.cols[1]] || "", b: cells[c.cols[2]] || "" });
    lastIdx = idx;
  }
  const out: ProgramWeek[] = [];
  weeks.forEach((w, i) => {
    if (!w.days.some(Boolean)) { warnings.push(`هفتهٔ ${toPersian(String(i + 1))} هیچ روزی نداشت و کنار گذاشته شد.`); return; }
    const missing = w.days.filter(d => !d).length;
    if (missing) warnings.push(`هفتهٔ ${toPersian(String(out.length + 1))}: ${toPersian(String(missing))} روز خالی بود (به‌صورت استراحت ثبت شد).`);
    out.push({ title: w.title || `هفتهٔ ${toPersian(String(out.length + 1))}`, days: w.days.map(d => d || emptyDay()) });
  });
  return { weeks: out, warnings };
}
