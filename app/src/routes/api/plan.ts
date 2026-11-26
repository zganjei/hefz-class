import { createFileRoute } from "@tanstack/react-router";
import { bindings } from "../../lib/bindings.server";
import { currentUser, jsonError } from "../../lib/auth.server";
import { canManageClass } from "../../lib/access.server";
import { expandWeek, stockholmToday, addDays, dayIndexOf, itemRanges, jalaliLabel, isIsoDate, locateDay, DAY_NAMES, DAILY_ITEMS, ITEM_LABELS, type DailyItem, type PlanDay } from "../../lib/plan.server";
import { resolveRange, quranComUrl, tadabburFor, audioFor, translationFor } from "../../lib/quran.server";

const TRACK = "online";   // an offline track will reuse hefz_daily_ticks.track later

type WeekRow = { week_number: number; title: string; mushaf_page: number; mushaf_page2: number | null; start_date: string | null; days: PlanDay[] };
const WEEK_SQL = "SELECT week_number,title,mushaf_page,mushaf_page2,start_date::text AS start_date,days FROM hefz_plan_weeks";
const isOpen = (w: { start_date: string | null }, today: string) => !w.start_date || w.start_date <= today;
const newDays = (w: { days: PlanDay[] }) => w.days.map((d, i) => (d.kind === "new" ? i : -1)).filter(i => i >= 0);

export const Route = createFileRoute("/api/plan")({ server: { handlers: {
 GET: async ({ request }) => {
  const user = await currentUser(request); if (!user) return jsonError("ابتدا وارد شوید.", 401);
  const { DB } = bindings(); if (!DB) return jsonError("پایگاه داده آماده نیست.", 503);
  const url = new URL(request.url); const today = stockholmToday();
  const all = (await DB.prepare(`${WEEK_SQL} ORDER BY week_number`).all<WeekRow>()).results || [];
  const classId = url.searchParams.get("classId");

  const rangesParam = url.searchParams.get("verses");   // verse text for tapped ranges, "|"-separated
  if (rangesParam) return Response.json({ blocks: rangesParam.split("|").slice(0, 12).map(r => resolveRange(r)).filter(Boolean) });
  const dated = all.filter(w => w.start_date && w.start_date <= today);
  const currentWeek = dated.length ? dated[dated.length - 1].week_number : null;

  if (url.searchParams.get("today")) {   // learner's checklist for today (online track)
   const dateParam = url.searchParams.get("date");
   if (dateParam !== null && !isIsoDate(dateParam)) return jsonError("تاریخ نامعتبر است.");
   const target = dateParam ?? today;
   const openDated = all.filter(w => w.start_date && isOpen(w, today));   // weeks not yet opened stay hidden
   const hit = locateDay(openDated, target);
   if (!hit) { if (dateParam !== null) return jsonError("برای این روز برنامه‌ای وجود ندارد.", 404); return Response.json({ track: TRACK, today, week: null, day: null, items: [] }); }
   const week = hit.week, idx = hit.idx;
   const date = addDays(week.start_date!, idx);
   const prev = addDays(date, -1), next = addDays(date, 1);
   const day = week.days[idx];
   const ticks = (await DB.prepare("SELECT item FROM hefz_daily_ticks WHERE user_id=? AND track=? AND week_number=? AND day_index=?").bind(user.id, TRACK, week.week_number, idx).all<{ item: string }>()).results || [];
   const weekly = await DB.prepare("SELECT 1 AS x FROM hefz_plan_progress WHERE user_id=? AND week_number=? AND day_index=?").bind(user.id, week.week_number, idx).first<{ x: number }>();
   const done = new Set(ticks.map(t => t.item)); if (weekly) done.add("memorize");
   return Response.json({ track: TRACK, today, week: { week_number: week.week_number, title: week.title }, day: { index: idx, name: DAY_NAMES[idx], date, jdate: jalaliLabel(date), kind: day.kind, isToday: date === today, future: date > today, prev: locateDay(openDated, prev) ? prev : null, next: locateDay(openDated, next) ? next : null },
    items: DAILY_ITEMS.map(key => { const ranges = itemRanges(key, day); return { key, label: ITEM_LABELS[key], ranges, done: done.has(key),
     ...(key === "memorize" ? { links: ranges.map(quranComUrl) } : {}), ...(key === "listen" ? { audio: ranges.map(audioFor) } : {}), ...(key === "translate" ? { translation: ranges.map(translationFor) } : {}), ...(key === "tadabbur" ? { tadabbur: ranges.map(tadabburFor) } : {}) }; }) });
  }

  if (classId) {   // teacher / admin report for one class
   if (!(await canManageClass(DB, user, classId))) return jsonError("دسترسی ندارید.", 403);
   const wanted = Number(url.searchParams.get("week") || currentWeek || 0);
   const week = all.find(w => w.week_number === wanted && isOpen(w, today));
   if (!week) return jsonError("هفته پیدا نشد یا هنوز باز نشده است.", 404);
   const members = (await DB.prepare("SELECT u.id,u.display_name FROM class_members m JOIN users u ON u.id=m.user_id WHERE m.class_id=? AND u.role IN ('memorizer','admin') AND u.active=1 ORDER BY u.display_name").bind(classId).all<{ id: string; display_name: string }>()).results || [];
   const prog = (await DB.prepare("SELECT p.user_id,p.week_number,p.day_index,p.done_at FROM hefz_plan_progress p JOIN class_members m ON m.user_id=p.user_id AND m.class_id=? WHERE p.week_number=?").bind(classId, week.week_number).all<{ user_id: string; day_index: number; done_at: string }>()).results || [];
   const totals = (await DB.prepare("SELECT p.user_id,COUNT(*) AS n FROM hefz_plan_progress p JOIN class_members m ON m.user_id=p.user_id AND m.class_id=? GROUP BY p.user_id").bind(classId).all<{ user_id: string; n: number }>()).results || [];
   const days = expandWeek(week, today, new Set());
   return Response.json({
    currentWeek, week: { week_number: week.week_number, title: week.title, mushaf_page: week.mushaf_page, mushaf_page2: week.mushaf_page2, start_date: week.start_date, newDays: newDays(week), days: days.map(d => ({ index: d.index, name: d.name, jdate: d.jdate, kind: d.kind, new: d.new, future: d.future })) },
    weeks: all.filter(w => isOpen(w, today)).map(w => ({ week_number: w.week_number, title: w.title })),
    members: members.map(m => ({ id: m.id, name: m.display_name, done: prog.filter(p => p.user_id === m.id).map(p => p.day_index), lastTick: prog.filter(p => p.user_id === m.id).map(p => p.done_at).sort().pop() || null, totalDone: Number(totals.find(t => t.user_id === m.id)?.n || 0) })),
   });
  }

  const mine = (await DB.prepare("SELECT week_number,day_index FROM hefz_plan_progress WHERE user_id=?").bind(user.id).all<{ week_number: number; day_index: number }>()).results || [];
  const weeks = all.map(w => {
   const open = isOpen(w, today), done = new Set(mine.filter(p => p.week_number === w.week_number).map(p => p.day_index));
   const total = newDays(w).length, doneNew = newDays(w).filter(i => done.has(i)).length;
   return { week_number: w.week_number, title: w.title, mushaf_page: w.mushaf_page, mushaf_page2: w.mushaf_page2, start_date: w.start_date, open, current: w.week_number === currentWeek, total, doneNew, days: open ? expandWeek(w, today, done) : [] };
  });
  return Response.json({ today, currentWeek, weeks });
 },
 POST: async ({ request }) => {
  const user = await currentUser(request); if (!user) return jsonError("ابتدا وارد شوید.", 401);
  const { DB } = bindings(); if (!DB) return jsonError("پایگاه داده آماده نیست.", 503);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (body && body.item !== undefined) {   // per-item tick on a day
   const item = String(body.item) as DailyItem, wn = Number(body.weekNumber), di = Number(body.dayIndex), on = body.done !== false;
   if (!DAILY_ITEMS.includes(item) || !Number.isInteger(wn) || !Number.isInteger(di) || di < 0 || di > 6) return jsonError("درخواست نامعتبر است.");
   const wk = await DB.prepare(`${WEEK_SQL} WHERE week_number=?`).bind(wn).first<WeekRow>();
   const now = stockholmToday();
   if (!wk || !isOpen(wk, now)) return jsonError("این هفته هنوز باز نشده است.", 403);
   if (wk.start_date && addDays(wk.start_date, di) > now) return jsonError("روز آینده را نمی‌توان تیک زد.", 403);
   if (on) await DB.prepare("INSERT INTO hefz_daily_ticks(user_id,track,week_number,day_index,item) VALUES(?,?,?,?,?) ON CONFLICT DO NOTHING").bind(user.id, TRACK, wn, di, item).run();
   else await DB.prepare("DELETE FROM hefz_daily_ticks WHERE user_id=? AND track=? AND week_number=? AND day_index=? AND item=?").bind(user.id, TRACK, wn, di, item).run();
   if (item === "memorize" && wk.days[di]?.kind === "new") {   // keep the weekly tick consistent: حفظ done == day done
    if (on) await DB.prepare("INSERT INTO hefz_plan_progress(user_id,week_number,day_index) VALUES(?,?,?) ON CONFLICT DO NOTHING").bind(user.id, wn, di).run();
    else await DB.prepare("DELETE FROM hefz_plan_progress WHERE user_id=? AND week_number=? AND day_index=?").bind(user.id, wn, di).run();
   }
   return Response.json({ ok: true, weekNumber: wn, dayIndex: di, item, done: on });
  }
  const weekNumber = Number(body?.weekNumber), dayIndex = Number(body?.dayIndex), done = body?.done !== false;
  if (!Number.isInteger(weekNumber) || !Number.isInteger(dayIndex) || dayIndex < 0 || dayIndex > 6) return jsonError("درخواست نامعتبر است.");
  const week = await DB.prepare(`${WEEK_SQL} WHERE week_number=?`).bind(weekNumber).first<WeekRow>();
  const today = stockholmToday();
  if (!week || !isOpen(week, today)) return jsonError("این هفته هنوز باز نشده است.", 403);
  if (week.start_date) { const d = new Date(week.start_date + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + dayIndex); if (d.toISOString().slice(0, 10) > today) return jsonError("روز آینده را نمی‌توان تیک زد.", 403); }
  if (done) await DB.prepare("INSERT INTO hefz_plan_progress(user_id,week_number,day_index) VALUES(?,?,?) ON CONFLICT DO NOTHING").bind(user.id, weekNumber, dayIndex).run();
  else await DB.prepare("DELETE FROM hefz_plan_progress WHERE user_id=? AND week_number=? AND day_index=?").bind(user.id, weekNumber, dayIndex).run();
  return Response.json({ ok: true, weekNumber, dayIndex, done });
 }
}}});
