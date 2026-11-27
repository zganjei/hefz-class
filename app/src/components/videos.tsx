import { useState } from "react";
import { KIND_FA, safeHttpUrl, type VideoView } from "../lib/video";

const fa = (n: number | string) => String(n).replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[+d]);

/** One video: inline player for YouTube/Aparat/Drive/direct files, otherwise an «باز کردن ویدئو» link. Nothing autoplays; frames load lazily and only after the learner taps. */
export function VideoPlayer({ v }: { v: VideoView }) {
  const safe = safeHttpUrl(v.url)?.toString();
  if (v.provider === "file" && v.embed && safeHttpUrl(v.embed)) return <video className="vid-frame" controls playsInline preload="none" src={v.embed} aria-label={v.title} />;
  if (v.embed && safeHttpUrl(v.embed)) return <>
    <div className="vid-ratio"><iframe className="vid-frame" src={v.embed} title={v.title} loading="lazy" allow="fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-presentation" /></div>
    {safe && <small><a href={safe} target="_blank" rel="noopener noreferrer">اگر پخش نشد، در برگهٔ جدید باز کنید ↗</a></small>}
  </>;
  return safe ? <a className="vid-open" href={safe} target="_blank" rel="noopener noreferrer">باز کردن ویدئو ↗</a> : null;
}

/** A week's video list. `onToggle` shows the «دیدم ✓» tick (learner); `seen/total` on a video shows the read-only teacher count. */
export function VideoList({ videos, title = "ویدئوهای تدبر این هفته", onToggle, compact }: { videos: VideoView[]; title?: string | null; onToggle?: (v: VideoView) => void; compact?: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!videos.length) return null;
  return <div className={"vid-block" + (compact ? " compact" : "")} role="group" aria-label={title ?? "ویدئوها"}>
    {title && <b className="vid-title">{title}</b>}
    {videos.map(v => <div key={v.id} className={"vid-item" + (v.watched ? " seen" : "")}>
      <div className="vid-row">
        <button type="button" className="vid-name" aria-expanded={open === v.id} onClick={() => setOpen(o => o === v.id ? null : v.id)}>
          <span className="vid-play" aria-hidden="true">{open === v.id ? "▾" : "▶"}</span>
          <span><b>{fa(v.title)}</b><small>{[KIND_FA[v.kind], v.range ? fa(v.range) : "", v.duration ? fa(v.duration) : ""].filter(Boolean).join(" · ")}</small></span>
        </button>
        {onToggle && <button type="button" className={"vid-seen" + (v.watched ? " on" : "")} aria-pressed={v.watched} onClick={() => onToggle(v)}>{v.watched ? "دیدم ✓" : "دیدم"}</button>}
        {v.total != null && <span className="vid-count">{fa(v.seen ?? 0)} از {fa(v.total)} قرآن‌آموز دیده‌اند</span>}
      </div>
      {open === v.id && <div className="vid-body">
        {v.description && <p>{fa(v.description)}</p>}
        <VideoPlayer v={v} />
      </div>}
    </div>)}
  </div>;
}

/** Persist «دیدم» for the signed-in learner. Throws a Farsi message on failure. */
export async function setWatched(videoId: string, done: boolean) {
  const r = await fetch("/api/videos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "watched", videoId, done }) });
  const d = await r.json().catch(() => ({ error: "پاسخ نامعتبر بود." }));
  if (!r.ok) throw new Error(d.error || "خطا");
}
