import { createFileRoute } from "@tanstack/react-router";
import { bindings } from "../../lib/bindings.server";
import { currentUser, jsonError } from "../../lib/auth.server";

const norm = (s: unknown) => String(s ?? "").replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/[ً-ٟ‌]/g, " ").replace(/\s+/g, " ").trim().toLowerCase();

/** Distinct registry class names (students), grouped by normalised name, split into new vs already existing classes. */
async function compute(DB: any) {
  const reg = await DB.prepare("SELECT class_name FROM registry_people WHERE kind='student' AND status='active' AND class_name IS NOT NULL AND TRIM(class_name)<>''").all();
  const groups = new Map<string, { name: string; students: number }>();
  for (const r of (reg.results || []) as { class_name: string }[]) {
    const display = String(r.class_name).replace(/\s+/g, " ").trim().slice(0, 100), key = norm(display);
    if (!key) continue;
    const g = groups.get(key); if (g) g.students++; else groups.set(key, { name: display, students: 1 });
  }
  const existing = new Set(((await DB.prepare("SELECT name FROM classes").all()).results || []).map((c: any) => norm(c.name)));
  const toCreate: { name: string; students: number }[] = [], already: { name: string; students: number }[] = [];
  for (const [key, g] of groups) (existing.has(key) ? already : toCreate).push(g);
  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "fa");
  return { toCreate: toCreate.sort(byName), already: already.sort(byName) };
}

export const Route = createFileRoute("/api/registry-classes")({ server: { handlers: {
  // Admin-only preview: nothing is written.
  GET: async ({ request }) => {
    const user = await currentUser(request); if (!user) return jsonError("ابتدا وارد شوید.", 401);
    if (user.role !== "admin") return jsonError("فقط مدیر دسترسی دارد.", 403);
    const { DB } = bindings(); if (!DB) return jsonError("پایگاه داده آماده نیست.", 503);
    const { toCreate, already } = await compute(DB);
    return Response.json({ toCreate: toCreate, already });
  },
  // Admin-only, idempotent: creates the missing classes (admin as owner), recomputed server-side so a double press creates nothing twice.
  POST: async ({ request }) => {
    const user = await currentUser(request); if (!user) return jsonError("ابتدا وارد شوید.", 401);
    if (user.role !== "admin") return jsonError("فقط مدیر دسترسی دارد.", 403);
    const { DB } = bindings(); if (!DB) return jsonError("پایگاه داده آماده نیست.", 503);
    const { toCreate } = await compute(DB);
    const created: string[] = [];
    for (const c of toCreate) {
      const id = crypto.randomUUID();
      await DB.prepare("INSERT INTO classes(id,name,description,teacher_id) VALUES(?,?,?,?)").bind(id, c.name, "", user.id).run();
      await DB.prepare("INSERT INTO class_teachers(class_id,user_id,added_by) VALUES(?,?,?) ON CONFLICT DO NOTHING").bind(id, user.id, user.id).run();
      created.push(c.name);
    }
    return Response.json({ created });
  }
}}});
