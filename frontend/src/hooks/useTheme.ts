import { useState } from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "acheron-theme";

function readInitialTheme(): Theme {
  // index.html's inline script already set this attribute before first
  // paint (avoiding a flash of the wrong theme) — read it back so React
  // state starts in sync with the DOM instead of re-deriving it.
  const attr = document.documentElement.getAttribute("data-theme");
  return attr === "light" ? "light" : "dark";
}

export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>(readInitialTheme);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    // Set the DOM attribute + storage synchronously, before setState —
    // not in a useEffect. GraphView resolves CSS variables via
    // getComputedStyle synchronously during its own render (canvas can't
    // read `var(--x)` directly); if the attribute changed reactively in an
    // effect instead, GraphView could re-render and read stale colors
    // before the effect had a chance to update the DOM.
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(STORAGE_KEY, next);
    setTheme(next);
  }

  return { theme, toggle };
}
