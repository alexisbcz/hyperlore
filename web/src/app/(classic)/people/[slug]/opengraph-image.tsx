import { cacheLife } from "next/cache";
import { connection } from "next/server";
import { listPeople } from "@/lib/lore";
import { OG_SIZE, ogCard } from "@/lib/og";
import { isLive } from "@/lib/store";

export const alt = "A founder or builder in the Hyperlore archive";
export const size = OG_SIZE;
export const contentType = "image/png";

async function card(slug: string) {
  const person = (await listPeople()).find((p) => p.slug === slug);
  return {
    eyebrow: "In the record",
    title: person?.name ?? "Person",
    subtitle: person?.summary,
    image: person?.photo?.src,
    imageShape: "circle" as const,
  };
}

/** From the snapshot, the card's data is looked up once per deployment. */
async function cachedCard(slug: string) {
  "use cache";
  cacheLife("max");
  return card(slug);
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  // The photo is fetched from the site itself, so the card renders at request time (then the CDN keeps it).
  await connection();
  const { slug } = await params;
  return ogCard(await (isLive() ? card(slug) : cachedCard(slug)));
}
