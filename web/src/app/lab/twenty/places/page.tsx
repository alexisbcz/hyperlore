import type { Metadata } from "next";
import { indexMetadata } from "../og/meta";
import { Suspense } from "react";
import { IconMap } from "../icons";
import { companyLookup, placeRows } from "../data";
import { PageHead, Panel } from "../ui";
import { PlacesView } from "./view";

export const metadata: Metadata = indexMetadata({ title: "Places", description: "Garages, offices and cities where startups were founded and grew.", path: "/places" });

export default function PlacesPage() {
  return (
    <>
      <PageHead section="places" icon={IconMap} title="Places" />
      <Panel>
        <Suspense>
          <Rows />
        </Suspense>
      </Panel>
    </>
  );
}

async function Rows() {
  const [rows, lookup] = await Promise.all([placeRows(), companyLookup()]);
  return <PlacesView rows={rows} lookup={lookup} />;
}
