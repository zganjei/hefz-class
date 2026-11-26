import { useCallback, useEffect, useState } from "react";

type User = { id: string; role: "admin" | "teacher" | "memorizer"; display_name: string };
type Day = { index: number; name: string; jdate: string; kind: "new" | "class" | "rest"; new: string | null; review: string[]; basket: string[]; done: boolean; future: boolean };
type Week = { week_number: number; title: string; mushaf_page: number; mushaf_page2: number | null; open: boolean; current: boolean; total: number; doneNew: number; days: Day[] };
const fa = (n: number | string) => String(n).replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[+d]);
async function call(path: string, body?: unknown, method = "GET") {
  const r = await fetch(path, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({ error: "پاسخ نامعتبر" }));
  if (!r.ok) throw new Error(d.error || "خطا");
  return d;
}
const pageLabel = (w: { mushaf_page: number; mushaf_page2: number | null }) => `صفحهٔ ${fa(w.mushaf_page)}${w.mushaf_page2 ? " و " + fa(w.mushaf_page2) : ""} قرآن`;

type TodayItem = { key: string; label: string; ranges: string[]; done: boolean };
type Today = { week: { week_number: number; title: string } | null; day: { index: number; name: string; jdate: string; kind: string } | null; items: TodayItem[] };
type VerseBlock = { range: string; surah: string; verses: { n: number; text: string }[] };

function TodayChecklist() {
  const [data, setData] = useState<Today | null>(null), [msg, setMsg] = useState(""), [open, setOpen] = useState<string | null>(null), [cache, setCache] = useState<Record<string, VerseBlock | null>>({});
  const load = useCallback(async () => { try { setData(await call("/api/plan?today=1")); setMsg(""); } catch (e: any) { setMsg(e.message); } }, []);
  useEffect(() => { void load(); }, [load]);
  const tick = async (it: TodayItem) => {
    if (!data?.week || !data.day) return;
    const next = !it.done;
    setData(d => d && { ...d, items: d.items.map(x => x.key === it.key ? { ...x, done: next } : x) });
    try { await call("/api/plan", { weekNumber: data.week.week_number, dayIndex: data.day.index, item: it.key, done: next }, "POST"); } catch (e: any) { setMsg(e.message); void load(); }
  };
  const show = async (range: string) => {
    setOpen(o => o === range ? null : range);
    if (range in cache) return;
    try { const d = await call(`/api/plan?verses=${encodeURIComponent(range)}`); setCache(c => ({ ...c, [range]: d.blocks[0] ?? null })); } catch { setCache(c => ({ ...c, [range]: null })); }
  };
  if (!data) return msg ? <p className="error-msg">{msg}</p> : null;
  if (!data.day || !data.week) return null;
  const doneN = data.items.filter(i => i.done).length;
  return <article className="plan-week current today-card">
    <div className="plan-week-head static"><div><b>برنامهٔ امروز · {data.day.name} {data.day.jdate}</b><small>هفتهٔ {fa(data.week.week_number)} · {data.week.title} · {fa(doneN)} از {fa(data.items.length)}</small></div></div>
    {msg && <p className="error-msg">{msg}</p>}
    <div className="m-days">
      {data.items.map(it => <div key={it.key} className={"m-day" + (it.done ? " done" : "")}>
        <label className="m-check"><input type="checkbox" checked={it.done} onChange={() => void tick(it)} aria-label={it.label} /><span /></label>
        <div className="m-day-body">
          <div className="m-day-top"><b>{it.label}</b></div>
          {it.ranges.length ? it.ranges.map(r => <div key={r}>
            <button type="button" className="range-link" onClick={() => void show(r)}>{r}</button>
            {open === r && (cache[r] === undefined ? <p className="empty-state">در حال بارگذاری…</p> : cache[r] ? <p className="verse-text" dir="rtl" lang="ar">{cache[r]!.verses.map(v => <span key={v.n}>{v.text} ﴿{fa(v.n)}﴾ </span>)}</p> : <p className="error-msg">متن این محدوده پیدا نشد.</p>)}
          </div>) : <div className="m-new">—</div>}
        </div>
      </div>)}
    </div>
  </article>;
}

function LearnerPlan() {
  const [showAll, setShowAll] = useState(false), [weeks, setWeeks] = useState<Week[]>([]), [openWeek, setOpenWeek] = useState<number | null>(null), [msg, setMsg] = useState(""), [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try { const d = await call("/api/plan"); setWeeks(d.weeks); setOpenWeek(o => o ?? d.currentWeek ?? null); setMsg(""); } catch (e: any) { setMsg(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const tick = async (w: Week, d: Day) => {
    setWeeks(ws => ws.map(x => x.week_number !== w.week_number ? x : { ...x, days: x.days.map(y => y.index === d.index ? { ...y, done: !y.done } : y), doneNew: x.doneNew + (d.new ? (d.done ? -1 : 1) : 0) }));
    try { await call("/api/plan", { weekNumber: w.week_number, dayIndex: d.index, done: !d.done }, "POST"); } catch (e: any) { setMsg(e.message); void load(); }
  };
  const curN = weeks.find(x => x.current)?.week_number ?? -1;
  const visible = weeks.filter(w => w.open && (showAll || w.week_number >= curN - 3 || curN < 0));
  const hidden = weeks.filter(w => w.open && w.week_number < curN - 3).length;
  if (loading) return <p className="empty-state">در حال بارگذاری…</p>;
  return <section className="plan-wrap">
    <TodayChecklist />
    {msg && <p className="error-msg">{msg}</p>}
    {!weeks.length && <p className="empty-state">برنامه‌ای ثبت نشده است.</p>}
    {[...visible].reverse().map(w => {
      const isOpen = openWeek === w.week_number && w.open, pct = w.total ? Math.round(100 * w.doneNew / w.total) : 0;
      return <article key={w.week_number} className={"plan-week" + (w.current ? " current" : "") + (!w.open ? " locked" : "")}>
        <button className="plan-week-head" disabled={!w.open} onClick={() => setOpenWeek(isOpen ? null : w.week_number)}>
          <div><b>هفتهٔ {fa(w.week_number)} · {w.title}</b><small>{pageLabel(w)}{w.current ? " · این هفته" : ""}</small></div>
          {w.open ? <div className="plan-prog"><span>{fa(w.doneNew)} از {fa(w.total)}</span><i><u style={{ width: pct + "%" }} /></i></div> : <span className="plan-lock">🔒 به‌زودی باز می‌شود</span>}
        </button>
        {isOpen && <div className="m-days">
          {w.days.map(d => <div key={d.index} className={"m-day" + (d.done ? " done" : "") + (d.kind !== "new" ? " calm" : "")}>
            <label className="m-check"><input type="checkbox" checked={d.done} disabled={d.future} onChange={() => void tick(w, d)} /><span /></label>
            <div className="m-day-body">
              <div className="m-day-top"><b>{d.name}</b><small>{d.jdate}</small></div>
              <div className="m-new">{d.new || (d.kind === "class" ? "کلاس" : "مرور و استراحت")}</div>
              {(d.review.length > 0 || d.basket.length > 0) && <details className="m-more"><summary>مرور امروز</summary>
                {d.review.length > 0 && <p><i>ده درس اخیر:</i> {d.review.join("، ")}</p>}
                {d.basket.length > 0 && <p><i>سبد کل:</i> {d.basket.join("، ")}</p>}
              </details>}
            </div>
          </div>)}
        </div>}
      </article>;
    })}
    {hidden > 0 && <button className="plan-more" onClick={() => setShowAll(v => !v)}>{showAll ? "پنهان کردن هفته‌های قدیمی" : `نمایش ${fa(hidden)} هفته‌ی قبلی`}</button>}
  </section>;
}

type Report = { currentWeek: number | null; week: { week_number: number; title: string; mushaf_page: number; mushaf_page2: number | null; newDays: number[]; days: { index: number; name: string; jdate: string; kind: string; new: string | null; future: boolean }[] }; weeks: { week_number: number; title: string }[]; members: { id: string; name: string; done: number[]; lastTick: string | null; totalDone: number }[] };
function TeacherPlan({ classes }: { classes: { id: string; name: string }[] }) {
  const [classId, setClassId] = useState(classes[0]?.id || ""), [week, setWeek] = useState<number | null>(null), [data, setData] = useState<Report | null>(null), [msg, setMsg] = useState("");
  useEffect(() => { if (!classId && classes[0]) setClassId(classes[0].id); }, [classes, classId]);
  useEffect(() => {
    if (!classId) return;
    call(`/api/plan?classId=${encodeURIComponent(classId)}${week ? "&week=" + week : ""}`).then(d => { setData(d); setMsg(""); }).catch(e => { setData(null); setMsg(e.message); });
  }, [classId, week]);
  return <section className="plan-wrap">
    <div className="plan-toolbar">
      {classes.length > 1 && <label>کلاس<select value={classId} onChange={e => { setClassId(e.target.value); setWeek(null); }}>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
      {data && <label>هفته<select value={week ?? data.week.week_number} onChange={e => setWeek(Number(e.target.value))}>{[...data.weeks].reverse().map(w => <option key={w.week_number} value={w.week_number}>هفتهٔ {fa(w.week_number)} · {w.title}</option>)}</select></label>}
    </div>
    {msg && <p className="error-msg">{msg}</p>}
    {data && <article className="plan-week current"><div className="plan-week-head static"><div><b>هفتهٔ {fa(data.week.week_number)} · {data.week.title}</b><small>{pageLabel(data.week)}</small></div></div>
      <div className="m-members">
        {data.members.map(m => { const doneNew = m.done.filter(i => data.week.newDays.includes(i)).length, all = doneNew === data.week.newDays.length; return <div key={m.id} className="m-member">
          <div className="m-member-top"><b>{m.name}</b><span className={all ? "m-full" : ""}>{fa(doneNew)} از {fa(data.week.newDays.length)}</span></div>
          <div className="m-dots">{data.week.days.map(d => <div key={d.index} className={"m-dot" + (m.done.includes(d.index) ? " on" : d.future ? " future" : d.kind === "new" ? " miss" : " rest")}><small>{d.name.slice(0, 1)}</small><b>{m.done.includes(d.index) ? "✓" : d.kind === "class" ? "ک" : d.kind === "new" ? "·" : "–"}</b></div>)}</div>
        </div>; })}
        {!data.members.length && <p className="empty-state">هنوز حافظی در این کلاس نیست.</p>}
        <p className="plan-hint">✓ انجام شد · نقطه: هنوز نه · ک: کلاس · خط: استراحت</p></div></article>}
  </section>;
}

export function HefzPlan({ user, classes }: { user: User; classes: { id: string; name: string }[] }) {
  const teacher = user.role === "teacher" || user.role === "admin";
  const [view, setView] = useState<"mine" | "class">(teacher ? "class" : "mine");
  return <section className="m-plan">
    {teacher && <div className="m-seg"><button className={view === "class" ? "on" : ""} onClick={() => setView("class")}>گزارش کلاس</button><button className={view === "mine" ? "on" : ""} onClick={() => setView("mine")}>برنامه‌ی من</button></div>}
    {view === "mine" || !teacher ? <LearnerPlan /> : <TeacherPlan classes={classes} />}
  </section>;
}
