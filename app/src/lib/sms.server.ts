// SMS sending for one-time codes. Provider: Kavenegar "verify/lookup" (template-based OTP).
// Env: KAVENEGAR_API_KEY (secret, never logged), KAVENEGAR_TEMPLATE (template name, default "verify").
export async function sendOtpSms(phone: string, code: string): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.KAVENEGAR_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV !== "production") { console.log(`[sms:dev] code for ${phone}: ${code}`); return { ok: true }; }
    return { ok: false, error: "ارسال پیامک هنوز راه‌اندازی نشده است." };
  }
  const template = process.env.KAVENEGAR_TEMPLATE || "verify";
  const url = `https://api.kavenegar.com/v1/${encodeURIComponent(key)}/verify/lookup.json?receptor=${encodeURIComponent(phone)}&token=${encodeURIComponent(code)}&template=${encodeURIComponent(template)}`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) return { ok: false, error: "ارسال پیامک ناموفق بود." };
    return { ok: true };
  } catch { return { ok: false, error: "ارتباط با سرویس پیامک برقرار نشد." }; }
}
