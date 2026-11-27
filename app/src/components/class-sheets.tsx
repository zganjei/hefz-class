import { useEffect, useState } from "react";
import { Notice } from "./notice";

type User = { id: string; role: "admin" | "teacher" | "memorizer" };
const fa = (n: number | string) => String(n).replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
const composeName = (base: string, year: string) => base.trim().replace(/\s+/g, " ") + (year.trim() ? " ورودی " + fa(year.trim()) : "");
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
      <span>{fa(c.activeCount)} قرآن‌آموز فعال{c.teacher && user.role === "admin" ? " · استاد: " + c.teacher : ""}</span>
      {c.hasProgram
        ? <span>برنامه: {c.program}{c.currentWeek ? " · الان در هفتهٔ " + fa(c.currentWeek.week_number) + " · " + c.currentWeek.title : c.status === "ended" ? " · برنامه تمام شده" : " · هنوز شروع نشده"}</span>
        : <span>جایگاه: {c.positionNote || "ثبت نشده"} · برنامه‌ای به این کلاس وصل نیست</span>}
      {c.hasProgram && c.positionNote && <span>یادداشت جایگاه: {c.positionNote}</span>}
    </button>)}
    {cards && !cards.length && <p className="empty-state">هنوز کلاسی ایجاد یا به شما اختصاص داده نشده است.</p>}
    <Notice msg={msg} />
  </section>;
}

function ClassSheet({ id, user, back }: { id: string; user: User; back: () => void }) {
  const [d, setD] = useState<any>(null), [busy, setBusy] = useState(false), [msg, setMsg] = useState("");
  const [programs, setPrograms] = useState<{ id: string; name: string; weeks: number }[] | null>(null), [pick, setPick] = useState(""), [pickWeek, setPickWeek] = useState(""), [confirm, setConfirm] = useState<"" | "change" | "remove">("");
  const [term, setTerm] = useState(""), [pos, setPos] = useState(""), [openKey, setOpenKey] = useState(""), [wk, setWk] = useState("");
  const run = async (fn: () => Promise<void>) => { setBusy(true); setMsg(""); try { await fn(); } catch (e: any) { setMsg(e.message); } finally { setBusy(false); } };
  const [nm, setNm] = useState(""), [yr, setYr] = useState("");
  const load = async () => { const x = await call("GET", "/api/class-sheet?classId=" + encodeURIComponent(id)); setD(x); const m = /^(.*?)\s*ورودی\s*([0-9۰-۹]{4})\s*$/.exec(x.name); setNm(m ? m[1] : x.name); setYr(m ? fa(m[2]) : ""); setTerm(x.term); setPos(x.positionNote); setWk(x.currentWeek ? String(x.currentWeek.week_number) : ""); };
  useEffect(() => { void run(load); }, [id]);
  useEffect(() => { call("GET", "/api/programs").then(x => setPrograms(x.programs || [])).catch(() => setPrograms([])); }, []);
  if (!d) return <section className="panel"><button className="secondary-action" onClick={back}>← کلاس‌ها</button>{msg ? <p className="error-msg">{msg}</p> : <p className="empty-state">در حال بارگذاری…</p>}</section>;
  return <section className="panel">
    <button className="secondary-action" onClick={back}>← کلاس‌ها</button>
    <h2 style={{ marginTop: 12 }}>{d.name}</h2>
    <p className="plan-hint">{fa(d.active.length)} قرآن‌آموز فعال{d.hasProgram ? " · برنامه: " + d.program + (d.currentWeek ? " · الان در هفتهٔ " + fa(d.currentWeek.week_number) + " · " + d.currentWeek.title : d.status === "ended" ? " · برنامه تمام شده" : " · هنوز شروع نشده") : " · برنامه‌ای به این کلاس وصل نیست"}</p>
    <div className="report-form">
      <h3>برنامه‌ی کلاس</h3>
      {programs && !programs.length && <p className="plan-hint">هنوز برنامه‌ای تعریف نشده؛ مدیر باید آن را بسازد.</p>}
      {!!programs?.length && <>
        {d.hasProgram && <p className="plan-hint">برنامه‌ی فعلی: {d.program}</p>}
        <label>{d.hasProgram ? "تغییر برنامه" : "انتخاب برنامه"}<select value={pick} onChange={e => { setPick(e.target.value); setPickWeek(""); setConfirm(""); }}><option value="">انتخاب برنامه</option>{programs.filter(p => p.weeks > 0).map(p => <option key={p.id} value={p.id}>{p.name} ({fa(p.weeks)} هفته)</option>)}</select></label>
        {pick && <label>آغاز از هفته‌ی (اختیاری)<input type="number" inputMode="numeric" min={1} max={programs.find(p => p.id === pick)?.weeks || 1} value={pickWeek} onChange={e => setPickWeek(e.target.value)} placeholder="۱" /></label>}
        {pick && (d.hasProgram && d.programId !== pick && confirm !== "change"
          ? <button className="primary-wide" disabled={busy} onClick={() => setConfirm("change")}>ذخیره‌ی برنامه</button>
          : <button className="primary-wide" disabled={busy} onClick={() => void run(async () => { await call("POST", "/api/programs", { action: "assign", classId: id, programId: pick, ...(pickWeek ? { weekNumber: Number(pickWeek) } : {}) }); setPick(""); setPickWeek(""); setConfirm(""); await load(); setMsg("برنامه‌ی کلاس ذخیره شد ✅"); })}>{confirm === "change" ? "بله، برنامه عوض شود" : "ذخیره‌ی برنامه"}</button>)}
        {confirm === "change" && <p className="plan-hint">برنامه‌ی کلاس عوض می‌شود و برنامه‌ی روزانه‌ی قرآن‌آموزان از برنامه‌ی تازه می‌آید. ثبت‌های قبلی (تیک‌ها) پاک نمی‌شوند.</p>}
        {d.hasProgram && (confirm === "remove"
          ? <><p className="plan-hint">برنامه از کلاس برداشته می‌شود و کلاس به برنامه‌ی عمومی برمی‌گردد. تیک‌ها پاک نمی‌شوند.</p><button className="secondary-action" disabled={busy} onClick={() => void run(async () => { await call("POST", "/api/programs", { action: "assign", classId: id, programId: "" }); setConfirm(""); await load(); setMsg("برنامه از کلاس برداشته شد ✅"); })}>بله، برداشته شود</button></>
          : <button className="secondary-action" disabled={busy} onClick={() => setConfirm("remove")}>برداشتن برنامه از کلاس</button>)}
        {confirm && <button className="secondary-action" onClick={() => setConfirm("")}>انصراف</button>}
      </>}
    </div>
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
      : <p className="plan-hint">{user.role === "admin" ? "برای تنظیم هفته‌ی کلاس، اول بالا «برنامه‌ی کلاس» را انتخاب کنید. تا آن موقع جایگاه کلاس را در کادر «جایگاه فعلی کلاس» بنویسید." : "برای تنظیم هفته‌ی کلاس، اول بالا «برنامه‌ی کلاس» را انتخاب کنید. تا آن موقع جایگاه کلاس را در کادر «جایگاه فعلی کلاس» بنویسید."}</p>}
    <div className="report-form">
      <h3>نام و سال ورودی کلاس</h3>
      <label>نام کلاس<input value={nm} onChange={e => setNm(e.target.value)} maxLength={80} /></label>
      <label>سال ورودی (اختیاری)<input inputMode="numeric" value={yr} onChange={e => setYr(e.target.value.replace(/[^0-9۰-۹]/g, "").slice(0, 4))} placeholder="مثلاً ۱۴۰۴" /></label>
      <p className="plan-hint">نام نهایی: {composeName(nm, yr) || "—"}</p>
      <button className="secondary-action" disabled={busy || !nm.trim() || composeName(nm, yr) === d.name} onClick={() => void run(async () => { await call("POST", "/api/class-sheet", { action: "update-class", classId: id, name: composeName(nm, yr), term: d.term, positionNote: d.positionNote }); await load(); setMsg("نام کلاس ذخیره شد ✅"); })}>ذخیره‌ی نام و سال ورودی</button>
    </div>
    <div className="report-form">
      <label>ترم یا دوره<input value={term} onChange={e => setTerm(e.target.value)} /></label>
      <label>جایگاه فعلی کلاس<input value={pos} onChange={e => setPos(e.target.value)} placeholder="مثلاً آل‌عمران، هفت صفحه‌ی اول تمام شده" /></label>
      <button className="secondary-action" disabled={busy || (term === d.term && pos === d.positionNote)} onClick={() => void run(async () => { await call("POST", "/api/class-sheet", { action: "update-class", classId: id, term, positionNote: pos }); await load(); setMsg("ذخیره شد ✅"); })}>ذخیره‌ی ترم و جایگاه</button>
    </div>
    <h3 className="sheet-h">قرآن‌آموزان فعال</h3>
    {d.active.map((l: any) => <Learner say={setMsg} key={l.key} l={l} className={d.name} classPos={d.positionNote} classTerm={d.term} classId={id} open={openKey === l.key} toggle={() => setOpenKey(openKey === l.key ? "" : l.key)} run={run} busy={busy} reload={load} />)}
    {!d.active.length && <p className="empty-state">قرآن‌آموزی در این کلاس نیست.</p>}
    {d.left.length > 0 && <>
      <h3 className="sheet-h">سابقه (ترک‌کرده‌ها)</h3>
      <p className="plan-hint">این‌ها در شمارش فعال‌ها نیستند. سابقه‌شان می‌ماند و هر وقت برگردند می‌توانید ثبت کنید.</p>
      {d.left.map((l: any) => <Learner say={setMsg} key={l.key} l={l} left className={d.name} classPos={d.positionNote} classTerm={d.term} classId={id} open={openKey === l.key} toggle={() => setOpenKey(openKey === l.key ? "" : l.key)} run={run} busy={busy} reload={load} />)}
    </>}
    <Notice msg={msg} />
  </section>;
}

function Learner({ say, l, left, className, classTerm, classPos, classId, open, toggle, run, busy, reload }: { say: (m: string) => void; l: any; left?: boolean; className: string; classTerm: string; classPos: string; classId: string; open: boolean; toggle: () => void; run: (fn: () => Promise<void>) => Promise<void>; busy: boolean; reload: () => Promise<void> }) {
  const [title, setTitle] = useState(""), [score, setScore] = useState(""), [max, setMax] = useState(""), [date, setDate] = useState(""), [note, setNote] = useState("");
  const all = l.digital.length + l.manual.length;
  const [lt, setLt] = useState(classTerm), [lp, setLp] = useState(classPos), [lr, setLr] = useState(""), [ld, setLd] = useState(""), [confirm, setConfirm] = useState(false), [rm, setRm] = useState(false);
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
      <div className="report-form">
        <h4>حذف از کلاس</h4>
        <p className="plan-hint">اگر این قرآن‌آموز هرگز در این کلاس نبوده (یا اشتباهی اضافه شده)، از فهرست همین کلاس برداشته می‌شود. حساب، نمره‌ها و سابقه‌اش پاک نمی‌شود؛ برای کسی که کلاس را ترک کرده، «ترک کرد» را بزنید.</p>
        {!rm ? <button className="secondary-action" disabled={busy} onClick={() => setRm(true)}>حذف از کلاس…</button>
          : <><p className="plan-hint">«{l.name}» از کلاس «{className}» برداشته شود؟ حساب و سابقه‌ی او پاک نمی‌شود.</p>
            <button className="primary-wide" disabled={busy} onClick={() => void run(async () => { const d = await call("POST", "/api/class-sheet", { action: "remove-member", classId, person: l.key }); setRm(false); await reload(); say(`«${d.removed}» از کلاس «${d.className}» برداشته شد ✅`); })}>بله، از کلاس برداشته شود</button>
            <button className="secondary-action" onClick={() => setRm(false)}>انصراف</button></>}
      </div>
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
