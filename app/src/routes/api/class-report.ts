import { createFileRoute } from "@tanstack/react-router";
import { bindings } from "../../lib/bindings.server";
import { currentUser, jsonError } from "../../lib/auth.server";
import { TEACHES_CLASS_SQL } from "../../lib/access.server";
import { addDays, stockholmToday } from "../../lib/plan.server";
import { programForClass } from "../../lib/program.server";
import { classPeople, registryStudents } from "../../lib/class-people.server";

/** Teacher (own classes) and admin (all classes): learners per class (signed-in and registry), the class's current program week, and each learner's exam scores (digital and hand-entered). No national IDs here. */
export const Route = createFileRoute("/api/class-report")({ server: { handlers: {
 GET: async ({ request }) => {
  const user = await currentUser(request); if (!user) return jsonError("ابتدا وارد شوید.", 401);
  if (user.role !== "admin" && user.role !== "teacher") return jsonError("دسترسی ندارید.", 403);
  const { DB } = bindings(); if (!DB) return jsonError("پایگاه داده آماده نیست.", 503);
  const today = stockholmToday();
  const classes = (user.role === "admin"
    ? await DB.prepare("SELECT c.id,c.name FROM classes c ORDER BY c.name").all<any>()
    : await DB.prepare(`SELECT c.id,c.name FROM classes c WHERE ${TEACHES_CLASS_SQL} ORDER BY c.name`).bind(user.id, user.id).all<any>()).results || [];
  const globalWeeks = (await DB.prepare("SELECT week_number,title,start_date::text AS start_date FROM hefz_plan_weeks ORDER BY week_number").all<any>()).results || [];
  const registry = await registryStudents(DB), out = [];
  for (const c of classes) {
   const prog = await programForClass(DB, c.id);
   const weeks: { week_number: number; title: string; start_date: string | null }[] = prog ? prog.weeks : globalWeeks;
   const dated = weeks.filter(w => w.start_date && w.start_date <= today), last = dated.length ? dated[dated.length - 1] : null;
   const current = last && !(prog && today > addDays(last.start_date!, 6)) ? { week_number: last.week_number, title: last.title } : null;
   const people = ((await classPeople(DB, c.id, registry))?.people || []).filter(p => p.status === "active");
   const manual = (await DB.prepare("SELECT id,registry_id,user_id,title,score,max_score,score_date::text AS score_date FROM class_manual_scores WHERE class_id=? ORDER BY score_date NULLS LAST, created_at").bind(c.id).all<any>()).results || [];
   const exams = (await DB.prepare("SELECT id,title,exam_date::text AS exam_date FROM class_exams WHERE class_id=? AND active=1 ORDER BY created_at").bind(c.id).all<any>()).results || [];
   const att = (await DB.prepare("SELECT a.exam_id,a.user_id,a.score,a.max_score FROM class_exam_attempts a JOIN class_exams e ON e.id=a.exam_id WHERE e.class_id=? AND e.active=1").bind(c.id).all<any>()).results || [];
   out.push({
    id: c.id, name: c.name, program: prog ? prog.name : null, currentWeek: current, exams: exams.map(e => ({ id: e.id, title: e.title, date: e.exam_date })),
    learners: people.map(l => ({ id: l.key, name: l.name, registered: l.registered, scores: Object.fromEntries(att.filter(a => l.userId && a.user_id === l.userId).map(a => [a.exam_id, { score: Number(a.score), max: Number(a.max_score) }])),
     manual: manual.filter(m => (l.registryId && m.registry_id === l.registryId) || (l.userId && m.user_id === l.userId)).map(m => ({ title: m.title, score: Number(m.score), max: m.max_score == null ? null : Number(m.max_score), date: m.score_date })) })),
   });
  }
  return Response.json({ classes: out, totalLearners: out.reduce((n, c) => n + c.learners.length, 0) });
 }
}}});
