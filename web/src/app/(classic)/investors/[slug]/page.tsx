import type { Metadata } from "next";
import { BUILD } from "@/lib/build";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cacheLife } from "next/cache";
import { connection } from "next/server";
import { Suspense } from "react";
import { Page } from "@/components/page";
import { formatDate } from "@/components/lore";
import { COMPANY_NAMES, getInvestor, listInvestors } from "@/lib/lore";
import { isLive } from "@/lib/store";
import { EntitySkeleton } from "@/components/skeletons";

// Every investor is prerendered from the snapshot at build; others (added later) render on first visit.
export async function generateStaticParams() {
  return (await listInvestors()).map((i) => ({ slug: i.slug }));
}

async function cachedInvestor(slug: string, build: string) {
  "use cache";
  void build;
  cacheLife("max");
  return getInvestor(slug);
}

/** Live: per request. Snapshot: once per deployment. */
async function investorFor(slug: string) {
  if (!isLive()) return cachedInvestor(slug, BUILD);
  await connection();
  return getInvestor(slug);
}

export async function generateMetadata({ params }: PageProps<"/investors/[slug]">): Promise<Metadata> {
  const investor = await investorFor((await params).slug);
  if (!investor) return { title: "Investor not found" };
  const names = investor.companies.map((c) => COMPANY_NAMES[c] ?? c).join(", ");
  const description = `${investor.name} in the Hyperlore archive: backed ${names}.`;
  return {
    title: investor.name,
    description,
    alternates: { canonical: `/investors/${investor.slug}` },
    openGraph: { title: investor.name, description, url: `/investors/${investor.slug}`, type: "website" },
    twitter: { card: "summary_large_image", title: investor.name, description },
  };
}

export default function InvestorPage({ params }: PageProps<"/investors/[slug]">) {
  return (
    <Page width="text">
      <Suspense fallback={<EntitySkeleton label="Loading investor" />}>
        <Investor params={params} />
      </Suspense>
    </Page>
  );
}

async function Investor({ params }: { params: PageProps<"/investors/[slug]">["params"] }) {
  const { slug } = await params;
  if (!isLive()) return (await CachedInvestor({ slug, build: BUILD })) ?? notFound();
  await connection();
  return (await InvestorBody({ slug })) ?? notFound();
}

/** The snapshot page, rendered once per deployment. Null for an unknown investor (404 outside the cache). */
async function CachedInvestor({ slug }: { slug: string; build: string }) {
  "use cache";
  cacheLife("max");
  return InvestorBody({ slug });
}

async function InvestorBody({ slug }: { slug: string }) {
  const investor = await getInvestor(slug);
  if (!investor) return null;
  return (
    <>
      <Link href="/investors" className="text-sm text-fg-subtle hover:text-fg">
        ← Investors
      </Link>
      <h1 className="mt-4 text-balance text-3xl font-semibold text-fg">{investor.name}</h1>
      {investor.summary && <p className="mt-2 text-pretty text-fg-muted">{investor.summary}</p>}
      <p className="mt-3 text-sm tabular-nums text-fg-subtle">
        {investor.companies.length} {investor.companies.length > 1 ? "companies" : "company"} · {investor.stakes.length} {investor.stakes.length === 1 ? "round" : "rounds"} ·{" "}
        {investor.leads} led
      </p>
      <ol className="mt-8 divide-y divide-border rounded-lg border border-border">
        {[...investor.stakes]
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((s) => (
            <li
              key={s.company + s.date + s.round}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-3 text-sm sm:grid-cols-[7rem_minmax(0,1fr)_auto]"
            >
              <span className="font-mono text-xs tabular-nums text-fg-subtle">{formatDate(s.date)}</span>
              <span className="col-span-2 sm:col-span-1 sm:col-start-2 sm:row-start-1">
                <Link href={`/${s.company}#funding`} className="font-medium text-fg hover:underline">
                  {COMPANY_NAMES[s.company] ?? s.company}
                </Link>
                <span className="text-fg-muted"> · {s.round}</span>
              </span>
              {s.lead && (
                <span className="col-start-2 row-start-1 rounded-full border border-border px-2 text-xs leading-5 text-fg-muted sm:col-start-3">Lead</span>
              )}
            </li>
          ))}
      </ol>
    </>
  );
}
