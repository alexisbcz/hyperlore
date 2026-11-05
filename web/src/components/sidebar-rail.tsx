"use client";

import { useEffect, useSyncExternalStore } from "react";
import { SIDEBAR_KEY } from "@/lib/sidebar";

// Like shadcn/ui's SidebarRail: the sidebar's right border is a button that collapses it off-canvas,
// and ⌘B / Ctrl+B does the same. State lives on <html data-sidebar> so CSS does the layout.

const isCollapsed = () => document.documentElement.dataset.sidebar === "collapsed";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-sidebar"] });
  return () => observer.disconnect();
}

function toggle() {
  const collapse = !isCollapsed();
  const root = document.documentElement;
  if (collapse) root.dataset.sidebar = "collapsed";
  else delete root.dataset.sidebar;
  try {
    if (collapse) localStorage.setItem(SIDEBAR_KEY, "collapsed");
    else localStorage.removeItem(SIDEBAR_KEY);
  } catch {}
}

export function SidebarRail() {
  const collapsed = useSyncExternalStore(subscribe, isCollapsed, () => false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "b" && (e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const label = collapsed ? "Expand sidebar" : "Collapse sidebar";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      aria-expanded={!collapsed}
      title={`${label} (⌘B)`}
      tabIndex={-1}
      className="sidebar-rail"
    />
  );
}
