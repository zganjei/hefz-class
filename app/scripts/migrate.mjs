// Applies migrations numbered 0004 and above to the Postgres database in DATABASE_URL, once each.
// Older files (0001-0003) are the initial schema that production already has and are never re-run.
// Each migration must be additive and idempotent. Failure aborts the build, so the live site stays on the old version.
import postgres from "postgres";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const url = process.env.DATABASE_URL;
if (!url) { console.log("migrate: DATABASE_URL not set, skipping"); process.exit(0); }
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "migrations");
const files = fs.readdirSync(dir).filter(f => /^\d{4}_.+\.sql$/.test(f) && Number(f.slice(0, 4)) >= 4).sort();
const sql = postgres(url, { max: 1, connect_timeout: 15, prepare: false, onnotice: () => {} });
try {
  await sql.unsafe("CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)");
  const done = new Set((await sql`SELECT name FROM schema_migrations`).map(r => r.name));
  for (const f of files) {
    if (done.has(f)) { console.log(`migrate: ${f} already applied`); continue; }
    await sql.begin(async tx => {
      await tx.unsafe(fs.readFileSync(path.join(dir, f), "utf8"));
      await tx`INSERT INTO schema_migrations (name) VALUES (${f})`;
    });
    console.log(`migrate: applied ${f}`);
  }
} catch (e) { console.error("migrate: FAILED:", e?.message || e); process.exit(1); } finally { await sql.end(); }
