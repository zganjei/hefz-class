// Run: bun test scripts/roles.test.ts   (pure logic + fake DB; nothing here talks to a real database)
import { expect, test } from "bun:test";
import { ALL_ROLES, checkRoleChange, hasRole, hasRoleSql, isAdmin, isStaff, isTeacher, isTeacherOnly, isMemorizer, normalizeRoles, primaryRole, rolesOf, rolesLabel } from "../src/lib/roles";
import { getRoles, setRoles, withRoles } from "../src/lib/roles.server";
import { canManageClass, canManageCourseRow } from "../src/lib/access.server";
import { mergeRegistryAccounts } from "../src/lib/registry-merge";

const u = (roles: string[], id = "u1") => ({ id, email: "x@y.z", display_name: "x", role: primaryRole(roles) as any, roles: normalizeRoles(roles) });

test("normalizeRoles: known only, deduped, canonical order", () => {
  expect(normalizeRoles(["admin", "bogus", "memorizer", "admin"])).toEqual(["memorizer", "admin"]);
  expect(normalizeRoles(undefined)).toEqual([]);
  expect(ALL_ROLES).toEqual(["memorizer", "teacher", "admin", "supporter"]);
});
test("primaryRole: admin > teacher > memorizer; supporter-only maps to memorizer (DB CHECK)", () => {
  expect(primaryRole(["memorizer", "teacher", "admin"])).toBe("admin");
  expect(primaryRole(["memorizer", "teacher"])).toBe("teacher");
  expect(primaryRole(["supporter", "teacher"])).toBe("teacher");
  expect(primaryRole(["memorizer"])).toBe("memorizer");
  expect(primaryRole(["supporter"])).toBe("memorizer");
});
test("hasRole / isStaff are unions of roles; supporter grants nothing", () => {
  expect(isStaff(u(["memorizer"]))).toBe(false);
  expect(isStaff(u(["supporter"]))).toBe(false);
  expect(isStaff(u(["teacher"]))).toBe(true);
  expect(isStaff(u(["admin"]))).toBe(true);
  expect(isStaff(u(["memorizer", "teacher"]))).toBe(true);
  expect(isAdmin(u(["teacher", "memorizer"]))).toBe(false);
  expect(isTeacher(u(["admin"]))).toBe(false);          // admin does NOT imply teacher
  expect(isTeacherOnly(u(["admin", "teacher"]))).toBe(false);
  expect(isTeacherOnly(u(["teacher", "memorizer"]))).toBe(true);
  expect(isMemorizer(u(["teacher", "memorizer"]))).toBe(true);
  expect(hasRole(null, "admin")).toBe(false);
});
test("legacy fallback: object with only `role` (no roles[]) still works", () => {
  expect(rolesOf({ role: "admin" })).toEqual(["admin"]);
  expect(isStaff({ role: "teacher" })).toBe(true);
  expect(isStaff({ role: "memorizer" })).toBe(false);
  expect(rolesLabel(["admin", "memorizer"])).toBe("قرآن‌آموز، مدیر");
});
test("hasRoleSql is a fixed literal predicate with legacy fallback", () => {
  expect(hasRoleSql("u", "teacher")).toContain("ur_teacher.role='teacher'");
  expect(hasRoleSql("u", "teacher")).toContain("u.role='teacher'");
  expect(hasRoleSql("u", "supporter")).not.toContain("u.role='supporter'");
  expect(() => hasRoleSql("u", "x'; DROP" as any)).toThrow();
});

// ---- canManageClass with a fake DB: classes c1 (taught by t1), c2 (taught by someone else)
function fakeDB() {
  return { prepare(sql: string) { let args: any[] = []; const st: any = {
    bind(...a: any[]) { args = a; return st; },
    async first() {
      if (/FROM classes WHERE id=\?/.test(sql)) return ["c1", "c2"].includes(args[0]) ? { ok: 1 } : null;
      if (/FROM classes c WHERE c\.id=\?/.test(sql)) { const [cid, uid] = args; return cid === "c1" && uid === "t1" ? { ok: 1 } : null; }   // only t1 teaches c1
      return null;
    }, async all() { return { results: [] }; }, async run() { return { success: true, meta: { changes: 1 } }; } }; return st; } } as any;
}
test("canManageClass: admin any class, teacher own only, learner/supporter never", async () => {
  const DB = fakeDB();
  expect(await canManageClass(DB, u(["admin"]), "c2")).toBe(true);
  expect(await canManageClass(DB, u(["admin"]), "nope")).toBe(false);
  expect(await canManageClass(DB, u(["teacher"], "t1"), "c1")).toBe(true);
  expect(await canManageClass(DB, u(["teacher"], "t1"), "c2")).toBe(false);
  expect(await canManageClass(DB, u(["memorizer"], "t1"), "c1")).toBe(false);
  expect(await canManageClass(DB, u(["supporter"], "t1"), "c1")).toBe(false);
});
test("canManageClass: admin+teacher = admin powers; teacher+memorizer = teacher powers only", async () => {
  const DB = fakeDB();
  expect(await canManageClass(DB, u(["admin", "teacher"], "t9"), "c2")).toBe(true);
  expect(await canManageClass(DB, u(["teacher", "memorizer"], "t1"), "c1")).toBe(true);
  expect(await canManageClass(DB, u(["teacher", "memorizer"], "t1"), "c2")).toBe(false);
  expect(await canManageClass(DB, u(["teacher", "memorizer"], "other"), "c1")).toBe(false);
  expect(await canManageClass(DB, u(["admin", "memorizer"], "z"), "c2")).toBe(true);   // admin who is also a learner keeps admin
  expect(await canManageClass(DB, u(["memorizer", "supporter"], "t1"), "c1")).toBe(false);
});
test("canManageCourseRow: multi-role", async () => {
  const DB = fakeDB();
  expect(await canManageCourseRow(DB, u(["admin", "teacher"]), { class_id: null, created_by: "x" })).toBe(true);
  expect(await canManageCourseRow(DB, u(["teacher", "memorizer"], "t1"), { class_id: null, created_by: "t1" })).toBe(true);
  expect(await canManageCourseRow(DB, u(["teacher", "memorizer"], "t1"), { class_id: "c2", created_by: "t1" })).toBe(false);
  expect(await canManageCourseRow(DB, u(["memorizer"], "t1"), { class_id: null, created_by: "t1" })).toBe(false);
});

// ---- guards for changing roles
test("checkRoleChange guards", async () => {
  const some = async () => 1, none = async () => 0;
  expect(await checkRoleChange(["teacher"], [], false, some)).toContain("دست‌کم یک نقش");
  expect(await checkRoleChange(["admin", "teacher"], ["teacher"], true, some)).toContain("خودتان");       // own admin role
  expect(await checkRoleChange(["admin"], ["teacher"], false, none)).toContain("آخرین مدیر");             // last admin
  expect(await checkRoleChange(["admin"], ["teacher"], false, some)).toBeNull();                         // another admin exists
  expect(await checkRoleChange(["teacher"], ["teacher", "admin"], true, none)).toBeNull();               // adding admin is fine
  expect(await checkRoleChange(["admin", "memorizer"], ["admin"], true, none)).toBeNull();               // removing a non-admin role from self is fine
});

// ---- getRoles / setRoles with a recording fake DB
test("getRoles: user_roles first, then legacy fallback; setRoles syncs legacy primary", async () => {
  const log: { sql: string; args: any[] }[] = []; let rows: any[] = [];
  const DB: any = { prepare(sql: string) { let args: any[] = []; const st: any = { bind(...a: any[]) { args = a; return st; },
    async all() { return { results: rows }; }, async first() { return { role: "teacher" }; }, async run() { log.push({ sql, args }); return { success: true, meta: { changes: 1 } }; } }; return st; } };
  rows = [{ role: "teacher" }, { role: "memorizer" }];
  expect(await getRoles(DB, "x")).toEqual(["memorizer", "teacher"]);
  rows = [];
  expect(await getRoles(DB, "x", "admin")).toEqual(["admin"]);      // no user_roles rows: legacy role
  expect((await withRoles(DB, { id: "x", role: "memorizer" })).roles).toEqual(["memorizer"]);
  expect(await setRoles(DB, "x", ["supporter", "teacher", "teacher"])).toEqual(["teacher", "supporter"]);
  const upd = log.find(l => l.sql.startsWith("UPDATE users SET role"))!;
  expect(upd.args).toEqual(["teacher", "x"]);
  expect(log.some(l => l.sql.includes("NOT IN (?,?)") && l.args.join() === "x,teacher,supporter")).toBe(true);
  await expect(setRoles(DB, "x", [])).rejects.toThrow();
});

// ---- «دفتر → اساتید / پشتیبان‌ها» merge
test("registry teachers: only accounts holding the teacher role; admins never appear merely by teaching a class", () => {
  const people: any[] = [
    { id: "r1", kind: "teacher", full_name: "سمیه حبیبی", class_name: "", status: "active" },
    { id: "r2", kind: "student", full_name: "الف", class_name: "کلاس شهید", teacher_name: "زهراسادات رضایی", status: "active" },
    { id: "r3", kind: "student", full_name: "ب", class_name: "کلاس شهید", teacher_name: "نامشخص", status: "active" },
  ];
  // accounts passed in are ALREADY filtered by the SQL to teacher-role holders: Zeinab (admin only, attached to classes) is simply not in the list
  const teacherAccs = [{ id: "a1", display_name: "حبیبی", phone: "0912", email: "h@x.com" }, { id: "a2", display_name: "استاد رضایی", phone: null, email: "1@phone.invalid" }, { id: "a3", display_name: "سمیه حبیبی" }];
  const links = [{ uid: "zeinab", cname: "کلاس الف" }, { uid: "zeinab", cname: "کلاس ب" }, { uid: "a1", cname: "کلاس شهید" }];
  const no = mergeRegistryAccounts(people, teacherAccs, [], links);
  expect(no).toBe(1);
  const names = people.filter(p => p.kind === "teacher").map(p => p.full_name);
  expect(names).toContain("حبیبی");                 // teacher-role account appears with no search filter
  expect(names).toContain("استاد رضایی");
  expect(names).toContain("سمیه حبیبی");           // registry row
  expect(names).toContain("زهراسادات رضایی");      // derived from learners' teacher field
  expect(names.some(n => n.includes("زینب"))).toBe(false);
  expect(names.filter(n => n === "سمیه حبیبی").length).toBe(1);   // account a3 merged into the registry row, no duplicate
  const reg = people.find(p => p.id === "r1"); expect(reg.sources).toEqual(["registry", "account"]); expect(reg.has_account).toBe(true);
  expect(people.find(p => p.id === "acct:a2").email).toBe("");   // placeholder phone emails hidden
});
test("registry supporters: registry rows + supporter-role accounts, no duplicates by normalized name", () => {
  const people: any[] = [{ id: "s1", kind: "supporter", full_name: "خانم مریم احمدی", status: "active" }];
  mergeRegistryAccounts(people, [], [{ id: "p1", display_name: "مریم احمدی" }, { id: "p2", display_name: "علی کریمی", phone: "0935" }], []);
  const sup = people.filter(p => p.kind === "supporter");
  expect(sup.map(p => p.full_name).sort()).toEqual(["خانم مریم احمدی", "علی کریمی"].sort());
  expect(sup.find(p => p.id === "s1").sources).toEqual(["registry", "account"]);
  expect(sup.find(p => p.id === "acct:p2").sources).toEqual(["account"]);
});
