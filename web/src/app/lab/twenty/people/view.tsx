"use client";

import Link from "next/link";
import { IconBuildingSkyscraper, IconFileText, IconId, IconUser } from "twenty-ui/icon";
import { Chip, Tag } from "twenty-ui/primitives/data-display";
import { RecordTable, type Column, type Facet } from "../table";
import type { Logo, PersonRow } from "../data";
import { CompanyLogo, PersonAvatar, T } from "../ui";

type Lookup = Record<string, { name: string; logo?: Logo }>;

const ROLE: Record<string, { label: string; color: "blue" | "green" | "gray" }> = {
  founder: { label: "Founder", color: "blue" },
  investor: { label: "Investor", color: "green" },
  employee: { label: "Employee", color: "gray" },
};

function columns(lookup: Lookup): Column<PersonRow>[] {
  return [
    {
      id: "name",
      label: "Name",
      icon: IconUser,
      width: 220,
      render: (r) => (
        <Chip shape="round" startElement={<PersonAvatar name={r.name} photo={r.photo} size="md" />} render={<Link href={`${T}/people/${r.slug}`} />} clickable maxWidth={210}>
          {r.name}
        </Chip>
      ),
      sort: (r) => r.name.toLowerCase(),
      csv: (r) => r.name,
    },
    {
      id: "roles",
      label: "Roles",
      icon: IconId,
      width: 180,
      render: (r) => (
        <span className="tw-cell-row">
          {r.roles.map((x) => (
            <Tag key={x} color={ROLE[x]?.color ?? "gray"} truncate={false}>
              {ROLE[x]?.label ?? x}
            </Tag>
          ))}
        </span>
      ),
      sort: (r) => r.roles[0],
      csv: (r) => r.roles.join("; "),
    },
    {
      id: "companies",
      label: "Companies",
      icon: IconBuildingSkyscraper,
      width: 320,
      render: (r) => (
        <span className="tw-cell-row">
          {r.companies.slice(0, 5).map((c) => (
            <Chip key={c} startElement={<CompanyLogo name={lookup[c]?.name ?? c} logo={lookup[c]?.logo} size="sm" />} render={<Link href={`${T}/${c}`} />} clickable>
              {lookup[c]?.name ?? c}
            </Chip>
          ))}
        </span>
      ),
      sort: (r) => r.companies.length || undefined,
      csv: (r) => r.companies.map((c) => lookup[c]?.name ?? c).join("; "),
    },
    { id: "summary", label: "About", icon: IconFileText, width: 520, render: (r) => <span className="tw-cell-muted">{r.summary}</span>, csv: (r) => r.summary },
  ];
}

export function PeopleView({ rows, lookup }: { rows: PersonRow[]; lookup: Lookup }) {
  const facets: Facet<PersonRow>[] = [
    { id: "role", label: "Role", icon: IconId, values: (r) => r.roles, label_: (v) => ROLE[v]?.label ?? v },
    { id: "company", label: "Company", icon: IconBuildingSkyscraper, values: (r) => r.companies, label_: (v) => lookup[v]?.name ?? v },
  ];
  return (
    <RecordTable
      name="All people"
      rows={rows}
      columns={columns(lookup)}
      rowKey={(r) => r.slug}
      search={(r) => [r.name, r.summary, ...r.companies.map((c) => lookup[c]?.name ?? c)].join(" ")}
      facets={facets}
      defaultSort={{ id: "companies", dir: "desc" }}
      csvName="hyperlore-people"
      searchPlaceholder="Search people"
    />
  );
}
