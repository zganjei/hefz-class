import { useEffect, useState } from "react";
import { Notice } from "./notice";

async function call(method: string, path: string, body?: unknown) {
  const r = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({ error: "پاسخ نامعتبر بود." }));
  if (!r.ok) throw new Error(d.error || "خطا");
  return d;
}

type Cls = { id: string; name: string };
type Teacher = { id: string; display_name: string };
type Current = { id: string; display_name: string; is_primary: number };

/** Admin only: add a teacher to a class (co-teacher) and list/remove co-teachers. Uses /api/class-teachers and /api/staff. */
export function ClassTeachers({ refreshKey = 0 }: { refreshKey?: number }) {
  const [classes, setClasses] = useState<Cls[]>([]), [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classId, setClassId] = useState(""), [teacherId, setTeacherId] = useState("");
  const [current, setCurrent] = useState<Current[]>([]), [busy, setBusy] = useState(false), [msg, setMsg] = useState("");
  const run = async (fn: () => Promise<void>) => { setBusy(true); setMsg(""); try { await fn(); } catch (e: any) { setMsg(e.message); } finally { setBusy(false); } };
  const loadCurrent = async (id: string) => { if (!id) { setCurrent([]); return; } const d = await call("GET", "/api/class-teachers?classId=" + encodeURIComponent(id)); setCurrent(d.teachers || []); };
  useEffect(() => { void run(async () => { const [c, t] = await Promise.all([call("GET", "/api/classes"), call("GET", "/api/staff")]); setClasses(c.classes || []); setTeachers(t.teachers || []); if (classId && !(c.classes || []).some((x: Cls) => x.id === classId)) setClassId(""); }); }, [refreshKey]);   // refreshKey: classes created/deleted elsewhere
  useEffect(() => { void run(() => loadCurrent(classId)); }, [classId]);
  return <section className="panel">
    <h2>اساتید کلاس</h2>
    <div className="report-form">
      <label>کلاس<select value={classId} onChange={e => setClassId(e.target.value)}><option value="">انتخاب کلاس</option>{classes.map(c => <option value={c.id} key={c.id}>{c.name}</option>)}</select></label>
      {classId && <>
        <h3>اساتید فعلی</h3>
        {current.map(t => <div className="simple-row" key={t.id}><b>{t.display_name}</b>{t.is_primary ? <span>استاد اصلی</span> : <button className="secondary-action" disabled={busy} onClick={() => void run(async () => { await call("DELETE", "/api/class-teachers", { classId, userId: t.id }); await loadCurrent(classId); setMsg("استاد از کلاس حذف شد ✅"); })}>حذف</button>}</div>)}
        {!current.length && <p className="empty-state">استادی ثبت نشده است.</p>}
      </>}
      <label>استاد<select value={teacherId} onChange={e => setTeacherId(e.target.value)}><option value="">انتخاب استاد</option>{teachers.map(t => <option value={t.id} key={t.id}>{t.display_name}</option>)}</select></label>
      <button className="primary-wide" disabled={busy || !classId || !teacherId} onClick={() => void run(async () => { await call("POST", "/api/class-teachers", { classId, userId: teacherId }); await loadCurrent(classId); setTeacherId(""); setMsg("استاد به کلاس اضافه شد ✅"); })}>افزودن استاد به کلاس</button>
    </div>
    <Notice msg={msg} />
  </section>;
}
