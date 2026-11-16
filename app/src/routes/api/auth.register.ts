import { createFileRoute } from "@tanstack/react-router";
import { registerWithInvite, registerOrLoginWithGoogle, jsonError } from "../../lib/auth.server";
export const Route = createFileRoute("/api/auth/register")({ server: { handlers: { POST: async ({request}) => {
  const body = await request.json().catch(()=>null) as Record<string,unknown>|null;
  if (!body) return jsonError("درخواست نامعتبر است.");
  if (typeof body.credential === "string") return registerOrLoginWithGoogle(request,body);
  return registerWithInvite(request,body);
}}}});
