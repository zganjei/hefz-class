import { createFileRoute } from "@tanstack/react-router";
import { currentUser } from "../../lib/auth.server";
import { bindings } from "../../lib/bindings.server";
import { enrollFromRegistry } from "../../lib/registry-members.server";
export const Route = createFileRoute("/api/auth/me")({ server: { handlers: { GET: async ({request}) => {
  const user = await currentUser(request);
  // Learners listed in the registry (دفتر) join their class automatically; idempotent, never removes, never blocks.
  if (user?.role === "memorizer") await enrollFromRegistry(bindings().DB, user);
  return Response.json({user});
}}}});
