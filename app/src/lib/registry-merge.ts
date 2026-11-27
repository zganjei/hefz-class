import { teacherKey, isNoTeacher } from "./teacher-name";

type Acc = { id: string; display_name: string; phone?: string | null; email?: string | null };
type Link = { uid: string; cname: string | null };

const cleanEmail = (e: unknown) => (e && !String(e).includes("@phone.") ? String(e) : "");

/**
 * Pure merge behind «دفتر → اساتید» and «دفتر → پشتیبان‌ها» (mutates `people`, returns the number of active learners without a teacher).
 * `teacherAccounts` / `supporterAccounts` must ALREADY be filtered to people who hold that role: nobody is added merely because they are an
 * admin or are attached to a class. Teacher names on learners (students) create derived rows. No duplicates by normalized name (teacherKey).
 */
export function mergeRegistryAccounts(people: any[], teacherAccounts: Acc[], supporterAccounts: Acc[], links: Link[]): number {
  const byUser: Record<string, string[]> = {};
  for (const l of links) { (byUser[l.uid] ||= []); if (l.cname && !byUser[l.uid].includes(l.cname)) byUser[l.uid].push(l.cname); }
  const addCls = (row: any, names: string[]) => { const have = String(row.class_name || "").split("،").map((x) => x.trim()).filter(Boolean); for (const n of names) if (n && !have.includes(n)) have.push(n); row.class_name = have.join("، "); };

  // teachers
  const byKey = new Map<string, any>();
  for (const r of people) if (r.kind === "teacher") { r.sources = ["registry"]; r.learners = 0; byKey.set(teacherKey(r.full_name), r); }
  for (const a of teacherAccounts) {
    const cls = byUser[a.id] || [];
    const k = teacherKey(a.display_name); if (!k) continue;
    const hit = byKey.get(k);
    if (hit) { if (!hit.sources.includes("account")) hit.sources.push("account"); addCls(hit, cls); continue; }
    const row = { id: "acct:" + a.id, kind: "teacher", full_name: a.display_name, class_name: "", phone: a.phone || "", email: cleanEmail(a.email), status: "active", sources: ["account"], learners: 0, readonly: true };
    addCls(row, cls); people.push(row); byKey.set(k, row);
  }
  let noTeacher = 0;
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

  // supporters
  const sKey = new Map<string, any>();
  for (const r of people) if (r.kind === "supporter") { r.sources = ["registry"]; sKey.set(teacherKey(r.full_name), r); }
  for (const a of supporterAccounts) {
    const k = teacherKey(a.display_name); if (!k) continue;
    const hit = sKey.get(k);
    if (hit) { if (!hit.sources.includes("account")) hit.sources.push("account"); continue; }
    const row = { id: "acct:" + a.id, kind: "supporter", full_name: a.display_name, class_name: "", phone: a.phone || "", email: cleanEmail(a.email), status: "active", sources: ["account"], readonly: true };
    people.push(row); sKey.set(k, row);
  }
  for (const r of people) if (r.kind === "supporter") r.has_account = r.sources.includes("account");
  return noTeacher;
}
