/** Video links: URL recognition and field validation. Pure (shared by server and client); nothing here fetches anything. */
export type VideoProvider = "youtube" | "aparat" | "drive" | "file" | "link";
export type VideoKind = "tadabbur" | "lesson" | "other";
export const VIDEO_KINDS: VideoKind[] = ["tadabbur", "lesson", "other"];
export const KIND_FA: Record<VideoKind, string> = { tadabbur: "تدبر", lesson: "درس", other: "دیگر" };
export type ParsedVideoUrl = { url: string; provider: VideoProvider; /** iframe src (youtube/aparat/drive) or the file URL (file); null for a plain link */ embed: string | null };

const YT_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"]);
const YT_ID = /^[A-Za-z0-9_-]{11}$/, APARAT_ID = /^[A-Za-z0-9]{3,40}$/, DRIVE_ID = /^[A-Za-z0-9_-]{10,100}$/;

/** http(s) only, no credentials, bounded length. Returns the normalised URL or null. */
export function safeHttpUrl(raw: unknown): URL | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s || s.length > 500 || /[\s<>"'`\\]/.test(s)) return null;
  let u: URL; try { u = new URL(s); } catch { return null; }
  if ((u.protocol !== "https:" && u.protocol !== "http:") || !u.hostname || u.username || u.password) return null;
  return u;
}

export function parseVideoUrl(raw: unknown): ParsedVideoUrl | null {
  const u = safeHttpUrl(raw); if (!u) return null;
  const url = u.toString(), host = u.hostname.toLowerCase(), parts = u.pathname.split("/").filter(Boolean);
  const yt = (id: string | null | undefined) => id && YT_ID.test(id) ? { url, provider: "youtube" as const, embed: `https://www.youtube-nocookie.com/embed/${id}?rel=0` } : null;
  if (host === "youtu.be") { const r = yt(parts[0]); if (r) return r; }
  if (YT_HOSTS.has(host)) {
    if (parts[0] === "watch") { const r = yt(u.searchParams.get("v")); if (r) return r; }
    if (["shorts", "embed", "live", "v"].includes(parts[0])) { const r = yt(parts[1]); if (r) return r; }
  }
  if ((host === "aparat.com" || host === "www.aparat.com") && parts[0] === "v" && APARAT_ID.test(parts[1] || "")) return { url, provider: "aparat", embed: `https://www.aparat.com/video/video/embed/videohash/${parts[1]}/vt/frame` };
  if (host === "drive.google.com") {
    const id = parts[0] === "file" && parts[1] === "d" ? parts[2] : parts[0] === "open" ? u.searchParams.get("id") : null;
    if (id && DRIVE_ID.test(id)) return { url, provider: "drive", embed: `https://drive.google.com/file/d/${id}/preview` };
  }
  // direct files: https only (a page served over https cannot play http media)
  if (u.protocol === "https:" && /\.(mp4|webm)$/i.test(u.pathname)) return { url, provider: "file", embed: url };
  return { url, provider: "link", embed: null };
}

export type VideoInput = { title: string; kind: VideoKind; url: string; provider: VideoProvider; description: string; duration_text: string; range_note: string; sort_order: number };
const clean = (v: unknown, max: number) => (typeof v === "string" || typeof v === "number" ? String(v) : "").replace(/\s+/g, " ").trim().slice(0, max);

/** Validates admin input. Returns the cleaned record or a Farsi error. Text fields may not contain HTML angle brackets. */
export function validateVideoInput(b: Record<string, unknown>): { ok: true; value: VideoInput } | { ok: false; error: string } {
  const title = clean(b.title, 121), description = clean(b.description, 501), duration_text = clean(b.duration_text, 21), range_note = clean(b.range_note, 81);
  if (title.length < 2) return { ok: false, error: "عنوان ویدئو را بنویسید (حداقل ۲ حرف)." };
  if (title.length > 120) return { ok: false, error: "عنوان حداکثر ۱۲۰ حرف باشد." };
  if (description.length > 500) return { ok: false, error: "توضیح حداکثر ۵۰۰ حرف باشد." };
  if (duration_text.length > 20) return { ok: false, error: "مدت ویدئو حداکثر ۲۰ حرف باشد." };
  if (range_note.length > 80) return { ok: false, error: "محدودهٔ آیات حداکثر ۸۰ حرف باشد." };
  if ([title, description, duration_text, range_note].some(s => /[<>]/.test(s))) return { ok: false, error: "متن‌ها نباید شامل علامت‌های < یا > باشند." };
  const kind = (VIDEO_KINDS as string[]).includes(String(b.kind)) ? (b.kind as VideoKind) : "tadabbur";
  const p = parseVideoUrl(b.url);
  if (!p) return { ok: false, error: "نشانی ویدئو معتبر نیست؛ باید با http:// یا https:// شروع شود (حداکثر ۵۰۰ حرف، بدون فاصله)." };
  const so = Number(b.sort_order);
  return { ok: true, value: { title, kind, url: p.url, provider: p.provider, description, duration_text, range_note, sort_order: Number.isInteger(so) ? Math.max(-9999, Math.min(9999, so)) : 0 } };
}

/** What a learner's browser receives for a video: the embed URL is derived on the server from the stored URL, never taken from the client. `seen`/`total` only for teachers. */
export type VideoView = { id: string; title: string; kind: VideoKind; description: string; duration: string; range: string; provider: VideoProvider; url: string; embed: string | null; watched: boolean; seen?: number; total?: number };
