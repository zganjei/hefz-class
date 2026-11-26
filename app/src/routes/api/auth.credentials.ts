import { createFileRoute } from "@tanstack/react-router";
import { setOwnCredentials, jsonError } from "../../lib/auth.server";
export const Route = createFileRoute("/api/auth/credentials")({ server: { handlers: { POST: async ({request}) => {
  const body = await request.json().catch(()=>null) as Record<string,unknown>|null;
  if (!body) return jsonError("درخواست نامعتبر است.");
  return setOwnCredentials(request, body);
}}}});
