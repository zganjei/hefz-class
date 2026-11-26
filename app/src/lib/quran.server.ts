// Uthmani text of the surahs used by the plan (Tanzil "quran-uthmani" edition, bismillah stripped from verse 1).
// Tanzil text is free to use unmodified with attribution: https://tanzil.net
import text from "./quran-uthmani.json";
import notesData from "./tadabbur-notes.json";
import bahrampour from "./bahrampour-fa.json";

const SURAH: Record<string, string> = { "انفال": "8", "احزاب": "33", "محمد": "47", "فتح": "48", "حجرات": "49", "حشر": "59", "ممتحنه": "60", "صف": "61", "جمعه": "62", "منافقون": "63" };
const en = (s: string) => s.replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
const verses = text as Record<string, string[]>;
export type VerseLine = { n: number; text: string };
export type VerseBlock = { range: string; surah: string; verses: VerseLine[] };

/** Parses plan range strings: "آیه ۱ سوره فتح", "آیات ۱ تا ۹ سوره فتح", "آیات ۱ و ۲ سوره فتح", "سوره فتح". */
export function resolveRange(range: string): VerseBlock | null {
  const m = en(range).trim().match(/^(?:(آیه|آیات)\s+(\d+)(?:\s+(تا|و)\s+(\d+))?\s+)?سوره\s+(?:ال)?(\S+)$/);
  if (!m) return null;
  const key = SURAH[m[5]], list = key && verses[key];
  if (!list) return null;
  let from = 1, to = list.length;
  if (m[2]) { from = Number(m[2]); to = m[4] ? Number(m[4]) : from; }
  if (from < 1 || to > list.length || from > to) return null;
  const pick = m[3] === "و" ? [from, to] : Array.from({ length: to - from + 1 }, (_, i) => from + i);
  return { range, surah: m[5], verses: pick.map(n => ({ n, text: list[n - 1] })) };
}

/** Parses a plan range into surah number + inclusive verse span (whole surah when no verses given). */
export function parseRange(range: string): { surah: string; from: number; to: number } | null {
  const m = en(range).trim().match(/^(?:(آیه|آیات)\s+(\d+)(?:\s+(تا|و)\s+(\d+))?\s+)?سوره\s+(?:ال)?(\S+)$/);
  if (!m) return null;
  const key = SURAH[m[5]], list = key && verses[key];
  if (!list) return null;
  const from = m[2] ? Number(m[2]) : 1, to = m[2] ? Number(m[4] || m[2]) : list.length;
  if (from < 1 || to > list.length || from > to) return null;
  return { surah: key, from, to };
}
/** quran.com link for the range, e.g. https://quran.com/48/1-9 (or /48 for a whole surah). */
export function quranComUrl(range: string): string | null {
  const r = parseRange(range); if (!r) return null;
  const whole = r.from === 1 && r.to === verses[r.surah].length;
  return `https://quran.com/${r.surah}` + (whole ? "" : `/${r.from}${r.to > r.from ? "-" + r.to : ""}`);
}
type SurahNotes = { name: string; url: string; note?: string; ranges: { from: number; to: number; summary: string; url?: string }[] };
export type TadabburInfo = { author: string; series: string; url: string; note?: string; summaries: { summary: string; url: string }[] };
/** Tadabbur info for a range: own-words summaries whose verse span overlaps, plus the surah page link. */
export function tadabburFor(range: string): TadabburInfo | null {
  const r = parseRange(range); if (!r) return null;
  const s = (notesData.surahs as Record<string, SurahNotes>)[r.surah]; if (!s) return null;
  return { author: notesData.author, series: notesData.series, url: s.url, note: s.note,
    summaries: s.ranges.filter(x => x.from <= r.to && x.to >= r.from).map(x => ({ summary: x.summary, url: x.url || s.url })) };
}

/** Per-verse recitation (Mishary Alafasy) from EveryAyah's static CDN, no key: https://everyayah.com */
export type AudioInfo = { reciter: string; source: string; verses: { n: number; url: string }[] };
export function audioFor(range: string): AudioInfo | null {
  const b = resolveRange(range), r = parseRange(range); if (!b || !r) return null;
  const p3 = (n: number | string) => String(n).padStart(3, "0");
  return { reciter: "مشاری العفاسی", source: "https://everyayah.com", verses: b.verses.map(v => ({ n: v.n, url: `https://everyayah.com/data/Alafasy_128kbps/${p3(r.surah)}${p3(v.n)}.mp3` })) };
}
/** Verbatim Bahrampour verse translation (Tanzil edition fa.bahrampour, unmodified, attributed). Only the plan's surahs are bundled. */
export type TranslationInfo = { translator: string; source: string; sourceUrl: string; link: string | null; verses: { n: number; text: string }[] };
export function translationFor(range: string): TranslationInfo | null {
  const b = resolveRange(range), r = parseRange(range); if (!b || !r) return null;
  const list = (bahrampour as Record<string, string[]>)[r.surah]; if (!list) return null;
  return { translator: "ترجمهٔ استاد ابوالفضل بهرام‌پور", source: "Tanzil.net", sourceUrl: `https://tanzil.net/#trans/fa.bahrampour/${r.surah}:${r.from}`, link: quranComUrl(range),
    verses: b.verses.map(v => ({ n: v.n, text: list[v.n - 1] })) };
}
