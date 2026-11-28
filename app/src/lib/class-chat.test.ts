// Class chat: server-side authorization + validation. In-memory fake DB; no real database is touched.
// Run: bun test src/lib/class-chat.test.ts
import { beforeEach, describe, expect, test } from "bun:test";
import { MAX_CHAT_TEXT, canUseChat, cleanChatText, deleteMessage, listMessages, postMessage } from "./class-chat.server";

type Msg = { id: string; class_id: string; user_id: string; body: string; created_at: string };
let messages: Msg[] = [];
// classes: c1 (primary teacher t1, co-teacher t2, member l1), c2 (primary teacher t3, member l2)
const classes = [{ id: "c1", teacher_id: "t1" }, { id: "c2", teacher_id: "t3" }];
const coTeachers = [{ class_id: "c1", user_id: "t2" }];
const members = [{ class_id: "c1", user_id: "l1" }, { class_id: "c2", user_id: "l2" }];
const names: Record<string, string> = { t1: "استاد یک", t2: "استاد دو", l1: "قرآن‌آموز یک", l2: "قرآن‌آموز دو", t3: "استاد سه" };

function run(query: string, v: any[]): any[] {
  const q = query.replace(/\s+/g, " ").trim();
  if (q.startsWith("SELECT 1 AS ok FROM classes WHERE id=?")) return classes.filter(c => c.id === v[0]);
  if (q.startsWith("SELECT 1 AS ok FROM classes c WHERE c.id=?")) return classes.filter(c => c.id === v[0] && (c.teacher_id === v[1] || coTeachers.some(t => t.class_id === c.id && t.user_id === v[2])));
  if (q.startsWith("SELECT 1 AS ok FROM class_members WHERE class_id=? AND user_id=?")) return members.filter(m => m.class_id === v[0] && m.user_id === v[1]);
  if (q.startsWith("INSERT INTO class_messages")) { messages.push({ id: v[0], class_id: v[1], user_id: v[2], body: v[3], created_at: new Date(2026, 0, 1, 0, 0, messages.length).toISOString() }); return []; }
  if (q.startsWith("SELECT id,class_id,user_id FROM class_messages WHERE id=?")) return messages.filter(m => m.id === v[0]);
  if (q.startsWith("DELETE FROM class_messages WHERE id=?")) { messages = messages.filter(m => m.id !== v[0]); return []; }
  if (q.startsWith("SELECT m.id,m.user_id,u.display_name")) return messages.filter(m => m.class_id === v[0]).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, v[1]).map(m => ({ ...m, display_name: names[m.user_id] }));
  throw new Error("fake DB: unhandled SQL: " + q);
}
const DB: any = { prepare(query: string) { let vals: any[] = []; const st: any = { bind(...a: any[]) { vals = a; return st; }, first: async () => run(query, vals)[0] ?? null, all: async () => ({ results: run(query, vals) }), run: async () => { run(query, vals); return { success: true, meta: { changes: 0 } }; } }; return st; } };
const U = (id: string, roles: string[]): any => ({ id, email: id + "@x", display_name: names[id] || id, role: roles.includes("admin") ? "admin" : roles.includes("teacher") ? "teacher" : "memorizer", roles });
const admin = U("a1", ["admin"]), t1 = U("t1", ["teacher"]), t2 = U("t2", ["teacher"]), t3 = U("t3", ["teacher"]), l1 = U("l1", ["memorizer"]), l2 = U("l2", ["memorizer"]), outsider = U("x9", ["memorizer"]);

beforeEach(() => { messages = []; });

describe("membership", () => {
  test("who may use the chat", async () => {
    expect(await canUseChat(DB, admin, "c1")).toBe(true);
    expect(await canUseChat(DB, t1, "c1")).toBe(true);
    expect(await canUseChat(DB, t2, "c1")).toBe(true);     // co-teacher
    expect(await canUseChat(DB, l1, "c1")).toBe(true);
    expect(await canUseChat(DB, t3, "c1")).toBe(false);    // teacher of another class
    expect(await canUseChat(DB, l2, "c1")).toBe(false);    // learner of another class
    expect(await canUseChat(DB, outsider, "c1")).toBe(false);
    expect(await canUseChat(DB, admin, "nope")).toBe(false);
    expect(await canUseChat(DB, admin, "")).toBe(false);
  });
  test("non-member cannot post, and nothing is stored", async () => {
    const r = await postMessage(DB, l2, "c1", "سلام");
    expect(r.ok).toBe(false); if (!r.ok) expect(r.status).toBe(403);
    expect(messages.length).toBe(0);
  });
  test("non-string class id is rejected", async () => {
    const r = await postMessage(DB, l1, { $ne: 1 }, "hi");
    expect(r.ok).toBe(false);
  });
});

describe("validation", () => {
  test("text rules", () => {
    expect(cleanChatText("  سلام  ")).toEqual({ ok: true, text: "سلام" });
    expect(cleanChatText("   ").ok).toBe(false);
    expect(cleanChatText(undefined).ok).toBe(false);
    expect(cleanChatText(42).ok).toBe(false);
    expect(cleanChatText("a".repeat(MAX_CHAT_TEXT)).ok).toBe(true);
    expect(cleanChatText("a".repeat(MAX_CHAT_TEXT + 1)).ok).toBe(false);
  });
  test("too long text is not stored", async () => {
    const r = await postMessage(DB, l1, "c1", "a".repeat(MAX_CHAT_TEXT + 1));
    expect(r.ok).toBe(false); if (!r.ok) expect(r.status).toBe(400);
    expect(messages.length).toBe(0);
  });
});

describe("post + list", () => {
  test("everyone in the class can write; list is oldest first, scoped to the class", async () => {
    expect((await postMessage(DB, l1, "c1", "یک")).ok).toBe(true);
    expect((await postMessage(DB, t1, "c1", "دو")).ok).toBe(true);
    expect((await postMessage(DB, admin, "c1", "سه")).ok).toBe(true);
    expect((await postMessage(DB, l2, "c2", "other class")).ok).toBe(true);
    const list = await listMessages(DB, l1, "c1", false);
    expect(list.map(m => m.body)).toEqual(["یک", "دو", "سه"]);
    expect(list[0].name).toBe("قرآن‌آموز یک");
    expect(list.map(m => m.mine)).toEqual([true, false, false]);
    expect(list.map(m => m.canDelete)).toEqual([true, false, false]);
    expect((await listMessages(DB, t1, "c1", true)).every(m => m.canDelete)).toBe(true);
  });
});

describe("delete", () => {
  const seed = async () => { const a = await postMessage(DB, l1, "c1", "learner msg"); const b = await postMessage(DB, t1, "c1", "teacher msg"); return [(a as any).id as string, (b as any).id as string]; };
  test("own message: yes; someone else's: no", async () => {
    const [mine, teachers] = await seed();
    const r = await deleteMessage(DB, l1, teachers); expect(r.ok).toBe(false); if (!r.ok) expect(r.status).toBe(403);
    expect((await deleteMessage(DB, l1, mine)).ok).toBe(true);
    expect(messages.map(m => m.id)).toEqual([teachers]);
  });
  test("admin and the class teachers can delete any message", async () => {
    let [m] = await seed(); expect((await deleteMessage(DB, admin, m)).ok).toBe(true);
    [m] = await seed(); expect((await deleteMessage(DB, t1, m)).ok).toBe(true);
    [m] = await seed(); expect((await deleteMessage(DB, t2, m)).ok).toBe(true);   // co-teacher
  });
  test("teacher of another class and outsiders cannot delete", async () => {
    const [m] = await seed();
    expect((await deleteMessage(DB, t3, m)).ok).toBe(false);
    expect((await deleteMessage(DB, l2, m)).ok).toBe(false);
    expect((await deleteMessage(DB, outsider, m)).ok).toBe(false);
    expect(messages.length).toBe(2);
  });
  test("a former member cannot delete their own message any more", async () => {
    const [m] = await seed();
    members.splice(members.findIndex(x => x.user_id === "l1"), 1);
    try { expect((await deleteMessage(DB, l1, m)).ok).toBe(false); } finally { members.push({ class_id: "c1", user_id: "l1" }); }
  });
  test("missing / malformed id is 404", async () => {
    const r = await deleteMessage(DB, admin, "nope"); expect(r.ok).toBe(false); if (!r.ok) expect(r.status).toBe(404);
    expect((await deleteMessage(DB, admin, undefined)).ok).toBe(false);
  });
});
