import { useState } from "react";

async function call(method: string, path: string) {
  const r = await fetch(path, { method });
  const d = await r.json().catch(() => ({ error: "پاسخ نامعتبر بود." }));
  if (!r.ok) throw new Error(d.error || "خطا");
  return d;
}
type Item = { name: string; students: number };
const fa = (n: number) => n.toLocaleString("fa-IR");

/** Admin only: preview, then create, the classes named in the registry (دفتر) that do not exist yet. */
export function RegistryClasses({ onCreated }: { onCreated?: () => void }) {
  const [plan, setPlan] = useState<{ toCreate: Item[]; already: Item[] } | null>(null);
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState("");
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
    {msg && <p className={msg.includes("✅") ? "hint" : "error-msg"}>{msg}</p>}
  </section>;
}
