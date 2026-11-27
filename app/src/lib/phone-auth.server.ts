import { bindings } from "./bindings.server";
import { jsonError, sessionCookie, type Role } from "./auth.server";
import { sendOtpSms } from "./sms.server";
import { enrollFromRegistry } from "./registry-members.server";
import { withRoles } from "./roles.server";

const DAY = 60 * 60 * 24;
const enc = new TextEncoder();
async function sha256(s: string) {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s)));
  return Array.from(d, b => b.toString(16).padStart(2, "0")).join("");
}
/** Normalises Iranian mobile numbers (Persian/Arabic digits, +98, 0098, 98, missing 0) to 09xxxxxxxxx; null if invalid. */
export function normalizePhone(input: unknown): string | null {
  let s = String(input ?? "").replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/[^0-9+]/g, "");
  s = s.replace(/^\+?98/, "").replace(/^0098/, "");
  s = s.replace(/^0/, "");
  return /^9\d{9}$/.test(s) ? "0" + s : null;
}
const last10 = (p: string) => p.slice(-10);

type Who = { kind: "user"; id: string } | { kind: "application"; id: string; first: string; last: string; email: string } | { kind: "registry"; name: string } | null;
async function whoIs(phone: string): Promise<Who> {
  const { DB } = bindings(); if (!DB) return null;
  const tail = last10(phone);
  const u = await DB.prepare("SELECT id FROM users WHERE active=1 AND RIGHT(REGEXP_REPLACE(COALESCE(phone,''),'[^0-9]','','g'),10)=?").bind(tail).first<{ id: string }>();
  if (u) return { kind: "user", id: u.id };
  const a = await DB.prepare("SELECT id,first_name,last_name,email FROM applications WHERE status='approved' AND used_at IS NULL AND RIGHT(REGEXP_REPLACE(COALESCE(phone,''),'[^0-9]','','g'),10)=? ORDER BY created_at DESC LIMIT 1").bind(tail).first<{ id: string; first_name: string; last_name: string; email: string }>();
  if (a) return { kind: "application", id: a.id, first: a.first_name, last: a.last_name, email: a.email };
  const r = await DB.prepare("SELECT full_name FROM registry_people WHERE kind='student' AND status='active' AND RIGHT(REGEXP_REPLACE(COALESCE(phone,''),'[^0-9]','','g'),10)=? LIMIT 1").bind(tail).first<{ full_name: string }>();
  if (r) return { kind: "registry", name: r.full_name };
  return null;
}

export async function sendPhoneCode(request: Request, body: Record<string, unknown>) {
  const { DB } = bindings(); if (!DB) return jsonError("پایگاه داده آماده نیست.", 503);
  const phone = normalizePhone(body.phone); if (!phone) return jsonError("شماره‌ی همراه را درست بنویسید (مثل ۰۹۱۲۱۲۳۴۵۶۷).");
  const generic = Response.json({ sent: true, message: "اگر این شماره ثبت و تأیید شده باشد، کد پیامک می‌شود." });
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const recent = await DB.prepare("SELECT COUNT(*) AS n FROM phone_otps WHERE phone=? AND created_at>?").bind(phone, since).first<{ n: number }>();
  if (Number(recent?.n ?? 0) >= 3) return jsonError("چند بار درخواست کد داده‌اید؛ ۱۰ دقیقه بعد دوباره امتحان کنید.", 429);
  const who = await whoIs(phone);
  if (!who) return generic; // never send SMS to numbers we do not know (no enumeration, no SMS abuse)
  const code = String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));
  await DB.prepare("INSERT INTO phone_otps (id,phone,code_hash,expires_at) VALUES (?,?,?,?)").bind(crypto.randomUUID(), phone, await sha256(`otp:${phone}:${code}`), new Date(Date.now() + 5 * 60 * 1000).toISOString()).run();
  const sent = await sendOtpSms(phone, code);
  if (!sent.ok) return jsonError(sent.error || "ارسال پیامک ناموفق بود.", 502);
  return generic;
}

export async function verifyPhoneCode(request: Request, body: Record<string, unknown>) {
  const { DB } = bindings(); if (!DB) return jsonError("پایگاه داده آماده نیست.", 503);
  const phone = normalizePhone(body.phone); const code = String(body.code ?? "").replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/\D/g, "");
  if (!phone || code.length !== 6) return jsonError("شماره یا کد نامعتبر است.");
  const otp = await DB.prepare("SELECT id,code_hash,attempts FROM phone_otps WHERE phone=? AND used_at IS NULL AND expires_at>? ORDER BY created_at DESC LIMIT 1").bind(phone, new Date().toISOString()).first<{ id: string; code_hash: string; attempts: number }>();
  if (!otp || Number(otp.attempts) >= 5) return jsonError("کد منقضی شده است؛ دوباره کد بگیرید.", 401);
  if (otp.code_hash !== await sha256(`otp:${phone}:${code}`)) {
    await DB.prepare("UPDATE phone_otps SET attempts=attempts+1 WHERE id=?").bind(otp.id).run();
    return jsonError("کد درست نیست.", 401);
  }
  await DB.prepare("UPDATE phone_otps SET used_at=? WHERE id=?").bind(new Date().toISOString(), otp.id).run();
  const who = await whoIs(phone);
  if (!who) return jsonError("این شماره ثبت نشده است.", 403);
  let userId: string;
  if (who.kind === "user") userId = who.id;
  else {
    userId = crypto.randomUUID();
    const name = who.kind === "application" ? `${who.first} ${who.last}`.trim().slice(0, 80) : who.name.slice(0, 80);
    let email = who.kind === "application" ? who.email.toLowerCase() : `p${phone}@phone.invalid`;
    const taken = await DB.prepare("SELECT 1 AS x FROM users WHERE email=?").bind(email).first();
    if (taken) email = `p${phone}@phone.invalid`;
    try {
      await DB.prepare("INSERT INTO users (id,email,display_name,password_hash,role,phone) VALUES (?,?,?,?,'memorizer',?)").bind(userId, email, name, `phone:${phone}`, phone).run();
      if (who.kind === "application") await DB.prepare("UPDATE applications SET used_at=? WHERE id=?").bind(new Date().toISOString(), who.id).run();
    } catch { return jsonError("ساخت حساب انجام نشد؛ دوباره امتحان کنید.", 409); }
  }
  const u0 = await DB.prepare("SELECT id,email,display_name,role FROM users WHERE id=? AND active=1").bind(userId).first<{ id: string; email: string; display_name: string; role: Role }>();
  if (!u0) return jsonError("حساب غیرفعال است.", 403);
  const u = await withRoles(DB, u0);
  await enrollFromRegistry(DB, { ...u, phone });
  const session = crypto.randomUUID();
  await DB.prepare("INSERT INTO sessions (id,user_id,expires_at) VALUES (?,?,?)").bind(session, u.id, new Date(Date.now() + DAY * 14 * 1000).toISOString()).run();
  return Response.json({ user: u }, { headers: { "Set-Cookie": sessionCookie(session) } });
}
