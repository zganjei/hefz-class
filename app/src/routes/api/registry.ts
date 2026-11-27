import { createFileRoute } from "@tanstack/react-router";
import { bindings } from "../../lib/bindings.server";
import { currentUser, jsonError } from "../../lib/auth.server";
import { teacherKey, isNoTeacher } from "../../lib/teacher-name";

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
    if (user.role !== "admin") return jsonError("دسترسی فقط برای مدیر است.", 403);
    const { DB } = bindings(); if (!DB) return jsonError("پایگاه داده آماده نیست.", 503);
    const rows = await DB.prepare("SELECT * FROM registry_people ORDER BY kind, class_name, full_name").all();
    const people: any[] = (rows as any).results ?? rows;
    // «اساتید» = registry teacher rows + active staff accounts + teacher names found on registry students (same source/normalization as stats «به تفکیک استاد»).
    let noTeacher = 0;
    try {
      const byKey = new Map<string, any>();
      for (const r of people) if (r.kind === "teacher") { r.sources = ["registry"]; r.learners = 0; byKey.set(teacherKey(r.full_name), r); }
      const addCls = (row: any, names: string[]) => { const have = String(row.class_name || "").split("،").map((x) => x.trim()).filter(Boolean); for (const n of names) if (n && !have.includes(n)) have.push(n); row.class_name = have.join("، "); };
      const accs = ((await DB.prepare("SELECT id,display_name,role,phone,email FROM users WHERE role IN ('teacher','admin') AND active=1 ORDER BY display_name").all()) as any).results ?? [];
      const links = ((await DB.prepare("SELECT ct.user_id AS uid, c.name AS cname FROM class_teachers ct JOIN classes c ON c.id=ct.class_id UNION SELECT c.teacher_id AS uid, c.name AS cname FROM classes c").all()) as any).results ?? [];
      const byUser: Record<string, string[]> = {};
      for (const l of links) { (byUser[l.uid] ||= []); if (l.cname && !byUser[l.uid].includes(l.cname)) byUser[l.uid].push(l.cname); }
      for (const a of accs) {
        const cls = byUser[a.id] || [];
        if (a.role === "admin" && !cls.length) continue; // admins only appear when they teach a class
        const k = teacherKey(a.display_name); if (!k) continue;
        const hit = byKey.get(k);
        if (hit) { hit.sources.push("account"); addCls(hit, cls); continue; }
        const row = { id: "acct:" + a.id, kind: "teacher", full_name: a.display_name, class_name: "", phone: a.phone || "", email: a.email && !String(a.email).includes("@phone.") ? a.email : "", status: "active", sources: ["account"], learners: 0, readonly: true };
        addCls(row, cls); people.push(row); byKey.set(k, row);
      }
      const counts = new Map<string, { raw: Map<string, number>; n: number; cls: string[] }>();
      for (const st of people.filter((x) => x.kind === "student")) {
        if (st.status === "inactive") continue;
        if (isNoTeacher(st.teacher_name)) { noTeacher++; continue; }
        const k = teacherKey(st.teacher_name); let c = counts.get(k); if (!c) counts.set(k, c = { raw: new Map(), n: 0, cls: [] });
        const rw = String(st.teacher_name).trim();
        c.n++; c.raw.set(rw, (c.raw.get(rw) || 0) + 1);
        if (st.class_name && !c.cls.includes(st.class_name)) c.cls.push(st.class_name);
      }
      for (const [k, c] of counts) {
        let row = byKey.get(k);
        if (!row) {
          const best = [...c.raw.entries()].sort((x, y) => y[1] - x[1])[0][0];
          row = { id: "stu:" + k, kind: "teacher", full_name: best, class_name: "", status: "active", sources: [], learners: 0, readonly: true, derived: true };
          people.push(row); byKey.set(k, row);
        }
        row.sources.push("students"); row.learners = c.n; addCls(row, c.cls);
      }
      for (const r of people) if (r.kind === "teacher") r.has_account = r.sources.includes("account");
    } catch { /* class_teachers/phone may be missing in old DBs: registry rows still returned */ }
    return Response.json({ people, noTeacher });
  },
  POST: async ({ request }) => {
    const user = await currentUser(request); if (!user) return jsonError("ابتدا وارد شوید.", 401);
    if (user.role !== "admin") return jsonError("دسترسی فقط برای مدیر است.", 403);
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
