import { useEffect, useState } from "react";

type Theme = "light" | "dark";
const KEY = "theme";

// Runs before first paint (injected via <head> in __root.tsx) so the page never flashes the wrong theme.
export const THEME_INIT_SCRIPT = `(function(){try{var t=null;try{t=localStorage.getItem("${KEY}")}catch(e){}if(t!=="dark"&&t!=="light"){t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.setAttribute("data-theme",t);document.documentElement.style.colorScheme=t}catch(e){}})();`;

function apply(t: Theme) {
  document.documentElement.setAttribute("data-theme", t);
  document.documentElement.style.colorScheme = t;
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");
    // Follow the system setting live, unless the user made an explicit choice.
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => {
      let stored: string | null = null;
      try {
        stored = localStorage.getItem(KEY);
      } catch {
        /* storage unavailable */
      }
      if (stored === "dark" || stored === "light") return;
      const t: Theme = e.matches ? "dark" : "light";
      apply(t);
      setTheme(t);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const dark = theme === "dark";
  const flip = () => {
    const t: Theme = dark ? "light" : "dark";
    apply(t);
    setTheme(t);
    try {
      localStorage.setItem(KEY, t);
    } catch {
      /* storage unavailable */
    }
  };

  return (
    <button
      type="button"
      className={`theme-toggle ${className}`.trim()}
      onClick={flip}
      aria-label="حالت شب"
      title="حالت شب"
      aria-pressed={dark}
    >
      {dark ? (
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  );
}
