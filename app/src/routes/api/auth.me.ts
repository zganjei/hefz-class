import { createFileRoute } from "@tanstack/react-router";
import { currentUser, setOwnDisplayName, jsonError } from "../../lib/auth.server";
import { bindings } from "../../lib/bindings.server";
import { enrollFromRegistry } from "../../lib/registry-members.server";
export const Route = createFileRoute("/api/auth/me")({ server: { handlers: { PATCH: async ({request}) => {
  const body = await request.json().catch(()=>null) as Record<string,unknown>|null;
  if (!body) return jsonError("درخواست نامعتبر است.");
  return setOwnDisplayName(request, body);
}, GET: async ({request}) => {
  const user = await currentUser(request);
  // Learners listed in the registry (دفتر) join their class automatically; idempotent, never removes, never blocks.
  if (user?.role === "memorizer") await enrollFromRegistry(bindings().DB, user);
  return Response.json({user});
}}}});
