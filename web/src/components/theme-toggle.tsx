"use client";

import { Moon, Sun } from "lucide-react";
import { useLayoutEffect, useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

const KEY = "theme";
const LABEL: Record<Theme, string> = { light: "Light", dark: "Dark" };
const COLOR = { light: "#f6f6f3", dark: "#0b0c0e" };
const EVENT = "hyperlore:theme";

// Runs in <head> before first paint. Dark is the default; only a stored "light" changes anything.
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${KEY}");if(t==="light")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

function read(): Theme {
  try {
    return localStorage.getItem(KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    if (m.content !== COLOR[theme]) m.content = COLOR[theme];
  });
}

export function setTheme(theme: Theme) {
  try {
    if (theme === "dark") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, theme);
  } catch {}
  apply(theme);
  window.dispatchEvent(new Event(EVENT));
}

export const nextTheme = (theme: Theme): Theme => (theme === "dark" ? "light" : "dark");
export const cycleTheme = () => setTheme(nextTheme(read()));
export const themeLabel = (theme: Theme) => LABEL[theme];

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) {
      apply(read());
      onChange();
    }
  };
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, read, () => "dark");
}

export function ThemeToggle() {
  const theme = useTheme();
  // Re-apply after mount: React's dev remount resets <html> attributes, and the theme-color
  // metas are rendered after the inline script ran. (No usePathname here: the root layout must
  // stay prerenderable; the observer below covers navigations.)
  useLayoutEffect(() => apply(read()), []);
  // Next re-renders the viewport metas (resetting their content) after navigations; re-pin them.
  // apply() only writes when a value differs, so this cannot loop.
  useLayoutEffect(() => {
    const observer = new MutationObserver(() => apply(read()));
    observer.observe(document.head, { subtree: true, childList: true, attributes: true, attributeFilter: ["content"] });
    return () => observer.disconnect();
  }, []);
  const next = nextTheme(theme);
  const Icon = theme === "light" ? Sun : Moon;
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Theme: ${LABEL[theme]}. Switch to ${LABEL[next].toLowerCase()}`}
      title={`Theme: ${LABEL[theme]}`}
      className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border text-fg-subtle transition-colors hover:border-border-strong hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
    >
      <Icon aria-hidden="true" className="size-4" />
    </button>
  );
}
