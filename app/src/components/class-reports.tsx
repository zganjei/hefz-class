import { useEffect, useState } from "react";
import { lsLabel } from "../lib/level-step";
import { displayClassNames } from "../lib/teacher-name";

const fa = (n: number | string) => String(n).replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);

/** گزارش‌ها: per class (teacher: own classes, admin: all) the number of learners, the class's current program week and each learner's exam scores. */
export function ClassReports({ classId, embedded }: { classId?: string; embedded?: boolean } = {}) {
  const [d, setD] = useState<any>(null), [err, setErr] = useState("");
  useEffect(() => { fetch("/api/class-report").then(async r => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || "خطا"); setD(j); }).catch(e => setErr(e.message)); }, []);
  const Wrap = embedded ? "div" : "section", cls = embedded ? undefined : "panel";
  if (err) return <Wrap className={cls}><p className="error-msg">{err}</p></Wrap>;
  if (!d) return <Wrap className={cls}><p className="empty-state">در حال بارگذاری…</p></Wrap>;
  const list: any[] = classId ? d.classes.filter((c: any) => c.id === classId) : d.classes;
  const names = displayClassNames(d.classes.map((c: any) => c.name)), nameOf = (id: string) => names[d.classes.findIndex((c: any) => c.id === id)];
  return <Wrap className={cls}>
    {!embedded && <h2>گزارش‌ها</h2>}
    {!classId && <p className="plan-hint">{fa(d.totalLearners)} قرآن‌آموز در {fa(d.classes.length)} کلاس</p>}
    {list.map((c: any) => <article className="report-entry" key={c.id}>
      <div className="report-entry-head"><b>{nameOf(c.id)}{lsLabel(c.level, c.step) ? " · " + lsLabel(c.level, c.step) : ""}</b><i className="status">{fa(c.learners.length)} قرآن‌آموز</i></div>
      <small>{c.program ? "برنامه: " + c.program + (c.currentWeek ? " · الان در هفتهٔ " + fa(c.currentWeek.week_number) + " · " + c.currentWeek.title : c.status === "ended" ? " · برنامه تمام شده" : " · هنوز شروع نشده") : "جایگاه: " + (c.positionNote || "ثبت نشده") + " · برنامه‌ای به این کلاس وصل نیست"}</small>
      {c.learners.map((l: any) => <div className="simple-row" key={l.id}><b>{l.name}</b>
        <span>{[...c.exams.map((e: any) => e.title + ": " + (l.scores[e.id] ? fa(l.scores[e.id].score) + "/" + fa(l.scores[e.id].max) : "—")), ...l.manual.map((m: any) => m.title + ": " + fa(m.score) + (m.max ? "/" + fa(m.max) : ""))].join(" · ") || "نمره‌ای ثبت نشده"}{l.registered ? "" : " · هنوز وارد نشده"}</span></div>)}
      {!c.learners.length && <p className="empty-state">قرآن‌آموزی در این کلاس نیست.</p>}
    </article>)}
    {!list.length && <p className="empty-state">کلاسی برای نمایش نیست.</p>}
  </Wrap>;
}
