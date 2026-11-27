import { normClassName } from "./class-name";
import { normalizePhone } from "./phone-auth.server";

type DB = any;
const tail10 = (p: unknown) => { const n = normalizePhone(p); return n ? n.slice(-10) : ""; };
const normEmail = (e: unknown) => String(e ?? "").trim().toLowerCase();

/** One class per normalised name. If duplicates exist (e.g. «کلاس X» and «X»), prefer the one with a real teacher, then the name without the «کلاس» prefix, then the oldest. */
export async function classByNormName(DB: DB): Promise<Map<string, string>> {
  const rows = ((await DB.prepare("SELECT c.id,c.name,c.created_at::text AS created_at,EXISTS(SELECT 1 FROM class_teachers ct JOIN users u ON u.id=ct.user_id WHERE ct.class_id=c.id AND u.role='teacher' AND u.active=1) AS has_teacher FROM classes c").all()).results || []) as any[];
  const score = (r: any) => (r.has_teacher ? 0 : 4) + (/^\s*کلاس(\s|$)/.test(String(r.name)) ? 2 : 0);
  const best = new Map<string, any>();
  for (const r of rows) {
    const k = normClassName(r.name); if (!k) continue;
    const b = best.get(k);
    if (!b || score(r) < score(b) || (score(r) === score(b) && String(r.created_at) < String(b.created_at))) best.set(k, r);
  }
  return new Map([...best].map(([k, r]) => [k, r.id as string]));
}

type RegStudent = { id: string; full_name: string; class_name: string | null; phone: string | null; email: string | null };
const activeStudents = async (DB: DB) => ((await DB.prepare("SELECT id,full_name,class_name,phone,email FROM registry_people WHERE kind='student' AND status='active'").all()).results || []) as RegStudent[];

/** Cheap and idempotent: for one learner account, add memberships to the class named in the matching registry row (by phone or email). Never removes anything; only touches role 'memorizer'. */
export async function enrollFromRegistry(DB: DB, user: { id: string; role?: string; email?: string | null; phone?: string | null }) {
  try {
    if (!DB || user.role !== "memorizer") return 0;
    let phone = user.phone ?? null;
    if (phone === null || phone === undefined) phone = ((await DB.prepare("SELECT phone FROM users WHERE id=?").bind(user.id).first())?.phone as string | null) ?? null;
    const t = tail10(phone), e = normEmail(user.email);
    if (!t && !e) return 0;
    const students = (await activeStudents(DB)).filter(s => (t && tail10(s.phone) === t) || (e && normEmail(s.email) === e));
    if (!students.length) return 0;
    const classes = await classByNormName(DB);
    let added = 0;
    for (const s of students) {
      const cid = classes.get(normClassName(s.class_name)); if (!cid) continue;
      const r = await DB.prepare("INSERT INTO class_members (class_id,user_id) VALUES (?,?) ON CONFLICT DO NOTHING").bind(cid, user.id).run();
      if ((r?.meta?.changes ?? r?.rowCount ?? 0) > 0) added++;
    }
    return added;
  } catch { return 0; } // never block a login
}

export type MemberStatus = "in_class" | "to_add" | "no_account" | "no_class";
/** Per active registry student: status + the account it matched. Used for the admin preview/confirm and the per-row badge. */
export async function registryMemberPlan(DB: DB) {
  const students = await activeStudents(DB);
  const classes = await classByNormName(DB);
  const users = ((await DB.prepare("SELECT id,email,phone FROM users WHERE active=1 AND role='memorizer'").all()).results || []) as any[];
  const byPhone = new Map<string, string>(), byEmail = new Map<string, string>();
  for (const u of users) { const t = tail10(u.phone); if (t && !byPhone.has(t)) byPhone.set(t, u.id); const e = normEmail(u.email); if (e && !e.endsWith("@phone.invalid") && !byEmail.has(e)) byEmail.set(e, u.id); }
  const members = new Set(((await DB.prepare("SELECT class_id,user_id FROM class_members").all()).results || []).map((m: any) => m.class_id + "|" + m.user_id));
  const status: Record<string, MemberStatus> = {}; const toAdd: { classId: string; userId: string }[] = [];
  const missingClasses = new Map<string, number>();
  for (const s of students) {
    const cid = classes.get(normClassName(s.class_name));
    if (!cid) { status[s.id] = "no_class"; const n = String(s.class_name || "").replace(/\s+/g, " ").trim() || "(بدون کلاس)"; missingClasses.set(n, (missingClasses.get(n) || 0) + 1); continue; }
    const uid = (tail10(s.phone) && byPhone.get(tail10(s.phone))) || (normEmail(s.email) && byEmail.get(normEmail(s.email))) || "";
    if (!uid) { status[s.id] = "no_account"; continue; }
    if (members.has(cid + "|" + uid)) { status[s.id] = "in_class"; continue; }
    status[s.id] = "to_add"; toAdd.push({ classId: cid, userId: uid });
  }
  const count = (v: MemberStatus) => Object.values(status).filter(x => x === v).length;
  return { status, toAdd, counts: { toAdd: count("to_add"), inClass: count("in_class"), noAccount: count("no_account"), noClass: count("no_class") }, missingClasses: [...missingClasses].map(([name, students]) => ({ name, students })) };
}
