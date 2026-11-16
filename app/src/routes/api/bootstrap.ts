import { createFileRoute } from "@tanstack/react-router";
import { bindings } from "../../lib/bindings.server";
export const Route = createFileRoute("/api/bootstrap")({
  server: { handlers: { GET: async () => {
    const { DB, GOOGLE_CLIENT_ID } = bindings();
    if (!DB) return Response.json({ ready: false, configured: false, googleClientId: GOOGLE_CLIENT_ID || null });
    const count = await DB.prepare("SELECT COUNT(*) AS n FROM users").first<{ n: number }>();
    return Response.json({ ready: Number(count?.n ?? 0) === 0, configured: false, googleClientId: GOOGLE_CLIENT_ID || null });
  } } }
});
