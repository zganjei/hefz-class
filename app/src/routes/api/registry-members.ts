import { createFileRoute } from "@tanstack/react-router";
import { bindings } from "../../lib/bindings.server";
import { currentUser, jsonError } from "../../lib/auth.server";
import { registryMemberPlan } from "../../lib/registry-members.server";
import { isAdmin } from "../../lib/roles";

// Admin only. GET: preview + per-student status (writes nothing, no personal data beyond registry ids). POST: adds memberships for learners that already have an account (idempotent, never removes).
export const Route = createFileRoute("/api/registry-members")({ server: { handlers: {
  GET: async ({ request }) => {
    const user = await currentUser(request); if (!user) return jsonError("ابتدا وارد شوید.", 401);
    if (!isAdmin(user)) return jsonError("فقط مدیر دسترسی دارد.", 403);
    const { DB } = bindings(); if (!DB) return jsonError("پایگاه داده آماده نیست.", 503);
    const { status, counts, missingClasses } = await registryMemberPlan(DB);
    return Response.json({ status, counts, missingClasses });
  },
  POST: async ({ request }) => {
    const user = await currentUser(request); if (!user) return jsonError("ابتدا وارد شوید.", 401);
    if (!isAdmin(user)) return jsonError("فقط مدیر دسترسی دارد.", 403);
    const { DB } = bindings(); if (!DB) return jsonError("پایگاه داده آماده نیست.", 503);
    const { toAdd } = await registryMemberPlan(DB);
    for (const m of toAdd) await DB.prepare("INSERT INTO class_members (class_id,user_id) VALUES (?,?) ON CONFLICT DO NOTHING").bind(m.classId, m.userId).run();
    const after = await registryMemberPlan(DB);
    return Response.json({ added: toAdd.length, status: after.status, counts: after.counts, missingClasses: after.missingClasses });
  }
}}});
