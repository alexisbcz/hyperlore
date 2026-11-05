import { connection } from "next/server";
import { twentyCard } from "../../og/card";
import { companySpec } from "../../og/specs";

// One frame of a company's share video: the share card at time t (0 to 1) of its entrance.
// scripts/og-videos.mjs pulls the frames and encodes them. Off in production unless OG_FRAMES=1.

export async function GET(request: Request, { params }: { params: Promise<{ company: string }> }) {
  await connection();
  if (process.env.NODE_ENV === "production" && process.env.OG_FRAMES !== "1") return new Response("Not found", { status: 404 });
  const t = Math.min(1, Math.max(0, Number(new URL(request.url).searchParams.get("t") ?? 1) || 0));
  const spec = await companySpec((await params).company);
  if (!spec) return new Response("Not found", { status: 404 });
  return twentyCard(spec, t);
}
