import { Flag } from "@/components/flag";
import { countryCode } from "@/lib/directory";
import type { Metadata } from "next";
import Link from "next/link";
import { cacheLife } from "next/cache";
import { connection } from "next/server";
import { Suspense } from "react";
import { MapPin } from "lucide-react";
import { Page } from "@/components/page";
import { COMPANY_NAMES, listPlaces } from "@/lib/lore";
import { isLive } from "@/lib/store";
import { CardGridSkeleton } from "@/components/skeletons";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Places",
  description:
    "Where startup lore happened: campuses, offices, accelerators, neighbourhoods and venues.",
  path: "/places",
});

export default function PlacesPage() {
  return (
    <Page width="wide">
      <h1 className="text-balance text-3xl font-semibold text-fg">Places</h1>
      <p className="mt-2 max-w-2xl text-pretty text-fg-muted">
        Campuses, offices, accelerators and venues where the companies in the archive were started, built or launched.
      </p>
      <Suspense fallback={<CardGridSkeleton label="Loading places" cards={9} media />}>
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
  const places = await listPlaces();
  if (!places.length) return <p className="mt-8 text-sm text-fg-subtle">No places mapped yet.</p>;
  return (
    <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {places.map((p) => (
        <li key={p.slug}>
          <Link href={`/places/${p.slug}`} className="flex h-full flex-col overflow-hidden rounded-xl border border-border transition-colors hover:border-border-strong">
            {p.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.photo.src} alt="" className="aspect-[16/9] w-full border-b border-border object-cover" />
            ) : (
              <span aria-hidden="true" className="flex aspect-[16/9] items-center justify-center border-b border-border bg-bg-subtle text-border-strong">
                <MapPin className="size-6" strokeWidth={1.5} />
              </span>
            )}
            <span className="flex flex-1 flex-col p-4">
              <span className="text-sm font-semibold text-fg">{p.name}</span>
              <span className="text-xs text-fg-subtle">
                <Flag code={countryCode(p.country)} className="mr-1.5" />
                {[p.city, p.country].filter(Boolean).join(", ")}
              </span>
              {p.summary && <span className="mt-2 line-clamp-3 text-pretty text-sm text-fg-muted">{p.summary}</span>}
              {p.companies.length > 0 && (
                <span className="mt-auto truncate pt-3 text-xs text-fg-subtle">{p.companies.map((c) => COMPANY_NAMES[c] ?? c).join(", ")}</span>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
