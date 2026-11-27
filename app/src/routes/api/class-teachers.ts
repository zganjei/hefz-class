import { createFileRoute } from "@tanstack/react-router";
import { bindings } from "../../lib/bindings.server";
import { currentUser, jsonError } from "../../lib/auth.server";

// Admin-only management of which teachers may manage a class (and therefore its courses, reports, assignments).
export const Route = createFileRoute("/api/class-teachers")({ server: { handlers: {
 GET: async ({ request }) => {
  const user = await currentUser(request); if (!user) return jsonError("ابتدا وارد شوید.", 401);
  if (user.role !== "admin") return jsonError("فقط مدیر می‌تواند اساتید کلاس را ببیند.", 403);
  const { DB } = bindings(); if (!DB) return jsonError("پایگاه داده آماده نیست.", 503);
  const classId = new URL(request.url).searchParams.get("classId") || "";
  if (!classId) return jsonError("کلاس را مشخص کنید.");
  const cls = await DB.prepare("SELECT id,teacher_id FROM classes WHERE id=?").bind(classId).first<any>();
  if (!cls) return jsonError("کلاس پیدا نشد.", 404);
  const teachers = await DB.prepare("SELECT u.id,u.display_name,u.email,u.role,(u.id=?) AS is_primary FROM class_teachers t JOIN users u ON u.id=t.user_id WHERE t.class_id=? AND u.active=1 ORDER BY u.display_name").bind(cls.teacher_id, classId).all<any>();
  const pending = await DB.prepare("SELECT email,expires_at FROM invitations WHERE class_id=? AND role='teacher' AND used_at IS NULL ORDER BY expires_at DESC").bind(classId).all<any>();
  return Response.json({ primaryTeacherId: cls.teacher_id, teachers: teachers.results || [], pendingInvitations: pending.results || [] });
 },
 POST: async ({ request }) => {
  const user = await currentUser(request); if (!user) return jsonError("ابتدا وارد شوید.", 401);
  if (user.role !== "admin") return jsonError("فقط مدیر می‌تواند استاد به کلاس اضافه کند.", 403);
  const { DB } = bindings(); if (!DB) return jsonError("پایگاه داده آماده نیست.", 503);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const classId = typeof body?.classId === "string" ? body.classId : "";
  const userId = typeof body?.userId === "string" ? body.userId : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!classId || (!userId && !email)) return jsonError("کلاس و استاد (شناسه یا ایمیل) را مشخص کنید.");
  const cls = await DB.prepare("SELECT id FROM classes WHERE id=?").bind(classId).first(); if (!cls) return jsonError("کلاس پیدا نشد.", 404);
  const teacher = userId
    ? await DB.prepare("SELECT id FROM users WHERE id=? AND role='teacher' AND active=1").bind(userId).first<any>()
    : await DB.prepare("SELECT id FROM users WHERE email=? AND role='teacher' AND active=1").bind(email).first<any>();
  if (teacher) {
    await DB.prepare("INSERT INTO class_teachers(class_id,user_id,added_by) VALUES(?,?,?) ON CONFLICT DO NOTHING").bind(classId, teacher.id, user.id).run();
    return Response.json({ added: true, userId: teacher.id });
  }
  if (userId) return jsonError("استاد فعال پیدا نشد.", 404);
  // Teacher has not registered yet: attach the pending teacher invitation(s) for that email to this class.
  const res = await DB.prepare("UPDATE invitations SET class_id=? WHERE email=? AND role='teacher' AND used_at IS NULL AND expires_at>? AND class_id IS NULL").bind(classId, email, new Date().toISOString()).run();
  if (!res.meta.changes) return jsonError("برای این ایمیل نه استاد ثبت‌نام‌شده و نه دعوت‌نامه‌ی معتبرِ بدون کلاس وجود دارد.", 404);
  return Response.json({ invitationAttached: true });
 },
 DELETE: async ({ request }) => {
  const user = await currentUser(request); if (!user) return jsonError("ابتدا وارد شوید.", 401);
  if (user.role !== "admin") return jsonError("فقط مدیر می‌تواند استاد را از کلاس حذف کند.", 403);
  const { DB } = bindings(); if (!DB) return jsonError("پایگاه داده آماده نیست.", 503);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const classId = typeof body?.classId === "string" ? body.classId : "", userId = typeof body?.userId === "string" ? body.userId : "";
  if (!classId || !userId) return jsonError("کلاس و استاد را مشخص کنید.");
  const cls = await DB.prepare("SELECT id,teacher_id FROM classes WHERE id=?").bind(classId).first<any>(); if (!cls) return jsonError("کلاس پیدا نشد.", 404);
  if (cls.teacher_id === userId) return jsonError("استاد اصلی کلاس را نمی‌توان حذف کرد.", 409);
  await DB.prepare("DELETE FROM class_teachers WHERE class_id=? AND user_id=?").bind(classId, userId).run();
  return Response.json({ removed: true });
 }
}}});
