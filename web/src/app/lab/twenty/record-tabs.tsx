"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Tabs } from "twenty-ui/primitives/navigation";
import { Badge } from "twenty-ui/primitives/data-display";

export type RecordTab = { id: string; label: string; icon: ReactNode; count?: number; content: ReactNode };

/** The record page's tab strip (Timeline, Overview, Funding…). The open tab is kept in ?tab= so it can be linked. */
export function RecordTabs({ tabs }: { tabs: RecordTab[] }) {
  const [value, setValue] = useState(tabs[0]?.id);
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    // A #event anchor opens the timeline; ?tab= wins otherwise.
    const want = t ?? (window.location.hash ? tabs.find((x) => x.id === "timeline")?.id : undefined);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (want && tabs.some((x) => x.id === want)) setValue(want);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const change = (v: string) => {
    setValue(v);
    const p = new URLSearchParams(window.location.search);
    if (v === tabs[0]?.id) p.delete("tab");
    else p.set("tab", v);
    const s = p.toString();
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${s ? `?${s}` : ""}`);
  };
  return (
    <Tabs.Root value={value} onValueChange={change} style={{ display: "contents" }}>
      <Tabs.List aria-label="Record">
        {tabs.map((t) => (
          <Tabs.Tab key={t.id} value={t.id} startIcon={t.icon} badge={t.count ? <Badge>{t.count.toLocaleString("en")}</Badge> : undefined}>
            {t.label}
          </Tabs.Tab>
        ))}
        <Tabs.Indicator renderBeforeHydration />
      </Tabs.List>
      {tabs.map((t) => (
        <Tabs.Panel key={t.id} value={t.id}>
          {t.content}
        </Tabs.Panel>
      ))}
    </Tabs.Root>
  );
}
