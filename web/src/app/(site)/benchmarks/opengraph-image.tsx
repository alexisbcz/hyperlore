import { SIZE, twentyCard } from "../og/card";
import { homeSpec } from "../og/specs";

export const alt = "Hyperlore: the sourced history of startups";
export const size = SIZE;
export const contentType = "image/png";

export default async function Image() {
  return twentyCard(await homeSpec("benchmarks"));
}

// No params: lets static export (output: "export") prerender this image.
export const generateStaticParams = () => [{}];
