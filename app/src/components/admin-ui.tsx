import { useState, type ReactNode } from "react";

/** Shared admin building blocks: one accordion, one confirm box. Styles live in styles.css under "adm-". */
export function Acc({ title, badge, open, onToggle, children }: { title: string; badge?: number; open: boolean; onToggle: () => void; children: ReactNode }) {
  return <section className={"adm-sec" + (open ? " open" : "")}>
    <button type="button" className="adm-head" aria-expanded={open} onClick={onToggle}>
      <span className="adm-title">{title}</span>
      {!!badge && <span className="adm-badge">{badge.toLocaleString("fa-IR")}</span>}
      <span className="adm-chev" aria-hidden="true" />
    </button>
    {/* kept mounted (hidden) so forms and loaded lists keep their state while another section is open */}
    <div className="adm-body" hidden={!open}>{children}</div>
  </section>;
}

/** Inline two-step confirm: text, one danger button, one cancel. */
export function Confirm({ text, yes, onYes, onNo, busy, danger = true }: { text: string; yes: string; onYes: () => void; onNo: () => void; busy?: boolean; danger?: boolean }) {
  return <div className="adm-note">
    <b>{text}</b>
    <div className="adm-actions">
      <button type="button" className={"adm-btn" + (danger ? " danger" : "")} disabled={busy} onClick={onYes}>{yes}</button>
      <button type="button" className="adm-btn quiet" disabled={busy} onClick={onNo}>انصراف</button>
    </div>
  </div>;
}

/** One-open-at-a-time state for a group of accordions. */
export function useOne<T extends string>() {
  const [open, setOpen] = useState<T | "">("");
  return { open, toggle: (k: T) => setOpen(o => (o === k ? "" : k)) };
}
