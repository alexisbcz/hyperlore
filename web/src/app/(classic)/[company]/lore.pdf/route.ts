import { buildExport, exportFilename } from "@/lib/export";
import { toPdf } from "@/lib/export-pdf";

// The PDF edition, typeset on request and cached at the edge: the snapshot doesn't change within a deployment.
export async function GET(_req: Request, { params }: RouteContext<"/[company]/lore.pdf">) {
  const d = await buildExport((await params).company);
  if (!d) return new Response("Not found", { status: 404 });
  const pdf = await toPdf(d);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${exportFilename(d, "pdf")}"`,
      "x-hyperlore-version": d.version,
      // The HTML page is the canonical edition; this download shouldn't compete with it in search.
      link: `<${d.url}>; rel="canonical"`,
      "x-robots-tag": "noindex",
      "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
