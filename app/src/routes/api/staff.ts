import { createFileRoute } from "@tanstack/react-router";
import { createStaffAccount, jsonError } from "../../lib/auth.server";
export const Route = createFileRoute("/api/staff")({ server: { handlers: { POST: async ({request}) => {
  const body = await request.json().catch(()=>null) as Record<string,unknown>|null;
  if (!body) return jsonError("درخواست نامعتبر است.");
  return createStaffAccount(request, body);
}}}});
