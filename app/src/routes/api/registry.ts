import { createFileRoute } from "@tanstack/react-router";
import { bindings } from "../../lib/bindings.server";
import { currentUser, jsonError } from "../../lib/auth.server";
import { hasRoleSql, isAdmin } from "../../lib/roles";
import { mergeRegistryAccounts } from "../../lib/registry-merge";

const FIELDS = ["full_name","code","class_name","teacher_name","class_day","class_time","level","education","hifz_amount","tadabbur_amount","phone","bale_number","bale_id","email","resume","notes","status"] as const;
const KINDS = ["student","teacher","supporter"];
const clean = (v: unknown, max = 2000) => (typeof v === "string" || typeof v === "number") ? String(v).trim().slice(0, max) : "";
function rowValues(r: Record<string, unknown>) {
  const o: Record<string, string> = {};
  for (const f of FIELDS) o[f] = clean(r[f], f === "resume" || f === "notes" ? 4000 : 300);
  if (o.status !== "inactive") o.status = "active";
  return o;
}

export const Route = createFileRoute("/api/registry")({ server: { handlers: {
  GET: async ({ request }) => {
    const user = await currentUser(request); if (!user) return jsonError("ابتدا وارد شوید.", 401);
    if (!isAdmin(user)) return jsonError("دسترسی فقط برای مدیر است.", 403);
    const { DB } = bindings(); if (!DB) return jsonError("پایگاه داده آماده نیست.", 503);
    const rows = await DB.prepare("SELECT * FROM registry_people ORDER BY kind, class_name, full_name").all();
    const people: any[] = (rows as any).results ?? rows;
    // «اساتید» = registry teacher rows + accounts that HOLD the teacher role + teacher names found on registry students.
    // «پشتیبان‌ها» = registry supporter rows + accounts that hold the supporter role. Being admin (or attached to a class) does not make anyone a teacher.
    let noTeacher = 0;
    try {
      const accs = ((await DB.prepare("SELECT u.id,u.display_name,u.phone,u.email FROM users u WHERE u.active=1 AND " + hasRoleSql("u", "teacher") + " ORDER BY u.display_name").all()) as any).results ?? [];
      const sups = ((await DB.prepare("SELECT u.id,u.display_name,u.phone,u.email FROM users u WHERE u.active=1 AND " + hasRoleSql("u", "supporter") + " ORDER BY u.display_name").all()) as any).results ?? [];
      const links = ((await DB.prepare("SELECT ct.user_id AS uid, c.name AS cname FROM class_teachers ct JOIN classes c ON c.id=ct.class_id UNION SELECT c.teacher_id AS uid, c.name AS cname FROM classes c").all()) as any).results ?? [];
      noTeacher = mergeRegistryAccounts(people, accs, sups, links);
    } catch { /* class_teachers/phone/user_roles may be missing in old DBs: registry rows still returned */ }
    return Response.json({ people, noTeacher });
  },
  POST: async ({ request }) => {
    const user = await currentUser(request); if (!user) return jsonError("ابتدا وارد شوید.", 401);
    if (!isAdmin(user)) return jsonError("دسترسی فقط برای مدیر است.", 403);
    const { DB } = bindings(); if (!DB) return jsonError("پایگاه داده آماده نیست.", 503);
    const body = await request.json().catch(() => null) as Record<string, any> | null;
    if (!body) return jsonError("درخواست نامعتبر است.");
    const action = body.action;
    if (action === "delete") {
      const id = clean(body.id, 100); if (!id) return jsonError("شناسه لازم است.");
      await DB.prepare("DELETE FROM registry_people WHERE id=?").bind(id).run();
      return Response.json({ ok: true });
    }
    if (action === "save") {
      const kind = clean(body.kind, 20); if (!KINDS.includes(kind)) return jsonError("نوع نامعتبر است.");
      const v = rowValues(body.person || {}); if (!v.full_name) return jsonError("نام لازم است.");
      const id = clean(body.person?.id, 100);
      if (id) {
        await DB.prepare(`UPDATE registry_people SET ${FIELDS.map(f => f + "=?").join(",")},updated_at=CURRENT_TIMESTAMP WHERE id=? AND kind=?`).bind(...FIELDS.map(f => v[f]), id, kind).run();
        return Response.json({ ok: true, id });
      }
      const nid = crypto.randomUUID();
      await DB.prepare(`INSERT INTO registry_people(id,kind,${FIELDS.join(",")},created_by) VALUES(?,?,${FIELDS.map(() => "?").join(",")},?)`).bind(nid, kind, ...FIELDS.map(f => v[f]), user.id).run();
      return Response.json({ ok: true, id: nid });
    }
    if (action === "import") {
      const kind = clean(body.kind, 20); if (!KINDS.includes(kind)) return jsonError("نوع نامعتبر است.");
      const rows = Array.isArray(body.rows) ? body.rows.slice(0, 2000) : [];
      let added = 0, updated = 0, skipped = 0;
      for (const r of rows) {
        const v = rowValues(r || {});
        if (!v.full_name) { skipped++; continue; }
        const extra = r?.extra && typeof r.extra === "object" ? JSON.stringify(r.extra).slice(0, 8000) : null;
        let existing: any = null;
        if (v.code) existing = await DB.prepare("SELECT id FROM registry_people WHERE kind=? AND code=?").bind(kind, v.code).first();
        else {
          const same = await DB.prepare("SELECT id,class_name FROM registry_people WHERE kind=? AND full_name=?").bind(kind, v.full_name).all();
          const list: any[] = (same as any).results ?? same ?? [];
          const base = (c: string) => c.replace(/^(کلاس|گروه)\s+/, "").trim();
          // same name in the same class, or in a class whose name is a shorter form of this one (e.g. "کلاس شهید" -> "گروه شهید معماریان")
          existing = list.find(x => (x.class_name || "") === v.class_name) || list.find(x => !x.class_name || (base(x.class_name) && base(v.class_name).includes(base(x.class_name)))) || null;
        }
        if (existing) {
          await DB.prepare(`UPDATE registry_people SET ${FIELDS.map(f => f + "=?").join(",")},extra=COALESCE(?,extra),updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(...FIELDS.map(f => v[f]), extra, existing.id).run(); updated++;
        } else {
          await DB.prepare(`INSERT INTO registry_people(id,kind,${FIELDS.join(",")},extra,created_by) VALUES(?,?,${FIELDS.map(() => "?").join(",")},?,?)`).bind(crypto.randomUUID(), kind, ...FIELDS.map(f => v[f]), extra, user.id).run(); added++;
        }
      }
      return Response.json({ ok: true, added, updated, skipped });
    }
    return jsonError("عملیات نامعتبر است.");
  },
}}});
