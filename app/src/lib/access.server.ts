import { bindings } from "./bindings.server";
import type { SessionUser } from "./auth.server";
import { isAdmin, isTeacher } from "./roles";

type DB = NonNullable<ReturnType<typeof bindings>["DB"]>;

/** SQL predicate for "teacher <user> teaches class aliased c". Bind: (userId, userId). */
export const TEACHES_CLASS_SQL = "(c.teacher_id=? OR EXISTS (SELECT 1 FROM class_teachers ct WHERE ct.class_id=c.id AND ct.user_id=?))";

/** Has admin role: any existing class. Else has teacher role: only classes they own or are mapped to in class_teachers. Else (learner/supporter only): never. */
export async function canManageClass(DB: DB, user: SessionUser, classId: string | null | undefined): Promise<boolean> {
  if (!classId) return false;
  if (isAdmin(user)) return !!(await DB.prepare("SELECT 1 AS ok FROM classes WHERE id=?").bind(classId).first());
  if (!isTeacher(user)) return false;
  return !!(await DB.prepare(`SELECT 1 AS ok FROM classes c WHERE c.id=? AND ${TEACHES_CLASS_SQL}`).bind(classId, user.id, user.id).first());
}

/** A course is managed through its class. Legacy courses without a class fall back to their creator. */
export async function canManageCourseRow(DB: DB, user: SessionUser, course: { class_id: string | null; created_by: string } | null): Promise<boolean> {
  if (!course) return false;
  if (isAdmin(user)) return true;
  if (!isTeacher(user)) return false;
  if (course.class_id) return canManageClass(DB, user, course.class_id);
  return course.created_by === user.id;
}
