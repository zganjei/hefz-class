import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

type Kind = "student" | "teacher" | "supporter";
type Person = { id?: string; kind?: Kind; full_name: string; code?: string; class_name?: string; teacher_name?: string; class_day?: string; class_time?: string; level?: string; education?: string; hifz_amount?: string; tadabbur_amount?: string; phone?: string; bale_number?: string; bale_id?: string; email?: string; resume?: string; notes?: string; status?: string; extra?: string | null };

const KIND_FA: Record<Kind, string> = { student: "قرآن‌آموزان", teacher: "اساتید", supporter: "پشتیبان‌ها" };
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
function parseWorkbook(wb: XLSX.WorkBook): { rows: Person[]; sheets: string[] } {
  const out: Person[] = []; const sheets: string[] = [];
  for (const name of wb.SheetNames) {
    const grid: unknown[][] = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: "", raw: false });
    let hi = -1;
    for (let i = 0; i < Math.min(grid.length, 25); i++) { const hs = grid[i].map(c => mapHeader(String(c))); const set = new Set(hs.filter(Boolean)); if (set.has("full_name") && set.size >= 4 && ["phone", "bale_id", "bale_number", "education", "level"].some(k => set.has(k))) { hi = i; break; } }
    if (hi < 0) continue;
    const cols = grid[hi].map(c => mapHeader(String(c)));
    const raw = grid[hi].map(c => norm(c));
    const meta: Record<string, string> = {};
    for (let i = 0; i < hi; i++) { const row = grid[i]; for (let j = 0; j < row.length; j++) { const lab = norm(row[j]); const key = lab === "استاد" ? "teacher_name" : lab === "روز" ? "class_day" : lab === "ساعت" ? "class_time" : ""; if (key) { let nxt = ""; for (let k = j + 1; k < row.length; k++) { const x = norm(row[k]); if (["استاد", "روز", "ساعت"].includes(x)) break; if (x) { nxt = x; break; } } if (nxt) meta[key] = nxt; } } }
    const title = norm(grid[0]?.find(c => norm(c)) ?? "");
    const cls = /کلاس/.test(title) ? title.replace(/^.*?(کلاس)/, "کلاس") : (meta.class_name || name.trim());
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
  return { rows: out, sheets };
}

function toCsv(rows: Person[], cols: string[]) {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return "﻿" + [cols.map(c => esc(LABELS[c])).join(","), ...rows.map(r => cols.map(c => esc((r as any)[c])).join(","))].join("\n");
}
function download(name: string, text: string) { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" })); a.download = name; a.click(); URL.revokeObjectURL(a.href); }
const countBy = (rows: Person[], f: (p: Person) => string) => { const m: Record<string, number> = {}; rows.forEach(r => { const k = f(r) || "نامشخص"; m[k] = (m[k] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); };

export function Registry() {
  const [all, setAll] = useState<Person[]>([]);
  const [tab, setTab] = useState<"student" | "teacher" | "supporter" | "stats" | "import">("student");
  const [q, setQ] = useState(""); const [cls, setCls] = useState("");
  const [edit, setEdit] = useState<Person | null>(null);
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const [imp, setImp] = useState<{ rows: Person[]; sheets: string[]; file: string } | null>(null);
  const [impKind, setImpKind] = useState<Kind>("student");
  const load = () => api().then(d => setAll(d.people || [])).catch(e => setMsg(e.message));
  useEffect(() => { void load(); }, []);
  const run = async (fn: () => Promise<void>) => { setBusy(true); setMsg(""); try { await fn(); } catch (e: any) { setMsg(e.message || "خطا"); } finally { setBusy(false); } };
  const kind = (tab === "student" || tab === "teacher" || tab === "supporter") ? tab : null;
  const list = useMemo(() => all.filter(p => p.kind === kind && (!cls || p.class_name === cls) && (!q || Object.values(p).some(v => typeof v === "string" && v.includes(q)))), [all, kind, cls, q]);
  const classes = useMemo(() => Array.from(new Set(all.filter(p => p.kind === kind).map(p => p.class_name || "").filter(Boolean))), [all, kind]);
  const students = all.filter(p => p.kind === "student"), active = students.filter(p => p.status !== "inactive");

  const onFile = async (f: File | undefined) => {
    if (!f) return; setMsg("");
    try { const wb = XLSX.read(await f.arrayBuffer(), { type: "array" }); const r = parseWorkbook(wb); setImp({ ...r, file: f.name }); if (!r.rows.length) setMsg("در این فایل ردیف قابل‌شناسایی پیدا نشد. ستون «نام و نام خانوادگی» لازم است."); }
    catch { setMsg("خواندن فایل ممکن نشد."); }
  };

  return <section className="panel registry">
    <h2>دفتر آموزش</h2>
    <div className="m-seg steps">{([["student", "قرآن‌آموزان"], ["teacher", "اساتید"], ["supporter", "پشتیبان‌ها"], ["stats", "آمار"], ["import", "اکسل"]] as const).map(([k, l]) => <button key={k} type="button" className={tab === k ? "on" : ""} onClick={() => { setTab(k); setEdit(null); setMsg(""); }}>{l}</button>)}</div>
    {msg && <p className={msg.includes("✅") ? "hint" : "error-msg"}>{msg}</p>}

    {kind && !edit && <>
      <div className="reg-tools">
        <input placeholder="جستجو…" value={q} onChange={e => setQ(e.target.value)} />
        {classes.length > 1 && <select value={cls} onChange={e => setCls(e.target.value)}><option value="">همه‌ی کلاس‌ها</option>{classes.map(c => <option key={c}>{c}</option>)}</select>}
      </div>
      <div className="reg-tools"><button type="button" onClick={() => setEdit({ full_name: "", kind })}>+ افزودن</button><button type="button" className="ghost-wide" disabled={!list.length} onClick={() => download(`${kind}.csv`, toCsv(list, FORM_FIELDS[kind]))}>خروجی اکسل</button></div>
      {!list.length && <p className="empty-state">موردی ثبت نشده است. از «اکسل» وارد کنید یا «افزودن» بزنید.</p>}
      {list.map(p => <div className="simple-row reg-row" key={p.id} onClick={() => setEdit(p)}><b>{p.full_name}{p.status === "inactive" ? " (غیرفعال)" : ""}</b><span>{TABLE_COLS[kind].slice(1).map(c => (p as any)[c]).filter(Boolean).join(" · ")}</span></div>)}
      <small className="reg-count">{list.length} مورد</small>
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
      {([["به تفکیک سطح", (p: Person) => p.level || ""], ["به تفکیک کلاس", (p: Person) => p.class_name || ""], ["به تفکیک استاد", (p: Person) => p.teacher_name || ""], ["به تفکیک تحصیلات", (p: Person) => p.education || ""]] as const).map(([t, f]) => <div className="desk-summary" key={t}><b>{t}</b>{countBy(active, f).map(([k, n]) => <div className="desk-row" key={k}><span>{k}</span><small>{n} نفر</small><i style={{ display: "block", height: 6, borderRadius: 3, background: "#dce7da", overflow: "hidden" }}><u style={{ display: "block", height: "100%", width: Math.round(100 * n / Math.max(1, active.length)) + "%", background: "#174b3b" }} /></i></div>)}</div>)}
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
