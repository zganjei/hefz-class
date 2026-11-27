import { createFileRoute } from "@tanstack/react-router";
import { bindings } from "../../lib/bindings.server";
import { currentUser, jsonError } from "../../lib/auth.server";
import { isIsoDate, stockholmToday, jalaliLabel } from "../../lib/plan.server";
import { saturdayOnOrBefore, setClassWeek, programForClass } from "../../lib/program.server";
import { canManageClass } from "../../lib/access.server";
import * as XLSX from "xlsx";
import type { ProgramWeek } from "../../lib/program-parse";
import { programToRows, programFileName, summarize } from "../../lib/program-export";
import { isStaff, isAdmin, isTeacher } from "../../lib/roles";

const clip = (v: unknown, max: number) => (typeof v === "string" || typeof v === "number" ? String(v).trim().slice(0, max) : "");
const strList = (v: unknown, maxItems: number) => (Array.isArray(v) ? v : []).slice(0, maxItems).map(x => clip(x, 200)).filter(Boolean);

/** Admin: list, create, delete study programs and assign one to any class. Teacher: list program names and assign/detach a program on classes they teach (cannot create or delete programs). */
export const Route = createFileRoute("/api/programs")({ server: { handlers: {
 GET: async ({ request }) => {
  const user = await currentUser(request); if (!user) return jsonError("ابتدا وارد شوید.", 401);
  if (!isStaff(user)) return jsonError("دسترسی فقط برای مدیر یا استاد است.", 403);
  const { DB } = bindings(); if (!DB) return jsonError("پایگاه داده آماده نیست.", 503);
  const url = new URL(request.url), one = url.searchParams.get("id"), view = url.searchParams.get("view");
  if (one || view) {   // admin only: one program's overview or its xlsx download
   if (!isAdmin(user)) return jsonError("دسترسی فقط برای مدیر است.", 403);
   const p = await DB.prepare("SELECT id,name,created_at::text AS created_at FROM hefz_programs WHERE id=?").bind(one || "").first<{ id: string; name: string; created_at: string }>();
   if (!p) return jsonError("برنامه پیدا نشد (شاید حذف شده؛ صفحه را تازه کنید).", 404);
   const rows = (await DB.prepare("SELECT title,days FROM hefz_program_weeks WHERE program_id=? ORDER BY week_index").bind(p.id).all<{ title: string; days: unknown }>()).results || [];
   const weeks: ProgramWeek[] = rows.map(r => { const d = typeof r.days === "string" ? JSON.parse(r.days) : r.days; return { title: r.title, days: Array.isArray(d) ? d : [] } as ProgramWeek; });
   if (view === "download") {
    if (!weeks.length) return jsonError("این برنامه خالی است و چیزی برای دانلود ندارد.", 409);
    const ws = XLSX.utils.aoa_to_sheet(programToRows(weeks)); ws["!cols"] = [{ wch: 28 }, { wch: 8 }, { wch: 28 }, { wch: 36 }, { wch: 36 }];
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "برنامه"); wb.Workbook = { Views: [{ RTL: true }] };
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
    const fname = programFileName(p.name) + ".xlsx";
    return new Response(buf, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="program.xlsx"; filename*=UTF-8''${encodeURIComponent(fname)}`, "Cache-Control": "no-store" } });
   }
   const cls = (await DB.prepare("SELECT name FROM classes WHERE program_id=? ORDER BY name").bind(p.id).all<{ name: string }>()).results || [];
   return Response.json({ id: p.id, name: p.name, created: p.created_at ? jalaliLabel(p.created_at.slice(0, 10)) : null, classes: cls.map(c => c.name), ...summarize(weeks) });
  }
  const programs = (await DB.prepare("SELECT p.id,p.name,p.created_at::text AS created_at,(SELECT COUNT(*) FROM hefz_program_weeks w WHERE w.program_id=p.id) AS weeks FROM hefz_programs p ORDER BY p.created_at DESC").all<any>()).results || [];
  if (isTeacher(user)) return Response.json({ programs: programs.map(p => ({ id: p.id, name: p.name, weeks: Number(p.weeks) })) });   // teachers: names and week counts only
  const classes = (await DB.prepare("SELECT c.id,c.name,c.program_id,c.program_start::text AS program_start,(SELECT COUNT(*) FROM class_members m WHERE m.class_id=c.id) AS member_count FROM classes c ORDER BY c.name").all<any>()).results || [];
  return Response.json({ programs: programs.map(p => ({ ...p, weeks: Number(p.weeks) })), classes: classes.map(c => ({ ...c, member_count: Number(c.member_count), start_label: c.program_start ? jalaliLabel(c.program_start) : null })), defaultStart: saturdayOnOrBefore(stockholmToday()) });
 },
 POST: async ({ request }) => {
  const user = await currentUser(request); if (!user) return jsonError("ابتدا وارد شوید.", 401);
  if (!isStaff(user)) return jsonError("دسترسی فقط برای مدیر یا استاد است.", 403);
  const { DB } = bindings(); if (!DB) return jsonError("پایگاه داده آماده نیست.", 503);
  const body = await request.json().catch(() => null) as Record<string, any> | null;
  if (!body) return jsonError("درخواست نامعتبر است.");
  if (isTeacher(user) && body.action !== "assign") return jsonError("دسترسی فقط برای مدیر است.", 403);

  if (body.action === "create") {
   const name = clip(body.name, 120); if (!name) return jsonError("نام برنامه را بنویسید.");
   const raw = Array.isArray(body.weeks) ? body.weeks : [];
   if (!raw.length) return jsonError("برنامه هیچ هفته‌ای ندارد.");
   if (raw.length > 300) return jsonError("حداکثر ۳۰۰ هفته مجاز است.");
   let weeks: { title: string; days: unknown[] }[];
   try { weeks = raw.map((w: any, i: number) => {
    const days = Array.isArray(w?.days) ? w.days : [];
    if (days.length !== 7) throw new Error(`هفتهٔ ${i + 1} باید دقیقاً ۷ روز داشته باشد.`);
    return { title: clip(w.title, 200) || `هفتهٔ ${i + 1}`, days: days.map((d: any) => {
     const kind = d?.kind === "new" || d?.kind === "class" ? d.kind : "rest";
     return { kind, new: kind === "new" ? (clip(d.new, 200) || null) : null, review: strList(d?.review, 12), basket: strList(d?.basket, 12) };
    }) };
   }); } catch (e: any) { return jsonError(e.message || "برنامه نامعتبر است."); }
   const id = crypto.randomUUID();
   await DB.prepare("INSERT INTO hefz_programs(id,name,created_by) VALUES(?,?,?)").bind(id, name, user.id).run();
   try { await DB.prepare("INSERT INTO hefz_program_weeks(program_id,week_index,title,days) SELECT ?::text, e.ord::int, e.v->>'title', e.v->'days' FROM jsonb_array_elements(?::jsonb) WITH ORDINALITY AS e(v, ord)").bind(id, JSON.stringify(weeks)).run(); }
   catch { await DB.prepare("DELETE FROM hefz_programs WHERE id=?").bind(id).run(); return jsonError("ذخیره‌ی هفته‌های برنامه ناموفق بود و برنامه ثبت نشد. دوباره امتحان کنید.", 500); }
   // Never claim success on faith: count what is really stored, and roll the half-created program back if it is short.
   const stored = Number((await DB.prepare("SELECT COUNT(*) AS n FROM hefz_program_weeks WHERE program_id=?").bind(id).first<{ n: number }>())?.n || 0);
   if (stored !== weeks.length) { await DB.prepare("DELETE FROM hefz_programs WHERE id=?").bind(id).run(); return jsonError(`ذخیره‌ی برنامه ناقص بود (${stored} از ${weeks.length} هفته) و برنامه ثبت نشد. دوباره امتحان کنید.`, 500); }
   return Response.json({ ok: true, id, name, weeks: stored }, { status: 201 });
  }

  if (body.action === "rename") {
   const id = clip(body.id, 100), name = clip(body.name, 200).replace(/\s+/g, " ");
   if (!id) return jsonError("شناسه لازم است.");
   if (name.length < 2 || name.length > 80) return jsonError("نام برنامه باید بین ۲ تا ۸۰ حرف باشد.");
   if (/[<>]/.test(name)) return jsonError("نام برنامه نباید شامل علامت‌های < یا > باشد.");
   const cur = await DB.prepare("SELECT id FROM hefz_programs WHERE id=?").bind(id).first<{ id: string }>();
   if (!cur) return jsonError("برنامه پیدا نشد (شاید حذف شده؛ صفحه را تازه کنید).", 404);
   const dup = await DB.prepare("SELECT id FROM hefz_programs WHERE id<>? AND lower(name)=lower(?) LIMIT 1").bind(id, name).first<{ id: string }>();
   if (dup) return jsonError("برنامه‌ای با این نام از قبل وجود دارد. نام دیگری انتخاب کنید.", 409);
   await DB.prepare("UPDATE hefz_programs SET name=? WHERE id=?").bind(name, id).run();   // classes reference the program by id, so attachments are untouched
   return Response.json({ ok: true, id, name });
  }

  if (body.action === "detach") {
   const id = clip(body.id, 100); if (!id) return jsonError("شناسه لازم است.");
   await DB.prepare("UPDATE classes SET program_id=NULL,program_start=NULL WHERE program_id=?").bind(id).run();
   return Response.json({ ok: true });
  }

  if (body.action === "delete") {
   const id = clip(body.id, 100); if (!id) return jsonError("شناسه لازم است.");
   const usedBy = ((await DB.prepare("SELECT id,name FROM classes WHERE program_id=?").bind(id).all<{ id: string; name: string }>()).results || []);
   const weekCount = Number((await DB.prepare("SELECT COUNT(*) AS n FROM hefz_program_weeks WHERE program_id=?").bind(id).first<{ n: number }>())?.n || 0);
   if (usedBy.length && weekCount > 0) return Response.json({ error: `این برنامه به کلاس «${usedBy.map(c => c.name).join("، ")}» وصل است. اول آن را از کلاس جدا کنید.`, classes: usedBy, code: "in_use" }, { status: 409 });
   // An EMPTY (0-week) program is useless anywhere: detach it from every class, then delete.
   if (usedBy.length) await DB.prepare("UPDATE classes SET program_id=NULL,program_start=NULL WHERE program_id=?").bind(id).run();
   // Delete children explicitly instead of relying on ON DELETE CASCADE existing in every deployed schema.
   try {
    await DB.prepare("DELETE FROM hefz_program_ticks WHERE program_id=?").bind(id).run();
    await DB.prepare("DELETE FROM hefz_program_weeks WHERE program_id=?").bind(id).run();
    await DB.prepare("DELETE FROM hefz_programs WHERE id=?").bind(id).run();
   } catch (e: any) { return jsonError("حذف برنامه ناموفق بود: " + String(e?.message || e).slice(0, 160), 500); }
   const still = await DB.prepare("SELECT COUNT(*) AS n FROM hefz_programs WHERE id=?").bind(id).first<{ n: number }>();
   if (Number(still?.n)) return jsonError("برنامه حذف نشد. دوباره امتحان کنید.", 500);
   return Response.json({ ok: true });
  }

  if (body.action === "assign") {
   const classId = clip(body.classId, 100), programId = clip(body.programId, 100);
   // Existence first: a deleted/stale class must say so, not claim a permission problem.
   const cls = await DB.prepare("SELECT id,name FROM classes WHERE id=?").bind(classId).first<{ id: string; name: string }>();
   if (!cls) return jsonError("کلاس پیدا نشد (شاید حذف شده؛ صفحه را تازه کنید).", 404);
   if (!(await canManageClass(DB, user, classId))) return jsonError("فقط برای کلاس‌های خودتان می‌توانید برنامه تعیین کنید.", 403);
   if (!programId) {   // detach: the class goes back to the global plan
    await DB.prepare("UPDATE classes SET program_id=NULL,program_start=NULL WHERE id=?").bind(classId).run();
    return Response.json({ ok: true, classId, programId: null });
   }
   const prog = await DB.prepare("SELECT id,name FROM hefz_programs WHERE id=?").bind(programId).first<{ id: string; name: string }>();
   if (!prog) return jsonError("برنامه پیدا نشد.", 404);
   const wk = Number((await DB.prepare("SELECT COUNT(*) AS n FROM hefz_program_weeks WHERE program_id=?").bind(programId).first<{ n: number }>())?.n || 0);
   if (!wk) return jsonError("این برنامه هفته‌ای ندارد (خالی است). آن را حذف کنید و دوباره بسازید.", 409);
   const given = clip(body.startDate, 10);
   if (given && !isIsoDate(given)) return jsonError("تاریخ شروع نامعتبر است.");
   const start = saturdayOnOrBefore(given || stockholmToday());   // weeks start on Saturday
   await DB.prepare("UPDATE classes SET program_id=?,program_start=? WHERE id=?").bind(programId, start, classId).run();
   const wn = Number(body.weekNumber);   // optional: start from this program week (shifts the start date, as the class position control does)
   if (body.weekNumber !== undefined && body.weekNumber !== "" && Number.isFinite(wn)) {
    const cp = await programForClass(DB, classId), idx = cp ? cp.weeks.findIndex(w => w.week_number === wn) : -1;
    if (idx < 0) return jsonError("این هفته در برنامه نیست.", 404);
    if (idx > 0) await setClassWeek(DB, classId, idx, stockholmToday());
   }
   return Response.json({ ok: true, classId, programId, className: cls.name, programName: prog.name, startDate: start, startLabel: jalaliLabel(start) });
  }
  return jsonError("درخواست نامعتبر است.");
 },
}}});
