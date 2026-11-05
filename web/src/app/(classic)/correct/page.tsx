import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Page } from "@/components/page";
import { CorrectionForm } from "@/components/forms";
import { EventItem } from "@/components/lore";
import { companyName, getEvent } from "@/lib/lore";

export const metadata: Metadata = {
  title: "Suggest a correction",
  robots: { index: false },
};

export default function CorrectPage({ searchParams }: PageProps<"/correct">) {
  return (
    <Page width="text">
      <Suspense fallback={<p className="text-sm text-fg-subtle">Loading…</p>}>
        <Correct searchParams={searchParams} />
      </Suspense>
    </Page>
  );
}

async function Correct({ searchParams }: { searchParams: PageProps<"/correct">["searchParams"] }) {
  await connection();
  const id = (await searchParams).event;
  const event = typeof id === "string" ? await getEvent(id) : null;
  if (!event) {
    return (
      <>
        <h1 className="text-balance text-3xl font-semibold text-fg">Suggest a correction</h1>
        <p className="mt-2 text-fg-muted">
          Open this page from the “Suggest a correction” link next to a fact. <Link href="/" className="text-fg underline">Browse companies</Link>
        </p>
      </>
    );
  }
  return (
    <>
      <Link href={`/${event.company}#${event.id}`} className="text-sm text-fg-subtle hover:text-fg">
        ← {companyName(event.company)}
      </Link>
      <h1 className="mt-4 text-balance text-3xl font-semibold text-fg">Suggest a correction</h1>
      <p className="mt-2 text-pretty text-fg-muted">
        Founders, employees and investors know things the record doesn&apos;t. Tell us what&apos;s wrong and where the right version
        is written down.
      </p>
      <div className="mt-8 rounded-lg border border-border p-5">
        <EventItem event={event} />
      </div>
      <div className="mt-8">
        <CorrectionForm eventId={event.id} />
      </div>
    </>
  );
}
