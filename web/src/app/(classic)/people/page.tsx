import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import { connection } from "next/server";
import { preload } from "react-dom";
import { Suspense } from "react";
import { Page } from "@/components/page";
import { PeopleDirectory } from "@/components/people-directory";
import { companyName, listCompanies, peopleRows } from "@/lib/lore";
import { isLive } from "@/lib/store";
import { PEOPLE_PAGE } from "@/lib/directory";
import { DirectorySkeleton } from "@/components/skeletons";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "People",
  description:
    "Founders, early employees and investors in the archive, with everything they did and said.",
  path: "/people",
});

export default function PeoplePage() {
  return (
    <Page>
      <h1 className="text-balance text-3xl font-semibold text-fg">People</h1>
      <p className="mt-2 max-w-3xl text-pretty text-fg-muted">
        Founders, early employees and angels, linked to the events and quotes they appear in.
      </p>
      <Suspense fallback={<DirectorySkeleton label="Loading people" />}>
        <List />
      </Suspense>
    </Page>
  );
}


const DIRECTORY_URL = "/people/directory.json";

async function directory() {
  const [people, companies] = await Promise.all([peopleRows(), listCompanies()]);
  const companyNames = Object.fromEntries(people.flatMap((p) => p.companies ?? []).map((slug) => [slug, companyName(slug)]));
  for (const c of companies) companyNames[c.slug] = c.name;
  // People come sorted by name, so the first ones are the unfiltered view.
  return { initial: people.slice(0, PEOPLE_PAGE), total: people.length, companyNames };
}

async function List() {
  // Starts downloading everyone (for the filters) alongside the page's scripts.
  preload(DIRECTORY_URL, { as: "fetch", crossOrigin: "anonymous" });
  if (!isLive()) return <CachedList />;
  await connection();
  return <PeopleDirectory {...await directory()} src={DIRECTORY_URL} />;
}

/** From the snapshot: rendered once per deployment (prerendered at build). */
async function CachedList() {
  "use cache";
  cacheLife("max");
  return <PeopleDirectory {...await directory()} src={DIRECTORY_URL} />;
}
