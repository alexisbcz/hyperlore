import type { Metadata } from "next";
import { Suspense } from "react";
import { listCompanies } from "@/lib/lore";
import type { Mark } from "@/lib/types";
import { IconSwitchHorizontal } from "../icons";
import { indexMetadata } from "../og/meta";
import { PageHead } from "../ui";
import type { Logo } from "../data";
import { Comparison } from "./view";
import "./compare.css";

export const metadata: Metadata = indexMetadata({
  title: "Compare companies",
  description:
    "Two to four companies side by side: profile, funding rounds on a shared timeline, valuations, key events by year and founders, every figure sourced.",
  path: "/compare",
});

// Comparisons people reach for, offered when fewer than two companies are picked (only those in the archive).
const SUGGESTED = [
  ["vercel", "netlify", "render"],
  ["revolut", "monzo", "n26"],
  ["brex", "ramp", "mercury"],
  ["anthropic", "openai", "mistral"],
  ["stripe", "plaid", "wise"],
  ["coursera", "udemy", "udacity"],
  ["supabase", "railway", "flyio"],
];

const logo = (m?: Mark): Logo | undefined => (m ? { src: m.src, ...(m.variant === "dark" && { dark: true }) } : undefined);

// Static: the page ships the company list; the browser reads ?c= and fetches /compare/data/<slug>.json.
export default async function ComparePage() {
  const options = (await listCompanies())
    .map((c) => ({ slug: c.slug, name: c.name, logo: logo(c.icon ?? c.logo) }))
    .toSorted((a, b) => a.name.localeCompare(b.name));
  return (
    <>
      <PageHead section="compare" icon={IconSwitchHorizontal} title="Compare companies" />
      <section className="tw-panel">
        <Suspense>
          <Comparison options={options} suggested={SUGGESTED} />
        </Suspense>
      </section>
    </>
  );
}
