import { useState } from "react";
import { Notice } from "./notice";
import { displayClassNames } from "../lib/teacher-name";

/** Admin: create a one-week invitation link for a new learner or teacher (optionally into a class). */
export function InviteMembers({ classes }: { classes: { id: string; name: string }[] }) {
  const [email, setEmail] = useState(""), [role, setRole] = useState("memorizer"), [classId, setClassId] = useState("");
  const [code, setCode] = useState(""), [busy, setBusy] = useState(false), [msg, setMsg] = useState("");
  const create = async () => {
    setBusy(true); setMsg("");
    try {
      const r = await fetch("/api/invitations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, role, classId: classId || null }) });
      const d = await r.json().catch(() => ({ error: "پاسخ نامعتبر بود." }));
      if (!r.ok) throw new Error(d.error || "خطا");
      setCode(d.invitation);
    } catch (e: any) { setMsg(e.message); } finally { setBusy(false); }
  };
  const link = code ? window.location.origin + "/?invite=" + encodeURIComponent(code) : "";
  const text = "دعوت به طرح «رزمی چنین» (حفظ قرآن همراه با تدبر). با این لینک ثبت‌نام کنید، تا ۷ روز معتبر است: " + link;
  return <div className="adm-stack">
    <Notice msg={msg} />
    <p className="plan-hint">برای افزودن قرآن‌آموز یا استاد جدید: ایمیل او را بنویسید، نقش و کلاس را انتخاب کنید و «ساخت دعوت‌نامه» را بزنید؛ لینکی ساخته می‌شود که آن را برایش می‌فرستید. با ورود از این لینک (۷ روز اعتبار، فقط با همان ایمیل)، حساب او ساخته می‌شود و در کلاسِ انتخاب‌شده قرار می‌گیرد.</p>
    <label className="field-label">ایمیل عضو<input type="email" dir="ltr" value={email} onChange={e => setEmail(e.target.value)} /></label>
    <div className="inline-form">
      <select value={role} onChange={e => setRole(e.target.value)}><option value="memorizer">قرآن‌آموز</option><option value="teacher">استاد</option></select>
      <select value={classId} onChange={e => setClassId(e.target.value)}><option value="">بدون کلاس</option>{displayClassNames(classes.map(c => c.name)).map((l, k) => <option value={classes[k].id} key={classes[k].id}>{l}</option>)}</select>
      <button type="button" className="adm-btn" disabled={busy || !email} onClick={() => void create()}>ساخت دعوت‌نامه</button>
    </div>
    {code && <div className="invite-result"><b>دعوت‌نامه آماده است (۷ روز اعتبار)</b>
      <button type="button" className="adm-btn" onClick={() => { if (navigator.share) void navigator.share({ text }); else void navigator.clipboard.writeText(text); }}>ارسال دعوت‌نامه</button>
      <button type="button" className="adm-btn quiet" onClick={() => void navigator.clipboard.writeText(text)}>کپی پیام</button></div>}
  </div>;
}
