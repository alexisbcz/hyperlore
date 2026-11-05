import { buildExport, exportFilename, toMarkdown } from "@/lib/export";

// The Markdown edition: front matter with the archive version, then facts, overview, funding, timeline,
// quotes and numbered sources.
export async function GET(_req: Request, { params }: RouteContext<"/[company]/lore.md">) {
  const d = await buildExport((await params).company);
  if (!d) return new Response("Not found", { status: 404 });
  return new Response(toMarkdown(d), {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `inline; filename="${exportFilename(d, "md")}"`,
      "x-hyperlore-version": d.version,
      // The HTML page is the canonical edition; this download shouldn't compete with it in search.
      link: `<${d.url}>; rel="canonical"`,
      "x-robots-tag": "noindex",
      "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
