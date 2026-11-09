"use client";

import Link from "next/link";
import { IconBuildingSkyscraper, IconCalendarEvent, IconFileText, IconMap, IconTimelineEvent, IconUsers, IconWorld } from "twenty-ui/icon";
import { Chip } from "twenty-ui/primitives/data-display";
import { RecordTable, type Column, type Facet } from "../table";
import type { Logo } from "../data";
import { CompanyLogo, formatDate, T } from "../ui";
import { Flag } from "../companies/view";
import { countryCode, countryName } from "@/lib/directory";

export type PlaceRow = { slug: string; name: string; city?: string; country?: string; address?: string; opened?: string; summary?: string; companies: string[]; events: number; people: number };
type Lookup = Record<string, { name: string; logo?: Logo }>;

const country = (r: PlaceRow) => countryCode(r.country);

function columns(lookup: Lookup): Column<PlaceRow>[] {
  return [
    {
      id: "name",
      label: "Place",
      icon: IconMap,
      width: 260,
      render: (r) => (
        <a href={`/places/${r.slug}`} className="tw-cell-row tw-link">
          <IconMap size={14} aria-hidden style={{ color: "var(--t-font-color-tertiary)" }} />
          <span className="tw-shrink">{r.name}</span>
        </a>
      ),
      sort: (r) => r.name.toLowerCase(),
      csv: (r) => r.name,
    },
    {
      id: "city",
      label: "City",
      icon: IconWorld,
      width: 180,
      render: (r) => (
        <span className="tw-cell-row">
          <Flag code={country(r)} />
          <span className="tw-shrink">{[r.city, countryName(country(r)) || r.country].filter(Boolean).join(", ")}</span>
        </span>
      ),
      sort: (r) => r.city,
    },
    { id: "opened", label: "Opened", icon: IconCalendarEvent, width: 110, render: (r) => <span className="tw-num tw-cell-muted">{formatDate(r.opened)}</span>, sort: (r) => r.opened },
    {
      id: "companies",
      label: "Companies",
      icon: IconBuildingSkyscraper,
      width: 260,
      render: (r) => (
        <span className="tw-cell-row">
          {r.companies.map((c) => (
            <Chip key={c} startElement={<CompanyLogo name={lookup[c]?.name ?? c} logo={lookup[c]?.logo} size="sm" />} render={<Link href={`${T}/${c}`} />} clickable>
              {lookup[c]?.name ?? c}
            </Chip>
          ))}
        </span>
      ),
      sort: (r) => r.companies.length,
      csv: (r) => r.companies.join("; "),
    },
    { id: "events", label: "Events", icon: IconTimelineEvent, width: 84, align: "end", render: (r) => <span className="tw-num">{r.events || ""}</span>, sort: (r) => r.events },
    { id: "people", label: "People", icon: IconUsers, width: 84, align: "end", render: (r) => <span className="tw-num">{r.people || ""}</span>, sort: (r) => r.people },
    { id: "summary", label: "About", icon: IconFileText, width: 480, render: (r) => <span className="tw-cell-muted">{r.summary}</span>, csv: (r) => r.summary },
  ];
}

export function PlacesView({ rows, lookup }: { rows: PlaceRow[]; lookup: Lookup }) {
  const facets: Facet<PlaceRow>[] = [
    { id: "country", label: "Country", icon: IconWorld, values: (r) => (country(r) ? [country(r)!] : []), label_: countryName },
    { id: "company", label: "Company", icon: IconBuildingSkyscraper, values: (r) => r.companies, label_: (v) => lookup[v]?.name ?? v },
  ];
  return (
    <RecordTable
      name="All places"
      rows={rows}
      columns={columns(lookup)}
      rowKey={(r) => r.slug}
      search={(r) => [r.name, r.city, r.country, r.address, r.summary, ...r.companies.map((c) => lookup[c]?.name ?? c)].join(" ")}
      facets={facets}
      defaultSort={{ id: "events", dir: "desc" }}
      csvName="hyperlore-places"
      searchPlaceholder="Search places"
    />
  );
}
