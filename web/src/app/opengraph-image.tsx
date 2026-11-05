import { cacheLife } from "next/cache";
import { connection } from "next/server";
import { stats } from "@/lib/lore";
import { OG_SIZE, ogCard } from "@/lib/og";
import { isLive } from "@/lib/store";

export const alt = "Hyperlore: the sourced history of startups";
export const size = OG_SIZE;
export const contentType = "image/png";

/** From the snapshot, counted once per deployment, so the card is prerendered at build. */
async function cachedStats() {
  "use cache";
  cacheLife("max");
  return stats();
}

export default async function Image() {
  if (isLive()) await connection();
  const s = await (isLive() ? stats() : cachedStats());
  return ogCard({
    eyebrow: "DeepWiki for startups",
    title: "The sourced history of startups",
    subtitle: "Renames, logos, funding rounds, launches and quotes, rebuilt by agents from primary sources.",
    stats: [`${s.companies} companies`, `${s.events.toLocaleString("en")} events`, `${s.sources.toLocaleString("en")} sources`],
  });
}
