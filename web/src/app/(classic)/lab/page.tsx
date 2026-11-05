import type { Metadata } from "next";
import { labCompanies } from "./data";
import { LabIndex } from "./lab-index";

export const metadata: Metadata = {
  title: "Style lab",
  description: "Design experiments for Hyperlore's company pages, side by side on the same data.",
  robots: { index: false },
};

export default async function LabPage() {
  const companies = await labCompanies();
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold text-fg">Style lab</h1>
      <p className="mt-2 max-w-2xl text-fg-muted">
        The company page redrawn in different design directions, on the same data. Pick a company, open a style, then use the bar at the
        bottom of any experiment to switch style or company without losing your place.
      </p>
      <LabIndex companies={companies} />
    </div>
  );
}
