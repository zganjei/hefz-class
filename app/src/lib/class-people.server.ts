import { bindings } from "./bindings.server";
import { normClassName } from "./class-name";

type DB = NonNullable<ReturnType<typeof bindings>["DB"]>;

export type Person = {
  /** Stable id of a learner inside the class: the registry person when there is one ("r:<id>"), else the site user ("u:<id>"). */
  key: string; registryId: string | null; userId: string | null; name: string; registered: boolean;
  phone: string | null; email: string | null; code: string | null; level: string | null; education: string | null;
  hifzAmount: string | null; tadabburAmount: string | null; notes: string | null;
  /** "left" when the last logged event for this class is a departure. */
  status: "active" | "left";
};

export type HistoryEvent = { id: string; classId: string | null; className: string | null; event: "left" | "returned"; term: string; position: string; reason: string; date: string };

const tail = (s: unknown) => String(s ?? "").replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[^0-9]/g, "").slice(-10);

export async function registryStudents(DB: DB) {
  return ((await DB.prepare("SELECT id,full_name,code,class_name,level,education,hifz_amount,tadabbur_amount,phone,notes FROM registry_people WHERE kind='student' AND status='active' ORDER BY full_name").all<any>()).results || []);
}

/** The people of a class: signed-in members (learner accounts) matched to the registry by phone or name, plus registry students of this class who have not signed in yet.
 *  Same matching as the teacher roster. Contains no national IDs. */
export async function classPeople(DB: DB, classId: string, registry?: any[]): Promise<{ cls: { id: string; name: string }; people: Person[] } | null> {
  const cls = await DB.prepare("SELECT id,name FROM classes WHERE id=?").bind(classId).first<{ id: string; name: string }>();
  if (!cls) return null;
  const cn = normClassName(cls.name);
  const reg = (registry ?? await registryStudents(DB)).filter(r => { const rn = normClassName(r.class_name); return rn.length >= 3 && cn.length >= 3 && (rn === cn || rn.includes(cn) || cn.includes(rn)); });
  const users = (await DB.prepare("SELECT u.id,u.display_name,u.email,u.phone FROM class_members m JOIN users u ON u.id=m.user_id WHERE m.class_id=? AND u.role='memorizer' AND u.active=1 ORDER BY u.display_name").bind(classId).all<any>()).results || [];
  const used = new Set<string>(), people: Person[] = [];
  for (const u of users) {
    const r = reg.find(x => !used.has(x.id) && ((tail(x.phone) && tail(x.phone) === tail(u.phone)) || normClassName(x.full_name) === normClassName(u.display_name)));
    if (r) used.add(r.id);
    people.push({ key: r ? "r:" + r.id : "u:" + u.id, registryId: r?.id ?? null, userId: u.id, name: u.display_name, registered: true, phone: u.phone || r?.phone || null, email: u.email || null, code: r?.code || null, level: r?.level || null, education: r?.education || null, hifzAmount: r?.hifz_amount || null, tadabburAmount: r?.tadabbur_amount || null, notes: r?.notes || null, status: "active" });
  }
  for (const r of reg) if (!used.has(r.id)) people.push({ key: "r:" + r.id, registryId: r.id, userId: null, name: r.full_name, registered: false, phone: r.phone || null, email: null, code: r.code || null, level: r.level || null, education: r.education || null, hifzAmount: r.hifz_amount || null, tadabburAmount: r.tadabbur_amount || null, notes: r.notes || null, status: "active" });
  // Left/returned: the last event of this class decides. Matching is by registry person or site user.
  const ev = (await DB.prepare("SELECT registry_id,user_id,event FROM learner_history WHERE class_id=? ORDER BY created_at, id").bind(classId).all<any>()).results || [];
  for (const p of people) { const mine = ev.filter(e => (p.registryId && e.registry_id === p.registryId) || (p.userId && e.user_id === p.userId)); if (mine.length && mine[mine.length - 1].event === "left") p.status = "left"; }
  return { cls, people };
}

/** The full log of a person (all classes the viewer may see; pass null for every class). Contains free-text reasons: only for staff of those classes, never logged. */
export async function personHistory(DB: DB, p: { registryId: string | null; userId: string | null }, classIds: Set<string> | null): Promise<HistoryEvent[]> {
  if (!p.registryId && !p.userId) return [];
  const rows = (await DB.prepare("SELECT id,class_id,class_name,event,term,position_note,reason,event_date::text AS event_date FROM learner_history WHERE (registry_id IS NOT NULL AND registry_id=?) OR (user_id IS NOT NULL AND user_id=?) ORDER BY created_at, id").bind(p.registryId, p.userId).all<any>()).results || [];
  return rows.filter(r => !classIds || (r.class_id && classIds.has(r.class_id))).map(r => ({ id: r.id, classId: r.class_id, className: r.class_name, event: r.event, term: r.term || "", position: r.position_note || "", reason: r.reason || "", date: r.event_date }));
}
