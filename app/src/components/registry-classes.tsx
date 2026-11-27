import { useEffect, useRef, useState } from "react";
import { Notice } from "./notice";

async function call(method: string, path: string, body?: unknown) {
  const r = await fetch(path, { method, ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}) });
  const d = await r.json().catch(() => ({ error: "پاسخ نامعتبر بود." }));
  if (!r.ok) throw new Error(d.error || "خطا");
  return d;
}
type Item = { name: string; students: number };
type Insp = { id: string; name: string; blockers: string[]; willRemove: string[] };
const fa = (n: number) => n.toLocaleString("fa-IR");

/** Admin only: preview, then create, the classes named in the registry (دفتر) that do not exist yet. */
export function RegistryClasses({ onCreated }: { onCreated?: () => void }) {
  const [plan, setPlan] = useState<{ toCreate: Item[]; already: Item[] } | null>(null);
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState("");
  const [all, setAll] = useState<{ id: string; name: string }[] | null>(null), [insp, setInsp] = useState<Insp | null>(null);
  const [activeId, setActiveId] = useState(""), [dmsg, setDmsg] = useState(""), boxRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => { if (insp || dmsg) boxRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }); }, [insp, dmsg]);
  const run = async (fn: () => Promise<void>) => { setBusy(true); setMsg(""); try { await fn(); } catch (e: any) { setMsg(e.message); } finally { setBusy(false); } };
  return <section className="panel">
    <h2>کلاس‌های دفتر</h2>
    <div className="report-form">
      <p className="plan-hint">کلاس‌هایی که فقط نامشان در دفتر (اکسل) آمده را به‌عنوان کلاس واقعی می‌سازد. اول پیش‌نمایش را ببینید.</p>
      <button className="secondary-action" disabled={busy} onClick={() => void run(async () => setPlan(await call("GET", "/api/registry-classes")))}>پیش‌نمایش کلاس‌های دفتر</button>
      {plan && <>
        <h3>ساخته می‌شود ({fa(plan.toCreate.length)})</h3>
        {plan.toCreate.map(c => <div className="simple-row" key={c.name}><b>{c.name}</b><span>{fa(c.students)} حافظ</span></div>)}
        {!plan.toCreate.length && <p className="empty-state">کلاس جدیدی برای ساخت نیست.</p>}
        {!!plan.already.length && <><h3>از قبل هست ({fa(plan.already.length)})</h3>
          {plan.already.map(c => <div className="simple-row" key={c.name}><b>{c.name}</b><span>{fa(c.students)} حافظ</span></div>)}</>}
        <button className="primary-wide" disabled={busy || !plan.toCreate.length} onClick={() => void run(async () => { const d = await call("POST", "/api/registry-classes"); setPlan(await call("GET", "/api/registry-classes")); setMsg(`${fa(d.created.length)} کلاس ساخته شد ✅`); onCreated?.(); })}>ساخت کلاس‌ها</button>
      </>}
    </div>
    <MembersPanel />
    <div className="report-form">
      <h3>حذف کلاس خالی</h3>
      <p className="plan-hint">فقط کلاسی که عضو، معلم، آزمون، برنامه یا گزارشی ندارد (جز عضویت خودِ شما) حذف می‌شود. اول توضیح می‌دهم چه چیزی برداشته می‌شود و بعد با تأیید دوم حذف می‌کنم.</p>
      {!all && <button className="secondary-action" disabled={busy} onClick={() => void run(async () => setAll((await call("GET", "/api/registry-classes?classes=1")).classes))}>نمایش کلاس‌ها</button>}
      {all && !all.some(c => c.id === activeId) && dmsg && <div ref={boxRef}>{dmsg.includes("✅") ? <p className="hint">{dmsg}</p> : <p className="error-msg">{dmsg}</p>}</div>}
      {all?.map(c => <div key={c.id}>
        <div className="simple-row"><b>{c.name}</b><button className="secondary-action" disabled={busy} onClick={() => void run(async () => { setActiveId(c.id); setInsp(null); setDmsg(""); try { setInsp(await call("GET", "/api/registry-classes?inspect=" + encodeURIComponent(c.id))); } catch (e: any) { setDmsg(e.message); } })}>{busy && activeId === c.id && !insp ? "در حال بررسی…" : "حذف کلاس خالی"}</button></div>
        {activeId === c.id && <div ref={boxRef}>
          {busy && !insp && !dmsg && <p className="plan-hint">در حال بررسی…</p>}
          {dmsg && <p className={dmsg.includes("✅") ? "hint" : "error-msg"}>{dmsg}</p>}
          {insp && insp.id === c.id && <div className="invite-result">
            <b>{insp.name}</b>
            {insp.blockers.length
              ? <p className="error-msg">خالی نیست، پس حذف نمی‌شود: {insp.blockers.join("، ")}.</p>
              : <><p>این موارد برداشته می‌شود (قابل برگشت نیست):</p><ul>{insp.willRemove.map(w => <li key={w}>{w}</li>)}</ul>
                <button className="primary-wide" disabled={busy} onClick={() => void run(async () => { try { const d = await call("DELETE", "/api/registry-classes", { classId: insp.id }); setInsp(null); setAll((await call("GET", "/api/registry-classes?classes=1")).classes); setDmsg(`کلاس «${d.deleted}» حذف شد ✅`); onCreated?.(); } catch (e: any) { setDmsg(e.message); } })}>بله، حذف شود</button></>}
            <button className="secondary-action" onClick={() => { setInsp(null); setActiveId(""); setDmsg(""); }}>انصراف</button>
          </div>}
        </div>}
      </div>)}
    </div>
    <Notice msg={msg} />
  </section>;
}

type Plan = { counts: { toAdd: number; inClass: number; noAccount: number; noClass: number }; missingClasses: { name: string; students: number }[] };
/** Admin only: put registry learners who already have an account into the class named in the registry. Preview first. */
function MembersPanel() {
  const [plan, setPlan] = useState<Plan | null>(null), [busy, setBusy] = useState(false), [msg, setMsg] = useState("");
  const run = async (fn: () => Promise<void>) => { setBusy(true); setMsg(""); try { await fn(); } catch (e: any) { setMsg(e.message); } finally { setBusy(false); } };
  return <div className="report-form">
    <h3>ثبت قرآن‌آموزان در کلاس‌هایشان</h3>
    <p className="plan-hint">هر قرآن‌آموزِ دفتر که حساب دارد (با همان شماره یا ایمیل) به کلاسی که در دفتر نوشته شده اضافه می‌شود. کسی از کلاس برداشته نمی‌شود. کسانی که هنوز وارد نشده‌اند، هنگام اولین ورود خودکار اضافه می‌شوند.</p>
    <button className="secondary-action" disabled={busy} onClick={() => void run(async () => setPlan(await call("GET", "/api/registry-members")))}>پیش‌نمایش</button>
    {plan && <>
      <div className="simple-row"><b>اضافه می‌شوند</b><span>{fa(plan.counts.toAdd)}</span></div>
      <div className="simple-row"><b>از قبل در کلاس‌اند</b><span>{fa(plan.counts.inClass)}</span></div>
      <div className="simple-row"><b>هنوز حساب ندارند (بعد از ورود)</b><span>{fa(plan.counts.noAccount)}</span></div>
      <div className="simple-row"><b>کلاس‌شان در سامانه نیست</b><span>{fa(plan.counts.noClass)}</span></div>
      {plan.missingClasses.map(c => <div className="simple-row" key={c.name}><small>{c.name}</small><small>{fa(c.students)} نفر</small></div>)}
      <button className="primary-wide" disabled={busy || !plan.counts.toAdd} onClick={() => void run(async () => { const d = await call("POST", "/api/registry-members"); setPlan(d); setMsg(`${fa(d.added)} نفر در کلاس‌شان ثبت شدند ✅`); })}>ثبت قرآن‌آموزان در کلاس‌هایشان</button>
    </>}
    <Notice msg={msg} />
  </div>;
}
