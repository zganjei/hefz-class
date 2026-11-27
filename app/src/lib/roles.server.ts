import { bindings } from "./bindings.server";
import { type AppRole, normalizeRoles, primaryRole, rolesOf } from "./roles";
export * from "./roles";

type DB = NonNullable<ReturnType<typeof bindings>["DB"]>;

/** Roles of a user from user_roles; falls back to the legacy users.role (also if the table is missing/empty). */
export async function getRoles(DB: DB, userId: string, legacyRole?: string | null): Promise<AppRole[]> {
  try {
    const rows = ((await DB.prepare("SELECT role FROM user_roles WHERE user_id=?").bind(userId).all<{ role: string }>()).results || []).map(r => r.role);
    const roles = normalizeRoles(rows);
    if (roles.length) return roles;
  } catch { /* migration not applied yet */ }
  if (legacyRole === undefined) {
    const u = await DB.prepare("SELECT role FROM users WHERE id=?").bind(userId).first<{ role: string }>();
    legacyRole = u?.role;
  }
  return normalizeRoles(legacyRole ? [legacyRole] : []);
}

/** Replace a person's roles (non-empty, validated) and keep the legacy users.role in sync. Caller enforces guards. */
export async function setRoles(DB: DB, userId: string, roles: unknown): Promise<AppRole[]> {
  const next = normalizeRoles(roles);
  if (!next.length) throw new Error("no roles");
  for (const r of next) await DB.prepare("INSERT INTO user_roles (user_id,role) VALUES (?,?) ON CONFLICT DO NOTHING").bind(userId, r).run();
  await DB.prepare(`DELETE FROM user_roles WHERE user_id=? AND role NOT IN (${next.map(() => "?").join(",")})`).bind(userId, ...next).run();
  await DB.prepare("UPDATE users SET role=? WHERE id=?").bind(primaryRole(next), userId).run();
  return next;
}

/** Attach roles[] to a user row (legacy role is kept as the primary/highest). */
export async function withRoles<T extends { id: string; role: string }>(DB: DB, u: T): Promise<T & { roles: AppRole[] }> {
  const roles = await getRoles(DB, u.id, u.role);
  return { ...u, role: primaryRole(roles) as any, roles };
}
export { rolesOf };
