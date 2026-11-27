import { createFileRoute } from "@tanstack/react-router";
import { bindings } from "../../lib/bindings.server";
import { currentUser, jsonError } from "../../lib/auth.server";
import { canManageClass, TEACHES_CLASS_SQL } from "../../lib/access.server";
import { isIsoDate } from "../../lib/plan.server";

const KINDS = ["hifz", "tadabbur", "vocabulary", "final"];
const clip = (v: unknown, max: number) => (typeof v === "string" || typeof v === "number" ? String(v).trim().slice(0, max) : "");

/** Class exams. Staff (class's teachers, admins) create exams and questions; learners of the class take them once, auto-scored. Answer keys never reach learners. */
export const Route = createFileRoute("/api/exams")({ server: { handlers: {
 GET: async ({ request }) => {
  const user = await currentUser(request); if (!user) return jsonError("ابتدا وارد شوید.", 401);
  const { DB } = bindings(); if (!DB) return jsonError("پایگاه داده آماده نیست.", 503);
  const url = new URL(request.url), examId = url.searchParams.get("examId"), staff = user.role === "admin" || user.role === "teacher";

  if (examId) {
   const ex = await DB.prepare("SELECT e.id,e.class_id,e.title,e.exam_date::text AS exam_date,c.name AS class_name FROM class_exams e JOIN classes c ON c.id=e.class_id WHERE e.id=? AND e.active=1").bind(examId).first<any>();
   if (!ex) return jsonError("آزمون پیدا نشد.", 404);
   if (staff) {
    if (!(await canManageClass(DB, user, ex.class_id))) return jsonError("دسترسی ندارید.", 403);
    const questions = (await DB.prepare("SELECT id,kind,prompt,choices,answer_key,points FROM class_exam_questions WHERE exam_id=? ORDER BY position,created_at").bind(examId).all<any>()).results || [];
    const attempts = (await DB.prepare("SELECT a.user_id,u.display_name,a.score,a.max_score,a.submitted_at::text AS submitted_at FROM class_exam_attempts a JOIN users u ON u.id=a.user_id WHERE a.exam_id=? ORDER BY u.display_name").bind(examId).all<any>()).results || [];
    const members = (await DB.prepare("SELECT u.id,u.display_name FROM class_members m JOIN users u ON u.id=m.user_id WHERE m.class_id=? AND u.role='memorizer' ORDER BY u.display_name").bind(ex.class_id).all<any>()).results || [];
    return Response.json({ exam: ex, questions, attempts: attempts.map(a => ({ ...a, score: Number(a.score), max_score: Number(a.max_score) })), members });
   }
   const member = await DB.prepare("SELECT 1 AS ok FROM class_members WHERE class_id=? AND user_id=?").bind(ex.class_id, user.id).first<any>();
   if (!member) return jsonError("این آزمون برای کلاس شما نیست.", 403);
   const mine = await DB.prepare("SELECT score,max_score FROM class_exam_attempts WHERE exam_id=? AND user_id=?").bind(examId, user.id).first<any>();
   if (mine) return Response.json({ exam: ex, done: true, score: Number(mine.score), maxScore: Number(mine.max_score), questions: [] });
   const questions = (await DB.prepare("SELECT id,kind,prompt,choices,points FROM class_exam_questions WHERE exam_id=? ORDER BY position,created_at").bind(examId).all<any>()).results || [];
   return Response.json({ exam: ex, done: false, questions });
  }

  // List
  if (staff) {
   const rows = user.role === "admin"
    ? (await DB.prepare("SELECT e.id,e.class_id,c.name AS class_name,e.title,e.exam_date::text AS exam_date,(SELECT COUNT(*) FROM class_exam_questions q WHERE q.exam_id=e.id) AS questions,(SELECT COUNT(*) FROM class_exam_attempts a WHERE a.exam_id=e.id) AS attempts FROM class_exams e JOIN classes c ON c.id=e.class_id WHERE e.active=1 ORDER BY e.created_at DESC").all<any>()).results
    : (await DB.prepare(`SELECT e.id,e.class_id,c.name AS class_name,e.title,e.exam_date::text AS exam_date,(SELECT COUNT(*) FROM class_exam_questions q WHERE q.exam_id=e.id) AS questions,(SELECT COUNT(*) FROM class_exam_attempts a WHERE a.exam_id=e.id) AS attempts FROM class_exams e JOIN classes c ON c.id=e.class_id WHERE e.active=1 AND ${TEACHES_CLASS_SQL} ORDER BY e.created_at DESC`).bind(user.id, user.id).all<any>()).results;
   return Response.json({ exams: (rows || []).map(r => ({ ...r, questions: Number(r.questions), attempts: Number(r.attempts) })) });
  }
  const rows = (await DB.prepare("SELECT e.id,e.class_id,c.name AS class_name,e.title,e.exam_date::text AS exam_date,(SELECT COUNT(*) FROM class_exam_questions q WHERE q.exam_id=e.id) AS questions,a.score,a.max_score FROM class_exams e JOIN classes c ON c.id=e.class_id JOIN class_members m ON m.class_id=e.class_id AND m.user_id=? LEFT JOIN class_exam_attempts a ON a.exam_id=e.id AND a.user_id=? WHERE e.active=1 ORDER BY e.created_at DESC").bind(user.id, user.id).all<any>()).results || [];
  return Response.json({ exams: rows.map(r => ({ id: r.id, class_id: r.class_id, class_name: r.class_name, title: r.title, exam_date: r.exam_date, questions: Number(r.questions), done: r.score != null, score: r.score != null ? Number(r.score) : null, max_score: r.max_score != null ? Number(r.max_score) : null })) });
 },

 POST: async ({ request }) => {
  const user = await currentUser(request); if (!user) return jsonError("ابتدا وارد شوید.", 401);
  const { DB } = bindings(); if (!DB) return jsonError("پایگاه داده آماده نیست.", 503);
  const body = await request.json().catch(() => null) as Record<string, any> | null;
  if (!body) return jsonError("درخواست نامعتبر است.");
  const staff = user.role === "admin" || user.role === "teacher";

  if (body.action === "submit") {
   if (user.role !== "memorizer") return jsonError("فقط قرآن‌آموز می‌تواند آزمون بدهد.", 403);
   const examId = clip(body.examId, 80);
   const ex = await DB.prepare("SELECT e.id,e.class_id FROM class_exams e JOIN class_members m ON m.class_id=e.class_id AND m.user_id=? WHERE e.id=? AND e.active=1").bind(user.id, examId).first<any>();
   if (!ex) return jsonError("آزمون پیدا نشد یا برای کلاس شما نیست.", 403);
   const done = await DB.prepare("SELECT 1 AS ok FROM class_exam_attempts WHERE exam_id=? AND user_id=?").bind(examId, user.id).first<any>();
   if (done) return jsonError("این آزمون را قبلاً داده‌اید.", 409);
   const qs = (await DB.prepare("SELECT id,answer_key,points FROM class_exam_questions WHERE exam_id=?").bind(examId).all<any>()).results || [];
   if (!qs.length) return jsonError("این آزمون هنوز سؤالی ندارد.");
   const answers = body.answers && typeof body.answers === "object" ? body.answers as Record<string, unknown> : {};
   let score = 0, max = 0; const kept: Record<string, string> = {};
   for (const q of qs) { const p = Number(q.points || 1); max += p; const a = String(answers[q.id] ?? "").trim().slice(0, 500); kept[q.id] = a; if (a !== "" && a === String(q.answer_key).trim()) score += p; }
   await DB.prepare("INSERT INTO class_exam_attempts(exam_id,user_id,score,max_score,answers) VALUES(?,?,?,?,?::jsonb) ON CONFLICT DO NOTHING").bind(examId, user.id, score, max, JSON.stringify(kept)).run();
   return Response.json({ score, maxScore: max });
  }

  if (!staff) return jsonError("دسترسی ندارید.", 403);

  if (body.action === "create_exam") {
   const classId = clip(body.classId, 80), title = clip(body.title, 120), date = clip(body.date, 10);
   if (!classId || !title) return jsonError("کلاس و عنوان آزمون را مشخص کنید.");
   if (date && !isIsoDate(date)) return jsonError("تاریخ نامعتبر است.");
   if (!(await canManageClass(DB, user, classId))) return jsonError("کلاس پیدا نشد یا دسترسی ندارید.", 403);
   const id = crypto.randomUUID();
   await DB.prepare("INSERT INTO class_exams(id,class_id,title,exam_date,created_by) VALUES(?,?,?,?::date,?)").bind(id, classId, title, date || null, user.id).run();
   return Response.json({ id }, { status: 201 });
  }

  // Everything below works on an existing exam the caller may manage.
  const examOf = async (id: string) => { const e = await DB.prepare("SELECT id,class_id FROM class_exams WHERE id=? AND active=1").bind(id).first<any>(); return e && (await canManageClass(DB, user, e.class_id)) ? e : null; };

  if (body.action === "add_question") {
   const examId = clip(body.examId, 80), prompt = clip(body.prompt, 600), answer = clip(body.answerKey, 300), kind = clip(body.kind || "final", 20);
   const choices = (Array.isArray(body.choices) ? body.choices : []).slice(0, 8).map(c => clip(c, 200)).filter(Boolean);
   if (!(await examOf(examId))) return jsonError("آزمون پیدا نشد یا دسترسی ندارید.", 403);
   if (!KINDS.includes(kind) || !prompt || !answer) return jsonError("متن سؤال و پاسخ صحیح را وارد کنید.");
   if (choices.length && !choices.includes(answer)) return jsonError("پاسخ صحیح باید عیناً یکی از گزینه‌ها باشد.");
   const pos = await DB.prepare("SELECT COALESCE(MAX(position),0)+1 AS n FROM class_exam_questions WHERE exam_id=?").bind(examId).first<any>();
   const id = crypto.randomUUID();
   await DB.prepare("INSERT INTO class_exam_questions(id,exam_id,kind,prompt,choices,answer_key,points,position) VALUES(?,?,?,?,?::jsonb,?,?,?)").bind(id, examId, kind, prompt, JSON.stringify(choices), answer, Math.min(20, Math.max(1, Number(body.points || 1) | 0)), Number(pos?.n || 1)).run();
   return Response.json({ id }, { status: 201 });
  }
  if (body.action === "delete_question") {
   const q = await DB.prepare("SELECT id,exam_id FROM class_exam_questions WHERE id=?").bind(clip(body.id, 80)).first<any>();
   if (!q || !(await examOf(q.exam_id))) return jsonError("سؤال پیدا نشد یا دسترسی ندارید.", 403);
   const used = await DB.prepare("SELECT COUNT(*) AS n FROM class_exam_attempts WHERE exam_id=?").bind(q.exam_id).first<any>();
   if (Number(used?.n || 0) > 0) return jsonError("پس از اولین پاسخ‌دهی، سؤال‌ها قابل حذف نیستند.", 409);
   await DB.prepare("DELETE FROM class_exam_questions WHERE id=?").bind(q.id).run();
   return Response.json({ ok: true });
  }
  if (body.action === "delete_exam") {   // hidden, not erased: attempts stay in the database
   const examId = clip(body.id, 80); if (!(await examOf(examId))) return jsonError("آزمون پیدا نشد یا دسترسی ندارید.", 403);
   await DB.prepare("UPDATE class_exams SET active=0 WHERE id=?").bind(examId).run();
   return Response.json({ ok: true });
  }
  if (body.action === "reset_attempt") {
   const examId = clip(body.examId, 80); if (!(await examOf(examId))) return jsonError("آزمون پیدا نشد یا دسترسی ندارید.", 403);
   await DB.prepare("DELETE FROM class_exam_attempts WHERE exam_id=? AND user_id=?").bind(examId, clip(body.userId, 80)).run();
   return Response.json({ ok: true });
  }
  return jsonError("عملیات نامعتبر است.");
 }
}}});
