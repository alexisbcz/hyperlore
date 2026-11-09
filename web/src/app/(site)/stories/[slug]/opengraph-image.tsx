import { notFound } from "next/navigation";
import { SIZE, twentyCard } from "../../og/card";
import { storySpec } from "../../og/specs";
export { storyParams as generateStaticParams } from "../../params";

export const alt = "A sourced story on Hyperlore";
export const size = SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const spec = await storySpec((await params).slug);
  if (!spec) notFound();
  return twentyCard(spec);
}
