import type { bindings } from "./bindings.server";
import { parseVideoUrl, type VideoKind, type VideoView } from "./video";

type DB = NonNullable<ReturnType<typeof bindings>["DB"]>;
type Row = { week_index: number; id: string; title: string; kind: VideoKind; url: string; description: string; duration_text: string; range_note: string };

/** Active videos linked to the given weeks of a program, per week in link order, with the viewer's watched flag. Caller decides which weeks the viewer may see (open weeks only). */
export async function videosForWeeks(DB: DB, programId: string, weekIndexes: number[], userId: string | null): Promise<Map<number, VideoView[]>> {
  const out = new Map<number, VideoView[]>(); if (!weekIndexes.length) return out;
  const open = new Set(weekIndexes);
  try { return await load(DB, programId, open, userId, out); } catch { return new Map(); }   // videos are an extra: a missing table (migration not yet applied) must never break the plan
}
async function load(DB: DB, programId: string, open: Set<number>, userId: string | null, out: Map<number, VideoView[]>) {
  const rows = (await DB.prepare("SELECT l.week_index,v.id,v.title,v.kind,v.url,v.description,v.duration_text,v.range_note FROM program_week_videos l JOIN videos v ON v.id=l.video_id WHERE l.program_id=? AND v.active ORDER BY l.week_index,l.sort_order,v.sort_order,v.created_at").bind(programId).all<Row>()).results || [];
  const seen = new Set<string>(userId ? ((await DB.prepare("SELECT video_id FROM video_views WHERE user_id=?").bind(userId).all<{ video_id: string }>()).results || []).map(r => r.video_id) : []);
  for (const r of rows) {
    if (!open.has(Number(r.week_index))) continue;
    const p = parseVideoUrl(r.url); if (!p) continue;   // a stored URL that no longer validates is never served
    const v: VideoView = { id: r.id, title: r.title, kind: r.kind, description: r.description, duration: r.duration_text, range: r.range_note, provider: p.provider, url: p.url, embed: p.embed, watched: seen.has(r.id) };
    const list = out.get(Number(r.week_index)) ?? []; list.push(v); out.set(Number(r.week_index), list);
  }
  return out;
}

/** Per video: how many of the given class's members have ticked «دیدم». */
export async function seenCounts(DB: DB, classId: string, videoIds: string[]): Promise<Map<string, number>> {
  const m = new Map<string, number>(); if (!videoIds.length) return m;
  try {
    const rows = (await DB.prepare("SELECT vv.video_id,COUNT(*) AS n FROM video_views vv JOIN class_members cm ON cm.user_id=vv.user_id AND cm.class_id=? GROUP BY vv.video_id").bind(classId).all<{ video_id: string; n: number }>()).results || [];
    for (const r of rows) m.set(r.video_id, Number(r.n));
  } catch { /* see above */ }
  return m;
}
