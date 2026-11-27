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
  s = s.replace(/سوره\s+الفتح/, "سوره فتح");
  const flipped = s.match(/^سوره\s+(\S+)\s+(?:آیه|آیات)\s+(\d+)(?:\s+(تا|و)\s+(\d+))?$/);   // "سوره فتح آیه 1" / "سوره فتح آیات 1 تا 3" -> "آیه 1 سوره فتح" / "آیات 1 تا 3 سوره فتح"
  if (flipped) s = flipped[3] ? `آیات ${flipped[2]} ${flipped[3]} ${flipped[4]} سوره ${flipped[1]}` : `آیه ${flipped[2]} سوره ${flipped[1]}`;
  if (/^آیه\s+\d+\s+(تا|و)\s+\d+/.test(s)) s = s.replace(/^آیه/, "آیات");
  return toPersian(s);
}
const splitItems = (cell: string): string[] => {
  if (isDash(cell)) return [];
  return cell.split("+").flatMap(p => p.split(/\s+و\s+(?=سوره)/)).map(p => normalizeRange(p)).filter(p => !isDash(p));
};

function parseDay(cells: { n: string; r: string; b: string }): ProgramDay {
  const n = cells.n, special = /آزمون|امتحان|بدون حفظ|تعطیل|مرور کلی|^کلاس$/.test(n);
  let kind: ProgramDay["kind"] = "rest", nw: string | null = null;
  const review = splitItems(cells.r), basket = splitItems(cells.b);
  if (!isDash(n)) {
    if (special) {
      if (/تعطیل/.test(n)) kind = "rest";
      else if (n === "کلاس") kind = "class";   // plain class day, nothing new to memorise
      else { kind = "class"; review.unshift(n); }
    } else { kind = "new"; nw = normalizeRange(n); }
  }
  return { kind, new: nw, review, basket };
}

const emptyDay = (): ProgramDay => ({ kind: "rest", new: null, review: [], basket: [] });
function cleanTitle(s: string): string {
  const t = cellText(s).replace(/^[^\p{L}\p{N}]+/u, "").replace(/\(?\s*حفظ\s*فعال\s*\)?/g, "").replace(/\s+/g, " ").trim();
  const bare = t.replace(/^هفته\s*[\d۰-۹]*\s*[-–:]?\s*/, "").trim() || t;
  // "سوره مبارکه فتح - گام 1" -> "سوره فتح · گام ۱" (gam/level kept in the title)
  return /\sگام\s*[\d۰-۹]/.test(bare) ? toPersian(toLatin(bare)).replace(/سوره مبارکه/, "سوره").replace(/\s*[-–]\s*/g, " · ") : bare;
}

/** rows: array of arrays of cell values (Excel sheet via sheet_to_json({header:1}) or pasted TSV split). */
export function parseProgramRows(rows: unknown[][]): ParseResult {
  const warnings: string[] = [];
  // Two layouts: (A) day rows start with the day name; (B) a table-header row "هفته اول؛ … | روز | تاریخ | حفظ جدید | …" follows a title row
  // "هفته 1 - سوره … - گام 1", and the 7 day rows have EMPTY day/date cells (data in columns D-F), identified by position.
  type Wk = { title: string; days: (ProgramDay | null)[]; cols: [number, number, number]; positional: boolean; pos: number; extra: number };
  const weeks: Wk[] = [];
  let cur: Wk | null = null, lastIdx = -1;
  const start = (title: string) => { cur = { title, days: Array(7).fill(null), cols: [2, 3, 4], positional: false, pos: 0, extra: 0 }; weeks.push(cur); lastIdx = -1; };
  const setCols = (c: Wk, cells: string[]) => cells.forEach((h, i) => { if (/سبد/.test(h)) c.cols[2] = i; else if (/ده\s*درس|مرور/.test(h)) c.cols[1] = i; else if (/حفظ/.test(h)) c.cols[0] = i; });
  for (const row of rows) {
    const cells = (row || []).map(cellText);
    const first = cells[0] || "";
    const idx = DAYS.indexOf(dayKey(first));
    const hasDayHdr = idx < 0 && cells.slice(1).some(h => h === "روز");
    if (hasDayHdr && /هفته/.test(first)) {   // layout B table-header row
      { const w = cur as Wk | null; if (!w || w.days.some(Boolean) || w.positional) start(cleanTitle(first)); }   // no title row before it, or the previous week already has data
      const c = cur as unknown as Wk; c.positional = true; c.cols = [3, 4, 5]; setCols(c, cells);
      continue;
    }
    if (idx < 0 && /هفته/.test(first)) { start(cleanTitle(first)); continue; }
    if (idx < 0 && first === "روز") {   // layout A column header row: locate columns by their titles
      if (!cur) start("");
      setCols(cur as unknown as Wk, cells);
      continue;
    }
    if (idx < 0 && !first && cur && (cur as Wk).positional && cells.slice(3).some(c => c)) {   // layout B day row, by position
      const c = cur as Wk;
      if (c.pos >= 7) { c.extra++; continue; }
      c.days[c.pos++] = parseDay({ n: cells[c.cols[0]] || "", r: cells[c.cols[1]] || "", b: cells[c.cols[2]] || "" });
      continue;
    }
    if (idx < 0) continue;
    if (!cur || idx <= lastIdx) start("");   // pasted text without week headers: a day number that does not increase starts a new week
    const c = cur as unknown as Wk;
    c.days[idx] = parseDay({ n: cells[c.cols[0]] || "", r: cells[c.cols[1]] || "", b: cells[c.cols[2]] || "" });
    lastIdx = idx;
  }
  const out: ProgramWeek[] = [];
  weeks.forEach((w, i) => {
    if (!w.days.some(Boolean)) { warnings.push(`هفتهٔ ${toPersian(String(i + 1))} هیچ روزی نداشت و کنار گذاشته شد.`); return; }
    if (w.extra) warnings.push(`هفتهٔ ${toPersian(String(out.length + 1))}: ${toPersian(String(w.extra))} ردیف اضافه بعد از روز هفتم نادیده گرفته شد.`);
    const missing = w.days.filter(d => !d).length;
    if (missing) warnings.push(`هفتهٔ ${toPersian(String(out.length + 1))}: ${toPersian(String(missing))} روز خالی بود (به‌صورت استراحت ثبت شد).`);
    out.push({ title: w.title || `هفتهٔ ${toPersian(String(out.length + 1))}`, days: w.days.map(d => d || emptyDay()) });
  });
  // A "گام N" label that is identical on every week is a copy-paste placeholder in the source, not information: drop it instead of showing it.
  const gam = out.map(w => w.title.match(/ · گام [۰-۹]+$/)?.[0]);
  if (out.length > 1 && gam.every(g => g && g === gam[0])) {
    out.forEach(w => { w.title = w.title.slice(0, -gam[0]!.length); });
    warnings.push(`برچسب «${gam[0]!.replace(/^ · /, "")}» در همهٔ هفته‌ها یکسان بود و حذف شد.`);
  }
  return { weeks: out, warnings };
}

/** Default program name: the sheet's title row (first non-empty cell, if it mentions "برنامه"), with stray Excel range junk like "+A1:F40" removed. "" if none. */
export function suggestProgramName(rows: unknown[][]): string {
  for (const row of rows.slice(0, 5)) {
    const t = cellText((row || []).find(c => cellText(c)) ?? "").replace(/\+?\s*[A-Z]{1,2}\d+:[A-Z]{1,2}\d+\s*/g, "").replace(/\s+/g, " ").trim();
    if (t && /برنامه/.test(t) && t.length <= 120) return t;
    if (t) break;
  }
  return "";
}
