import { useEffect, useState } from "react";
import { Notice } from "./notice";
import { Confirm } from "./admin-ui";

async function post(path: string, body: unknown, method = "POST") {
  const r = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({ error: "پاسخ نامعتبر بود." }));
  if (!r.ok) throw new Error(d.error || "خطا");
  return d;
}

/** Admin tools: set my own phone + password, and create a teacher/admin account with a one-time random password. */
export function StaffAccounts() {
  const [myPhone, setMyPhone] = useState(""), [myPass, setMyPass] = useState("");
  const [name, setName] = useState(""), [phone, setPhone] = useState(""), [role, setRole] = useState("teacher");
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState(""), [made, setMade] = useState<{ phone: string; password: string } | null>(null);
  type Acc = { id: string; display_name: string; role: "admin" | "teacher" };
  const [accounts, setAccounts] = useState<Acc[]>([]), [me, setMe] = useState(""), [confirmId, setConfirmId] = useState(""), [editId, setEditId] = useState(""), [editName, setEditName] = useState("");
  const loadAccounts = async () => { const r = await fetch("/api/staff?accounts=1"); const d = await r.json().catch(() => ({})); if (r.ok) { setAccounts(d.accounts || []); setMe(d.me || ""); } };
  useEffect(() => { void loadAccounts(); }, []);
  const run = async (fn: () => Promise<void>) => { setBusy(true); setMsg(""); try { await fn(); } catch (e: any) { setMsg(e.message); } finally { setBusy(false); } };
  return <div className="adm-stack">
    <div className="adm-block">
      <h3>ورود من با شماره و گذرواژه</h3>
      <label>شماره‌ی همراه<input dir="ltr" inputMode="tel" value={myPhone} onChange={e => setMyPhone(e.target.value)} placeholder="09123456789" /></label>
      <label>گذرواژه (دست‌کم ۸ نویسه)<input type="password" value={myPass} onChange={e => setMyPass(e.target.value)} autoComplete="new-password" /></label>
      <button className="adm-btn" disabled={busy || !myPhone || myPass.length < 8} onClick={() => void run(async () => { await post("/api/auth/credentials", { phone: myPhone, password: myPass }); setMyPass(""); setMsg("ذخیره شد ✅ از این به بعد می‌توانید با شماره و گذرواژه وارد شوید."); })}>ذخیره</button>
    </div>
    <div className="adm-block">
      <h3>ساخت حساب برای استاد یا مدیر</h3>
      <label>نام و نام خانوادگی<input value={name} onChange={e => setName(e.target.value)} /></label>
      <label>شماره‌ی همراه<input dir="ltr" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="09123456789" /></label>
      <label>نقش<select value={role} onChange={e => setRole(e.target.value)}><option value="teacher">استاد</option><option value="admin">مدیر</option></select></label>
      <button className="adm-btn" disabled={busy || !name || !phone} onClick={() => void run(async () => { const r = await post("/api/staff", { name, phone, role }); setMade({ phone: r.phone, password: r.password }); setName(""); setPhone(""); })}>ساخت حساب و گذرواژه‌ی تصادفی</button>
      {made && <div className="adm-note"><b>گذرواژه فقط همین یک بار نمایش داده می‌شود:</b><span dir="ltr">{made.phone} / {made.password}</span><button type="button" className="adm-btn quiet" onClick={() => void navigator.clipboard.writeText(`${made.phone}\n${made.password}`)}>کپی</button></div>}
    </div>
    <div className="adm-block">
      <h3>حساب‌های استاد و مدیر</h3>
      {accounts.map(a => { const next = a.role === "admin" ? "teacher" : "admin"; const nextFa = next === "admin" ? "مدیر" : "استاد"; const self = a.id === me; return <div key={a.id}>
        <div className="adm-row"><b>{a.display_name}</b><span>{a.role === "admin" ? "مدیر" : "استاد"}</span>
          {editId !== a.id && <button className="adm-btn quiet sm" disabled={busy} onClick={() => { setEditId(a.id); setEditName(a.display_name); }}>تغییر نام</button>}
          {!self && confirmId !== a.id && <button className="adm-btn quiet sm" disabled={busy} onClick={() => setConfirmId(a.id)}>{next === "admin" ? "تبدیل به مدیر" : "تبدیل به استاد"}</button>}
        </div>
        {editId === a.id && <div className="adm-block"><label>نام نمایشی<input value={editName} maxLength={60} onChange={e => setEditName(e.target.value)} /></label>
          <div className="adm-actions"><button className="adm-btn" disabled={busy || editName.trim().length < 2} onClick={() => void run(async () => { await post("/api/staff", { userId: a.id, name: editName }, "PATCH"); setEditId(""); await loadAccounts(); setMsg("نام حساب تغییر کرد ✅"); })}>ذخیره</button><button className="adm-btn quiet" onClick={() => setEditId("")}>انصراف</button></div></div>}
        {confirmId === a.id && <Confirm danger={false} busy={busy} text={next === "admin" ? `${a.display_name} مدیر شود؟ مدیر به همه‌ی کلاس‌ها و درخواست‌ها دسترسی دارد.` : `${a.display_name} استاد شود؟ دسترسی مدیریتی او برداشته می‌شود و فقط به کلاس‌های خودش دسترسی دارد.`} yes={`بله، ${nextFa} شود`} onNo={() => setConfirmId("")} onYes={() => void run(async () => { await post("/api/staff", { userId: a.id, role: next }, "PATCH"); setConfirmId(""); await loadAccounts(); setMsg(`نقش ${a.display_name} به «${nextFa}» تغییر کرد ✅`); })} />}
      </div>; })}
      {!accounts.length && <p className="empty-state">حسابی پیدا نشد.</p>}
    </div>
    <Notice msg={msg} />
  </div>;
}
