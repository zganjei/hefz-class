import { useState } from "react";
import { Acc, useOne } from "./admin-ui";
import { RegistryClasses } from "./registry-classes";
import { ClassTeachers } from "./class-teachers";
import { Programs } from "./programs";
import { StaffAccounts } from "./staff-accounts";

type Note = { emailSent: boolean; text: string };
const faN = (n: number) => n.toLocaleString("fa-IR");

function AppCard({ a, busy, note, decide }: { a: any; busy: boolean; note?: Note; decide: (id: string, d: "approve" | "reject") => void }) {
  return <div className="app-card">
    <div className="app-head"><b>{a.first_name} {a.last_name}</b><span className={"app-status " + a.status}>{a.status === "pending" ? "در انتظار" : a.status === "approved" ? "تأیید شده" : "رد شده"}</span></div>
    <div className="app-meta"><span dir="ltr">{a.phone}</span><span>بله: <bdi>{a.bale_number}{a.bale_id ? " / " + a.bale_id : ""}</bdi></span><span>تحصیلات: {a.education}</span><span dir="ltr">{a.email}</span></div>
    {a.status === "pending" && <div className="adm-actions"><button type="button" className="adm-btn" disabled={busy} onClick={() => decide(a.id, "approve")}>تأیید</button><button type="button" className="adm-btn danger" disabled={busy} onClick={() => decide(a.id, "reject")}>رد</button></div>}
    {note && <div className="adm-note"><b>{note.emailSent ? "ایمیل تأیید فرستاده شد." : "ایمیل خودکار فعال نیست؛ این پیام را برای متقاضی بفرستید:"}</b>{!note.emailSent && <><span>{note.text}</span><button type="button" className="adm-btn quiet" onClick={() => { if (navigator.share) void navigator.share({ text: note.text }); else void navigator.clipboard.writeText(note.text); }}>ارسال / کپی پیام</button></>}</div>}
  </div>;
}

/** Admin «درخواست‌ها» tab: pending applications on top, everything else in one-at-a-time sections. */
export function AdminRequests({ applications, busy, decide, decisionNote, classRev, onCreated }: { applications: any[]; busy: boolean; decide: (id: string, d: "approve" | "reject") => void; decisionNote: Record<string, Note>; classRev: number; onCreated: () => void }) {
  const { open, toggle } = useOne<"programs" | "classes" | "accounts">();
  const [showDone, setShowDone] = useState(false);
  // a just-decided card stays on top while it carries a message the admin still has to send
  const todo = applications.filter(a => a.status === "pending" || decisionNote[a.id]);
  const done = applications.filter(a => !(a.status === "pending" || decisionNote[a.id]));
  const pending = applications.filter(a => a.status === "pending").length;
  return <div className="adm">
    <section className="adm-sec open adm-top">
      <div className="adm-head static"><span className="adm-title">نیازمند بررسی</span>{!!pending && <span className="adm-badge">{faN(pending)}</span>}</div>
      <div className="adm-body">
        {!todo.length && <p className="empty-state">درخواست جدیدی نیست.</p>}
        {todo.map(a => <AppCard key={a.id} a={a} busy={busy} note={decisionNote[a.id]} decide={decide} />)}
        {!!done.length && <>
          <button type="button" className="adm-btn quiet" aria-expanded={showDone} onClick={() => setShowDone(v => !v)}>{showDone ? "پنهان کردن" : "نمایش"} درخواست‌های بررسی‌شده ({faN(done.length)})</button>
          {showDone && done.map(a => <AppCard key={a.id} a={a} busy={busy} decide={decide} />)}
        </>}
      </div>
    </section>
    <Acc title="برنامه‌ها" open={open === "programs"} onToggle={() => toggle("programs")}><Programs refreshKey={classRev} /></Acc>
    <Acc title="کلاس‌ها و استادها" open={open === "classes"} onToggle={() => toggle("classes")}><ClassTeachers refreshKey={classRev} /><RegistryClasses onCreated={onCreated} /></Acc>
    <Acc title="حساب‌ها" open={open === "accounts"} onToggle={() => toggle("accounts")}><StaffAccounts /></Acc>
  </div>;
}
