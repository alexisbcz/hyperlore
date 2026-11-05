"use client";

import { File, type FileContents } from "@pierre/diffs/react";
import { useSyncExternalStore } from "react";

// Pierre's file renderer (@pierre/diffs), hydrated from HTML highlighted on the server. It follows the
// site's theme toggle: dark unless <html> says data-theme="light".
function subscribe(onChange: () => void) {
  const mo = new MutationObserver(onChange);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
}
const siteTheme = () => (document.documentElement.getAttribute("data-theme") as "light" | "dark" | null) ?? "dark";

export function CodeFile({ file, prerenderedHTML, label }: { file: FileContents; prerenderedHTML: string; label: string }) {
  const themeType = useSyncExternalStore(subscribe, siteTheme, () => "dark" as const);
  return (
    <div role="region" aria-label={label} className="overflow-hidden rounded-lg border border-border">
      <File
        file={file}
        prerenderedHTML={prerenderedHTML}
        options={{ theme: { dark: "pierre-dark", light: "pierre-light" }, themeType, overflow: "scroll" }}
      />
    </div>
  );
}
