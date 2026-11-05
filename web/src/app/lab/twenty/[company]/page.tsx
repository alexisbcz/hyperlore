import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  IconBlockquote,
  IconBuildingSkyscraper,
  IconCalendarEvent,
  IconCoins,
  IconExternalLink,
  IconFileText,
  IconHash,
  IconId,
  IconLink,
  IconMap,
  IconMoneybag,
  IconPencil,
  IconPhoto,
  IconProgressCheck,
  IconStairs,
  IconTag,
  IconTimelineEvent,
  IconTrendingUp,
  IconUser,
  IconUsers,
  IconWorldWww,
  IconBook,
  IconArrowMerge,
  IconChartLine,
} from "../icons";
import { companyName } from "@/lib/lore";
import { SOURCE_LABELS } from "@/lib/format";
import { stageLabel } from "@/lib/directory";
import { companyRecord, companyVideo, type CompanyRecord } from "../data";
import SHARE_VIDEOS from "../og/videos.json";
import { SITE_URL } from "@/lib/og";
import { CompanyChip, CompanyLogo, PageHead, Panel, PersonAvatar, SourceChip, StageTag, StatusTag, T, formatDate, money, usd } from "../ui";
import { Prose, Quotes, SourceList, Timeline } from "../prose";
import { RecordTabs } from "../record-tabs";
import { Chip, DetailsRow, LightButton, Tag, Text, Tooltip } from "../tw";
import { Flag } from "../companies/view";

export async function generateMetadata({ params }: PageProps<"/lab/twenty/[company]">): Promise<Metadata> {
  const { company } = await params;
  const [c, interview] = await Promise.all([companyRecord(company), companyVideo(company)]);
  const name = c?.name ?? companyName(company);
  // og:video: the share card's 6-second build-up (scripts/og-videos.mjs) where one was rendered,
  // then the founder interview the page quotes most.
  const videos = [
    ...((SHARE_VIDEOS as string[]).includes(company)
      ? [{ url: `${SITE_URL}/og/video/${company}.mp4`, secureUrl: `${SITE_URL}/og/video/${company}.mp4`, type: "video/mp4", width: 1200, height: 630 }]
      : []),
    ...(interview
      ? [{ url: `https://www.youtube.com/embed/${interview.id}`, secureUrl: `https://www.youtube.com/embed/${interview.id}`, type: "text/html", width: 1280, height: 720 }]
      : []),
  ];
  const description = c?.summary ?? `The sourced history of ${name}: renames, logos, funding rounds, launches and quotes.`;
  // The share card comes from ./opengraph-image.tsx (the Twenty-style card).
  return {
    title: `${name}: the lore`,
    description,
    alternates: { canonical: `/${company}` },
    openGraph: { title: `The lore of ${name}`, description, url: `/${company}`, type: "article", ...(videos.length && { videos }) },
    twitter: { card: "summary_large_image", title: `The lore of ${name}`, description },
  };
}

export default function CompanyPage({ params }: PageProps<"/lab/twenty/[company]">) {
  return (
    <Suspense>
      <Record params={params} />
    </Suspense>
  );
}

async function Record({ params }: { params: PageProps<"/lab/twenty/[company]">["params"] }) {
  const { company } = await params;
  const c = await companyRecord(company);
  if (!c) notFound();
  return (
    <>
      <PageHead
        section="companies"
        icon={IconBuildingSkyscraper}
        crumbs={[{ href: `${T}/companies`, label: "Companies" }]}
        title={c.name}
        actions={
          <>
            {c.website && (
              <LightButton startIcon={<IconWorldWww />} href={c.website} target="_blank" rel="noreferrer">
                Website
              </LightButton>
            )}
            <LightButton variant="outline" startIcon={<IconExternalLink />} href={`/${c.slug}`}>
              Classic page
            </LightButton>
          </>
        }
      />
      <Panel>
        <div className="tw-record">
          <aside className="tw-record-side">
            <Side c={c} />
          </aside>
          <div className="tw-record-main">
            <RecordTabs
              tabs={[
                { id: "timeline", label: "Timeline", icon: <IconTimelineEvent />, count: c.events.length, content: <Timeline events={c.events} /> },
                ...(c.overview ? [{ id: "overview", label: "Overview", icon: <IconBook />, content: <Prose markdown={c.overview.markdown} sources={c.sources} /> }] : []),
                ...(c.funding.length ? [{ id: "funding", label: "Funding", icon: <IconCoins />, count: c.funding.length, content: <Funding c={c} /> }] : []),
                ...(c.people.length ? [{ id: "people", label: "People", icon: <IconUsers />, count: c.people.length, content: <People c={c} /> }] : []),
                ...(c.quotes.length ? [{ id: "quotes", label: "Quotes", icon: <IconBlockquote />, count: c.quotes.length, content: <Quotes quotes={c.quotes} /> }] : []),
                ...(c.logos.length ? [{ id: "logos", label: "Logos", icon: <IconPhoto />, count: c.logos.length, content: <Logos c={c} /> }] : []),
                { id: "sources", label: "Sources", icon: <IconFileText />, count: Object.keys(c.sources).length, content: <Sources c={c} /> },
              ]}
            />
          </div>
        </div>
      </Panel>
    </>
  );
}

function Fact({ c, field, children }: { c: CompanyRecord; field: string; children: React.ReactNode }) {
  const url = c.facts[field];
  return url ? (
    <span className="tw-cell-row" style={{ flexWrap: "wrap" }}>
      {children}
      <Tooltip content="Source" description={url}>
        <a href={url} target="_blank" rel="noreferrer" className="tw-ext" aria-label="Source">
          <IconLink size={12} />
        </a>
      </Tooltip>
    </span>
  ) : (
    children
  );
}

const EMPTY = <span className="tw-cell-light">Empty</span>;

function Side({ c }: { c: CompanyRecord }) {
  const leads = c.investors.filter((i) => i.lead);
  const others = c.investors.filter((i) => !i.lead);
  return (
    <>
      <div className="tw-record-head">
        <CompanyLogo name={c.name} logo={c.logo} size="xxl" />
        <div>
          <h2 className="tw-record-title">{c.name}</h2>
          {c.tagline && <div className="tw-record-sub">{c.tagline}</div>}
        </div>
        {c.summary && <p className="tw-record-summary">{c.summary}</p>}
      </div>
      <dl className="tw-fields">
        <DetailsRow label="Website" startIcon={<IconWorldWww size={16} />} labelWidth={104}>
          {c.website ? (
            <Fact c={c} field="website">
              <a href={c.website} target="_blank" rel="noreferrer" className="tw-link">
                {c.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
              </a>
            </Fact>
          ) : (
            EMPTY
          )}
        </DetailsRow>
        <DetailsRow label="Status" startIcon={<IconProgressCheck size={16} />} labelWidth={104}>
          <StatusTag status={c.status} />
          {c.acquiredBy &&
            (c.acquirerSlug ? (
              <CompanyChip slug={c.acquirerSlug} name={c.acquiredBy} />
            ) : (
              <Text size="sm" color="secondary">
                by {c.acquiredBy}
              </Text>
            ))}
        </DetailsRow>
        <DetailsRow label="Founded" startIcon={<IconCalendarEvent size={16} />} labelWidth={104}>
          {c.founded ? (
            <Fact c={c} field="founded">
              <span className="tw-num">{formatDate(c.founded)}</span>
            </Fact>
          ) : (
            EMPTY
          )}
        </DetailsRow>
        <DetailsRow label="HQ" startIcon={<IconMap size={16} />} labelWidth={104}>
          {c.hq ? (
            <Fact c={c} field="hq">
              <span className="tw-cell-row">
                <Flag code={c.country} />
                {c.hq}
              </span>
            </Fact>
          ) : (
            EMPTY
          )}
        </DetailsRow>
        <DetailsRow label="Categories" startIcon={<IconTag size={16} />} labelWidth={104}>
          {c.categories.length
            ? c.categories.map((x) => (
                <Tag key={x} color="gray" render={<Link href={`${T}/companies?category=${encodeURIComponent(x)}`} />}>
                  {x}
                </Tag>
              ))
            : EMPTY}
        </DetailsRow>
        <DetailsRow label="Employees" startIcon={<IconUsers size={16} />} labelWidth={104}>
          {c.employees ? (
            <Fact c={c} field="employees">
              <span className="tw-num">
                {c.employees.count.toLocaleString("en")}
                {c.employees.asOf && <span className="tw-cell-light"> · {formatDate(c.employees.asOf)}</span>}
              </span>
            </Fact>
          ) : (
            EMPTY
          )}
        </DetailsRow>
        <DetailsRow label="Raised" startIcon={<IconCoins size={16} />} labelWidth={104}>
          {c.raisedUsd ? <span className="tw-num">{usd(c.raisedUsd)}</span> : EMPTY}
        </DetailsRow>
        <DetailsRow label="Valuation" startIcon={<IconTrendingUp size={16} />} labelWidth={104}>
          {c.valuation ? (
            <span className="tw-num">
              {usd(c.valuation.usd)} <span className="tw-cell-light">· {c.valuation.round}, {formatDate(c.valuation.date)}</span>
            </span>
          ) : (
            EMPTY
          )}
        </DetailsRow>
        {c.formerNames.length > 0 && (
          <DetailsRow label="Former names" startIcon={<IconPencil size={16} />} labelWidth={104}>
            {c.formerNames.map((n) => (
              <Tag key={n} color="purple" variant="outline">
                {n}
              </Tag>
            ))}
          </DetailsRow>
        )}
        {c.stocks.length > 0 && (
          <DetailsRow label="Ticker" startIcon={<IconChartLine size={16} />} labelWidth={104}>
            {c.stocks.map((s) => (
              <Tag key={s} color="blue" variant="outline" weight="medium">
                {s}
              </Tag>
            ))}
          </DetailsRow>
        )}
        {c.legalName && (
          <DetailsRow label="Legal name" startIcon={<IconId size={16} />} labelWidth={104}>
            <Fact c={c} field="legal_name">
              {c.legalName}
            </Fact>
          </DetailsRow>
        )}
        {Object.keys(c.links).length > 0 && (
          <DetailsRow label="Links" startIcon={<IconLink size={16} />} labelWidth={104}>
            {Object.entries(c.links)
              .filter(([, u]) => typeof u === "string" && /^https?:/.test(u))
              .map(([k, u]) => (
                <Chip key={k} variant="outline" render={<a href={u} target="_blank" rel="noreferrer" />} clickable>
                  {k}
                </Chip>
              ))}
          </DetailsRow>
        )}
      </dl>

      {c.founders.length > 0 && (
        <div className="tw-side-section">
          <div className="tw-side-section-head">
            <IconUser size={16} aria-hidden /> Founders <span className="tw-col-count tw-num">{c.founders.length}</span>
          </div>
          <div className="tw-rel">
            {c.founders.map((f) => {
              const role = c.people.find((p) => p.name === f.name)?.role;
              const inner = (
                <>
                  <PersonAvatar name={f.name} photo={f.photo} size="lg" />
                  <span className="tw-rel-text">{f.name}</span>
                  {role && <span className="tw-rel-meta">{role}</span>}
                </>
              );
              return f.slug ? (
                <Link key={f.name} href={`${T}/people/${f.slug}`} className="tw-rel-row">
                  {inner}
                </Link>
              ) : (
                <div key={f.name} className="tw-rel-row">
                  {inner}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {c.investors.length > 0 && (
        <div className="tw-side-section">
          <div className="tw-side-section-head">
            <IconMoneybag size={16} aria-hidden /> Investors <span className="tw-col-count tw-num">{c.investors.length}</span>
          </div>
          <div className="tw-chips">
            {[...leads, ...others].slice(0, 30).map((i) => (
              <Chip key={i.slug} variant={i.lead ? "soft" : "outline"} weight={i.lead ? "medium" : "regular"} render={<Link href={`${T}/investors/${i.slug}`} />} clickable tooltipContent={i.lead ? `${i.name} · led a round` : i.name}>
                {i.name}
              </Chip>
            ))}
            {c.investors.length > 30 && <span className="tw-cell-light">+{c.investors.length - 30}</span>}
          </div>
        </div>
      )}

      {c.places.length > 0 && (
        <div className="tw-side-section">
          <div className="tw-side-section-head">
            <IconMap size={16} aria-hidden /> Places <span className="tw-col-count tw-num">{c.places.length}</span>
          </div>
          <div className="tw-rel">
            {c.places.map((p) => (
              <Link key={p.slug} href={`${T}/places?q=${encodeURIComponent(p.name)}`} className="tw-rel-row">
                <IconMap size={14} aria-hidden style={{ color: "var(--t-font-color-tertiary)" }} />
                <span className="tw-rel-text">{p.name}</span>
                <span className="tw-rel-meta">{[p.city, p.opened && formatDate(p.opened)].filter(Boolean).join(" · ")}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {c.similar.length > 0 && (
        <div className="tw-side-section" style={{ borderBottom: 0 }}>
          <div className="tw-side-section-head">
            <IconArrowMerge size={16} aria-hidden /> Similar companies
          </div>
          <div className="tw-rel">
            {c.similar.map((s) => (
              <Link key={s.slug} href={`${T}/${s.slug}`} className="tw-rel-row">
                <CompanyLogo name={s.name} logo={s.logo} size="lg" />
                <span className="tw-rel-text">{s.name}</span>
                <span className="tw-rel-meta">{s.shared.slice(0, 2).join(", ")}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function Funding({ c }: { c: CompanyRecord }) {
  const rounds = c.funding.toSorted((a, b) => b.date.localeCompare(a.date));
  const chart = c.funding.filter((r) => r.amountUsd);
  const max = Math.max(1, ...chart.map((r) => r.amountUsd!));
  return (
    <>
      {chart.length > 1 && (
        <div style={{ borderBottom: "1px solid var(--t-border-color-light)" }}>
          <div className="tw-bars" style={{ height: 120 }}>
            {chart.map((r, i) => (
              <Tooltip key={i} content={`${r.round} · ${usd(r.amountUsd)}`} description={formatDate(r.date)} delay={0}>
                <div className="tw-bar" tabIndex={0}>
                  <div className="tw-bar-fill" style={{ height: `${Math.max(2, (r.amountUsd! / max) * 100)}%` }} />
                </div>
              </Tooltip>
            ))}
          </div>
          <div className="tw-bar-axis">
            {chart.map((r, i) => (
              <span key={i}>{r.date.slice(0, 4)}</span>
            ))}
          </div>
        </div>
      )}
      <table className="tw-table" style={{ width: "100%" }}>
        <colgroup>
          <col style={{ width: 108 }} />
          <col style={{ width: 200 }} />
          <col style={{ width: 96 }} />
          <col style={{ width: 100 }} />
          <col />
          <col style={{ width: 82 }} />
          <col style={{ width: 170 }} />
        </colgroup>
        <thead>
          <tr>
            {[
              [IconCalendarEvent, "Date"],
              [IconStairs, "Round"],
              [IconCoins, "Amount"],
              [IconTrendingUp, "Valuation"],
              [IconMoneybag, "Lead investors"],
              [IconHash, "Others"],
              [IconFileText, "Source"],
            ].map(([I, l], k) => {
              const Icon = I as typeof IconCoins;
              return (
                <th key={k} data-align={k === 2 || k === 3 || k === 5 ? "end" : undefined}>
                  <span className="tw-th">
                    <Icon size={16} stroke={1.6} aria-hidden />
                    <span className="tw-th-label">{l as string}</span>
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rounds.map((r, i) => (
            <tr key={i}>
              <td className="tw-num tw-cell-muted">{formatDate(r.date)}</td>
              <td>
                <span className="tw-cell-row">
                  <StageTag stage={r.stage} />
                  {r.round.toLowerCase() !== stageLabel(r.stage ?? "").toLowerCase() && (
                    <span className="tw-shrink tw-cell-muted" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                      {r.round}
                    </span>
                  )}
                </span>
              </td>
              <td data-align="end" className="tw-num">
                {money(r)}
              </td>
              <td data-align="end" className="tw-num">
                {usd(r.valuationUsd)}
              </td>
              <td>
                <span className="tw-cell-row">
                  {r.leads.map((l) => (
                    <Chip key={l.slug} variant="soft" render={<Link href={`${T}/investors/${l.slug}`} />} clickable>
                      {l.name}
                    </Chip>
                  ))}
                </span>
              </td>
              <td data-align="end" className="tw-num tw-cell-muted">
                <Tooltip content={r.investors.join(", ") || "None recorded"}>
                  <span>{r.investors.length || ""}</span>
                </Tooltip>
              </td>
              <td>{r.source && <SourceChip url={r.source} host={r.sourceHost ?? new URL(r.source).host} />}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>
              <span className="tw-agg">Count</span>
              <span className="tw-num">{rounds.length}</span>
            </td>
            <td />
            <td data-align="end">
              <span className="tw-agg">Sum</span>
              <span className="tw-num">{usd(c.raisedUsd)}</span>
            </td>
            <td colSpan={4} />
          </tr>
        </tfoot>
      </table>
    </>
  );
}

function People({ c }: { c: CompanyRecord }) {
  return (
    <table className="tw-table" style={{ width: "100%" }}>
      <colgroup>
        <col style={{ width: 230 }} />
        <col style={{ width: 200 }} />
        <col />
      </colgroup>
      <thead>
        <tr>
          {[
            [IconUser, "Name"],
            [IconId, "Role"],
            [IconFileText, "Context"],
          ].map(([I, l], k) => {
            const Icon = I as typeof IconUser;
            return (
              <th key={k}>
                <span className="tw-th">
                  <Icon size={16} stroke={1.6} aria-hidden />
                  <span className="tw-th-label">{l as string}</span>
                </span>
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {c.people.map((p) => (
          <tr key={p.name}>
            <td>
              <span className="tw-cell-row">
                <PersonAvatar name={p.name} photo={p.photo} size="md" />
                {p.slug ? (
                  <Link href={`${T}/people/${p.slug}`} className="tw-link tw-shrink">
                    {p.name}
                  </Link>
                ) : (
                  <span className="tw-shrink">{p.name}</span>
                )}
                {p.founder && (
                  <Tag color="blue" variant="soft">
                    Founder
                  </Tag>
                )}
              </span>
            </td>
            <td className="tw-cell-muted">{p.role}</td>
            <td className="tw-cell-muted" title={p.blurb}>
              {p.blurb}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Logos({ c }: { c: CompanyRecord }) {
  return (
    <div className="tw-logos">
      {c.logos.map((l) => (
        <a key={l.id} href={l.sourceUrl} target="_blank" rel="noreferrer" className="tw-logo-card" title={l.description}>
          <span className="tw-logo-card-img" data-dark={l.dark || undefined}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={l.src} alt={l.description ?? `${c.name} ${l.kind}`} loading="lazy" />
          </span>
          <span className="tw-logo-card-meta">
            <span>{l.kind}</span>
            <span className="tw-num">{formatDate(l.date)}</span>
          </span>
        </a>
      ))}
    </div>
  );
}

function Sources({ c }: { c: CompanyRecord }) {
  const all = Object.values(c.sources).toSorted((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
  const byType = new Map<string, number>();
  for (const s of all) byType.set(s.type, (byType.get(s.type) ?? 0) + 1);
  return (
    <div className="tw-prose" style={{ maxWidth: 1000 }}>
      <div className="tw-chips" style={{ marginBottom: "var(--t-spacing-3)" }}>
        {[...byType]
          .sort((a, b) => b[1] - a[1])
          .map(([t, n]) => (
            <Tag key={t} color="gray" variant="outline">
              {SOURCE_LABELS[t] ?? t} · {n}
            </Tag>
          ))}
      </div>
      <div className="tw-refs" style={{ marginTop: 0, paddingTop: 0, borderTop: 0 }}>
        <SourceList urls={all.map((s) => s.url)} sources={c.sources} />
      </div>
    </div>
  );
}
