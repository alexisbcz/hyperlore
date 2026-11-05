"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { DEFAULT_LAB_COMPANY, LAB_STYLES } from "./styles";

// A glimpse of each style's palette and type, so the cards differ before you open them.
const SWATCH: Record<string, { bg: string; fg: string; accent: string; font: string; radius: string }> = {
  current: { bg: "#ffffff", fg: "#121c2d", accent: "#0263e0", font: "var(--font-inter)", radius: "4px" },
  google: { bg: "#f8fafd", fg: "#1f1f1f", accent: "#0b57d0", font: "'Google Sans', var(--font-inter)", radius: "999px" },
  paste: { bg: "#ffffff", fg: "#121c2d", accent: "#0263e0", font: "Inter, var(--font-inter)", radius: "4px" },
};

export function LabIndex({ companies }: { companies: { slug: string; name: string }[] }) {
  const [slug, setSlug] = useState(companies.some((c) => c.slug === DEFAULT_LAB_COMPANY) ? DEFAULT_LAB_COMPANY : companies[0]?.slug);
  const name = companies.find((c) => c.slug === slug)?.name ?? slug;
  return (
    <>
      <label className="mt-8 flex max-w-sm flex-col gap-1.5 text-sm font-medium text-fg">
        Company
        <select
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="h-10 rounded-md border border-border bg-bg px-3 text-fg focus-visible:outline-2 focus-visible:outline-accent"
        >
          {companies.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LAB_STYLES.map((s) => {
          const w = SWATCH[s.id] ?? SWATCH.current;
          return (
            <li key={s.id}>
              <Link
                href={s.href(slug)}
                className="group flex h-full flex-col overflow-hidden rounded-lg border border-border transition-colors hover:border-border-strong focus-visible:outline-2 focus-visible:outline-accent"
              >
                <div aria-hidden="true" className="flex h-36 flex-col justify-center gap-3 border-b border-border px-6" style={{ background: w.bg, color: w.fg, fontFamily: w.font }}>
                  <span className="text-2xl font-medium">{name}</span>
                  <span className="flex gap-2">
                    <span className="h-7 w-24" style={{ background: w.accent, borderRadius: w.radius }} />
                    <span className="h-7 w-16 border" style={{ borderColor: `${w.fg}33`, borderRadius: w.radius }} />
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <span className="flex items-center justify-between font-medium text-fg">
                    {s.name}
                    <ArrowRight aria-hidden="true" className="size-4 text-fg-subtle transition-transform group-hover:translate-x-0.5" />
                  </span>
                  <span className="text-sm text-fg-muted">{s.blurb}</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
