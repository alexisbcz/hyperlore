import type { Metadata } from "next";
import Link from "next/link";
import { cacheLife } from "next/cache";
import { connection } from "next/server";
import { Suspense } from "react";
import { Page } from "@/components/page";
import { COMPANY_NAMES, listStories } from "@/lib/lore";
import { isLive } from "@/lib/store";
import { ListSkeleton } from "@/components/skeletons";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Stories",
  description:
    "Sagas that span several companies: rivalries, market wars, movements. Every claim sourced.",
  path: "/stories",
});

export default function StoriesPage() {
  return (
    <Page width="text">
      <h1 className="text-balance text-3xl font-semibold text-fg">Stories</h1>
      <p className="mt-2 text-pretty text-fg-muted">Sagas that span several companies, written from the same sourced archive.</p>
      <Suspense fallback={<ListSkeleton label="Loading stories" />}>
        <List />
      </Suspense>
    </Page>
  );
}

// Live data renders per request; the snapshot once per deployment (prerendered at build).
async function List() {
  if (!isLive()) return CachedList();
  await connection();
  return ListBody();
}

async function CachedList() {
  "use cache";
  cacheLife("max");
  return ListBody();
}

async function ListBody() {
  const stories = await listStories();
  if (!stories.length) return <p className="mt-8 text-sm text-fg-subtle">The first story is being written.</p>;
  return (
    <ul className="mt-8 divide-y divide-border rounded-xl border border-border">
      {stories.map((s) => (
        <li key={s.slug}>
          <Link href={`/stories/${s.slug}`} className="block p-5 transition-colors hover:bg-bg-subtle">
            <span className="block text-lg font-semibold text-fg">{s.title}</span>
            {s.summary && <span className="mt-1 block text-pretty text-sm text-fg-muted">{s.summary}</span>}
            {s.companies.length > 0 && (
              <span className="mt-3 block text-xs text-fg-subtle">{s.companies.map((c) => COMPANY_NAMES[c] ?? c).join(" · ")}</span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
