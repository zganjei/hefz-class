// Uthmani text of the surahs used by the plan (Tanzil "quran-uthmani" edition, bismillah stripped from verse 1).
// Tanzil text is free to use unmodified with attribution: https://tanzil.net
import text from "./quran-uthmani.json";

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
