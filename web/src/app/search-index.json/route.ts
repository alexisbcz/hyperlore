import { searchIndex } from "@/lib/lore";

// The ⌘K menu's index, prebuilt: the browser downloads it once and searches locally.
// No params: this tells static export (output: "export") to prerender the handler.
export const generateStaticParams = () => [{}];

export async function GET() {
  const index = await searchIndex();
  // Matching needs text and names; the date is only used server-side.
  const slim = Object.fromEntries(Object.entries(index).map(([k, v]) => [k, v.map(({ date: _d, ...e }) => e)]));
  return Response.json(slim);
}
