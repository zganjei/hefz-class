import { createFileRoute } from "@tanstack/react-router";
import { bindings } from "../../lib/bindings.server";
import { currentUser, jsonError } from "../../lib/auth.server";
import { classPeople, registryStudents } from "../../lib/class-people.server";
import { searchNorm, searchTokens } from "../../lib/teacher-name";

const CAP = 20;
/** Admin-only global search: classes, active learners and teachers by normalized name. Names only (no ids of people, phones, emails). */
export const Route = createFileRoute("/api/search")({ server: { handlers: {
 GET: async ({ request }) => {
  const user = await currentUser(request); if (!user) return jsonError("ابتدا وارد شوید.", 401);
  if (user.role !== "admin") return jsonError("دسترسی ندارید.", 403);
  const { DB } = bindings(); if (!DB) return jsonError("پایگاه داده آماده نیست.", 503);
  const tokens = searchTokens((new URL(request.url).searchParams.get("q") || "").slice(0, 80));
  if (!tokens.length) return Response.json({ classes: [], learners: [], teachers: [], viaLearners: [] });
  const hit = (n: string) => { const v = searchNorm(n); return tokens.every(t => v.includes(t)); };
  const rows = ((await DB.prepare("SELECT c.id,c.name,c.level_name,c.step_name,ct.user_id AS tid,ut.display_name AS tname FROM classes c LEFT JOIN class_teachers ct ON ct.class_id=c.id LEFT JOIN users ut ON ut.id=ct.user_id AND ut.role='teacher' AND ut.active=1 ORDER BY c.name, ut.display_name").all<any>()).results || []);
  const byId = new Map<string, { id: string; name: string; level: string; step: string; teachers: string[] }>();
  for (const r of rows) { const c = byId.get(r.id) || { id: r.id, name: r.name, level: r.level_name || "", step: r.step_name || "", teachers: [] as string[] }; if (r.tname && !c.teachers.includes(r.tname)) c.teachers.push(r.tname); byId.set(r.id, c); }
  const classes = [...byId.values()];
  const tAll = ((await DB.prepare("SELECT id,display_name FROM users WHERE role='teacher' AND active=1 ORDER BY display_name").all<any>()).results || []) as { id: string; display_name: string }[];

  const out = { classes: [] as any[], learners: [] as any[], teachers: [] as any[], viaLearners: [] as any[] };
  // Learners whose NAME does not match but whose class/teacher does (every token found in name, class or teacher): shown separately with a reason.
  const OCAP = 40;
  const via = (name: string, c: { name: string; teachers: string[] }) => { const n = searchNorm(name), cn = searchNorm(c.name), tn = c.teachers.map(x => searchNorm(x)); const why: string[] = [];
   for (const t of tokens) { if (n.includes(t)) continue; if (tn.some(x => x.includes(t))) { const r = "استاد: " + c.teachers.find(x => searchNorm(x).includes(t)); if (!why.includes(r)) why.push(r); } else if (cn.includes(t)) { const r = "کلاس: " + c.name.replace(/^\s*[کك]لاس[\s\u200c]+(?=\S)/, ""); if (!why.includes(r)) why.push(r); } else return null; }
   return why; };
  const tClasses = new Map<string, { id: string; name: string }[]>(), tLearners = new Map<string, Set<string>>();
  const registry = await registryStudents(DB);
  for (const c of classes) {
   const cp = await classPeople(DB, c.id, registry);
   const active = cp ? cp.people.filter(p => p.status === "active") : [];
   if (hit(c.name) && out.classes.length < CAP) out.classes.push({ id: c.id, name: c.name, level: c.level, step: c.step, teachers: c.teachers, learners: active.length });
   for (const p of active) { if (hit(p.name)) { if (out.learners.length < CAP) out.learners.push({ name: p.name, classId: c.id, className: c.name, teachers: c.teachers }); } else if (out.viaLearners.length < OCAP) { const w = via(p.name, c); if (w && w.length) out.viaLearners.push({ name: p.name, classId: c.id, className: c.name, teachers: c.teachers, why: w }); } }
   for (const tn of c.teachers) { (tClasses.get(tn) || tClasses.set(tn, []).get(tn)!).push({ id: c.id, name: c.name }); const s = tLearners.get(tn) || new Set<string>(); active.forEach(p => s.add(p.key)); tLearners.set(tn, s); }
  }
  for (const t of tAll) if (hit(t.display_name) && out.teachers.length < CAP) out.teachers.push({ name: t.display_name, classes: tClasses.get(t.display_name) || [], learners: tLearners.get(t.display_name)?.size || 0 });
  return Response.json(out);
 },
}}});
