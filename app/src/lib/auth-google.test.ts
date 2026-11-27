// Google sign-in must coexist with a phone/email password (regression: setting a password used to overwrite the 'google:<sub>' marker).
// Run: bun test src/lib/auth-google.test.ts   (in-memory fake DB; no real database is touched)
import { beforeEach, describe, expect, mock, test } from "bun:test";

type U = { id: string; email: string; display_name: string; role: string; password_hash: string; google_sub: string | null; phone: string | null; active: number };
let users: U[] = [];
let sessions: { id: string; user_id: string }[] = [];

function run(query: string, v: any[]): any[] {
  const q = query.replace(/\s+/g, " ").trim();
  if (q.startsWith("SELECT role FROM user_roles")) return [];
  if (q.startsWith("INSERT INTO sessions")) { sessions.push({ id: v[0], user_id: v[1] }); return []; }
  if (q.startsWith("SELECT u.id,u.email,u.display_name,u.role FROM sessions")) {
    const s = sessions.find(x => x.id === v[0]); const u = users.find(x => x.id === s?.user_id && x.active); return u ? [u] : [];
  }
  if (q.includes("FROM users WHERE email=? AND active=1")) return users.filter(u => u.email === v[0] && u.active);
  if (q.includes("RIGHT(REGEXP_REPLACE(COALESCE(phone")) return users.filter(u => u.active && (u.phone ?? "").replace(/\D/g, "").slice(-10) === v[0]);
  if (q.startsWith("SELECT id FROM users WHERE phone=? AND id<>?")) return users.filter(u => u.phone === v[0] && u.id !== v[1]);
  if (q.startsWith("UPDATE users SET google_sub=?")) {
    if (users.some(u => u.google_sub === v[0] && u.id !== v[1])) throw new Error("unique violation users_google_sub_uidx");
    const u = users.find(x => x.id === v[1] && (x.google_sub === null || x.google_sub === v[2])); if (u) u.google_sub = v[0]; return [];
  }
  if (q.startsWith("UPDATE users SET phone=?,password_hash=?")) { const u = users.find(x => x.id === v[2])!; u.phone = v[0]; u.password_hash = v[1]; return []; }
  throw new Error("fake DB: unhandled SQL: " + q);
}
const DB = {
  prepare(query: string) {
    let vals: any[] = [];
    const st: any = {
      bind(...a: any[]) { vals = a; return st; },
      async first() { return run(query, vals)[0] ?? null; },
      async all() { return { results: run(query, vals) }; },
      async run() { run(query, vals); return { success: true, meta: { changes: 1 } }; },
    };
    return st;
  },
};
mock.module("./bindings.server", () => ({ bindings: () => ({ DB, GOOGLE_CLIENT_ID: "client-id" }) }));
const { registerOrLoginWithGoogle, setOwnCredentials, login, hashPassword, verifyPassword } = await import("./auth.server");

function googleToken(sub: string, email = "zeinab@example.com") {
  globalThis.fetch = (async () => Response.json({ aud: "client-id", sub, email, email_verified: "true", name: "Zeinab" })) as any;
  return { credential: "tok" };
}
const zeinab = (over: Partial<U> = {}): U => ({ id: "u1", email: "zeinab@example.com", display_name: "Zeinab", role: "admin", password_hash: "google:SUB-Z", google_sub: "SUB-Z", phone: null, active: 1, ...over });
const req = (cookie?: string) => new Request("http://x", { headers: cookie ? { Cookie: cookie } : {} });

beforeEach(() => { users = []; sessions = []; });

describe("Google login vs password", () => {
  test("bug: Google login still works after the user set a phone + password", async () => {
    users = [zeinab()];
    sessions = [{ id: "S1", user_id: "u1" }];
    const set = await setOwnCredentials(req("hifz_session=S1"), { phone: "09121234567", password: "longpassword1" });
    expect(set.status).toBe(200);
    expect(users[0].password_hash.startsWith("pbkdf2:")).toBe(true);
    expect(users[0].google_sub).toBe("SUB-Z"); // setting credentials never touches the link
    const res = await registerOrLoginWithGoogle(req(), googleToken("SUB-Z"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Set-Cookie")).toContain("hifz_session=");
  });

  test("existing password account with no link yet (Zeinab today): first Google login links it and keeps the password", async () => {
    const hash = await hashPassword("longpassword1");
    users = [zeinab({ password_hash: hash, google_sub: null, phone: "09121234567" })];
    const res = await registerOrLoginWithGoogle(req(), googleToken("SUB-Z"));
    expect(res.status).toBe(200);
    expect(users[0].google_sub).toBe("SUB-Z");
    expect(users[0].password_hash).toBe(hash);
    const pw = await login(req(), "09121234567", "longpassword1");
    expect(pw.status).toBe(200);
    const pw2 = await login(req(), "zeinab@example.com", "longpassword1");
    expect(pw2.status).toBe(200);
  });

  test("a different Google account for the same email is rejected (409) and nothing changes", async () => {
    users = [zeinab({ password_hash: await hashPassword("longpassword1") })];
    const res = await registerOrLoginWithGoogle(req(), googleToken("SUB-OTHER"));
    expect(res.status).toBe(409);
    expect(users[0].google_sub).toBe("SUB-Z");
    expect(sessions.length).toBe(0);
  });

  test("a Google sub already linked to another user cannot be linked a second time (409)", async () => {
    users = [zeinab({ google_sub: "SUB-Z" }), zeinab({ id: "u2", email: "other@example.com", google_sub: null, password_hash: await hashPassword("x1234567890") })];
    const res = await registerOrLoginWithGoogle(req(), googleToken("SUB-Z", "other@example.com"));
    expect(res.status).toBe(409);
    expect(users[1].google_sub).toBeNull();
  });

  test("legacy account (marker only, google_sub not yet backfilled) still logs in with the same sub, and rejects another sub", async () => {
    users = [zeinab({ google_sub: null })];
    expect((await registerOrLoginWithGoogle(req(), googleToken("SUB-OTHER"))).status).toBe(409);
    expect((await registerOrLoginWithGoogle(req(), googleToken("SUB-Z"))).status).toBe(200);
    expect(users[0].google_sub).toBe("SUB-Z");
  });
});

describe("Password login", () => {
  test("works for a pbkdf2 hash with email and phone; wrong password fails", async () => {
    users = [zeinab({ password_hash: await hashPassword("longpassword1"), phone: "09121234567" })];
    expect((await login(req(), "zeinab@example.com", "longpassword1")).status).toBe(200);
    expect((await login(req(), "09121234567", "longpassword1")).status).toBe(200);
    expect((await login(req(), "zeinab@example.com", "wrong-password")).status).toBe(401);
  });

  test("the legacy google: marker is never accepted as a password", async () => {
    users = [zeinab()];
    expect((await login(req(), "zeinab@example.com", "google:SUB-Z")).status).toBe(401);
    expect(await verifyPassword("google:SUB-Z", "google:SUB-Z")).toBe(false);
  });
});
