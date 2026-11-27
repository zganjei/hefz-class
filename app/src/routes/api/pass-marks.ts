import { createFileRoute } from "@tanstack/react-router";
import { bindings } from "../../lib/bindings.server";
import { currentUser, jsonError } from "../../lib/auth.server";
import { canManageClass } from "../../lib/access.server";
import { classPeople } from "../../lib/class-people.server";
import { CRITERION_KEYS } from "../../lib/pass-marks";

const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");

/** Hand-entered pass/fail (قبول/رد) per class → group → criterion → learner. Teachers (own classes) and admins (any class). Not entered = no row. */
export const Route = createFileRoute("/api/pass-marks")({ server: { handlers: {
 GET: async ({ request }) => {
  const user = await currentUser(request); if (!user) return jsonError("ابتدا وارد شوید.", 401);
  if (user.role !== "admin" && user.role !== "teacher") return jsonError("دسترسی ندارید.", 403);
  const { DB } = bindings(); if (!DB) return jsonError("پایگاه داده آماده نیست.", 503);
  const classId = new URL(request.url).searchParams.get("classId");
  if (!(await canManageClass(DB, user, classId))) return jsonError("دسترسی ندارید.", 403);
  const cp = await classPeople(DB, classId!); if (!cp) return jsonError("کلاس پیدا نشد.", 404);
  const groups = (await DB.prepare("SELECT id,title FROM class_pass_groups WHERE class_id=? ORDER BY position,created_at").bind(classId).all<any>()).results || [];
  const rows = (await DB.prepare("SELECT m.group_id,m.criterion,m.registry_id,m.user_id,m.status,m.note,m.source,m.updated_at::text AS at,u.display_name AS by FROM class_pass_marks m LEFT JOIN users u ON u.id=m.updated_by WHERE m.class_id=?").bind(classId).all<any>()).results || [];
  const people = cp.people.filter(p => p.status === "active");
  const marks = [] as { groupId: string; criterion: string; person: string; status: string; note: string; source: string; by: string; at: string }[];
  for (const r of rows) { const p = people.find(x => (x.registryId && x.registryId === r.registry_id) || (x.userId && x.userId === r.user_id)); if (p) marks.push({ groupId: r.group_id, criterion: r.criterion, person: p.key, status: r.status, note: r.note || "", source: r.source, by: r.by || "", at: r.at }); }
  return Response.json({ groups, learners: people.map(p => ({ key: p.key, name: p.name })), marks });
 },
 POST: async ({ request }) => {
  const user = await currentUser(request); if (!user) return jsonError("ابتدا وارد شوید.", 401);
  if (user.role !== "admin" && user.role !== "teacher") return jsonError("دسترسی ندارید.", 403);
  const { DB } = bindings(); if (!DB) return jsonError("پایگاه داده آماده نیست.", 503);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null; if (!body) return jsonError("درخواست نامعتبر است.");
  const action = String(body.action || ""), classId = clip(body.classId, 80);
  if (!(await canManageClass(DB, user, classId))) return jsonError("دسترسی ندارید.", 403);

  if (action === "add-group") {
   const title = clip(body.title, 80).replace(/\s+/g, " ");
   if (!title) return jsonError("عنوان گروه را بنویسید.");
   const dup = await DB.prepare("SELECT id FROM class_pass_groups WHERE class_id=? AND title=?").bind(classId, title).first<{ id: string }>();
   if (dup) return Response.json({ ok: true, id: dup.id, existed: true });
   const pos = await DB.prepare("SELECT COALESCE(MAX(position),0)+1 AS n FROM class_pass_groups WHERE class_id=?").bind(classId).first<{ n: number }>();
   const id = crypto.randomUUID();
   await DB.prepare("INSERT INTO class_pass_groups(id,class_id,title,position,created_by) VALUES(?,?,?,?,?) ON CONFLICT DO NOTHING").bind(id, classId, title, Number(pos?.n || 1), user.id).run();
   return Response.json({ ok: true, id });
  }

  const gid = clip(body.groupId, 80);
  const group = await DB.prepare("SELECT id FROM class_pass_groups WHERE id=? AND class_id=?").bind(gid, classId).first();
  if (!group) return jsonError("این گروه در این کلاس نیست.", 404);

  if (action === "delete-group") {   // its marks go with it; the client asks for confirmation first
   await DB.prepare("DELETE FROM class_pass_groups WHERE id=? AND class_id=?").bind(gid, classId).run();
   return Response.json({ ok: true });
  }

  if (action === "set-mark" || action === "set-note") {
   const criterion = clip(body.criterion, 20);
   if (!CRITERION_KEYS.includes(criterion)) return jsonError("معیار نامعتبر است.");
   const cp = await classPeople(DB, classId), p = cp?.people.find(x => x.key === clip(body.person, 100));
   if (!p) return jsonError("این قرآن‌آموز در این کلاس نیست.", 404);
   const ex = await DB.prepare("SELECT id,status,source FROM class_pass_marks WHERE group_id=? AND criterion=? AND ((registry_id IS NOT NULL AND registry_id=?) OR (user_id IS NOT NULL AND user_id=?))").bind(gid, criterion, p.registryId, p.userId).first<any>();
   if (action === "set-note") {
    if (!ex) return jsonError("اول قبول یا رد را ثبت کنید، بعد یادداشت بنویسید.", 409);
    await DB.prepare("UPDATE class_pass_marks SET note=?,updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(clip(body.note, 300) || null, user.id, ex.id).run();
    return Response.json({ ok: true });
   }
   const status = String(body.status || "");
   if (status === "none") { if (ex) await DB.prepare("DELETE FROM class_pass_marks WHERE id=?").bind(ex.id).run(); return Response.json({ ok: true }); }
   if (status !== "pass" && status !== "fail") return jsonError("وضعیت نامعتبر است.");
   if (ex) await DB.prepare("UPDATE class_pass_marks SET status=?,source='manual',updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(status, user.id, ex.id).run();
   else await DB.prepare("INSERT INTO class_pass_marks(id,class_id,group_id,criterion,person_key,registry_id,user_id,person_name,status,source,updated_by) VALUES(?,?,?,?,?,?,?,?,?,'manual',?) ON CONFLICT DO NOTHING").bind(crypto.randomUUID(), classId, gid, criterion, p.key, p.registryId, p.userId, p.name, status, user.id).run();
   return Response.json({ ok: true });
  }
  return jsonError("درخواست نامعتبر است.");
 }
}}});
