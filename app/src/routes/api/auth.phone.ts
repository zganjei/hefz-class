import { createFileRoute } from "@tanstack/react-router";
import { jsonError } from "../../lib/auth.server";
import { sendPhoneCode, verifyPhoneCode } from "../../lib/phone-auth.server";
export const Route = createFileRoute("/api/auth/phone")({ server: { handlers: {
  POST: async ({ request }) => {
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body) return jsonError("درخواست نامعتبر است.");
    if (body.action === "send") return sendPhoneCode(request, body);
    if (body.action === "verify") return verifyPhoneCode(request, body);
    return jsonError("عملیات نامعتبر است.");
  },
}}});
