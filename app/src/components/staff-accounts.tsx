import { useEffect, useState } from "react";
import { Notice } from "./notice";
import { Confirm } from "./admin-ui";
import { ALL_ROLES, ROLE_FA, type AppRole } from "../lib/roles";

async function post(path: string, body: unknown, method = "POST") {
  const r = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({ error: "پاسخ نامعتبر بود." }));
  if (!r.ok) throw new Error(d.error || "خطا");
  return d;
}

/** Admin tools: roles of each person (one or several of قرآن‌آموز، استاد، مدیر، پشتیبان), create an account with a one-time random password, set my own phone + password. */
export function StaffAccounts() {
  const [myPhone, setMyPhone] = useState(""), [myPass, setMyPass] = useState("");
  const [name, setName] = useState(""), [phone, setPhone] = useState(""), [newRoles, setNewRoles] = useState<AppRole[]>(["teacher"]);
  const [showMine, setShowMine] = useState(false), [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState(""), [made, setMade] = useState<{ phone: string; password: string } | null>(null);
  type Acc = { id: string; display_name: string; role: string; roles: AppRole[] };
  const [accounts, setAccounts] = useState<Acc[]>([]), [me, setMe] = useState(""), [pending, setPending] = useState<{ id: string; roles: AppRole[] } | null>(null), [editId, setEditId] = useState(""), [editName, setEditName] = useState(""), [q, setQ] = useState("");
  const loadAccounts = async (query = q) => { const r = await fetch("/api/staff?accounts=1" + (query.trim().length >= 2 ? "&q=" + encodeURIComponent(query.trim()) : "")); const d = await r.json().catch(() => ({})); if (r.ok) { setAccounts(d.accounts || []); setMe(d.me || ""); } };
  useEffect(() => { void loadAccounts(""); }, []);
  useEffect(() => { const t = setTimeout(() => void loadAccounts(q), 300); return () => clearTimeout(t); }, [q]);
  const run = async (fn: () => Promise<void>) => { setBusy(true); setMsg(""); try { await fn(); } catch (e: any) { setMsg(e.message); } finally { setBusy(false); } };
  const admins = accounts.filter(a => a.roles.includes("admin")).length;
  /** Same guards as the server (which is authoritative); returns a Farsi message or "". */
  const refusal = (a: Acc, next: AppRole[]) => {
    if (!next.length) return "دست‌کم یک نقش باید باقی بماند.";
    if (a.roles.includes("admin") && !next.includes("admin")) {
      if (a.id === me) return "نمی‌توانید نقش مدیر را از حساب خودتان بردارید.";
      if (admins <= 1) return "آخرین مدیر را نمی‌شود برداشت؛ ابتدا مدیر دیگری تعیین کنید.";
    }
    return "";
  };
  const toggle = (a: Acc, r: AppRole) => {
    const next = ALL_ROLES.filter(x => (x === r ? !a.roles.includes(r) : a.roles.includes(x)));
    const bad = refusal(a, next);
    if (bad) { setPending(null); setMsg(bad); return; }
    setMsg(""); setPending({ id: a.id, roles: next });
  };
  const confirmText = (a: Acc, next: AppRole[]) => {
    const added = next.filter(r => !a.roles.includes(r)), removed = a.roles.filter(r => !next.includes(r));
    const parts = [...added.map(r => `نقش «${ROLE_FA[r]}» به ${a.display_name} داده شود`), ...removed.map(r => `نقش «${ROLE_FA[r]}» از ${a.display_name} برداشته شود`)];
    const hint = added.includes("admin") ? " مدیر به همه‌ی کلاس‌ها و درخواست‌ها دسترسی دارد." : removed.includes("admin") ? " دسترسی مدیریتی او برداشته می‌شود." : removed.includes("teacher") ? " دیگر استاد حساب نیست (کلاس‌های قبلی‌اش سر جایشان می‌مانند)." : "";
    return parts.join(" و ") + "؟" + hint;
  };
  const toggleNew = (r: AppRole) => setNewRoles(l => ALL_ROLES.filter(x => (x === r ? !l.includes(r) : l.includes(x))));
  return <div className="adm-stack">
    <div className="adm-block">
      <h3>حساب‌ها و نقش‌ها</h3>
      <p className="plan-hint">هر نفر می‌تواند یک یا چند نقش داشته باشد: قرآن‌آموز، استاد، مدیر، پشتیبان. برای افزودن نقش به یک قرآن‌آموز، نامش را جستجو کنید.</p>
      <label>جستجوی حساب (نام، شماره یا ایمیل)<input value={q} onChange={e => setQ(e.target.value)} placeholder="دست‌کم ۲ حرف" /></label>
      {accounts.map(a => { const self = a.id === me; return <div key={a.id}>
        <div className="adm-row"><b>{a.display_name}{self ? " (شما)" : ""}</b>{a.roles.map(r => <span key={r} className="adm-role-badge">{ROLE_FA[r]}</span>)}
          {editId !== a.id && <button className="adm-btn quiet sm" disabled={busy} onClick={() => { setEditId(a.id); setEditName(a.display_name); }}>تغییر نام</button>}
          <div className="adm-roles" role="group" aria-label={"نقش‌های " + a.display_name}>{ALL_ROLES.map(r => <button key={r} type="button" className={"adm-chip" + (a.roles.includes(r) ? " on" : "")} aria-pressed={a.roles.includes(r)} disabled={busy} onClick={() => toggle(a, r)}>{a.roles.includes(r) ? "✓ " : "+ "}{ROLE_FA[r]}</button>)}</div>
        </div>
        {editId === a.id && <div className="adm-block"><label>نام نمایشی<input value={editName} maxLength={60} onChange={e => setEditName(e.target.value)} /></label>
          <div className="adm-actions"><button className="adm-btn" disabled={busy || editName.trim().length < 2} onClick={() => void run(async () => { await post("/api/staff", { userId: a.id, name: editName }, "PATCH"); setEditId(""); await loadAccounts(); setMsg("نام حساب تغییر کرد ✅"); })}>ذخیره</button><button className="adm-btn quiet" onClick={() => setEditId("")}>انصراف</button></div></div>}
        {pending?.id === a.id && <Confirm danger={pending.roles.length < a.roles.length} busy={busy} text={confirmText(a, pending.roles)} yes="بله، ذخیره شود" onNo={() => setPending(null)} onYes={() => void run(async () => { await post("/api/staff", { userId: a.id, roles: pending.roles }, "PATCH"); setPending(null); await loadAccounts(); setMsg("نقش‌ها ذخیره شد ✅"); })} />}
      </div>; })}
      {!accounts.length && <p className="empty-state">حسابی پیدا نشد.</p>}
    </div>
    <div className="adm-block">
      <button type="button" className="adm-btn quiet" aria-expanded={showNew} onClick={() => setShowNew(v => !v)}>{showNew ? "− " : "+ "}حساب جدید (ساخت حساب با شماره و گذرواژه)</button>
      <div className="adm-stack" hidden={!showNew}>
      <label>نام و نام خانوادگی<input value={name} onChange={e => setName(e.target.value)} /></label>
      <label>شماره‌ی همراه<input dir="ltr" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="09123456789" /></label>
      <fieldset className="adm-checks"><legend>نقش‌ها (یکی یا چند تا)</legend>{ALL_ROLES.map(r => <label key={r}><input type="checkbox" checked={newRoles.includes(r)} onChange={() => toggleNew(r)} /> {ROLE_FA[r]}</label>)}</fieldset>
      <button className="adm-btn" disabled={busy || !name || !phone || !newRoles.length} onClick={() => void run(async () => { const r = await post("/api/staff", { name, phone, roles: newRoles }); setMade({ phone: r.phone, password: r.password }); setName(""); setPhone(""); await loadAccounts(); })}>ساخت حساب و گذرواژه‌ی تصادفی</button>
      </div>
      {made && <div className="adm-note"><b>گذرواژه فقط همین یک بار نمایش داده می‌شود:</b><span dir="ltr">{made.phone} / {made.password}</span><button type="button" className="adm-btn quiet" onClick={() => void navigator.clipboard.writeText(`${made.phone}\n${made.password}`)}>کپی</button></div>}
    </div>
    <div className="adm-block">
      <button type="button" className="adm-btn quiet" aria-expanded={showMine} onClick={() => setShowMine(v => !v)}>{showMine ? "− " : "+ "}ورود من با شماره و گذرواژه</button>
      <div className="adm-stack" hidden={!showMine}>
      <label>شماره‌ی همراه<input dir="ltr" inputMode="tel" value={myPhone} onChange={e => setMyPhone(e.target.value)} placeholder="09123456789" /></label>
      <label>گذرواژه (دست‌کم ۸ نویسه)<input type="password" value={myPass} onChange={e => setMyPass(e.target.value)} autoComplete="new-password" /></label>
      <button className="adm-btn" disabled={busy || !myPhone || myPass.length < 8} onClick={() => void run(async () => { await post("/api/auth/credentials", { phone: myPhone, password: myPass }); setMyPass(""); setMsg("ذخیره شد ✅ از این به بعد می‌توانید با شماره و گذرواژه وارد شوید."); })}>ذخیره</button>
      </div>
    </div>
    <Notice msg={msg} />
  </div>;
}
