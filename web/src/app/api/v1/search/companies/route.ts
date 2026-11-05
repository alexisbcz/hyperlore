import { companyIndex } from "@/lib/lore";

// Every company, compact (~150 bytes each): the ⌘K menu downloads it once and matches names in the
// browser, so company results appear on the first keystroke without a round trip.
export async function GET() {
  return Response.json(
    { companies: await companyIndex() },
    { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=86400" } },
  );
}
