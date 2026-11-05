import { connection } from "next/server";
import { SIZE, twentyCard } from "./og/card";
import { homeSpec } from "./og/specs";

export const alt = "Hyperlore: the sourced history of startups";
export const size = SIZE;
export const contentType = "image/png";

export default async function Image() {
  await connection();
  return twentyCard(await homeSpec("home"));
}
