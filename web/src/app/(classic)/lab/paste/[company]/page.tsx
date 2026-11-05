import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { companyName, labCompanies, labCompany } from "../../data";
import { LabBar } from "../../lab-bar";
import { PastePage } from "./paste-page";

// Design trial: the company page rebuilt with Twilio Paste, to compare against /<company>.

export async function generateMetadata({ params }: PageProps<"/lab/paste/[company]">): Promise<Metadata> {
  const { company } = await params;
  return { title: `${companyName(company)} (Paste trial)`, robots: { index: false } };
}

export default function Page({ params }: PageProps<"/lab/paste/[company]">) {
  return (
    <Suspense>
      <Trial params={params} />
    </Suspense>
  );
}

async function Trial({ params }: { params: PageProps<"/lab/paste/[company]">["params"] }) {
  const { company } = await params;
  const [lore, companies] = await Promise.all([labCompany(company), labCompanies()]);
  if (!lore) notFound();
  return (
    <>
      <PastePage lore={lore} />
      <LabBar style="paste" slug={lore.slug} companies={companies} />
    </>
  );
}
