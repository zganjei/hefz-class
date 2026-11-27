import { useEffect, useState } from "react";

/** Result message that stays visible wherever the admin has scrolled (fixed above the bottom nav). Success clears itself; errors stay until dismissed or the next action. */
export function Notice({ msg }: { msg: string }) {
  const [shown, setShown] = useState(msg);
  useEffect(() => {
    setShown(msg);
    if (!msg || !msg.includes("✅")) return;
    const t = setTimeout(() => setShown(""), 7000);
    return () => clearTimeout(t);
  }, [msg]);
  if (!shown) return null;
  const good = shown.includes("✅");
  return <div className={"notice-toast " + (good ? "ok" : "bad")} role={good ? "status" : "alert"}>
    <span>{shown}</span>
    <button type="button" aria-label="بستن" onClick={() => setShown("")}>×</button>
  </div>;
}
