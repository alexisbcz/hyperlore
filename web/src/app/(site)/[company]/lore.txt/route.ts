import { listCompanies } from "@/lib/lore";
import { buildExport, exportFilename, toText } from "@/lib/export";

// The plain-text edition, wrapped at 80 columns.
export async function generateStaticParams() {
  return (await listCompanies()).map((c) => ({ company: c.slug }));
}

export async function GET(_req: Request, { params }: RouteContext<"/[company]/lore.txt">) {
  const d = await buildExport((await params).company);
  if (!d) return new Response("Not found", { status: 404 });
  return new Response(toText(d), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "content-disposition": `inline; filename="${exportFilename(d, "txt")}"`,
      "x-hyperlore-version": d.version,
      // The HTML page is the canonical edition; this download shouldn't compete with it in search.
      link: `<${d.url}>; rel="canonical"`,
      "x-robots-tag": "noindex",
      "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
