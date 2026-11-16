import { bindings } from "./bindings.server";

const encoder = new TextEncoder();
const DAY = 60 * 60 * 24;
export type Role = "admin" | "teacher" | "memorizer";
export type SessionUser = { id: string; email: string; display_name: string; role: Role };

function b64(bytes: Uint8Array) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64(value: string) {
  const raw = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}
async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 210000 }, key, 256);
  return `pbkdf2:${b64(salt)}:${b64(new Uint8Array(bits))}`;
}
async function verifyPassword(password: string, stored: string) {
  const [scheme, saltText, hashText] = stored.split(":");
  if (scheme !== "pbkdf2" || !saltText || !hashText) return false;
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: fromB64(saltText), iterations: 210000 }, key, 256));
  const expected = fromB64(hashText);
  if (bits.length !== expected.length) return false;
  let diff = 0; for (let i = 0; i < bits.length; i++) diff |= bits[i] ^ expected[i]; return diff === 0;
}
export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}
export async function currentUser(request: Request): Promise<SessionUser | null> {
  const token = request.headers.get("Cookie")?.split(";").map(x => x.trim()).find(x => x.startsWith("hifz_session="))?.slice(13);
  if (!token) return null;
  const { DB } = bindings();
  if (!DB) return null;
  const row = await DB.prepare("SELECT u.id,u.email,u.display_name,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=? AND s.expires_at>? AND u.active=1").bind(token, new Date().toISOString()).first<SessionUser>();
  return row ?? null;
}
export function sessionCookie(token: string, maxAge = DAY * 14) {
  return `hifz_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}
export async function login(request: Request, email: string, password: string) {
  const { DB } = bindings();
  if (!DB) return jsonError("پایگاه داده آماده نیست.", 503);
  const user = await DB.prepare("SELECT id,email,display_name,role,password_hash FROM users WHERE email=? AND active=1").bind(email.toLowerCase()).first<SessionUser & { password_hash: string }>();
  if (!user || !(await verifyPassword(password, user.password_hash))) return jsonError("ایمیل یا گذرواژه صحیح نیست.", 401);
  const token = crypto.randomUUID();
  const expires = new Date(Date.now() + DAY * 14 * 1000).toISOString();
  await DB.prepare("INSERT INTO sessions (id,user_id,expires_at) VALUES (?,?,?)").bind(token, user.id, expires).run();
  const headers = new Headers({ "Set-Cookie": sessionCookie(token) });
  return Response.json({ user: { id: user.id, email: user.email, display_name: user.display_name, role: user.role } }, { headers });
}
export async function registerWithInvite(request: Request, body: Record<string, unknown>) {
  const { DB } = bindings();
  if (!DB) return jsonError("پایگاه داده آماده نیست.", 503);
  const name = typeof body.name === "string" ? body.name.trim().slice(0,80) : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const invitation = typeof body.invitation === "string" ? body.invitation : "";
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 10 || password.length > 128 || !invitation) return jsonError("اطلاعات را بررسی کنید. گذرواژه باید دست‌کم ۱۰ نویسه باشد.");
  const tokenHash = await crypto.subtle.digest("SHA-256", encoder.encode(invitation));
  const token = b64(new Uint8Array(tokenHash));
  const invite = await DB.prepare("SELECT id,email,role,class_id FROM invitations WHERE token_hash=? AND used_at IS NULL AND expires_at>?").bind(token, new Date().toISOString()).first<{id:string;email:string;role:Role;class_id:string|null}>();
  if (!invite || invite.email.toLowerCase() !== email) return jsonError("دعوت‌نامه معتبر نیست یا منقضی شده است.", 403);
  const id = crypto.randomUUID();
  const passwordHash = await hashPassword(password);
  try {
    await DB.prepare("INSERT INTO users (id,email,display_name,password_hash,role) VALUES (?,?,?,?,?)").bind(id,email,name,passwordHash,invite.role).run();
    if (invite.class_id) await DB.prepare("INSERT INTO class_members (class_id,user_id) VALUES (?,?)").bind(invite.class_id,id).run();
    await DB.prepare("UPDATE invitations SET used_at=? WHERE id=?").bind(new Date().toISOString(),invite.id).run();
  } catch {
    return jsonError("این ایمیل قبلاً ثبت شده یا دعوت‌نامه قابل استفاده نیست.",409);
  }
  const tokenId=crypto.randomUUID();
  await DB.prepare("INSERT INTO sessions (id,user_id,expires_at) VALUES (?,?,?)").bind(tokenId,id,new Date(Date.now()+DAY*14*1000).toISOString()).run();
  return Response.json({user:{id,email,display_name:name,role:invite.role}},{headers:{"Set-Cookie":sessionCookie(tokenId)}});
}

export async function registerOrLoginWithGoogle(request: Request, body: Record<string, unknown>) {
  const { DB, GOOGLE_CLIENT_ID } = bindings();
  if (!DB) return jsonError("پایگاه داده آماده نیست.", 503);
  if (!GOOGLE_CLIENT_ID) return jsonError("ورود با گوگل هنوز پیکربندی نشده است.", 503);
  const credential = typeof body.credential === "string" ? body.credential : "";
  const invitation = typeof body.invitation === "string" ? body.invitation : "";
  if (!credential) return jsonError("تأیید گوگل دریافت نشد.");
  let google: { aud?: string; sub?: string; email?: string; email_verified?: string; name?: string };
  try {
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    if (!response.ok) return jsonError("تأیید حساب گوگل ناموفق بود.", 401);
    google = await response.json();
  } catch { return jsonError("ارتباط با سرویس گوگل برقرار نشد.", 502); }
  if (google.aud !== GOOGLE_CLIENT_ID || !google.sub || !google.email || google.email_verified !== "true") return jsonError("حساب گوگل معتبر یا تأییدشده نیست.", 401);
  const email = google.email.trim().toLowerCase();
  const existing = await DB.prepare("SELECT id,email,display_name,role,password_hash FROM users WHERE email=? AND active=1").bind(email).first<SessionUser & {password_hash:string}>();
  let user: SessionUser;
  if (existing) {
    if (existing.password_hash !== `google:${google.sub}`) return jsonError("این ایمیل قبلاً با گذرواژه ثبت شده است. برای اتصال گوگل با مدیر تماس بگیرید.", 409);
    user = existing;
  } else {
    // The first verified Google account becomes the app administrator.
    // Every later account must use an invitation.
    const isFirstAdmin = true;
    if (isFirstAdmin) {
      const count = await DB.prepare("SELECT COUNT(*) AS n FROM users").first<{ n: number }>();
      if (Number(count?.n ?? 0) !== 0) return jsonError("حساب مدیر اولیه قبلاً ایجاد شده است. برای ساخت حساب جدید باید دعوت‌نامه داشته باشید.", 403);
      const id = crypto.randomUUID();
      const name = (google.name || email.split("@")[0]).trim().slice(0,80);
      try {
        await DB.prepare("INSERT INTO users (id,email,display_name,password_hash,role) SELECT ?,?,?,?,'admin' WHERE NOT EXISTS (SELECT 1 FROM users)")
          .bind(id,email,name,`google:${google.sub}`).run();
      } catch { return jsonError("ساخت حساب مدیر انجام نشد؛ دوباره وارد شوید.",409); }
      const created = await DB.prepare("SELECT id,email,display_name,role FROM users WHERE email=? AND active=1").bind(email).first<SessionUser>();
      if (!created || created.role !== "admin") return jsonError("راه‌اندازی مدیر انجام نشد؛ ممکن است حساب دیگری زودتر ساخته شده باشد.",409);
      user = created;
    } else {
      if (!invitation) return jsonError("برای ساخت حساب، ابتدا باید از مدیر دعوت‌نامه بگیرید.", 403);
      const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(invitation)));
    const token = b64(digest);
    const invite = await DB.prepare("SELECT id,email,role,class_id FROM invitations WHERE token_hash=? AND used_at IS NULL AND expires_at>?").bind(token, new Date().toISOString()).first<{id:string;email:string;role:Role;class_id:string|null}>();
    if (!invite || invite.email.toLowerCase() !== email) return jsonError("دعوت‌نامه معتبر نیست، منقضی شده یا برای این ایمیل صادر نشده است.", 403);
    const id = crypto.randomUUID();
    const name = (google.name || email.split("@")[0]).trim().slice(0,80);
    try {
      await DB.prepare("INSERT INTO users (id,email,display_name,password_hash,role) VALUES (?,?,?,?,?)").bind(id,email,name,`google:${google.sub}`,invite.role).run();
      if (invite.class_id) await DB.prepare("INSERT INTO class_members (class_id,user_id) VALUES (?,?)").bind(invite.class_id,id).run();
      await DB.prepare("UPDATE invitations SET used_at=? WHERE id=?").bind(new Date().toISOString(),invite.id).run();
    } catch { return jsonError("ساخت حساب انجام نشد؛ ممکن است دعوت‌نامه قبلاً استفاده شده باشد.",409); }
    user = {id,email,display_name:name,role:invite.role};
    }
  }
  const session = crypto.randomUUID();
  await DB.prepare("INSERT INTO sessions (id,user_id,expires_at) VALUES (?,?,?)").bind(session,user.id,new Date(Date.now()+DAY*14*1000).toISOString()).run();
  return Response.json({user},{headers:{"Set-Cookie":sessionCookie(session)}});
}

export async function createInvitation(request: Request, body: Record<string, unknown>) {
  const user = await currentUser(request);
  if (!user || !["admin","teacher"].includes(user.role)) return jsonError("دسترسی مجاز نیست.",403);
  const { DB } = bindings();
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const role = body.role;
  const classId = typeof body.classId === "string" ? body.classId : null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !["teacher","memorizer"].includes(String(role))) return jsonError("ایمیل یا نقش نامعتبر است.");
  if (user.role === "teacher" && role !== "memorizer") return jsonError("معلم فقط می‌تواند حافظ دعوت کند.",403);
  if (classId) {
    const owned = await DB!.prepare("SELECT id FROM classes WHERE id=? AND teacher_id=?").bind(classId,user.id).first();
    if (user.role === "teacher" && !owned) return jsonError("کلاس متعلق به شما نیست.",403);
  }
  const raw = b64(crypto.getRandomValues(new Uint8Array(32)));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256",encoder.encode(raw)));
  await DB!.prepare("INSERT INTO invitations (id,email,role,class_id,token_hash,expires_at,created_by) VALUES (?,?,?,?,?,?,?)")
    .bind(crypto.randomUUID(),email,role,classId,b64(digest),new Date(Date.now()+DAY*7*1000).toISOString(),user.id).run();
  return Response.json({invitation:raw,expiresInDays:7});
}
export async function requireRole(request: Request, roles: Role[]) {
  const user = await currentUser(request);
  if (!user || !roles.includes(user.role)) return { user: null, response: jsonError("برای این عملیات باید وارد شوید یا دسترسی کافی داشته باشید.",403) };
  return { user, response: null };
}
