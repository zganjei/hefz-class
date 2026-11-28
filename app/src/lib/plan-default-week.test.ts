// Run: bun test src/lib/plan-default-week.test.ts
import { describe, expect, test } from "bun:test";
import { defaultClassWeek } from "./plan.server";

const weeks = Array.from({ length: 40 }, (_, i) => ({ week_number: i + 1, start_date: `2026-01-${String((i % 28) + 1).padStart(2, "0")}` }));
const base = { requested: null, hasProgram: false, currentWeek: 39, lastDatedWeek: 39, weeks, today: "2026-12-01" };
describe("defaultClassWeek", () => {
  test("class without a program ignores the global plan's current week (regression: opened on week 39)", () => {
    expect(defaultClassWeek(base)).toBe(1);
  });
  test("class with a program opens on its own current week", () => {
    expect(defaultClassWeek({ ...base, hasProgram: true, currentWeek: 7 })).toBe(7);
  });
  test("explicit week wins", () => {
    expect(defaultClassWeek({ ...base, requested: 12 })).toBe(12);
  });
  test("program ended: falls back to the last dated week", () => {
    expect(defaultClassWeek({ ...base, hasProgram: true, currentWeek: null, lastDatedWeek: 20 })).toBe(20);
  });
});
