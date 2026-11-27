import { useEffect, useState } from "react";
import { Notice } from "./notice";
import { PassMarks } from "./pass-marks";

type User = { id: string; role: "admin" | "teacher" | "memorizer" };
const KIND: Record<string, string> = { hifz: "حسن حفظ", tadabbur: "تدبر", vocabulary: "لغت", final: "عمومی" };
const fa = (n: number | string) => String(n).replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);

async function call(method: "GET" | "POST", path: string, body?: unknown) {
  const r = await fetch(path, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({ error: "پاسخ نامعتبر بود." }));
  if (!r.ok) throw new Error(d.error || "خطا");
  return d;
}

/** آزمون‌های کلاس: staff (inside an opened class, `classId` required) create exams + questions and see scores of THAT class only; learners take each exam once. `classes` is accepted for compatibility and unused. */
export function Exams({ user, classId, embedded }: { user: User; classes?: unknown; classId?: string; embedded?: boolean }) {
  const staff = user.role !== "memorizer";
  const [open, setOpen] = useState<string>(""), [busy, setBusy] = useState(false), [msg, setMsg] = useState("");
  const run = async (fn: () => Promise<void>) => { setBusy(true); setMsg(""); try { await fn(); } catch (e: any) { setMsg(e.message); } finally { setBusy(false); } };
  const Wrap = embedded ? "div" : "section";
  return <Wrap className={embedded ? undefined : "panel"}>
    {!embedded && <h2>آزمون‌ها</h2>}
    {open ? (staff ? <StaffExam id={open} back={() => setOpen("")} run={run} busy={busy} /> : <TakeExam id={open} back={() => setOpen("")} run={run} busy={busy} />)
      : (staff ? (classId ? <><PassMarks classId={classId} say={setMsg} /><StaffList classId={classId} openExam={setOpen} run={run} busy={busy} /></> : <p className="empty-state">اول یک کلاس را باز کنید.</p>) : <LearnerList openExam={setOpen} run={run} />)}
    <Notice msg={msg} />
  </Wrap>;
}

type RunP = { run: (fn: () => Promise<void>) => Promise<void>; busy: boolean };

function StaffList({ classId, openExam, run, busy }: { classId: string; openExam: (id: string) => void } & RunP) {
  const [exams, setExams] = useState<any[]>([]), [title, setTitle] = useState(""), [date, setDate] = useState("");
  const load = () => run(async () => { setExams((await call("GET", "/api/exams")).exams || []); });
  useEffect(() => { void load(); }, []);
  return <>
    <div className="report-form">
      <h3>آزمون جدید</h3>
      <label>عنوان آزمون<input value={title} onChange={e => setTitle(e.target.value)} placeholder="مثلاً آزمون گام اول" /></label>
      <label>تاریخ (اختیاری)<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
      <button className="primary-wide" disabled={busy || !title.trim()} onClick={() => void run(async () => { const r = await call("POST", "/api/exams", { action: "create_exam", classId, title, date }); setTitle(""); setDate(""); openExam(r.id); })}>ساخت آزمون</button>
    </div>
    {exams.filter(e => e.class_id === classId).map(e => <div className="simple-row" key={e.id}><b>{e.title}</b><span>{fa(e.questions)} سؤال · {fa(e.attempts)} پاسخ</span><button className="secondary-action" onClick={() => openExam(e.id)}>باز کردن</button></div>)}
    {!exams.length && <p className="empty-state">هنوز آزمونی ساخته نشده است.</p>}
  </>;
}

function StaffExam({ id, back, run, busy }: { id: string; back: () => void } & RunP) {
  const [d, setD] = useState<any>(null), [prompt, setPrompt] = useState(""), [choices, setChoices] = useState(""), [answer, setAnswer] = useState(""), [kind, setKind] = useState("final"), [points, setPoints] = useState("1");
  const load = () => run(async () => { setD(await call("GET", "/api/exams?examId=" + encodeURIComponent(id))); });
  useEffect(() => { void load(); }, [id]);
  if (!d) return <p className="empty-state">در حال بارگذاری…</p>;
  const locked = d.attempts.length > 0;
  return <>
    <button className="secondary-action" onClick={back}>→ همه‌ی آزمون‌ها</button>
    <h3>{d.exam.title}</h3>{d.exam.exam_date && <p className="plan-hint">{d.exam.exam_date}</p>}
    <h3>سؤال‌ها ({fa(d.questions.length)})</h3>
    {d.questions.map((q: any, i: number) => <div className="simple-row" key={q.id}><b>{fa(i + 1)}. {q.prompt}</b><span>{KIND[q.kind]} · {fa(q.points)} نمره · پاسخ: {q.answer_key}{q.choices?.length ? " · گزینه‌ها: " + q.choices.join("، ") : ""}</span>{!locked && <button className="secondary-action" disabled={busy} onClick={() => void run(async () => { await call("POST", "/api/exams", { action: "delete_question", id: q.id }); await load(); })}>حذف</button>}</div>)}
    {!d.questions.length && <p className="empty-state">هنوز سؤالی نیست.</p>}
    {locked ? <p className="plan-hint">چون قرآن‌آموزی پاسخ داده، افزودن و حذف سؤال بسته شده است.</p> : <div className="report-form">
      <h3>افزودن سؤال</h3>
      <label>نوع<select value={kind} onChange={e => setKind(e.target.value)}>{Object.entries(KIND).map(([k, v]) => <option value={k} key={k}>{v}</option>)}</select></label>
      <label>متن سؤال<textarea value={prompt} onChange={e => setPrompt(e.target.value)} /></label>
      <label>گزینه‌ها (با ویرگول جدا کنید؛ خالی = پاسخ تشریحی کوتاه)<input value={choices} onChange={e => setChoices(e.target.value)} placeholder="گزینه اول، گزینه دوم، گزینه سوم" /></label>
      <label>پاسخ صحیح (عیناً یکی از گزینه‌ها)<input value={answer} onChange={e => setAnswer(e.target.value)} /></label>
      <label>نمره<input type="number" min="1" max="20" value={points} onChange={e => setPoints(e.target.value)} /></label>
      <button className="primary-wide" disabled={busy || !prompt.trim() || !answer.trim()} onClick={() => void run(async () => { await call("POST", "/api/exams", { action: "add_question", examId: id, kind, prompt, answerKey: answer, points: Number(points), choices: choices.split(/[,،]/).map(x => x.trim()).filter(Boolean) }); setPrompt(""); setChoices(""); setAnswer(""); await load(); })}>افزودن سؤال</button>
    </div>}
    <h3>نمره‌ها</h3>
    {d.members.map((m: any) => { const a = d.attempts.find((x: any) => x.user_id === m.id); return <div className="simple-row" key={m.id}><b>{m.display_name}</b>{a ? <><span>{fa(a.score)} از {fa(a.max_score)}</span><button className="secondary-action" disabled={busy} onClick={() => void run(async () => { await call("POST", "/api/exams", { action: "reset_attempt", examId: id, userId: m.id }); await load(); })}>اجازه‌ی آزمون مجدد</button></> : <span>هنوز نداده</span>}</div>; })}
    {!d.members.length && <p className="empty-state">قرآن‌آموزی در این کلاس نیست.</p>}
    <button className="secondary-action" disabled={busy} onClick={() => void run(async () => { await call("POST", "/api/exams", { action: "delete_exam", id }); back(); })}>پنهان کردن این آزمون</button>
  </>;
}

function LearnerList({ openExam, run }: { openExam: (id: string) => void; run: RunP["run"] }) {
  const [exams, setExams] = useState<any[] | null>(null);
  useEffect(() => { void run(async () => { setExams((await call("GET", "/api/exams")).exams || []); }); }, []);
  if (!exams) return <p className="empty-state">در حال بارگذاری…</p>;
  return <>
    {exams.map(e => <div className="simple-row" key={e.id}><b>{e.title}</b><span>{e.class_name}{e.done ? " · نمره: " + fa(e.score) + " از " + fa(e.max_score) : e.questions ? "" : " · هنوز سؤالی ندارد"}</span>{!e.done && e.questions > 0 && <button className="secondary-action" onClick={() => openExam(e.id)}>شروع آزمون</button>}</div>)}
    {!exams.length && <p className="empty-state">هنوز آزمونی برای کلاس شما نیست.</p>}
  </>;
}

function TakeExam({ id, back, run, busy }: { id: string; back: () => void } & RunP) {
  const [d, setD] = useState<any>(null), [ans, setAns] = useState<Record<string, string>>({}), [res, setRes] = useState<{ score: number; maxScore: number } | null>(null);
  useEffect(() => { void run(async () => { setD(await call("GET", "/api/exams?examId=" + encodeURIComponent(id))); }); }, [id]);
  if (!d) return <p className="empty-state">در حال بارگذاری…</p>;
  const r = res || (d.done ? { score: d.score, maxScore: d.maxScore } : null);
  if (r) return <><h3>{d.exam.title}</h3><div className="invite-result"><b>نمره‌ی شما: {fa(r.score)} از {fa(r.maxScore)}</b></div><button className="secondary-action" onClick={back}>→ آزمون‌ها</button></>;
  return <>
    <button className="secondary-action" onClick={back}>→ آزمون‌ها</button>
    <h3>{d.exam.title}</h3>
    {d.questions.map((q: any, i: number) => <div className="report-form" key={q.id}>
      <b>{fa(i + 1)}. {q.prompt}</b>
      {q.choices?.length ? q.choices.map((c: string) => <label key={c} className="choice"><input type="radio" name={q.id} checked={ans[q.id] === c} onChange={() => setAns(a => ({ ...a, [q.id]: c }))} /> {c}</label>)
        : <input value={ans[q.id] || ""} onChange={e => setAns(a => ({ ...a, [q.id]: e.target.value }))} />}
    </div>)}
    <button className="primary-wide" disabled={busy} onClick={() => void run(async () => { setRes(await call("POST", "/api/exams", { action: "submit", examId: id, answers: ans })); })}>ثبت پاسخ‌ها</button>
    <p className="plan-hint">هر آزمون یک بار داده می‌شود.</p>
  </>;
}
