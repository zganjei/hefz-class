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
  const visible = weeks.filter(w => (w.open || w.week_number === curN + 1) && (showAll || w.week_number >= curN - 3 || curN < 0));
  const hidden = weeks.filter(w => w.open && w.week_number < curN - 3).length;
  if (loading) return <p className="empty-state">در حال بارگذاری…</p>;
  return <section className="plan-wrap">
    {msg && <p className="error-msg">{msg}</p>}
    {!weeks.length && <p className="empty-state">برنامه‌ای ثبت نشده است.</p>}
    {[...visible].reverse().map(w => {
      const isOpen = openWeek === w.week_number && w.open, pct = w.total ? Math.round(100 * w.doneNew / w.total) : 0;
      return <article key={w.week_number} className={"plan-week" + (w.current ? " current" : "") + (!w.open ? " locked" : "")}>
        <button className="plan-week-head" disabled={!w.open} onClick={() => setOpenWeek(isOpen ? null : w.week_number)}>
          <div><b>هفتهٔ {fa(w.week_number)} · {w.title}</b><small>{pageLabel(w)}{w.current ? " · این هفته" : ""}</small></div>
          {w.open ? <div className="plan-prog"><span>{fa(w.doneNew)} از {fa(w.total)}</span><i><u style={{ width: pct + "%" }} /></i></div> : <span className="plan-lock">🔒 به‌زودی باز می‌شود</span>}
        </button>
        {isOpen && <div className="plan-table-wrap"><table className="plan-table"><thead><tr><th>تیک</th><th>روز</th><th>حفظ جدید</th><th>مرور ده درس</th><th>سبد کل</th></tr></thead><tbody>
          {w.days.map(d => <tr key={d.index} className={d.done ? "done" : ""}>
            <td data-label="تیک"><label className="plan-check"><input type="checkbox" checked={d.done} disabled={d.future} onChange={() => void tick(w, d)} /><span /></label></td>
            <td className="plan-day" data-label="روز"><b>{d.name}</b><small>{d.jdate}</small></td>
            <td className="plan-new" data-label="حفظ جدید">{d.new || (d.kind === "class" ? <b>کلاس</b> : <em>مرور و استراحت</em>)}</td>
            <td data-label="مرور ده درس">{d.review.map((x, i) => <div key={i}>{x}</div>)}{!d.review.length && "—"}</td>
            <td className="plan-basket" data-label="سبد کل">{d.basket.map((x, i) => <div key={i}>{x}</div>)}{!d.basket.length && "—"}</td>
          </tr>)}
        </tbody></table><p className="plan-hint">بعد از انجام هر روز، تیک بزنید تا معلم پیشرفت شما را ببیند.</p></div>}
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
      <label>کلاس<select value={classId} onChange={e => { setClassId(e.target.value); setWeek(null); }}>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      {data && <label>هفته<select value={week ?? data.week.week_number} onChange={e => setWeek(Number(e.target.value))}>{[...data.weeks].reverse().map(w => <option key={w.week_number} value={w.week_number}>هفتهٔ {fa(w.week_number)} · {w.title}</option>)}</select></label>}
    </div>
    {msg && <p className="error-msg">{msg}</p>}
    {data && <article className="plan-week current"><div className="plan-week-head static"><div><b>هفتهٔ {fa(data.week.week_number)} · {data.week.title}</b><small>{pageLabel(data.week)}</small></div></div>
      <div className="plan-table-wrap"><table className="plan-table report"><thead><tr><th>حافظ</th>{data.week.days.map(d => <th key={d.index}>{d.name}<small>{d.jdate}</small></th>)}<th>انجام‌شده</th></tr></thead><tbody>
        {data.members.map(m => { const doneNew = m.done.filter(i => data.week.newDays.includes(i)).length; return <tr key={m.id}>
          <td className="plan-name">{m.name}<small>مجموع تیک‌ها: {fa(m.totalDone)}</small></td>
          {data.week.days.map(d => <td key={d.index} className="plan-dot">{m.done.includes(d.index) ? <b className="on">✓</b> : <b className={d.future ? "off future" : d.kind === "new" ? "off" : "off rest"}>{d.kind === "new" || d.future ? "·" : d.kind === "class" ? "ک" : "–"}</b>}</td>)}
          <td><b className={doneNew === data.week.newDays.length ? "plan-full" : ""}>{fa(doneNew)} از {fa(data.week.newDays.length)}</b></td></tr>; })}
        {!data.members.length && <tr><td colSpan={9}><p className="empty-state">هنوز حافظی در این کلاس نیست.</p></td></tr>}
      </tbody></table><p className="plan-hint">✓ تیک‌خورده · نقطه: هنوز انجام نشده · خط تیره: روز مرور/استراحت</p></div></article>}
  </section>;
}

export function HefzPlan({ user, classes }: { user: User; classes: { id: string; name: string }[] }) {
  const teacher = user.role === "teacher" || user.role === "admin";
  const [view, setView] = useState<"mine" | "class">(user.role === "teacher" ? "class" : "mine");
  return <section className="panel plan-panel">
    <div className="panel-heading"><div><h2>برنامه‌ی هفتگی حفظ</h2><p>هر هفته یک صفحه از قرآن؛ آیه‌ها بدون شکستن در حداکثر شش روز، یک روز مرور و استراحت.</p></div>
      {teacher && <div className="plan-switch"><button className={view === "mine" ? "on" : ""} onClick={() => setView("mine")}>برنامه‌ی من</button><button className={view === "class" ? "on" : ""} onClick={() => setView("class")}>گزارش کلاس</button></div>}</div>
    {view === "mine" || !teacher ? <LearnerPlan /> : <TeacherPlan classes={classes} />}
  </section>;
}
