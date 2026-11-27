import { useEffect, useState } from "react";
import { VideoList, setWatched } from "./videos";
import type { VideoView } from "../lib/video";
import { ALL_ROLES, ROLE_FA, rolesOf, type AppRole } from "../lib/roles";
import { viewRolesOf } from "../lib/view-mode";

type U = { id: string; display_name: string; role: string; roles?: AppRole[] };
async function send(path: string, body: unknown, method: string) {
  const r = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({ error: "پاسخ نامعتبر بود." }));
  if (!r.ok) throw new Error(d.error || "خطا");
  return d;
}
const VIEW_HINT: Record<string, string> = { admin: "مدیریت کلاس‌ها، دفتر و درخواست‌ها", teacher: "کلاس‌های من", memorizer: "برنامه و آزمون‌های من" };

type PW = { week_number: number; title: string; open: boolean; videos?: VideoView[] };
/** The learner's videos: every video of the weeks already open in their class program (same unlocking rule as the plan). */
function MyVideos() {
  const [weeks, setWeeks] = useState<PW[] | null>(null), [program, setProgram] = useState<string | null>(null), [err, setErr] = useState("");
  const load = () => fetch("/api/plan").then(async r => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || "خطا"); setProgram(d.program?.name ?? null); setWeeks((d.weeks as PW[]).filter(w => w.open && w.videos?.length).reverse()); setErr(""); }).catch(e => setErr(e.message || "خطا"));
  useEffect(() => { void load(); }, []);
  const watch = async (v: VideoView) => {
    const next = !v.watched;
    setWeeks(ws => ws && ws.map(w => ({ ...w, videos: (w.videos || []).map(x => x.id === v.id ? { ...x, watched: next } : x) })));
    try { await setWatched(v.id, next); setErr(""); } catch (e: any) { setErr("ذخیره نشد: " + (e.message || "خطا")); void load(); }
  };
  if (err && !weeks) return <p className="error-msg">{err}</p>;
  if (!weeks) return <p className="empty-state">در حال بارگذاری…</p>;
  return <>
    {err && <p className="error-msg" role="alert">{err}</p>}
    {!weeks.length && <p className="empty-state">{program ? "هنوز ویدئویی برای هفته‌های باز برنامهٔ کلاس شما نیست. ویدئوها هر هفته در «برنامه» کنار درس همان هفته هم می‌آیند." : "ویدئوهای هر هفته در برنامهٔ کلاس شما نمایش داده می‌شود؛ هنوز برنامه‌ای به کلاس شما وصل نیست. به بخش «برنامه» بروید."}</p>}
    {weeks.map(w => <VideoList key={w.week_number} videos={w.videos!} title={`هفتهٔ ${String(w.week_number).replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[+d])} · ${w.title}`} onToggle={v => void watch(v)} />)}
  </>;
}

/** Own account page: change the active view, rename, add/remove own non-admin roles, see videos placeholder (learner view only), sign out. */
export function Profile({ user, view, setView, onUser, notify, onLogout }: { user: U; view: AppRole | null; setView: (r: AppRole) => void; onUser: (u: U) => void; notify: (m: string) => void; onLogout: () => void }) {
  const roles = rolesOf(user), views = viewRolesOf(user), isAdm = roles.includes("admin");
  const [name, setName] = useState(user.display_name), [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<void>) => { setBusy(true); notify(""); try { await fn(); } catch (e: any) { notify(e.message || "خطا"); } finally { setBusy(false); } };
  const saveName = () => run(async () => { const d = await send("/api/auth/me", { name }, "PATCH"); onUser(d.user); notify("نام شما ذخیره شد ✅"); });
  const setRoles = (next: AppRole[], okMsg: string) => run(async () => {
    const d = await send("/api/staff", { userId: user.id, roles: next }, "PATCH");
    const nr: AppRole[] = d.roles ?? next;
    onUser({ ...user, role: d.role ?? user.role, roles: nr });
    notify(okMsg);
  });
  const addLearner = () => setRoles(ALL_ROLES.filter(r => roles.includes(r) || r === "memorizer"), "نقش قرآن‌آموز به حساب شما اضافه شد ✅");
  const removable = roles.filter(r => r !== "admin" && roles.length > 1);
  return <div className="adm-stack profile-page">
    <section className="panel adm-block">
      <h3>{user.display_name}</h3>
      <div className="adm-row">{roles.map(r => <span key={r} className="adm-role-badge">{ROLE_FA[r]}</span>)}</div>
      <label>نام نمایشی من<input value={name} maxLength={60} onChange={e => setName(e.target.value)} /></label>
      <button className="adm-btn" disabled={busy || name.trim().length < 2 || name.trim() === user.display_name} onClick={() => void saveName()}>ذخیره‌ی نام</button>
    </section>
    {view && <section className="panel adm-block">
      <h3>نمایش من</h3>
      <p className="adm-hint">اکنون به‌عنوان «{ROLE_FA[view]}» می‌بینید. این فقط حالت نمایش است؛ دسترسی‌های حساب شما تغییر نمی‌کند.</p>
      {views.length > 1
        ? <div className="adm-roles" role="group" aria-label="تغییر نقش نمایش">{views.map(r => <button key={r} type="button" className={"adm-chip" + (r === view ? " on" : "")} aria-pressed={r === view} onClick={() => setView(r)}>{ROLE_FA[r]}</button>)}</div>
        : <p className="adm-hint">فقط یک نقش دارید؛ برای دیدن بخش دیگر، نقش را اضافه کنید.</p>}
      {views.map(r => r === view && <p key={r} className="adm-hint">{VIEW_HINT[r]}</p>)}
    </section>}
    <section className="panel adm-block">
      <h3>نقش‌های حساب من</h3>
      {!roles.includes("memorizer") && <><p className="adm-hint">برای دیدن برنامه و آزمون‌ها مثل یک قرآن‌آموز، نقش قرآن‌آموز را به خودتان اضافه کنید.</p>
        <button className="adm-btn" disabled={busy} onClick={() => void addLearner()}>افزودن نقش قرآن‌آموز به خودم</button></>}
      {removable.length > 0 && <div className="adm-roles" role="group" aria-label="برداشتن نقش">{removable.map(r =>
        <button key={r} type="button" className="adm-btn danger sm" disabled={busy} onClick={() => { if (window.confirm(`نقش «${ROLE_FA[r]}» از حساب شما برداشته شود؟`)) void setRoles(roles.filter(x => x !== r), `نقش «${ROLE_FA[r]}» برداشته شد ✅`); }}>برداشتن نقش {ROLE_FA[r]}</button>)}</div>}
      {isAdm && <p className="adm-hint">نقش مدیر را نمی‌توان از حساب خودتان برداشت.</p>}
    </section>
    {view === "memorizer" && <section className="panel adm-block" aria-label="ویدئوها">
      <h3>ویدئوها</h3>
      <MyVideos />
    </section>}
    <button className="adm-btn quiet" onClick={onLogout}>خروج از حساب</button>
  </div>;
}
