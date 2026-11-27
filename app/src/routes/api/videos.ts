import { createFileRoute } from "@tanstack/react-router";
import { bindings } from "../../lib/bindings.server";
import { currentUser, jsonError } from "../../lib/auth.server";
import { isAdmin } from "../../lib/roles";
import { validateVideoInput } from "../../lib/video";
import { programForUser } from "../../lib/program.server";
import { stockholmToday } from "../../lib/plan.server";

const clip = (v: unknown, max: number) => (typeof v === "string" || typeof v === "number" ? String(v).trim().slice(0, max) : "");
const ids = (v: unknown, max: number) => [...new Set((Array.isArray(v) ? v : []).map(x => clip(x, 100)).filter(Boolean))].slice(0, max);

/** Video library. Admin: list/create/update/delete videos and attach them to program weeks. Any signed-in learner: tick «دیدم» on a video of a week that is open for them. */
export const Route = createFileRoute("/api/videos")({ server: { handlers: {
 GET: async ({ request }) => {
  const user = await currentUser(request); if (!user) return jsonError("ابتدا وارد شوید.", 401);
  if (!isAdmin(user)) return jsonError("دسترسی فقط برای مدیر است.", 403);
  const { DB } = bindings(); if (!DB) return jsonError("پایگاه داده آماده نیست.", 503);
  const programId = new URL(request.url).searchParams.get("programId");
  const videos = ((await DB.prepare("SELECT v.id,v.title,v.kind,v.url,v.provider,v.description,v.duration_text,v.range_note,v.sort_order,v.active,(SELECT COUNT(*) FROM program_week_videos l WHERE l.video_id=v.id) AS links FROM videos v ORDER BY v.sort_order,v.created_at DESC").all<any>()).results || []).map(v => ({ ...v, links: Number(v.links), sort_order: Number(v.sort_order) }));
  if (!programId) return Response.json({ videos });
  const p = await DB.prepare("SELECT id,name FROM hefz_programs WHERE id=?").bind(programId).first<{ id: string; name: string }>();
  if (!p) return jsonError("برنامه پیدا نشد (شاید حذف شده؛ صفحه را تازه کنید).", 404);
  const wk = (await DB.prepare("SELECT week_index,title,days FROM hefz_program_weeks WHERE program_id=? ORDER BY week_index").bind(programId).all<{ week_index: number; title: string; days: unknown }>()).results || [];
  const links = (await DB.prepare("SELECT week_index,video_id FROM program_week_videos WHERE program_id=? ORDER BY week_index,sort_order").bind(programId).all<{ week_index: number; video_id: string }>()).results || [];
  const weeks = wk.map(w => { const d = typeof w.days === "string" ? JSON.parse(w.days) : w.days; const first = (Array.isArray(d) ? d : []).find((x: any) => x?.new)?.new ?? null;
   return { week_index: Number(w.week_index), title: w.title, surah: first as string | null, videoIds: links.filter(l => Number(l.week_index) === Number(w.week_index)).map(l => l.video_id) }; });
  return Response.json({ videos, program: p, weeks });
 },
 POST: async ({ request }) => {
  const user = await currentUser(request); if (!user) return jsonError("ابتدا وارد شوید.", 401);
  const { DB } = bindings(); if (!DB) return jsonError("پایگاه داده آماده نیست.", 503);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return jsonError("درخواست نامعتبر است.");

  if (body.action === "watched") {   // learner tick; only for a video linked to a week that is open in the learner's own program
   const videoId = clip(body.videoId, 100), on = body.done !== false;
   const prog = await programForUser(DB, user.id), today = stockholmToday();
   const open = prog ? prog.weeks.filter(w => w.start_date && w.start_date <= today).map(w => w.week_number) : [];
   const hit = prog && videoId && open.length ? (await DB.prepare("SELECT l.week_index FROM program_week_videos l JOIN videos v ON v.id=l.video_id WHERE l.program_id=? AND l.video_id=? AND v.active").bind(prog.programId, videoId).all<{ week_index: number }>()).results?.some(r => open.includes(Number(r.week_index))) : false;
   if (!hit) return jsonError("این ویدئو برای شما باز نیست.", 403);
   if (on) await DB.prepare("INSERT INTO video_views(video_id,user_id) VALUES(?,?) ON CONFLICT DO NOTHING").bind(videoId, user.id).run();
   else await DB.prepare("DELETE FROM video_views WHERE video_id=? AND user_id=?").bind(videoId, user.id).run();
   return Response.json({ ok: true, videoId, watched: on });
  }

  if (!isAdmin(user)) return jsonError("دسترسی فقط برای مدیر است.", 403);
  const action = body.action;

  if (action === "create" || action === "update") {
   const v = validateVideoInput(body); if (!v.ok) return jsonError(v.error);
   const x = v.value;
   if (action === "create") {
    const id = crypto.randomUUID();
    await DB.prepare("INSERT INTO videos(id,title,kind,url,provider,description,duration_text,range_note,sort_order,created_by) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(id, x.title, x.kind, x.url, x.provider, x.description, x.duration_text, x.range_note, x.sort_order, user.id).run();
    return Response.json({ ok: true, id, provider: x.provider }, { status: 201 });
   }
   const id = clip(body.id, 100); if (!id) return jsonError("شناسه لازم است.");
   if (!(await DB.prepare("SELECT 1 AS ok FROM videos WHERE id=?").bind(id).first())) return jsonError("ویدئو پیدا نشد (شاید حذف شده؛ صفحه را تازه کنید).", 404);
   await DB.prepare("UPDATE videos SET title=?,kind=?,url=?,provider=?,description=?,duration_text=?,range_note=?,sort_order=?,active=? WHERE id=?").bind(x.title, x.kind, x.url, x.provider, x.description, x.duration_text, x.range_note, x.sort_order, body.active !== false, id).run();
   return Response.json({ ok: true, id, provider: x.provider });
  }

  if (action === "delete") {
   const id = clip(body.id, 100); if (!id) return jsonError("شناسه لازم است.");
   await DB.prepare("DELETE FROM videos WHERE id=?").bind(id).run();   // links and «دیدم» ticks go with it (ON DELETE CASCADE)
   return Response.json({ ok: true });
  }

  if (action === "setWeek") {   // replace the ordered video list of one program week
   const programId = clip(body.programId, 100), wn = Number(body.weekIndex), list = ids(body.videoIds, 30);
   if (!programId || !Number.isInteger(wn) || wn < 1) return jsonError("درخواست نامعتبر است.");
   if (!(await DB.prepare("SELECT 1 AS ok FROM hefz_program_weeks WHERE program_id=? AND week_index=?").bind(programId, wn).first())) return jsonError("این هفته در برنامه نیست (شاید برنامه تغییر کرده؛ صفحه را تازه کنید).", 404);
   const known = new Set(((await DB.prepare("SELECT id FROM videos").all<{ id: string }>()).results || []).map(r => r.id));
   if (list.some(i => !known.has(i))) return jsonError("یکی از ویدئوها پیدا نشد (شاید حذف شده؛ صفحه را تازه کنید).", 404);
   for (let i = 0; i < list.length; i++) await DB.prepare("INSERT INTO program_week_videos(program_id,week_index,video_id,sort_order) VALUES(?,?,?,?) ON CONFLICT (program_id,week_index,video_id) DO UPDATE SET sort_order=EXCLUDED.sort_order").bind(programId, wn, list[i], i).run();
   const cur = (await DB.prepare("SELECT video_id FROM program_week_videos WHERE program_id=? AND week_index=?").bind(programId, wn).all<{ video_id: string }>()).results || [];
   for (const c of cur) if (!list.includes(c.video_id)) await DB.prepare("DELETE FROM program_week_videos WHERE program_id=? AND week_index=? AND video_id=?").bind(programId, wn, c.video_id).run();
   return Response.json({ ok: true, programId, weekIndex: wn, videoIds: list });
  }

  if (action === "addToWeeks") {   // one video onto several weeks of one program (appended at the end of each week)
   const programId = clip(body.programId, 100), videoId = clip(body.videoId, 100), weeks = [...new Set((Array.isArray(body.weekIndexes) ? body.weekIndexes : []).map(Number).filter(n => Number.isInteger(n) && n >= 1))].slice(0, 300);
   if (!programId || !videoId || !weeks.length) return jsonError("برنامه، ویدئو و دست‌کم یک هفته را انتخاب کنید.");
   if (!(await DB.prepare("SELECT 1 AS ok FROM videos WHERE id=?").bind(videoId).first())) return jsonError("ویدئو پیدا نشد.", 404);
   let added = 0;
   for (const wn of weeks) {
    if (!(await DB.prepare("SELECT 1 AS ok FROM hefz_program_weeks WHERE program_id=? AND week_index=?").bind(programId, wn).first())) continue;
    const mx = Number((await DB.prepare("SELECT COALESCE(MAX(sort_order),-1) AS m FROM program_week_videos WHERE program_id=? AND week_index=?").bind(programId, wn).first<{ m: number }>())?.m ?? -1);
    const r = await DB.prepare("INSERT INTO program_week_videos(program_id,week_index,video_id,sort_order) VALUES(?,?,?,?) ON CONFLICT DO NOTHING").bind(programId, wn, videoId, mx + 1).run();
    added += r.meta?.changes ?? 0;
   }
   return Response.json({ ok: true, added });
  }

  if (action === "copyLinks") {   // after a program is rebuilt as a new program: carry the video links over by week number
   const from = clip(body.fromProgramId, 100), to = clip(body.toProgramId, 100);
   if (!from || !to || from === to) return jsonError("دو برنامهٔ متفاوت را انتخاب کنید.");
   if (!(await DB.prepare("SELECT 1 AS ok FROM hefz_programs WHERE id=?").bind(to).first())) return jsonError("برنامهٔ مقصد پیدا نشد.", 404);
   const r = await DB.prepare("INSERT INTO program_week_videos(program_id,week_index,video_id,sort_order) SELECT ?,l.week_index,l.video_id,l.sort_order FROM program_week_videos l WHERE l.program_id=? AND EXISTS (SELECT 1 FROM hefz_program_weeks w WHERE w.program_id=? AND w.week_index=l.week_index) ON CONFLICT DO NOTHING").bind(to, from, to).run();
   return Response.json({ ok: true, copied: r.meta?.changes ?? 0 });
  }
  return jsonError("درخواست نامعتبر است.");
 },
}}});
