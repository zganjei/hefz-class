import { createFileRoute } from "@tanstack/react-router";
import { bindings } from "../../lib/bindings.server";
import { currentUser, jsonError } from "../../lib/auth.server";
import { normClassName as norm } from "../../lib/class-name";

/** Distinct registry class names (students), grouped by normalised name, split into new vs already existing classes. */
async function compute(DB: any) {
  const reg = await DB.prepare("SELECT class_name FROM registry_people WHERE kind='student' AND status='active' AND class_name IS NOT NULL AND TRIM(class_name)<>''").all();
  const groups = new Map<string, { name: string; students: number }>();
  for (const r of (reg.results || []) as { class_name: string }[]) {
    const display = String(r.class_name).replace(/\s+/g, " ").trim().slice(0, 100), key = norm(display);
    if (!key) continue;
    const g = groups.get(key); if (g) g.students++; else groups.set(key, { name: display, students: 1 });
  }
  const existing = new Set(((await DB.prepare("SELECT name FROM classes").all()).results || []).map((c: any) => norm(c.name)));
  const toCreate: { name: string; students: number }[] = [], already: { name: string; students: number }[] = [];
  for (const [key, g] of groups) (existing.has(key) ? already : toCreate).push(g);
  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "fa");
  return { toCreate: toCreate.sort(byName), already: already.sort(byName) };
}

const num = (v: any) => Number(v?.n ?? 0);
/** What an EMPTY-class delete would remove, and what blocks it. Only the requesting admin may be a member; no other data may exist. */
async function inspectClass(DB: any, classId: string, adminId: string) {
  const cls = await DB.prepare("SELECT id,name FROM classes WHERE id=?").bind(classId).first();
  if (!cls) return null;
  const c = async (sql: string, ...a: unknown[]) => num(await DB.prepare(sql).bind(...a).first());
  const otherMembers = await c("SELECT COUNT(*) AS n FROM class_members WHERE class_id=? AND user_id<>?", classId, adminId);
  const otherTeachers = await c("SELECT COUNT(*) AS n FROM class_teachers ct JOIN users u ON u.id=ct.user_id WHERE ct.class_id=? AND u.role='teacher'", classId);
  const exams = await c("SELECT COUNT(*) AS n FROM class_exams WHERE class_id=?", classId);
  const assignments = await c("SELECT COUNT(*) AS n FROM assignments WHERE class_id=?", classId);
  const reports = await c("SELECT COUNT(*) AS n FROM reports WHERE class_id=?", classId);
  const program = await c("SELECT COUNT(*) AS n FROM classes WHERE id=? AND program_id IS NOT NULL", classId);
  const courseData = await c("SELECT (SELECT COUNT(*) FROM course_weeks w JOIN courses co ON co.id=w.course_id WHERE co.class_id=?) + (SELECT COUNT(*) FROM course_enrollments WHERE class_id=?) AS n", classId, classId);
  const emptyCourses = await c("SELECT COUNT(*) AS n FROM courses WHERE class_id=?", classId);
  const blockers: string[] = [];
  if (otherMembers) blockers.push(`${otherMembers} عضو (غیر از شما)`);
  if (otherTeachers) blockers.push("معلم دارد");
  if (exams) blockers.push(`${exams} آزمون`);
  if (assignments) blockers.push(`${assignments} برنامه‌ی ثبت‌شده`);
  if (reports) blockers.push(`${reports} گزارش`);
  if (program) blockers.push("برنامه‌ی مطالعه به آن وصل است");
  if (courseData) blockers.push("اطلاعات دوره/هفته دارد");
  return { id: cls.id as string, name: cls.name as string, blockers, willRemove: ["خود کلاس", ...(await c("SELECT COUNT(*) AS n FROM class_members WHERE class_id=? AND user_id=?", classId, adminId) ? ["عضویت شما در کلاس"] : []), ...(emptyCourses ? [`${emptyCourses} دوره‌ی خالی`] : [])] };
}

export const Route = createFileRoute("/api/registry-classes")({ server: { handlers: {
  // Admin-only preview: nothing is written.
  GET: async ({ request }) => {
    const user = await currentUser(request); if (!user) return jsonError("ابتدا وارد شوید.", 401);
    if (user.role !== "admin") return jsonError("فقط مدیر دسترسی دارد.", 403);
    const { DB } = bindings(); if (!DB) return jsonError("پایگاه داده آماده نیست.", 503);
    const inspect = new URL(request.url).searchParams.get("inspect");
    if (inspect) { const r = await inspectClass(DB, inspect, user.id); return r ? Response.json(r) : jsonError("کلاس پیدا نشد.", 404); }
    if (new URL(request.url).searchParams.get("classes")) { const rows = await DB.prepare("SELECT id,name FROM classes ORDER BY name").all(); return Response.json({ classes: rows.results || [] }); }
    const { toCreate, already } = await compute(DB);
    return Response.json({ toCreate: toCreate, already });
  },
  // Admin-only, idempotent: creates the missing classes (admin as owner), recomputed server-side so a double press creates nothing twice.
  POST: async ({ request }) => {
    const user = await currentUser(request); if (!user) return jsonError("ابتدا وارد شوید.", 401);
    if (user.role !== "admin") return jsonError("فقط مدیر دسترسی دارد.", 403);
    const { DB } = bindings(); if (!DB) return jsonError("پایگاه داده آماده نیست.", 503);
    const { toCreate } = await compute(DB);
    const created: string[] = [];
    for (const c of toCreate) {
      const id = crypto.randomUUID();
      await DB.prepare("INSERT INTO classes(id,name,description,teacher_id) VALUES(?,?,?,?)").bind(id, c.name, "", user.id).run();
      await DB.prepare("INSERT INTO class_teachers(class_id,user_id,added_by) VALUES(?,?,?) ON CONFLICT DO NOTHING").bind(id, user.id, user.id).run();
      created.push(c.name);
    }
    return Response.json({ created });
  },
  // Admin-only: delete an EMPTY class (re-checked here; the UI asks for a second tap first). Never deletes a class that has real data.
  DELETE: async ({ request }) => {
    const user = await currentUser(request); if (!user) return jsonError("ابتدا وارد شوید.", 401);
    if (user.role !== "admin") return jsonError("فقط مدیر دسترسی دارد.", 403);
    const { DB } = bindings(); if (!DB) return jsonError("پایگاه داده آماده نیست.", 503);
    const body = await request.json().catch(() => null) as { classId?: unknown } | null;
    const classId = typeof body?.classId === "string" ? body.classId : "";
    if (!classId) return jsonError("کلاس را انتخاب کنید.");
    const r = await inspectClass(DB, classId, user.id);
    if (!r) return jsonError("کلاس پیدا نشد.", 404);
    if (r.blockers.length) return jsonError("این کلاس خالی نیست و حذف نشد: " + r.blockers.join("، ") + ".", 409);
    await DB.prepare("DELETE FROM courses WHERE class_id=?").bind(classId).run();
    await DB.prepare("DELETE FROM class_members WHERE class_id=?").bind(classId).run();
    await DB.prepare("DELETE FROM class_teachers WHERE class_id=?").bind(classId).run();
    await DB.prepare("DELETE FROM classes WHERE id=?").bind(classId).run();
    return Response.json({ deleted: r.name });
  }
}}});
