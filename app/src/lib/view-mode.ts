// Active VIEW (UI mode only): which of the person's roles the screens and bottom nav are showing. Server permissions never depend on it.
import { rolesOf, type AppRole } from "./roles";
export const VIEW_ROLES: AppRole[] = ["admin", "teacher", "memorizer"];   // supporter has no screens
/** Roles the person can switch between, highest first. */
export function viewRolesOf(user: { roles?: readonly string[] | null; role?: string | null } | null | undefined): AppRole[] {
  const have = rolesOf(user);
  return VIEW_ROLES.filter(r => have.includes(r));
}
/** Stored choice when still valid, otherwise the highest role (admin > teacher > memorizer); null when no screens exist for the person. */
export function resolveView(user: Parameters<typeof viewRolesOf>[0], stored: string | null | undefined): AppRole | null {
  const roles = viewRolesOf(user);
  return roles.find(r => r === stored) ?? roles[0] ?? null;
}
/** Bottom-nav tabs of a view («profile» is reached from the header, never from the bar). */
export function tabsForView(view: AppRole | null): string[] {
  if (view === "admin") return ["classes", "registry", "applications"];
  if (view === "teacher") return ["classes"];
  if (view === "memorizer") return ["plan", "exams"];
  return [];
}
export const viewKey = (userId: string) => "hefz-view:" + userId;
export function readStoredView(userId: string): string | null { try { return window.localStorage.getItem(viewKey(userId)); } catch { return null; } }
export function storeView(userId: string, view: string) { try { window.localStorage.setItem(viewKey(userId), view); } catch { /* storage blocked: the view still switches for this session */ } }
