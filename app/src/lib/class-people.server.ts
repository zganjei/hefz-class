import { bindings } from "./bindings.server";
import { normClassName } from "./class-name";

type DB = NonNullable<ReturnType<typeof bindings>["DB"]>;

export type Person = {
  /** Stable id of a learner inside the class: the registry person when there is one ("r:<id>"), else the site user ("u:<id>"). */
  key: string; registryId: string | null; userId: string | null; name: string; registered: boolean;
  phone: string | null; email: string | null; code: string | null; level: string | null; education: string | null;
  hifzAmount: string | null; tadabburAmount: string | null; notes: string | null;
};

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
    people.push({ key: r ? "r:" + r.id : "u:" + u.id, registryId: r?.id ?? null, userId: u.id, name: u.display_name, registered: true, phone: u.phone || r?.phone || null, email: u.email || null, code: r?.code || null, level: r?.level || null, education: r?.education || null, hifzAmount: r?.hifz_amount || null, tadabburAmount: r?.tadabbur_amount || null, notes: r?.notes || null });
  }
  for (const r of reg) if (!used.has(r.id)) people.push({ key: "r:" + r.id, registryId: r.id, userId: null, name: r.full_name, registered: false, phone: r.phone || null, email: null, code: r.code || null, level: r.level || null, education: r.education || null, hifzAmount: r.hifz_amount || null, tadabburAmount: r.tadabbur_amount || null, notes: r.notes || null });
  return { cls, people };
}
