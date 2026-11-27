import { createFileRoute } from "@tanstack/react-router";
import { bindings } from "../../lib/bindings.server";
import { changeStaffRole, renameStaff, createStaffAccount, currentUser, jsonError } from "../../lib/auth.server";
import { hasRoleSql, isAdmin, normalizeRoles, primaryRole } from "../../lib/roles";
export const Route = createFileRoute("/api/staff")({ server: { handlers: {
  // Admin-only, read-only: active teacher accounts (id + name), used by the "add teacher to class" panel.
  GET: async ({request}) => {
    const user = await currentUser(request); if (!user) return jsonError("ابتدا وارد شوید.", 401);
    if (!isAdmin(user)) return jsonError("فقط مدیر می‌تواند فهرست اساتید را ببیند.", 403);
    const { DB } = bindings(); if (!DB) return jsonError("پایگاه داده آماده نیست.", 503);
    const sp = new URL(request.url).searchParams;
    if (sp.get("accounts")) {
      // Default list: everyone who holds a staff-side role (admin / teacher / supporter). With ?q= (2+ chars) any active account (also learners) can be found to give her a role.
      const q = (sp.get("q") || "").trim().slice(0, 60).replace(/[\\%_]/g, m => "\\" + m);
      const base = "SELECT u.id,u.display_name,u.role FROM users u WHERE u.active=1 AND ";
      const all = q.length >= 2
        ? await DB.prepare(base + "(u.display_name ILIKE ? OR COALESCE(u.phone,'') LIKE ? OR u.email ILIKE ?) ORDER BY u.display_name LIMIT 30").bind("%" + q + "%", "%" + q + "%", "%" + q + "%").all<any>()
        : await DB.prepare(base + "(" + hasRoleSql("u", "admin") + " OR " + hasRoleSql("u", "teacher") + " OR " + hasRoleSql("u", "supporter") + ") ORDER BY u.display_name").all<any>();
      const rows = (all.results || []) as { id: string; display_name: string; role: string }[];
      const byId = new Map<string, string[]>();
      if (rows.length) {
        const rr = ((await DB.prepare(`SELECT user_id,role FROM user_roles WHERE user_id IN (${rows.map(() => "?").join(",")})`).bind(...rows.map(r => r.id)).all<any>()).results || []) as { user_id: string; role: string }[];
        for (const r of rr) (byId.get(r.user_id) || byId.set(r.user_id, []).get(r.user_id)!).push(r.role);
      }
      const accounts = rows.map(r => { const roles = normalizeRoles(byId.get(r.id) || [r.role]); return { id: r.id, display_name: r.display_name, role: primaryRole(roles), roles }; });
      return Response.json({ accounts, me: user.id });
    }
    const rows = await DB.prepare("SELECT u.id,u.display_name FROM users u WHERE " + hasRoleSql("u", "teacher") + " AND u.active=1 ORDER BY u.display_name").all<any>();
    return Response.json({ teachers: rows.results || [] });
  },
  POST: async ({request}) => {
    const body = await request.json().catch(()=>null) as Record<string,unknown>|null;
    if (!body) return jsonError("درخواست نامعتبر است.");
    return createStaffAccount(request, body);
  },
  PATCH: async ({request}) => {
    const body = await request.json().catch(()=>null) as Record<string,unknown>|null;
    if (!body) return jsonError("درخواست نامعتبر است.");
    return typeof body.name === "string" && body.role === undefined && body.roles === undefined ? renameStaff(request, body) : changeStaffRole(request, body);
  }
}}});
