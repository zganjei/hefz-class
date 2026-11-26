import { useState } from "react";

async function post(path: string, body: unknown) {
  const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({ error: "پاسخ نامعتبر بود." }));
  if (!r.ok) throw new Error(d.error || "خطا");
  return d;
}

/** Admin tools: set my own phone + password, and create a teacher/admin account with a one-time random password. */
export function StaffAccounts() {
  const [myPhone, setMyPhone] = useState(""), [myPass, setMyPass] = useState("");
  const [name, setName] = useState(""), [phone, setPhone] = useState(""), [role, setRole] = useState("teacher");
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState(""), [made, setMade] = useState<{ phone: string; password: string } | null>(null);
  const run = async (fn: () => Promise<void>) => { setBusy(true); setMsg(""); try { await fn(); } catch (e: any) { setMsg(e.message); } finally { setBusy(false); } };
  return <section className="panel">
    <h2>ورود با شماره و گذرواژه</h2>
    <div className="report-form">
      <h3>شماره و گذرواژه‌ی خودم</h3>
      <label>شماره‌ی همراه<input dir="ltr" inputMode="tel" value={myPhone} onChange={e => setMyPhone(e.target.value)} placeholder="09123456789" /></label>
      <label>گذرواژه (دست‌کم ۸ نویسه)<input type="password" value={myPass} onChange={e => setMyPass(e.target.value)} autoComplete="new-password" /></label>
      <button className="primary-wide" disabled={busy || !myPhone || myPass.length < 8} onClick={() => void run(async () => { await post("/api/auth/credentials", { phone: myPhone, password: myPass }); setMyPass(""); setMsg("ذخیره شد ✅ از این به بعد می‌توانید با شماره و گذرواژه وارد شوید."); })}>ذخیره</button>
    </div>
    <div className="report-form">
      <h3>ساخت حساب برای همکار</h3>
      <label>نام و نام خانوادگی<input value={name} onChange={e => setName(e.target.value)} /></label>
      <label>شماره‌ی همراه<input dir="ltr" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="09123456789" /></label>
      <label>نقش<select value={role} onChange={e => setRole(e.target.value)}><option value="teacher">معلم</option><option value="admin">مدیر</option></select></label>
      <button className="primary-wide" disabled={busy || !name || !phone} onClick={() => void run(async () => { const r = await post("/api/staff", { name, phone, role }); setMade({ phone: r.phone, password: r.password }); setName(""); setPhone(""); })}>ساخت حساب و گذرواژه‌ی تصادفی</button>
      {made && <div className="invite-result"><b>گذرواژه فقط همین یک بار نمایش داده می‌شود:</b><span dir="ltr">{made.phone} / {made.password}</span><button onClick={() => void navigator.clipboard.writeText(`${made.phone}\n${made.password}`)}>کپی</button></div>}
    </div>
    {msg && <p className={msg.includes("✅") ? "hint" : "error-msg"}>{msg}</p>}
  </section>;
}
