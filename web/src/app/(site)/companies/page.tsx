import type { Metadata } from "next";
import { indexMetadata } from "../og/meta";
import { Suspense } from "react";
import { IconBuildingSkyscraper } from "../icons";
import { companyRows } from "../data";
import { PageHead, Panel } from "../ui";
import { CompaniesView } from "./view";

export const metadata: Metadata = indexMetadata({ title: "Companies", description: "Every startup in the archive in one table: status, stage, funding, valuation, founders and investors, with filters, sorting, boards and CSV export.", path: "/companies" });

export default function CompaniesPage() {
  return (
    <>
      <PageHead section="companies" icon={IconBuildingSkyscraper} title="Companies" />
      <Panel>
        <Suspense>
          <Rows />
        </Suspense>
      </Panel>
    </>
  );
}

async function Rows() {
  return <CompaniesView rows={await companyRows()} />;
}
