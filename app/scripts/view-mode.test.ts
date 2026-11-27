// Run: bun test scripts/view-mode.test.ts
import { expect, test } from "bun:test";
import { resolveView, tabsForView, viewRolesOf } from "../src/lib/view-mode";
import { isNoteText } from "../src/components/hefz-plan";

test("viewRolesOf lists only roles with screens, highest first", () => {
  expect(viewRolesOf({ roles: ["memorizer", "admin", "supporter"] })).toEqual(["admin", "memorizer"]);
  expect(viewRolesOf({ roles: ["supporter"] })).toEqual([]);
});
test("resolveView: default highest; valid stored choice wins; stale choice falls back", () => {
  const u = { roles: ["memorizer", "admin"] };
  expect(resolveView(u, null)).toBe("admin");
  expect(resolveView(u, "memorizer")).toBe("memorizer");
  expect(resolveView(u, "teacher")).toBe("admin");
  expect(resolveView({ roles: ["supporter"] }, "admin")).toBe(null);
});
test("tabsForView: learner view shows only learner tabs", () => {
  expect(tabsForView("memorizer")).toEqual(["plan", "exams"]);
  expect(tabsForView("admin")).toEqual(["classes", "registry", "applications"]);
  expect(tabsForView(null)).toEqual([]);
});
test("isNoteText: exam cells are plain text, verse ranges are links", () => {
  expect(isNoteText("آزمون پایان درس")).toBe(true);
  expect(isNoteText("آیات ۱ تا ۹ سوره فتح")).toBe(false);
});
