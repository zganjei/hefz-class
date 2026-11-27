// Run: bun test scripts/program-roundtrip.test.ts. Export a program to xlsx exactly like /api/programs?view=download, read it back through the importer's own code path.
import { expect, test } from "bun:test";
import * as XLSX from "xlsx";
import { parseProgramRows, type ProgramWeek, type ProgramDay } from "../src/lib/program-parse";
import { programToRows, programFileName } from "../src/lib/program-export";

const d = (kind: ProgramDay["kind"], nw: string | null = null, review: string[] = [], basket: string[] = []): ProgramDay => ({ kind, new: nw, review, basket });
const start: ProgramWeek[] = [
  { title: "سوره فتح · گام ۱", days: [d("new", "آیه ۱ سوره فتح", ["سوره ملک"], ["سوره نبا"]), d("new", "آیات ۲ تا ۵ سوره فتح", ["آیه ۱ سوره فتح", "آیات ۲ تا ۵ سوره فتح"]), d("class"), d("new", "سوره فتح"), d("class", null, ["آزمون"]), d("rest"), d("rest")] },
  { title: "هفتهٔ ۲", days: [d("new", "آیه ۶ سوره فتح", [], ["سوره ملک", "سوره نبا"]), d("rest"), d("rest"), d("rest"), d("rest"), d("rest"), d("class")] },
  { title: "مرور", days: Array.from({ length: 7 }, () => d("rest")) },
];

test("xlsx export re-imports to the same weeks", () => {
  const ws = XLSX.utils.aoa_to_sheet(programToRows(start)), wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "برنامه");
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  const back = XLSX.read(buf, { type: "array" });
  const rows = XLSX.utils.sheet_to_json<unknown[]>(back.Sheets[back.SheetNames[0]], { header: 1 });
  const r = parseProgramRows(rows);
  expect(r.weeks).toEqual(start);
  expect(r.warnings).toEqual([]);
});
test("file name keeps Farsi and drops path characters", () => {
  expect(programFileName("حفظ آفلاین/۱۴۰۵: الف")).toBe("حفظ آفلاین ۱۴۰۵ الف");
});
