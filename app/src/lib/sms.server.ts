// SMS sending for one-time codes. Providers: Melipayamak (preferred if configured), else Kavenegar.
// Melipayamak env: MELIPAYAMAK_USERNAME, MELIPAYAMAK_PASSWORD (secrets, never logged), MELIPAYAMAK_BODY_ID (approved "service number" template id; the code is its single variable).
// Kavenegar env: KAVENEGAR_API_KEY (secret), KAVENEGAR_TEMPLATE (template name, default "verify").
async function sendMelipayamak(phone: string, code: string): Promise<{ ok: boolean; error?: string }> {
  const to = "0" + phone.replace(/\D/g, "").slice(-10);
  try {
    const r = await fetch("https://rest.payamak-panel.com/api/SendSMS/BaseServiceNumber", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ username: process.env.MELIPAYAMAK_USERNAME!, password: process.env.MELIPAYAMAK_PASSWORD!, text: code, to, bodyId: process.env.MELIPAYAMAK_BODY_ID! }),
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return { ok: false, error: "ارسال پیامک ناموفق بود." };
    const j = await r.json().catch(() => null) as { RetStatus?: number } | null;
    return j && j.RetStatus === 1 ? { ok: true } : { ok: false, error: "ارسال پیامک ناموفق بود." };
  } catch { return { ok: false, error: "ارتباط با سرویس پیامک برقرار نشد." }; }
}

export async function sendOtpSms(phone: string, code: string): Promise<{ ok: boolean; error?: string }> {
  if (process.env.MELIPAYAMAK_USERNAME && process.env.MELIPAYAMAK_PASSWORD && process.env.MELIPAYAMAK_BODY_ID) return sendMelipayamak(phone, code);
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
