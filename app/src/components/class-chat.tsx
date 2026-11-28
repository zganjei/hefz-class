import { useCallback, useEffect, useRef, useState } from "react";
import { displayClassNames } from "../lib/teacher-name";

const fa = (n: number | string) => String(n).replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
const MAX = 2000, POLL_MS = 8000;

type Msg = { id: string; userId: string; name: string; body: string; createdAt: string; mine: boolean; canDelete: boolean };

async function call(method: "GET" | "POST" | "DELETE", path: string, body?: unknown) {
  const r = await fetch(path, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({ error: "پاسخ نامعتبر بود." }));
  if (!r.ok) throw new Error(d.error || "خطا");
  return d;
}
const timeText = (iso: string) => { const d = new Date(iso); return isNaN(+d) ? "" : d.toLocaleString("fa-IR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); };

/** گفتگو: the group chat of one class (text). Newest at the bottom; polls every few seconds while open and the tab is visible. The server decides who may read/post/delete. */
export function ClassChat({ classId }: { classId: string }) {
  const [msgs, setMsgs] = useState<Msg[] | null>(null), [text, setText] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null), stick = useRef(true), last = useRef("");
  const load = useCallback(async () => {
    try { const d = await call("GET", "/api/class-chat?classId=" + encodeURIComponent(classId)); setMsgs(d.messages); setErr(""); } catch (e: any) { setErr(e.message); }
  }, [classId]);
  useEffect(() => {
    setMsgs(null); stick.current = true; last.current = ""; void load();
    const t = setInterval(() => { if (document.visibilityState === "visible") void load(); }, POLL_MS);
    return () => clearInterval(t);
  }, [load]);
  useEffect(() => {   // follow new messages only when the reader is already at the bottom (or just sent one)
    const tail = msgs?.length ? msgs[msgs.length - 1].id : "";
    if (tail && tail !== last.current && stick.current) endRef.current?.scrollIntoView({ block: "end" });
    last.current = tail;
  }, [msgs]);
  const send = async () => {
    const t = text.trim(); if (!t || busy) return;
    setBusy(true);
    try { await call("POST", "/api/class-chat", { classId, text: t }); setText(""); stick.current = true; await load(); } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  const del = async (m: Msg) => {
    if (!window.confirm("این پیام حذف شود؟")) return;
    try { await call("DELETE", "/api/class-chat", { messageId: m.id }); await load(); } catch (e: any) { setErr(e.message); }
  };
  return <div className="chat">
    <div className="chat-list" role="log" aria-live="polite" onScroll={e => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}>
      {msgs === null && !err && <p className="empty-state">در حال بارگذاری…</p>}
      {msgs?.length === 0 && <p className="empty-state">هنوز پیامی نیست. اولین پیام را بنویسید.</p>}
      {msgs?.map(m => <article key={m.id} className={"chat-msg" + (m.mine ? " mine" : "")}>
        <div className="chat-head"><b>{m.name}</b><small>{timeText(m.createdAt)}</small>{m.canDelete && <button type="button" className="chat-del" aria-label="حذف پیام" onClick={() => void del(m)}>حذف</button>}</div>
        <p>{m.body}</p>
      </article>)}
      <div ref={endRef} />
    </div>
    {err && <p className="error-msg">{err}</p>}
    <form className="chat-form" onSubmit={e => { e.preventDefault(); void send(); }}>
      <textarea value={text} maxLength={MAX} rows={2} placeholder="پیام خود را بنویسید…" aria-label="پیام" onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void send(); } }} />
      <button className="primary-wide" disabled={busy || !text.trim()}>{busy ? "…" : "ارسال"}</button>
      {text.length > MAX - 200 && <small className="plan-hint">{fa(text.length)} / {fa(MAX)}</small>}
    </form>
  </div>;
}

/** Learner's «گفتگو» tab: the chat of their class (a chooser when they are in several). */
export function ChatTab({ classes }: { classes: { id: string; name: string }[] }) {
  const [sel, setSel] = useState("");
  const labels = displayClassNames(classes.map(c => c.name));
  const id = classes.some(c => c.id === sel) ? sel : classes[0]?.id || "";
  if (!id) return <section className="panel"><p className="empty-state">شما هنوز عضو کلاسی نیستید.</p></section>;
  return <section className="panel">
    <h2>گفتگوی کلاس</h2>
    {classes.length > 1 && <label>کلاس<select value={id} onChange={e => setSel(e.target.value)}>{classes.map((c, i) => <option key={c.id} value={c.id}>{labels[i]}</option>)}</select></label>}
    <ClassChat classId={id} />
  </section>;
}
