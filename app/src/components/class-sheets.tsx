import { useEffect, useRef, useState } from "react";
import { navTo, goBack, useNavSegs } from "../lib/nav";
import { Notice } from "./notice";
import { LevelStepEditor, LevelStepChips, LevelStepFilter, matchesLS } from "./level-step";
import { Exams } from "./exams";
import { ClassReports } from "./class-reports";
import { searchNorm, displayTeacherName, displayClassName, displayClassNames } from "../lib/teacher-name";

import { hasRole } from "../lib/roles";
import { TeacherPlan, LearnerPlan, ClassPosition } from "./hefz-plan";

type User = { id: string; role: "admin" | "teacher" | "memorizer"; roles?: string[] };
const fa = (n: number | string) => String(n).replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
const composeName = (base: string, year: string) => base.trim().replace(/\s+/g, " ") + (year.trim() ? " ورودی " + fa(year.trim()) : "");
const sc = (s: number, m: number | null) => fa(s) + (m ? "/" + fa(m) : "");

async function call(method: "GET" | "POST", path: string, body?: unknown) {
  const r = await fetch(path, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({ error: "پاسخ نامعتبر بود." }));
  if (!r.ok) throw new Error(d.error || "خطا");
  return d;
}

const weekLine = (c: any) => c.hasProgram
  ? "جایگاه: " + (c.currentWeek ? "هفتهٔ " + fa(c.currentWeek.week_number) + " · " + c.currentWeek.title : c.status === "ended" ? "برنامه تمام شده" : "هنوز شروع نشده") + " · برنامه: " + c.program
  : "جایگاه (دستی): " + (c.positionNote || "ثبت نشده");

const KIND_LABEL: Record<string, string> = { online: "آنلاین", onsite: "حضوری" };
const KIND_GROUPS: [string, string][] = [["online", "آنلاین"], ["onsite", "حضوری"], ["", "تعیین‌نشده"]];
const KindTag = ({ kind }: { kind?: string }) => kind && KIND_LABEL[kind] ? <small className="adm-badge" style={{ marginInlineStart: 8 }}>{KIND_LABEL[kind]}</small> : null;
const KindSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => <label>نوع کلاس (اختیاری)<select value={value} onChange={e => onChange(e.target.value)}><option value="">تعیین‌نشده</option><option value="online">آنلاین</option><option value="onsite">حضوری</option></select></label>;

const DAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];
const dayTimeText = (c: { classDay?: string; classTime?: string }) => [c.classDay, c.classTime].filter(Boolean).join(" · ");
const splitTime = (t: string) => { const m = /^(.*?)\s*تا\s*(.*)$/.exec(t || ""); return m ? [m[1], m[2]] : [t || "", ""]; };

/** «روز و ساعت کلاس»: weekday dropdown (or free text under «چند روز / دیگر») + from–to time. The registry's value is only a suggestion, never auto-copied. */
function DayTimeEditor({ day, time, hint, busy, onSave }: { day: string; time: string; hint?: { day: string; time: string } | null; busy: boolean; onSave: (day: string, time: string) => void }) {
  const init = (dv: string, tv: string) => ({ sel: !dv ? "" : DAYS.includes(dv) ? dv : "other", other: !dv || DAYS.includes(dv) ? "" : dv, from: splitTime(tv)[0], to: splitTime(tv)[1] });
  const [f, setF] = useState(() => init(day, time));
  useEffect(() => { setF(init(day, time)); }, [day, time]);
  const dayV = f.sel === "other" ? f.other.trim() : f.sel, timeV = f.from.trim() && f.to.trim() ? f.from.trim() + " تا " + f.to.trim() : f.from.trim();
  const same = dayV === day && timeV === time;
  return <div className="report-form">
    <h3>روز و ساعت کلاس</h3>
    <p className="plan-hint">فعلی: {dayTimeText({ classDay: day, classTime: time }) || "ثبت نشده"}</p>
    {!day && !time && hint && <p className="plan-hint">از دفتر: {dayTimeText({ classDay: hint.day, classTime: hint.time })} <button type="button" className="secondary-action" disabled={busy} onClick={() => onSave(hint.day, hint.time)}>استفاده</button></p>}
    <label>روز<select value={f.sel} onChange={e => setF({ ...f, sel: e.target.value })}><option value="">انتخاب روز</option>{DAYS.map(x => <option key={x} value={x}>{x}</option>)}<option value="other">چند روز / دیگر</option></select></label>
    {f.sel === "other" && <label>روزها (متن آزاد)<input value={f.other} maxLength={40} onChange={e => setF({ ...f, other: e.target.value })} placeholder="مثلاً شنبه و دوشنبه" /></label>}
    <div className="inline-form">
      <label>از ساعت<input value={f.from} maxLength={18} onChange={e => setF({ ...f, from: e.target.value })} placeholder="۱۴" /></label>
      <label>تا ساعت<input value={f.to} maxLength={18} onChange={e => setF({ ...f, to: e.target.value })} placeholder="۱۶" /></label>
    </div>
    <button className="secondary-action" disabled={busy || same || dayV.length > 40 || timeV.length > 40} onClick={() => onSave(dayV, timeV)}>ذخیره‌ی روز و ساعت</button>
  </div>;
}

function KindEditor({ kind, busy, onSave }: { kind: string; busy: boolean; onSave: (k: string) => void }) {
  const [k, setK] = useState(kind);
  useEffect(() => setK(kind), [kind]);
  return <div className="report-form">
    <h3>نوع کلاس</h3>
    <KindSelect value={k} onChange={setK} />
    <button className="secondary-action" disabled={busy || k === kind} onClick={() => onSave(k)}>ذخیره‌ی نوع کلاس</button>
  </div>;
}

/** «افزودن قرآن‌آموز»: search learner accounts by name / phone / email and add one to THIS class. Same effect as the registry enrolment, for one person. */
function AddLearner({ classId, busy, run, reload, say }: { classId: string; busy: boolean; run: (fn: () => Promise<void>) => Promise<void>; reload: () => Promise<void>; say: (m: string) => void }) {
  const [open, setOpen] = useState(false), [q, setQ] = useState(""), [res, setRes] = useState<{ id: string; name: string; phone: string; email: string }[] | null>(null);
  if (!open) return <button className="secondary-action" onClick={() => setOpen(true)}>افزودن قرآن‌آموز</button>;
  return <div className="report-form">
    <h3>افزودن قرآن‌آموز به این کلاس</h3>
    <p className="plan-hint">نام، شماره‌ی تلفن یا ایمیل قرآن‌آموزی را که در سامانه حساب دارد جست‌وجو کنید. کسی که هنوز وارد سامانه نشده است، هنگام اولین ورود طبق دفتر به کلاسش اضافه می‌شود.</p>
    <label>جست‌وجو<input value={q} onChange={e => { setQ(e.target.value); setRes(null); }} placeholder="دست‌کم دو نویسه" /></label>
    <button className="secondary-action" disabled={busy || q.trim().length < 2} onClick={() => void run(async () => setRes((await call("POST", "/api/class-sheet", { action: "find-learners", classId, q })).learners))}>جست‌وجو</button>
    {res && !res.length && <p className="empty-state">قرآن‌آموزی با این مشخصات پیدا نشد (یا از قبل در این کلاس است).</p>}
    {res?.map(u => <div className="simple-row" key={u.id}><b>{u.name}</b><span>{[u.phone, u.email].filter(Boolean).join(" · ")}</span>
      <button className="primary-wide" disabled={busy} onClick={() => void run(async () => { const d = await call("POST", "/api/class-sheet", { action: "add-member", classId, userId: u.id }); setRes(r => (r || []).filter(x => x.id !== u.id)); await reload(); say(`«${d.added}» به کلاس «${displayClassName(d.className)}» اضافه شد ✅`); })}>افزودن به کلاس</button></div>)}
    <button className="secondary-action" onClick={() => { setOpen(false); setQ(""); setRes(null); }}>بستن</button>
  </div>;
}

type Cls = { id: string; name: string; level_name?: string | null; step_name?: string | null };
const TABS: [string, string][] = [["info", "اطلاعات کلاس"], ["people", "قرآن‌آموزان"], ["exams", "آزمون و نمرات"], ["report", "گزارش"]];

/** کلاس‌ها: the one area for everything about a class. List of class cards (teacher: own, admin: all; one class opens directly); inside a class the sub-tabs اطلاعات کلاس / قرآن‌آموزان / آزمون و نمرات / گزارش. Admin also keeps «برنامه‌ی من». */
export function ClassSheets({ user, classes, onChanged }: { user: User; classes: Cls[]; onChanged?: () => void }) {
  const [cards, setCards] = useState<any[] | null>(null), [busy, setBusy] = useState(false), [msg, setMsg] = useState("");
  const [name, setName] = useState(""), [pos, setPos] = useState(""), [kind, setKind] = useState(""), [lv, setLv] = useState(""), [st, setSt] = useState(""), [mine, setMine] = useState(false);
  const segs = useNavSegs(), open = segs[0] === "classes" ? segs[1] || "" : "", sub = TABS.some(t => t[0] === segs[2]) ? segs[2] : TABS[0][0];
  const setOpen = (id: string, replace?: boolean) => navTo(["classes", id], replace ? "replace" : "push"), setSub = (k: string) => navTo(["classes", open, k], "push");
  const auto = useRef(true);
  const run = async (fn: () => Promise<void>) => { setBusy(true); setMsg(""); try { await fn(); } catch (e: any) { setMsg(e.message); } finally { setBusy(false); } };
  const load = async () => { const c = (await call("GET", "/api/class-sheet")).classes; setCards(c); if (auto.current && c.length === 1) { auto.current = false; if (!open) setOpen(c[0].id, true); } };
  const refresh = () => call("GET", "/api/class-sheet").then(x => setCards(x.classes)).catch(() => {});
  useEffect(() => { void run(load); }, []);
  const isAdmin = hasRole(user, "admin"), isTchr = hasRole(user, "teacher");
  // «برنامه‌ی من» switch for admins; a person who is also a قرآن‌آموز gets the «برنامه» tab in the bottom bar instead
  const seg = isAdmin && !hasRole(user, "memorizer") && !open && <div className="m-seg"><button className={!mine ? "on" : ""} onClick={() => setMine(false)}>کلاس‌ها</button><button className={mine ? "on" : ""} onClick={() => setMine(true)}>برنامه‌ی من</button></div>;
  if (isAdmin && !hasRole(user, "memorizer") && mine && !open) return <section className="m-plan">{seg}<LearnerPlan /></section>;
  const card = cards?.find(c => c.id === open);
  const labels = new Map<string, string>(); if (cards) displayClassNames(cards.map(c => c.name)).forEach((l, i) => labels.set(cards[i].id, l));   // display only; disambiguates names that look the same once «کلاس/گروه» is dropped
  if (open) {
    const only = !!cards && cards.length === 1 && !isTchr;
    return <section className="panel">
      {!only && <button className="secondary-action" onClick={() => { goBack(["classes"]); void run(load); }}>← کلاس‌ها</button>}
      {card && <header className="adm-block" style={{ marginTop: 12 }}>
        <h2>{labels.get(card.id) ?? displayClassName(card.name)}<KindTag kind={card.classKind} /></h2>
        <LevelStepChips level={card.level} step={card.step} />
        <p className="plan-hint">{[dayTimeText(card), card.teacher && isAdmin ? "استاد: " + displayTeacherName(card.teacher) : "", fa(card.activeCount) + " قرآن‌آموز فعال", weekLine(card)].filter(Boolean).join(" · ")}</p>
      </header>}
      <div className="m-seg" role="tablist" aria-label="بخش‌های کلاس">{TABS.map(([k, t]) => <button key={k} role="tab" aria-selected={sub === k} className={sub === k ? "on" : ""} onClick={() => setSub(k)}>{t}</button>)}</div>
      {sub === "info" && <ClassSheet mode="info" id={open} user={user} onLoaded={() => void refresh()} />}
      {sub === "people" && <ClassSheet mode="people" classes={classes} id={open} user={user} focusName={segs[2] === "people" ? segs[3] || "" : ""} onLoaded={() => void refresh()} onAttach={() => setSub("info")} />}
      {sub === "exams" && <Exams user={user} classes={classes} classId={open} embedded />}
      {sub === "report" && <ClassReports classId={open} embedded />}
      <Notice msg={msg} />
    </section>;
  }
  const shown = (cards || []).filter(c => matchesLS({ level: c.level, step: c.step }, lv, st));
  return <section className="panel">
    {seg}
    <h2>کلاس‌ها</h2>
    {isTchr && <div className="report-form">
      <h3>کلاس جدید</h3>
      <label>نام کلاس<input value={name} onChange={e => setName(e.target.value)} placeholder="مثلاً ورودی ۱۴۰۵ گام اول" /></label>
      <label>جایگاه (دستی، اختیاری)<input value={pos} onChange={e => setPos(e.target.value)} placeholder="مثلاً آل‌عمران، هفت صفحه‌ی اول تمام شده" /></label>
      <KindSelect value={kind} onChange={setKind} />
      <button className="primary-wide" disabled={busy || !name.trim()} onClick={() => void run(async () => { await call("POST", "/api/classes", { name, positionNote: pos, classKind: kind }); setName(""); setPos(""); setKind(""); await load(); onChanged?.(); setMsg("کلاس ساخته شد ✅"); })}>ایجاد کلاس</button>
    </div>}
    {!cards && !msg && <p className="empty-state">در حال بارگذاری…</p>}
    {cards && <LevelStepFilter classes={cards} level={lv} step={st} setLevel={setLv} setStep={setSt} />}
    {KIND_GROUPS.map(([k, title]) => { const g = shown.filter(c => (c.classKind || "") === k); return g.length ? <div key={k || "none"}><h3 className="sheet-h">{title}</h3>
    {g.map(c => <div role="button" tabIndex={0} className="sheet-card cls" key={c.id} onClick={() => setOpen(c.id)} onKeyDown={e => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setOpen(c.id); } }}>
      <b>{labels.get(c.id) ?? displayClassName(c.name)}<KindTag kind={c.classKind} /></b>
      <LevelStepChips level={c.level} step={c.step} />
      <span className="cls-info">{[fa(c.activeCount) + " قرآن‌آموز فعال", c.hasProgram ? "جایگاه: " + (c.currentWeek ? "هفتهٔ " + fa(c.currentWeek.week_number) : c.status === "ended" ? "برنامه تمام شده" : "هنوز شروع نشده") : "جایگاه (دستی): " + (c.positionNote || "ثبت نشده"), dayTimeText(c), c.teacher && isAdmin ? "استاد: " + displayTeacherName(c.teacher) : ""].filter(Boolean).join(" · ")}</span>
    </div>)}</div> : null; })}
    {cards && !cards.length && <p className="empty-state">هنوز کلاسی ایجاد یا به شما اختصاص داده نشده است.</p>}
    {cards && !!cards.length && !shown.length && <p className="empty-state">کلاسی با این سطح و گام نیست.</p>}
    <Notice msg={msg} />
  </section>;
}

/** One loaded class, two views: «اطلاعات کلاس» (mode info: the only place class properties are edited) and «قرآن‌آموزان» (mode people: weekly progress + position, then the learners). */
function ClassSheet({ id, user, mode, classes, focusName, onLoaded, onAttach }: { focusName?: string; id: string; user: User; mode: "info" | "people"; classes?: Cls[]; onLoaded?: () => void; onAttach?: () => void }) {
  const [d, setD] = useState<any>(null), [busy, setBusy] = useState(false), [msg, setMsg] = useState("");
  const [programs, setPrograms] = useState<{ id: string; name: string; weeks: number }[] | null>(null), [pick, setPick] = useState(""), [pickWeek, setPickWeek] = useState(""), [confirm, setConfirm] = useState<"" | "change" | "remove">("");
  const [pos, setPos] = useState(""), [openKey, setOpenKey] = useState(""), [wk, setWk] = useState("");
  const run = async (fn: () => Promise<void>) => { setBusy(true); setMsg(""); try { await fn(); } catch (e: any) { setMsg(e.message); } finally { setBusy(false); } };
  const [nm, setNm] = useState(""), [yr, setYr] = useState("");
  const load = async () => { const x = await call("GET", "/api/class-sheet?classId=" + encodeURIComponent(id)); setD(x); const m = /^(.*?)\s*ورودی\s*([0-9۰-۹]{4})\s*$/.exec(x.name); setNm(m ? m[1] : x.name); setYr(m ? fa(m[2]) : ""); setPos(x.positionNote); setWk(x.currentWeek ? String(x.currentWeek.week_number) : ""); onLoaded?.(); };
  useEffect(() => { void run(load); }, [id]);
  useEffect(() => { call("GET", "/api/programs").then(x => setPrograms(x.programs || [])).catch(() => setPrograms([])); }, []);
  const focused = useRef("");
  useEffect(() => {
    if (!d || mode !== "people" || !focusName || focused.current === id + focusName) return;
    const l = [...d.active, ...d.left].find((x: any) => searchNorm(x.name) === searchNorm(focusName));
    if (!l) return;
    focused.current = id + focusName; setOpenKey(l.key);
    setTimeout(() => document.querySelector(`[data-lkey="${CSS.escape(l.key)}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" }), 80);
  }, [d, mode, focusName]);
  if (!d) return <div>{msg ? <p className="error-msg">{msg}</p> : <p className="empty-state">در حال بارگذاری…</p>}</div>;
  return <div>
    {mode === "info" && <>
    <p className="plan-hint">{fa(d.active.length)} قرآن‌آموز فعال</p>
    <div className="report-form">
      <h3>نام و سال ورودی کلاس</h3>
      <label>نام کلاس<input value={nm} onChange={e => setNm(e.target.value)} maxLength={80} /></label>
      <label>سال ورودی (اختیاری)<input inputMode="numeric" value={yr} onChange={e => setYr(e.target.value.replace(/[^0-9۰-۹]/g, "").slice(0, 4))} placeholder="مثلاً ۱۴۰۴" /></label>
      <p className="plan-hint">نام نهایی: {composeName(nm, yr) || "—"}</p>
      <button className="secondary-action" disabled={busy || !nm.trim() || composeName(nm, yr) === d.name} onClick={() => void run(async () => { await call("POST", "/api/class-sheet", { action: "update-class", classId: id, name: composeName(nm, yr) }); await load(); setMsg("نام کلاس ذخیره شد ✅"); })}>ذخیره‌ی نام و سال ورودی</button>
    </div>
    <LevelStepEditor level={d.level} step={d.step} busy={busy} onSave={(level, step) => void run(async () => { await call("POST", "/api/class-sheet", { action: "set-level-step", classId: id, level, step }); await load(); setMsg("سطح و گام ذخیره شد ✅"); })} />
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
    <div className="report-form">
      <h3>جایگاه کلاس</h3>
      {d.hasProgram && <p className="adm-position"><i>جایگاه فعلی:</i> <b>{d.currentWeek ? `هفتهٔ ${fa(d.currentWeek.week_number)} · ${d.currentWeek.title}` : d.status === "ended" ? "برنامه به پایان رسیده است" : "هنوز شروع نشده است"}</b></p>}
      {d.hasProgram && <>
        <p className="plan-hint">اگر کلاس در عمل جلوتر یا عقب‌تر از تاریخ برنامه است، هفته را اینجا تغییر دهید؛ برنامه‌ی روزانه‌ی قرآن‌آموزان هم از همین هفته ادامه پیدا می‌کند.</p>
        <div className="inline-form">
          <button className="secondary-action" disabled={busy || d.status === "none"} onClick={() => void run(async () => { await call("POST", "/api/class-sheet", { action: "set-position", classId: id, delta: -1 }); await load(); setMsg("جایگاه کلاس تغییر کرد ✅"); })}>هفته‌ی قبل</button>
          <button className="secondary-action" disabled={busy} onClick={() => void run(async () => { await call("POST", "/api/class-sheet", { action: "set-position", classId: id, delta: 1 }); await load(); setMsg("جایگاه کلاس تغییر کرد ✅"); })}>هفته‌ی بعد</button>
        </div>
        <label>تغییر هفته<select value={wk} onChange={e => setWk(e.target.value)}><option value="">انتخاب هفته</option>{d.programWeeks.map((w: any) => <option key={w.week_number} value={w.week_number}>هفتهٔ {fa(w.week_number)} · {w.title}</option>)}</select></label>
        <button className="primary-wide" disabled={busy || !wk || String(d.currentWeek?.week_number ?? "") === wk} onClick={() => void run(async () => { await call("POST", "/api/class-sheet", { action: "set-position", classId: id, weekNumber: Number(wk) }); await load(); setMsg("جایگاه کلاس ذخیره شد ✅"); })}>ذخیره‌ی هفته</button>
      </>}
      {!d.hasProgram && <><label>جایگاه (دستی)<input value={pos} onChange={e => setPos(e.target.value)} placeholder="مثلاً آل‌عمران، هفت صفحه‌ی اول تمام شده" /></label>
        <button className="secondary-action" disabled={busy || pos === d.positionNote} onClick={() => void run(async () => { await call("POST", "/api/class-sheet", { action: "update-class", classId: id, positionNote: pos }); await load(); setMsg("ذخیره شد ✅"); })}>ذخیره‌ی جایگاه</button><p className="plan-hint">برای نمایش هفته، یک برنامه به کلاس وصل کنید.</p></>}
    </div>
    <KindEditor kind={d.classKind || ""} busy={busy} onSave={k => void run(async () => { await call("POST", "/api/class-sheet", { action: "update-class", classId: id, classKind: k }); await load(); setMsg("نوع کلاس ذخیره شد ✅"); })} />
    <DayTimeEditor day={d.classDay} time={d.classTime} hint={d.dayTimeHint} busy={busy} onSave={(classDay, classTime) => void run(async () => { await call("POST", "/api/class-sheet", { action: "update-class", classId: id, classDay, classTime }); await load(); setMsg("روز و ساعت کلاس ذخیره شد ✅"); })} />
    </>}
    {mode === "people" && <details className="adm-block"><summary><b>پیشرفت هفتگی</b></summary>
    <ClassPosition hasProgram={d.hasProgram} status={d.status} week={d.currentWeek} note={d.positionNote} onAttach={onAttach} />
      <TeacherPlan key={d.currentWeek?.week_number ?? "x"} classes={classes || []} fixedClassId={id} />
    </details>}
    {mode === "people" && <>
    <h3 className="sheet-h">قرآن‌آموزان فعال</h3>
    <AddLearner classId={id} busy={busy} run={run} reload={load} say={setMsg} />
    {d.active.map((l: any) => <Learner say={setMsg} key={l.key} l={l} className={d.name} classPos={d.positionNote} classId={id} open={openKey === l.key} toggle={() => setOpenKey(openKey === l.key ? "" : l.key)} run={run} busy={busy} reload={load} />)}
    {!d.active.length && <p className="empty-state">قرآن‌آموزی در این کلاس نیست.</p>}
    {d.left.length > 0 && <>
      <h3 className="sheet-h">سابقه (ترک‌کرده‌ها)</h3>
      <p className="plan-hint">این‌ها در شمارش فعال‌ها نیستند. سابقه‌شان می‌ماند و هر وقت برگردند می‌توانید ثبت کنید.</p>
      {d.left.map((l: any) => <Learner say={setMsg} key={l.key} l={l} left className={d.name} classPos={d.positionNote} classId={id} open={openKey === l.key} toggle={() => setOpenKey(openKey === l.key ? "" : l.key)} run={run} busy={busy} reload={load} />)}
    </>}
    </>}
    <Notice msg={msg} />
  </div>;
}

function Learner({ say, l, left, className, classPos, classId, open, toggle, run, busy, reload }: { say: (m: string) => void; l: any; left?: boolean; className: string; classPos: string; classId: string; open: boolean; toggle: () => void; run: (fn: () => Promise<void>) => Promise<void>; busy: boolean; reload: () => Promise<void> }) {
  const [title, setTitle] = useState(""), [score, setScore] = useState(""), [max, setMax] = useState(""), [date, setDate] = useState(""), [note, setNote] = useState("");
  const all = l.digital.length + l.manual.length;
  const [lp, setLp] = useState(classPos), [lr, setLr] = useState(""), [ld, setLd] = useState(""), [confirm, setConfirm] = useState(false), [rm, setRm] = useState(false);
  const last = l.history.filter((h: any) => h.classId === classId).slice(-1)[0];
  return <article className="sheet-learner" data-lkey={l.key}>
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
            <label>تا کجا رسیده بود (سوره یا جایگاه)<input value={lp} onChange={e => setLp(e.target.value)} placeholder="مثلاً سوره‌ی فلان، آیه‌ی ۱۰" /></label>
            <label>دلیل ترک<input value={lr} onChange={e => setLr(e.target.value)} /></label>
            <label>تاریخ (اختیاری، پیش‌فرض امروز)<input type="date" value={ld} onChange={e => setLd(e.target.value)} /></label>
            {!confirm ? <button className="secondary-action" disabled={busy || !lr.trim()} onClick={() => setConfirm(true)}>ترک کرد…</button>
              : <><p className="plan-hint">«{l.name}» از شمارش فعال‌ها کنار می‌رود و در «سابقه» می‌ماند. قابل برگشت است.</p>
                <button className="primary-wide" disabled={busy} onClick={() => void run(async () => { await call("POST", "/api/class-sheet", { action: "leave", classId, person: l.key, position: lp, reason: lr, date: ld }); setConfirm(false); setLr(""); await reload(); })}>بله، ثبت شود</button>
                <button className="secondary-action" onClick={() => setConfirm(false)}>انصراف</button></>}
          </div>}
      <div className="report-form">
        <h4>حذف از کلاس</h4>
        <p className="plan-hint">اگر این قرآن‌آموز هرگز در این کلاس نبوده (یا اشتباهی اضافه شده)، از فهرست همین کلاس برداشته می‌شود. حساب، نمره‌ها و سابقه‌اش پاک نمی‌شود؛ برای کسی که کلاس را ترک کرده، «ترک کرد» را بزنید.</p>
        {!rm ? <button className="secondary-action" disabled={busy} onClick={() => setRm(true)}>حذف از کلاس…</button>
          : <><p className="plan-hint">«{l.name}» از کلاس «{displayClassName(className)}» برداشته شود؟ حساب و سابقه‌ی او پاک نمی‌شود.</p>
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
