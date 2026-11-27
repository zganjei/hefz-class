import { createFileRoute } from "@tanstack/react-router";
import { bindings } from "../../lib/bindings.server";
import { createStaffAccount, currentUser, jsonError } from "../../lib/auth.server";
export const Route = createFileRoute("/api/staff")({ server: { handlers: {
  // Admin-only, read-only: active teacher accounts (id + name), used by the "add teacher to class" panel.
  GET: async ({request}) => {
    const user = await currentUser(request); if (!user) return jsonError("ابتدا وارد شوید.", 401);
    if (user.role !== "admin") return jsonError("فقط مدیر می‌تواند فهرست اساتید را ببیند.", 403);
    const { DB } = bindings(); if (!DB) return jsonError("پایگاه داده آماده نیست.", 503);
    const rows = await DB.prepare("SELECT id,display_name FROM users WHERE role='teacher' AND active=1 ORDER BY display_name").all<any>();
    return Response.json({ teachers: rows.results || [] });
  },
  POST: async ({request}) => {
    const body = await request.json().catch(()=>null) as Record<string,unknown>|null;
    if (!body) return jsonError("درخواست نامعتبر است.");
    return createStaffAccount(request, body);
  }
}}});
