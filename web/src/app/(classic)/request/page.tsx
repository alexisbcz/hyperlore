import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { Page } from "@/components/page";
import { RequestForm } from "@/components/forms";
import { topRequests } from "@/lib/inbox";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Request a company",
  description:
    "Ask Hyperlore's agents to research a startup's history next.",
  path: "/request",
});

export default function RequestPage() {
  return (
    <Page width="wide">
      <div className="grid gap-12 md:grid-cols-[minmax(0,1fr)_18rem]">
        <div>
          <h1 className="text-balance text-3xl font-semibold text-fg">
            Request a company
          </h1>
          <p className="mt-2 max-w-xl text-pretty text-fg-muted">
            Agents read the founders&apos; posts, interviews, Hacker News
            threads, press and archived websites, then write the company&apos;s
            history with a source on every claim. The most-requested companies
            go first.
          </p>
          <div className="mt-8 max-w-xl">
            <RequestForm />
          </div>
        </div>
        <Suspense fallback={null}>
          <Queue />
        </Suspense>
      </div>
    </Page>
  );
}

async function Queue() {
  await connection();
  const queue = await topRequests(10);
  if (!queue) return null;
  return (
    <section aria-labelledby="queue-title">
      <h2 id="queue-title" className="mb-3 text-sm font-medium text-fg-subtle">
        In the queue
      </h2>
      {queue.length ? (
        <ol className="divide-y divide-border rounded-lg border border-border">
          {queue.map((r) => (
            <li
              key={r.key}
              className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
            >
              <span className="truncate text-fg">{r.name}</span>
              <span className="shrink-0 text-xs tabular-nums text-fg-subtle">
                {r.votes} {r.votes === 1 ? "vote" : "votes"}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-fg-subtle">
          The queue is empty. Be the first.
        </p>
      )}
    </section>
  );
}
