import { createFileRoute } from "@tanstack/react-router";
import { login, jsonError } from "../../lib/auth.server";
export const Route = createFileRoute("/api/auth/login")({ server: { handlers: { POST: async ({request}) => {
  const body = await request.json().catch(()=>null) as Record<string,unknown>|null;
  if (!body || typeof body.email!=="string" || typeof body.password!=="string") return jsonError("اطلاعات ورود ناقص است.");
  return login(request,body.email,body.password);
}}}});
