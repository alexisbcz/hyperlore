import { connection } from "next/server";
import { notFound } from "next/navigation";
import { SIZE, twentyCard } from "../../og/card";
import { investorSpec } from "../../og/specs";

export const alt = "An investor and its rounds on Hyperlore";
export const size = SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const spec = await investorSpec((await params).slug);
  if (!spec) notFound();
  return twentyCard(spec);
}
