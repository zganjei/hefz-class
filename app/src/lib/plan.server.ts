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
export type PlanDay = { new: string | null; review: string[]; basket: string[] };
export function expandWeek(w: { start_date: string | null; days: PlanDay[] }, today: string, done: Set<number>) {
  return w.days.map((d, i) => {
    const date = w.start_date ? addDays(w.start_date, i) : null;
    return { index: i, name: DAY_NAMES[i], date, jdate: date ? jalaliLabel(date) : "", new: d.new, review: d.review, basket: d.basket, done: done.has(i), future: !!date && date > today };
  });
}
