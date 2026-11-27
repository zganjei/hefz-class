import { useEffect, useState } from "react";

/**
 * In-app navigation lives in the URL hash: #classes, #classes/<classId>/<subTab>, #classes/<classId>/exams/<examId>, #exams/<examId>, #plan, #registry, #applications.
 * - top-level bottom-nav tabs use `replace` (Back never walks tab history)
 * - drilling in (open class, sub-tab, open exam) uses `push` (Back returns one level)
 * - a guard keeps Back at the app's top view from leaving to whatever page was before the app (e.g. the intro page).
 */
const EVT = "hefznav";
export const parseHash = (): string[] => {
  if (typeof window === "undefined") return [];
  let h = window.location.hash.slice(1);
  try { h = decodeURIComponent(h); } catch { /* keep raw */ }
  return h ? h.split("/") : [];
};
const toHash = (segs: string[]) => (segs.length ? "#" + segs.map(encodeURIComponent).join("/") : "");
const cur = () => { const s = window.history.state; return s && typeof s === "object" ? s : {}; };
let lastUrl = "";

export function navTo(segs: string[], mode: "push" | "replace" = "push") {
  try {
    const url = window.location.pathname + window.location.search + toHash(segs);
    if (url === window.location.pathname + window.location.search + window.location.hash) return;
    const from = window.location.hash.slice(1);
    if (mode === "push") window.history.pushState({ hefzDeep: true, from }, "", url);
    else window.history.replaceState(cur(), "", url);
    lastUrl = url;
    window.dispatchEvent(new Event(EVT));
  } catch { /* history unavailable: ignore */ }
}

/** Go to `segs`: if the previous entry is exactly that view, use real Back (no history growth), otherwise push it. */
export function goBack(segs: string[]) {
  const s = cur() as { hefzDeep?: boolean; from?: string };
  if (s.hefzDeep && (s.from ?? "") === toHash(segs).slice(1)) window.history.back();
  else navTo(segs, "push");
}

export function useNavSegs(): string[] {
  const [segs, setSegs] = useState<string[]>(parseHash);
  useEffect(() => {
    const sync = () => setSegs(parseHash());
    sync();
    window.addEventListener("popstate", sync);
    window.addEventListener("hashchange", sync);
    window.addEventListener(EVT, sync);
    return () => { window.removeEventListener("popstate", sync); window.removeEventListener("hashchange", sync); window.removeEventListener(EVT, sync); };
  }, []);
  return segs;
}

/**
 * Back-from-top guard. The entry the user arrived on is marked `hefzBase`. On the first user gesture (Chrome ignores history entries
 * added without one) a `hefzTop` entry is pushed above it. If Back ever lands on the base entry, the top view is pushed again, so
 * Back at the top of the app stays in the app. Browser refresh keeps the entries and their state.
 */
export function installBackGuard(): () => void {
  const s = cur() as Record<string, unknown>;
  if (!s.hefzBase && !s.hefzTop && !s.hefzDeep) { try { window.history.replaceState({ ...s, hefzBase: true }, "", window.location.href); } catch { /* ignore */ } }
  lastUrl = window.location.href;
  const top = () => { try { window.history.pushState({ hefzTop: true }, "", lastUrl || window.location.href); window.dispatchEvent(new Event(EVT)); } catch { /* ignore */ } };
  const arm = () => { if ((cur() as { hefzBase?: boolean }).hefzBase) top(); };
  const pop = () => { if ((cur() as { hefzBase?: boolean }).hefzBase) top(); else lastUrl = window.location.href; };
  const ev = ["pointerdown", "keydown", "touchstart"] as const;
  const once = () => { ev.forEach(e => window.removeEventListener(e, once, true)); arm(); };
  ev.forEach(e => window.addEventListener(e, once, true));
  window.addEventListener("popstate", pop);
  return () => { ev.forEach(e => window.removeEventListener(e, once, true)); window.removeEventListener("popstate", pop); };
}
