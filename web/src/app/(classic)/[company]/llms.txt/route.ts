import { getCompany } from "@/lib/lore";

// Plain-text lore for agents: the overview with resolved citations, then the full sourced timeline.
export async function GET(_req: Request, { params }: RouteContext<"/[company]/llms.txt">) {
  const lore = await getCompany((await params).company);
  if (!lore) return new Response("Not found", { status: 404 });

  const order: string[] = [];
  const overview = (lore.overview?.markdown ?? "").replace(/\{\{cite:([^}\s]+)\}\}/g, (_, url: string) => {
    if (!order.includes(url)) order.push(url);
    return `[${order.indexOf(url) + 1}]`;
  });

  const lines = [
    `# ${lore.name}`,
    "",
    `> ${lore.summary ?? `The sourced history of ${lore.name}.`}`,
    "",
    `Source: Hyperlore. Every claim below links to the primary source it came from.`,
    "",
    ...(overview ? [overview.trim(), "", "## References", "", ...order.map((u, i) => `[${i + 1}] ${u}`), ""] : []),
    "## Funding",
    "",
    ...lore.funding.map(
      (r) =>
        `- ${r.date} · ${r.round}${r.amountUsd ? ` · $${r.amountUsd.toLocaleString("en")}` : ""}${
          r.leads.length ? ` · led by ${r.leads.join(", ")}` : ""
        } · ${r.sources.map((s) => s.url).join(" ")}`,
    ),
    "",
    "## Timeline",
    "",
    ...lore.events.map(
      (e) =>
        `- ${e.date} [${e.kind}${e.confidence === "inferred" ? ", inferred" : ""}] ${e.title}${e.summary ? ` — ${e.summary}` : ""} (${e.sources
          .map((s) => s.url)
          .join(", ")})`,
    ),
    "",
    "## Quotes",
    "",
    ...lore.quotes.map((q) => `- ${q.person}${q.date ? ` (${q.date})` : ""}: "${q.text}" ${q.link}`),
  ];

  return new Response(lines.join("\n"), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
