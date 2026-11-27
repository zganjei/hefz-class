import { useEffect, useState } from "react";

const fa = (n: number | string) => String(n).replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);

/** گزارش‌ها: per class (teacher: own classes, admin: all) the number of learners, the class's current program week and each learner's exam scores. */
export function ClassReports() {
  const [d, setD] = useState<any>(null), [err, setErr] = useState("");
  useEffect(() => { fetch("/api/class-report").then(async r => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || "خطا"); setD(j); }).catch(e => setErr(e.message)); }, []);
  if (err) return <section className="panel"><p className="error-msg">{err}</p></section>;
  if (!d) return <section className="panel"><p className="empty-state">در حال بارگذاری…</p></section>;
  return <section className="panel">
    <h2>گزارش‌ها</h2>
    <p className="plan-hint">{fa(d.totalLearners)} قرآن‌آموز در {fa(d.classes.length)} کلاس</p>
    {d.classes.map((c: any) => <article className="report-entry" key={c.id}>
      <div className="report-entry-head"><b>{c.name}</b><i className="status">{fa(c.learners.length)} قرآن‌آموز</i></div>
      <small>{c.program ? "برنامه: " + c.program : "برنامه‌ی عمومی"}{c.currentWeek ? " · الان در هفتهٔ " + fa(c.currentWeek.week_number) + " · " + c.currentWeek.title : " · هفتهٔ جاری مشخص نیست"}</small>
      {c.learners.map((l: any) => <div className="simple-row" key={l.id}><b>{l.name}</b>
        <span>{[...c.exams.map((e: any) => e.title + ": " + (l.scores[e.id] ? fa(l.scores[e.id].score) + "/" + fa(l.scores[e.id].max) : "—")), ...l.manual.map((m: any) => m.title + ": " + fa(m.score) + (m.max ? "/" + fa(m.max) : ""))].join(" · ") || "نمره‌ای ثبت نشده"}{l.registered ? "" : " · هنوز وارد نشده"}</span></div>)}
      {!c.learners.length && <p className="empty-state">قرآن‌آموزی در این کلاس نیست.</p>}
    </article>)}
    {!d.classes.length && <p className="empty-state">کلاسی برای نمایش نیست.</p>}
  </section>;
}
