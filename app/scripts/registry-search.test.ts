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
