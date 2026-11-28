// Helpers for the weekly memorization plan (Saturday-first weeks, Jalali labels, Stockholm "today").
export const DAY_NAMES = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];
const MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const digits = (s: string | number) => String(s).replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[+d]);

function g2j(gy: number, gm: number, gd: number) {
  const gdm = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days = 355666 + 365 * gy + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) + gd + gdm[gm - 1];
  let jy = -1595 + 33 * Math.floor(days / 12053); days %= 12053;
  jy += 4 * Math.floor(days / 1461); days %= 1461;
  if (days > 365) { jy += Math.floor((days - 1) / 365); days = (days - 1) % 365; }
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return { jy, jm, jd };
}
/** "YYYY-MM-DD" in Europe/Stockholm right now. */
export function stockholmToday(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
export function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10);
}
export function jalaliLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number); const j = g2j(y, m, d);
  return `${digits(j.jd)} ${MONTHS[j.jm - 1]}`;
}
export const DAILY_ITEMS = ["listen", "memorize", "translate", "tadabbur", "review10", "reviewAll"] as const;
export type DailyItem = (typeof DAILY_ITEMS)[number];
export const ITEM_LABELS: Record<DailyItem, string> = { listen: "استماع", memorize: "حفظ", translate: "ترجمه", tadabbur: "تدبر", review10: "مرور ده درس", reviewAll: "مرور سبد کل" };
/** Day ranges per item: listen/memorize/translate/tadabbur use the day's `new` only (empty on rest/class days); review10 = `review`; reviewAll = `basket`. */
export function itemRanges(item: DailyItem, d: { new: string | null; review: string[]; basket: string[] }): string[] {
  if (item === "review10") return d.review;
  if (item === "reviewAll") return d.basket;
  return d.new ? [d.new] : [];
}
/** Strict "YYYY-MM-DD" check (real calendar date). */
export function isIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T12:00:00Z"); return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
/** Locates `date` inside the dated weeks: its week and day index, or null. */
export function locateDay<W extends { start_date: string | null }>(weeks: W[], date: string): { week: W; idx: number } | null {
  for (const w of weeks) { if (!w.start_date) continue; const idx = dayIndexOf(w.start_date, date); if (idx !== null) return { week: w, idx }; }
  return null;
}
/** Day index (0..6) of `today` within the week starting `start`, or null if outside. */
export function dayIndexOf(start: string, today: string): number | null {
  const n = Math.round((Date.parse(today + "T12:00:00Z") - Date.parse(start + "T12:00:00Z")) / 86400000);
  return n >= 0 && n <= 6 ? n : null;
}
export type PlanDay = { kind: "new" | "class" | "rest"; new: string | null; review: string[]; basket: string[] };
export function expandWeek(w: { start_date: string | null; days: PlanDay[] }, today: string, done: Set<number>) {
  return w.days.map((d, i) => {
    const date = w.start_date ? addDays(w.start_date, i) : null;
    return { index: i, name: DAY_NAMES[i], date, jdate: date ? jalaliLabel(date) : "", kind: d.kind, new: d.new, review: d.review, basket: d.basket, done: done.has(i), future: !!date && date > today };
  });
}

/** Week a class report opens on. Explicit request wins; else the class's own current week (only a class WITH a program has one: the global plan's dates say nothing about it); else the first open week. */
export function defaultClassWeek(o: { requested: number | null; hasProgram: boolean; currentWeek: number | null; lastDatedWeek: number | null; weeks: { week_number: number; start_date: string | null }[]; today: string }): number {
  if (o.requested) return o.requested;
  if (o.hasProgram && (o.currentWeek || o.lastDatedWeek)) return (o.currentWeek || o.lastDatedWeek)!;
  return o.weeks.find(w => !w.start_date || w.start_date <= o.today)?.week_number ?? o.weeks[0]?.week_number ?? 0;
}
