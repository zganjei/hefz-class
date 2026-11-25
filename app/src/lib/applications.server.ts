import { bindings } from "./bindings.server";
import { currentUser, jsonError } from "./auth.server";

const encoder = new TextEncoder();
const MAX_PENDING = 200;
const MAX_PER_IP_PER_HOUR = 5;
const SITE_URL = () => process.env.SITE_URL || "https://razmi-chenin.vercel.app";

// Persian/Arabic-Indic digits -> ASCII, so "۱۲۳" and "123" are the same input.
function normalizeDigits(v: string) {
  return v.replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06f0)).replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660));
}
function text(v: unknown, max: number) {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
}
async function sha256Hex(value: string) {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
  return Array.from(d, b => b.toString(16).padStart(2, "0")).join("");
}

export type ApplicationInput = { firstName: string; lastName: string; phone: string; baleNumber: string; baleId: string; education: string; email: string };
// Returns the cleaned input or a Farsi error message. The national ID is never put in the error text.
export function validateApplication(body: Record<string, unknown>): { ok: true; value: ApplicationInput } | { ok: false; error: string } {
  const firstName = text(body.firstName, 60), lastName = text(body.lastName, 60), education = text(body.education, 120);
  const phone = normalizeDigits(text(body.phone, 20)), baleNumber = normalizeDigits(text(body.baleNumber, 20)), baleId = text(body.baleId, 60);
  const email = text(body.email, 200).toLowerCase();
  if (!firstName || !lastName) return { ok: false, error: "نام و نام خانوادگی را بنویسید." };
  if (!/^[\d+\- ]{7,20}$/.test(phone)) return { ok: false, error: "شماره تماس را درست بنویسید." };
  if (!/^[\d+\- ]{7,20}$/.test(baleNumber)) return { ok: false, error: "شماره بله را درست بنویسید." };
  if (!education) return { ok: false, error: "تحصیلات را بنویسید." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "ایمیل (جیمیل) معتبر بنویسید." };
  return { ok: true, value: { firstName, lastName, phone, baleNumber, baleId, education, email } };
}

export async function submitApplication(request: Request, body: Record<string, unknown>) {
  const { DB } = bindings();
  if (!DB) return jsonError("پایگاه داده آماده نیست.", 503);
  // Honeypot: real people never fill this hidden field. Pretend success so bots learn nothing.
  if (typeof body.website === "string" && body.website.trim()) return Response.json({ ok: true });
  const v = validateApplication(body);
  if (!v.ok) return jsonError(v.error);
  const a = v.value;
  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  const ipHash = await sha256Hex("razmi-ip:" + ip);
  const since = new Date(Date.now() - 3600 * 1000).toISOString();
  const recent = await DB.prepare("SELECT COUNT(*) AS n FROM applications WHERE ip_hash=? AND created_at>?").bind(ipHash, since).first<{ n: number }>();
  if (Number(recent?.n ?? 0) >= MAX_PER_IP_PER_HOUR) return jsonError("درخواست‌های زیادی ثبت شد؛ کمی بعد دوباره امتحان کنید.", 429);
  const pending = await DB.prepare("SELECT COUNT(*) AS n FROM applications WHERE status='pending'").first<{ n: number }>();
  if (Number(pending?.n ?? 0) >= MAX_PENDING) return jsonError("ظرفیت درخواست‌ها موقتاً پر است؛ بعداً دوباره امتحان کنید.", 503);
  const existingUser = await DB.prepare("SELECT id FROM users WHERE lower(email)=?").bind(a.email).first();
  const existingApp = await DB.prepare("SELECT id FROM applications WHERE lower(email)=?").bind(a.email).first();
  if (existingUser || existingApp) return jsonError("با این ایمیل قبلاً درخواست ثبت شده یا حساب وجود دارد. اگر حساب دارید وارد شوید.", 409);
  try {
    await DB.prepare("INSERT INTO applications (id,first_name,last_name,phone,bale_number,bale_id,education,email,ip_hash) VALUES (?,?,?,?,?,?,?,?,?)")
      .bind(crypto.randomUUID(), a.firstName, a.lastName, a.phone, a.baleNumber, a.baleId, a.education, a.email, ipHash).run();
  } catch {
    return jsonError("با این ایمیل قبلاً درخواست ثبت شده یا حساب وجود دارد. اگر حساب دارید وارد شوید.", 409);
  }
  return Response.json({ ok: true });
}

export async function listApplications(request: Request) {
  const user = await currentUser(request);
  if (!user || user.role !== "admin") return jsonError("فقط مدیر به درخواست‌ها دسترسی دارد.", 403);
  const { DB } = bindings();
  if (!DB) return jsonError("پایگاه داده آماده نیست.", 503);
  const r = await DB.prepare("SELECT id,first_name,last_name,phone,bale_number,bale_id,education,email,status,created_at,decided_at,used_at FROM applications ORDER BY (status='pending') DESC, created_at DESC LIMIT 300").all();
  return Response.json({ applications: r.results });
}

export function approvalMessage(firstName: string) {
  return `${firstName} عزیز، درخواست شما برای طرح «رزمی چنین» (حفظ قرآن همراه با تدبر) تأیید شد. برای ورود، این لینک را باز کنید و «ادامه با گوگل» را با همین ایمیل بزنید: ${SITE_URL()}`;
}

// Sends the approval email through Resend when RESEND_API_KEY is set. Never throws.
export async function sendApprovalEmail(to: string, firstName: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const url = SITE_URL();
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.MAIL_FROM || "Razmi Chenin <onboarding@resend.dev>",
        to: [to],
        subject: "تأیید ثبت‌نام در طرح رزمی چنین",
        html: `<div dir="rtl" style="font-family:Tahoma,sans-serif;line-height:2"><p>${firstName.replace(/[<>&]/g, "")} عزیز، سلام</p><p>درخواست شما برای طرح «رزمی چنین» (حفظ قرآن همراه با تدبر) تأیید شد.</p><p>برای ورود، لینک زیر را باز کنید و «ادامه با گوگل» را با همین ایمیل بزنید:</p><p><a href="${url}">${url}</a></p></div>`,
      }),
    });
    return res.ok;
  } catch { return false; }
}

export async function decideApplication(request: Request, body: Record<string, unknown>) {
  const user = await currentUser(request);
  if (!user || user.role !== "admin") return jsonError("فقط مدیر می‌تواند درخواست را بررسی کند.", 403);
  const { DB } = bindings();
  if (!DB) return jsonError("پایگاه داده آماده نیست.", 503);
  const id = typeof body.id === "string" ? body.id : "";
  const decision = body.decision;
  if (!id || (decision !== "approve" && decision !== "reject")) return jsonError("درخواست نامعتبر است.");
  const status = decision === "approve" ? "approved" : "rejected";
  const row = await DB.prepare("SELECT id,first_name,email,status FROM applications WHERE id=?").bind(id).first<{ id: string; first_name: string; email: string; status: string }>();
  if (!row) return jsonError("درخواست پیدا نشد.", 404);
  if (row.status !== "pending") return jsonError("این درخواست قبلاً بررسی شده است.", 409);
  await DB.prepare("UPDATE applications SET status=?,decided_by=?,decided_at=? WHERE id=? AND status='pending'").bind(status, user.id, new Date().toISOString(), id).run();
  if (status === "rejected") return Response.json({ ok: true, status });
  const emailSent = await sendApprovalEmail(row.email, row.first_name);
  return Response.json({ ok: true, status, emailSent, message: approvalMessage(row.first_name), email: row.email });
}

// Used by Google sign-in: what is the application state for a verified Google email?
export async function applicationForEmail(email: string) {
  const { DB } = bindings();
  if (!DB) return null;
  return DB.prepare("SELECT id,first_name,last_name,status,used_at FROM applications WHERE lower(email)=?").bind(email.toLowerCase()).first<{ id: string; first_name: string; last_name: string; status: string; used_at: string | null }>();
}
