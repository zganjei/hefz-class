// Role model shared by server and client (pure, no DB). A person holds one OR several roles; effective permissions are the union.
export type AppRole = "memorizer" | "teacher" | "admin" | "supporter";
/** Legacy single role stored in users.role (DB CHECK allows only these three). */
export type LegacyRole = "admin" | "teacher" | "memorizer";
export const ALL_ROLES: AppRole[] = ["memorizer", "teacher", "admin", "supporter"];
export const ROLE_FA: Record<AppRole, string> = { memorizer: "قرآن‌آموز", teacher: "استاد", admin: "مدیر", supporter: "پشتیبان" };
type RoleHolder = { roles?: readonly string[] | null; role?: string | null } | null | undefined;

/** Keep only known roles, de-duplicated, in canonical order. */
export function normalizeRoles(list: unknown): AppRole[] {
  const set = new Set(Array.isArray(list) ? list.map(String) : []);
  return ALL_ROLES.filter(r => set.has(r));
}
/** Legacy users.role for a role set: highest of admin > teacher > memorizer; supporter-only maps to memorizer (CHECK constraint). */
export function primaryRole(roles: readonly string[]): LegacyRole {
  return roles.includes("admin") ? "admin" : roles.includes("teacher") ? "teacher" : "memorizer";
}
/** Roles of a user object; falls back to the legacy single role when roles[] is missing. */
export function rolesOf(user: RoleHolder): AppRole[] {
  if (!user) return [];
  const r = normalizeRoles(user.roles);
  if (r.length) return r;
  return normalizeRoles(user.role ? [user.role] : []);
}
export function hasRole(user: RoleHolder, role: AppRole): boolean { return rolesOf(user).includes(role); }
export const isAdmin = (user: RoleHolder) => hasRole(user, "admin");
export const isTeacher = (user: RoleHolder) => hasRole(user, "teacher");
export const isMemorizer = (user: RoleHolder) => hasRole(user, "memorizer");
/** Staff = may use class tools (admin or teacher). Supporter and memorizer alone are not staff. */
export const isStaff = (user: RoleHolder) => isAdmin(user) || isTeacher(user);
/** Teacher powers limited to own classes: has teacher but not admin. */
export const isTeacherOnly = (user: RoleHolder) => isTeacher(user) && !isAdmin(user);
export const rolesLabel = (roles: readonly string[]) => normalizeRoles(roles).map(r => ROLE_FA[r]).join("، ");

/**
 * SQL predicate: user aliased `a` holds role `r`. Users that somehow have no user_roles rows fall back to users.role.
 * Role is a fixed literal from ALL_ROLES (never user input).
 */
export function hasRoleSql(alias: string, r: AppRole): string {
  if (!ALL_ROLES.includes(r)) throw new Error("bad role");
  const legacy = r === "supporter" ? "FALSE" : `${alias}.role='${r}'`;
  return `(EXISTS (SELECT 1 FROM user_roles ur_${r} WHERE ur_${r}.user_id=${alias}.id AND ur_${r}.role='${r}') OR (NOT EXISTS (SELECT 1 FROM user_roles ur_any WHERE ur_any.user_id=${alias}.id) AND ${legacy}))`;
}

/** Guards for a role change; returns a Farsi message when refused, else null. otherAdmins = number of OTHER active admins. */
export async function checkRoleChange(current: AppRole[], next: AppRole[], self: boolean, otherAdmins: () => Promise<number>): Promise<string | null> {
  if (!next.length) return "دست‌کم یک نقش باید باقی بماند.";
  const losesAdmin = current.includes("admin") && !next.includes("admin");
  if (losesAdmin && self) return "نمی‌توانید نقش مدیر را از حساب خودتان بردارید.";
  if (losesAdmin && (await otherAdmins()) < 1) return "آخرین مدیر را نمی‌شود برداشت؛ ابتدا مدیر دیگری تعیین کنید.";
  return null;
}
