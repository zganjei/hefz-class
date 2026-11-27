import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { teacherKey, isNoTeacher, displayClassName } from "../lib/teacher-name";
import { normClassName } from "../lib/class-name";
import { navTo } from "../lib/nav";
import { rankPeople } from "../lib/registry-search";

type Kind = "student" | "teacher" | "supporter";
type Person = { id?: string; kind?: Kind; full_name: string; code?: string; class_name?: string; teacher_name?: string; class_day?: string; class_time?: string; level?: string; education?: string; hifz_amount?: string; tadabbur_amount?: string; phone?: string; bale_number?: string; bale_id?: string; email?: string; resume?: string; notes?: string; status?: string; extra?: string | null; sources?: string[]; learners?: number; has_account?: boolean; derived?: boolean; readonly?: boolean };

const KIND_FA: Record<Kind, string> = { student: "قرآن‌آموزان", teacher: "اساتید", supporter: "پشتیبان‌ها" };
const MEMB_LABEL: Record<string, string> = { in_class: "در کلاس ✓", to_add: "آماده‌ی ثبت در کلاس", no_account: "هنوز وارد نشده", no_class: "کلاس نامشخص", removed: "از کلاس برداشته شد" };
const LABELS: Record<string, string> = { full_name: "نام و نام خانوادگی", code: "کد", class_name: "کلاس", teacher_name: "استاد", class_day: "روز کلاس", class_time: "ساعت کلاس", level: "سطح / محدوده", education: "تحصیلات", hifz_amount: "میزان حفظ", tadabbur_amount: "میزان تدبر", phone: "شماره تماس", bale_number: "شماره بله", bale_id: "آیدی بله", email: "ایمیل", resume: "رزومه", notes: "یادداشت", status: "وضعیت" };
const FORM_FIELDS: Record<Kind, string[]> = {
  student: ["full_name", "code", "class_name", "teacher_name", "class_day", "class_time", "level", "education", "hifz_amount", "tadabbur_amount", "phone", "bale_number", "bale_id", "email", "notes"],
  teacher: ["full_name", "phone", "bale_id", "email", "level", "class_name", "class_day", "class_time", "education", "resume", "notes"],
  supporter: ["full_name", "phone", "bale_id", "email", "class_name", "level", "notes"],
};
const TABLE_COLS: Record<Kind, string[]> = {
  student: ["full_name", "code", "class_name", "level", "phone"],
  teacher: ["full_name", "level", "class_name", "phone"],
  supporter: ["full_name", "class_name", "phone"],
};

async function api(body?: unknown) {
  const r = await fetch("/api/registry", { method: body ? "POST" : "GET", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({ error: "پاسخ نامعتبر" }));
  if (!r.ok) throw new Error(d.error || "خطا");
  return d;
}

const norm = (s: unknown) => String(s ?? "").replace(/[‌‏‎]/g, " ").replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/\s+/g, " ").trim();
const SYN: [string, string[]][] = [
  ["bale_number", ["شماره بله"]], ["bale_id", ["آیدی بله", "ایدی بله", "id بله"]], ["code", ["کد قرآن آموز", "کد قرآنآموز", "کد"]],
  ["level", ["محدوده ثبت نام", "سطح"]], ["education", ["تحصیلات"]], ["hifz_amount", ["میزان حفظ"]], ["tadabbur_amount", ["میزان تدبر"]],
  ["phone", ["شماره تماس", "تلفن", "موبایل", "شماره همراه"]], ["email", ["ایمیل", "جیمیل"]], ["class_name", ["کلاس"]], ["teacher_name", ["استاد"]],
  ["class_day", ["روز"]], ["class_time", ["ساعت"]], ["resume", ["رزومه"]], ["notes", ["توضیحات", "یادداشت"]],
];
function mapHeader(h: string): string | null {
  const n = norm(h); if (!n) return null;
  if (n === "نام" || n.startsWith("نام و نام خانوادگی") || n.startsWith("نام ونام") || n === "نام کامل" || n === "نام قرآن آموز") return "full_name";
  for (const [k, syns] of SYN) if (syns.some(s => n === s || n.startsWith(s + " "))) return k;
  return null;
}

/** Reads every sheet that has a header row with a name column; sheet-level class/teacher/day/time are taken from the rows above the header. */
function parseWorkbook(wb: XLSX.WorkBook, fileName = ""): { rows: Person[]; sheets: string[] } {
  const out: Person[] = []; const sheets: string[] = [];
  for (const name of wb.SheetNames) {
    const grid: unknown[][] = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: "", raw: false });
    let hi = -1;
    for (let i = 0; i < Math.min(grid.length, 25); i++) { const hs = grid[i].map(c => mapHeader(String(c))); const set = new Set(hs.filter(Boolean)); if (set.has("full_name") && set.size >= 4 && ["phone", "bale_id", "bale_number", "education", "level"].some(k => set.has(k))) { hi = i; break; } }
    if (hi < 0) continue;
    const cols = grid[hi].map(c => mapHeader(String(c)));
    const raw = grid[hi].map(c => norm(c));
    const meta: Record<string, string> = {};
    for (let i = 0; i < hi; i++) { const row = grid[i]; for (let j = 0; j < row.length; j++) { const lab = norm(row[j]); const key = lab === "استاد" ? "teacher_name" : lab === "روز" ? "class_day" : lab === "ساعت" ? "class_time" : ""; if (key) { let nxt = ""; for (let k = j + 1; k < row.length; k++) { const x = norm(row[k]); if (["استاد", "روز", "ساعت"].includes(x)) break; if (x) { nxt = x; break; } } if (!nxt && i + 1 < hi) { const below = norm(grid[i + 1]?.[j]); if (below && !["استاد", "روز", "ساعت"].includes(below)) nxt = below; } if (nxt) meta[key] = nxt; } } }
    const title = norm(grid[0]?.find(c => norm(c)) ?? "");
    const fromFile = norm(fileName.replace(/\.[a-z0-9]+$/i, "").replace(/[_\-]+/g, " "));
    const cls = /[\u0600-\u06FF]/.test(fromFile) ? fromFile : /کلاس/.test(title) ? title.replace(/^.*?(کلاس)/, "کلاس") : (meta.class_name || name.trim());
    let n = 0;
    for (let i = hi + 1; i < grid.length; i++) {
      const row = grid[i]; const p: any = { class_name: cls, ...meta }; const extra: Record<string, string> = {};
      cols.forEach((k, j) => { const v = norm(row[j]); if (!v) return; if (k) p[k] = v; else if (raw[j] && raw[j] !== "ردیف") extra[raw[j]] = v; });
      for (const k of ["phone", "bale_number"]) if (/^9\d{9}$/.test(p[k] || "")) p[k] = "0" + p[k];
      if (!p.full_name || /^[0-9]+$/.test(p.full_name)) continue;
      if (Object.keys(extra).length) p.extra = extra;
      out.push(p); n++;
    }
    if (n) sheets.push(`${name.trim()} (${n})`);
  }
  // Per-student sheets ("مشخصات قرآن آموز"): label cell followed by its value to the right.
  const LAB: Record<string, string> = { "نام و نام خانوادگی": "full_name", "شماره تماس": "phone", "تحصیلات": "education", "میزان حفظ": "hifz_amount", "میزان تدبر": "tadabbur_amount", "محدوده ثبت نام": "level", "کد قرآن آموز": "code", "ایمیل": "email", "جیمیل": "email", "شماره بله و آیدی": "bale", "آیدی بله": "bale_id", "شماره بله": "bale_number", "تاریخ تولد": "x", "دانشگاه": "x", "محل سکونت": "x", "سال ورود": "x", "شغل": "x", "وضعیت تاهل": "x" };
  const base = out.find(r => r.teacher_name || r.class_day || r.class_time) || out[0];
  const clsAll = base?.class_name || ((/[\u0600-\u06FF]/.test(fileName) ? norm(fileName.replace(/\.[a-z0-9]+$/i, "")) : "") || "");
  const sq = (x: string) => norm(x).replace(/[^\u0600-\u06FF]/g, "");
  for (const name of wb.SheetNames) {
    const grid: unknown[][] = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: "", raw: false });
    if (!/^مشخصات قرآن آموز(?!ان)/.test(norm(grid[0]?.[0]))) continue;
    const p: any = {}; const extra: Record<string, string> = {};
    for (let i = 1; i < Math.min(grid.length, 12); i++) {
      const row = grid[i];
      for (let j = 0; j < row.length; j++) {
        const lab = norm(row[j]); const k = LAB[lab]; if (!k) continue;
        let v = ""; for (let m = j + 1; m < row.length; m++) { const x = norm(row[m]); if (LAB[x]) break; if (x) { v = x; break; } }
        if (!v) continue;
        if (k === "x") extra[lab] = v;
        else if (k === "bale") { if (/[a-zA-Z@_]/.test(v)) p.bale_id = v; else p.bale_number = v; }
        else p[k] = v;
      }
    }
    if (!p.full_name) continue;
    for (const k of ["phone", "bale_number"]) if (/^9\d{9}$/.test(p[k] || "")) p[k] = "0" + p[k];
    const tail = (x?: string) => (x || "").replace(/\D/g, "").slice(-8);
    const hit = out.find(r => sq(r.full_name) === sq(p.full_name)) || out.find(r => tail(p.phone).length === 8 && tail(r.phone) === tail(p.phone));
    if (hit) { for (const [k, v] of Object.entries(p)) if (!(hit as any)[k]) (hit as any)[k] = v; (hit as any).extra = { ...((hit as any).extra || {}), ...extra }; }
    else out.push({ class_name: clsAll, ...(base ? { teacher_name: base.teacher_name, class_day: base.class_day, class_time: base.class_time } : {}), ...p, ...(Object.keys(extra).length ? { extra } : {}) });
    sheets.push(`پرونده‌ی ${p.full_name}`);
  }
  return { rows: out, sheets };
}

const srcLabel = (r: Person) => (r.sources || []).map(x => x === "account" ? "حساب کاربری" : x === "registry" ? "ثبت‌شده در دفتر" : "از فهرست قرآن‌آموزان").join(" + ");
const accLabel = (r: Person) => r.has_account ? "وارد شده ✓" : "هنوز وارد نشده";
function toCsv(rows: Person[], cols: string[], withSource = false) {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return "﻿" + [cols.map(c => esc(LABELS[c])).concat(withSource ? [esc("منبع"), esc("وضعیت ورود"), esc("تعداد قرآن‌آموز")] : []).join(","), ...rows.map(r => cols.map(c => esc((r as any)[c])).concat(withSource ? [esc(srcLabel(r)), esc(accLabel(r)), esc(r.learners || 0)] : []).join(","))].join("\n");
}
function download(name: string, text: string) { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" })); a.download = name; a.click(); URL.revokeObjectURL(a.href); }
const countBy = (rows: Person[], f: (p: Person) => string) => { const m: Record<string, number> = {}; rows.forEach(r => { const k = f(r) || "نامشخص"; m[k] = (m[k] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); };

export function Registry() {
  const [all, setAll] = useState<Person[]>([]);
  type RTab = "student" | "teacher" | "supporter" | "stats" | "import";
  const [tab, setTabRaw] = useState<RTab>("student");
  const setTab = (t: RTab) => { setTabRaw(t); try { localStorage.setItem("reg-tab", t); } catch { /* ignore */ } };
  useEffect(() => { try { const t = localStorage.getItem("reg-tab"); if (t && ["student", "teacher", "supporter", "stats", "import"].includes(t)) setTabRaw(t as RTab); } catch { /* ignore */ } }, []);
  const [q, setQ] = useState(""); const [cls, setCls] = useState("");
  const [siteClasses, setSiteClasses] = useState<any[]>([]);
  useEffect(() => { fetch("/api/classes").then(r => r.ok ? r.json() : null).then(d => setSiteClasses(d?.classes || [])).catch(() => {}); }, []);
  // Class name -> class id (exact normalized name), used to make the class column a link into «کلاس‌ها».
  const classIdByName = useMemo(() => { const m = new Map<string, string>(); for (const c of siteClasses) m.set(normClassName(c.name), c.id); return m; }, [siteClasses]);
  const [edit, setEdit] = useState<Person | null>(null);
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const [imp, setImp] = useState<{ rows: Person[]; sheets: string[]; file: string } | null>(null);
  const [impKind, setImpKind] = useState<Kind>("student");
  const [memb, setMemb] = useState<Record<string, string>>({});
  const [noTeacher, setNoTeacher] = useState(0);
  const loadMemb = () => fetch("/api/registry-members").then(r => r.ok ? r.json() : null).then(d => { if (d?.status) setMemb(d.status); }).catch(() => {});
  const load = () => { void loadMemb(); return api().then(d => { setAll(d.people || []); setNoTeacher(d.noTeacher || 0); }).catch(e => setMsg(e.message)); };
  useEffect(() => { void load(); }, []);
  const run = async (fn: () => Promise<void>) => { setBusy(true); setMsg(""); try { await fn(); } catch (e: any) { setMsg(e.message || "خطا"); } finally { setBusy(false); } };
  const kind = (tab === "student" || tab === "teacher" || tab === "supporter") ? tab : null;
  const list = useMemo(() => all.filter(p => p.kind === kind && (!cls || (p.class_name || "").split("،").map(x => x.trim()).includes(cls)) ), [all, kind, cls]);
  const ranked = useMemo(() => rankPeople(list, q), [list, q]);
  const [showAllOther, setShowAllOther] = useState(false); const [otherOpen, setOtherOpen] = useState(false);
  useEffect(() => { setShowAllOther(false); setOtherOpen(false); }, [q, kind, cls]);
  const shown = ranked.main, otherRows = ranked.other, hasQ = !!q.trim();
  const otherVisible = hasQ && otherRows.length > 0 && (shown.length === 0 || otherOpen);
  const classes = useMemo(() => Array.from(new Set(all.filter(p => p.kind === kind).flatMap(p => (p.class_name || "").split("،").map(x => x.trim())).filter(Boolean))), [all, kind]);
  const students = all.filter(p => p.kind === "student"), active = students.filter(p => p.status !== "inactive");

  const onFile = async (f: File | undefined) => {
    if (!f) return; setMsg("");
    try { const wb = XLSX.read(await f.arrayBuffer(), { type: "array" }); const r = parseWorkbook(wb, f.name); setImp({ ...r, file: f.name }); if (!r.rows.length) setMsg("در این فایل ردیف قابل‌شناسایی پیدا نشد. ستون «نام و نام خانوادگی» لازم است."); }
    catch { setMsg("خواندن فایل ممکن نشد."); }
  };

  const renderRow = (p: Person, kind: Kind, reasons?: string[]) => <tr key={p.id || p.full_name} onClick={() => p.readonly ? setMsg(p.derived ? "این نام از فهرست قرآن‌آموزان آمده است؛ برای ثبت اطلاعات «افزودن» بزنید." : "این استاد از «حساب‌ها» آمده است؛ برای ویرایش به تب «حساب‌ها» بروید.") : setEdit(p)}>{TABLE_COLS[kind].map((c, i) => <td key={c} className={c === "class_name" ? "reg-cls" : undefined} dir={c === "phone" || c === "code" ? "ltr" : undefined}>{i === 0 ? <><b>{p.full_name}{p.status === "inactive" ? " (غیرفعال)" : ""}</b>{reasons && reasons.map(r => <small key={r} className="reg-why">{r}</small>)}{kind === "teacher" && <><small className={"memb-badge " + (p.has_account ? "in_class" : "")}>{accLabel(p)}</small><small className="memb-badge">{srcLabel(p)}{p.learners ? ` · ${p.learners} قرآن‌آموز` : ""}</small></>}{kind === "student" && p.id && MEMB_LABEL[memb[p.id]] && <small className={"memb-badge " + memb[p.id]}>{MEMB_LABEL[memb[p.id]]}</small>}</> : c === "class_name" ? (p.class_name ? p.class_name.split("،").map(x => x.trim()).filter(Boolean).map((n, j) => { const id = classIdByName.get(normClassName(n)); return <span key={j}>{j > 0 && "، "}{id ? <a href={"#classes/" + id + "/info"} className="reg-link" onClick={e => { e.preventDefault(); e.stopPropagation(); navTo(["classes", id, "info"], "push"); }}>{displayClassName(n)}</a> : displayClassName(n)}</span>; }) : "—") : (p as any)[c] || "—"}</td>)}</tr>;

  return <section className="panel registry">
    <h2>دفتر آموزش</h2>
    <div className="m-seg steps">{([["student", "قرآن‌آموزان"], ["teacher", "اساتید"], ["supporter", "پشتیبان‌ها"], ["stats", "آمار"], ["import", "اکسل"]] as const).map(([k, l]) => <button key={k} type="button" className={tab === k ? "on" : ""} onClick={() => { setTab(k); setEdit(null); setMsg(""); }}>{l}</button>)}</div>
    {msg && <p className={msg.includes("✅") ? "hint" : "error-msg"}>{msg}</p>}

    {kind && !edit && <>
      <div className="reg-tools">
        <input placeholder="جستجو…" value={q} onChange={e => setQ(e.target.value)} />
        {classes.length > 1 && <select value={cls} onChange={e => setCls(e.target.value)}><option value="">همه‌ی کلاس‌ها</option>{classes.map(c => <option key={c} value={c}>{displayClassName(c)}</option>)}</select>}
      </div>
      <div className="reg-tools"><button type="button" onClick={() => setEdit({ full_name: "", kind })}>+ افزودن</button><button type="button" className="ghost-wide" disabled={!shown.length} onClick={() => download(`${kind}.csv`, toCsv(shown, FORM_FIELDS[kind], kind === "teacher"))}>خروجی اکسل</button></div>
      {!shown.length && !otherRows.length && <p className="empty-state">موردی ثبت نشده است. از «اکسل» وارد کنید یا «افزودن» بزنید.</p>}
      {shown.length > 0 && <div className="reg-table-wrap"><table className="reg-table"><thead><tr>{TABLE_COLS[kind].map(c => <th key={c}>{LABELS[c]}</th>)}</tr></thead><tbody>{shown.map(p => renderRow(p, kind))}</tbody></table></div>}
      {hasQ && otherRows.length > 0 && <div className="reg-other">
        <button type="button" className="reg-other-hd" aria-expanded={otherVisible} onClick={() => setOtherOpen(o => !o)}><span>مطابقت از طریق استاد یا کلاس</span><small>{otherRows.length} مورد {shown.length > 0 ? (otherVisible ? "▴" : "▾") : ""}</small></button>
        {otherVisible && <div className="reg-table-wrap"><table className="reg-table"><thead><tr>{TABLE_COLS[kind].map(c => <th key={c}>{LABELS[c]}</th>)}</tr></thead><tbody>{(showAllOther ? otherRows : otherRows.slice(0, 5)).map(o => renderRow(o.p, kind, o.reasons))}</tbody></table></div>}
        {otherVisible && !showAllOther && otherRows.length > 5 && <button type="button" className="reg-other-more" onClick={() => setShowAllOther(true)}>نمایش همه ({otherRows.length})</button>}
      </div>}
      <small className="reg-count">{shown.length}{otherRows.length && hasQ ? ` + ${otherRows.length}` : ""} مورد</small>
      {kind === "teacher" && noTeacher > 0 && <small className="reg-count" style={{ opacity: .6 }}>بدون استاد: {noTeacher} قرآن‌آموز</small>}
    </>}

    {kind && edit && <form className="report-form" onSubmit={e => { e.preventDefault(); void run(async () => { await api({ action: "save", kind, person: edit }); setEdit(null); await load(); }); }}>
      <h3>{edit.id ? "ویرایش" : "افزودن"} — {KIND_FA[kind]}</h3>
      {FORM_FIELDS[kind].map(f => <label key={f}>{LABELS[f]}{f === "resume" || f === "notes" ? <textarea value={(edit as any)[f] || ""} onChange={e => setEdit({ ...edit, [f]: e.target.value })} /> : <input value={(edit as any)[f] || ""} required={f === "full_name"} onChange={e => setEdit({ ...edit, [f]: e.target.value })} />}</label>)}
      <label>وضعیت<select value={edit.status || "active"} onChange={e => setEdit({ ...edit, status: e.target.value })}><option value="active">فعال</option><option value="inactive">غیرفعال</option></select></label>
      {edit.extra && <details><summary>اطلاعات دیگر از اکسل</summary><pre className="reg-extra">{Object.entries(JSON.parse(edit.extra)).map(([k, v]) => `${k}: ${v}`).join("\n")}</pre></details>}
      <div className="reg-tools"><button disabled={busy}>ذخیره</button><button type="button" className="ghost-wide" onClick={() => setEdit(null)}>بازگشت</button>{edit.id && <button type="button" className="ghost-wide" onClick={() => { if (confirm("حذف شود؟")) void run(async () => { await api({ action: "delete", id: edit.id }); setEdit(null); await load(); }); }}>حذف</button>}</div>
    </form>}

    {tab === "stats" && <div className="reg-stats">
      <div className="desk-summary"><b>قرآن‌آموزان فعال: {active.length} از {students.length}</b><small>اساتید: {all.filter(p => p.kind === "teacher").length} · پشتیبان‌ها: {all.filter(p => p.kind === "supporter").length}</small></div>
      {([["به تفکیک سطح", (p: Person) => p.level || ""], ["به تفکیک کلاس", (p: Person) => p.class_name || ""], ["به تفکیک استاد", (p: Person) => isNoTeacher(p.teacher_name) ? "" : teacherKey(p.teacher_name)], ["به تفکیک تحصیلات", (p: Person) => p.education || ""]] as const).map(([t, f]) => <div className="desk-summary" key={t}><b>{t}</b>{countBy(active, f).map(([k, n]) => <div className="desk-row" key={k}><span>{k}</span><small>{n} نفر</small><i style={{ display: "block", height: 6, borderRadius: 3, background: "var(--bg-dce7da, #dce7da)", overflow: "hidden" }}><u style={{ display: "block", height: "100%", width: Math.round(100 * n / Math.max(1, active.length)) + "%", background: "var(--progress-fill)" }} /></i></div>)}</div>)}
      <button type="button" disabled={!students.length} onClick={() => download("amar-quran-amuzan.csv", toCsv(active, FORM_FIELDS.student))}>خروجی اکسل قرآن‌آموزان فعال</button>
    </div>}

    {tab === "import" && <div className="report-form">
      <p className="hint">فایل اکسل کلاس را انتخاب کنید. برگه‌هایی که ستون «نام و نام خانوادگی» دارند خوانده می‌شوند؛ نام کلاس، استاد، روز و ساعت از بالای برگه گرفته می‌شود. ورود تکراری، ردیف قبلی (با کد یا نام) را به‌روز می‌کند.</p>
      <label>نوع اطلاعات<select value={impKind} onChange={e => setImpKind(e.target.value as Kind)}><option value="student">قرآن‌آموزان</option><option value="teacher">اساتید</option><option value="supporter">پشتیبان‌ها</option></select></label>
      <label>فایل اکسل (xlsx)<input type="file" accept=".xlsx,.xls,.csv" onChange={e => void onFile(e.target.files?.[0])} /></label>
      {imp && imp.rows.length > 0 && <div className="invite-result"><b>{imp.rows.length} ردیف پیدا شد</b><span>{imp.sheets.join("، ")}</span><button type="button" disabled={busy} onClick={() => void run(async () => { const r = await api({ action: "import", kind: impKind, rows: imp.rows }); setMsg(`ثبت شد ✅ جدید: ${r.added} · به‌روز: ${r.updated} · ردشده: ${r.skipped}`); setImp(null); await load(); })}>ثبت در دفتر</button></div>}
    </div>}
  </section>;
}
