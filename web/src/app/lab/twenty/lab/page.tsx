import type { Metadata } from "next";
import { Suspense } from "react";
import { IconFlask } from "../icons";
import { labCompanies } from "../../../(classic)/lab/data";
import { PageHead, Panel } from "../ui";
import { LabView } from "./view";

export const metadata: Metadata = {
  title: "Style lab",
  description: "Design experiments for Hyperlore's company pages, side by side on the same data.",
  robots: { index: false },
};

export default function LabPage() {
  return (
    <>
      <PageHead section="compare" icon={IconFlask} title="Style lab" />
      <Panel>
        <Suspense>
          <Companies />
        </Suspense>
      </Panel>
    </>
  );
}

async function Companies() {
  return <LabView companies={await labCompanies()} />;
}
