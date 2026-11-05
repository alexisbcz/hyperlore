import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { IconArrowRight, IconBuildingSkyscraper, IconPencil } from "../icons";
import { Timeline } from "../feed";
import { PageHead } from "../ui";
import { LightButton, Skeleton } from "../tw";
import { companyName, getEvent } from "@/lib/lore";
import { CorrectionForm } from "../request/forms";
import "../request/forms.css";

export const metadata: Metadata = {
  title: "Suggest a correction",
  robots: { index: false },
};

export default function CorrectPage({ searchParams }: PageProps<"/lab/twenty/correct">) {
  return (
    <Suspense fallback={<Loading />}>
      <Correct searchParams={searchParams} />
    </Suspense>
  );
}

function Loading() {
  return (
    <>
      <PageHead section="companies" icon={IconPencil} title="Suggest a correction" />
      <section className="tw-panel" aria-busy="true">
        <div className="twf-main" style={{ display: "grid", gap: 10 }}>
          <Skeleton width={280} height={20} />
          <Skeleton width="60%" height={14} />
          <Skeleton width="50%" height={14} />
        </div>
      </section>
    </>
  );
}

async function Correct({ searchParams }: { searchParams: PageProps<"/lab/twenty/correct">["searchParams"] }) {
  await connection();
  const id = (await searchParams).event;
  const event = typeof id === "string" ? await getEvent(id) : null;
  if (!event) {
    return (
      <>
        <PageHead section="companies" icon={IconPencil} title="Suggest a correction" />
        <section className="tw-panel">
          <div className="twf-main">
            <h2 className="twf-title">Suggest a correction</h2>
            <p className="twf-lede">Open this page from the “Suggest a correction” link next to a fact.</p>
            <LightButton variant="outline" endIcon={<IconArrowRight />} render={<Link href="/companies" />} nativeButton={false}>
              Browse companies
            </LightButton>
          </div>
        </section>
      </>
    );
  }
  const name = companyName(event.company);
  return (
    <>
      <PageHead
        section="companies"
        icon={IconBuildingSkyscraper}
        crumbs={[
          { href: "/companies", label: "Companies" },
          { href: `/${event.company}`, label: name },
        ]}
        title="Suggest a correction"
      />
      <section className="tw-panel">
        <div className="twf-main">
          <h2 className="twf-title">Suggest a correction</h2>
          <p className="twf-lede">
            Founders, employees and investors know things the record doesn&apos;t. Tell us what&apos;s wrong and where the right version is
            written down.
          </p>
          <div className="twf-event">
            <Timeline
              events={[
                {
                  id: event.id,
                  date: event.date,
                  kind: event.kind,
                  title: event.title,
                  summary: event.summary,
                  inferred: event.confidence === "inferred",
                  sources: event.sources.map((s) => ({ url: s.url, host: s.host, type: s.type })),
                  company: event.company,
                  companyName: name,
                },
              ]}
              showCompany
            />
          </div>
          <CorrectionForm eventId={event.id} />
        </div>
      </section>
    </>
  );
}
