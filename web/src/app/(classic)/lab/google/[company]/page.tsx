import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { Google_Sans, Google_Sans_Code } from "next/font/google";
import { ArrowUpRight, ChevronDown, ChevronRight, Quote } from "lucide-react";
import { formatDate, formatUsd } from "@/components/lore";
import { SOURCE_LABELS } from "@/lib/format";
import { companyName, labCompanies, labCompany, type LabLore } from "../../data";
import { LabBar } from "../../lab-bar";
import "./google.css";

// Design trial: the company page in a Google / Material 3 style, to compare against /<company>.

const sans = Google_Sans({ subsets: ["latin"], variable: "--font-google-sans", weight: ["400", "500", "600", "700"] });
const code = Google_Sans_Code({ subsets: ["latin"], variable: "--font-google-sans-code", weight: ["400", "500"] });

export async function generateMetadata({ params }: PageProps<"/lab/google/[company]">): Promise<Metadata> {
  const { company } = await params;
  return { title: `${companyName(company)} (Google style trial)`, robots: { index: false } };
}

export default function Page({ params }: PageProps<"/lab/google/[company]">) {
  return (
    <Suspense>
      <Trial params={params} />
    </Suspense>
  );
}

async function Trial({ params }: { params: PageProps<"/lab/google/[company]">["params"] }) {
  const { company } = await params;
  const [lore, companies] = await Promise.all([labCompany(company), labCompanies()]);
  if (!lore) notFound();
  return (
    <div className={`g3 ${sans.variable} ${code.variable} min-h-full pb-28`}>
      <GooglePage lore={lore} />
      <LabBar style="google" slug={lore.slug} companies={companies} />
    </div>
  );
}

const PREVIEW = 30;

// Event kind → container colour, like Google's coloured assist chips.
const KIND_TONE: Record<string, string> = {
  founding: "bg-[var(--g-primary-container)] text-[var(--g-on-primary-container)]",
  funding: "bg-[var(--g-tertiary-container)] text-[var(--g-on-tertiary-container)]",
  acquisition: "bg-[var(--g-tertiary-container)] text-[var(--g-on-tertiary-container)]",
  acquired: "bg-[var(--g-tertiary-container)] text-[var(--g-on-tertiary-container)]",
  launch: "bg-[var(--g-secondary-container)] text-[var(--g-on-secondary-container)]",
  product: "bg-[var(--g-secondary-container)] text-[var(--g-on-secondary-container)]",
  rename: "bg-[var(--g-primary-container)] text-[var(--g-on-primary-container)]",
  rebrand: "bg-[var(--g-primary-container)] text-[var(--g-on-primary-container)]",
};
const NEUTRAL_TONE = "bg-[var(--g-container-high)] text-[var(--g-on-surface-variant)]";

const CARD = "rounded-3xl bg-[var(--g-container)] shadow-[var(--g-shadow)]";
const LINK = "text-[var(--g-primary)] hover:underline underline-offset-2";

function GooglePage({ lore }: { lore: LabLore }) {
  const tabs = [
    lore.funding.length > 0 && ["funding", "Funding"],
    lore.people.length > 0 && ["people", "People"],
    ["timeline", "Timeline"],
    lore.quotes.length > 0 && ["quotes", "Quotes"],
    lore.similar.length > 0 && ["similar", "Similar"],
  ].filter(Boolean) as [string, string][];
  return (
    <>
      <div className="mx-auto max-w-[1180px] px-4 pt-8 sm:px-6">
        <Hero lore={lore} />
      </div>
      <nav
        aria-label="Sections"
        className="z-20 mt-6 border-b border-[var(--g-outline-variant)] bg-[var(--g-surface)] lg:sticky lg:top-14"
      >
        <div className="mx-auto flex max-w-[1180px] gap-1 overflow-x-auto px-4 [scrollbar-width:none] sm:px-6">
          {tabs.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="g-state shrink-0 rounded-t-lg px-4 py-3 text-sm font-medium text-[var(--g-on-surface-variant)] hover:text-[var(--g-on-surface)]"
            >
              {label}
            </a>
          ))}
        </div>
      </nav>
      <div className="mx-auto grid max-w-[1180px] gap-6 px-4 pt-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6 lg:order-1">
          {lore.funding.length > 0 && <Funding lore={lore} />}
          {lore.people.length > 0 && <People lore={lore} />}
          <Timeline lore={lore} />
          {lore.quotes.length > 0 && <Quotes lore={lore} />}
          {lore.similar.length > 0 && <Similar lore={lore} />}
        </div>
        <aside aria-label="Company facts" className="lg:order-2">
          <div className="lg:sticky lg:top-32">
            <KnowledgePanel lore={lore} />
          </div>
        </aside>
      </div>
    </>
  );
}

function Hero({ lore }: { lore: LabLore }) {
  return (
    <header>
      <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1 text-sm text-[var(--g-on-surface-variant)]">
        <Link href="/companies" className="g-state rounded-full px-2 py-1">
          Companies
        </Link>
        <ChevronRight aria-hidden="true" className="size-4" />
        <span className="px-2 py-1 text-[var(--g-on-surface)]">{lore.name}</span>
      </nav>
      <div className="flex items-center gap-4">
        <Mark src={lore.icon} name={lore.name} size="size-16" />
        <div className="min-w-0">
          <h1 className="text-4xl font-normal tracking-tight sm:text-[44px] sm:leading-[52px]">{lore.name}</h1>
          <p className="text-sm text-[var(--g-on-surface-variant)]">
            {[lore.categories[0] ?? "Company", lore.founded && `founded ${formatDate(lore.founded)}`, lore.hq].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>
      {lore.summary && <p className="mt-5 max-w-3xl text-lg leading-8 text-[var(--g-on-surface-variant)]">{lore.summary}</p>}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {lore.website && (
          <a
            href={lore.website}
            target="_blank"
            rel="noreferrer"
            className="g-state inline-flex h-10 items-center gap-2 rounded-full bg-[var(--g-primary)] px-6 text-sm font-medium text-[var(--g-on-primary)]"
          >
            Visit website
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </a>
        )}
        <Link
          href={`/${lore.slug}`}
          className="g-state inline-flex h-10 items-center rounded-full bg-[var(--g-secondary-container)] px-6 text-sm font-medium text-[var(--g-on-secondary-container)]"
        >
          Current design
        </Link>
        <span className="mx-1 hidden h-6 w-px bg-[var(--g-outline-variant)] sm:block" />
        <Chip>{lore.status}</Chip>
        {lore.categories.slice(0, 3).map((c) => (
          <Chip key={c}>{c}</Chip>
        ))}
      </div>
    </header>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-8 items-center rounded-lg border border-[var(--g-outline-variant)] px-3 text-sm font-medium text-[var(--g-on-surface-variant)]">
      {children}
    </span>
  );
}

function Mark({ src, name, size }: { src?: string; name: string; size: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={`${size} shrink-0 rounded-2xl bg-white object-contain p-2 shadow-[var(--g-shadow)]`} />
  ) : (
    <span
      aria-hidden="true"
      className={`${size} flex shrink-0 items-center justify-center rounded-2xl bg-[var(--g-primary-container)] text-xl font-medium text-[var(--g-on-primary-container)]`}
    >
      {name.charAt(0)}
    </span>
  );
}

function Avatar({ src, name, size = "size-14" }: { src?: string; name: string; size?: string }) {
  const initials = name
    .split(/\s+/)
    .map((w) => w.charAt(0))
    .slice(0, 2)
    .join("");
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={`${size} shrink-0 rounded-full object-cover`} />
  ) : (
    <span
      aria-hidden="true"
      className={`${size} flex shrink-0 items-center justify-center rounded-full bg-[var(--g-primary-container)] text-sm font-medium text-[var(--g-on-primary-container)]`}
    >
      {initials}
    </span>
  );
}

function Card({ id, title, aside, children }: { id: string; title: string; aside?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`${CARD} scroll-mt-36 p-5 sm:p-6`}>
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 id={`${id}-title`} className="text-[22px] leading-7 font-normal">
          {title}
        </h2>
        {aside && <span className="text-sm text-[var(--g-on-surface-variant)]">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

function KnowledgePanel({ lore }: { lore: LabLore }) {
  const rows: [string, ReactNode][] = [
    lore.founded ? ["Founded", formatDate(lore.founded)] : null,
    lore.founders.length
      ? [
          lore.founders.length > 1 ? "Founders" : "Founder",
          lore.founders.map((f, i) => (
            <span key={f.name}>
              {i > 0 && ", "}
              {f.slug ? (
                <Link href={`/people/${f.slug}`} className={LINK}>
                  {f.name}
                </Link>
              ) : (
                f.name
              )}
            </span>
          )),
        ]
      : null,
    lore.hq ? ["Headquarters", lore.hq] : null,
    lore.formerNames.length ? ["Formerly", lore.formerNames.join(", ")] : null,
    lore.employees ? ["Employees", lore.employees.toLocaleString("en")] : null,
    lore.raisedUsd ? ["Total raised", `${formatUsd(lore.raisedUsd)} over ${lore.funding.length} rounds`] : null,
    lore.valuation ? ["Valuation", `${formatUsd(lore.valuation.usd)} (${lore.valuation.round}, ${formatDate(lore.valuation.date)})`] : null,
    lore.investors ? ["Investors", String(lore.investors)] : null,
  ].filter(Boolean) as [string, ReactNode][];
  return (
    <div className={`${CARD} overflow-hidden`}>
      <div className="flex items-center gap-4 bg-[var(--g-surface-low)] p-5">
        <Mark src={lore.icon} name={lore.name} size="size-12" />
        <div className="min-w-0">
          <p className="truncate text-xl">{lore.name}</p>
          <p className="text-sm text-[var(--g-on-surface-variant)]">{lore.status}</p>
        </div>
      </div>
      <div className="space-y-3 p-5 text-sm leading-5">
        {lore.tagline && <p className="text-[var(--g-on-surface-variant)]">“{lore.tagline}”</p>}
        {lore.website && (
          <a href={lore.website} target="_blank" rel="noreferrer" className={`${LINK} inline-flex items-center gap-1`}>
            {lore.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </a>
        )}
        <dl className="space-y-2.5">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt className="inline font-medium">{label}: </dt>
              <dd className="inline text-[var(--g-on-surface-variant)]">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="border-t border-[var(--g-outline-variant)] pt-3 text-xs text-[var(--g-on-surface-variant)]">
          {lore.events.length} events · {lore.sources} sources · every fact cited
        </p>
      </div>
    </div>
  );
}

function Funding({ lore }: { lore: LabLore }) {
  return (
    <Card id="funding" title="Funding" aside={`${lore.funding.length} rounds`}>
      {lore.raisedUsd > 0 && (
        <p className="mb-4">
          <span className="text-[45px] leading-[52px] font-normal tabular-nums">{formatUsd(lore.raisedUsd)}</span>
          <span className="ml-2 text-sm text-[var(--g-on-surface-variant)]">raised in total</span>
        </p>
      )}
      <div className="-mx-5 overflow-x-auto sm:-mx-6">
        <table className="w-full min-w-[34rem] text-left text-sm">
          <thead>
            <tr className="text-xs text-[var(--g-on-surface-variant)]">
              <th className="py-2 pr-3 pl-5 font-medium sm:pl-6">Date</th>
              <th className="px-3 py-2 font-medium">Round</th>
              <th className="px-3 py-2 text-right font-medium">Amount</th>
              <th className="px-3 py-2 text-right font-medium">Valuation</th>
              <th className="py-2 pr-5 pl-3 font-medium sm:pr-6">Led by</th>
            </tr>
          </thead>
          <tbody>
            {[...lore.funding].reverse().map((r) => (
              <tr key={`${r.date}${r.round}`} className="border-t border-[var(--g-outline-variant)]">
                <td className="g-mono py-3 pr-3 pl-5 whitespace-nowrap text-[var(--g-on-surface-variant)] sm:pl-6">{formatDate(r.date)}</td>
                <td className="px-3 py-3">
                  <span className="inline-flex h-7 items-center rounded-lg bg-[var(--g-tertiary-container)] px-2.5 text-xs font-medium whitespace-nowrap text-[var(--g-on-tertiary-container)]">
                    {r.round}
                  </span>
                </td>
                <td className="px-3 py-3 text-right font-medium tabular-nums">{r.amountUsd ? formatUsd(r.amountUsd) : "—"}</td>
                <td className="px-3 py-3 text-right tabular-nums text-[var(--g-on-surface-variant)]">{r.valuationUsd ? formatUsd(r.valuationUsd) : "—"}</td>
                <td className="py-3 pr-5 pl-3 sm:pr-6">
                  {r.leads.join(", ") || "—"}
                  {r.source && (
                    <a href={r.source} target="_blank" rel="noreferrer" aria-label="Source" className={`${LINK} ml-1.5 inline-flex align-middle`}>
                      <ArrowUpRight aria-hidden="true" className="size-3.5" />
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function People({ lore }: { lore: LabLore }) {
  return (
    <Card id="people" title="People" aside="Founders, executives and key hires">
      <ul className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4">
        {lore.people.map((p) => (
          <li key={p.slug ?? p.name} className="flex flex-col items-center text-center">
            <Avatar src={p.photo} name={p.name} size="size-20" />
            <span className="mt-2 text-sm font-medium">
              {p.slug ? (
                <Link href={`/people/${p.slug}`} className="hover:underline">
                  {p.name}
                </Link>
              ) : (
                p.name
              )}
            </span>
            {p.role && <span className="line-clamp-2 text-xs text-[var(--g-on-surface-variant)]">{p.role}</span>}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function EventRow({ e }: { e: LabLore["events"][number] }) {
  return (
    <li id={e.id} className="relative scroll-mt-36 pb-6 pl-8 last:pb-0">
      <span aria-hidden="true" className="absolute top-1.5 left-0 size-3 rounded-full border-2 border-[var(--g-primary)] bg-[var(--g-container)]" />
      <p className="g-mono text-xs text-[var(--g-on-surface-variant)]">{formatDate(e.date)}</p>
      <h3 className="mt-0.5 text-base font-medium">{e.title}</h3>
      {e.summary && <p className="mt-1 text-sm leading-6 text-[var(--g-on-surface-variant)]">{e.summary}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className={`inline-flex h-6 items-center rounded-md px-2 text-xs font-medium capitalize ${KIND_TONE[e.kind] ?? NEUTRAL_TONE}`}>
          {e.kind.replace(/-/g, " ")}
        </span>
        {e.inferred && (
          <span className="inline-flex h-6 items-center rounded-md border border-[var(--g-outline-variant)] px-2 text-xs text-[var(--g-on-surface-variant)]">
            Inferred
          </span>
        )}
        {e.sources.map((s, i) => (
          <a
            key={`${i}${s.url}`}
            href={s.url}
            target="_blank"
            rel="noreferrer"
            className="g-state inline-flex h-6 items-center gap-1 rounded-full px-2 text-xs font-medium text-[var(--g-primary)]"
          >
            {SOURCE_LABELS[s.type] ?? s.host}
            <ArrowUpRight aria-hidden="true" className="size-3" />
          </a>
        ))}
      </div>
    </li>
  );
}

function Timeline({ lore }: { lore: LabLore }) {
  const first = lore.events.slice(0, PREVIEW);
  const rest = lore.events.slice(PREVIEW);
  return (
    <Card id="timeline" title="Timeline" aside={`${lore.events.length} sourced events`}>
      <div className="relative">
        <span aria-hidden="true" className="absolute top-2 bottom-2 left-[5px] w-0.5 bg-[var(--g-outline-variant)]" />
        <ol>
          {first.map((e) => (
            <EventRow key={e.id} e={e} />
          ))}
        </ol>
        {rest.length > 0 && (
          <details className="group">
            <summary className="g-state mt-4 inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-[var(--g-outline)] px-6 text-sm font-medium text-[var(--g-primary)] group-open:hidden">
              Show {rest.length} more events
              <ChevronDown aria-hidden="true" className="size-4" />
            </summary>
            <ol className="pt-6">
              {rest.map((e) => (
                <EventRow key={e.id} e={e} />
              ))}
            </ol>
          </details>
        )}
      </div>
    </Card>
  );
}

function Quotes({ lore }: { lore: LabLore }) {
  return (
    <Card id="quotes" title="In their own words">
      <div className="grid gap-3 md:grid-cols-2">
        {lore.quotes.map((q) => (
          <figure key={q.id} className="flex flex-col rounded-2xl bg-[var(--g-secondary-container)] p-5 text-[var(--g-on-secondary-container)]">
            <Quote aria-hidden="true" className="mb-2 size-6 opacity-60" />
            <blockquote className="flex-1 text-base leading-7">{q.text}</blockquote>
            <figcaption className="mt-3 text-sm">
              <span className="font-medium">{q.person}</span>
              {" · "}
              <a href={q.link} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                {q.date ? formatDate(q.date) : "source"}
              </a>
            </figcaption>
          </figure>
        ))}
      </div>
    </Card>
  );
}

function Similar({ lore }: { lore: LabLore }) {
  return (
    <Card id="similar" title="People also search for">
      <ul className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:thin] sm:-mx-6 sm:px-6">
        {lore.similar.map((c) => (
          <li key={c.slug} className="w-32 shrink-0">
            <Link href={`/lab/google/${c.slug}`} className="g-state flex flex-col items-center gap-2 rounded-2xl p-3 text-center">
              <Mark src={c.icon} name={c.name} size="size-16" />
              <span className="text-sm font-medium">{c.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
