import type { Metadata } from "next";
import { indexMetadata } from "../og/meta";
import { Suspense } from "react";
import { IconLayoutGrid } from "../icons";
import { categoryRows } from "../data";
import { PageHead, Panel } from "../ui";
import { CategoriesView } from "./view";

export const metadata: Metadata = indexMetadata({ title: "Categories", description: "Startups by category, with the most funded companies in each.", path: "/categories" });

export default function CategoriesPage() {
  return (
    <>
      <PageHead section="categories" icon={IconLayoutGrid} title="Categories" />
      <Panel>
        <Suspense>
          <Rows />
        </Suspense>
      </Panel>
    </>
  );
}

async function Rows() {
  return <CategoriesView rows={await categoryRows()} />;
}
