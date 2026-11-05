import { cacheLife } from "next/cache";
import { connection } from "next/server";
import { companyName, getInvestor } from "@/lib/lore";
import { OG_SIZE, ogCard } from "@/lib/og";
import { isLive } from "@/lib/store";

export const alt = "An investor in the Hyperlore archive";
export const size = OG_SIZE;
export const contentType = "image/png";

async function card(slug: string) {
  const investor = await getInvestor(slug);
  return {
    eyebrow: "Investor",
    title: investor?.name ?? "Investor",
    subtitle: investor ? `Backed ${investor.companies.map(companyName).join(", ")}.` : undefined,
    stats: investor ? [`${investor.stakes.length} rounds`, `${investor.leads} led`] : [],
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
