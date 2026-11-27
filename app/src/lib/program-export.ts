// Program -> spreadsheet rows in exactly the layout the importer (program-parse.ts) reads, so a download re-imports cleanly. Pure.
import type { ProgramWeek } from "./program-parse";

const DAY_NAMES = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];
export const PROGRAM_HEADER = ["روز", "تاریخ", "حفظ جدید", "مرور ده درس", "سبد کل"];

/** Layout A: per week a title row "هفته N - title", the column header row, then 7 day rows. */
export function programToRows(weeks: ProgramWeek[]): string[][] {
  const rows: string[][] = [];
  weeks.forEach((w, i) => {
    rows.push([`هفته ${i + 1} - ${w.title}`, "", "", "", ""]);
    rows.push([...PROGRAM_HEADER]);
    w.days.forEach((d, j) => {
      const n = d.kind === "new" ? (d.new || "-") : d.kind === "class" ? "کلاس" : "-";
      rows.push([DAY_NAMES[j], "", n, d.review.join(" + ") || "-", d.basket.join(" + ") || "-"]);
    });
  });
  return rows;
}

/** Safe file name from a program name (keeps Farsi letters). */
export const programFileName = (name: string) => (name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80) || "برنامه");

export type ProgramSummary = { weeks: number; firstTitle: string | null; lastTitle: string | null; firstNew: string | null; lastNew: string | null; newDays: number; classDays: number; restDays: number; empty: boolean };
export function summarize(weeks: ProgramWeek[]): ProgramSummary {
  const days = weeks.flatMap(w => w.days), news = days.filter(d => d.kind === "new" && d.new);
  return { weeks: weeks.length, firstTitle: weeks[0]?.title ?? null, lastTitle: weeks[weeks.length - 1]?.title ?? null, firstNew: news[0]?.new ?? null, lastNew: news[news.length - 1]?.new ?? null,
    newDays: news.length, classDays: days.filter(d => d.kind === "class").length, restDays: days.filter(d => d.kind === "rest").length, empty: !weeks.length };
}
