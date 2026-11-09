import type { Metadata } from "next";
import { indexMetadata } from "../og/meta";
import { Suspense } from "react";
import { IconCoins } from "../icons";
import { roundRows } from "../data";
import { PageHead, Panel } from "../ui";
import { RoundsView } from "./view";

export const metadata: Metadata = indexMetadata({ title: "Funding rounds", description: "Every funding round in the archive: amount, valuation, stage and lead investors, each linked to its source.", path: "/rounds" });

export default function RoundsPage() {
  return (
    <>
      <PageHead section="rounds" icon={IconCoins} title="Funding rounds" />
      <Panel>
        <Suspense>
          <Rows />
        </Suspense>
      </Panel>
    </>
  );
}

async function Rows() {
  return <RoundsView rows={await roundRows()} />;
}
