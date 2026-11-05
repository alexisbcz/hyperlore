"use client";

import Link from "next/link";
import { useState } from "react";
import { Dropdown } from "twenty-ui/components/navigation";
import { LightButton } from "twenty-ui/components/input";
import { Text } from "twenty-ui/primitives/typography";
import { IconArrowRight, IconBuildingSkyscraper, IconChevronDown } from "twenty-ui/icon";
import { DEFAULT_LAB_COMPANY, LAB_STYLES } from "../../../(classic)/lab/styles";

// A glimpse of each style's palette and type, so the cards differ before you open them.
const SWATCH: Record<string, { bg: string; fg: string; accent: string; font: string; radius: string }> = {
  current: { bg: "#ffffff", fg: "#333333", accent: "#1961ed", font: "var(--t-font-family)", radius: "4px" },
  classic: { bg: "#0b0c0e", fg: "#f5f5f2", accent: "#ccff2a", font: "var(--font-inter)", radius: "8px" },
  google: { bg: "#f8fafd", fg: "#1f1f1f", accent: "#0b57d0", font: "'Google Sans', var(--font-inter)", radius: "999px" },
  paste: { bg: "#ffffff", fg: "#121c2d", accent: "#0263e0", font: "Inter, var(--font-inter)", radius: "4px" },
};

export function LabView({ companies }: { companies: { slug: string; name: string }[] }) {
  const [slug, setSlug] = useState(companies.some((c) => c.slug === DEFAULT_LAB_COMPANY) ? DEFAULT_LAB_COMPANY : companies[0]?.slug);
  const [q, setQ] = useState("");
  const name = companies.find((c) => c.slug === slug)?.name ?? slug;
  const shown = companies.filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase())).slice(0, 80);
  return (
    <>
      <div className="tw-viewbar">
        <Dropdown.Root type="picker">
          <Dropdown.Trigger render={<LightButton startIcon={<IconBuildingSkyscraper />} endIcon={<IconChevronDown />}>{name}</LightButton>} />
          <Dropdown.Content aria-label="Company" width={260}>
            <Dropdown.Search aria-label="Search companies" value={q} onValueChange={setQ} />
            <Dropdown.Section scrollable>
              <Dropdown.SelectionGroup id="company" aria-label="Company" value={slug} onValueChange={(v: string | null) => v && setSlug(v)}>
                {shown.map((c) => (
                  <Dropdown.OptionItem key={c.slug} value={c.slug} indicator="check">
                    {c.name}
                  </Dropdown.OptionItem>
                ))}
              </Dropdown.SelectionGroup>
              {!shown.length && <Dropdown.Empty>No companies</Dropdown.Empty>}
            </Dropdown.Section>
          </Dropdown.Content>
        </Dropdown.Root>
        <Text size="sm" color="tertiary" style={{ marginLeft: 8 }}>
          Pick a company, then open it in each design.
        </Text>
      </div>
      <div className="tw-scroll">
        <div className="tw-dash">
          {LAB_STYLES.map((s) => {
            const w = SWATCH[s.id] ?? SWATCH.current;
            return (
              <Link key={s.id} href={s.href(slug)} className="tw-widget" data-span={6} style={{ textDecoration: "none" }}>
                <div aria-hidden="true" style={{ height: 120, display: "flex", flexDirection: "column", justifyContent: "center", gap: 12, padding: "0 24px", background: w.bg, color: w.fg, fontFamily: w.font, borderBottom: "1px solid var(--t-border-color-light)" }}>
                  <span style={{ fontSize: 22, fontWeight: 500 }}>{name}</span>
                  <span style={{ display: "flex", gap: 8 }}>
                    <span style={{ width: 96, height: 26, background: w.accent, borderRadius: w.radius }} />
                    <span style={{ width: 64, height: 26, border: `1px solid ${w.fg}33`, borderRadius: w.radius }} />
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "10px 12px 12px" }}>
                  <span className="tw-cell-row" style={{ justifyContent: "space-between", fontWeight: 500 }}>
                    {s.name}
                    <IconArrowRight size={14} aria-hidden style={{ color: "var(--t-font-color-tertiary)" }} />
                  </span>
                  <Text size="sm" color="tertiary">
                    {s.blurb}
                  </Text>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
