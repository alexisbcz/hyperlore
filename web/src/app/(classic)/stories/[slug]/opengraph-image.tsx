import { cacheLife } from "next/cache";
import { connection } from "next/server";
import { companyName, listStories } from "@/lib/lore";
import { OG_SIZE, ogCard } from "@/lib/og";
import { isLive } from "@/lib/store";

export const alt = "A cross-company story on Hyperlore";
export const size = OG_SIZE;
export const contentType = "image/png";

async function card(slug: string) {
  const story = (await listStories()).find((s) => s.slug === slug);
  return {
    eyebrow: "A Hyperlore story",
    title: story?.title ?? "Story",
    subtitle: story?.summary,
    stats: [story && story.companies.slice(0, 4).map(companyName).join(" · ")],
  };
}

/** From the snapshot, the card's data is looked up once per deployment. */
async function cachedCard(slug: string) {
  "use cache";
  cacheLife("max");
  return card(slug);
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const { slug } = await params;
  return ogCard(await (isLive() ? card(slug) : cachedCard(slug)));
}
