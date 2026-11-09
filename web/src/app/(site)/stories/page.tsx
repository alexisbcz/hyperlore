import type { Metadata } from "next";
import { indexMetadata } from "../og/meta";
import Link from "next/link";
import { Suspense } from "react";
import { IconBook2, IconBuildingSkyscraper, IconCalendar, IconFileText, IconHash } from "../icons";
import { companyLookup, storyRows } from "../data";
import { CompanyLogo, PageHead, Panel, T, formatDate } from "../ui";

export const metadata: Metadata = indexMetadata({ title: "Stories", description: "Cross-company stories written from the archive, with a citation on every fact.", path: "/stories" });

export default function StoriesPage() {
  return (
    <>
      <PageHead section="stories" icon={IconBook2} title="Stories" />
      <Panel>
        <Suspense>
          <Rows />
        </Suspense>
      </Panel>
    </>
  );
}

const TH = ({ icon: Icon, label, end }: { icon: typeof IconBook2; label: string; end?: boolean }) => (
  <th data-align={end ? "end" : undefined}>
    <span className="tw-th">
      <Icon size={16} stroke={1.6} aria-hidden />
      <span className="tw-th-label">{label}</span>
    </span>
  </th>
);

async function Rows() {
  const [rows, lookup] = await Promise.all([storyRows(), companyLookup()]);
  return (
    <>
      <div className="tw-viewbar">
        <div className="tw-viewbar-name">
          <IconBook2 size={16} aria-hidden style={{ color: "var(--t-font-color-tertiary)" }} />
          All stories <span className="tw-viewbar-count tw-num">· {rows.length}</span>
        </div>
      </div>
      <div className="tw-scroll">
        <table className="tw-table">
          <colgroup>
            <col style={{ width: 40 }} />
            <col style={{ width: 340 }} />
            <col style={{ width: 300 }} />
            <col style={{ width: 90 }} />
            <col style={{ width: 120 }} />
            <col style={{ width: 560 }} />
          </colgroup>
          <thead>
            <tr>
              <th aria-label="Row" />
              <TH icon={IconBook2} label="Title" />
              <TH icon={IconBuildingSkyscraper} label="Companies" />
              <TH icon={IconHash} label="Words" end />
              <TH icon={IconCalendar} label="Updated" />
              <TH icon={IconFileText} label="Summary" />
            </tr>
          </thead>
          <tbody>
            {rows.map((s, i) => (
              <tr key={s.slug}>
                <td className="tw-index tw-num">{i + 1}</td>
                <td>
                  <Link href={`${T}/stories/${s.slug}`} className="tw-link" style={{ fontWeight: 500 }}>
                    {s.title}
                  </Link>
                </td>
                <td>
                  <span className="tw-cell-row">
                    {s.companies.slice(0, 6).map((c) => (
                      <Link key={c} href={`${T}/${c}`} title={lookup[c]?.name ?? c}>
                        <CompanyLogo name={lookup[c]?.name ?? c} logo={lookup[c]?.logo} size="md" />
                      </Link>
                    ))}
                    {s.companies.length > 6 && <span className="tw-cell-light">+{s.companies.length - 6}</span>}
                  </span>
                </td>
                <td data-align="end" className="tw-num">
                  {s.words.toLocaleString("en")}
                </td>
                <td className="tw-num tw-cell-muted">{formatDate(s.updatedAt.slice(0, 10))}</td>
                <td className="tw-cell-muted">{s.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
