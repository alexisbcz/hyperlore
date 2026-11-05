import type { Metadata } from "next";
import { IconSparkles } from "../icons";
import { indexMetadata } from "../og/meta";
import { PageHead, Panel } from "../ui";
import type { Idea } from "@/components/idea-sheet";
import data from "@/app/(classic)/ideas/ideas.json";
import { IdeasView } from "./view";
import "./ideas.css";

const ideas = data as Idea[];

export const metadata: Metadata = indexMetadata({
  title: "Startup ideas",
  description: "A working spreadsheet of startup ideas you could build today on existing AI models and SaaS products, with stack, wedge, competitors and risks.",
  path: "/ideas",
});

export default function IdeasPage() {
  return (
    <>
      <PageHead section="ideas" icon={IconSparkles} title="Startup ideas" />
      <Panel>
        <div className="tw-idea-note">
          {ideas.length} ideas built from existing AI models and SaaS products. These are opinions, not archive records: the scores are editorial judgement out of 5, and only the sources in the last column are facts.
        </div>
        <IdeasView ideas={ideas} />
      </Panel>
    </>
  );
}
