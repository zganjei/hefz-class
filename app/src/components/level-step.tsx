import { useEffect, useState } from "react";
import { LEVELS, STEPS } from "../lib/level-step";

const OTHER = "__other";
type LS = { level_name?: string | null; step_name?: string | null; level?: string | null; step?: string | null };
/** Read a class row whichever API shape it came in (raw column names or the sheet's short names). */
export const lsOf = (c: LS) => ({ level: (c.level_name ?? c.level ?? "") || "", step: (c.step_name ?? c.step ?? "") || "" });

function Field({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  const [other, setOther] = useState(!!value && !options.includes(value));
  useEffect(() => { if (value && !options.includes(value)) setOther(true); else if (options.includes(value)) setOther(false); }, [value]);
  return <>
    <label>{label}<select value={other ? OTHER : value} onChange={e => { if (e.target.value === OTHER) { setOther(true); onChange(""); } else { setOther(false); onChange(e.target.value); } }}>
      <option value="">ثبت نشده</option>{options.map(o => <option key={o} value={o}>{o}</option>)}<option value={OTHER}>دیگر</option>
    </select></label>
    {other && <input value={value} maxLength={40} onChange={e => onChange(e.target.value)} placeholder={label + " را بنویسید"} />}
  </>;
}

/** Edit a class's سطح and گام. Admin and the class's teacher only (the API checks). */
export function LevelStepEditor({ level, step, busy, onSave }: { level: string; step: string; busy: boolean; onSave: (level: string, step: string) => void }) {
  const [l, setL] = useState(level), [s, setS] = useState(step);
  useEffect(() => { setL(level); setS(step); }, [level, step]);
  return <div className="report-form">
    <h3>سطح و گام کلاس</h3>
    <p className="plan-hint">هر کلاس معمولاً در یک سطح و یک گام است. قرآن‌آموزان کلاس همین سطح و گام را در فهرست‌ها می‌گیرند.</p>
    <Field label="سطح" options={LEVELS} value={l} onChange={setL} />
    <Field label="گام" options={STEPS} value={s} onChange={setS} />
    <button className="primary-wide" disabled={busy || (l.trim() === level && s.trim() === step)} onClick={() => onSave(l.trim(), s.trim())}>ذخیره‌ی سطح و گام</button>
  </div>;
}

/** Two small selects that narrow a list of classes by سطح / گام. Shows nothing until at least one class has a value. */
export function LevelStepFilter({ classes, level, step, setLevel, setStep }: { classes: LS[]; level: string; step: string; setLevel: (v: string) => void; setStep: (v: string) => void }) {
  const vals = classes.map(lsOf), levels = Array.from(new Set(vals.map(v => v.level).filter(Boolean))), steps = Array.from(new Set(vals.map(v => v.step).filter(Boolean)));
  if (!levels.length && !steps.length) return null;
  return <div className="pm-chips">
    {levels.length > 0 && <label className="adm-hint">سطح<select value={level} onChange={e => setLevel(e.target.value)}><option value="">همه‌ی سطح‌ها</option>{levels.map(v => <option key={v}>{v}</option>)}</select></label>}
    {steps.length > 0 && <label className="adm-hint">گام<select value={step} onChange={e => setStep(e.target.value)}><option value="">همه‌ی گام‌ها</option>{steps.map(v => <option key={v}>{v}</option>)}</select></label>}
  </div>;
}

export const matchesLS = (c: LS, level: string, step: string) => { const v = lsOf(c); return (!level || v.level === level) && (!step || v.step === step); };
