"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Dropdown } from "twenty-ui/components/navigation";
import { LightButton, LightIconButton } from "twenty-ui/components/input";
import { Chip } from "twenty-ui/primitives/data-display";
import { IconPlus, IconX } from "twenty-ui/icon";
import type { Logo } from "../data";
import { CompanyLogo } from "../ui";

// Not imported from @/lib/directory's MAX_COMPARE through a server boundary: kept local and equal.
const MAX = 4;

type Option = { slug: string; name: string; logo?: Logo };

/** The compared companies as removable chips, and a searchable picker to add one (up to four). */
export function ComparePicker({ selected, options }: { selected: Option[]; options: Option[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const chosen = selected.map((s) => s.slug);
  const go = (slugs: string[]) => router.push(slugs.length ? `/compare?c=${slugs.join(",")}` : "/compare", { scroll: false });
  const needle = q.trim().toLowerCase();
  const available = options.filter((o) => !chosen.includes(o.slug) && (!needle || o.name.toLowerCase().includes(needle) || o.slug.includes(needle))).slice(0, 80);
  return (
    <div className="tw-viewbar">
      <div className="tw-viewbar-name">Comparing</div>
      {selected.map((s, i) => (
        <Chip
          key={s.slug}
          variant="outline"
          size="md"
          startElement={
            <span className="tw-cmp-key-wrap">
              <span aria-hidden="true" className="tw-cmp-key" data-series={i} />
              <CompanyLogo name={s.name} logo={s.logo} size="sm" />
            </span>
          }
          endElementDivider
          endElement={
            <LightIconButton aria-label={`Remove ${s.name} from the comparison`} size="xs" emphasis="subtle" onClick={() => go(chosen.filter((x) => x !== s.slug))}>
              <IconX />
            </LightIconButton>
          }
        >
          {s.name}
        </Chip>
      ))}
      {chosen.length < MAX && (
        <Dropdown.Root type="picker" onOpenChange={(open) => !open && setQ("")}>
          <Dropdown.Trigger render={<LightButton startIcon={<IconPlus />}>{chosen.length ? "Add company" : "Pick a company"}</LightButton>} />
          <Dropdown.Content aria-label="Add a company to compare" width={260}>
            <Dropdown.Search aria-label="Search companies" value={q} onValueChange={setQ} />
            <Dropdown.Section scrollable>
              {available.map((o) => (
                <Dropdown.ActionItem key={o.slug} startIcon={<CompanyLogo name={o.name} logo={o.logo} size="md" />} onClick={() => go([...chosen, o.slug])}>
                  {o.name}
                </Dropdown.ActionItem>
              ))}
              {!available.length && <Dropdown.Empty>No company matches</Dropdown.Empty>}
            </Dropdown.Section>
          </Dropdown.Content>
        </Dropdown.Root>
      )}
      <div className="tw-viewbar-spacer" />
      <span className="tw-cell-light" style={{ fontSize: "var(--t-font-size-sm)" }}>
        Up to {MAX} companies, on one time axis
      </span>
    </div>
  );
}
