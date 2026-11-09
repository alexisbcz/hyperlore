import type { Metadata } from "next";
import { indexMetadata } from "../og/meta";
import { Suspense } from "react";
import { IconMoneybag } from "../icons";
import { companyLookup, investorTableRows } from "../data";
import { PageHead, Panel } from "../ui";
import { InvestorsView } from "./view";

export const metadata: Metadata = indexMetadata({ title: "Investors", description: "The investors behind the archive’s startups: portfolios, rounds led and the stages they back.", path: "/investors" });

export default function InvestorsPage() {
  return (
    <>
      <PageHead section="investors" icon={IconMoneybag} title="Investors" />
      <Panel>
        <Suspense>
          <Rows />
        </Suspense>
      </Panel>
    </>
  );
}

async function Rows() {
  const [rows, lookup] = await Promise.all([investorTableRows(), companyLookup()]);
  return <InvestorsView rows={rows} lookup={lookup} />;
}
