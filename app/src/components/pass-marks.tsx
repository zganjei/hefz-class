import { useEffect, useState } from "react";
import { CRITERIA, GROUP_SUGGESTIONS } from "../lib/pass-marks";

type Mark = { groupId: string; criterion: string; person: string; status: "pass" | "fail"; note: string; source: string; by: string; at: string };
const NEXT: Record<string, "pass" | "fail" | "none"> = { none: "pass", pass: "fail", fail: "none" };
const LABEL: Record<string, string> = { none: "ثبت‌نشده", pass: "قبول", fail: "رد" };
const fa = (n: number | string) => String(n).replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);

async function call(method: "GET" | "POST", path: string, body?: unknown) {
  const r = await fetch(path, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({ error: "پاسخ نامعتبر بود." }));
  if (!r.ok) throw new Error(d.error || "خطا");
  return d;
}

/** قبول / رد دستی: per class, one group (سوره / گام / آزمون) and one criterion at a time; learners are rows, one tap cycles ثبت‌نشده → قبول → رد. Saved per tap. */
export function PassMarks({ classId, say }: { classId: string; say: (m: string) => void }) {
  const [d, setD] = useState<{ groups: { id: string; title: string }[]; learners: { key: string; name: string }[]; marks: Mark[] } | null>(null);
  const [gid, setGid] = useState(""), [crit, setCrit] = useState("exam"), [title, setTitle] = useState(""), [busy, setBusy] = useState(false), [openNote, setOpenNote] = useState(""), [noteText, setNoteText] = useState(""), [confirmDel, setConfirmDel] = useState(false);
  const load = async (keepGroup?: string) => {
    const x = await call("GET", "/api/pass-marks?classId=" + encodeURIComponent(classId));
    setD(x); setGid(g => keepGroup || (x.groups.some((y: any) => y.id === g) ? g : x.groups[0]?.id || ""));
  };
  useEffect(() => { setD(null); setGid(""); setOpenNote(""); setConfirmDel(false); if (classId) load().catch(e => say(e.message)); }, [classId]);
  const act = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); } catch (e: any) { say(e.message || "ذخیره نشد؛ دوباره تلاش کنید."); } finally { setBusy(false); } };
  const addGroup = (t: string) => act(async () => { const r = await call("POST", "/api/pass-marks", { action: "add-group", classId, title: t }); await load(r.id); setTitle(""); });
  const mark = (p: string) => d?.marks.find(m => m.groupId === gid && m.criterion === crit && m.person === p);
  const tap = async (p: string) => {
    if (!d) return;
    const cur = mark(p)?.status || "none", next = NEXT[cur], before = d.marks;
    // optimistic: the row flips at once, and goes back with a visible message when the save fails
    setD({ ...d, marks: [...before.filter(m => !(m.groupId === gid && m.criterion === crit && m.person === p)), ...(next === "none" ? [] : [{ groupId: gid, criterion: crit, person: p, status: next, note: mark(p)?.note || "", source: "manual", by: "", at: "" } as Mark])] });
    try { await call("POST", "/api/pass-marks", { action: "set-mark", classId, groupId: gid, criterion: crit, person: p, status: next }); }
    catch (e: any) { setD(x => x && { ...x, marks: before }); say("ذخیره نشد: " + (e.message || "خطا") + " — وضعیت قبلی برگردانده شد."); }
  };
  const count = (s: string) => d ? d.learners.filter(l => (mark(l.key)?.status || "none") === s).length : 0;
  return <div className="adm-stack">
    <div className="adm-block">
      <h3>قبول و رد (ثبت دستی)</h3>
      <p className="adm-hint">برای هر قرآن‌آموز، قبول یا رد شدن در آزمون و هر معیار دفتر نمرات را ثبت کنید. هر بار لمس: ثبت‌نشده ← قبول ← رد ← ثبت‌نشده. هر لمس همان لحظه ذخیره می‌شود.</p>
    </div>
    {classId && d && <div className="adm-block">
      {d.groups.length === 0 && <p className="adm-hint">اول یک گروه بسازید؛ مثلاً یک سوره یا «آزمون گام اول».</p>}
      {d.groups.length > 0 && <>
        <label className="adm-hint">گروه (سوره / گام / آزمون)<select value={gid} onChange={e => { setGid(e.target.value); setOpenNote(""); setConfirmDel(false); }}>{d.groups.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}</select></label>
        <label className="adm-hint">معیار<select value={crit} onChange={e => { setCrit(e.target.value); setOpenNote(""); }}>{CRITERIA.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}</select></label>
        <p className="adm-hint">قبول: {fa(count("pass"))} · رد: {fa(count("fail"))} · ثبت‌نشده: {fa(count("none"))}</p>
        <div>
          {d.learners.map(l => { const m = mark(l.key), st = m?.status || "none"; return <div className="adm-row pm-row" key={l.key}>
            <b>{l.name}</b>
            <button type="button" className={"pm-btn " + st} onClick={() => void tap(l.key)} aria-label={l.name + ": " + LABEL[st]}>{LABEL[st]}</button>
            {m && <button type="button" className="adm-btn quiet sm" onClick={() => { setOpenNote(openNote === l.key ? "" : l.key); setNoteText(m.note); }}>{m.note ? "یادداشت ✎" : "یادداشت"}</button>}
            {m && m.source === "import" && <small>از اکسل</small>}
            {m && m.by && <small>{m.by}</small>}
            {openNote === l.key && m && <div className="pm-note">
              <input value={noteText} maxLength={300} onChange={e => setNoteText(e.target.value)} placeholder="یادداشت (اختیاری)" />
              <button type="button" className="adm-btn sm" disabled={busy} onClick={() => void act(async () => { await call("POST", "/api/pass-marks", { action: "set-note", classId, groupId: gid, criterion: crit, person: l.key, note: noteText }); setOpenNote(""); await load(gid); say("یادداشت ذخیره شد ✅"); })}>ذخیره</button>
            </div>}
          </div>; })}
          {!d.learners.length && <p className="adm-hint">قرآن‌آموزی در این کلاس نیست.</p>}
        </div>
        {confirmDel
          ? <div className="adm-actions"><button type="button" className="adm-btn danger" disabled={busy} onClick={() => void act(async () => { await call("POST", "/api/pass-marks", { action: "delete-group", classId, groupId: gid }); setConfirmDel(false); await load(); say("گروه و ثبت‌هایش پاک شد ✅"); })}>بله، پاک شود</button><button type="button" className="adm-btn quiet" onClick={() => setConfirmDel(false)}>انصراف</button></div>
          : <button type="button" className="adm-btn danger sm" onClick={() => setConfirmDel(true)}>حذف این گروه و ثبت‌هایش</button>}
      </>}
      <h4>گروه تازه</h4>
      <div className="pm-chips">{GROUP_SUGGESTIONS.filter(s => !d.groups.some(g => g.title === s)).map(s => <button type="button" key={s} className="adm-btn quiet sm" disabled={busy} onClick={() => void addGroup(s)}>+ {s}</button>)}</div>
      <input value={title} maxLength={80} onChange={e => setTitle(e.target.value)} placeholder="یا عنوان دلخواه، مثلاً سوره جمعه" />
      <button type="button" className="adm-btn" disabled={busy || !title.trim()} onClick={() => void addGroup(title)}>افزودن گروه</button>
    </div>}
  </div>;
}
