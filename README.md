# hefz-class
## Registration applications (new accounts)

New learners submit a public form (name, national ID, age, education, Gmail). The admin approves or rejects in the «مدیریت» tab → «درخواست‌های جدید»; an approved person signs in with "Continue with Google" using the same email and gets a memorizer account. Only admins can create invite links; teachers cannot.

Optional environment variables (set in Vercel project settings, never commit values):
- `RESEND_API_KEY`: when set, approval sends a Farsi email with the login link through Resend. When unset, the admin sees a ready-to-copy message instead.
- `MAIL_FROM`: sender, e.g. `Razmi Chenin <no-reply@your-verified-domain>` (default is Resend's test sender, which only delivers to the Resend account owner).
- `SITE_URL`: login link used in the message (default `https://razmi-chenin.vercel.app`).

The national ID is only returned to the admin endpoint and is never logged.
