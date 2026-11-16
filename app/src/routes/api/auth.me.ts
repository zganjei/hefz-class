import { createFileRoute } from "@tanstack/react-router";
import { currentUser } from "../../lib/auth.server";
export const Route = createFileRoute("/api/auth/me")({ server: { handlers: { GET: async ({request}) => {
  return Response.json({user:await currentUser(request)});
}}}});
