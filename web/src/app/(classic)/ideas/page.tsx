import type { Metadata } from "next";
import { IdeaSheet, type Idea } from "@/components/idea-sheet";
import data from "./ideas.json";

const ideas = data as Idea[];

const DESCRIPTION = "A working spreadsheet of startup ideas you could build today on existing AI models and SaaS products, with stack, wedge, competitors and risks.";

export const metadata: Metadata = {
  title: "Startup ideas",
  description: DESCRIPTION,
  alternates: { canonical: "/ideas" },
  openGraph: { title: "Startup ideas", description: DESCRIPTION, url: "/ideas" },
};

export default function IdeasPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl text-fg">Startup ideas</h1>
      <p className="mb-5 mt-2 max-w-3xl text-pretty text-sm leading-relaxed text-fg-muted">
        {ideas.length} ideas built from existing AI models and SaaS products. These are opinions, not archive records: the scores are editorial judgement out of 5, and only the sources listed in the last column are facts.
      </p>
      <IdeaSheet ideas={ideas} />
    </div>
  );
}
