import { listRounds } from "@/lib/lore";
import { roundsCsv, sortRounds } from "@/lib/rounds";
import { SITE_URL } from "@/lib/og";

// No params: this tells static export (output: "export") to prerender the handler.
export const generateStaticParams = () => [{}];

export async function GET() {
  return new Response(roundsCsv(sortRounds(await listRounds(), "date", "desc"), SITE_URL), {
    headers: { "Content-Type": "text/csv; charset=utf-8" },
  });
}
