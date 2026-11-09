import { notFound } from "next/navigation";
import { SIZE, twentyCard } from "../og/card";
import { companySpec } from "../og/specs";
export { companyParams as generateStaticParams } from "../params";

export const alt = "The sourced history of a startup on Hyperlore";
export const size = SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ company: string }> }) {
  const spec = await companySpec((await params).company);
  if (!spec) notFound();
  return twentyCard(spec);
}
