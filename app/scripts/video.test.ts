// Run: bun test scripts/video.test.ts   (pure logic; nothing here talks to a real database or the network)
import { expect, test } from "bun:test";
import { parseVideoUrl, validateVideoInput, safeHttpUrl } from "../src/lib/video";

test("YouTube variants -> youtube-nocookie embed", () => {
  const id = "dQw4w9WgXcQ", embed = `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
  for (const u of [`https://www.youtube.com/watch?v=${id}&t=5`, `https://youtu.be/${id}?si=x`, `https://youtube.com/shorts/${id}`, `https://m.youtube.com/watch?v=${id}`, `https://www.youtube.com/embed/${id}`, `https://www.youtube.com/live/${id}`])
    expect(parseVideoUrl(u)).toMatchObject({ provider: "youtube", embed });
  expect(parseVideoUrl("https://www.youtube.com/watch?v=short")?.provider).toBe("link");
  expect(parseVideoUrl("https://evil.com/watch?v=" + id)?.provider).toBe("link");
});
test("Aparat and Drive", () => {
  expect(parseVideoUrl("https://www.aparat.com/v/AbC123x")).toMatchObject({ provider: "aparat", embed: "https://www.aparat.com/video/video/embed/videohash/AbC123x/vt/frame" });
  expect(parseVideoUrl("https://drive.google.com/file/d/1AbC_dEf-GhIjKlMn/view?usp=sharing")).toMatchObject({ provider: "drive", embed: "https://drive.google.com/file/d/1AbC_dEf-GhIjKlMn/preview" });
  expect(parseVideoUrl("https://drive.google.com/open?id=1AbC_dEf-GhIjKlMn")?.provider).toBe("drive");
  expect(parseVideoUrl("https://drive.google.com/drive/folders/1AbC_dEf-GhIjKlMn")?.provider).toBe("link");
});
test("direct files and plain links", () => {
  expect(parseVideoUrl("https://cdn.example.com/a/b.MP4?x=1")).toMatchObject({ provider: "file" });
  expect(parseVideoUrl("https://x.com/a.webm")?.provider).toBe("file");
  expect(parseVideoUrl("http://x.com/a.mp4")?.provider).toBe("link");   // mixed content: plain link
  expect(parseVideoUrl("https://example.com/page")).toMatchObject({ provider: "link", embed: null });
});
test("rejects non-http(s), credentials, junk", () => {
  for (const u of ["javascript:alert(1)", "data:text/html,<b>", "ftp://x.com/a.mp4", "https://u:p@x.com/a", "https://x.com/a b", "not a url", "", null, 5, "https://x.com/" + "a".repeat(500), "https://x.com/<script>"])
    expect(safeHttpUrl(u as any)).toBeNull();
});
test("validateVideoInput", () => {
  const ok = validateVideoInput({ title: " تدبر سوره فتح، آیات ۱–۱۰ ", kind: "x", url: "https://youtu.be/dQw4w9WgXcQ", description: "d", sort_order: "3" });
  expect(ok.ok && ok.value).toMatchObject({ title: "تدبر سوره فتح، آیات ۱–۱۰", kind: "tadabbur", provider: "youtube", sort_order: 3 });
  expect(validateVideoInput({ title: "a", url: "https://x.com" }).ok).toBe(false);
  expect(validateVideoInput({ title: "عنوان <b>", url: "https://x.com" }).ok).toBe(false);
  expect(validateVideoInput({ title: "عنوان", url: "javascript:alert(1)" }).ok).toBe(false);
  expect(validateVideoInput({ title: "عنوان", description: "x".repeat(501), url: "https://x.com" }).ok).toBe(false);
  expect(validateVideoInput({ title: "x".repeat(121), url: "https://x.com" }).ok).toBe(false);
});

import { videosForWeeks } from "../src/lib/video.server";
const fakeDB = (rows: any[], seen: string[] = [], boom = false): any => ({ prepare: (q: string) => ({ bind: () => ({ all: async () => { if (boom) throw new Error("relation does not exist"); return { results: q.includes("video_views") ? seen.map(video_id => ({ video_id })) : rows }; } }) }) });
const row = (week_index: number, id: string, url: string) => ({ week_index, id, title: id, kind: "tadabbur", url, description: "", duration_text: "", range_note: "" });
test("videosForWeeks: only requested (open) weeks, embed derived server-side, bad URL dropped, watched flag", async () => {
  const m = await videosForWeeks(fakeDB([row(1, "a", "https://youtu.be/dQw4w9WgXcQ"), row(2, "b", "https://youtu.be/dQw4w9WgXcQ"), row(1, "c", "javascript:alert(1)")], ["a"]), "p", [1], "u");
  expect([...m.keys()]).toEqual([1]);
  expect(m.get(1)!.map(v => [v.id, v.watched, v.provider])).toEqual([["a", true, "youtube"]]);
});
test("videosForWeeks: DB error degrades to no videos", async () => {
  expect((await videosForWeeks(fakeDB([], [], true), "p", [1], "u")).size).toBe(0);
});
