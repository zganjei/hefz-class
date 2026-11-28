import { useCallback, useEffect, useRef, useState } from "react";
import { displayClassNames } from "../lib/teacher-name";

const fa = (n: number | string) => String(n).replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
const MAX = 2000, POLL_MS = 8000, CHANGED = "hefz-chat-changed";
const badge = (n: number) => n > 99 ? "99+" : fa(n);

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
  const endRef = useRef<HTMLDivElement>(null), stick = useRef(true), last = useRef(""), marked = useRef("");
  const load = useCallback(async () => {
    try { const d = await call("GET", "/api/class-chat?classId=" + encodeURIComponent(classId)); setMsgs(d.messages); setErr(""); } catch (e: any) { setErr(e.message); }
  }, [classId]);
  useEffect(() => {
    setMsgs(null); stick.current = true; last.current = ""; marked.current = ""; void load();
    const t = setInterval(() => { if (document.visibilityState === "visible") void load(); }, POLL_MS);
    return () => clearInterval(t);
  }, [load]);
  useEffect(() => {   // follow new messages only when the reader is already at the bottom (or just sent one)
    const tail = msgs?.length ? msgs[msgs.length - 1].id : "";
    if (tail && tail !== last.current && stick.current) endRef.current?.scrollIntoView({ block: "end" });
    last.current = tail;
    if (tail && tail !== marked.current && document.visibilityState === "visible") { marked.current = tail; void call("POST", "/api/class-chat", { action: "read", classId }).then(() => window.dispatchEvent(new Event(CHANGED)), () => { marked.current = ""; }); }   // opened / new messages while open = read (server-side marker)
  }, [msgs]);   // eslint-disable-line react-hooks/exhaustive-deps
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

type Chat = { classId: string; name: string; lastBody: string | null; lastAt: string | null; lastName: string | null; lastMine: boolean; unread: number };
const listTime = (iso: string) => { const d = new Date(iso); if (isNaN(+d)) return ""; return new Date().toDateString() === d.toDateString() ? d.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }) : d.toLocaleDateString("fa-IR", { month: "short", day: "numeric" }); };

/** «گفتگو» tab for every role: a list of chats (one per class). A learner's list holds exactly their class, a teacher's/admin's holds all classes. A list with a single chat opens it directly (no back button, no selector); otherwise tapping a row opens the chat with a back button. Each row shows the server-side unread count (synced across devices); opening a chat marks it read. */
export function ChatTab({ staff }: { staff: boolean }) {
  const [chats, setChats] = useState<Chat[] | null>(null), [open, setOpen] = useState(""), [err, setErr] = useState("");
  const load = useCallback(async () => {
    try { const d = await call("GET", "/api/class-chat?list=1" + (staff ? "" : "&own=1")); setChats(d.chats); setErr(""); } catch (e: any) { setErr(e.message); }
  }, [staff]);
  useEffect(() => {
    void load();
    if (open) return;   // an open chat does its own polling
    const t = setInterval(() => { if (document.visibilityState === "visible") void load(); }, POLL_MS);
    return () => clearInterval(t);
  }, [load, open]);
  if (!chats) return <section className="panel"><h2>گفتگو</h2>{err ? <p className="error-msg">{err}</p> : <p className="empty-state">در حال بارگذاری…</p>}</section>;
  if (!chats.length) return <section className="panel"><h2>گفتگو</h2><p className="empty-state">{staff ? "هنوز کلاسی نیست." : "شما هنوز عضو کلاسی نیستید."}</p></section>;
  const labels = displayClassNames(chats.map(c => c.name));
  const single = chats.length === 1;
  const cur = single ? chats[0] : chats.find(c => c.classId === open);
  if (cur) {
    return <section className="panel">
      <div className="chat-bar">{!single && <button type="button" className="chat-back" aria-label="بازگشت به فهرست گفتگوها" onClick={() => { setOpen(""); void load(); }}>→ بازگشت</button>}<h2>{labels[chats.indexOf(cur)]}</h2></div>
      <ClassChat classId={cur.classId} />
    </section>;
  }
  return <section className="panel">
    <h2>گفتگوها</h2>
    <ul className="chat-rows">{chats.map((c, i) => {
      const unread = c.unread > 0;
      return <li key={c.classId}><button type="button" className={"chat-row" + (unread ? " unread" : "")} onClick={() => setOpen(c.classId)}>
        <span className="chat-row-top"><b>{labels[i]}</b>{c.lastAt && <small>{listTime(c.lastAt)}</small>}</span>
        <span className="chat-row-bot"><span className="chat-prev">{c.lastBody ? (c.lastMine ? "شما: " : c.lastName ? c.lastName + ": " : "") + c.lastBody : "هنوز پیامی نیست"}</span>{unread && <span className="chat-badge" aria-label={`${fa(c.unread)} پیام نخوانده`}>{badge(c.unread)}</span>}</span>
      </button></li>;
    })}</ul>
    {err && <p className="error-msg">{err}</p>}
  </section>;
}

/** Total unread over all chats for the bottom-nav «گفتگو» tab: one list call every 30 s (visible tab only), plus a refetch whenever a chat marks itself read. */
export function useChatUnread(enabled: boolean, staff: boolean, tab: string): number {
  const [n, setN] = useState(0);
  const load = useCallback(async () => {
    try { const d = await call("GET", "/api/class-chat?list=1" + (staff ? "" : "&own=1")); setN((d.chats as Chat[]).reduce((a, c) => a + (c.unread || 0), 0)); } catch { /* keep the last count */ }
  }, [staff]);
  useEffect(() => {
    if (!enabled) { setN(0); return; }
    void load();
    const t = setInterval(() => { if (document.visibilityState === "visible") void load(); }, 30000);
    window.addEventListener(CHANGED, load);
    return () => { clearInterval(t); window.removeEventListener(CHANGED, load); };
  }, [enabled, load, tab]);
  return n;
}
