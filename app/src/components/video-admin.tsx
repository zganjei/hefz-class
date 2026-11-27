import { useCallback, useEffect, useState } from "react";
import { Notice } from "./notice";
import { Confirm } from "./admin-ui";
import { KIND_FA, VIDEO_KINDS, parseVideoUrl, type VideoKind, type VideoProvider } from "../lib/video";

const fa = (n: number | string) => String(n).replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[+d]);
type Vid = { id: string; title: string; kind: VideoKind; url: string; provider: VideoProvider; description: string; duration_text: string; range_note: string; sort_order: number; active: boolean; links: number };
type WeekRow = { week_index: number; title: string; surah: string | null; videoIds: string[] };
type ProgramData = { videos: Vid[]; program?: { id: string; name: string }; weeks?: WeekRow[] };
const PROVIDER_FA: Record<VideoProvider, string> = { youtube: "یوتیوب", aparat: "آپارات", drive: "گوگل درایو", file: "فایل مستقیم", link: "لینک ساده" };
async function call(method: "GET" | "POST", qs = "", body?: unknown) {
  const r = await fetch("/api/videos" + qs, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({ error: "پاسخ نامعتبر بود." }));
  if (!r.ok) throw new Error(d.error || "خطا");
  return d;
}
const blank = { title: "", kind: "tadabbur" as VideoKind, url: "", description: "", duration_text: "", range_note: "", sort_order: "0" };

/** Admin: the video library (add / edit / delete) with a quick «افزودن به چند هفته» action. */
export function VideoLibrary() {
  const [videos, setVideos] = useState<Vid[]>([]), [programs, setPrograms] = useState<{ id: string; name: string; weeks: number }[]>([]);
  const [form, setForm] = useState({ ...blank }), [editId, setEditId] = useState<string | null>(null), [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState(""), [ok, setOk] = useState("");
  const [multi, setMulti] = useState<{ videoId: string; programId: string; weeks: WeekRow[]; picked: number[] } | null>(null);
  const load = useCallback(async () => {
    try { const d = await call("GET"); setVideos(d.videos); const p = await fetch("/api/programs").then(r => r.json()).catch(() => ({})); setPrograms((p.programs || []).filter((x: any) => x.weeks > 0)); setMsg(""); } catch (e: any) { setMsg(e.message); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const run = async (fn: () => Promise<void>) => { setBusy(true); setMsg(""); setOk(""); try { await fn(); } catch (e: any) { setMsg(e.message); } finally { setBusy(false); } };
  const detected = form.url.trim() ? parseVideoUrl(form.url) : null;
  const save = () => run(async () => {
    const r = await call("POST", "", { action: editId ? "update" : "create", id: editId || undefined, ...form, active: editId ? videos.find(v => v.id === editId)?.active : true });
    setOk(`ویدئو ذخیره شد ✅ (${PROVIDER_FA[r.provider as VideoProvider]})`); setForm({ ...blank }); setEditId(null); await load();
  });
  const edit = (v: Vid) => { setEditId(v.id); setForm({ title: v.title, kind: v.kind, url: v.url, description: v.description, duration_text: v.duration_text, range_note: v.range_note, sort_order: String(v.sort_order) }); setOk(""); setMsg(""); };
  const del = (id: string) => run(async () => { await call("POST", "", { action: "delete", id }); setConfirmDel(null); setOk("ویدئو حذف شد ✅"); await load(); });
  const toggleActive = (v: Vid) => run(async () => { await call("POST", "", { action: "update", id: v.id, title: v.title, kind: v.kind, url: v.url, description: v.description, duration_text: v.duration_text, range_note: v.range_note, sort_order: v.sort_order, active: !v.active }); await load(); });
  const openMulti = (v: Vid) => run(async () => {
    if (multi?.videoId === v.id) { setMulti(null); return; }
    const pid = programs[0]?.id || ""; if (!pid) throw new Error("هنوز برنامه‌ای با هفته ثبت نشده است.");
    const d: ProgramData = await call("GET", `?programId=${encodeURIComponent(pid)}`); setMulti({ videoId: v.id, programId: pid, weeks: d.weeks || [], picked: [] });
  });
  const pickProgram = (pid: string) => run(async () => { const d: ProgramData = await call("GET", `?programId=${encodeURIComponent(pid)}`); setMulti(m => m && { ...m, programId: pid, weeks: d.weeks || [], picked: [] }); });
  const addMulti = () => run(async () => {
    if (!multi) return; const r = await call("POST", "", { action: "addToWeeks", programId: multi.programId, videoId: multi.videoId, weekIndexes: multi.picked });
    setOk(`به ${fa(r.added)} هفته اضافه شد ✅`); setMulti(null); await load();
  });
  return <div className="adm-stack">
    <p className="adm-hint">ویدئوهای تدبر و درس را یک‌بار اینجا اضافه کنید؛ بعد در «برنامه‌های حفظ» هر هفته را به یک یا چند ویدئو وصل کنید.</p>
    <Notice msg={msg || ok} />
    <div className="adm-block">
      <h3>{editId ? "ویرایش ویدئو" : "ویدئوی جدید"}</h3>
      <label>عنوان<input value={form.title} maxLength={120} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="تدبر سوره فتح، آیات ۱–۱۰" /></label>
      <label>نوع<select value={form.kind} onChange={e => setForm({ ...form, kind: e.target.value as VideoKind })}>{VIDEO_KINDS.map(k => <option key={k} value={k}>{KIND_FA[k]}</option>)}</select></label>
      <label>نشانی ویدئو (لینک را بچسبانید)<input dir="ltr" inputMode="url" value={form.url} maxLength={500} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://…" /></label>
      {form.url.trim() && <small className={detected ? "" : "error-msg"}>{detected ? `تشخیص: ${PROVIDER_FA[detected.provider]}${detected.embed ? "، پخش داخل برنامه" : "، دکمهٔ باز کردن لینک"}` : "این نشانی معتبر نیست (فقط http و https)."}</small>}
      <label>توضیح کوتاه (اختیاری)<textarea value={form.description} maxLength={500} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
      <label>مدت (اختیاری، مثلاً ۴ دقیقه)<input value={form.duration_text} maxLength={20} onChange={e => setForm({ ...form, duration_text: e.target.value })} /></label>
      <label>سوره و آیات (اختیاری)<input value={form.range_note} maxLength={80} onChange={e => setForm({ ...form, range_note: e.target.value })} placeholder="سورهٔ فتح ۱–۱۰" /></label>
      <label>ترتیب (عدد کوچک‌تر بالاتر)<input dir="ltr" inputMode="numeric" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: e.target.value.replace(/[^\d-]/g, "") })} /></label>
      <div className="adm-actions">
        <button type="button" className="adm-btn" disabled={busy || form.title.trim().length < 2 || !detected} onClick={() => void save()}>{editId ? "ذخیره‌ی تغییرات" : "افزودن ویدئو"}</button>
        {editId && <button type="button" className="adm-btn quiet" disabled={busy} onClick={() => { setEditId(null); setForm({ ...blank }); }}>انصراف</button>}
      </div>
    </div>
    <div className="adm-block">
      <h3>ویدئوهای ثبت‌شده</h3>
      {!videos.length && <p className="empty-state">هنوز ویدئویی ثبت نشده است.</p>}
      {videos.map(v => <div key={v.id} className="adm-card">
        <div className="adm-row"><b>{fa(v.title)}</b><small>{KIND_FA[v.kind]} · {PROVIDER_FA[v.provider]} · {v.links ? `${fa(v.links)} هفته` : "به هفته‌ای وصل نیست"}{v.active ? "" : " · غیرفعال"}</small></div>
        {confirmDel === v.id ? <Confirm text={`ویدئوی «${v.title}» حذف شود؟ از همهٔ هفته‌ها هم برداشته می‌شود.`} yes="بله، حذف شود" busy={busy} onYes={() => void del(v.id)} onNo={() => setConfirmDel(null)} /> : <div className="adm-actions">
          <button type="button" className="adm-btn quiet sm" disabled={busy} onClick={() => edit(v)}>ویرایش</button>
          <button type="button" className="adm-btn quiet sm" disabled={busy} aria-expanded={multi?.videoId === v.id} onClick={() => void openMulti(v)}>افزودن به چند هفته</button>
          <button type="button" className="adm-btn quiet sm" disabled={busy} onClick={() => void toggleActive(v)}>{v.active ? "غیرفعال" : "فعال"}</button>
          <button type="button" className="adm-btn danger sm" disabled={busy} onClick={() => setConfirmDel(v.id)}>حذف</button>
        </div>}
        {multi?.videoId === v.id && <div className="adm-note">
          <label>برنامه<select value={multi.programId} onChange={e => void pickProgram(e.target.value)}>{programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <div className="vid-checks">{multi.weeks.map(w => <label key={w.week_index}><input type="checkbox" checked={multi.picked.includes(w.week_index)} onChange={e => setMulti(m => m && { ...m, picked: e.target.checked ? [...m.picked, w.week_index] : m.picked.filter(x => x !== w.week_index) })} />هفتهٔ {fa(w.week_index)} · {w.title}{w.videoIds.includes(v.id) ? " (وصل است)" : ""}</label>)}</div>
          <button type="button" className="adm-btn" disabled={busy || !multi.picked.length} onClick={() => void addMulti()}>افزودن به {fa(multi.picked.length)} هفته</button>
        </div>}
      </div>)}
    </div>
  </div>;
}

/** Admin, inside one program: its weeks with the attached videos (multi-select from the library, reorder, remove). */
export function ProgramVideos({ programId, otherPrograms }: { programId: string; otherPrograms: { id: string; name: string }[] }) {
  const [data, setData] = useState<ProgramData | null>(null), [openWeek, setOpenWeek] = useState<number | null>(null), [busy, setBusy] = useState(false), [msg, setMsg] = useState(""), [ok, setOk] = useState(""), [from, setFrom] = useState("");
  const load = useCallback(async () => { try { setData(await call("GET", `?programId=${encodeURIComponent(programId)}`)); setMsg(""); } catch (e: any) { setMsg(e.message); } }, [programId]);
  useEffect(() => { void load(); }, [load]);
  const byId = new Map((data?.videos || []).map(v => [v.id, v]));
  const save = async (w: WeekRow, videoIds: string[]) => {
    setBusy(true); setMsg(""); setOk("");
    try { await call("POST", "", { action: "setWeek", programId, weekIndex: w.week_index, videoIds }); setData(d => d && { ...d, weeks: d.weeks!.map(x => x.week_index === w.week_index ? { ...x, videoIds } : x) }); }
    catch (e: any) { setMsg(e.message); await load(); } finally { setBusy(false); }
  };
  const move = (w: WeekRow, i: number, d: -1 | 1) => { const a = [...w.videoIds], j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; void save(w, a); };
  const copy = async () => { setBusy(true); setMsg(""); setOk(""); try { const r = await call("POST", "", { action: "copyLinks", fromProgramId: from, toProgramId: programId }); setOk(`${fa(r.copied)} پیوند ویدئو کپی شد ✅`); await load(); } catch (e: any) { setMsg(e.message); } finally { setBusy(false); } };
  if (!data) return msg ? <Notice msg={msg} /> : <small>در حال بارگذاری…</small>;
  return <div className="vid-admin-list">
    <Notice msg={msg || ok} />
    {!data.videos.length && <p className="empty-state">اول در «ویدئوها» دست‌کم یک ویدئو اضافه کنید.</p>}
    {(data.weeks || []).map(w => { const open = openWeek === w.week_index, free = data.videos.filter(v => v.active && !w.videoIds.includes(v.id)); return <div key={w.week_index} className="vid-admin-week">
      <button type="button" className="vid-wk" aria-expanded={open} onClick={() => setOpenWeek(open ? null : w.week_index)}>
        <span><b>هفتهٔ {fa(w.week_index)} · {w.title}</b>{w.surah && <small> · {fa(w.surah)}</small>}</span>
        {w.videoIds.length > 0 && <span className="adm-badge">{fa(w.videoIds.length)} ویدئو</span>}
      </button>
      {open && <>
        {w.videoIds.map((id, i) => <div key={id} className="vid-att"><span>{fa(byId.get(id)?.title ?? "ویدئوی حذف‌شده")}</span>
          <button type="button" className="adm-btn quiet sm" disabled={busy || i === 0} aria-label="بالاتر" onClick={() => move(w, i, -1)}>↑</button>
          <button type="button" className="adm-btn quiet sm" disabled={busy || i === w.videoIds.length - 1} aria-label="پایین‌تر" onClick={() => move(w, i, 1)}>↓</button>
          <button type="button" className="adm-btn danger sm" disabled={busy} onClick={() => void save(w, w.videoIds.filter(x => x !== id))}>برداشتن</button></div>)}
        {!w.videoIds.length && <small>هنوز ویدئویی به این هفته وصل نیست.</small>}
        {free.length > 0 && <label>افزودن ویدئو<select value="" disabled={busy} onChange={e => e.target.value && void save(w, [...w.videoIds, e.target.value])}><option value="">انتخاب از کتابخانه…</option>{free.map(v => <option key={v.id} value={v.id}>{fa(v.title)}</option>)}</select></label>}
      </>}
    </div>; })}
    {otherPrograms.length > 0 && <div className="adm-note"><small>اگر این برنامه را دوباره ساخته‌اید، پیوندهای ویدئو را از برنامهٔ قبلی (با شمارهٔ هفته) کپی کنید.</small>
      <label>کپی پیوندها از<select value={from} onChange={e => setFrom(e.target.value)}><option value="">انتخاب برنامه…</option>{otherPrograms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <button type="button" className="adm-btn quiet" disabled={busy || !from} onClick={() => void copy()}>کپی پیوندهای ویدئو</button></div>}
  </div>;
}
