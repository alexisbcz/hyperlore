import type { Metadata } from "next";
import { BUILD } from "@/lib/build";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cacheLife } from "next/cache";
import { connection } from "next/server";
import { Suspense } from "react";
import { Page } from "@/components/page";
import { CompanyMark, formatDate } from "@/components/lore";
import { Prose, References, citationOrder } from "@/components/prose";
import { JsonLd } from "@/components/json-ld";
import { COMPANY_NAMES, getStory, listCompanies, listStories } from "@/lib/lore";
import { SITE_URL } from "@/lib/og";
import { isLive } from "@/lib/store";
import { EntitySkeleton } from "@/components/skeletons";

// Every story is prerendered from the snapshot at build; stories written later render on first visit.
export async function generateStaticParams() {
  return (await listStories()).map((s) => ({ slug: s.slug }));
}

async function metaData(slug: string) {
  const story = (await listStories()).find((s) => s.slug === slug);
  return story ? { title: story.title, summary: story.summary, updatedAt: story.updatedAt } : null;
}

async function cachedMetaData(slug: string, build: string) {
  "use cache";
  void build;
  cacheLife("max");
  return metaData(slug);
}

export async function generateMetadata({ params }: PageProps<"/stories/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  if (isLive()) await connection();
  const story = await (isLive() ? metaData(slug) : cachedMetaData(slug, BUILD));
  if (!story) return { title: "Story not found" };
  return {
    title: story.title,
    description: story.summary,
    alternates: { canonical: `/stories/${slug}` },
    openGraph: { title: story.title, description: story.summary, url: `/stories/${slug}`, type: "article", modifiedTime: story.updatedAt },
    twitter: { card: "summary_large_image", title: story.title, description: story.summary },
  };
}

export default function StoryPage({ params }: PageProps<"/stories/[slug]">) {
  return (
    <Page width="text">
      <Suspense fallback={<EntitySkeleton label="Loading story" title="h-10 w-3/4" />}>
        <Story params={params} />
      </Suspense>
    </Page>
  );
}

async function Story({ params }: { params: PageProps<"/stories/[slug]">["params"] }) {
  const { slug } = await params;
  if (!isLive()) return (await CachedStory({ slug, build: BUILD })) ?? notFound();
  await connection();
  return (await StoryBody({ slug })) ?? notFound();
}

/** The snapshot page, rendered once per deployment. Null for an unknown story (404 outside the cache). */
async function CachedStory({ slug }: { slug: string; build: string }) {
  "use cache";
  cacheLife("max");
  return StoryBody({ slug });
}

async function StoryBody({ slug }: { slug: string }) {
  const [story, companies] = await Promise.all([getStory(slug), listCompanies()]);
  if (!story) return null;
  const marks = new Map(companies.map((c) => [c.slug, c]));
  const refs = citationOrder(story.markdown);
  return (
    <article className="space-y-10">
      <JsonLd
        data={{
          "@type": "Article",
          headline: story.title,
          url: `${SITE_URL}/stories/${story.slug}`,
          ...(story.summary && { description: story.summary }),
          dateModified: story.updatedAt,
          publisher: { "@type": "Organization", name: "Hyperlore" },
          about: story.companies.map((c) => ({ "@type": "Organization", name: COMPANY_NAMES[c] ?? c })),
        }}
      />
      <header>
        <Link href="/stories" className="text-sm text-fg-subtle hover:text-fg">
          ← Stories
        </Link>
        <h1 className="mt-4 text-balance text-4xl font-semibold text-fg">{story.title}</h1>
        {story.summary && <p className="mt-3 text-pretty text-lg leading-relaxed text-fg-muted">{story.summary}</p>}
        <p className="mt-4 text-xs tabular-nums text-fg-subtle">
          Updated {formatDate(story.updatedAt.slice(0, 10))} · {refs.length} sources
        </p>
        {story.companies.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {story.companies.map((c) => (
              <li key={c}>
                <Link
                  href={`/${c}`}
                  className="inline-flex h-8 items-center gap-2 rounded-md border border-border pl-1 pr-2.5 text-xs text-fg transition-colors hover:border-border-strong"
                >
                  <CompanyMark logo={marks.get(c)?.icon} dark={marks.get(c)?.iconDark} name={COMPANY_NAMES[c] ?? c} size="sm" />
                  {COMPANY_NAMES[c] ?? c}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </header>
      <Prose markdown={story.markdown} sources={story.sources} />
      <section aria-labelledby="refs-title" className="border-t border-border pt-8">
        <h2 id="refs-title" className="mb-4 text-lg font-semibold text-fg">
          References
        </h2>
        <References urls={refs} sources={story.sources} />
      </section>
    </article>
  );
}
