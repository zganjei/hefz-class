import { useCallback, useEffect, useRef, useState } from "react";
import { displayClassName, displayClassNames } from "../lib/teacher-name";
import { Notice } from "./notice";

type User = { id: string; role: "admin" | "teacher" | "memorizer"; roles?: string[]; display_name: string };
type Day = { index: number; name: string; jdate: string; kind: "new" | "class" | "rest"; new: string | null; review: string[]; basket: string[]; done: boolean; future: boolean };
type Week = { week_number: number; title: string; mushaf_page: number | null; mushaf_page2: number | null; open: boolean; current: boolean; total: number; doneNew: number; days: Day[] };
const fa = (n: number | string) => String(n).replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[+d]);
async function call(path: string, body?: unknown, method = "GET") {
  const r = await fetch(path, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({ error: "پاسخ نامعتبر" }));
  if (!r.ok) throw new Error(d.error || "خطا");
  return d;
}
const pageLabel = (w: { mushaf_page: number | null; mushaf_page2: number | null }) => w.mushaf_page ? `صفحهٔ ${fa(w.mushaf_page)}${w.mushaf_page2 ? " و " + fa(w.mushaf_page2) : ""} قرآن` : "";

type Tadabbur = { author: string; series: string; url: string; note?: string; summaries: { summary: string; url: string }[] };
type TodayItem = { key: string; label: string; ranges: string[]; done: boolean; links?: (string | null)[]; tadabbur?: (Tadabbur | null)[]; audio?: (AudioInfo | null)[]; translation?: (TranslationInfo | null)[] };
type AudioInfo = { reciter: string; source: string; verses: { n: number; url: string }[] };
type TranslationInfo = { translator: string; source: string; sourceUrl: string; link: string | null; verses: { n: number; text: string }[] };
type Today = { program?: { id: string; name: string } | null; week: { week_number: number; title: string } | null; day: { index: number; name: string; date: string; jdate: string; kind: string; isToday: boolean; future: boolean; prev: string | null; next: string | null } | null; items: TodayItem[] };
/** Program cells that are not a verse range (exam, review-only week, ...): shown as plain text, never as a tappable verse link. */
export const isNoteText = (r: string) => !/سوره/.test(r);
type VerseBlock = { range: string; surah: string; verses: { n: number; text: string }[] };

function VerseAudio({ info }: { info: AudioInfo }) {
  const [playing, setPlaying] = useState<number | null>(null), [err, setErr] = useState(""), ref = useRef<HTMLAudioElement | null>(null);
  useEffect(() => () => { ref.current?.pause(); }, []);
  const toggle = (v: { n: number; url: string }) => {
    setErr("");
    if (playing === v.n) { ref.current?.pause(); setPlaying(null); return; }
    ref.current?.pause();
    const a = new Audio(v.url); ref.current = a;
    a.onended = () => setPlaying(p => p === v.n ? null : p);
    a.onerror = () => { setPlaying(p => p === v.n ? null : p); setErr(`پخش آیهٔ ${fa(v.n)} ممکن نشد؛ اتصال اینترنت را بررسی کنید و دوباره امتحان کنید.`); };
    setPlaying(v.n);
    a.play().catch(() => { setPlaying(p => p === v.n ? null : p); setErr(`پخش آیهٔ ${fa(v.n)} ممکن نشد؛ دوباره امتحان کنید.`); });
  };
  return <div className="verse-audio">
    <div className="va-row" role="group" aria-label="شنیدن آیه‌ها">
      {info.verses.map(v => <button key={v.n} type="button" className={"va-btn" + (playing === v.n ? " on" : "")} aria-pressed={playing === v.n}
        aria-label={playing === v.n ? `توقف آیهٔ ${fa(v.n)}` : `پخش آیهٔ ${fa(v.n)}`} onClick={() => toggle(v)}>{playing === v.n ? "■" : "▶"} {fa(v.n)}</button>)}
    </div>
    {err && <p className="error-msg" role="alert">{err}</p>}
    <small>تلاوت {info.reciter} · <a href={info.source} target="_blank" rel="noopener noreferrer">everyayah.com ↗</a></small>
  </div>;
}

function TodayChecklist({ rev, onChanged }: { rev: number; onChanged: () => void }) {
  const [data, setData] = useState<Today | null>(null), [msg, setMsg] = useState(""), [open, setOpen] = useState<string | null>(null), [cache, setCache] = useState<Record<string, VerseBlock | null>>({});
  const [date, setDate] = useState<string | null>(null);   // null = today
  const load = useCallback(async () => { try { setData(await call("/api/plan?today=1" + (date ? `&date=${date}` : ""))); setMsg(""); } catch (e: any) { setMsg(e.message); } }, [date]);
  useEffect(() => { void load(); }, [load, rev]);
  const tick = async (it: TodayItem) => {
    if (!data?.week || !data.day || data.day.future) return;
    const next = !it.done;
    setData(d => d && { ...d, items: d.items.map(x => x.key === it.key ? { ...x, done: next } : x) });
    try { await call("/api/plan", { weekNumber: data.week.week_number, dayIndex: data.day.index, item: it.key, done: next, programId: data.program?.id ?? null }, "POST"); setMsg(""); onChanged(); } catch (e: any) { setMsg("تیک ذخیره نشد: " + (e.message || "خطا")); void load(); }
  };
  const show = async (k: string) => {
    const range = k.slice(k.indexOf("|") + 1);
    setOpen(o => o === k ? null : k);
    if (range in cache) return;
    try { const d = await call(`/api/plan?verses=${encodeURIComponent(range)}`); setCache(c => ({ ...c, [range]: d.blocks[0] ?? null })); } catch { setCache(c => ({ ...c, [range]: null })); }
  };
  if (!data) return msg ? <Notice msg={msg} /> : null;
  if (!data.day || !data.week) return null;
  const day = data.day;
  const doneN = data.items.filter(i => i.done).length;
  return <article className="plan-week current today-card">
    <div className="plan-week-head static"><div><b>{day.isToday ? "برنامهٔ امروز" : day.future ? "برنامهٔ روز آینده" : "برنامهٔ روز گذشته"} · {day.name} {day.jdate}</b><small>{data.program ? data.program.name + " · " : ""}هفتهٔ {fa(data.week.week_number)} · {data.week.title} · {fa(doneN)} از {fa(data.items.length)}</small></div></div>
    <div className="plan-toolbar" role="navigation" aria-label="جابه‌جایی بین روزها">
      <button type="button" className="plan-more" disabled={!day.prev} onClick={() => day.prev && setDate(day.prev)}>→ روز قبل</button>
      <button type="button" className="plan-more" disabled={day.isToday} onClick={() => setDate(null)}>امروز</button>
      <button type="button" className="plan-more" disabled={!day.next} onClick={() => day.next && setDate(day.next)}>روز بعد ←</button>
    </div>
    {day.future && <p className="plan-hint">این روز هنوز نرسیده است؛ فقط می‌توانید برنامه را ببینید و تیک زدن بعداً ممکن می‌شود.</p>}
    <Notice msg={msg} />
    <div className="m-days">
      {data.items.map(it => <div key={it.key} className={"m-day" + (it.done ? " done" : "")}>
        <label className="m-check"><input type="checkbox" checked={it.done} disabled={day.future} onChange={() => void tick(it)} aria-label={it.label} /><span /></label>
        <div className="m-day-body">
          <div className="m-day-top"><b>{it.label}</b></div>
          {it.ranges.length ? it.ranges.map((r, ri) => <div key={r + ri}>
            {isNoteText(r) ? <span className="m-new">{fa(r)}</span> : <button type="button" className="range-link" onClick={() => void show(it.key + "|" + r)}>{fa(r)}</button>}
            {it.links?.[ri] && <> <a className="range-link" href={it.links[ri]!} target="_blank" rel="noopener noreferrer">متن در quran.com ↗</a></>}
          </div>) : <div className="m-new">{["memorize", "listen", "translate", "tadabbur"].includes(it.key) ? (day.kind === "rest" ? "امروز روز استراحت است" : day.kind === "class" ? "امروز روز کلاس است" : "امروز آیه‌ی جدید ندارد") : "—"}</div>}
        </div>
        <div className="m-day-wide">{it.ranges.map((r, ri) => <div key={r + ri}>
            {it.tadabbur?.[ri] && <div className="tadabbur-notes">
              {it.tadabbur[ri]!.summaries.map((x, i) => <p key={i}>{x.summary} <a href={x.url} target="_blank" rel="noopener noreferrer">منبع ↗</a></p>)}
              {it.tadabbur[ri]!.note && <p>{it.tadabbur[ri]!.note}</p>}
              <small>{it.tadabbur[ri]!.series} — {it.tadabbur[ri]!.author} · <a href={it.tadabbur[ri]!.url} target="_blank" rel="noopener noreferrer">صفحهٔ سوره در alisaboohi.com ↗</a></small>
            </div>}
            {it.audio?.[ri] && <VerseAudio info={it.audio[ri]!} />}
            {it.key === "translate" && (it.translation?.[ri]
              ? <div className="tadabbur-notes">
                {it.translation[ri]!.verses.map(v => <p key={v.n}>﴿{fa(v.n)}﴾ {v.text}</p>)}
                <small>{it.translation[ri]!.translator} · <a href={it.translation[ri]!.sourceUrl} target="_blank" rel="noopener noreferrer">منبع: {it.translation[ri]!.source} ↗</a>{it.translation[ri]!.link && <> · <a href={it.translation[ri]!.link!} target="_blank" rel="noopener noreferrer">quran.com ↗</a></>}</small>
                <small> (ترجمهٔ کامل آیات؛ فهرست لغات کلیدی از منبع معتبر در دسترس نبود.)</small>
              </div>
              : <p className="empty-state">ترجمهٔ این محدوده موجود نیست.</p>)}
            {open === it.key + "|" + r && (cache[r] === undefined ? <p className="empty-state">در حال بارگذاری…</p> : cache[r] ? <p className="verse-text" dir="rtl" lang="ar">{cache[r]!.verses.map(v => <span key={v.n}>{v.text} ﴿{fa(v.n)}﴾ </span>)}</p> : <p className="error-msg">متن این محدوده پیدا نشد.</p>)}
          </div>)}</div>
      </div>)}
    </div>
  </article>;
}

export function LearnerPlan() {
  const [rev, setRev] = useState(0), [showAll, setShowAll] = useState(false), [program, setProgram] = useState<{ id: string; name: string } | null>(null), [startsOn, setStartsOn] = useState<string | null>(null), [weeks, setWeeks] = useState<Week[]>([]), [openWeek, setOpenWeek] = useState<number | null>(null), [msg, setMsg] = useState(""), [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try { const d = await call("/api/plan"); setProgram(d.program ?? null); setStartsOn(d.startsOn ?? null); setWeeks(d.weeks); setOpenWeek(o => o ?? d.currentWeek ?? null); setMsg(""); } catch (e: any) { setMsg(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load, rev]);
  const tick = async (w: Week, d: Day) => {
    setWeeks(ws => ws.map(x => x.week_number !== w.week_number ? x : { ...x, days: x.days.map(y => y.index === d.index ? { ...y, done: !y.done } : y), doneNew: x.doneNew + (d.new ? (d.done ? -1 : 1) : 0) }));
    try { await call("/api/plan", { weekNumber: w.week_number, dayIndex: d.index, done: !d.done, programId: program?.id ?? null }, "POST"); setMsg(""); setRev(n => n + 1); } catch (e: any) { setMsg("تیک ذخیره نشد: " + (e.message || "خطا")); void load(); }
  };
  const curN = weeks.find(x => x.current)?.week_number ?? -1;
  const visible = weeks.filter(w => w.open && (showAll || w.week_number >= curN - 3 || curN < 0));
  const hidden = weeks.filter(w => w.open && w.week_number < curN - 3).length;
  if (loading) return <p className="empty-state">در حال بارگذاری…</p>;
  return <section className="plan-wrap">
    <TodayChecklist rev={rev} onChanged={() => setRev(n => n + 1)} />
    <Notice msg={msg} />
    {program && <p className="plan-hint">برنامهٔ کلاس شما: <b>{program.name}</b></p>}
    {startsOn && <p className="empty-state">برنامهٔ کلاس شما از {startsOn} شروع می‌شود.</p>}
    {!weeks.length && <p className="empty-state">برنامه‌ای ثبت نشده است.</p>}
    {[...visible].reverse().map(w => {
      const isOpen = openWeek === w.week_number && w.open, pct = w.total ? Math.round(100 * w.doneNew / w.total) : 0;
      return <article key={w.week_number} className={"plan-week" + (w.current ? " current" : "") + (!w.open ? " locked" : "")}>
        <button className="plan-week-head" disabled={!w.open} onClick={() => setOpenWeek(isOpen ? null : w.week_number)}>
          <div><b>هفتهٔ {fa(w.week_number)} · {w.title}</b><small>{pageLabel(w)}{w.current ? " · این هفته" : ""}</small></div>
          {w.open ? <div className="plan-prog"><span>{fa(w.doneNew)} از {fa(w.total)}</span><i><u style={{ width: pct + "%" }} /></i></div> : <span className="plan-lock">🔒 به‌زودی باز می‌شود</span>}
        </button>
        {isOpen && <div className="m-days">
          {w.days.map(d => { const special = d.kind === "class" && d.review.length && isNoteText(d.review[0]) ? d.review[0] : "", review = special ? d.review.slice(1) : d.review; return <div key={d.index} className={"m-day" + (d.done ? " done" : "") + (d.kind !== "new" ? " calm" : "")}>
            <label className="m-check"><input type="checkbox" checked={d.done} disabled={d.future} aria-label={`${d.name} ${d.jdate}`} onChange={() => void tick(w, d)} /><span /></label>
            <div className="m-day-body">
              <div className="m-day-top"><b>{d.name}</b><small>{d.jdate}</small></div>
              <div className="m-new">{d.new ? fa(d.new) : d.kind === "class" ? (special ? "کلاس · " + fa(special) : "کلاس") : "مرور و استراحت"}</div>
              {(review.length > 0 || d.basket.length > 0) && <details className="m-more"><summary>مرور امروز</summary>
                {review.length > 0 && <p><i>ده درس اخیر:</i> {review.map(fa).join("، ")}</p>}
                {d.basket.length > 0 && <p><i>سبد کل:</i> {d.basket.map(fa).join("، ")}</p>}
              </details>}
            </div>
          </div>; })}
        </div>}
      </article>;
    })}
    {hidden > 0 && <button className="plan-more" onClick={() => setShowAll(v => !v)}>{showAll ? "پنهان کردن هفته‌های قدیمی" : `نمایش ${fa(hidden)} هفته‌ی قبلی`}</button>}
  </section>;
}

/** THE position of a class: its program week (derived from the program start; the «تغییر هفته» control shifts that start). The free-text note is only a fallback label when no program is attached. */
export function ClassPosition({ hasProgram, status, week, note, onAttach }: { hasProgram: boolean; status?: string; week: { week_number: number; title: string } | null; note?: string; onAttach?: () => void }) {
  if (hasProgram) return <p className="adm-position"><i>جایگاه کلاس:</i> <b>{week ? `هفتهٔ ${fa(week.week_number)} · ${week.title}` : status === "ended" ? "برنامه به پایان رسیده است" : "هنوز شروع نشده است"}</b></p>;
  return <div className="adm-position"><p><i>جایگاه (دستی):</i> <b>{note || "ثبت نشده"}</b></p><p className="plan-hint">برای نمایش هفته، یک برنامه به کلاس وصل کنید.</p>{onAttach && <button type="button" className="secondary-action" onClick={onAttach}>وصل کردن برنامه</button>}</div>;
}

type Report = { program?: { id: string; name: string } | null; positionNote?: string; currentWeekTitle?: string | null; currentWeek: number | null; week: { week_number: number; title: string; mushaf_page: number | null; mushaf_page2: number | null; newDays: number[]; days: { index: number; name: string; jdate: string; kind: string; new: string | null; future: boolean }[] }; weeks: { week_number: number; title: string }[]; members: { id: string; name: string; done: number[]; lastTick: string | null; totalDone: number }[] };
type RosterRow = { name: string; registered: boolean; phone: string | null; email: string | null; nationalId: string | null; code: string | null; level: string | null; education: string | null; hifzAmount: string | null; tadabburAmount: string | null; notes: string | null; hefz: { daysDone: number }; scores: { week: number; weekTitle: string; lesson: string; score: number; max: number; passed: boolean }[] };
type Roster = { program?: { id: string; name: string } | null; className: string; schedule: string; currentWeek: { week_number: number; title: string } | null; programEnded?: boolean; positionNote?: string; sessionsHeld: number | null; rows: RosterRow[] };
function ClassRoster({ classId }: { classId: string }) {
  const [r, setR] = useState<Roster | null>(null), [msg, setMsg] = useState("");
  useEffect(() => { if (!classId) return; setR(null); call(`/api/plan?classId=${encodeURIComponent(classId)}&roster=1`).then(d => { setR(d); setMsg(""); }).catch(e => setMsg(e.message)); }, [classId]);
  if (msg) return <p className="error-msg">{msg}</p>;
  if (!r) return null;
  const line = (k: string, v: string | null | undefined) => v ? <p className="roster-line"><i>{k}:</i> <span dir="auto">{v}</span></p> : null;
  return <article className="plan-week current roster">
    <div className="plan-week-head static"><div><b>اطلاعات کلاس · {displayClassName(r.className)}</b><small>{r.schedule || "روز و ساعت کلاس ثبت نشده است"}</small></div></div>
    <div className="roster-meta">
      {r.program && <p><i>برنامهٔ کلاس:</i> {r.program.name}</p>}
      <p><i>تعداد جلسات برگزارشده:</i> {r.sessionsHeld === null ? "هنوز در سامانه ثبت نمی‌شود" : fa(r.sessionsHeld)}</p>
      <p><i>تعداد قرآن‌آموزان:</i> {fa(r.rows.length)}</p>
    </div>
    <div className="m-members">
      {r.rows.map((m, i) => <details key={i} className="m-member roster-row">
        <summary><b>{m.name}</b><span>{m.registered ? `${fa(m.hefz.daysDone)} روز حفظ ثبت‌شده` : "هنوز وارد سامانه نشده"}</span></summary>
        {line("شماره‌ی تماس", m.phone)}{line("ایمیل", m.email)}{line("کد ملی", m.nationalId)}{line("کد قرآن‌آموز", m.code)}{line("سطح", m.level)}{line("تحصیلات", m.education)}{line("میزان حفظ", m.hifzAmount)}{line("میزان تدبر", m.tadabburAmount)}{line("یادداشت", m.notes)}
        <div className="roster-scores"><i>نمره‌ی آزمون پایان درس:</i>
          {m.scores.length ? m.scores.map((s, j) => <p key={j} className="roster-line">هفتهٔ {fa(s.week)} · {s.lesson}: <b className={s.passed ? "m-full" : ""}>{fa(s.score)} از {fa(s.max)}</b></p>) : <p className="roster-line">هنوز نمره‌ای ثبت نشده است.</p>}
        </div>
      </details>)}
      {!r.rows.length && <p className="empty-state">برای این کلاس هنوز قرآن‌آموزی ثبت نشده است.</p>}
      <p className="plan-hint">این اطلاعات فقط برای استاد همین کلاس و مدیر نمایش داده می‌شود.</p>
    </div>
  </article>;
}

/** Weekly progress per learner for a class. With `fixedClassId` (inside a class) the class picker is hidden. */
export function TeacherPlan({ classes, fixedClassId, onAttach }: { classes: { id: string; name: string }[]; fixedClassId?: string; onAttach?: () => void }) {
  const [classId, setClassId] = useState(fixedClassId || classes[0]?.id || ""), [week, setWeek] = useState<number | null>(null), [data, setData] = useState<Report | null>(null), [msg, setMsg] = useState("");
  useEffect(() => { if (fixedClassId) setClassId(fixedClassId); else if (!classId && classes[0]) setClassId(classes[0].id); }, [classes, classId, fixedClassId]);
  useEffect(() => {
    if (!classId) return;
    call(`/api/plan?classId=${encodeURIComponent(classId)}${week ? "&week=" + week : ""}`).then(d => { setData(d); setMsg(""); }).catch(e => { setData(null); setMsg(e.message); });
  }, [classId, week]);
  const clsLabels = displayClassNames(classes.map(c => c.name));
  return <section className="plan-wrap">
    <div className="plan-toolbar">
      {!fixedClassId && classes.length > 1 && <label>کلاس<select value={classId} onChange={e => { setClassId(e.target.value); setWeek(null); }}>{classes.map((c, i) => <option key={c.id} value={c.id}>{clsLabels[i]}</option>)}</select></label>}
      {data && <label>مشاهدهٔ هفته{data.program && (week ?? data.week.week_number) === data.currentWeek && <span className="adm-badge" style={{ justifySelf: "start" }}>هفتهٔ جاری کلاس</span>}<select value={week ?? data.week.week_number} onChange={e => setWeek(Number(e.target.value))}>{[...data.weeks].reverse().map(w => <option key={w.week_number} value={w.week_number}>هفتهٔ {fa(w.week_number)} · {w.title}</option>)}</select></label>}
    </div>
    {msg && <p className="error-msg">{msg}</p>}
    {data && !fixedClassId && <ClassPosition hasProgram={!!data.program} status={data.program && data.currentWeek == null ? "ended" : undefined} week={data.program && data.currentWeek != null ? { week_number: data.currentWeek, title: data.currentWeekTitle || "" } : null} note={data.positionNote} onAttach={onAttach} />}
    {data?.program && !fixedClassId && <p className="plan-hint">برنامهٔ کلاس: <b>{data.program.name}</b></p>}
    {data && !data.program && <p className="plan-hint">هفته‌های زیر از برنامهٔ عمومی است، چون برنامه‌ای به این کلاس وصل نیست.</p>}
    {data && <article className="plan-week current"><div className="plan-week-head static"><div><b>هفتهٔ {fa(data.week.week_number)} · {data.week.title}</b><small>{pageLabel(data.week)}</small></div></div>
      <div className="m-members">
        {data.members.map(m => { const doneNew = m.done.filter(i => data.week.newDays.includes(i)).length, all = doneNew === data.week.newDays.length; return <div key={m.id} className="m-member">
          <div className="m-member-top"><b>{m.name}</b><span className={all ? "m-full" : ""}>{fa(doneNew)} از {fa(data.week.newDays.length)}</span></div>
          <div className="m-dots">{data.week.days.map(d => <div key={d.index} className={"m-dot" + (m.done.includes(d.index) ? " on" : d.future ? " future" : d.kind === "new" ? " miss" : " rest")}><small>{d.name.slice(0, 1)}</small><b>{m.done.includes(d.index) ? "✓" : d.kind === "class" ? "ک" : d.kind === "new" ? "·" : "–"}</b></div>)}</div>
        </div>; })}
        {!data.members.length && <p className="empty-state">هنوز حافظی در این کلاس نیست.</p>}
        <p className="plan-hint">✓ انجام شد · نقطه: هنوز نه · ک: کلاس · خط: استراحت</p></div></article>}
    {classId && !fixedClassId && <ClassRoster classId={classId} />}
  </section>;
}

/** The «برنامه» tab = the person's OWN plan as a قرآن‌آموز (shown to any person who holds that role; staff tools live under «کلاس‌ها»). */
export function HefzPlan(_props: { user: User; classes: { id: string; name: string }[] }) {
  return <section className="m-plan"><LearnerPlan /></section>;
}
