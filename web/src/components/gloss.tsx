import type { ComponentType, CSSProperties } from "react";

export type GlossItem = { icon: ComponentType<{ "aria-hidden"?: boolean }>; hue: number; sat?: number };

/** A glossy app-icon tile. No "use client": server pages pass it lucide components directly. */
export function Gloss({ item, large }: { item: GlossItem; large?: boolean }) {
  const Icon = item.icon;
  return (
    <span aria-hidden="true" className={large ? "gloss gloss-lg" : "gloss"} style={{ "--hue": item.hue, "--sat": item.sat ?? 90 } as CSSProperties}>
      <Icon aria-hidden />
    </span>
  );
}
