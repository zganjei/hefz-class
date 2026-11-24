import { createFileRoute } from "@tanstack/react-router";
import { bindings } from "../../lib/bindings.server";
// Public, secret-free status: is the database reachable and which build-time migrations have been applied.
export const Route = createFileRoute("/api/health")({ server: { handlers: { GET: async () => {
  const { DB } = bindings();
  if (!DB) return Response.json({ ok: false, db: false, migrations: [] });
  try {
    const rows = await DB.prepare("SELECT name FROM schema_migrations ORDER BY name").all<{ name: string }>();
    return Response.json({ ok: true, db: true, migrations: (rows.results || []).map(r => r.name) });
  } catch { return Response.json({ ok: true, db: true, migrations: [] }); }
}}}});
