import type { bindings } from "./bindings.server";
import { addDays, type PlanDay } from "./plan.server";

type DB = NonNullable<ReturnType<typeof bindings>["DB"]>;
/** A program week shaped like a global plan week (week_number = week_index, start_date computed from the class start). */
export type ProgramWeekRow = { week_number: number; title: string; mushaf_page: number | null; mushaf_page2: number | null; start_date: string | null; days: PlanDay[] };
export type ClassProgram = { programId: string; name: string; classId: string; startDate: string; weeks: ProgramWeekRow[] };

/** The Saturday on or before an ISO date (plan weeks are Saturday-first). */
export function saturdayOnOrBefore(iso: string): string {
  const dow = new Date(iso + "T12:00:00Z").getUTCDay();   // Sat = 6
  return addDays(iso, -((dow + 1) % 7));
}

async function load(DB: DB, c: { class_id: string; program_id: string; program_start: string; name: string }): Promise<ClassProgram> {
  const rows = (await DB.prepare("SELECT week_index,title,days FROM hefz_program_weeks WHERE program_id=? ORDER BY week_index").bind(c.program_id).all<{ week_index: number; title: string; days: PlanDay[] }>()).results || [];
  return { programId: c.program_id, name: c.name, classId: c.class_id, startDate: c.program_start,
    weeks: rows.map((r, i) => ({ week_number: r.week_index, title: r.title, mushaf_page: null, mushaf_page2: null, start_date: addDays(c.program_start, 7 * i), days: r.days })) };
}

/** The program a class follows, or null (class without a program keeps the global plan). */
export async function programForClass(DB: DB, classId: string): Promise<ClassProgram | null> {
  const c = await DB.prepare("SELECT c.id AS class_id,c.program_id,c.program_start::text AS program_start,p.name FROM classes c JOIN hefz_programs p ON p.id=c.program_id WHERE c.id=? AND c.program_start IS NOT NULL").bind(classId).first<any>();
  return c ? load(DB, c) : null;
}
/** A learner's program: the one of the class they joined first that has a program (null: global plan). */
export async function programForUser(DB: DB, userId: string): Promise<ClassProgram | null> {
  const c = await DB.prepare("SELECT c.id AS class_id,c.program_id,c.program_start::text AS program_start,p.name FROM class_members m JOIN classes c ON c.id=m.class_id JOIN hefz_programs p ON p.id=c.program_id WHERE m.user_id=? AND c.program_start IS NOT NULL ORDER BY m.joined_at,c.id LIMIT 1").bind(userId).first<any>();
  return c ? load(DB, c) : null;
}

const dayDiff = (from: string, to: string) => Math.round((Date.parse(to + "T12:00:00Z") - Date.parse(from + "T12:00:00Z")) / 86400000);
export type ClassPosition = { hasProgram: boolean; program: string | null; status: "none" | "before" | "running" | "ended"; weekCount: number; weekIndex: number; currentWeek: { week_number: number; title: string } | null };

/** Where a class really is in ITS program today. A class without a program has no position here (the global date-based plan is not a class position). */
export function positionOf(prog: ClassProgram | null, today: string): ClassPosition {
  if (!prog) return { hasProgram: false, program: null, status: "none", weekCount: 0, weekIndex: -1, currentWeek: null };
  const n = prog.weeks.length, raw = Math.floor(dayDiff(prog.startDate, today) / 7);
  const weekIndex = Math.max(-1, Math.min(n, raw));   // -1: not started, n: finished
  const w = weekIndex >= 0 && weekIndex < n ? prog.weeks[weekIndex] : null;
  return { hasProgram: true, program: prog.name, status: weekIndex < 0 ? "before" : weekIndex >= n ? "ended" : "running", weekCount: n, weekIndex, currentWeek: w ? { week_number: w.week_number, title: w.title } : null };
}

/** Moves the class so that today falls in week `index` (0-based) of its program: shifts program_start, the existing mechanism, so learners follow. */
export async function setClassWeek(DB: DB, classId: string, index: number, today: string): Promise<string> {
  const start = addDays(saturdayOnOrBefore(today), -7 * index);
  await DB.prepare("UPDATE classes SET program_start=? WHERE id=? AND program_id IS NOT NULL").bind(start, classId).run();
  return start;
}
