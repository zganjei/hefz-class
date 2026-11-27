import { useEffect, useRef, useState } from "react";
import { navTo } from "../lib/nav";
import { displayClassName, displayTeacherName } from "../lib/teacher-name";

const fa = (n: number | string) => String(n).replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
type Res = { classes: any[]; learners: any[]; teachers: any[]; viaLearners?: any[] };
const lsText = (level?: string, step?: string) => [level, step].filter(Boolean).join(" · ");

/** Admin only: full-screen search across all classes, learners and teachers. Picking a result calls onOpen and closes. */
export function AdminSearch({ onClose }: { onClose: () => void }) {
  const [raw, setRaw] = useState(""), [q, setQ] = useState(""), [res, setRes] = useState<Res | null>(null), [err, setErr] = useState(""), [busy, setBusy] = useState(false), [tOpen, setTOpen] = useState(""), [viaAll, setViaAll] = useState(false), [viaOpen, setViaOpen] = useState(false);
  const inp = useRef<HTMLInputElement | null>(null), seq = useRef(0);
  // The overlay owns one history entry: browser Back closes it and returns to the view she was on.
  const closed = useRef(false);
  const close = () => { if (closed.current) return; closed.current = true; if ((window.history.state || {}).hefzSearch) window.history.back(); else onClose(); };
  useEffect(() => {
    inp.current?.focus();
    try { window.history.pushState({ hefzSearch: true }, "", window.location.href); } catch { /* ignore */ }
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    const pop = () => { if (!(window.history.state || {}).hefzSearch) { closed.current = true; onClose(); } };
    window.addEventListener("keydown", k); window.addEventListener("popstate", pop);
    return () => { window.removeEventListener("keydown", k); window.removeEventListener("popstate", pop); };
  }, []);
  useEffect(() => { const t = setTimeout(() => setQ(raw.trim()), 200); return () => clearTimeout(t); }, [raw]);
  useEffect(() => {
    if (!q) { setRes(null); setErr(""); return; }
    setViaAll(false); setViaOpen(false); const my = ++seq.current; setBusy(true);
    fetch("/api/search?q=" + encodeURIComponent(q)).then(async r => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || "خطا"); return d; })
      .then(d => { if (my === seq.current) { setRes(d); setErr(""); } }).catch(e => { if (my === seq.current) setErr(e.message); }).finally(() => { if (my === seq.current) setBusy(false); });
  }, [q]);
  // Replace the overlay's own history entry with the target view, so Back from the class returns to where she was before searching.
  const go = (id: string, sub: "info" | "people", focus?: string) => { closed.current = true; try { window.history.replaceState({}, "", window.location.href); } catch { /* ignore */ } navTo(focus ? ["classes", id, sub, focus] : ["classes", id, sub], "replace"); onClose(); };
  const none = !!res && !res.classes.length && !res.learners.length && !res.teachers.length && !res.viaLearners?.length;
  return <div className="adm-search-ov" role="dialog" aria-modal="true" aria-label="جستجو">
    <div className="adm-search-bar">
      <div className="adm-search">
        <input ref={inp} type="search" value={raw} onChange={e => setRaw(e.target.value)} placeholder="جستجوی کلاس، قرآن‌آموز یا استاد…" aria-label="جستجو" enterKeyHint="search" />
        {raw && <button type="button" className="adm-search-x" aria-label="پاک کردن جستجو" onClick={() => { setRaw(""); setQ(""); inp.current?.focus(); }}>✕</button>}
      </div>
      <button type="button" className="adm-btn quiet" onClick={close}>بستن</button>
    </div>
    <div className="adm-search-body">
      {!q && <p className="adm-hint">نام کلاس، قرآن‌آموز یا استاد را بنویسید.</p>}
      {err && <p className="error-msg">{err}</p>}
      {q && busy && !res && <p className="empty-state">در حال جستجو…</p>}
      {q && none && !busy && <p className="empty-state">نتیجه‌ای پیدا نشد</p>}
      {!!res?.classes.length && <section className="adm-block"><h3>کلاس‌ها</h3>
        {res.classes.map(c => <button type="button" key={c.id} className="adm-hit" onClick={() => go(c.id, "info")}><b>{displayClassName(c.name)}</b><small>{[lsText(c.level, c.step), c.teachers.length ? "استاد: " + c.teachers.map(displayTeacherName).join("، ") : "", fa(c.learners) + " قرآن‌آموز فعال"].filter(Boolean).join(" · ")}</small></button>)}</section>}
      {!!res?.learners.length && <section className="adm-block"><h3>قرآن‌آموزان</h3>
        {res.learners.map((l, i) => <button type="button" key={i} className="adm-hit" onClick={() => go(l.classId, "people", l.name)}><b>{l.name}</b><small>{["کلاس: " + displayClassName(l.className), l.teachers.length ? "استاد: " + l.teachers.map(displayTeacherName).join("، ") : ""].filter(Boolean).join(" · ")}</small></button>)}</section>}
      {!!res?.viaLearners?.length && (() => { const v = res.viaLearners!, open = !res.learners.length || viaOpen; return <section className="adm-block adm-via"><button type="button" className="adm-via-hd" aria-expanded={open} onClick={() => setViaOpen(o => !o)}><span>مطابقت از طریق استاد یا کلاس</span><small>{fa(v.length)} مورد {res.learners.length ? (open ? "▴" : "▾") : ""}</small></button>
        {open && (viaAll ? v : v.slice(0, 5)).map((l, i) => <button type="button" key={i} className="adm-hit" onClick={() => go(l.classId, "people", l.name)}><b>{l.name}</b><small>{"کلاس: " + displayClassName(l.className)}</small><span className="adm-why">{l.why.map((w: string) => w.startsWith("استاد: ") ? "استاد: " + displayTeacherName(w.slice(7)) : w).join(" · ")}</span></button>)}
        {open && !viaAll && v.length > 5 && <button type="button" className="adm-btn quiet" onClick={() => setViaAll(true)}>نمایش همه ({fa(v.length)})</button>}</section>; })()}
      {!!res?.teachers.length && <section className="adm-block"><h3>اساتید</h3>
        {res.teachers.map(t => <div key={t.name}><button type="button" className="adm-hit" aria-expanded={tOpen === t.name} onClick={() => setTOpen(tOpen === t.name ? "" : t.name)}><b>{displayTeacherName(t.name)}</b><small>{fa(t.classes.length)} کلاس · {fa(t.learners)} قرآن‌آموز</small></button>
          {tOpen === t.name && <div className="adm-sub">{t.classes.map((c: any) => <button type="button" key={c.id} className="adm-hit" onClick={() => go(c.id, "info")}><b>{displayClassName(c.name)}</b></button>)}{!t.classes.length && <p className="adm-hint">کلاسی ندارد.</p>}</div>}</div>)}</section>}
    </div>
  </div>;
}
