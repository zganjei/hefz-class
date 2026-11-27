// Run: bun test scripts/registry-search.test.ts
import { expect, test } from "bun:test";
import { personMatches } from "../src/lib/registry-search";

const zahra = { full_name: "زهرا رضایی", class_name: "کلاس شهید آرمان علی وردی", teacher_name: "سرکار خانم احمدی", code: "A12", phone: "۰۹۱۲۳۴۵۶۷۸۹" };
const other = { full_name: "الناز تشکری", class_name: "کلاس شهید آرمان علی وردی", teacher_name: "استاد محمدی", code: "B7", phone: "09350000000" };
test("name match filters others out", () => { expect(personMatches(zahra, "زهرا")).toBe(true); expect(personMatches(other, "زهرا")).toBe(false); });
test("Arabic letters and ZWNJ", () => { expect(personMatches({ full_name: "علي كريمی" }, "علی کریمی")).toBe(true); expect(personMatches({ full_name: "می‌رزایی" }, "می رزایی")).toBe(true); });
test("teacher title prefixes", () => { expect(personMatches(zahra, "استاد احمدی")).toBe(true); expect(personMatches(zahra, "خانم احمدی")).toBe(true); expect(personMatches(other, "احمدی")).toBe(false); });
test("class, code, phone digits (Persian/Arabic/latin)", () => { expect(personMatches(zahra, "آرمان")).toBe(true); expect(personMatches(zahra, "a12")).toBe(true); expect(personMatches(zahra, "۰۹۱۲۳")).toBe(true); expect(personMatches(zahra, "٠٩١٢٣")).toBe(true); expect(personMatches(zahra, "09123")).toBe(true); expect(personMatches(other, "09123")).toBe(false); });
test("hidden fields are not searched", () => { expect(personMatches({ full_name: "الناز", ...({ notes: "زهرا", extra: "زهرا" } as object) }, "زهرا")).toBe(false); });
test("empty query matches all", () => { expect(personMatches(other, "  ")).toBe(true); });

import { personMatch, rankPeople } from "../src/lib/registry-search";
import { displayClassName, displayClassNames } from "../src/lib/teacher-name";
const byTeacher = { full_name: "الناز تشکری", class_name: "کلاس شهید آرمان علی وردی", teacher_name: "زهراسادات رضایی" };
test("name match ranks as name group; teacher-only match is the 'other' group with a reason", () => {
  expect(personMatch(zahra, "زهرا")?.group).toBe("name");
  const m = personMatch(byTeacher, "زهرا"); expect(m?.group).toBe("other"); expect(m?.reasons).toEqual(["استاد: زهراسادات رضایی"]);
  const r = rankPeople([byTeacher, other, zahra], "زهرا"); expect(r.main).toEqual([zahra]); expect(r.other.map(o => o.p)).toEqual([byTeacher]);
});
test("multi-word: all tokens must match, more name tokens rank higher", () => {
  const a = { full_name: "زهرا رضایی", teacher_name: "x" }, b = { full_name: "زهرا کریمی", teacher_name: "رضایی" };
  expect(rankPeople([b, a], "زهرا رضایی").main).toEqual([a, b]);
  expect(personMatch(a, "زهرا نامربوط")).toBeNull();
});
test("class-only match shows class reason without leading «کلاس»", () => { expect(personMatch(byTeacher, "آرمان")?.reasons).toEqual(["کلاس: شهید آرمان علی وردی"]); expect(personMatches(byTeacher, "کلاس شهید")).toBe(true); });
test("displayClassName strips only a leading «کلاس »", () => {
  expect(displayClassName("کلاس شهید آرمان علی وردی")).toBe("شهید آرمان علی وردی");
  expect(displayClassName("كلاس‌ شهید")).toBe("شهید");
  expect(displayClassName("گروه شهید موسوی")).toBe("شهید موسوی");
  expect(displayClassName("گروه‌ شهید موسوی")).toBe("شهید موسوی");
  expect(displayClassName("کلاس گروه شهید موسوی")).toBe("شهید موسوی");
  expect(displayClassName("شهید گروه دوم")).toBe("شهید گروه دوم");
  expect(displayClassName("گروه")).toBe("گروه");
  expect(displayClassName("شهید کلاس دوم")).toBe("شهید کلاس دوم");
  expect(displayClassName("کلاس")).toBe("کلاس");
});

import { displayTeacherName } from "../src/lib/teacher-name";
test("displayTeacherName strips leading titles only", () => {
  expect(displayTeacherName("سرکار خانم احمدی")).toBe("احمدی");
  expect(displayTeacherName("سرکار‌خانم زهرا رضایی")).toBe("زهرا رضایی");
  expect(displayTeacherName("سركار خانم احمدی")).toBe("احمدی");
  expect(displayTeacherName("خانم زهرا رضایی")).toBe("زهرا رضایی");
  expect(displayTeacherName("استاد محمدی")).toBe("محمدی");
  expect(displayTeacherName("آقای محمدی")).toBe("محمدی");
  expect(displayTeacherName("آقاي محمدی")).toBe("محمدی");
  expect(displayTeacherName("جناب آقای محمدی")).toBe("محمدی");
  expect(displayTeacherName("سرکار  خانم احمدی")).toBe("احمدی");
  expect(displayTeacherName("زهرا خانم رضایی")).toBe("زهرا خانم رضایی");
  expect(displayTeacherName("خانمی")).toBe("خانمی");
  expect(displayTeacherName("خانم")).toBe("خانم");
  expect(displayTeacherName("سرکار خانم")).toBe("سرکار خانم");
  expect(displayTeacherName(undefined)).toBe("");
  expect(personMatch({ full_name: "الناز", teacher_name: "سرکار خانم احمدی" }, "احمدی")?.reasons).toEqual(["استاد: احمدی"]);
});
test("«گروه» is display-only: searching with or without it still matches", () => {
  const g = { full_name: "الناز", class_name: "گروه شهید موسوی" };
  expect(personMatches(g, "گروه شهید موسوی")).toBe(true); expect(personMatches(g, "شهید موسوی")).toBe(true);
  expect(personMatch(g, "موسوی")?.reasons).toEqual(["کلاس: شهید موسوی"]);
});
test("displayClassNames disambiguates collapsed duplicates", () => {
  expect(displayClassNames(["کلاس شهید علی", "گروه شهید علی", "شهید علی"])).toEqual(["شهید علی", "گروه شهید علی", "شهید علی (۲)"]);
  expect(displayClassNames(["شهید علی", "کلاس شهید علی"])).toEqual(["شهید علی", "کلاس شهید علی"]);
  expect(displayClassNames(["الف", "ب"])).toEqual(["الف", "ب"]);
});
