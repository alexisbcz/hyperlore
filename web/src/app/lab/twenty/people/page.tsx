import type { Metadata } from "next";
import { indexMetadata } from "../og/meta";
import { Suspense } from "react";
import { IconUser } from "../icons";
import { companyLookup, personTableRows } from "../data";
import { PageHead, Panel } from "../ui";
import { PeopleView } from "./view";

export const metadata: Metadata = indexMetadata({ title: "People", description: "Founders, investors and employees in the archive, with the companies each one is linked to.", path: "/people" });

export default function PeoplePage() {
  return (
    <>
      <PageHead section="people" icon={IconUser} title="People" />
      <Panel>
        <Suspense>
          <Rows />
        </Suspense>
      </Panel>
    </>
  );
}

async function Rows() {
  const [rows, lookup] = await Promise.all([personTableRows(), companyLookup()]);
  return <PeopleView rows={rows} lookup={lookup} />;
}
