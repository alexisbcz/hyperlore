import type { Metadata } from "next";
import Link from "next/link";
import { cacheLife } from "next/cache";
import { connection } from "next/server";
import { preload } from "react-dom";
import { Suspense } from "react";
import { Page } from "@/components/page";
import { isLive } from "@/lib/store";
import { RoundsFeed } from "@/components/rounds-feed";
import { listRounds } from "@/lib/lore";
import { ROUNDS_PAGE, feedRows, roundTotals, sortRounds } from "@/lib/rounds";
import { DirectorySkeleton } from "@/components/skeletons";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Funding rounds",
  description:
    "Every funding round in the archive, newest first: stage, amount, valuation, lead and other investors, each with its sources. Filter by stage, year, amount, category, country and investor, and export the view as CSV.",
  path: "/rounds",
});

export default function RoundsPage() {
  return (
    <Page>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          <h1 className="text-balance text-3xl font-semibold text-fg">Funding rounds</h1>
          <p className="mt-2 text-pretty text-fg-muted">
            Every round across the archive, newest first, with the sources that report it. Amounts are shown as the sources state them:
            nothing is converted between currencies.
          </p>
        </div>
        <div className="flex gap-4 text-sm">
          <Link href="/investors" className="text-fg-muted hover:text-fg">
            Investors →
          </Link>
          <Link href="/developers" className="text-fg-muted hover:text-fg">
            As an API →
          </Link>
        </div>
      </div>
      <Suspense fallback={<DirectorySkeleton label="Loading rounds" />}>
        <Feed />
      </Suspense>
    </Page>
  );
}


const FEED_URL = "/rounds/feed.json";

async function feed() {
  const rows = feedRows(await listRounds());
  return { initial: sortRounds(rows, "date", "desc").slice(0, ROUNDS_PAGE), total: rows.length, totals: roundTotals(rows) };
}

async function Feed() {
  // Starts downloading every round (for the filters) alongside the page's scripts.
  preload(FEED_URL, { as: "fetch", crossOrigin: "anonymous" });
  if (!isLive()) return <CachedFeed />;
  await connection();
  return <RoundsFeed {...await feed()} src={FEED_URL} />;
}

/** From the snapshot: rendered once per deployment (prerendered at build). */
async function CachedFeed() {
  "use cache";
  cacheLife("max");
  return <RoundsFeed {...await feed()} src={FEED_URL} />;
}
