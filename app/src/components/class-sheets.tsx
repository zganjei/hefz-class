import { useEffect, useState } from "react";

type User = { id: string; role: "admin" | "teacher" | "memorizer" };
const fa = (n: number | string) => String(n).replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
const sc = (s: number, m: number | null) => fa(s) + (m ? "/" + fa(m) : "");

async function call(method: "GET" | "POST", path: string, body?: unknown) {
  const r = await fetch(path, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({ error: "پاسخ نامعتبر بود." }));
  if (!r.ok) throw new Error(d.error || "خطا");
  return d;
}

/** کلاس‌ها: a card per class of the teacher (admin: all), a form for a new class/term, and one sheet per class (active learners, info, digital and hand-entered scores). */
export function ClassSheets({ user, onChanged }: { user: User; onChanged?: () => void }) {
  const [cards, setCards] = useState<any[] | null>(null), [open, setOpen] = useState(""), [busy, setBusy] = useState(false), [msg, setMsg] = useState("");
  const [name, setName] = useState(""), [term, setTerm] = useState(""), [pos, setPos] = useState("");
  const run = async (fn: () => Promise<void>) => { setBusy(true); setMsg(""); try { await fn(); } catch (e: any) { setMsg(e.message); } finally { setBusy(false); } };
  const load = async () => setCards((await call("GET", "/api/class-sheet")).classes);
  useEffect(() => { void run(load); }, []);
  if (open) return <ClassSheet id={open} user={user} back={() => { setOpen(""); void run(load); }} />;
  return <section className="panel">
    <h2>کلاس‌های من</h2>
    {user.role === "teacher" && <div className="report-form">
      <h3>کلاس یا ترم جدید</h3>
      <label>نام کلاس<input value={name} onChange={e => setName(e.target.value)} placeholder="مثلاً ورودی ۱۴۰۵ گام اول" /></label>
      <label>ترم یا دوره (اختیاری)<input value={term} onChange={e => setTerm(e.target.value)} placeholder="مثلاً ترم سوم" /></label>
      <label>جایگاه فعلی کلاس (اختیاری)<input value={pos} onChange={e => setPos(e.target.value)} placeholder="مثلاً آل‌عمران، هفت صفحه‌ی اول تمام شده" /></label>
      <button className="primary-wide" disabled={busy || !name.trim()} onClick={() => void run(async () => { await call("POST", "/api/classes", { name, term, positionNote: pos }); setName(""); setTerm(""); setPos(""); await load(); onChanged?.(); setMsg("کلاس ساخته شد ✅"); })}>ایجاد کلاس</button>
    </div>}
    {!cards && !msg && <p className="empty-state">در حال بارگذاری…</p>}
    {cards?.map(c => <button type="button" className="sheet-card" key={c.id} onClick={() => setOpen(c.id)}>
      <b>{c.name}{c.term ? " · " + c.term : ""}</b>
      <span>{fa(c.activeCount)} قرآن‌آموز فعال{c.teacher && user.role === "admin" ? " · معلم: " + c.teacher : ""}</span>
      {c.hasProgram
        ? <span>برنامه: {c.program}{c.currentWeek ? " · الان در هفتهٔ " + fa(c.currentWeek.week_number) + " · " + c.currentWeek.title : c.status === "ended" ? " · برنامه تمام شده" : " · هنوز شروع نشده"}</span>
        : <span>جایگاه: {c.positionNote || "ثبت نشده"} · برنامه‌ای به این کلاس وصل نیست</span>}
      {c.hasProgram && c.positionNote && <span>یادداشت جایگاه: {c.positionNote}</span>}
    </button>)}
    {cards && !cards.length && <p className="empty-state">هنوز کلاسی ایجاد یا به شما اختصاص داده نشده است.</p>}
    {msg && <p className={msg.includes("✅") ? "hint" : "error-msg"}>{msg}</p>}
  </section>;
}

function ClassSheet({ id, user, back }: { id: string; user: User; back: () => void }) {
  const [d, setD] = useState<any>(null), [busy, setBusy] = useState(false), [msg, setMsg] = useState("");
  const [term, setTerm] = useState(""), [pos, setPos] = useState(""), [openKey, setOpenKey] = useState(""), [wk, setWk] = useState("");
  const run = async (fn: () => Promise<void>) => { setBusy(true); setMsg(""); try { await fn(); } catch (e: any) { setMsg(e.message); } finally { setBusy(false); } };
  const load = async () => { const x = await call("GET", "/api/class-sheet?classId=" + encodeURIComponent(id)); setD(x); setTerm(x.term); setPos(x.positionNote); setWk(x.currentWeek ? String(x.currentWeek.week_number) : ""); };
  useEffect(() => { void run(load); }, [id]);
  if (!d) return <section className="panel"><button className="secondary-action" onClick={back}>← کلاس‌ها</button>{msg ? <p className="error-msg">{msg}</p> : <p className="empty-state">در حال بارگذاری…</p>}</section>;
  return <section className="panel">
    <button className="secondary-action" onClick={back}>← کلاس‌ها</button>
    <h2 style={{ marginTop: 12 }}>{d.name}</h2>
    <p className="plan-hint">{fa(d.active.length)} قرآن‌آموز فعال{d.hasProgram ? " · برنامه: " + d.program + (d.currentWeek ? " · الان در هفتهٔ " + fa(d.currentWeek.week_number) + " · " + d.currentWeek.title : d.status === "ended" ? " · برنامه تمام شده" : " · هنوز شروع نشده") : " · برنامه‌ای به این کلاس وصل نیست"}</p>
    {d.hasProgram
      ? <div className="report-form">
          <h3>جایگاه واقعی کلاس</h3>
          <p className="plan-hint">اگر کلاس در عمل جلوتر یا عقب‌تر از تاریخ برنامه است، هفته‌ی واقعی را اینجا بگذارید. برنامه‌ی روزانه‌ی قرآن‌آموزان هم از همین هفته ادامه پیدا می‌کند.</p>
          <div className="inline-form">
            <button className="secondary-action" disabled={busy || d.status === "none"} onClick={() => void run(async () => { await call("POST", "/api/class-sheet", { action: "set-position", classId: id, delta: -1 }); await load(); setMsg("جایگاه کلاس تغییر کرد ✅"); })}>هفته‌ی قبل</button>
            <button className="secondary-action" disabled={busy} onClick={() => void run(async () => { await call("POST", "/api/class-sheet", { action: "set-position", classId: id, delta: 1 }); await load(); setMsg("جایگاه کلاس تغییر کرد ✅"); })}>هفته‌ی بعد</button>
          </div>
          <label>هفته‌ی واقعی کلاس<select value={wk} onChange={e => setWk(e.target.value)}><option value="">انتخاب هفته</option>{d.programWeeks.map((w: any) => <option key={w.week_number} value={w.week_number}>هفتهٔ {fa(w.week_number)} · {w.title}</option>)}</select></label>
          <button className="primary-wide" disabled={busy || !wk || String(d.currentWeek?.week_number ?? "") === wk} onClick={() => void run(async () => { await call("POST", "/api/class-sheet", { action: "set-position", classId: id, weekNumber: Number(wk) }); await load(); setMsg("جایگاه کلاس ذخیره شد ✅"); })}>ذخیره‌ی جایگاه</button>
        </div>
      : <p className="plan-hint">{user.role === "admin" ? "برای تنظیم هفته‌ی کلاس، اول از «درخواست‌ها» ← «برنامه‌های مطالعه» یک برنامه به این کلاس بدهید. تا آن موقع جایگاه کلاس را در کادر «جایگاه فعلی کلاس» بنویسید." : "برای تنظیم هفته‌ی کلاس، مدیر باید اول یک برنامه به این کلاس بدهد. تا آن موقع جایگاه کلاس را در کادر «جایگاه فعلی کلاس» بنویسید."}</p>}
    <div className="report-form">
      <label>ترم یا دوره<input value={term} onChange={e => setTerm(e.target.value)} /></label>
      <label>جایگاه فعلی کلاس<input value={pos} onChange={e => setPos(e.target.value)} placeholder="مثلاً آل‌عمران، هفت صفحه‌ی اول تمام شده" /></label>
      <button className="secondary-action" disabled={busy || (term === d.term && pos === d.positionNote)} onClick={() => void run(async () => { await call("POST", "/api/class-sheet", { action: "update-class", classId: id, term, positionNote: pos }); await load(); setMsg("ذخیره شد ✅"); })}>ذخیره‌ی ترم و جایگاه</button>
    </div>
    <h3 className="sheet-h">قرآن‌آموزان فعال</h3>
    {d.active.map((l: any) => <Learner key={l.key} l={l} classPos={d.positionNote} classTerm={d.term} classId={id} open={openKey === l.key} toggle={() => setOpenKey(openKey === l.key ? "" : l.key)} run={run} busy={busy} reload={load} />)}
    {!d.active.length && <p className="empty-state">قرآن‌آموزی در این کلاس نیست.</p>}
    {d.left.length > 0 && <>
      <h3 className="sheet-h">سابقه (ترک‌کرده‌ها)</h3>
      <p className="plan-hint">این‌ها در شمارش فعال‌ها نیستند. سابقه‌شان می‌ماند و هر وقت برگردند می‌توانید ثبت کنید.</p>
      {d.left.map((l: any) => <Learner key={l.key} l={l} left classPos={d.positionNote} classTerm={d.term} classId={id} open={openKey === l.key} toggle={() => setOpenKey(openKey === l.key ? "" : l.key)} run={run} busy={busy} reload={load} />)}
    </>}
    {msg && <p className={msg.includes("✅") ? "hint" : "error-msg"}>{msg}</p>}
  </section>;
}

function Learner({ l, left, classTerm, classPos, classId, open, toggle, run, busy, reload }: { l: any; left?: boolean; classTerm: string; classPos: string; classId: string; open: boolean; toggle: () => void; run: (fn: () => Promise<void>) => Promise<void>; busy: boolean; reload: () => Promise<void> }) {
  const [title, setTitle] = useState(""), [score, setScore] = useState(""), [max, setMax] = useState(""), [date, setDate] = useState(""), [note, setNote] = useState("");
  const all = l.digital.length + l.manual.length;
  const [lt, setLt] = useState(classTerm), [lp, setLp] = useState(classPos), [lr, setLr] = useState(""), [ld, setLd] = useState(""), [confirm, setConfirm] = useState(false);
  const last = l.history.filter((h: any) => h.classId === classId).slice(-1)[0];
  return <article className="sheet-learner">
    <button type="button" className="sheet-head" onClick={toggle} aria-expanded={open}><b>{l.name}</b><span>{left && last ? "ترک: " + last.date : all ? fa(all) + " نمره" : "بدون نمره"}{l.registered ? "" : " · هنوز وارد نشده"}</span></button>
    {open && <div className="sheet-body">
      <div className="sheet-info">
        {l.phone && <span>تلفن: <bdi dir="ltr">{l.phone}</bdi></span>}{l.email && <span>ایمیل: <bdi dir="ltr">{l.email}</bdi></span>}
        {l.code && <span>کد: {l.code}</span>}{l.level && <span>سطح: {l.level}</span>}{l.education && <span>تحصیلات: {l.education}</span>}
        {l.hifzAmount && <span>حفظ: {l.hifzAmount}</span>}{l.tadabburAmount && <span>تدبر: {l.tadabburAmount}</span>}{l.notes && <span>یادداشت: {l.notes}</span>}
      </div>
      <h4>سابقه</h4>
      {l.history.map((h: any) => <div className="simple-row" key={h.id}><b>{h.event === "left" ? "ترک کرد" : "برگشت"} · {h.date}</b><span>{[h.className, h.term, h.position && "جایگاه: " + h.position, h.reason && (h.event === "left" ? "دلیل: " : "یادداشت: ") + h.reason].filter(Boolean).join(" · ")}</span></div>)}
      {!l.history.length && <p className="empty-state">سابقه‌ای ثبت نشده است.</p>}
      {left
        ? <div className="report-form">
            <h4>بازگشت به کلاس</h4>
            <label>تاریخ (اختیاری، پیش‌فرض امروز)<input type="date" value={ld} onChange={e => setLd(e.target.value)} /></label>
            <label>یادداشت (اختیاری)<input value={lr} onChange={e => setLr(e.target.value)} /></label>
            <button className="primary-wide" disabled={busy} onClick={() => void run(async () => { await call("POST", "/api/class-sheet", { action: "return", classId, person: l.key, date: ld, reason: lr }); await reload(); })}>ثبت بازگشت</button>
          </div>
        : <div className="report-form">
            <h4>ثبت ترک کلاس</h4>
            <label>ترم<input value={lt} onChange={e => setLt(e.target.value)} /></label>
            <label>تا کجا رسیده بود (سوره یا جایگاه)<input value={lp} onChange={e => setLp(e.target.value)} placeholder="مثلاً سوره‌ی فلان، آیه‌ی ۱۰" /></label>
            <label>دلیل ترک<input value={lr} onChange={e => setLr(e.target.value)} /></label>
            <label>تاریخ (اختیاری، پیش‌فرض امروز)<input type="date" value={ld} onChange={e => setLd(e.target.value)} /></label>
            {!confirm ? <button className="secondary-action" disabled={busy || !lr.trim()} onClick={() => setConfirm(true)}>ترک کرد…</button>
              : <><p className="plan-hint">«{l.name}» از شمارش فعال‌ها کنار می‌رود و در «سابقه» می‌ماند. قابل برگشت است.</p>
                <button className="primary-wide" disabled={busy} onClick={() => void run(async () => { await call("POST", "/api/class-sheet", { action: "leave", classId, person: l.key, term: lt, position: lp, reason: lr, date: ld }); setConfirm(false); setLr(""); await reload(); })}>بله، ثبت شود</button>
                <button className="secondary-action" onClick={() => setConfirm(false)}>انصراف</button></>}
          </div>}
      <h4>نمره‌ها</h4>
      {l.digital.map((s: any, i: number) => <div className="simple-row" key={"d" + i}><b>{s.title}</b><span>{sc(s.score, s.max)} · آزمون سامانه</span></div>)}
      {l.manual.map((s: any) => <div className="simple-row" key={s.id}><b>{s.title}</b><span>{sc(s.score, s.max)}{s.date ? " · " + s.date : ""}{s.note ? " · " + s.note : ""}</span>
        <button className="secondary-action" disabled={busy} onClick={() => void run(async () => { await call("POST", "/api/class-sheet", { action: "delete-score", id: s.id }); await reload(); })}>حذف</button></div>)}
      {!all && <p className="empty-state">هنوز نمره‌ای ثبت نشده است.</p>}
      <div className="report-form">
        <h4>افزودن نمره‌ی دستی</h4>
        <label>عنوان (مثلاً گام اول، ترم دوم)<input value={title} onChange={e => setTitle(e.target.value)} /></label>
        <div className="form-pair"><label>نمره<input inputMode="decimal" value={score} onChange={e => setScore(e.target.value)} /></label><label>از (اختیاری)<input inputMode="decimal" value={max} onChange={e => setMax(e.target.value)} placeholder="۲۰" /></label></div>
        <label>تاریخ (اختیاری)<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
        <label>یادداشت (اختیاری)<input value={note} onChange={e => setNote(e.target.value)} /></label>
        <button className="primary-wide" disabled={busy || !title.trim() || !score.trim()} onClick={() => void run(async () => { await call("POST", "/api/class-sheet", { action: "add-score", classId, person: l.key, title, score, max, date, note }); setTitle(""); setScore(""); setMax(""); setDate(""); setNote(""); await reload(); })}>ثبت نمره</button>
      </div>
    </div>}
  </article>;
}
