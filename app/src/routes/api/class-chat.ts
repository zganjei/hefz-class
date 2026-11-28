import { createFileRoute } from "@tanstack/react-router";
import { bindings } from "../../lib/bindings.server";
import { currentUser, jsonError } from "../../lib/auth.server";
import { canManageClass } from "../../lib/access.server";
import { canUseChat, deleteMessage, listMessages, postMessage } from "../../lib/class-chat.server";

// In-class group chat (text). Everyone in the class (members, the class's teachers, admins) reads and writes; delete: own message, or any message for admin / the class's teacher.
export const Route = createFileRoute("/api/class-chat")({ server: { handlers: {
 GET: async ({ request }) => {
  const user = await currentUser(request); if (!user) return jsonError("ابتدا وارد شوید.", 401);
  const { DB } = bindings(); if (!DB) return jsonError("پایگاه داده آماده نیست.", 503);
  const classId = new URL(request.url).searchParams.get("classId") || "";
  if (!(await canUseChat(DB, user, classId))) return jsonError("دسترسی به گفتگوی این کلاس ندارید.", 403);
  const messages = await listMessages(DB, user, classId, await canManageClass(DB, user, classId));
  return new Response(JSON.stringify({ messages }), { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
 },
 POST: async ({ request }) => {
  const user = await currentUser(request); if (!user) return jsonError("ابتدا وارد شوید.", 401);
  const { DB } = bindings(); if (!DB) return jsonError("پایگاه داده آماده نیست.", 503);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const r = await postMessage(DB, user, body?.classId, body?.text);
  return r.ok ? Response.json({ id: r.id }) : jsonError(r.error, r.status);
 },
 DELETE: async ({ request }) => {
  const user = await currentUser(request); if (!user) return jsonError("ابتدا وارد شوید.", 401);
  const { DB } = bindings(); if (!DB) return jsonError("پایگاه داده آماده نیست.", 503);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const r = await deleteMessage(DB, user, body?.messageId);
  return r.ok ? Response.json({ removed: true }) : jsonError(r.error, r.status);
 }
}}});
