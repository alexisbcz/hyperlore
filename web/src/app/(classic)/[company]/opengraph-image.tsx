import { cacheLife } from "next/cache";
import { connection } from "next/server";
import { formatUsd } from "@/components/lore";
import { companyName, getOverview, listCompanies } from "@/lib/lore";
import { OG_SIZE, ogCard } from "@/lib/og";
import { isLive } from "@/lib/store";

export const alt = "The sourced history of a startup on Hyperlore";
export const size = OG_SIZE;
export const contentType = "image/png";

async function card(company: string) {
  const [overview, companies] = await Promise.all([getOverview(company), listCompanies()]);
  const c = companies.find((x) => x.slug === company);
  return {
    eyebrow: "The lore of",
    title: companyName(company),
    subtitle: overview?.summary,
    stats: [c?.founded && `Founded ${c.founded.slice(0, 4)}`, !!c?.raisedUsd && `${formatUsd(c.raisedUsd)} raised`, c && `${c.events} sourced ${c.events === 1 ? "event" : "events"}`],
    image: c?.icon?.src ?? c?.logo?.src,
  };
}

/** From the snapshot, the card's data is looked up once per deployment. */
async function cachedCard(company: string) {
  "use cache";
  cacheLife("max");
  return card(company);
}

export default async function Image({ params }: { params: Promise<{ company: string }> }) {
  // The image is fetched from the site itself, so the card renders at request time (then the CDN keeps it).
  await connection();
  const { company } = await params;
  return ogCard(await (isLive() ? card(company) : cachedCard(company)));
}
