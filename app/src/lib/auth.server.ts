import { bindings } from "./bindings.server";
import { canManageClass } from "./access.server";
import { applicationForEmail } from "./applications.server";
import { normalizePhone } from "./phone-auth.server";

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

type InviteRow = { id: string; email: string; role: Role; class_id: string | null; created_by: string };
// Teachers invited to a class become class teachers (class_teachers); learners become class members.
async function attachInviteToClass(DB: NonNullable<ReturnType<typeof bindings>["DB"]>, invite: InviteRow, userId: string) {
  if (!invite.class_id) return;
  if (invite.role === "teacher") await DB.prepare("INSERT INTO class_teachers (class_id,user_id,added_by) VALUES (?,?,?) ON CONFLICT DO NOTHING").bind(invite.class_id, userId, invite.created_by).run();
  else await DB.prepare("INSERT INTO class_members (class_id,user_id) VALUES (?,?) ON CONFLICT DO NOTHING").bind(invite.class_id, userId).run();
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
export async function login(request: Request, identifier: string, password: string) {
  const { DB } = bindings();
  if (!DB) return jsonError("پایگاه داده آماده نیست.", 503);
  const id = identifier.trim();
  const phone = id.includes("@") ? null : normalizePhone(id);
  const user = phone
    ? await DB.prepare("SELECT id,email,display_name,role,password_hash FROM users WHERE active=1 AND RIGHT(REGEXP_REPLACE(COALESCE(phone,''),'[^0-9]','','g'),10)=?").bind(phone.slice(-10)).first<SessionUser & { password_hash: string }>()
    : await DB.prepare("SELECT id,email,display_name,role,password_hash FROM users WHERE email=? AND active=1").bind(id.toLowerCase()).first<SessionUser & { password_hash: string }>();
  if (!user || !(await verifyPassword(password, user.password_hash))) return jsonError("شماره/ایمیل یا گذرواژه صحیح نیست.", 401);
  const token = crypto.randomUUID();
  const expires = new Date(Date.now() + DAY * 14 * 1000).toISOString();
  await DB.prepare("INSERT INTO sessions (id,user_id,expires_at) VALUES (?,?,?)").bind(token, user.id, expires).run();
  const headers = new Headers({ "Set-Cookie": sessionCookie(token) });
  return Response.json({ user: { id: user.id, email: user.email, display_name: user.display_name, role: user.role } }, { headers });
}
function randomPassword() {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, b => alphabet[b % alphabet.length]).join("");
}
/** Logged-in user sets their own sign-in phone number and password. */
export async function setOwnCredentials(request: Request, body: Record<string, unknown>) {
  const user = await currentUser(request);
  if (!user) return jsonError("ابتدا وارد شوید.", 401);
  const { DB } = bindings();
  if (!DB) return jsonError("پایگاه داده آماده نیست.", 503);
  const phone = normalizePhone(body.phone);
  const password = typeof body.password === "string" ? body.password : "";
  if (!phone) return jsonError("شماره‌ی همراه را درست بنویسید (مثل ۰۹۱۲۱۲۳۴۵۶۷).");
  if (password.length < 8) return jsonError("گذرواژه دست‌کم ۸ نویسه باشد.");
  const taken = await DB.prepare("SELECT id FROM users WHERE phone=? AND id<>?").bind(phone, user.id).first();
  if (taken) return jsonError("این شماره برای حساب دیگری ثبت شده است.", 409);
  await DB.prepare("UPDATE users SET phone=?,password_hash=? WHERE id=?").bind(phone, await hashPassword(password), user.id).run();
  return Response.json({ ok: true });
}
/** Admin creates a teacher/admin account that signs in with phone + random password (shown once). */
export async function createStaffAccount(request: Request, body: Record<string, unknown>) {
  const { user, response } = await requireRole(request, ["admin"]);
  if (!user) return response!;
  const { DB } = bindings();
  if (!DB) return jsonError("پایگاه داده آماده نیست.", 503);
  const phone = normalizePhone(body.phone);
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
  const role = body.role === "admin" ? "admin" : "teacher";
  if (!phone || !name) return jsonError("نام و شماره‌ی همراه لازم است.");
  const taken = await DB.prepare("SELECT id FROM users WHERE phone=?").bind(phone).first();
  if (taken) return jsonError("این شماره قبلاً ثبت شده است.", 409);
  const password = randomPassword();
  try {
    await DB.prepare("INSERT INTO users (id,email,display_name,password_hash,role,phone) VALUES (?,?,?,?,?,?)")
      .bind(crypto.randomUUID(), `${phone}@phone.invalid`, name, await hashPassword(password), role, phone).run();
  } catch { return jsonError("ساخت حساب انجام نشد.", 409); }
  return Response.json({ phone, password, role });
}
// Password sign-up is disabled: it never proved that the person owns the invited email.
// New accounts are created only through Google sign-in (verified email), see registerOrLoginWithGoogle.
export async function registerWithInvite(_request: Request, _body: Record<string, unknown>) {
  return jsonError("ثبت‌نام فقط با «ورود با گوگل» و با همان ایمیلِ دعوت‌نامه ممکن است.", 403);
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
    user = { id: existing.id, email: existing.email, display_name: existing.display_name, role: existing.role };
  } else {
    // The first verified Google account becomes the app administrator.
    // Every later account must use an invitation.
    const count = await DB.prepare("SELECT COUNT(*) AS n FROM users").first<{ n: number }>();
    const isFirstAdmin = Number(count?.n ?? 0) === 0;
    if (isFirstAdmin) {
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
      if (!invitation) {
        // No invite code: the person must have an application the admin approved.
        const app = await applicationForEmail(email);
        if (!app) return jsonError("برای این ایمیل درخواستی ثبت نشده است. ابتدا در بخش «ثبت‌نام» درخواست بدهید.", 403);
        if (app.status === "pending") return jsonError("درخواست شما هنوز تأیید نشده است؛ پس از تأیید مدیر می‌توانید وارد شوید.", 403);
        if (app.status === "rejected") return jsonError("درخواست شما تأیید نشد. برای پیگیری با مدیر تماس بگیرید.", 403);
        if (app.used_at) return jsonError("این درخواست قبلاً استفاده شده است؛ با مدیر تماس بگیرید.", 409);
        const id = crypto.randomUUID();
        const name = `${app.first_name} ${app.last_name}`.trim().slice(0, 80);
        try {
          await DB.prepare("INSERT INTO users (id,email,display_name,password_hash,role) VALUES (?,?,?,?,'memorizer')").bind(id, email, name, `google:${google.sub}`).run();
          await DB.prepare("UPDATE applications SET used_at=? WHERE id=?").bind(new Date().toISOString(), app.id).run();
        } catch { return jsonError("ساخت حساب انجام نشد؛ دوباره امتحان کنید.", 409); }
        user = { id, email, display_name: name, role: "memorizer" };
        const session2 = crypto.randomUUID();
        await DB.prepare("INSERT INTO sessions (id,user_id,expires_at) VALUES (?,?,?)").bind(session2, user.id, new Date(Date.now() + DAY * 14 * 1000).toISOString()).run();
        return Response.json({ user }, { headers: { "Set-Cookie": sessionCookie(session2) } });
      }
      const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(invitation)));
    const token = b64(digest);
    const invite = await DB.prepare("SELECT id,email,role,class_id,created_by FROM invitations WHERE token_hash=? AND used_at IS NULL AND expires_at>?").bind(token, new Date().toISOString()).first<{id:string;email:string;role:Role;class_id:string|null;created_by:string}>();
    if (!invite || invite.email.toLowerCase() !== email) return jsonError("دعوت‌نامه معتبر نیست، منقضی شده یا برای این ایمیل صادر نشده است.", 403);
    const id = crypto.randomUUID();
    const name = (google.name || email.split("@")[0]).trim().slice(0,80);
    try {
      await DB.prepare("INSERT INTO users (id,email,display_name,password_hash,role) VALUES (?,?,?,?,?)").bind(id,email,name,`google:${google.sub}`,invite.role).run();
      await attachInviteToClass(DB, invite, id);
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
    if (user.role === "teacher" && !(await canManageClass(DB!, user, classId))) return jsonError("کلاس متعلق به شما نیست.",403);
    if (user.role === "admin" && !(await DB!.prepare("SELECT id FROM classes WHERE id=?").bind(classId).first())) return jsonError("کلاس پیدا نشد.",404);
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
