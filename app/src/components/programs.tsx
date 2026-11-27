import { useCallback, useEffect, useState } from "react";
import { Notice } from "./notice";
import * as XLSX from "xlsx";
import { parseProgramRows, suggestProgramName, type ParseResult } from "../lib/program-parse";

type Program = { id: string; name: string; weeks: number };
type Cls = { id: string; name: string; program_id: string | null; program_start: string | null; start_label: string | null; member_count: number };
const fa = (n: number | string) => String(n).replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[+d]);
async function call(method: "GET" | "POST", body?: unknown) {
  const r = await fetch("/api/programs", { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({ error: "پاسخ نامعتبر بود." }));
  if (!r.ok) throw Object.assign(new Error(d.error || "خطا"), { code: d.code, status: r.status });
  return d;
}

/** Admin tools: create study programs (Excel or pasted rows) and give each class exactly one. */
export function Programs({ refreshKey = 0 }: { refreshKey?: number }) {
  const [programs, setPrograms] = useState<Program[]>([]), [classes, setClasses] = useState<Cls[]>([]), [defaultStart, setDefaultStart] = useState("");
  const [name, setName] = useState(""), [pasted, setPasted] = useState(""), [prev, setPrev] = useState<ParseResult | null>(null);
  const [pick, setPick] = useState<Record<string, { program: string; start: string }>>({}), [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState(""), [ok, setOk] = useState("");
  const load = useCallback(async () => { try { const d = await call("GET"); setPrograms(d.programs); setClasses(d.classes); setDefaultStart(d.defaultStart); } catch (e: any) { setMsg(e.message); } }, []);
  useEffect(() => { void load(); }, [load, refreshKey]);   // refreshKey: classes were created/deleted elsewhere
  const run = async (fn: () => Promise<void>) => { setBusy(true); setMsg(""); setOk(""); try { await fn(); } catch (e: any) { setMsg(e.message); } finally { setBusy(false); } };

  const onFile = (f?: File) => void run(async () => {
    setPrev(null); if (!f) return;
    const wb = XLSX.read(await f.arrayBuffer(), { type: "array" });
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], { header: 1 });
    const r = parseProgramRows(rows); if (!r.weeks.length) throw new Error("در این فایل هفته‌ای پیدا نشد. ستون‌ها باید «روز، تاریخ، حفظ جدید، مرور ده درس، سبد کل» باشند.");
    setPrev(r); if (!name) { const base = f.name.replace(/\.[^.]+$/, ""); setName(suggestProgramName(rows) || (/^[\d_\s-]+$/.test(base) ? "" : base)); }
  });
  const onPaste = () => run(async () => {
    const r = parseProgramRows(pasted.split(/\r?\n/).map(l => l.split("\t")));
    if (!r.weeks.length) throw new Error("متن چسبانده‌شده هفته‌ای نداشت. از اکسل، ردیف‌های «شنبه تا جمعه» را با همهٔ ستون‌ها کپی کنید.");
    setPrev(r);
  });
  const save = () => run(async () => {
    if (!prev) return; const r = await call("POST", { action: "create", name, weeks: prev.weeks });
    setOk(`برنامهٔ «${r.name}» با ${fa(r.weeks)} هفته ذخیره شد ✅`); setPrev(null); setName(""); setPasted(""); await load();
  });
  const assign = (c: Cls) => run(async () => {
    const p = pick[c.id] ?? { program: c.program_id || "", start: "" };
    let r: any;
    try { r = await call("POST", { action: "assign", classId: c.id, programId: p.program, startDate: p.start || undefined }); }
    catch (e: any) { if (e.status === 404) await load(); throw e; }   // stale list (class deleted elsewhere): refresh it, then show the message
    setOk(r.programId ? `«${r.programName}» برای کلاس «${r.className}» ثبت شد؛ هفتهٔ اول از ${r.startLabel} شروع می‌شود ✅` : `کلاس «${c.name}» دوباره روی برنامهٔ عمومی است ✅`);
    setPick(x => { const { [c.id]: _, ...rest } = x; return rest; }); await load();
  });
  const [blocked, setBlocked] = useState<string | null>(null);
  const detach = (id: string) => run(async () => { await call("POST", { action: "detach", id }); setBlocked(null); setOk("برنامه از کلاس‌ها جدا شد ✅ حالا می‌توانید حذفش کنید."); await load(); });
  const del = (id: string) => run(async () => { setBlocked(null); try { await call("POST", { action: "delete", id }); } catch (e: any) { if (e.code === "in_use") setBlocked(id); throw e; } setConfirmDel(null); setOk("برنامه حذف شد ✅"); await load(); });
  const first = prev?.weeks[0], last = prev?.weeks[prev.weeks.length - 1];

  return <section className="panel programs-panel">
    <h2>برنامه‌های مطالعه</h2>
    <p className="hint">هر برنامه یک‌بار تعریف می‌شود و هر کلاس فقط یک برنامه دارد؛ قرآن‌آموزان برنامهٔ روزانه را و استاد جایگاه فعلی کلاس را می‌بیند. کلاسی که برنامه ندارد از برنامهٔ عمومی پیروی می‌کند.</p>
    <Notice msg={msg || ok} />

    <div className="report-form">
      <h3>برنامهٔ جدید</h3>
      <label>نام برنامه<input value={name} onChange={e => setName(e.target.value)} placeholder="مثلاً حفظ آفلاین ۱۴۰۵" /></label>
      <label>فایل اکسل برنامه (xlsx)<input type="file" accept=".xlsx,.xls,.csv" onChange={e => onFile(e.target.files?.[0])} /></label>
      <label>یا ردیف‌ها را از اکسل کپی و اینجا بچسبانید<textarea dir="rtl" value={pasted} onChange={e => setPasted(e.target.value)} placeholder="روز	تاریخ	حفظ جدید	مرور ده درس	سبد کل" /></label>
      <button type="button" className="ghost-wide" disabled={busy || !pasted.trim()} onClick={() => void onPaste()}>بررسی متن چسبانده‌شده</button>
      {prev && first && last && <div className="invite-result">
        <b>{fa(prev.weeks.length)} هفته پیدا شد</b>
        <span>هفتهٔ ۱: {first.title}</span><span>هفتهٔ {fa(prev.weeks.length)}: {last.title}</span>
        <span>نمونه، روز اول: {first.days[0].new ?? "—"}</span>
        {prev.warnings.slice(0, 5).map((w, i) => <small key={i} className="error-msg">{w}</small>)}
        {prev.warnings.length > 5 && <small>و {fa(prev.warnings.length - 5)} هشدار دیگر</small>}
        <button type="button" disabled={busy || !name.trim()} onClick={() => void save()}>ذخیرهٔ برنامه</button>
        {!name.trim() && <small>برای ذخیره، نام برنامه را بنویسید.</small>}
      </div>}
    </div>

    <h3>برنامه‌های ثبت‌شده</h3>
    {!programs.length && <p className="empty-state">هنوز برنامه‌ای ثبت نشده است.</p>}
    {programs.map(p => <div className="simple-row" key={p.id}>
      <b>{p.name}</b> <small>{p.weeks ? `${fa(p.weeks)} هفته` : "خالی، حذف و دوباره بسازید"}</small>{" "}
      {confirmDel === p.id
        ? <><button type="button" className="ghost-wide" disabled={busy} onClick={() => void del(p.id)}>بله، حذف شود</button> <button type="button" className="ghost-wide" onClick={() => setConfirmDel(null)}>انصراف</button></>
        : <button type="button" className="ghost-wide" onClick={() => setConfirmDel(p.id)}>حذف</button>}
      {blocked === p.id && <button type="button" className="ghost-wide" disabled={busy} onClick={() => void detach(p.id)}>جدا کردن از کلاس‌ها</button>}
    </div>)}

    <h3>برنامهٔ هر کلاس</h3>
    {!classes.length && <p className="empty-state">کلاسی وجود ندارد.</p>}
    {classes.map(c => { const p = pick[c.id] ?? { program: c.program_id || "", start: "" }; const changed = p.program !== (c.program_id || "") || !!p.start; return <div className="report-form" key={c.id}>
      <b>{c.name}</b> <small>{fa(c.member_count)} عضو · {c.program_id ? `شروع هفتهٔ اول: ${c.start_label}` : "برنامهٔ عمومی"}</small>
      <label>برنامه<select value={p.program} onChange={e => setPick(x => ({ ...x, [c.id]: { ...p, program: e.target.value } }))}><option value="">برنامهٔ عمومی (بدون برنامهٔ جدا)</option>{programs.filter(x => x.weeks > 0).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      {p.program && <label>شروع هفتهٔ اول (به نزدیک‌ترین شنبهٔ قبل می‌رود)<input type="date" dir="ltr" value={p.start || ""} min="2020-01-01" placeholder={defaultStart} onChange={e => setPick(x => ({ ...x, [c.id]: { ...p, start: e.target.value } }))} /></label>}
      <button type="button" disabled={busy || !changed} onClick={() => void assign(c)}>ثبت برنامهٔ کلاس</button>
    </div>; })}
  </section>;
}
