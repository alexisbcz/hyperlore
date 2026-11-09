"use client";

import Link from "next/link";
import { IconBuildingSkyscraper, IconCoins, IconLayoutGrid } from "twenty-ui/icon";
import { TintedIconTile } from "twenty-ui/components/data-display";
import { Chip } from "twenty-ui/primitives/data-display";
import { RecordTable, type Column } from "../table";
import type { Logo } from "../data";
import { CompanyLogo, usd, T } from "../ui";

export type CategoryRow = { slug: string; id: string; label: string; count: number; raisedUsd: number; top: { slug: string; name: string; logo?: Logo }[] };

const TINTS = ["blue", "green", "purple", "orange", "sky", "pink", "turquoise", "amber", "violet", "red", "jade", "gold"];
const tint = (s: string) => TINTS[[...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0) % TINTS.length];

const COLUMNS: Column<CategoryRow>[] = [
  {
    id: "label",
    label: "Category",
    icon: IconLayoutGrid,
    width: 230,
    render: (r) => (
      <Link href={`${T}/companies?category=${encodeURIComponent(r.label)}`} className="tw-cell-row tw-link">
        <TintedIconTile icon={<IconLayoutGrid size={12} />} color={tint(r.label)} />
        <span className="tw-shrink">{r.label}</span>
      </Link>
    ),
    sort: (r) => r.label.toLowerCase(),
    csv: (r) => r.label,
  },
  { id: "count", label: "Companies", icon: IconBuildingSkyscraper, width: 110, align: "end", render: (r) => <span className="tw-num">{r.count}</span>, sort: (r) => r.count },
  { id: "raised", label: "Raised", icon: IconCoins, width: 110, align: "end", render: (r) => <span className="tw-num">{usd(r.raisedUsd)}</span>, sort: (r) => r.raisedUsd || undefined },
  {
    id: "top",
    label: "Most funded",
    icon: IconBuildingSkyscraper,
    width: 640,
    render: (r) => (
      <span className="tw-cell-row">
        {r.top.map((c) => (
          <Chip key={c.slug} startElement={<CompanyLogo name={c.name} logo={c.logo} size="sm" />} render={<Link href={`${T}/${c.slug}`} />} clickable>
            {c.name}
          </Chip>
        ))}
      </span>
    ),
    csv: (r) => r.top.map((c) => c.name).join("; "),
  },
];

export function CategoriesView({ rows }: { rows: CategoryRow[] }) {
  return <RecordTable name="All categories" rows={rows} columns={COLUMNS} rowKey={(r) => r.slug} search={(r) => r.label} defaultSort={{ id: "count", dir: "desc" }} csvName="hyperlore-categories" searchPlaceholder="Search categories" />;
}
