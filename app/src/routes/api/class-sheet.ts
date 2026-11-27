import { createFileRoute } from "@tanstack/react-router";
import { bindings } from "../../lib/bindings.server";
import { currentUser, jsonError } from "../../lib/auth.server";
import { TEACHES_CLASS_SQL, canManageClass } from "../../lib/access.server";
import { stockholmToday } from "../../lib/plan.server";
import { programForClass, positionOf, setClassWeek } from "../../lib/program.server";
import { classPeople, personHistory, registryStudents, type Person } from "../../lib/class-people.server";

const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const numOrNull = (v: unknown) => { if (v === "" || v == null) return null; const n = Number(String(v).replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace("٫", ".").replace(",", ".")); return Number.isFinite(n) ? n : NaN; };

/** Where a class is in its own program today. Without a program there is no position (the teacher's free-text note is shown instead). */
async function programState(DB: any, classId: string, today: string) {
  const pos = positionOf(await programForClass(DB, classId), today);
  return { program: pos.program, hasProgram: pos.hasProgram, status: pos.status, weekCount: pos.weekCount, currentWeek: pos.currentWeek };
}

/** Teacher (own classes) and admin (all): the class sheets. GET without classId lists the cards; with classId returns one sheet (active learners, info, scores). Contains no national IDs. */
export const Route = createFileRoute("/api/class-sheet")({ server: { handlers: {
 GET: async ({ request }) => {
  const user = await currentUser(request); if (!user) return jsonError("ابتدا وارد شوید.", 401);
  if (user.role !== "admin" && user.role !== "teacher") return jsonError("دسترسی ندارید.", 403);
  const { DB } = bindings(); if (!DB) return jsonError("پایگاه داده آماده نیست.", 503);
  const today = stockholmToday(), classId = new URL(request.url).searchParams.get("classId");
  const registry = await registryStudents(DB);

  if (!classId) {
   const sel = "SELECT c.id,c.name,c.term,c.position_note,COALESCE((SELECT string_agg(ut.display_name, '، ' ORDER BY ut.display_name) FROM class_teachers ct JOIN users ut ON ut.id=ct.user_id WHERE ct.class_id=c.id AND ut.role='teacher' AND ut.active=1),'') AS teacher_name FROM classes c";
   const rows = (user.role === "admin" ? await DB.prepare(`${sel} ORDER BY c.created_at DESC`).all<any>() : await DB.prepare(`${sel} WHERE ${TEACHES_CLASS_SQL} ORDER BY c.created_at DESC`).bind(user.id, user.id).all<any>()).results || [];
   const cards = [];
   for (const c of rows) {
    const cp = await classPeople(DB, c.id, registry), st = await programState(DB, c.id, today);
    cards.push({ id: c.id, name: c.name, term: c.term || "", positionNote: c.position_note || "", teacher: c.teacher_name || "", activeCount: cp ? cp.people.filter(p => p.status === "active").length : 0, ...st });
   }
   return Response.json({ classes: cards });
  }

  if (!(await canManageClass(DB, user, classId))) return jsonError("دسترسی ندارید.", 403);
  const cp = await classPeople(DB, classId, registry); if (!cp) return jsonError("کلاس پیدا نشد.", 404);
  const meta = await DB.prepare("SELECT term,position_note FROM classes WHERE id=?").bind(classId).first<any>();
  const st = await programState(DB, classId, today), prog = await programForClass(DB, classId);
  const exams = (await DB.prepare("SELECT id,title,exam_date::text AS exam_date FROM class_exams WHERE class_id=? AND active=1 ORDER BY created_at").bind(classId).all<any>()).results || [];
  const att = (await DB.prepare("SELECT a.exam_id,a.user_id,a.score,a.max_score FROM class_exam_attempts a JOIN class_exams e ON e.id=a.exam_id WHERE e.class_id=? AND e.active=1").bind(classId).all<any>()).results || [];
  const manual = (await DB.prepare("SELECT id,registry_id,user_id,title,score,max_score,score_date::text AS score_date,note FROM class_manual_scores WHERE class_id=? ORDER BY score_date NULLS LAST, created_at").bind(classId).all<any>()).results || [];
  const mine = user.role === "admin" ? null : new Set(((await DB.prepare(`SELECT c.id FROM classes c WHERE ${TEACHES_CLASS_SQL}`).bind(user.id, user.id).all<any>()).results || []).map(r => r.id as string));
  const histories = new Map<string, Awaited<ReturnType<typeof personHistory>>>();
  for (const p of cp.people) histories.set(p.key, await personHistory(DB, p, mine));
  const learner = (p: Person) => ({
   history: histories.get(p.key) || [],
   key: p.key, name: p.name, registered: p.registered, phone: p.phone, email: p.email, code: p.code, level: p.level, education: p.education, hifzAmount: p.hifzAmount, tadabburAmount: p.tadabburAmount, notes: p.notes,
   digital: exams.filter(e => att.some(a => a.exam_id === e.id && a.user_id === p.userId)).map(e => { const a = att.find(x => x.exam_id === e.id && x.user_id === p.userId)!; return { title: e.title, date: e.exam_date, score: Number(a.score), max: Number(a.max_score) }; }),
   manual: manual.filter(m => (p.registryId && m.registry_id === p.registryId) || (p.userId && m.user_id === p.userId)).map(m => ({ id: m.id, title: m.title, score: Number(m.score), max: m.max_score == null ? null : Number(m.max_score), date: m.score_date, note: m.note || "" })),
  });
  return Response.json({ id: cp.cls.id, name: cp.cls.name, term: meta?.term || "", positionNote: meta?.position_note || "", ...st, programId: prog?.programId || "", programWeeks: prog ? prog.weeks.map(w => ({ week_number: w.week_number, title: w.title })) : [], active: cp.people.filter(p => p.status === "active").map(learner), left: cp.people.filter(p => p.status === "left").map(learner) });
 },
 POST: async ({ request }) => {
  const user = await currentUser(request); if (!user) return jsonError("ابتدا وارد شوید.", 401);
  if (user.role !== "admin" && user.role !== "teacher") return jsonError("دسترسی ندارید.", 403);
  const { DB } = bindings(); if (!DB) return jsonError("پایگاه داده آماده نیست.", 503);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null; if (!body) return jsonError("درخواست نامعتبر است.");
  const action = String(body.action || ""), classId = clip(body.classId, 80);

  if (action === "delete-score") {   // only a score of a class the user manages
   const id = clip(body.id, 80), row = await DB.prepare("SELECT class_id FROM class_manual_scores WHERE id=?").bind(id).first<{ class_id: string }>();
   if (!row || !(await canManageClass(DB, user, row.class_id))) return jsonError("دسترسی ندارید.", 403);
   await DB.prepare("DELETE FROM class_manual_scores WHERE id=?").bind(id).run();
   return Response.json({ ok: true });
  }
  if (!(await canManageClass(DB, user, classId))) return jsonError("دسترسی ندارید.", 403);

  if (action === "update-class") {
   await DB.prepare("UPDATE classes SET term=?,position_note=? WHERE id=?").bind(clip(body.term, 80) || null, clip(body.positionNote, 300) || null, classId).run();
   return Response.json({ ok: true });
  }

  if (action === "set-position") {   // the class's REAL week in its program: shifts the program start so that today falls in that week
   const prog = await programForClass(DB, classId);
   if (!prog) return jsonError("برنامه‌ای به این کلاس وصل نیست؛ مدیر باید اول یک برنامه به کلاس بدهد.", 409);
   const n = prog.weeks.length, today = stockholmToday(), cur = positionOf(prog, today).weekIndex;
   let target: number;
   if (body.delta !== undefined) { const d = Number(body.delta); if (d !== 1 && d !== -1) return jsonError("درخواست نامعتبر است."); target = Math.max(0, Math.min(n - 1, cur + d)); }
   else { const wn = Number(body.weekNumber); target = prog.weeks.findIndex(w => w.week_number === wn); if (target < 0) return jsonError("این هفته در برنامه‌ی کلاس نیست.", 404); }
   await setClassWeek(DB, classId, target, today);
   return Response.json({ ok: true, ...(await programState(DB, classId, today)) });
  }

  if (action === "add-score") {
   const title = clip(body.title, 120), score = numOrNull(body.score), max = numOrNull(body.max), date = clip(body.date, 10), note = clip(body.note, 300);
   if (!title) return jsonError("عنوان نمره را بنویسید.");
   if (score == null || Number.isNaN(score)) return jsonError("نمره را درست وارد کنید.");
   if (Number.isNaN(max as number)) return jsonError("سقف نمره را درست وارد کنید.");
   if (date && !isDate(date)) return jsonError("تاریخ نامعتبر است.");
   const cp = await classPeople(DB, classId), p = cp?.people.find(x => x.key === clip(body.person, 100));
   if (!p) return jsonError("این قرآن‌آموز در این کلاس نیست.", 404);
   const id = crypto.randomUUID();
   await DB.prepare("INSERT INTO class_manual_scores(id,class_id,registry_id,user_id,person_name,title,score,max_score,score_date,note,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?)").bind(id, classId, p.registryId, p.userId, p.name, title, score, max, date || null, note || null, user.id).run();
   return Response.json({ ok: true, id });
  }

  if (action === "leave" || action === "return") {   // append-only log; the reason is free text and stays with the class's staff
   const cp = await classPeople(DB, classId), p = cp?.people.find(x => x.key === clip(body.person, 100));
   if (!cp || !p) return jsonError("این قرآن‌آموز در این کلاس نیست.", 404);
   if (action === "leave" && p.status === "left") return jsonError("این قرآن‌آموز قبلاً به‌عنوان ترک‌کرده ثبت شده است.", 409);
   if (action === "return" && p.status === "active") return jsonError("این قرآن‌آموز ترک‌کرده نیست.", 409);
   const date = clip(body.date, 10) || stockholmToday();
   if (!isDate(date)) return jsonError("تاریخ نامعتبر است.");
   const reason = clip(body.reason, 1000);
   if (action === "leave" && !reason) return jsonError("دلیل ترک را بنویسید.");
   await DB.prepare("INSERT INTO learner_history(id,class_id,class_name,registry_id,user_id,person_name,event,term,position_note,reason,event_date,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(), classId, cp.cls.name, p.registryId, p.userId, p.name, action === "leave" ? "left" : "returned", clip(body.term, 80) || null, clip(body.position, 300) || null, reason || null, date, user.id).run();
   return Response.json({ ok: true, status: action === "leave" ? "left" : "active" });
  }
  return jsonError("درخواست نامعتبر است.");
 }
}}});
