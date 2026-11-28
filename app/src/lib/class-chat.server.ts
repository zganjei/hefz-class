import type { bindings } from "./bindings.server";
import type { SessionUser } from "./auth.server";
import { canManageClass } from "./access.server";
import { isAdmin, isTeacher } from "./roles";

type DB = NonNullable<ReturnType<typeof bindings>["DB"]>;

export const MAX_CHAT_TEXT = 2000;
export const CHAT_PAGE = 100;

export type ChatMessage = { id: string; userId: string; name: string; body: string; createdAt: string; mine: boolean; canDelete: boolean };

/** Who may read/post in a class chat: admin and teachers (any existing class), or a member of the class. Deleting others' messages stays limited to canManageClass. The class id comes from the client and is checked here, never trusted. */
export async function canUseChat(DB: DB, user: SessionUser, classId: string): Promise<boolean> {
  if (!classId) return false;
  if (isAdmin(user) || isTeacher(user)) return !!(await DB.prepare("SELECT 1 AS ok FROM classes WHERE id=?").bind(classId).first());
  return !!(await DB.prepare("SELECT 1 AS ok FROM class_members WHERE class_id=? AND user_id=?").bind(classId, user.id).first());
}

/** Validates message text: trimmed, 1..MAX_CHAT_TEXT characters. Returns the clean text or an error message. */
export function cleanChatText(v: unknown): { ok: true; text: string } | { ok: false; error: string } {
  if (typeof v !== "string") return { ok: false, error: "متن پیام را بنویسید." };
  const text = v.replace(/\r\n/g, "\n").trim();
  if (!text) return { ok: false, error: "پیام خالی است." };
  if ([...text].length > MAX_CHAT_TEXT) return { ok: false, error: `پیام حداکثر ${MAX_CHAT_TEXT} نویسه می‌تواند باشد.` };
  return { ok: true, text };
}

type Row = { id: string; user_id: string; display_name: string | null; body: string; created_at: string | Date };

/** Newest CHAT_PAGE messages of the class, oldest first. canManage = admin/teacher of the class (may delete any message). */
export async function listMessages(DB: DB, user: SessionUser, classId: string, canManage: boolean): Promise<ChatMessage[]> {
  const rows = (await DB.prepare("SELECT m.id,m.user_id,u.display_name,m.body,m.created_at FROM class_messages m LEFT JOIN users u ON u.id=m.user_id WHERE m.class_id=? ORDER BY m.created_at DESC, m.id DESC LIMIT ?").bind(classId, CHAT_PAGE).all<Row>()).results || [];
  return rows.reverse().map(r => ({ id: r.id, userId: r.user_id, name: r.display_name || "؟", body: r.body, createdAt: new Date(r.created_at).toISOString(), mine: r.user_id === user.id, canDelete: canManage || r.user_id === user.id }));
}

export type ChatResult<T = object> = ({ ok: true } & T) | { ok: false; status: number; error: string };

export async function postMessage(DB: DB, user: SessionUser, classId: unknown, text: unknown): Promise<ChatResult<{ id: string }>> {
  const cid = typeof classId === "string" ? classId : "";
  if (!(await canUseChat(DB, user, cid))) return { ok: false, status: 403, error: "دسترسی به گفتگوی این کلاس ندارید." };
  const t = cleanChatText(text); if (!t.ok) return { ok: false, status: 400, error: t.error };
  const id = crypto.randomUUID();
  await DB.prepare("INSERT INTO class_messages(id,class_id,user_id,body) VALUES(?,?,?,?)").bind(id, cid, user.id, t.text).run();
  return { ok: true, id };
}

export type ChatSummary = { classId: string; name: string; lastBody: string | null; lastAt: string | null; lastName: string | null; lastMine: boolean; unread: number };
type SummaryRow = { id: string; name: string; last_body: string | null; last_at: string | Date | null; last_user_id: string | null; last_name: string | null; unread: number | string | null };
export const PREVIEW_CHARS = 120;
/** Unread counting stops here (the UI shows 99+), so the count never scans a whole backlog. */
export const UNREAD_CAP = 100;

/** One query: a row per class with its newest message, newest chat first, classes without messages last. Admin/teacher see every class; everyone else (or ownOnly = learner view) only their own class, a single deterministic one (most recently joined). */
export async function listChats(DB: DB, user: SessionUser, ownOnly = false): Promise<ChatSummary[]> {
  const staff = (isAdmin(user) || isTeacher(user)) && !ownOnly;
  const last = "LEFT JOIN LATERAL (SELECT m.body,m.created_at,m.user_id FROM class_messages m WHERE m.class_id=c.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1) lm ON true LEFT JOIN users u ON u.id=lm.user_id";
  // unread = other people's messages newer than this user's marker (no marker = all of them), counted over at most UNREAD_CAP rows
  const unread = `LEFT JOIN class_chat_reads r ON r.class_id=c.id AND r.user_id=? LEFT JOIN LATERAL (SELECT COUNT(*) AS n FROM (SELECT 1 FROM class_messages m WHERE m.class_id=c.id AND m.user_id<>? AND (r.last_read_at IS NULL OR m.created_at>r.last_read_at) LIMIT ${UNREAD_CAP}) x) un ON true`;
  const cols = `SELECT c.id,c.name,LEFT(lm.body,${PREVIEW_CHARS}) AS last_body,lm.created_at AS last_at,lm.user_id AS last_user_id,u.display_name AS last_name,un.n AS unread FROM classes c`;
  const q = staff
    ? `${cols} ${unread} ${last} ORDER BY lm.created_at DESC NULLS LAST, c.name, c.id`
    : `${cols} JOIN class_members cm ON cm.class_id=c.id AND cm.user_id=? ${unread} ${last} ORDER BY cm.joined_at DESC, c.id LIMIT 1`;
  const rows = (await DB.prepare(q).bind(...(staff ? [user.id, user.id] : [user.id, user.id, user.id])).all<SummaryRow>()).results || [];
  return rows.map(r => ({ classId: r.id, name: r.name, lastBody: r.last_body, lastAt: r.last_at ? new Date(r.last_at).toISOString() : null, lastName: r.last_name, lastMine: r.last_user_id === user.id, unread: Math.min(Number(r.unread) || 0, UNREAD_CAP) }));
}

/** Marks the class chat read for this user as of now (server clock). Same membership rule as reading; the class id from the client is checked, never trusted. */
export async function markRead(DB: DB, user: SessionUser, classId: unknown): Promise<ChatResult> {
  const cid = typeof classId === "string" ? classId : "";
  if (!(await canUseChat(DB, user, cid))) return { ok: false, status: 403, error: "دسترسی به گفتگوی این کلاس ندارید." };
  await DB.prepare("INSERT INTO class_chat_reads(user_id,class_id,last_read_at) VALUES(?,?,CURRENT_TIMESTAMP) ON CONFLICT (user_id,class_id) DO UPDATE SET last_read_at=CURRENT_TIMESTAMP").bind(user.id, cid).run();
  return { ok: true };
}

/** Admin and the class's teachers may delete any message of the class; anyone else only their own (and only while still in the class). The message's own class decides, not a client-supplied class id. */
export async function deleteMessage(DB: DB, user: SessionUser, messageId: unknown): Promise<ChatResult> {
  const id = typeof messageId === "string" ? messageId : "";
  const m = id ? await DB.prepare("SELECT id,class_id,user_id FROM class_messages WHERE id=?").bind(id).first<{ id: string; class_id: string; user_id: string }>() : null;
  if (!m) return { ok: false, status: 404, error: "پیام پیدا نشد." };
  const own = m.user_id === user.id;
  if (!(isAdmin(user) || (await canManageClass(DB, user, m.class_id)) || (own && (await canUseChat(DB, user, m.class_id))))) return { ok: false, status: 403, error: "اجازهٔ حذف این پیام را ندارید." };
  await DB.prepare("DELETE FROM class_messages WHERE id=?").bind(m.id).run();
  return { ok: true };
}
