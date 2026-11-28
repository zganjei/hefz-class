import type { bindings } from "./bindings.server";
import type { SessionUser } from "./auth.server";
import { canManageClass } from "./access.server";
import { isAdmin } from "./roles";

type DB = NonNullable<ReturnType<typeof bindings>["DB"]>;

export const MAX_CHAT_TEXT = 2000;
export const CHAT_PAGE = 100;

export type ChatMessage = { id: string; userId: string; name: string; body: string; createdAt: string; mine: boolean; canDelete: boolean };

/** Who may read/post in a class chat: admin (any class), a teacher of the class, or a member of the class. The class id comes from the client and is checked here, never trusted. */
export async function canUseChat(DB: DB, user: SessionUser, classId: string): Promise<boolean> {
  if (!classId) return false;
  if (await canManageClass(DB, user, classId)) return true;
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
