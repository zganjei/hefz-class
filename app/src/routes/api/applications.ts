import { createFileRoute } from "@tanstack/react-router";
import { jsonError } from "../../lib/auth.server";
import { decideApplication, listApplications, submitApplication } from "../../lib/applications.server";
export const Route = createFileRoute("/api/applications")({ server: { handlers: {
  GET: async ({ request }) => listApplications(request),
  POST: async ({ request }) => {
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body) return jsonError("درخواست نامعتبر است.");
    // Admin decisions carry an "id"+"decision"; the public form never does.
    if (typeof body.decision === "string") return decideApplication(request, body);
    return submitApplication(request, body);
  },
}}});
